import type { Profile } from '@/hooks/useProfile';

/** Where boot sends her (05 §9, 06 §1). */
export type BootRoute = '/(onboarding)' | '/(tabs)/home';

/**
 * Pure so it can be tested without a navigator — the branching, not the routing,
 * is what's easy to get wrong.
 *
 * `onboarding_completed_at` is the single source of truth for "has she finished
 * the conversation" (02 §1). A half-finished onboarding resumes from its draft
 * (product 07), which is why an incomplete profile still routes to onboarding
 * rather than anywhere else.
 *
 * Phase 6 adds the letter-unseen gate ahead of Home; Phase 10 adds the paywall.
 */
export function resolveBootRoute(profile: Pick<Profile, 'onboarding_completed_at'>): BootRoute {
  return profile.onboarding_completed_at ? '/(tabs)/home' : '/(onboarding)';
}
