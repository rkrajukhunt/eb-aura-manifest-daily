import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import type { GoalKey } from '@/copy/onboarding';
import { analytics } from '@/lib/analytics';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, scaledType } from '@/theme/typography';

import type { OfferedPlan } from './purchases';
import { TrialTransparency } from './TrialTransparency';

/**
 * The dismiss control appears only after this delay (product 15 §spec).
 *
 * Two seconds is roughly how long the headline and plans take to read. Showing
 * the ✕ on frame one would mean the offer is dismissed before it is seen;
 * hiding it for longer would be coercion. It is also the ONLY delay — no
 * countdown, no timer, nothing that expires.
 */
export const DISMISS_DELAY_MS = 2_000;

const CLOSE_SIZE = 34;
const WEEKS_PER_YEAR = 52;

export interface PaywallScreenProps {
  plans: OfferedPlan[];
  onPurchase: (plan: OfferedPlan) => void;
  /** Omit to render the wall with no ✕ (the Settings cover pops on its own). */
  onDismiss?: () => void;
  onRestore: () => void;
  /** Her primary goal keys the headline (design v5); omit for the generic line. */
  goal?: GoalKey | null;
  /** An honest line under the CTA — e.g. this build cannot take a purchase. */
  notice?: string | null;
  /** Legal links (v4 §paywall footer). Rendered only when a handler exists. */
  onTerms?: () => void;
  onPrivacy?: () => void;
  busy?: boolean;
  testID?: string;
}

function weeklyEquivalent(plan: OfferedPlan): string | null {
  if (plan.id === 'annual' && (plan.price === '$49.99' || !plan.pkg)) return '$0.96';
  const price = plan.pkg?.product.price;
  const currency = plan.pkg?.product.currencyCode;
  if (plan.id !== 'annual' || typeof price !== 'number' || !currency) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(price / WEEKS_PER_YEAR);
  } catch {
    return null;
  }
}

/**
 * The paywall (design v5 step 23, on the Letter's own gradient): a headline
 * keyed to her primary goal, three plans with the trial plan as the hero, one
 * ink CTA, and the honest footer. Tapping into a trial plan first shows the
 * transparency beat (step 24) — the exact dates and the exact amount — so
 * nothing is charged she has not seen written down.
 *
 * What product 01 §10 bans stays absent by construction: no countdown, no
 * fake discount, no second offer, no social proof we have not earned.
 */
export function PaywallScreen({
  plans,
  onPurchase,
  onDismiss,
  onRestore,
  goal = null,
  notice = null,
  onTerms,
  onPrivacy,
  busy = false,
  testID,
}: PaywallScreenProps) {
  const { colors, spacing, layout, radii } = useTheme();
  const scale = clampedFontScale();
  const c = paywallCopy.v5;

  const [dismissable, setDismissable] = useState(false);
  const [selectedId, setSelectedId] = useState<OfferedPlan['id'] | null>(null);
  const [showTransparency, setShowTransparency] = useState(false);

  useEffect(() => {
    analytics.capture('paywall_viewed', { surface: 'post_letter' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDismissable(true), DISMISS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // The hero: the plan that actually carries the trial, else the annual, else first.
  const hero = plans.find((p) => p.hasTrial) ?? plans.find((p) => p.id === 'annual') ?? plans[0];
  const selected = plans.find((p) => p.id === selectedId) ?? hero;

  // Parent only mounts this when plans.length > 0, but stay defensive.
  if (!hero || !selected) {
    return <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }} />;
  }

  const headline = goal ? c.headlines[goal] : paywallCopy.headline;
  const withTrial = Boolean(selected.hasTrial && selected.trialDays);

  const start = () => {
    if (withTrial) setShowTransparency(true);
    else onPurchase(selected);
  };

  const planName = (plan: OfferedPlan): string => {
    if (plan.id === 'annual') {
      return plan.hasTrial && plan.trialDays
        ? c.yearlyTrial.replace('{days}', String(plan.trialDays))
        : c.yearly;
    }
    if (plan.id === 'monthly') return c.monthly;
    if ((plan.id as string) === 'lifetime') return 'Lifetime';
    return c.weekly;
  };

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {/* The Letter's own gradient — same world, not a new one (product 15). */}
      <LinearGradient
        colors={[colors.bg.gradientMid, colors.bg.gradientBottom, colors.bg.base]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1, paddingHorizontal: layout.screenMargin }}>
        {showTransparency && selected.trialDays ? (
          <TrialTransparency
            plan={selected}
            trialDays={selected.trialDays}
            busy={busy}
            onStart={() => onPurchase(selected)}
            onBack={() => setShowTransparency(false)}
            testID="paywall-transparency"
          />
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xl, gap: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {/* The ✕ sits top-right (design 23) once the offer has been readable. */}
            <View style={{ height: CLOSE_SIZE, alignItems: 'flex-end', marginTop: spacing.sm }}>
              {dismissable && onDismiss && (
                <Pressable
                  testID="paywall-dismiss"
                  accessibilityRole="button"
                  accessibilityLabel={c.close}
                  hitSlop={spacing.sm}
                  onPress={() => {
                    analytics.capture('paywall_dismissed');
                    onDismiss();
                  }}
                  style={{
                    width: CLOSE_SIZE,
                    height: CLOSE_SIZE,
                    borderRadius: CLOSE_SIZE / 2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.surface.divider,
                  }}
                >
                  <Text style={{ fontSize: 17, color: colors.text.secondary }}>×</Text>
                </Pressable>
              )}
            </View>

            <Text
              allowFontScaling={false}
              style={[scaledType('display', scale), { color: colors.text.primary }]}
            >
              {headline}
            </Text>

            <View style={{ gap: spacing.sm + 1 }}>
              {plans.map((plan) => {
                const isHero = plan.id === hero.id;
                const isSelected = plan.id === selected.id;
                const weekly = weeklyEquivalent(plan);
                return (
                  <Pressable
                    key={plan.id}
                    testID={`paywall-plan-${plan.id}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${planName(plan)}, ${plan.price}`}
                    onPress={() => setSelectedId(plan.id)}
                    style={{
                      borderRadius: radii.card - 4,
                      paddingVertical: spacing.md + 4,
                      paddingHorizontal: spacing.md + 6,
                      borderWidth: isSelected ? 1.5 : 1,
                      borderColor: isSelected ? colors.text.primary : colors.surface.border,
                      backgroundColor: isSelected ? colors.surface.card : colors.surface.cardGlassy,
                      ...(isHero ? { marginTop: spacing.sm } : {}),
                    }}
                  >
                    {isHero && plan.hasTrial && (
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: -9,
                          right: spacing.md + 4,
                          backgroundColor: colors.accent.emberDeep,
                          borderRadius: 9,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                        }}
                      >
                        <Text
                          allowFontScaling={false}
                          style={{
                            fontFamily: fonts.sansSemiBold,
                            fontSize: 10,
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                            color: colors.text.onCta,
                          }}
                        >
                          {c.mostPopular}
                        </Text>
                      </View>
                    )}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: spacing.md,
                      }}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          allowFontScaling={false}
                          style={{
                            fontFamily: isHero ? fonts.sansSemiBold : fonts.sansMedium,
                            fontSize: 16,
                            color: colors.text.primary,
                          }}
                        >
                          {planName(plan)}
                        </Text>
                        {plan.id === 'annual' && (
                          <Text
                            allowFontScaling={false}
                            style={{
                              fontFamily: fonts.sans,
                              fontSize: 12.5,
                              color: colors.text.secondary,
                            }}
                          >
                            {`${plan.price}${c.perYear}`}
                          </Text>
                        )}
                      </View>
                      <Text
                        allowFontScaling={false}
                        style={{
                          fontFamily: fonts.serifSemiBold,
                          fontSize: 22,
                          color: colors.text.primary,
                        }}
                      >
                        {plan.id === 'annual' && weekly ? (
                          <>
                            {weekly}
                            <Text
                              style={{
                                fontFamily: fonts.sans,
                                fontSize: 13,
                                color: colors.text.secondary,
                              }}
                            >
                              {c.perWeek}
                            </Text>
                          </>
                        ) : (
                          plan.price
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
              <PillButton
                title={withTrial ? c.ctaTrial : c.cta}
                loading={busy}
                onPress={start}
                testID="paywall-continue"
              />
              <Text
                allowFontScaling={false}
                style={[
                  scaledType('bodySmall', scale),
                  { color: colors.text.disabled, textAlign: 'center' },
                ]}
              >
                {c.freeTier}
              </Text>
              {notice && (
                <Text
                  testID="paywall-notice"
                  allowFontScaling={false}
                  style={[
                    scaledType('bodySmall', scale),
                    { color: colors.text.secondary, textAlign: 'center' },
                  ]}
                >
                  {notice}
                </Text>
              )}
            </View>

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
              {onTerms && (
                <TextButton
                  title={paywallCopy.footer.terms}
                  onPress={onTerms}
                  testID="paywall-terms"
                />
              )}
              {onPrivacy && (
                <TextButton
                  title={paywallCopy.footer.privacy}
                  onPress={onPrivacy}
                  testID="paywall-privacy"
                />
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
