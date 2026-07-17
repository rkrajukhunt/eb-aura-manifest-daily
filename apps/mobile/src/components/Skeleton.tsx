import { useEffect } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { EASE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

// "Soft shimmer on Sand" (product 12 §loading) has no duration token — an
// ambient loop, not a transition, so the 500ms cap doesn't govern it. ~1200ms
// reads as breathing rather than blinking.
const SHIMMER_MS = 1200;
const PULSE_MIN_OPACITY = 0.5;
/** Under Reduce Motion the pulse holds still at its midpoint. */
const STATIC_OPACITY = 0.7;

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * List/library loading placeholder (product 12 §loading): skeletons are ONLY
 * for lists — everywhere else loading is the orb plus one line of in-voice
 * copy, never a bare spinner.
 */
export function Skeleton({ width, height, style, testID }: SkeletonProps) {
  const { colors, radii } = useTheme();
  const motion = useMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (motion.reduceMotion) {
      pulse.value = STATIC_OPACITY;
      return;
    }

    pulse.value = withRepeat(
      withTiming(PULSE_MIN_OPACITY, {
        duration: Math.round(SHIMMER_MS * motion.scale),
        easing: EASE,
      }),
      -1,
      true,
    );

    return () => cancelAnimation(pulse);
  }, [motion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      testID={testID}
      // Placeholders carry no information — assistive tech should wait for the
      // real content rather than read a shimmer.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { backgroundColor: colors.surface.card, borderRadius: radii.chip },
        width !== undefined && { width },
        height !== undefined && { height },
        pulseStyle,
        style,
      ]}
    />
  );
}
