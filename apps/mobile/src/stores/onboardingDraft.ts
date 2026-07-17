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

  const afterAnswered = nextScreen(lastAnswered) ?? lastAnswered;
  const parkedIndex = SCREEN_ORDER.indexOf(state.currentScreen);
  const answeredIndex = SCREEN_ORDER.indexOf(afterAnswered);

  return parkedIndex > answeredIndex ? state.currentScreen : afterAnswered;
}

/** Answers that never reached Supabase — the offline queue the commit path drains. */
export function pendingCommits(
  answers: Partial<Record<OnboardingScreenId, DraftAnswer>>,
): OnboardingScreenId[] {
  return SCREEN_ORDER.filter((id) => {
    const answer = answers[id];
    return answer !== undefined && answer.committedAt === null;
  });
}
