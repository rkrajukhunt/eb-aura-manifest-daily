import { useEffect } from 'react';

import { analytics, initAnalytics } from '@/lib/analytics';
import { emitAppOpen } from '@/lib/appOpen';
import { ensureSession, identifyForObservability } from '@/lib/auth';
import { useAppState } from '@/stores/appState';

/**
 * The boot sequence (05 §9):
 *   load session | signInAnonymously → identify → route gate
 *
 * RevenueCat `logIn` joins here in Phase 10; moment/affirmation prefetch in Phase 7.
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
        analytics.identify(userId);

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
