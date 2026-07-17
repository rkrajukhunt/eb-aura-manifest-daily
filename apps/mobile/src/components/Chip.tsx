import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { chipSelectScale, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Selectable pill — the onboarding and refine vocabulary (product 12).
 *
 * The tint is periwinkle rather than a soft lavender wash: lavender is identical
 * in both schemes, so a wash would leave near-white text on it in dark mode.
 * "Active = periwinkle" (product 12 §navigation) holds contrast in both worlds.
 */
export function Chip({ label, selected, onPress }: ChipProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      // Scale 0.97 for 150ms is a press ACKNOWLEDGMENT (product 13 §catalog), not
      // a state: tying it to `selected` would leave every chosen chip permanently
      // shrunken. The lasting signal of selection is the fill tint below.
      onPressIn={() => {
        scale.value = chipSelectScale(true, motion);
      }}
      onPressOut={() => {
        scale.value = chipSelectScale(false, motion);
      }}
    >
      <Animated.View
        style={[
          {
            borderRadius: radii.chip,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            borderWidth: 1,
            borderColor: selected ? colors.cta.background : colors.surface.border,
            backgroundColor: selected ? colors.cta.background : colors.surface.card,
          },
          animatedStyle,
        ]}
      >
        <Text
          style={[
            typography.bodySmall,
            { color: selected ? colors.text.onCta : colors.text.primary },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
