import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { ReactNode } from 'react';

import { chipSelectScale, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

import { Card } from './Card';

export interface SelectCardProps {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** Illustration slot — the soft line art the dream-home cards carry (07 S7). */
  children?: ReactNode;
}

/**
 * Selectable card — the onboarding dream-home vocabulary (product 07 S7).
 * Same solid Card surface everywhere; selection is a periwinkle border, the
 * one high-contrast colour, so "chosen" reads in both schemes.
 */
export function SelectCard({ title, subtitle, selected, onPress, children }: SelectCardProps) {
  const { colors, spacing, typography } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // Scale 0.97 for 150ms is a press ACKNOWLEDGMENT, not a state — see
      // Chip.tsx. The lasting signal of selection is the border below.
      onPressIn={() => {
        scale.value = chipSelectScale(true, motion);
      }}
      onPressOut={() => {
        scale.value = chipSelectScale(false, motion);
      }}
    >
      <Animated.View style={animatedStyle}>
        <Card
          variant="solid"
          style={{
            // The border is always present so selecting never shifts layout.
            borderWidth: 2,
            borderColor: selected ? colors.cta.background : 'transparent',
          }}
        >
          {children}
          <Text style={[typography.body, { color: colors.text.primary }]}>{title}</Text>
          {subtitle !== undefined && (
            <Text
              style={[
                typography.bodySmall,
                { color: colors.text.secondary, marginTop: spacing.xs },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </Card>
      </Animated.View>
    </Pressable>
  );
}
