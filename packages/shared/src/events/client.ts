import type { EmptyPayloadEvent, EventName, EventPayload, SuperProperties } from './types';

/**
 * The shape both the mobile and backend PostHog wrappers implement (13 §1).
 *
 * `capture` is overloaded so that events with no payload take one argument and
 * events with a payload require theirs. Because `E` is constrained to the
 * catalog, a free-form event name is a compile error — which is the point.
 */
export interface AnalyticsClient {
  capture<E extends EmptyPayloadEvent>(event: E): void;
  capture<E extends EventName>(event: E, payload: EventPayload<E>): void;

  /** Supabase uuid → PostHog distinct id. One identity everywhere (13 §1). */
  identify(userId: string, superProperties?: Partial<SuperProperties>): void;

  /** Merged into every subsequent event (13 §2). */
  register(superProperties: Partial<SuperProperties>): void;

  reset(): void;
  flush(): Promise<void>;
}

/**
 * Bucket a free-text length for analytics (13 §2). Callers pass `value.length`,
 * never the value — the content itself must not reach this module.
 */
export function charCountBucket(length: number): 'empty' | 'short' | 'medium' | 'long' {
  if (length <= 0) return 'empty';
  if (length < 40) return 'short';
  if (length < 160) return 'medium';
  return 'long';
}
