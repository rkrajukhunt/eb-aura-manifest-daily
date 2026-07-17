import { ActivityIndicator, Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { haptic } from '@/theme/haptics';
import { chipSelectScale, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface PillButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

/**
 * The primary CTA (product 12 §buttons): filled periwinkle pill, 52pt, white
 * label. Periwinkle is the app's single high-contrast colour — one primary
 * action per screen, and this is it.
 */
export function PillButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  testID,
}: PillButtonProps) {
  const { colors, layout, radii, spacing, typography } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  // Loading is a form of disabled: a live button under a spinner lets a second
  // tap fire the CTA twice.
  const inert = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPressIn={() => {
        // Same 0.97 / 150ms acknowledgment as chips (product 13 §catalog) —
        // one press language across the app, and it collapses under Reduce Motion.
        scale.value = chipSelectScale(true, motion);
      }}
      onPressOut={() => {
        scale.value = chipSelectScale(false, motion);
      }}
      onPress={() => {
        // Light impact, per the product-13 haptic table. Fired before the
        // handler so the phone answers the finger, not the navigation.
        void haptic('primaryButton');
        onPress();
      }}
    >
      <Animated.View
        style={[
          {
            height: layout.buttonHeight,
            borderRadius: radii.pill,
            paddingHorizontal: spacing.lg,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: inert ? colors.cta.disabled : colors.cta.background,
          },
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.onCta} />
        ) : (
          <Text style={[typography.button, { color: colors.text.onCta }]}>{title}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}
