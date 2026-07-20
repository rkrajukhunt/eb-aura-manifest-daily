import type { Profile } from '@/hooks/useProfile';

/** Where boot sends her (05 §9, 06 §1). */
export type BootRoute = '/(onboarding)' | '/letter' | '/(tabs)/home';

export interface BootState {
  profile: Pick<Profile, 'onboarding_completed_at'>;
  /** Is there a `ready` letter waiting for her? */
  hasLetter: boolean;
  /** Has she actually heard it? Local flag, set when she leaves the Letter (06 §3). */
  letterSeen: boolean;
}

/**
 * Pure so it can be tested without a navigator — the branching, not the routing,
 * is what's easy to get wrong.
 *
 * `onboarding_completed_at` is the single source of truth for "has she finished
 * the conversation" (02 §1). A half-finished onboarding resumes from its draft
 * (product 07), which is why an incomplete profile still routes to onboarding
 * rather than anywhere else.
 *
 * The letter gate sits AHEAD of Home (06 §3): a letter that exists but has not
 * been heard is the entire reason she installed the app, so a killed app must
 * reopen into it rather than into a Home that quietly hides it. It is ordered
 * AFTER onboarding so nothing can skip the wow funnel.
 *
 * `letterSeen` is a LOCAL flag, not a server column, on purpose: "has this
 * device played it" is device state, and a second device should get to hear it
 * too. Phase 10 inserts the paywall gate between here and Home.
 */
export function resolveBootRoute(state: BootState): BootRoute {
  if (!state.profile.onboarding_completed_at) return '/(onboarding)';
  if (state.hasLetter && !state.letterSeen) return '/letter';
  return '/(tabs)/home';
}
