/**
 * Typed analytics event catalog (13 §2, product 17).
 *
 * THE PRIVACY RULE, ENFORCED BY THE TYPE SYSTEM:
 * No free-text content, struggles, people names, or memory contents ever enter
 * analytics — only structural metadata. Every payload field below is a safe
 * primitive: an enum, a boolean, or a bucketed count. There is deliberately no
 * open `string` field anywhere in this catalog, so user content cannot be passed
 * to `capture()` without a type error. A CI test (15 §5) backstops this.
 *
 * If you are tempted to add a `string` field: bucket it (see `CharCountBucket`)
 * or make it a union of known literals instead.
 */

/** Free-text length is reported as a bucket, never as content or exact length. */
export type CharCountBucket = 'empty' | 'short' | 'medium' | 'long';

/** Playback completion as a coarse percentage bucket. */
export type ListenedPct = 0 | 25 | 50 | 75 | 100;

export type AppOpenSource = 'cold' | 'notification' | 'background';
export type PlaybackSource = 'home' | 'notification' | 'replay' | 'deeplink';
export type SubscriptionState = 'free' | 'trial' | 'paid' | 'lapsed';

/**
 * Super properties attached to every event (13 §2, product 17).
 * `user_pseudo_id` is the PostHog distinct id (Supabase uuid — pseudonymous).
 */
export interface SuperProperties {
  session_id: string;
  subscription_state: SubscriptionState;
  days_since_install: number;
  app_version: string;
}

/**
 * The catalog. Each key is an event name; each value is its payload.
 * `Record<string, never>` means "no payload".
 *
 * Ownership (13 §3): each event has exactly one emitter — no double counting.
 * Events are added in the phase that ships their surface; the full inventory
 * from product 17 is completed and audited in Phase 11.
 */
export interface EventCatalog {
  // ─── Lifecycle (Phase 2) ───────────────────────────────────────────────
  /** Mobile. Fires once, on the very first open of a fresh install. */
  app_first_open: Record<string, never>;
  /** Mobile. */
  app_open: { source: AppOpenSource };
}

export type EventName = keyof EventCatalog;
export type EventPayload<E extends EventName> = EventCatalog[E];

/**
 * Events with no payload — `capture` lets these be called without a second arg.
 */
export type EmptyPayloadEvent = {
  [E in EventName]: EventCatalog[E] extends Record<string, never> ? E : never;
}[EventName];
