import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

import { PlanCard } from './PlanCard';
import type { OfferedPlan } from './purchases';

/**
 * The dismiss control appears only after this delay (product 15 §spec).
 *
 * This is the one timing in the product that could be read as a dark pattern, so
 * it is worth being precise about why it is not: two seconds is roughly how long
 * the contrast block takes to read. Showing the X on frame one would mean the
 * offer is dismissed before it is seen; hiding it for longer would be coercion.
 * It is also the ONLY delay — no countdown, no timer, nothing that expires.
 */
export const DISMISS_DELAY_MS = 2_000;

export interface PaywallScreenProps {
  plans: OfferedPlan[];
  onPurchase: (plan: OfferedPlan) => void;
  onDismiss: () => void;
  onRestore: () => void;
  busy?: boolean;
  testID?: string;
}

/**
 * The post-Letter paywall (product 15 §spec, 12 §3).
 *
 * It inherits the Letter's gradient so it reads as the next page of the letter
 * rather than an interruption — the placement is deliberate too: after the
 * emotional resolution, never inside or immediately after a vulnerable
 * disclosure (checklist #4).
 *
 * Everything product 01 §10 bans is absent by construction: no countdown, no
 * fake discount, no "quieter price" second offer, no social proof we have not
 * earned yet. Dismissing is a real outcome that leads to a real free tier.
 */
export function PaywallScreen({
  plans,
  onPurchase,
  onDismiss,
  onRestore,
  busy = false,
  testID,
}: PaywallScreenProps) {
  const { colors, spacing, layout } = useTheme();
  const scale = clampedFontScale();

  // Annual is pre-selected — the hero, and the honest best value (12 §1).
  const [selectedId, setSelectedId] = useState<string | null>(plans[0]?.id ?? null);
  const [dismissable, setDismissable] = useState(false);

  useEffect(() => {
    analytics.capture('paywall_viewed', { surface: 'post_letter' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDismissable(true), DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const selected = plans.find((p) => p.id === selectedId) ?? plans[0];

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {/* The Letter's own gradient — same world, not a new one (product 15). */}
      <LinearGradient
        colors={[colors.bg.gradientMid, colors.bg.gradientBottom, colors.bg.base]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1, paddingHorizontal: layout.screenMargin }}>
        {dismissable && (
          <Pressable
            testID="paywall-dismiss"
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => {
              analytics.capture('paywall_dismissed');
              onDismiss();
            }}
            style={{ alignSelf: 'flex-end', padding: spacing.sm }}
          >
            <Text style={{ fontSize: 22 * scale, color: colors.text.secondary }}>✕</Text>
          </Pressable>
        )}

        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: 'Fraunces_400Regular',
              fontSize: 28 * scale,
              lineHeight: 38 * scale,
              color: colors.text.primary,
              marginTop: dismissable ? 0 : spacing.xl,
            }}
          >
            {paywallCopy.headline}
          </Text>

          <View style={{ gap: spacing.md }}>
            <ContrastRow
              label={paywallCopy.contrast.todayLabel}
              body={paywallCopy.contrast.today}
            />
            <ContrastRow
              label={paywallCopy.contrast.everyDayLabel}
              body={paywallCopy.contrast.everyDay}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={plan.id === selectedId}
                testID={`paywall-plan-${plan.id}`}
                onSelect={() => {
                  setSelectedId(plan.id);
                  analytics.capture('paywall_plan_selected', { sku: plan.pkg.product.identifier });
                }}
              />
            ))}
          </View>

          {selected && (
            <PillButton
              title={paywallCopy.plans.cta}
              loading={busy}
              onPress={() => onPurchase(selected)}
              testID="paywall-continue"
            />
          )}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <TextButton
              title={paywallCopy.footer.restore}
              onPress={onRestore}
              testID="paywall-restore"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ContrastRow({ label, body }: { label: string; body: string }) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        allowFontScaling={false}
        style={{ fontSize: 12 * scale, letterSpacing: 1, color: colors.text.secondary }}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        allowFontScaling={false}
        style={{ fontSize: 16 * scale, lineHeight: 24 * scale, color: colors.text.primary }}
      >
        {body}
      </Text>
    </View>
  );
}
