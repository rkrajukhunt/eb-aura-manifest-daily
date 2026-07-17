import type { AnalyticsClient, SuperProperties } from '@aura/shared';

/**
 * PostHog wrapper (13 §1). Phase 0 ships the seam, not the SDK: Phase 2 swaps the
 * body for `posthog-react-native` with autocapture OFF and `identify(user_id)`.
 *
 * The important part is already true — the surface only accepts catalog events
 * from `@aura/shared`, so a free-text string cannot be captured without a type
 * error (13 §2). Feature code should import `analytics` from here and never touch
 * the PostHog SDK directly; that keeps one emitter per event and one audit surface.
 */

let superProperties: Partial<SuperProperties> = {};

function noopCapture(event: string, payload?: unknown): void {
  if (__DEV__) {
    console.warn('[analytics:stub]', event, payload ?? '', superProperties);
  }
}

export const analytics: AnalyticsClient = {
  capture: ((event: string, payload?: unknown) =>
    noopCapture(event, payload)) as AnalyticsClient['capture'],

  identify(userId: string, props?: Partial<SuperProperties>) {
    superProperties = { ...superProperties, ...props };
    noopCapture('$identify', { userId });
  },

  register(props: Partial<SuperProperties>) {
    superProperties = { ...superProperties, ...props };
  },

  reset() {
    superProperties = {};
  },

  async flush() {
    // No-op until the SDK lands.
  },
};
