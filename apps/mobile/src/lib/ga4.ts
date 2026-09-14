import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';
import Constants from 'expo-constants';

/**
 * Google Analytics 4 (Firebase) — the ad-conversion sink (spec 2026-07-31).
 *
 * Deliberately catalog-unaware: it knows how to talk to Firebase, not which
 * events are allowed. The allowlist and the catalog→GA4 name mapping live in
 * `analytics.ts`, next to the one emitter, so "what Google receives" is one
 * readable, auditable decision separate from "how GA4 works".
 *
 * Collection is gated on two things: the build environment (store-bound builds
 * only — a complete no-op in local development and under jest, the same
 * "no key = no-op" posture PostHog has, spec §8) AND the ATT result on iOS
 * (M11). A denied/restricted prompt must not report to the ad-conversion sink;
 * a granted one (or Android, which has no ATT) may.
 *
 * Uses the modular Firebase Analytics API (v26+): named functions taking the
 * Analytics instance, not the old `analytics().logEvent(...)` namespaced form.
 */

let enabled = false;

/**
 * Store-bound builds collect; everything else stays silent.
 *
 * The env is read from `Constants.expoConfig.extra.buildEnv` — NOT
 * `process.env.APP_ENV`. Metro only inlines `EXPO_PUBLIC_*` vars into the device
 * bundle (see src/lib/env.ts), so `process.env.APP_ENV` is `undefined` at
 * runtime and would keep GA4 permanently off in every real build. `app.config.ts`
 * bakes `APP_ENV` into `extra.buildEnv` at build time; that is the runtime source.
 *
 * Gated on `'production'` only, which is the exact set of store-bound builds:
 * both the `production` AND the `preview` EAS profiles set `APP_ENV=production`
 * (see eas.json), so this covers preview verification builds too. `development`
 * and `staging` carry their own value and stay off — local dev, jest and staging
 * never report to GA4.
 */
function shouldEnable(): boolean {
  const env = Constants.expoConfig?.extra?.buildEnv as string | undefined;
  return env === 'production';
}

/**
 * @param trackingAllowed The ATT decision from `requestTrackingPermission()`
 * (true on Android/granted, false on denied/restricted). The default of `true`
 * only stands in for callers that never hold an ATT signal (tests).
 */
export function initGa4(trackingAllowed: boolean = true): void {
  enabled = shouldEnable() && trackingAllowed;
  try {
    // `getAnalytics()` throws SYNCHRONOUSLY when the native Firebase app was
    // never configured ("No Firebase App '[DEFAULT]' has been created") — a
    // dev client built without the GoogleService plist, for instance. A
    // `.catch()` guards only the promise, never that lookup, which is how this
    // took down the whole app at the `initGa4` boot step.
    //
    // Analytics is instrumentation: never a reason the app fails to start. If
    // the SDK is not there, collection stays off and boot continues.
    void setAnalyticsCollectionEnabled(getAnalytics(), enabled).catch(() => {});
  } catch {
    enabled = false;
  }
}

export function isGa4Enabled(): boolean {
  return enabled;
}

/**
 * Logs a single GA4 event by NAME only — never any params (spec §6: no content
 * reaches GA4). No-op unless collection is enabled.
 */
export async function logGa4Event(name: string): Promise<void> {
  if (!enabled) return;
  try {
    // Same synchronous-throw hazard as initGa4: a missing native app must lose
    // the event, never break the caller mid-flow.
    await logEvent(getAnalytics(), name);
  } catch {
    // Instrumentation is best-effort.
  }
}
