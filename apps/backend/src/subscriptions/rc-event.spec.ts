import { RC_EVENT_TYPES, type RcWebhookEvent } from '@aura/shared';

import { deriveSubscriptionUpdate } from './rc-event';

/**
 * RevenueCat event → mirror (12 §5). The plan requires every event type mapped
 * to its expected mirror state, and two of those mappings are money:
 *
 *  - CANCELLATION must NOT revoke access she already paid for.
 *  - BILLING_ISSUE must NOT revoke access while the card is being retried.
 *
 * Getting either backwards silently takes premium away from a paying customer,
 * which is both a refund and a one-star review.
 */
describe('deriveSubscriptionUpdate', () => {
  const AT = Date.UTC(2026, 6, 20, 12, 0, 0);
  const EXPIRES = Date.UTC(2027, 6, 20, 12, 0, 0);

  const event = (overrides: Partial<RcWebhookEvent> = {}): RcWebhookEvent =>
    ({
      type: 'INITIAL_PURCHASE',
      app_user_id: 'user-1',
      product_id: 'aura_premium_annual',
      period_type: 'NORMAL',
      event_timestamp_ms: AT,
      expiration_at_ms: EXPIRES,
      ...overrides,
    }) as RcWebhookEvent;

  it('handles every event type RevenueCat can send', () => {
    // If RC adds a type to the contract, this fails until it is mapped — better
    // than silently falling through to a default that grants or revokes access.
    for (const type of RC_EVENT_TYPES) {
      expect(() => deriveSubscriptionUpdate(event({ type }))).not.toThrow();
    }
  });

  describe('INITIAL_PURCHASE', () => {
    it('grants premium and records the product', () => {
      const { mirror } = deriveSubscriptionUpdate(event());

      expect(mirror).toMatchObject({
        entitlement: 'premium',
        product_id: 'aura_premium_annual',
        period_type: 'normal',
        will_renew: true,
        lapsed_at: null,
      });
    });

    it('reports a paid purchase as purchase_completed', () => {
      const { analytics } = deriveSubscriptionUpdate(event());

      expect(analytics).toEqual({ event: 'purchase_completed', sku: 'aura_premium_annual' });
    });

    it('reports a trial start as trial_started, not a purchase', () => {
      // Conflating these would inflate the conversion number the whole pricing
      // experiment is measured on (product 15 §unit economics).
      const { analytics, mirror } = deriveSubscriptionUpdate(
        event({ period_type: 'TRIAL', product_id: 'aura_premium_weekly' }),
      );

      expect(analytics).toEqual({ event: 'trial_started', sku: 'aura_premium_weekly' });
      expect(mirror.period_type).toBe('trial');
      expect(mirror.entitlement).toBe('premium');
    });

    it('records the expiry so the guard can outlive mirror lag', () => {
      const { mirror } = deriveSubscriptionUpdate(event());

      expect(mirror.expires_at).toBe(new Date(EXPIRES).toISOString());
    });
  });

  describe('RENEWAL', () => {
    it('keeps premium and reports a renewal', () => {
      const { mirror, analytics } = deriveSubscriptionUpdate(event({ type: 'RENEWAL' }));

      expect(mirror.entitlement).toBe('premium');
      expect(mirror.will_renew).toBe(true);
      expect(analytics).toEqual({ event: 'subscription_renewed', sku: 'aura_premium_annual' });
    });

    it('lands on a paid period even when the trial is what converted', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ type: 'RENEWAL', period_type: 'TRIAL' }));

      expect(mirror.period_type).toBe('normal');
    });
  });

  describe('CANCELLATION — she keeps what she paid for', () => {
    it('turns off auto-renew WITHOUT revoking the entitlement', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ type: 'CANCELLATION' }));

      expect(mirror.entitlement).toBe('premium');
      expect(mirror.will_renew).toBe(false);
    });

    it('leaves the expiry in place — access runs to period end', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ type: 'CANCELLATION' }));

      expect(mirror.expires_at).toBe(new Date(EXPIRES).toISOString());
      expect(mirror.lapsed_at).toBeNull();
    });

    it('reports the cancellation', () => {
      const { analytics } = deriveSubscriptionUpdate(event({ type: 'CANCELLATION' }));

      expect(analytics).toEqual({ event: 'subscription_cancelled', sku: 'aura_premium_annual' });
    });
  });

  describe('UNCANCELLATION', () => {
    it('restores auto-renew and stays premium', () => {
      const { mirror, analytics } = deriveSubscriptionUpdate(event({ type: 'UNCANCELLATION' }));

      expect(mirror).toMatchObject({ entitlement: 'premium', will_renew: true });
      // Not a new purchase — emitting one would double-count revenue.
      expect(analytics).toBeNull();
    });
  });

  describe('BILLING_ISSUE — grace, not punishment', () => {
    it('keeps her premium while the card is retried (12 §3)', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ type: 'BILLING_ISSUE' }));

      expect(mirror.entitlement).toBe('premium');
      expect(mirror.lapsed_at).toBeNull();
    });

    it('emits no analytics event — there is nothing to celebrate or mourn yet', () => {
      const { analytics } = deriveSubscriptionUpdate(event({ type: 'BILLING_ISSUE' }));

      expect(analytics).toBeNull();
    });

    it('records the event so Settings can show its one quiet badge', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ type: 'BILLING_ISSUE' }));

      expect(mirror.last_event).toBe('BILLING_ISSUE');
    });
  });

  describe('EXPIRATION — the only event that drops entitlement', () => {
    it('returns her to free', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ type: 'EXPIRATION' }));

      expect(mirror.entitlement).toBe('free');
      expect(mirror.will_renew).toBe(false);
      expect(mirror.period_type).toBeNull();
    });

    it('stamps lapsed_at for the win-back cron (11 §3)', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ type: 'EXPIRATION' }));

      expect(mirror.lapsed_at).toBe(new Date(AT).toISOString());
    });

    it('deletes nothing — she keeps her Letter and her data (checklist #6)', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ type: 'EXPIRATION' }));

      // The mirror is the ONLY thing this touches. Nothing in the derived update
      // references moments, memory or profile.
      expect(Object.keys(mirror).sort()).toEqual(
        [
          'entitlement',
          'expires_at',
          'lapsed_at',
          'last_event',
          'last_event_at',
          'period_type',
          'product_id',
          'rc_app_user_id',
          'will_renew',
        ].sort(),
      );
    });
  });

  describe('PRODUCT_CHANGE', () => {
    it('moves the mirror to the new product', () => {
      const { mirror } = deriveSubscriptionUpdate(
        event({
          type: 'PRODUCT_CHANGE',
          product_id: 'aura_premium_weekly',
          new_product_id: 'aura_premium_annual',
        }),
      );

      expect(mirror.product_id).toBe('aura_premium_annual');
      expect(mirror.entitlement).toBe('premium');
    });
  });

  describe('TRANSFER — restore on a device that was never claimed (03 §2.3)', () => {
    it('attributes the entitlement to the receiving user', () => {
      const { userId, mirror } = deriveSubscriptionUpdate(
        event({
          type: 'TRANSFER',
          app_user_id: 'user-old',
          transferred_from: ['user-old'],
          transferred_to: ['user-new'],
        }),
      );

      expect(userId).toBe('user-new');
      expect(mirror.entitlement).toBe('premium');
    });

    it('resolves to no user when there is no destination', () => {
      const { userId } = deriveSubscriptionUpdate(event({ type: 'TRANSFER' }));

      expect(userId).toBeNull();
    });
  });

  describe('user resolution (03 §4 — RC app_user_id ≡ Supabase user_id)', () => {
    it('uses the app_user_id directly', () => {
      expect(deriveSubscriptionUpdate(event({ app_user_id: 'user-7' })).userId).toBe('user-7');
    });

    it('falls back to the original id when the current one is absent', () => {
      const { userId } = deriveSubscriptionUpdate(
        event({ app_user_id: undefined, original_app_user_id: 'user-9' }),
      );

      expect(userId).toBe('user-9');
    });

    it('refuses a pre-login anonymous RevenueCat id', () => {
      // Writing a row keyed by "$RCAnonymousID:…" would fail the uuid column and,
      // worse, would mean an entitlement attributed to nobody.
      const { userId } = deriveSubscriptionUpdate(
        event({ app_user_id: '$RCAnonymousID:abc123', original_app_user_id: undefined }),
      );

      expect(userId).toBeNull();
    });

    it('carries the RevenueCat id onto the row for later transfers', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ app_user_id: 'user-1' }));

      expect(mirror.rc_app_user_id).toBe('user-1');
    });
  });

  describe('defensive parsing', () => {
    it('survives an event with no product id', () => {
      const { mirror, analytics } = deriveSubscriptionUpdate(
        event({ product_id: null, new_product_id: null }),
      );

      expect(mirror.product_id).toBeNull();
      expect(analytics?.sku).toBe('');
    });

    it('falls back to now when the event carries no timestamp', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ event_timestamp_ms: null }));

      expect(new Date(mirror.last_event_at).getTime()).toBeGreaterThan(0);
    });

    it('survives an event with no expiry', () => {
      const { mirror } = deriveSubscriptionUpdate(event({ expiration_at_ms: null }));

      expect(mirror.expires_at).toBeNull();
    });
  });
});
