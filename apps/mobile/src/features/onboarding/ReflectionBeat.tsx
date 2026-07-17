import { useEffect, useState } from 'react';
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
export function ReflectionBeat({ line, onDone }: { line: string; onDone?: () => void }) {
  const { colors, spacing, typography } = useTheme();
  const { reduceMotion } = useMotion();
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLanded(true);
      // Soft tick as the reflection lands (product 13 haptic table).
      void haptic('reflectionLanded');
      onDone?.();
    }, TYPING_MS);

    return () => clearTimeout(timer);
  }, [onDone]);

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
