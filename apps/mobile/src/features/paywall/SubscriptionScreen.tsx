import { ScrollView, Text, View } from 'react-native';

import { PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface SubscriptionScreenProps {
  premium: boolean;
  inTrial: boolean;
  /** Localized expiry/renewal date, already formatted. */
  renewalDate: string | null;
  willRenew: boolean;
  billingIssue?: boolean;
  onManage: () => void;
  onRestore: () => void;
  onSeePlans: () => void;
  testID?: string;
}

/**
 * Settings → Subscription (12 §2, checklist #5).
 *
 * The design rule is subtraction: manage/cancel is ONE tap from here, which is
 * two from Settings, and it opens Apple's own sheet rather than anything of
 * ours. There is deliberately no "are you sure", no "here's what you'll lose",
 * no retention offer — product 15 bans retention mazes, and the cheapest way to
 * guarantee we never build one is to hand the whole flow to the OS.
 *
 * `lapsedKeepsData` is stated right here, where someone considering cancelling
 * will read it: her letter and her memory stay hers (checklist #6). Saying so at
 * the moment of doubt is the difference between a lapse and a betrayal.
 */
export function SubscriptionScreen({
  premium,
  inTrial,
  renewalDate,
  willRenew,
  billingIssue = false,
  onManage,
  onRestore,
  onSeePlans,
  testID,
}: SubscriptionScreenProps) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const status = inTrial
    ? paywallCopy.subscription.trial
    : premium
      ? paywallCopy.subscription.premium
      : paywallCopy.subscription.free;

  const dateLine =
    renewalDate === null
      ? null
      : (willRenew ? paywallCopy.subscription.renewsOn : paywallCopy.subscription.endsOn).replace(
          '{date}',
          renewalDate,
        );

  return (
    <ScrollView testID={testID} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text
          testID="subscription-status"
          allowFontScaling={false}
          style={{
            fontFamily: 'Fraunces_400Regular',
            fontSize: 22 * scale,
            color: colors.text.primary,
          }}
        >
          {status}
        </Text>

        {dateLine && (
          <Text
            allowFontScaling={false}
            style={{ fontSize: 15 * scale, color: colors.text.secondary }}
          >
            {dateLine}
          </Text>
        )}

        {billingIssue && (
          // One quiet badge. Product 12 §3 forbids nagging beyond this.
          <Text
            testID="subscription-billing-issue"
            allowFontScaling={false}
            style={{ fontSize: 15 * scale, color: colors.text.secondary }}
          >
            {paywallCopy.subscription.billingIssue}
          </Text>
        )}
      </View>

      {premium ? (
        <PillButton
          title={paywallCopy.subscription.manage}
          onPress={onManage}
          testID="subscription-manage"
        />
      ) : (
        <PillButton
          title={paywallCopy.locked.cta}
          onPress={onSeePlans}
          testID="subscription-see-plans"
        />
      )}

      <View style={{ alignItems: 'center' }}>
        <TextButton
          title={paywallCopy.subscription.restore}
          onPress={onRestore}
          testID="subscription-restore"
        />
      </View>

      <Text
        allowFontScaling={false}
        style={{ fontSize: 14 * scale, lineHeight: 21 * scale, color: colors.text.secondary }}
      >
        {paywallCopy.subscription.lapsedKeepsData}
      </Text>
    </ScrollView>
  );
}
