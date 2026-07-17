import type { AppOpenSource } from '@aura/shared';

import { analytics } from './analytics';
import { kv } from './storage';

/** MMKV flag distinguishing the very first open of an install from every later one. */
export const FIRST_OPEN_KEY = 'app.hasOpenedBefore';

/**
 * Emits the open events for a launch (product 17).
 *
 * `app_first_open` must fire EXACTLY once per install — it is the top of the
 * first-session funnel, so a double-fire would inflate the denominator of the one
 * metric the launch is judged on (product 06 targets). The flag is written before
 * the event so a crash mid-emit can't cause a re-fire on the next launch.
 */
export function emitAppOpen(source: AppOpenSource = 'cold'): void {
  const hasOpenedBefore = kv.get<boolean>(FIRST_OPEN_KEY) ?? false;

  if (!hasOpenedBefore) {
    kv.set(FIRST_OPEN_KEY, true);
    analytics.capture('app_first_open');
  }

  analytics.capture('app_open', { source });
}
