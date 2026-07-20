import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { EASE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /**
   * Gentle inline copy under the field. This is the ONLY feedback channel by
   * design: product 12 bans harsh validation reds — "never harsh validation
   * reds; gentle inline copy instead" — so there is no error colour prop at
   * all. Guidance arrives in the companion's voice, not as an alarm.
   */
  hint?: string;
  multiline?: boolean;
  autoFocus?: boolean;
  /**
   * Passed through for the few fields where the OS keyboard genuinely differs —
   * an email field with a QWERTY keyboard and autocapitalisation is a small
   * cruelty. Kept to these two rather than spreading all of TextInput's props,
   * so the component stays a design-system piece rather than a thin wrapper.
   */
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  testID?: string;
}

/**
 * Text input (product 12 §inputs): borderless on the card surface, large 17pt
 * text, soft lavender focus glow. The glow is an overlay so focus never shifts
 * layout — the field breathes awake rather than snapping a border on.
 */
export function Input({
  value,
  onChangeText,
  placeholder,
  hint,
  multiline = false,
  autoFocus = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  testID,
}: InputProps) {
  const { colors, durations, radii, spacing, typography } = useTheme();
  const motion = useMotion();
  const glow = useSharedValue(0);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const animateGlow = (focused: boolean) => {
    const target = focused ? 1 : 0;
    // Same 150ms tempo as the chip acknowledgment — one response language
    // app-wide. Under Reduce Motion the glow simply appears.
    glow.value = motion.reduceMotion
      ? target
      : withTiming(target, {
          duration: Math.round(durations.chipSelect * motion.scale),
          easing: EASE,
        });
  };

  return (
    <View>
      <View>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          autoFocus={autoFocus}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => animateGlow(true)}
          onBlur={() => animateGlow(false)}
          placeholderTextColor={colors.text.secondary}
          {...(placeholder !== undefined && { placeholder })}
          style={[
            typography.body,
            {
              backgroundColor: colors.surface.card,
              borderRadius: radii.chip,
              padding: spacing.md,
              color: colors.text.primary,
            },
            multiline && { textAlignVertical: 'top' },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radii.chip,
              borderWidth: 1,
              borderColor: colors.accent.lavender,
              shadowColor: colors.accent.lavender,
              shadowOpacity: 0.35,
              shadowRadius: spacing.sm,
              shadowOffset: { width: 0, height: 0 },
            },
            glowStyle,
          ]}
        />
      </View>
      {hint !== undefined && (
        <Text
          style={[typography.bodySmall, { color: colors.text.secondary, marginTop: spacing.xs }]}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
