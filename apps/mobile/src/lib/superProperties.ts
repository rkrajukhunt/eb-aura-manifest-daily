import type { SuperProperties } from '@aura/shared';
import Constants from 'expo-constants';

import { kv } from './storage';

/** Epoch ms of first open — days_since_install derives from it. */
export const INSTALLED_AT_KEY = 'app.installedAt';

/**
 * The super properties stamped on every event (13 §2, product 17):
 * session_id, subscription_state, days_since_install, app_version.
 *
 * `subscription_state` is 'free' until RevenueCat lands (Phase 10) — true by
 * definition, since nothing can be purchased yet. session_id rotates per cold
 * start; it groups a launch's events, nothing more, so it needs uniqueness
 * only within one user's history — not cryptographic strength.
 */
export function buildSuperProperties(now: number = Date.now()): SuperProperties {
  let installedAt = kv.get<number>(INSTALLED_AT_KEY);
  if (installedAt === undefined) {
    installedAt = now;
    kv.set(INSTALLED_AT_KEY, installedAt);
  }

  return {
    session_id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    subscription_state: 'free',
    days_since_install: Math.max(0, Math.floor((now - installedAt) / 86_400_000)),
    app_version: Constants.expoConfig?.version ?? 'unknown',
  };
}
