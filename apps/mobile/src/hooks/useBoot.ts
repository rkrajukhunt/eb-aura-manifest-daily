import { useEffect } from 'react';

import { configurePurchases } from '@/features/paywall/purchases';
import { analytics, initAnalytics } from '@/lib/analytics';
import { emitAppOpen } from '@/lib/appOpen';
import { ensureSession, identifyForObservability } from '@/lib/auth';
import { buildSuperProperties } from '@/lib/superProperties';
import { useAppState } from '@/stores/appState';

/**
 * The boot sequence (05 §9):
 *   load session | signInAnonymously → identify → route gate
 *
 * RevenueCat is configured here with her Supabase id as the RC `app_user_id`
 * (03 §4) — the binding that lets an anonymous purchase survive a later claim.
 * Moment/affirmation prefetch joins in Phase 7.
 */
export function useBoot(): void {
  const setReady = useAppState((s) => s.setReady);
  const setFailed = useAppState((s) => s.setFailed);

  useEffect(() => {
    let cancelled = false;

    async function boot(): Promise<void> {
      try {
        const session = await ensureSession();
        if (cancelled) return;

        const userId = session.user.id;

        initAnalytics();
        identifyForObservability(userId);
        // Super properties before identify so every event this session carries
        // them (13 §2). subscription_state updates when RC lands (Phase 10).
        analytics.register(buildSuperProperties());
        analytics.identify(userId);

        // Bound to her Supabase id, so a purchase made anonymously still belongs
        // to her after she claims. Never fatal: a build with no RevenueCat key
        // simply has everyone on the free tier (12 §2).
        await configurePurchases(userId).catch(() => undefined);

        emitAppOpen('cold');
        setReady(userId);
      } catch {
        // No error code reaches the UI. The screen shows one in-voice line and a
        // retry (05 §8); Sentry already captured the detail.
        if (!cancelled) setFailed();
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [setReady, setFailed]);
}
