import type { OnboardingScreenId } from '@aura/shared';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { nextScreen, SCREEN_ORDER } from '@/features/onboarding/flow';
import { storage } from '@/lib/storage';

/**
 * The onboarding draft (05 §2: Zustand + MMKV for exactly this).
 *
 * Two product rules live here:
 *   - App killed mid-flow → resume at the last answered screen (product 07).
 *     Every mutation persists synchronously to MMKV, so there is no "save point"
 *     she can lose progress to.
 *   - Answers survive offline (05 §3): the committed flag tracks what has
 *     reached Supabase; anything uncommitted is retried by the commit path.
 */

export interface DraftPerson {
  name: string;
  descriptor: string;
}

export interface DraftAnswer {
  /** Screen-shaped value: string, string[], DraftPerson[], or a time string. */
  value: unknown;
  skipped: boolean;
  /** Set once the answer has landed in Supabase; null = pending sync. */
  committedAt: string | null;
}

interface OnboardingDraftState {
  /** Epoch ms of S1 view — the funnel's duration_s starts here. */
  startedAt: number | null;
  currentScreen: OnboardingScreenId;
  answers: Partial<Record<OnboardingScreenId, DraftAnswer>>;
  /**
   * Where "Fix an earlier answer" left from (product 07 edit-guard): after the
   * edit saves, the flow returns HERE — revise, never restart.
   */
  editReturnScreen: OnboardingScreenId | null;

  start: (now?: number) => void;
  setAnswer: (screen: OnboardingScreenId, value: unknown, skipped?: boolean) => void;
  markCommitted: (screen: OnboardingScreenId, at?: string) => void;
  advanceTo: (screen: OnboardingScreenId) => void;
  beginEdit: (target: OnboardingScreenId) => void;
  endEdit: () => OnboardingScreenId | null;
  reset: () => void;
}

/** zustand's persist speaks the localStorage dialect; MMKV is synchronous, which suits it fine. */
const mmkvStorage: StateStorage = {
  getItem: (key) => storage.getString(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.remove(key),
};

const initialState = {
  startedAt: null,
  currentScreen: SCREEN_ORDER[0] as OnboardingScreenId,
  answers: {},
  editReturnScreen: null,
};

/**
 * Answer keys a draft may legitimately hold — live screens plus `q-pronoun`
 * (answered from the name screen, no route of its own, still has to sync).
 */
const LIVE_ANSWER_KEYS: ReadonlySet<string> = new Set<string>([...SCREEN_ORDER, 'q-pronoun']);

/**
 * Draft v1 (M16): a pre-v5 draft could hold retired screens (`s04-self-description`,
 * `s07-dream-home`) and a retired `currentScreen`. Left in place, `pendingCommits`
 * re-INSERTs those retired screens' answers on the next completion and rewrites
 * their profile columns — silent bleed-in of state the live flow can no longer
 * see. Drop non-live answer keys and park any out-of-flow `currentScreen`.
 */
export function migrateDraft(persisted: unknown): OnboardingDraftState {
  const wrapped = persisted as { state?: Partial<OnboardingDraftState> };
  const state = wrapped.state ?? (persisted as Partial<OnboardingDraftState>);

  const answers: Partial<Record<OnboardingScreenId, DraftAnswer>> = {};
  for (const [id, answer] of Object.entries(state.answers ?? {})) {
    if (LIVE_ANSWER_KEYS.has(id)) answers[id as OnboardingScreenId] = answer as DraftAnswer;
  }

  const currentScreen = SCREEN_ORDER.includes(state.currentScreen as OnboardingScreenId)
    ? (state.currentScreen as OnboardingScreenId)
    : (SCREEN_ORDER[0] as OnboardingScreenId);

  return {
    ...initialState,
    ...state,
    answers,
    currentScreen,
  } as OnboardingDraftState;
}

export const useOnboardingDraft = create<OnboardingDraftState>()(
  persist(
    (set, get) => ({
      ...initialState,

      start: (now = Date.now()) => {
        // Idempotent: a re-render of S1 or an app relaunch must not restart the
        // funnel clock — duration_s is a launch metric (product 17).
        if (get().startedAt === null) set({ startedAt: now });
      },

      setAnswer: (screen, value, skipped = false) =>
        set((state) => ({
          answers: {
            ...state.answers,
            // A re-answer (edit) resets committedAt: the new value hasn't synced.
            [screen]: { value, skipped, committedAt: null },
          },
        })),

      markCommitted: (screen, at = new Date().toISOString()) =>
        set((state) => {
          const answer = state.answers[screen];
          if (!answer) return state;
          return { answers: { ...state.answers, [screen]: { ...answer, committedAt: at } } };
        }),

      advanceTo: (screen) => set({ currentScreen: screen }),

      beginEdit: (target) =>
        set((state) => ({
          // Nested edits keep the ORIGINAL return point — she always comes back
          // to where the conversation actually was.
          editReturnScreen: state.editReturnScreen ?? state.currentScreen,
          currentScreen: target,
        })),

      endEdit: () => {
        const returnTo = get().editReturnScreen;
        if (returnTo) set({ currentScreen: returnTo, editReturnScreen: null });
        return returnTo;
      },

      reset: () => set(initialState),
    }),
    {
      name: 'onboarding.draft',
      storage: createJSONStorage(() => mmkvStorage),
      version: 1,
      migrate: migrateDraft,
    },
  ),
);

/**
 * Where a relaunch resumes (product 07: "resume at last answered screen" — in
 * practice the screen AFTER the last answered one, or wherever she parked if
 * that's further along, so backing out to reread never loses her place).
 */
export function resumeScreen(state: {
  answers: Partial<Record<OnboardingScreenId, DraftAnswer>>;
  currentScreen: OnboardingScreenId;
}): OnboardingScreenId {
  let lastAnswered: OnboardingScreenId | null = null;
  for (const id of SCREEN_ORDER) {
    if (state.answers[id]) lastAnswered = id;
  }

  if (!lastAnswered) return state.currentScreen;

  // Branching (v5) reads her answers, so a resume lands on the screen the live
  // flow would actually show next — never a bypassed one.
  const afterAnswered = nextScreen(lastAnswered, undefined, state.answers) ?? lastAnswered;
  const parkedIndex = SCREEN_ORDER.indexOf(state.currentScreen);
  const answeredIndex = SCREEN_ORDER.indexOf(afterAnswered);

  return parkedIndex > answeredIndex ? state.currentScreen : afterAnswered;
}

/** Answers that never reached Supabase — the offline queue the commit path drains. */
export function pendingCommits(
  answers: Partial<Record<OnboardingScreenId, DraftAnswer>>,
): OnboardingScreenId[] {
  // Every answered id, not just SCREEN_ORDER: `q-pronoun` is answered from the
  // name screen and has no route of its own, but it still has to sync.
  const ids = new Set<OnboardingScreenId>([
    ...SCREEN_ORDER,
    ...(Object.keys(answers) as OnboardingScreenId[]),
  ]);
  return [...ids].filter((id) => {
    const answer = answers[id];
    return answer !== undefined && answer.committedAt === null;
  });
}
