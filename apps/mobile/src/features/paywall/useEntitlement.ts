import { useEffect, useState } from 'react';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { hasPremium, isConfigured, isInTrial } from './purchases';

export interface Entitlement {
  premium: boolean;
  inTrial: boolean;
  /** Undefined until the first read resolves — used to avoid a gating flash. */
  loading: boolean;
  info: CustomerInfo | null;
}

/**
 * The single source of truth for gating in the UI (12 §2).
 *
 * Every gated surface reads THIS, never a local flag and never the backend
 * mirror: RevenueCat's SDK knows about a purchase the instant it completes,
 * while the mirror only learns via webhook seconds later. Gating on the mirror
 * would show a paying customer a paywall she just paid to dismiss.
 *
 * It listens rather than polls, so a purchase, a restore or an expiry updates
 * every gated surface at once without anyone re-fetching.
 *
 * Defaults to FREE while loading and on any error. That direction matters: the
 * failure mode is "premium feature briefly looks locked", not "free user gets
 * premium then has it yanked away".
 */
export function useEntitlement(): Entitlement {
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured()) {
      // No RevenueCat on this build (dev without a key): everyone is free, and
      // nothing hangs waiting for an SDK that will never answer.
      setLoading(false);
      return;
    }

    let active = true;

    void Purchases.getCustomerInfo()
      .then((next) => {
        if (active) setInfo(next);
      })
      .catch(() => {
        // A network failure means we simply do not know yet; free is the safe
        // answer and the listener will correct it when the SDK reconnects.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const listener = (next: CustomerInfo) => setInfo(next);
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      active = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return {
    premium: hasPremium(info),
    inTrial: isInTrial(info),
    loading,
    info,
  };
}
