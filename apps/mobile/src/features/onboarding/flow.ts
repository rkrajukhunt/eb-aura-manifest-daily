import type { OnboardingAnswerType, OnboardingScreenId } from '@aura/shared';

import { onboardingCopy, type BeliefKey, type GoalKey, type MoodKey } from '@/copy/onboarding';

/**
 * The conversation's shape — Onboarding v5 (design "Aura Ember Onboarding v5",
 * 2026-09-01): one question per screen in a fixed order, with three branches
 * that depend on earlier answers. This module is pure so resume, progress,
 * edit-guard and analytics logic are testable without a navigator.
 */

/** The shape `nextScreen` needs — structurally satisfied by the draft store's answers. */
export interface FlowAnswer {
  value: unknown;
  skipped: boolean;
}
export type FlowAnswers = Partial<Record<OnboardingScreenId, FlowAnswer>>;

export const SCREEN_ORDER: readonly OnboardingScreenId[] = [
  'a01-splash', // 01 splash
  'a02-value', // 02 the contract
  'a04-goals', // Q1 goal — multi, max 3
  'q-priority', // Q2 priority — skipped at one goal
  'q-context', // Q3 context — branched on primary; habits skips
  's03-name', // Q4 name + pronoun (q-pronoun rides along)
  'a11-affirmation', // VALUE · your first one
  'a05-feeling', // Q5 mood — the safety router
  'v-insight', // VALUE · insight, or support when struggling
  'a06-obstacle', // Q6 obstacle
  'q-lexicon', // Q7 belief language
  'q-offlimits', // Q8 off limits
  'q-belief', // Q9 believability
  'q-calibration', // Q10 calibration — contradiction resolver only
  'v-reflect', // reflect-back
  'a08-ritual-time', // Q11 time + commitment
  'v-gratitude', // VALUE · first gratitude entry
  'v-consent', // AI consent
  's12-notifications', // notification pre-prompt → OS ask → generating
];

/** Header "Skip" (design steps 6, 7, 13). Gratitude carries its own skip button. */
export const SKIPPABLE: ReadonlySet<OnboardingScreenId> = new Set([
  'q-context',
  's03-name',
  'q-offlimits',
]);

export const ANSWER_TYPE: Record<OnboardingScreenId, OnboardingAnswerType> = {
  'a01-splash': 'none',
  'a02-value': 'none',
  'a03-social-proof': 'none',
  'a04-goals': 'multi_choice',
  'q-priority': 'choice',
  'q-context': 'choice',
  's03-name': 'text',
  'q-pronoun': 'choice',
  'a11-affirmation': 'none',
  'a05-feeling': 'choice',
  'v-insight': 'none',
  'a06-obstacle': 'multi_choice',
  'q-lexicon': 'choice',
  'q-offlimits': 'multi_choice',
  'q-belief': 'choice',
  'q-calibration': 'choice',
  'v-reflect': 'none',
  'a08-ritual-time': 'choice',
  'v-gratitude': 'text',
  'v-consent': 'choice',
  's12-notifications': 'none',
  // Retired ids — kept so historical analytics and profile columns stay typed.
  'a10-commitment': 'none',
  'a12-reminder': 'none',
  's01-welcome': 'none',
  's02-meet-aura': 'none',
  's04-self-description': 'text',
  's05-work-feeling': 'choice',
  's06-values': 'multi_choice',
  's07-dream-home': 'choice',
  's08-dream-city': 'text',
  's09-people': 'people',
  's10-struggle': 'text',
  's11-arrival-time': 'time',
  's13-commit': 'none',
  's12-why-notifications': 'none',
};

/** Screens that carry an answer — the denominator for `questions_answered`. */
export const QUESTION_SCREENS: readonly OnboardingScreenId[] = SCREEN_ORDER.filter(
  (id) => ANSWER_TYPE[id] !== 'none',
);

/** The design draws the progress track from the first question to the consent. */
const PROGRESS_FIRST: OnboardingScreenId = 'a04-goals';
const PROGRESS_LAST: OnboardingScreenId = 'v-consent';

const NO_HIDDEN: ReadonlySet<OnboardingScreenId> = new Set();
const NO_ANSWERS: FlowAnswers = {};

// ── Answer readers ─────────────────────────────────────────────────────────

function valueOf(answers: FlowAnswers, id: OnboardingScreenId): unknown {
  const answer = answers[id];
  return answer && !answer.skipped ? answer.value : undefined;
}

/**
 * Goals and the obstacle are stored as their LABELS — they land in the
 * `values` / `struggle` profile columns the Letter reads, which want prose,
 * not slugs. The flow maps back to keys here.
 */
export function goalKeyOf(label: unknown): GoalKey | null {
  return onboardingCopy.a04Goals.choices.find((c) => c.label === label)?.key ?? null;
}

export function goalsOf(answers: FlowAnswers): GoalKey[] {
  const value = valueOf(answers, 'a04-goals');
  if (!Array.isArray(value)) return [];
  return value.map(goalKeyOf).filter((key): key is GoalKey => key !== null);
}

/** Q2's pick, else the first goal, else the design's default. */
export function primaryGoalOf(answers: FlowAnswers): GoalKey {
  const picked = goalKeyOf(valueOf(answers, 'q-priority'));
  return picked ?? goalsOf(answers)[0] ?? 'confidence';
}

export function obstacleKeyOf(answers: FlowAnswers) {
  const value = valueOf(answers, 'a06-obstacle');
  const first = Array.isArray(value) ? value[0] : value;
  return onboardingCopy.a06Obstacle.choices.find((c) => c.label === first)?.key ?? null;
}

export function moodOf(answers: FlowAnswers): MoodKey | null {
  const value = valueOf(answers, 'a05-feeling');
  return typeof value === 'string' ? (value as MoodKey) : null;
}

/** gentle_mode — set by Q5, shapes Q9, the exit offer and the support beat. */
export function isGentle(answers: FlowAnswers): boolean {
  const mood = moodOf(answers);
  return mood === 'low' || mood === 'struggling';
}

export function beliefOf(answers: FlowAnswers): BeliefKey | null {
  const value = valueOf(answers, 'q-belief');
  return typeof value === 'string' ? (value as BeliefKey) : null;
}

/**
 * The framing the ritual is written in: her belief pick, softened to process
 * when gentle_mode or the calibration says the bold line rang false.
 */
export function framingOf(answers: FlowAnswers): BeliefKey {
  let framing = beliefOf(answers) ?? 'process';
  if (isGentle(answers) && framing === 'identity') framing = 'process';
  const calibration = valueOf(answers, 'q-calibration');
  if (calibration === 'fake' || calibration === 'want') framing = 'process';
  return framing;
}

/** Q10 shows only when the mood and believability answers disagree. */
function hasContradiction(answers: FlowAnswers): boolean {
  const gentle = isGentle(answers);
  const belief = beliefOf(answers);
  const obstacle = obstacleKeyOf(answers);
  return (
    (gentle && belief === 'identity') ||
    (!gentle && belief === 'practical' && obstacle === 'selfdoubt')
  );
}

/** A screen the flow bypasses given what she has answered so far. */
export function isBypassed(id: OnboardingScreenId, answers: FlowAnswers): boolean {
  switch (id) {
    case 'q-priority':
      return goalsOf(answers).length <= 1;
    case 'q-context':
      return primaryGoalOf(answers) === 'habits';
    case 'q-calibration':
      return !hasContradiction(answers);
    default:
      return false;
  }
}

// ── Navigation ─────────────────────────────────────────────────────────────

function isVisible(
  id: OnboardingScreenId,
  hidden: ReadonlySet<OnboardingScreenId>,
  answers: FlowAnswers,
): boolean {
  return !hidden.has(id) && !isBypassed(id, answers);
}

/** The next screen after `current`, skipping hidden and bypassed screens. */
export function nextScreen(
  current: OnboardingScreenId,
  hidden: ReadonlySet<OnboardingScreenId> = NO_HIDDEN,
  answers: FlowAnswers = NO_ANSWERS,
): OnboardingScreenId | null {
  for (let i = SCREEN_ORDER.indexOf(current) + 1; i < SCREEN_ORDER.length; i++) {
    const id = SCREEN_ORDER[i];
    if (id && isVisible(id, hidden, answers)) return id;
  }
  return null;
}

/** The previous visible screen before `current`, symmetrically. */
export function previousScreen(
  current: OnboardingScreenId,
  hidden: ReadonlySet<OnboardingScreenId> = NO_HIDDEN,
  answers: FlowAnswers = NO_ANSWERS,
): OnboardingScreenId | null {
  for (let i = SCREEN_ORDER.indexOf(current) - 1; i >= 0; i--) {
    const id = SCREEN_ORDER[i];
    if (id && isVisible(id, hidden, answers)) return id;
  }
  return null;
}

/** The question screens actually shown — the honest `questions_answered` denominator. */
export function visibleQuestionScreens(
  hidden: ReadonlySet<OnboardingScreenId> = NO_HIDDEN,
  answers: FlowAnswers = NO_ANSWERS,
): readonly OnboardingScreenId[] {
  return QUESTION_SCREENS.filter((id) => isVisible(id, hidden, answers));
}

/**
 * Where the header's track sits for `id`: 0..1 across the screens from the
 * first question to the consent, or null when the screen draws no header
 * (splash, contract, notifications). Value beats count as steps too — the
 * track only ever moves forward.
 */
export function progressOf(
  id: OnboardingScreenId,
  hidden: ReadonlySet<OnboardingScreenId> = NO_HIDDEN,
  answers: FlowAnswers = NO_ANSWERS,
): number | null {
  const first = SCREEN_ORDER.indexOf(PROGRESS_FIRST);
  const last = SCREEN_ORDER.indexOf(PROGRESS_LAST);
  const at = SCREEN_ORDER.indexOf(id);
  if (at < first || at > last) return null;

  const track = SCREEN_ORDER.slice(first, last + 1).filter((s) => isVisible(s, hidden, answers));
  const position = track.indexOf(id);
  if (position < 0) return null;
  return (position + 1) / track.length;
}

/** Expo Router path for a screen id — route files are named by id (06 §1). */
export function screenRoute(id: OnboardingScreenId): string {
  return `/(onboarding)/${id}`;
}
