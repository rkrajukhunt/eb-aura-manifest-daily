import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, SerifDisplay } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface AffirmationCardProps {
  text: string;
  whyLine?: string | null;
  technique?: keyof typeof affirmationsCopy.techniques | null;
  /** Hidden until she reveals it — the small ceremony product 09 §9.3a asks for. */
  revealed: boolean;
  onReveal?: () => void;
  onTechnique?: () => void;
  testID?: string;
}

/**
 * The affirmation card (product 09 §9.3a).
 *
 * Reveal is a deliberate beat, not a loading state: the card exists, and she
 * chooses when to read it. That tiny act of consent is what separates "here is
 * your content" from "here is something meant for you".
 *
 * `forwardRef` so the share renderer can capture exactly this view (§9.3
 * share-as-image) rather than rebuilding a second, drifting layout.
 */
export const AffirmationCard = forwardRef<View, AffirmationCardProps>(function AffirmationCard(
  { text, whyLine, technique, revealed, onReveal, onTechnique, testID },
  ref,
) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  if (!revealed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={affirmationsCopy.reveal}
        onPress={onReveal}
        testID={testID ? `${testID}-reveal` : 'affirmation-reveal'}
      >
        <Card variant="glassy">
          <Text
            allowFontScaling={false}
            style={{ fontSize: 16 * scale, color: colors.text.secondary, textAlign: 'center' }}
          >
            {affirmationsCopy.reveal}
          </Text>
        </Card>
      </Pressable>
    );
  }

  return (
    <View ref={ref} collapsable={false} testID={testID}>
      <Card variant="glassy">
        <SerifDisplay variant="affirmationHero">{text}</SerifDisplay>

        {whyLine && (
          <Text
            testID="affirmation-why"
            allowFontScaling={false}
            style={{
              marginTop: spacing.md,
              fontSize: 14 * scale,
              lineHeight: 21 * scale,
              color: colors.text.secondary,
            }}
          >
            {whyLine}
          </Text>
        )}

        {technique && (
          // The technique chip is the education wedge (product 09 §9.3c) — it
          // opens an explanation rather than decorating the card.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={affirmationsCopy.techniques[technique].label}
            onPress={onTechnique}
            testID="affirmation-technique"
            style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
          >
            <Text style={{ fontSize: 13 * scale, color: colors.cta.background }}>
              {affirmationsCopy.techniques[technique].label}
            </Text>
          </Pressable>
        )}
      </Card>
    </View>
  );
});
