import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useMotion, EASE, FADE_RISE_DISTANCE } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations } from '@/theme/tokens';
import { clampedFontScale } from '@/theme/typography';

export interface RitualLineProps {
  text: string;
  /** Milliseconds to wait before this line arrives. */
  delayMs: number;
  testID?: string;
}

/**
 * One line of the generation ritual, fading and rising into place (product 13
 * §catalog: fade + 8px rise).
 *
 * Lines never leave once they arrive — they accumulate, so the screen fills
 * with what Aura is saying rather than flashing one message at a time. That
 * accumulation is the anticipation (product 08 §2: the wait IS the ritual).
 *
 * Under Reduce Motion the rise is dropped and only the fade remains: the line
 * still materializes on cue, it just does not travel.
 */
export function RitualLine({ text, delayMs, testID }: RitualLineProps) {
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: Math.round(durations.fadeRise * motion.scale), easing: EASE }),
    );
  }, [delayMs, motion.scale, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: motion.reduceMotion
      ? []
      : [{ translateY: (1 - progress.value) * FADE_RISE_DISTANCE }],
  }));

  const scale = clampedFontScale();

  return (
    <Animated.Text
      testID={testID}
      accessibilityRole="text"
      allowFontScaling={false}
      style={[
        style,
        {
          fontFamily: 'Fraunces_400Regular',
          fontSize: 22 * scale,
          lineHeight: 32 * scale,
          textAlign: 'center',
          color: colors.text.primary,
          marginTop: spacing.md,
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}
