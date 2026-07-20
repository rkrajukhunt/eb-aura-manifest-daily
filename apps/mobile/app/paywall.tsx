import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { PaywallScreen } from '@/features/paywall/PaywallScreen';
import { appleAuthAvailable } from '@/features/paywall/claim';
import { markPaywallSeen } from '@/features/paywall/paywallSeen';
import { markPermissionAsked } from '@/features/notifications/permissionGate';
import {
  loadPlans,
  purchasePlan,
  restorePurchases,
  type OfferedPlan,
} from '@/features/paywall/purchases';
import { analytics } from '@/lib/analytics';
import { LetterMotionProvider } from '@/theme/motion';

/**
 * `/paywall` — the first presentation, straight after the Letter (06 §1).
 *
 * Wrapped in `LetterMotionProvider` so it keeps the Letter's slower breath: the
 * paywall is meant to read as the next page of the letter, not as a different
 * app arriving to ask for money (product 15 §spec).
 *
 * Dismissal is a REAL outcome. It marks the paywall seen, sends her to the free
 * tier, and never re-presents this cover — a second, quieter offer is banned
 * (product 01 §10).
 */
export default function PaywallRoute() {
  const router = useRouter();
  const [plans, setPlans] = useState<OfferedPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(true);
  const claimRef = useRef<BottomSheetModal>(null);

  // Distinct from `plans.length === 0`: before the lookup resolves the list is
  // empty too, and the two must not be confused — treating "still loading" as
  // "no offering" would skip the paywall for everyone.
  const [plansResolved, setPlansResolved] = useState(false);

  useEffect(() => {
    void loadPlans().then((offered) => {
      setPlans(offered);
      setPlansResolved(true);
    });
    void appleAuthAvailable().then(setAppleAvailable);
  }, []);

  const leaveToFreeTier = useCallback(() => {
    markPaywallSeen();
    // The notification ask is due on the first Home landing AFTER this (11 §2)
    // — never here. Product 08 forbids anything between the letter and the
    // paywall, and this is the first moment that rule stops applying.
    markPermissionAsked(false);
    router.replace('/(tabs)/home');
  }, [router]);

  // No offering (offline, or a build with no RevenueCat key): leave for the free
  // tier. Without this the cover renders empty and nothing ever moves — no
  // plans, so no CTA, and the dismiss ✕ lives inside `PaywallScreen`, which this
  // branch does not render. She would be stranded on a blank screen with no way
  // out, which is the opposite of what the free-tier fallback intends.
  useEffect(() => {
    if (plansResolved && plans.length === 0) leaveToFreeTier();
  }, [plansResolved, plans.length, leaveToFreeTier]);

  const onPurchase = useCallback(async (plan: OfferedPlan) => {
    setBusy(true);
    const outcome = await purchasePlan(plan);
    setBusy(false);

    if (outcome.status !== 'purchased') {
      // A cancel is a legitimate answer, and a failure already surfaced through
      // Apple's own sheet. Neither gets an error state from us (product 14).
      return;
    }

    analytics.capture('purchase_completed', { sku: plan.pkg.product.identifier });
    markPaywallSeen();
    // Claim now, while the value is freshest — but entitlement is already hers
    // whether or not she completes it (03 §2.2).
    claimRef.current?.present();
  }, []);

  const onRestore = useCallback(async () => {
    setBusy(true);
    const { premium } = await restorePurchases();
    setBusy(false);

    if (premium) {
      markPaywallSeen();
      claimRef.current?.present();
    }
  }, []);

  return (
    <LetterMotionProvider>
      {plans.length > 0 ? (
        <View style={{ flex: 1 }}>
          <PaywallScreen
            testID="paywall"
            plans={plans}
            busy={busy}
            onPurchase={(plan) => void onPurchase(plan)}
            onDismiss={leaveToFreeTier}
            onRestore={() => void onRestore()}
          />
          <ClaimSheet
            ref={claimRef}
            afterPurchase
            appleAvailable={appleAvailable}
            onDone={() => {
              claimRef.current?.dismiss();
              router.replace('/(tabs)/home');
            }}
          />
        </View>
      ) : (
        // Holding view: either the offering lookup is still in flight, or it
        // came back empty and the effect above is on its way to the free tier.
        // Showing an empty paywall would be worse than not showing one — she
        // can subscribe from Settings later.
        <Screen testID="paywall-unavailable" edgeToEdge>
          <View style={{ flex: 1 }} />
        </Screen>
      )}
    </LetterMotionProvider>
  );
}
