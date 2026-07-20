import type { GatedFeature } from '@aura/shared';

/**
 * The free-tier gating map (12 §4, product 15 §free tier).
 *
 * Written as data rather than as `if (premium)` scattered through screens, for
 * two reasons. First, the free tier is a product position, not an accident: it
 * has to be reviewable in one place against product 15's table. Second, the
 * default direction matters — anything NOT listed here is free, so a new feature
 * ships unlocked unless someone deliberately adds it. A map of what is free
 * would have the opposite default, and eventually something would get paywalled
 * by omission.
 *
 * Note what is NOT gated, and must never be: the daily moment, the daily
 * affirmation, gratitude, and the Letter itself. The free tier is a daily
 * reminder of the magic (the Finch lesson) and our review-score insurance —
 * gating it would break both.
 */
export const GATED_FEATURES: readonly GatedFeature[] = [
  'manifest_anything',
  'refine',
  'favorites',
  'collections',
  'share_export',
];

/** Whether a feature needs premium. Unknown features are free by design. */
export function isGated(feature: GatedFeature): boolean {
  return GATED_FEATURES.includes(feature);
}

/**
 * The gate a screen actually calls: may she use this right now?
 *
 * Loading resolves to "allowed" deliberately. A brief flash of an unlocked
 * feature that then locks is a worse experience than the reverse for a PAYING
 * user, and the server re-checks every premium action anyway (12 §4) — so the
 * cost of being wrong here is one 402 the sheet already knows how to handle,
 * not a leaked feature.
 */
export function canUse(
  feature: GatedFeature,
  entitlement: { premium: boolean; loading: boolean },
): boolean {
  if (!isGated(feature)) return true;
  if (entitlement.loading) return true;
  return entitlement.premium;
}
