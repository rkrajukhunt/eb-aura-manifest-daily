import { Text, View } from 'react-native';

import { PillButton, TextButton } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, fonts, scaledType } from '@/theme/typography';

export interface DiscountOfferScreenProps {
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  /** Date string for renewal disclosure (e.g. "Aug 31, 2027"). Defaults to 1 year from today. */
  renewDate?: string;
  testID?: string;
}

function defaultRenewDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function DiscountOfferScreen({
  busy = false,
  onAccept,
  onDecline,
  renewDate = defaultRenewDate(),
  testID,
}: DiscountOfferScreenProps) {
  const { colors, radii, shadows, spacing } = useTheme();
  const scale = clampedFontScale();
  const c = paywallCopy.v5.discount;

  return (
    <View testID={testID} style={{ flex: 1 }}>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        {/* Header Tag & Title */}
        <View style={{ gap: spacing.xs }}>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 12,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: colors.accent.emberDeep,
              marginBottom: spacing.xs,
            }}
          >
            {c.badge}
          </Text>

          <Text
            allowFontScaling={false}
            style={[scaledType('display', scale), { color: colors.text.primary }]}
          >
            {c.title.slice(0, -1)}
            <Text style={{ color: colors.accent.emberDeep }}>.</Text>
          </Text>
        </View>

        {/* Discount Card */}
        <View
          style={{
            padding: spacing.lg + 4,
            borderRadius: radii.sheet - 2,
            backgroundColor: colors.surface.card,
            borderWidth: 1,
            borderColor: colors.surface.border,
            gap: spacing.md,
            ...shadows.card,
          }}
        >
          {/* Price Row */}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <Text
              allowFontScaling={false}
              style={{
                fontFamily: fonts.serifSemiBold,
                fontSize: 36,
                color: colors.text.primary,
              }}
            >
              {c.discountPrice}
            </Text>

            <Text
              allowFontScaling={false}
              style={{
                fontFamily: fonts.sans,
                fontSize: 16,
                color: colors.text.disabled,
                textDecorationLine: 'line-through',
              }}
            >
              {c.originalPrice}
            </Text>
          </View>

          {/* Offer Details */}
          <Text
            allowFontScaling={false}
            style={[
              scaledType('bodySmall', scale),
              { color: colors.text.secondary, lineHeight: 20 },
            ]}
          >
            {c.subtext.replace('{date}', renewDate)}
          </Text>
        </View>

        {/* Muted note */}
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            color: colors.text.disabled,
          }}
        >
          {c.gentleNote}
        </Text>
      </View>

      {/* Buttons */}
      <View style={{ paddingBottom: spacing.lg, gap: spacing.md }}>
        <PillButton
          title={c.cta}
          loading={busy}
          onPress={onAccept}
          testID="discount-offer-accept"
        />

        <TextButton title={c.decline} onPress={onDecline} testID="discount-offer-decline" />
      </View>
    </View>
  );
}
