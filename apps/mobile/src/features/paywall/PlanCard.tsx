import { Pressable, Text, View } from 'react-native';

import { paywallCopy } from '@/copy/paywall';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

import { priceLine } from './pricing';
import type { OfferedPlan } from './purchases';

export interface PlanCardProps {
  plan: OfferedPlan;
  selected: boolean;
  onSelect: () => void;
  testID?: string;
}

/**
 * One plan option (product 15 §spec, checklist #2).
 *
 * The monthly equivalent is PRINTED under the headline price rather than left
 * for her to work out. That is the trust signature of this whole surface: the
 * competitor complaint we are designing against is "$10/week!!! Greedy &
 * misleading" from users who only did the multiplication after being charged.
 * Doing the arithmetic for her costs conversions on the weekly plan and buys
 * the review scores that make the free tier worth running.
 *
 * Trial terms are restated here as well as on Apple's sheet (checklist #3) —
 * "restated at the moment of confirmation" means both places, not either.
 */
export function PlanCard({ plan, selected, onSelect, testID }: PlanCardProps) {
  const { colors, spacing, radii } = useTheme();
  const scale = clampedFontScale();

  const label = priceLine(plan.id, plan.price, plan.monthlyEquivalent);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}${plan.hasTrial ? `. ${paywallCopy.plans.trialNote}` : ''}`}
      onPress={onSelect}
      style={{
        borderRadius: radii.card,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.cta.background : colors.surface.border,
        backgroundColor: colors.surface.card,
        padding: spacing.lg,
        gap: spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: 'Fraunces_600SemiBold',
            fontSize: 18 * scale,
            color: colors.text.primary,
          }}
        >
          {label}
        </Text>

        {plan.id === 'annual' && (
          <Text
            allowFontScaling={false}
            style={{
              fontSize: 12 * scale,
              color: colors.cta.background,
            }}
          >
            {paywallCopy.plans.annualBadge}
          </Text>
        )}
      </View>

      {plan.hasTrial && (
        <Text
          allowFontScaling={false}
          style={{ fontSize: 13 * scale, color: colors.text.secondary }}
        >
          {paywallCopy.plans.trialNote}
        </Text>
      )}

      <Text allowFontScaling={false} style={{ fontSize: 13 * scale, color: colors.text.secondary }}>
        {paywallCopy.plans.renewalNote}
      </Text>
    </Pressable>
  );
}
