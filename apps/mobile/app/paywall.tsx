import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Text, View } from 'react-native';

import { Screen, TextButton } from '@/components';
import { useGratitude } from '@/features/gratitude/useGratitude';
import { goalKeyOf, primaryGoalOf } from '@/features/onboarding/flow';
import { DiscountOfferScreen } from '@/features/paywall/DiscountOfferScreen';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { HandoffScreen } from '@/features/paywall/HandoffScreen';
import { PaywallScreen } from '@/features/paywall/PaywallScreen';
import { appleAuthAvailable } from '@/features/paywall/claim';
import { markPaywallSeen } from '@/features/paywall/paywallSeen';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import {
  loadPlans,
  purchasePlan,
  restorePurchases,
  type OfferedPlan,
} from '@/features/paywall/purchases';
import { paywallCopy } from '@/copy/paywall';
import { useProfile } from '@/hooks/useProfile';
import { analytics } from '@/lib/analytics';
import { env } from '@/lib/env';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';
import { LetterMotionProvider } from '@/theme/motion';

/**
 * `/paywall` — 4-step post-onboarding presentation.
 */
export default function PaywallRoute() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const askedForPlans = from === 'settings';
  const hard = !askedForPlans;
  const { premium } = useEntitlement();
  const userId = useAppState((s) => s.userId);
  const { data: profile } = useProfile(userId ?? undefined);
  const { todaysEntry } = useGratitude(userId ?? undefined);
  const answers = useOnboardingDraft((s) => s.answers);

  const goal = answers['a04-goals']
    ? primaryGoalOf(answers)
    : (goalKeyOf(profile?.values?.[0]) ?? null);

  const [handoff, setHandoff] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [plans, setPlans] = useState<OfferedPlan[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(true);
  const claimRef = useRef<BottomSheetModal>(null);

  const [plansResolved, setPlansResolved] = useState(false);
  const purchasable = plans.some((plan) => plan.purchasable);
  const showCover = plans.length > 0 && (purchasable || !hard);

  useEffect(() => {
    void loadPlans().then((offered) => {
      setPlans(offered);
      setPlansResolved(true);
    });
    void appleAuthAvailable().then(setAppleAvailable);
  }, []);

  const leaveToHome = useCallback(() => {
    markPaywallSeen();
    router.replace('/(tabs)/home');
  }, [router]);

  const onDismissCover = useCallback(() => {
    if (askedForPlans) {
      router.back();
      return;
    }
    // Show discount offer (Screen 3) on first dismissal
    setShowDiscount(true);
  }, [askedForPlans, router]);

  useEffect(() => {
    if (hard && premium) router.replace('/(tabs)/home');
  }, [hard, premium, router]);

  useEffect(() => {
    if (plansResolved && hard && !purchasable) leaveToHome();
  }, [plansResolved, hard, purchasable, leaveToHome]);

  useEffect(() => {
    if (!hard) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [hard]);

  const onPurchase = useCallback(async (plan: OfferedPlan) => {
    setNotice(null);
    setBusy(true);
    const outcome = await purchasePlan(plan);
    setBusy(false);

    if (outcome.status === 'unavailable') {
      setNotice(paywallCopy.purchaseUnavailableNote);
      return;
    }

    if (outcome.status !== 'purchased') {
      return;
    }

    const sku = plan.pkg?.product.identifier ?? plan.id;
    analytics.capture('purchase_completed', { sku });
    if (plan.hasTrial) analytics.capture('trial_started', { sku });
    markPaywallSeen();

    setHandoff(true);
  }, []);

  const onRestore = useCallback(async () => {
    setBusy(true);
    const { premium } = await restorePurchases();
    setBusy(false);

    if (premium) {
      markPaywallSeen();
      if (hard) {
        router.replace('/(tabs)/home');
        return;
      }
      claimRef.current?.present();
    }
  }, [hard, router]);

  if (handoff) {
    return (
      <HandoffScreen
        testID="paywall-handoff"
        name={profile?.name?.trim() || null}
        gratitudeSaved={todaysEntry !== null}
        onStart={leaveToHome}
      />
    );
  }

  if (showDiscount) {
    return (
      <LetterMotionProvider>
        <Screen testID="paywall-discount" edgeToEdge>
          <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
            <DiscountOfferScreen
              busy={busy}
              onAccept={() => {
                const discountPlan = plans.find((p) => p.id === 'annual') ?? {
                  id: 'annual',
                  pkg: null,
                  price: '$24.99',
                  monthlyEquivalent: '$2.08',
                  hasTrial: false,
                  trialDays: null,
                  purchasable: true,
                };
                void onPurchase(discountPlan);
              }}
              onDecline={() => {
                setShowDiscount(false);
              }}
            />
          </View>
        </Screen>
      </LetterMotionProvider>
    );
  }

  return (
    <LetterMotionProvider>
      {showCover ? (
        <View style={{ flex: 1 }}>
          <PaywallScreen
            testID="paywall"
            plans={plans}
            busy={busy}
            onPurchase={(plan) => void onPurchase(plan)}
            goal={goal}
            onDismiss={onDismissCover}
            onRestore={() => void onRestore()}
            notice={notice}
            // Rendered only when a URL exists. Both are required before a
            // subscription build passes store review; the footer omits a link
            // it cannot honour rather than showing a dead one.
            {...(env.EXPO_PUBLIC_TERMS_URL
              ? { onTerms: () => void Linking.openURL(env.EXPO_PUBLIC_TERMS_URL as string) }
              : {})}
            {...(env.EXPO_PUBLIC_PRIVACY_URL
              ? { onPrivacy: () => void Linking.openURL(env.EXPO_PUBLIC_PRIVACY_URL as string) }
              : {})}
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
        // Holding view: the offering lookup is still in flight, or (hard mode) it
        // resolved with nothing purchasable and the effect above is on its way to
        // Home. Showing an empty — or fake-priced — paywall would be worse than
        // showing none; she can subscribe from Settings once the store is live.
        <Screen testID="paywall-unavailable" edgeToEdge>
          {plansResolved && askedForPlans ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                gap: spacing.lg,
                // The cover is edge-to-edge; this copy still needs the margin.
                paddingHorizontal: spacing.xl,
              }}
            >
              <Text
                testID="paywall-unavailable-message"
                allowFontScaling={false}
                style={[
                  scaledType('body', scale),
                  { color: colors.text.secondary, textAlign: 'center' },
                ]}
              >
                {paywallCopy.subscription.plansUnavailable}
              </Text>
              <TextButton
                title={paywallCopy.subscription.back}
                onPress={() => router.back()}
                testID="paywall-unavailable-back"
              />
            </View>
          ) : (
            // Still in flight, or on its way to the free tier.
            <View style={{ flex: 1 }} />
          )}
        </Screen>
      )}
    </LetterMotionProvider>
  );
}
