import type { Profile } from '@/hooks/useProfile';

/** Where boot sends her (05 §9, 06 §1). */
export type BootRoute = '/(onboarding)' | '/letter' | '/paywall' | '/(tabs)/home';

export interface BootState {
  profile: Pick<Profile, 'onboarding_completed_at'>;
  /** Is there a `ready` letter waiting for her? */
  hasLetter: boolean;
  /** Has she actually heard it? Local flag, set when she leaves the Letter (06 §3). */
  letterSeen: boolean;
  /** Has the post-Letter paywall been presented? Shown once (12 §3). */
  paywallSeen: boolean;
}

/**
 * Pure so it can be tested without a navigator — the branching, not the routing,
 * is what's easy to get wrong.
 *
 * The order IS the session-1 funnel (06 §3), and each gate is ahead of the next
 * for a reason:
 *
 *   onboarding → letter → paywall → home
 *
 * `onboarding_completed_at` is the single source of truth for "has she finished
 * the conversation" (02 §1); a half-finished one resumes from its draft.
 *
 * The letter gate sits ahead of the paywall because the wow must be spent before
 * the ask — that ordering is the product's central monetization decision
 * (product 08 §why pre-paywall), not an implementation detail.
 *
 * The paywall gate only fires once she has HEARD the letter, and only once ever.
 * A user who dismissed it is done being asked here (product 01 §10 bans the
 * second, quieter paywall).
 */
export function resolveBootRoute(state: BootState): BootRoute {
  if (!state.profile.onboarding_completed_at) return '/(onboarding)';
  if (state.hasLetter && !state.letterSeen) return '/letter';
  if (state.hasLetter && !state.paywallSeen) return '/paywall';
  return '/(tabs)/home';
}
