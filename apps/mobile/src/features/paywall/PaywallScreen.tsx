import { Ionicons } from '@expo/vector-icons';
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
import { TrialTimeline } from './TrialTimeline';
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

/**
 * The per-week figure on the annual card, derived from the store's real price.
 * Null whenever the card has no store package behind it — a fake plan must
 * never show a second, invented price next to its headline (product 15 #2).
 */
function weeklyEquivalent(plan: OfferedPlan): string | null {
  if (plan.id !== 'annual') return null;
  const price = plan.pkg?.product.price;
  const currency = plan.pkg?.product.currencyCode;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || !currency) return null;
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
  goal: _goal = null,
  notice = null,
  onTerms,
  onPrivacy,
  busy = false,
  testID,
}: PaywallScreenProps) {
  const { colors, spacing, layout } = useTheme();
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

  const withTrial = Boolean(selected.hasTrial && selected.trialDays);
  const heroTrialDays = hero.trialDays ?? 3;
  const heroWeekly = weeklyEquivalent(hero);
  const t = paywallCopy.trial;

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
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'space-between',
              paddingBottom: spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Top Bar: Close */}
            <View style={{ height: CLOSE_SIZE, alignItems: 'flex-start', marginTop: spacing.xs }}>
              {dismissable && onDismiss && (
                <Pressable
                  testID="paywall-dismiss"
                  accessibilityRole="button"
                  accessibilityLabel={c.close}
                  hitSlop={spacing.md}
                  onPress={() => {
                    analytics.capture('paywall_dismissed');
                    onDismiss();
                  }}
                  style={{
                    width: CLOSE_SIZE,
                    height: CLOSE_SIZE,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="close" size={26} color={colors.text.primary} />
                </Pressable>
              )}
            </View>

            {/* Headline & Subhead */}
            <View style={{ alignItems: 'center', gap: 6, marginVertical: spacing.xs }}>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: fonts.sansBold,
                  fontSize: 27,
                  lineHeight: 33,
                  color: colors.text.primary,
                  textAlign: 'center',
                  maxWidth: 320,
                }}
              >
                {t.headline}
              </Text>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  lineHeight: 20,
                  color: colors.text.secondary,
                  textAlign: 'center',
                }}
              >
                {t.subhead}
              </Text>
            </View>

            {/* 3-Step Timeline */}
            <View style={{ marginVertical: spacing.xs }}>
              <TrialTimeline trialDays={heroTrialDays} testID="paywall-timeline" />
            </View>

            {/* Bottom Actions Section: Card + Reassurance + Button + Footer */}
            <View style={{ gap: 14 }}>
              {/* Plan Card Section */}
              <Pressable
                testID={`paywall-plan-${hero.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: true }}
                accessibilityLabel={`${planName(hero)}, ${hero.price}`}
                onPress={() => setSelectedId(hero.id)}
                style={{
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: colors.accent.ember,
                  backgroundColor: colors.surface.card,
                  overflow: 'hidden',
                }}
              >
                {/* Top banner tab: FREE TRIAL */}
                <View
                  style={{
                    backgroundColor: colors.accent.ember,
                    paddingVertical: 9.5,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    style={{
                      fontFamily: fonts.sansBold,
                      fontSize: 13.5,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      color: colors.text.onCta,
                    }}
                  >
                    {t.badge}
                  </Text>
                </View>

                {/* Card body content */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing.lg,
                    paddingVertical: 22,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        backgroundColor: colors.accent.ember,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.text.onCta} />
                    </View>
                    <View style={{ gap: 3 }}>
                      <Text
                        allowFontScaling={false}
                        style={{
                          fontFamily: fonts.sansBold,
                          fontSize: 21,
                          color: colors.text.primary,
                        }}
                      >
                        {t.cardTitle}
                      </Text>
                      {heroWeekly && (
                        <Text
                          allowFontScaling={false}
                          style={{
                            fontFamily: fonts.sans,
                            fontSize: 14,
                            color: colors.text.secondary,
                          }}
                        >
                          {`Only ${heroWeekly} per week`}
                        </Text>
                      )}
                    </View>
                  </View>

                  <Text
                    allowFontScaling={false}
                    style={{
                      fontFamily: fonts.sansBold,
                      fontSize: 19.5,
                      color: colors.text.primary,
                    }}
                  >
                    {`${hero.price}${paywallCopy.plans.perYear}`}
                  </Text>
                </View>
              </Pressable>
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13.5,
                  color: colors.text.secondary,
                  textAlign: 'center',
                  marginBottom: 2,
                }}
              >
                {t.noCommitment}
              </Text>

              <PillButton
                title={t.ctaMain}
                tint="ember"
                loading={busy}
                onPress={start}
                testID="paywall-continue"
              />

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

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: spacing.lg,
                  marginTop: spacing.xs,
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
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
