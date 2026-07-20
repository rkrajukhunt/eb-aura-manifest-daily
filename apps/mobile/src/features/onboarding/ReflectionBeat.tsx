import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/theme/haptics';

/** Product 13 §catalog: typing dots 600ms before the reply lands. */
const TYPING_MS = 600;

/**
 * The reflection beat (product 07): after a meaningful answer, Aura visibly
 * "types", then replies with one warm echo. The pause is the point — it proves
 * someone is listening before replying. A reflection that appears instantly
 * reads as a template, which is the one thing it must never read as.
 *
 * Under Reduce Motion the dots are skipped (they are pure motion), but the
 * pause itself is kept: the timing carries the meaning, not the pixels.
 */
export function ReflectionBeat({
  line,
  onDone,
  holdMs = 0,
}: {
  line: string;
  /** Fires after the line has landed AND been held long enough to read. */
  onDone?: () => void;
  /** Dwell after landing. Owned here so the timer dies with the component. */
  holdMs?: number;
}) {
  const { colors, spacing, typography } = useTheme();
  const { reduceMotion } = useMotion();
  const [landed, setLanded] = useState(false);

  // Every caller passes an inline arrow, so `onDone` is a new function on each
  // of the parent's renders. Holding it in a ref keeps it out of the effect's
  // deps: otherwise the effect re-runs on every parent render, restarting the
  // beat — which re-fires the haptic and calls `onDone` again, and since
  // `onDone` navigates, that render-loops the screen (it stuck on S4→S5 with
  // the haptic budget warning climbing forever).
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // The beat is one-shot per mount: type, land, hold, done. `line` and `holdMs`
  // are fixed for a given reflection, so there is nothing here to re-run for.
  useEffect(() => {
    let holdTimer: ReturnType<typeof setTimeout> | undefined;

    const typingTimer = setTimeout(() => {
      setLanded(true);
      // Soft tick as the reflection lands (product 13 haptic table).
      void haptic('reflectionLanded');
      holdTimer = setTimeout(() => onDoneRef.current?.(), holdMs);
    }, TYPING_MS);

    // Both timers die with the component — a screen-level setTimeout would
    // outlive navigation and fire into an unmounted world.
    return () => {
      clearTimeout(typingTimer);
      if (holdTimer) clearTimeout(holdTimer);
    };
  }, [holdMs]);

  if (!landed) {
    return reduceMotion ? (
      <View style={{ minHeight: spacing.xl }} />
    ) : (
      <View
        accessibilityElementsHidden
        style={{ flexDirection: 'row', gap: spacing.xs, minHeight: spacing.xl }}
        testID="typing-dots"
      >
        {[0, 1, 2].map((i) => (
          <Text key={i} style={{ color: colors.text.secondary }}>
            ·
          </Text>
        ))}
      </View>
    );
  }

  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(0) : FadeIn.duration(300)}>
      <Text
        accessibilityLiveRegion="polite"
        style={[typography.body, { color: colors.text.primary }]}
      >
        {line}
      </Text>
    </Animated.View>
  );
}
