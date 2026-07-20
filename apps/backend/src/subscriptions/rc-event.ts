import type { EventName, RcWebhookEvent } from '@aura/shared';

/**
 * RevenueCat event → mirror row + analytics (12 §5).
 *
 * Pure, because this is where every subtle monetization rule lives and none of
 * them are observable by eye. Two in particular are easy to get backwards and
 * expensive if you do:
 *
 *  - **CANCELLATION does not end the entitlement.** It turns auto-renew off.
 *    She paid for the period and keeps premium until `expires_at`; treating
 *    cancellation as expiry would revoke access someone already bought, which
 *    is exactly the behaviour the anti-resentment checklist exists to prevent.
 *  - **BILLING_ISSUE does not end the entitlement either.** RevenueCat's grace
 *    period is on, so access continues while the card is retried. Product 12 §3
 *    allows one quiet Settings badge and forbids in-app nagging.
 */

export interface SubscriptionMirror {
  entitlement: 'free' | 'premium';
  product_id: string | null;
  period_type: 'trial' | 'normal' | null;
  expires_at: string | null;
  will_renew: boolean;
  rc_app_user_id: string | null;
  last_event: string;
  last_event_at: string;
  lapsed_at: string | null;
}

export interface DerivedEvent {
  /** The Supabase user this event belongs to (RC app_user_id ≡ user_id, 03 §4). */
  userId: string | null;
  mirror: SubscriptionMirror;
  /** Server-side analytics to emit, if any (13 §3). */
  analytics: { event: EventName; sku: string } | null;
}

export function deriveSubscriptionUpdate(event: RcWebhookEvent): DerivedEvent {
  const now = new Date(event.event_timestamp_ms ?? Date.now()).toISOString();
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const sku = event.new_product_id ?? event.product_id ?? '';
  const isTrial = event.period_type === 'TRIAL';

  const base: SubscriptionMirror = {
    entitlement: 'premium',
    product_id: sku || null,
    period_type: isTrial ? 'trial' : 'normal',
    expires_at: expiresAt,
    will_renew: true,
    rc_app_user_id: event.app_user_id ?? null,
    last_event: event.type,
    last_event_at: now,
    lapsed_at: null,
  };

  const userId = resolveUserId(event);

  switch (event.type) {
    case 'INITIAL_PURCHASE':
      return {
        userId,
        mirror: base,
        // A trial start is not a purchase. Conflating them would inflate the
        // conversion number the whole pricing experiment is measured on.
        analytics: { event: isTrial ? 'trial_started' : 'purchase_completed', sku },
      };

    case 'RENEWAL':
      return {
        userId,
        // A renewal always lands on a paid period, even when the previous one
        // was the trial converting.
        mirror: { ...base, period_type: 'normal' },
        analytics: { event: 'subscription_renewed', sku },
      };

    case 'UNCANCELLATION':
      return { userId, mirror: base, analytics: null };

    case 'PRODUCT_CHANGE':
      return { userId, mirror: base, analytics: null };

    case 'CANCELLATION':
      // Auto-renew off; access runs to period end. Still `premium`.
      return {
        userId,
        mirror: { ...base, will_renew: false },
        analytics: { event: 'subscription_cancelled', sku },
      };

    case 'BILLING_ISSUE':
      // Grace period: keep access, record the event so Settings can show its
      // one quiet badge (12 §3).
      return { userId, mirror: { ...base, will_renew: false }, analytics: null };

    case 'EXPIRATION':
      // The only event that actually drops entitlement. She keeps her Letter and
      // all her data — checklist #6 — because nothing here deletes anything.
      return {
        userId,
        mirror: {
          ...base,
          entitlement: 'free',
          period_type: null,
          will_renew: false,
          lapsed_at: now,
        },
        analytics: null,
      };

    case 'TRANSFER':
      // The receipt moved to another app_user_id (03 §2.3 — restore on a new
      // device that was never claimed). The row we must update is the one being
      // transferred TO; the old identity is unrecoverable by design.
      return {
        userId: event.transferred_to?.[0] ?? null,
        mirror: base,
        analytics: null,
      };
  }
}

/**
 * Which Supabase user this event is about. RC's `app_user_id` IS the Supabase
 * user id (03 §4), so no aliasing table is needed — but RC sends anonymous ids
 * of the form `$RCAnonymousID:…` before `logIn` has run, and those belong to no
 * user. Returning null lets the caller drop the event instead of writing a row
 * keyed by a string that is not a uuid.
 */
function resolveUserId(event: RcWebhookEvent): string | null {
  const id = event.app_user_id ?? event.original_app_user_id ?? null;
  if (!id || id.startsWith('$RCAnonymousID')) return null;
  return id;
}
