import type { OnboardingAnswerType, OnboardingScreenId } from '@aura/shared';

/**
 * The Conversation's shape (product 07): one question per screen, fixed order,
 * skip allowed on personal questions — never on name.
 *
 * This module is pure so resume, edit-guard and analytics logic are testable
 * without a navigator.
 */

export const SCREEN_ORDER: readonly OnboardingScreenId[] = [
  's01-welcome',
  's02-meet-aura',
  's03-name',
  's04-self-description',
  's05-work-feeling',
  's06-values',
  's07-dream-home',
  's08-dream-city',
  's09-people',
  's10-struggle',
  's11-arrival-time',
];

/** Skippable per product 07: S4, S8, S10 (and S9 via "Just me for now"). Never S3. */
export const SKIPPABLE: ReadonlySet<OnboardingScreenId> = new Set([
  's04-self-description',
  's08-dream-city',
  's09-people',
  's10-struggle',
]);

export const ANSWER_TYPE: Record<OnboardingScreenId, OnboardingAnswerType> = {
  's01-welcome': 'none',
  's02-meet-aura': 'none',
  's03-name': 'text',
  's04-self-description': 'text',
  's05-work-feeling': 'choice',
  's06-values': 'multi_choice',
  's07-dream-home': 'choice',
  's08-dream-city': 'text',
  's09-people': 'people',
  's10-struggle': 'text',
  's11-arrival-time': 'time',
};

/** Screens that carry an answer — the denominator for `questions_answered`. */
export const QUESTION_SCREENS: readonly OnboardingScreenId[] = SCREEN_ORDER.filter(
  (id) => ANSWER_TYPE[id] !== 'none',
);

export function nextScreen(current: OnboardingScreenId): OnboardingScreenId | null {
  const index = SCREEN_ORDER.indexOf(current);
  return SCREEN_ORDER[index + 1] ?? null;
}

export function previousScreen(current: OnboardingScreenId): OnboardingScreenId | null {
  const index = SCREEN_ORDER.indexOf(current);
  return index > 0 ? (SCREEN_ORDER[index - 1] ?? null) : null;
}

/** Expo Router path for a screen id — route files are named by id (06 §1). */
export function screenRoute(id: OnboardingScreenId): string {
  return `/(onboarding)/${id}`;
}
