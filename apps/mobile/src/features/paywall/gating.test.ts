import type { GatedFeature } from '@aura/shared';

import { canUse, GATED_FEATURES, isGated } from './gating';

/**
 * The free-tier map (12 §4, product 15).
 *
 * The tests that matter most are the ones asserting what is NOT gated. The free
 * tier is a daily reminder of the magic and our review-score insurance; quietly
 * paywalling the daily moment or the Letter would break the product's whole
 * monetization position, and it is exactly the kind of change that looks
 * harmless in a diff.
 */
describe('gating', () => {
  const free = { premium: false, loading: false };
  const premium = { premium: true, loading: false };

  it('gates exactly the five features product 15 lists', () => {
    expect([...GATED_FEATURES].sort()).toEqual(
      ['collections', 'favorites', 'manifest_anything', 'refine', 'share_export'].sort(),
    );
  });

  describe('what premium buys', () => {
    it.each(GATED_FEATURES)('gates %s', (feature) => {
      expect(isGated(feature)).toBe(true);
      expect(canUse(feature, free)).toBe(false);
      expect(canUse(feature, premium)).toBe(true);
    });
  });

  describe('what the free tier always keeps', () => {
    // Not in the map, and must never be. If any of these ever appear in
    // GATED_FEATURES, this fails — which is the point.
    it.each(['daily_moment', 'daily_affirmation', 'gratitude', 'letter'])(
      'never gates %s',
      (feature) => {
        expect(GATED_FEATURES).not.toContain(feature as GatedFeature);
        expect(canUse(feature as GatedFeature, free)).toBe(true);
      },
    );
  });

  describe('while entitlement is still loading', () => {
    it('lets a premium feature through rather than flashing it locked', () => {
      // The server re-checks every premium action (12 §4), so the cost of being
      // wrong here is one 402 the locked sheet already handles — far better than
      // showing a paying customer a lock on every cold start.
      expect(canUse('refine', { premium: false, loading: true })).toBe(true);
    });
  });
});
