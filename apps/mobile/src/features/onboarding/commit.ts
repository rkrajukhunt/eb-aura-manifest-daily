import {
  charCountBucket,
  type OnboardingScreenId,
  type SeedProfile,
  type Update,
} from '@aura/shared';

import { seedMemoryForUser } from '@/features/memory/api';
import { analytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import {
  pendingCommits,
  useOnboardingDraft,
  type DraftAnswer,
  type DraftPerson,
} from '@/stores/onboardingDraft';

import { ANSWER_TYPE, QUESTION_SCREENS } from './flow';

/**
 * The commit path (Phase 3): every answer lands in TWO places — the
 * `onboarding_answers` audit log (her original words, forever) and the working
 * copy (profile fields / people rows). The draft store is the source of truth
 * until sync succeeds, so offline never loses an answer (05 §3): failed syncs
 * stay `committedAt: null` and are drained by `flushPending`.
 */

/** S11 presets. "Morning" is a promise about tone, not a timestamp — 8am local. */
const ARRIVAL_PRESETS: Record<string, string> = {
  morning: '08:00',
  evening: '20:00',
};

/**
 * Submit = record + emit + attempt sync. Analytics fires HERE, at submission,
 * not at sync — the funnel measures her behaviour, not our connectivity
 * (product 17). One emitter per event (13 §3).
 */
export async function submitAnswer(
  userId: string,
  screen: OnboardingScreenId,
  value: unknown,
  skipped = false,
): Promise<void> {
  const draft = useOnboardingDraft.getState();
  draft.setAnswer(screen, value, skipped);

  analytics.capture('onboarding_answer_submitted', {
    screen_id: screen,
    answer_type: ANSWER_TYPE[screen],
    skipped,
    char_count_bucket: charCountBucket(typeof value === 'string' ? value.length : 0),
  });

  try {
    await syncAnswer(userId, screen, useOnboardingDraft.getState().answers[screen] as DraftAnswer);
    useOnboardingDraft.getState().markCommitted(screen);
  } catch {
    // Stays pending; honest copy handles the visible side (product 07 offline
    // edge). No error surface here — the conversation continues.
  }
}

/** Drains everything the network dropped. Safe to call repeatedly. */
export async function flushPending(userId: string): Promise<boolean> {
  const { answers } = useOnboardingDraft.getState();
  let allSynced = true;

  for (const screen of pendingCommits(answers)) {
    try {
      await syncAnswer(userId, screen, answers[screen] as DraftAnswer);
      useOnboardingDraft.getState().markCommitted(screen);
    } catch {
      allSynced = false;
    }
  }

  return allSynced;
}

/**
 * S11 done → the conversation is complete: flush, stamp completion + timezone,
 * seed the Living Memory from what she shared (09 §1), fire the funnel event.
 *
 * Throws if answers could not sync — the caller keeps her on an honest waiting
 * state rather than sending her into a Letter generated from half a profile.
 */
export async function completeOnboarding(userId: string, now: number = Date.now()): Promise<void> {
  const synced = await flushPending(userId);
  if (!synced) throw new Error('Answers not fully synced');

  const state = useOnboardingDraft.getState();

  // Captured at completion, not at install: she may have travelled mid-flow,
  // and the arrival cron keys off this (04 §5).
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date(now).toISOString(), timezone })
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  await seedMemoryForUser(userId, seedProfileFromDraft(state.answers));

  analytics.capture('onboarding_completed', {
    duration_s: state.startedAt !== null ? Math.round((now - state.startedAt) / 1000) : 0,
    questions_answered: QUESTION_SCREENS.filter(
      (id) => state.answers[id] && !state.answers[id]?.skipped,
    ).length,
  });
}

/** The seed reads the draft, not the profile row — no round-trip, same values. */
function seedProfileFromDraft(
  answers: Partial<Record<OnboardingScreenId, DraftAnswer>>,
): SeedProfile {
  const text = (id: OnboardingScreenId) => {
    const answer = answers[id];
    return answer && !answer.skipped && typeof answer.value === 'string' ? answer.value : null;
  };

  return {
    name: text('s03-name'),
    self_description: text('s04-self-description'),
    dream_home: text('s07-dream-home'),
    dream_city: text('s08-dream-city'),
    struggle: text('s10-struggle'),
    values: (answers['s06-values']?.value as string[] | undefined) ?? null,
  };
}

/** Writes one answer to the audit log and its working copy. */
async function syncAnswer(
  userId: string,
  screen: OnboardingScreenId,
  answer: DraftAnswer,
): Promise<void> {
  const { error: logError } = await supabase.from('onboarding_answers').insert({
    user_id: userId,
    screen_id: screen,
    answer: answer.skipped ? null : (answer.value as never),
    skipped: answer.skipped,
  });
  if (logError) throw new Error(logError.message);

  if (answer.skipped) return;

  const profilePatch = profileFieldFor(screen, answer.value);
  if (profilePatch) {
    const { error } = await supabase.from('profiles').update(profilePatch).eq('user_id', userId);
    if (error) throw new Error(error.message);
  }

  if (screen === 's09-people') {
    await syncPeople(userId, answer.value as DraftPerson[]);
  }
}

/** Screen → profile column (02 §1). Screens without a column return null. */
function profileFieldFor(screen: OnboardingScreenId, value: unknown): Update<'profiles'> | null {
  switch (screen) {
    case 's03-name':
      return { name: value as string };
    case 's04-self-description':
      return { self_description: value as string };
    case 's05-work-feeling':
      return { work_feeling: value as NonNullable<Update<'profiles'>['work_feeling']> };
    case 's06-values':
      return { values: value as string[] };
    case 's07-dream-home':
      return { dream_home: value as string };
    case 's08-dream-city':
      return { dream_city: value as string };
    case 's10-struggle':
      return { struggle: value as string };
    case 's11-arrival-time': {
      const raw = String(value);
      return { arrival_time: ARRIVAL_PRESETS[raw] ?? raw };
    }
    default:
      return null;
  }
}

/**
 * Replace-all-mine semantics: a retried or edited S9 must not duplicate her
 * circle. Safe during onboarding because every person she has came from this
 * screen; the Profile tab (Phase 4 UI) edits people individually instead.
 */
async function syncPeople(userId: string, people: DraftPerson[]): Promise<void> {
  const { error: clearError } = await supabase.from('people').delete().eq('user_id', userId);
  if (clearError) throw new Error(clearError.message);

  if (people.length === 0) return;

  const { error } = await supabase.from('people').insert(
    people.map((person) => ({
      user_id: userId,
      name: person.name,
      ...(person.descriptor ? { descriptor: person.descriptor } : {}),
    })),
  );
  if (error) throw new Error(error.message);
}
