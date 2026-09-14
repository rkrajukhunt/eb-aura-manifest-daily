import { useEffect } from 'react';

import Purchases, { type CustomerInfo } from 'react-native-purchases';

import type { SubscriptionState } from '@aura/shared';

import { sweepAudioCache } from '@/features/letter/audioCache';
import {
  configurePurchases,
  hasPremium,
  isConfigured,
  isInTrial,
} from '@/features/paywall/purchases';
import { analytics, initAnalytics, reloadFeatureFlags } from '@/lib/analytics';
import { emitAppOpen } from '@/lib/appOpen';
import { initGa4 } from '@/lib/ga4';
import { ensureSession } from '@/lib/auth';
import { buildSuperProperties } from '@/lib/superProperties';
import { requestTrackingPermission } from '@/lib/tracking';
import { useAppState } from '@/stores/appState';

/** The snapshot's best read on her subscription (13 §2), derived — never guessed. */
function subscriptionStateOf(
  customerInfo: CustomerInfo | null | undefined,
  premium: boolean,
): SubscriptionState {
  if (!premium) return 'free';
  if (isInTrial(customerInfo)) return 'trial';
  return 'paid';
}

/**
 * The boot sequence (05 §9, reversed 2026-07-27):
 *   read stored session → (none? → unauthenticated) → identify → route gate
 *
 * RevenueCat is configured here with her Supabase id as the RC `app_user_id`
 * (03 §4) — the binding that lets an anonymous purchase survive a later claim.
 * Moment/affirmation prefetch joins in Phase 7.
 */
export function useBoot(): void {
  const setReady = useAppState((s) => s.setReady);
  const setUnauthenticated = useAppState((s) => s.setUnauthenticated);
  const setFailed = useAppState((s) => s.setFailed);
  // Re-runs the whole sequence after a sign-in or sign-out. A sign-in has just
  // created the session this re-run picks up; a sign-out leaves none, so the
  // re-run lands in `unauthenticated` and the gate shows the wall. See `bootNonce`.
  const bootNonce = useAppState((s) => s.bootNonce);

  useEffect(() => {
    let cancelled = false;

    // Which boot step is in flight. A failure here used to be reported as a bare
    // `failed` with the error discarded, so a step that threw only on a real
    // device (native modules and stored-session state differ from the simulator)
    // left nothing at all to go on. Naming the step is what makes the difference
    // between "boot broke" and "boot broke AT purchases".
    let step = 'ensureSession';

    async function boot(): Promise<void> {
      try {
        // ATT must be resolved before any analytics SDK is initialized. Firebase
        // auto-collection is disabled in the iOS plist and enabled below only
        // after this request completes; a permission API failure must never
        // prevent the app from launching. GA4 (the ad-conversion sink) also only
        // turns on when she granted the prompt (M11).
        step = 'requestTrackingPermission';
        const trackingAllowed = await requestTrackingPermission().catch(() => false);
        if (cancelled) return;

        const session = await ensureSession();
        if (cancelled) return;

        // No stored session means she has never signed in (or signed out): the
        // app mints nothing anonymous any more (03 §2.1 reversal), so this is the
        // unauthenticated state and the boot gate shows her the sign-in wall.
        // RevenueCat and analytics identify are deliberately below this line —
        // there is no user id to bind them to until she has an account.
        if (!session) {
          setUnauthenticated();
          return;
        }

        const userId = session.user.id;

        step = 'initAnalytics';
        initAnalytics();
        // Self-guarding: `getAnalytics()` inside throws SYNCHRONOUSLY when the
        // native Firebase app is not configured, so ga4.ts wraps it in try/catch
        // and simply stays disabled. Analytics never breaks boot.
        step = 'initGa4';
        initGa4(trackingAllowed);

        // Bound to her Supabase id, so a purchase made anonymously still belongs
        // to her after she claims. Never fatal: a build with no RevenueCat key
        // simply has everyone on the free tier (12 §2).
        step = 'configurePurchases';
        await configurePurchases(userId).catch(() => undefined);

        // Entitlement snapshot for the hard gate (2026-08-10). Read here — after
        // configure, before setReady — so BootGate can route without the
        // useEntitlement-at-boot race: that hook latches "not configured → free"
        // if it mounts before RC is configured, which at boot it always would.
        // A build with no key stays unenforceable: this snapshot is free, the
        // gate routes to the paywall, and the PAYWALL route (the only place
        // that can see the offering) resolves an absent looking to Home — NOT
        // `resolveBootRoute`, which sends every non-premium user to the wall.
        // getCustomerInfo returns RC's cached info when offline, so an existing
        // subscriber offline stays premium; a true never-cached edge can still
        // Restore at the wall.
        step = 'getCustomerInfo';
        const purchasesConfigured = isConfigured();
        const customerInfo = purchasesConfigured
          ? await Purchases.getCustomerInfo().catch(() => null)
          : null;
        const premium = hasPremium(customerInfo);

        // Super properties + identify AFTER the entitlement snapshot, so a
        // paying or trial user's very first event is not stamped `free` (13 §2,
        // M9). `register` is a merge, so subsequent subscription-state updates
        // layer cleanly over the session props.
        step = 'superProperties';
        analytics.register(buildSuperProperties(subscriptionStateOf(customerInfo, premium)));
        analytics.identify(userId);
        // Pull feature flags / experiment variants for this identity now, so a
        // flagged surface has its variant by first render. Best-effort — a flag
        // outage must never delay or fail boot (they degrade to control).
        void reloadFeatureFlags();

        // The 7-day expiry and 200MB LRU (10 §6). The policy was written and
        // tested at Phase 7 but nothing ever called it, so the cache grew
        // without bound. Boot is the right moment: it is off the critical path
        // and runs exactly once per launch.
        // The one that hides in plain sight: paywall routes every free user to
        // the wall, so "onboarding finished and no subscription screen
        // appeared" looks like a routing bug rather than missing config — it is
        // the paywall route's no-offering escape to Home that silently decides.
        if (__DEV__ && !purchasesConfigured) {
          console.warn(
            '[boot] Purchases NOT configured — entitlement is free for everyone, ' +
              'so the paywall hard-gates every launch and then self-escapes to ' +
              'Home when no offering resolves. Set the RevenueCat key and rebuild.',
          );
        }

        step = 'sweepAudioCache';
        sweepAudioCache();

        step = 'emitAppOpen';
        emitAppOpen('cold');
        setReady(userId, premium, purchasesConfigured);
      } catch (error) {
        // No error code reaches the UI in a shipped build — the screen still
        // shows one in-voice line and a retry (05 §8). The step name is folded
        // into the failure reason so a device-only boot failure stays legible
        // through the __DEV__ line on the boot screen (see appState.bootError).
        const detail = error instanceof Error ? error.message : String(error);

        if (__DEV__) {
          console.error(`[boot] failed at step "${step}":`, error);
        }

        if (!cancelled) setFailed(`${step}: ${detail}`);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [setReady, setUnauthenticated, setFailed, bootNonce]);
}
