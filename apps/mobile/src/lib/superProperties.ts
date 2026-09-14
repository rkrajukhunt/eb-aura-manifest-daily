import type { SubscriptionState, SuperProperties } from '@aura/shared';
import Constants from 'expo-constants';

import { kv } from './storage';

/** Epoch ms of first open — days_since_install derives from it. */
export const INSTALLED_AT_KEY = 'app.installedAt';

/**
 * The super properties stamped on every event (13 §2, product 17):
 * session_id, subscription_state, days_since_install, app_version.
 *
 * `session_id` rotates per cold start; it groups a launch's events, nothing
 * more, so it needs uniqueness only within one user's history — not
 * cryptographic strength. `subscription_state` is derived from the boot
 * snapshot (useBoot), never hardcoded — a paying/trial user's events must not
 * be stamped `free`.
 */
export function buildSuperProperties(
  subscriptionState: SubscriptionState = 'free',
  now: number = Date.now(),
): SuperProperties {
  let installedAt = kv.get<number>(INSTALLED_AT_KEY);
  if (installedAt === undefined) {
    installedAt = now;
    kv.set(INSTALLED_AT_KEY, installedAt);
  }

  return {
    session_id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    subscription_state: subscriptionState,
    days_since_install: Math.max(0, Math.floor((now - installedAt) / 86_400_000)),
    app_version: Constants.expoConfig?.version ?? 'unknown',
  };
}
