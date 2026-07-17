import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import { EASE, useMotion, type MotionSettings } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

/** Product 13 §catalog: "Gratitude dot fill — 200ms ease. Quiet completion; no fireworks." */
const DOT_FILL_MS = 200;

export interface WeekDotsProps {
  /** One entry per weekday. */
  filled: boolean[];
  size?: number;
}

function Dot({ filled, size, motion }: { filled: boolean; size: number; motion: MotionSettings }) {
  const { colors } = useTheme();
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    const target = filled ? 1 : 0;
    // Under Reduce Motion the fill simply appears.
    fill.value = motion.reduceMotion
      ? target
      : withTiming(target, { duration: Math.round(DOT_FILL_MS * motion.scale), easing: EASE });
  }, [filled, fill, motion]);

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surface.border,
      }}
    >
      <Animated.View
        style={[
          { flex: 1, borderRadius: size / 2, backgroundColor: colors.accent.sage },
          fillStyle,
        ]}
      />
    </View>
  );
}

/**
 * Gratitude week dots (product 09 §9.4): filled or not-yet, nothing else.
 * There is deliberately NO missed/broken-streak styling — product 16 is
 * shame-free by design, so a skipped day is simply a dot that hasn't filled,
 * never a mark against her.
 */
export function WeekDots({ filled, size }: WeekDotsProps) {
  const { spacing } = useTheme();
  const motion = useMotion();
  const dotSize = size ?? spacing.md;
  const count = filled.filter(Boolean).length;

  return (
    <View
      accessible
      accessibilityLabel={`${count} of ${filled.length} days this week`}
      style={{ flexDirection: 'row', gap: spacing.sm }}
    >
      {filled.map((isFilled, index) => (
        <Dot key={index} filled={isFilled} size={dotSize} motion={motion} />
      ))}
    </View>
  );
}
