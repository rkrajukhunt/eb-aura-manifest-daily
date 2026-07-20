import { useWindowDimensions } from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { FADE_RISE_DISTANCE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations } from '@/theme/tokens';
import { clampedFontScale } from '@/theme/typography';

import type { KaraokeLine } from './karaoke';

/** Previous lines dim to 60% (product 08 §5). */
const DIM_OPACITY = 0.6;

export interface KaraokeLetterProps {
  lines: KaraokeLine[];
  positionMs: SharedValue<number>;
  testID?: string;
}

/**
 * The Letter's text, materializing with the voice (product 08 §5, 10 §5).
 *
 * Every frame of this runs on the UI thread: the line styles and the auto-scroll
 * both read `positionMs` inside worklets, so nothing here crosses to JS while
 * audio is playing. That is what buys the 60fps the wow is graded on (13) — a
 * JS-driven highlight would jank precisely when she is most attentive.
 *
 * There are no controls, by design (product 08 §6). No scrubber, no pause, no
 * close. The screen scrolls itself and she touches nothing.
 */
export function KaraokeLetter({ lines, positionMs, testID }: KaraokeLetterProps) {
  const { spacing } = useTheme();
  const { height } = useWindowDimensions();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // Line y-offsets, filled by onLayout. Shared so the scroll worklet can read
  // them without a JS hop on every position tick.
  const offsets = useSharedValue<number[]>([]);

  useAnimatedReaction(
    () => {
      // Index of the line currently being spoken. Inlined rather than calling
      // the module's binary search: worklets cannot call an imported function
      // unless it is itself a worklet, and duplicating six lines is cheaper than
      // making the pure module worklet-aware for one caller.
      let found = -1;
      for (let i = 0; i < lines.length; i++) {
        if ((lines[i]?.startMs ?? 0) <= positionMs.value) found = i;
        else break;
      }
      return found;
    },
    (index, previous) => {
      if (index < 0 || index === previous) return;
      const y = offsets.value[index];
      if (y === undefined) return;
      // Park the spoken line a little above centre — reading sits naturally
      // high, and it leaves room for what is coming rather than what is gone.
      scrollTo(scrollRef, 0, Math.max(0, y - height * 0.4), true);
    },
    [lines, height],
  );

  return (
    <Animated.ScrollView
      ref={scrollRef}
      testID={testID}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        // Half a screen of padding at both ends so the first line can sit at
        // reading height and the last line can rest there too.
        paddingTop: height * 0.42,
        paddingBottom: height * 0.5,
        paddingHorizontal: spacing.lg,
      }}
    >
      {lines.map((line, index) => (
        <KaraokeLineView
          key={line.index}
          line={line}
          nextStartMs={lines[index + 1]?.startMs ?? null}
          positionMs={positionMs}
          onLayoutY={(y) => {
            const next = [...offsets.value];
            next[index] = y;
            offsets.value = next;
          }}
        />
      ))}
    </Animated.ScrollView>
  );
}

interface KaraokeLineViewProps {
  line: KaraokeLine;
  nextStartMs: number | null;
  positionMs: SharedValue<number>;
  onLayoutY: (y: number) => void;
}

function KaraokeLineView({ line, nextStartMs, positionMs, onLayoutY }: KaraokeLineViewProps) {
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const fadeMs = Math.round(durations.fadeRise * motion.scale);
  const scale = clampedFontScale();

  const style = useAnimatedStyle(() => {
    // Two independent ramps: one brings the line in as its first word is spoken,
    // the other dims it once the NEXT line starts. Composing them means a line
    // never snaps between states — it arrives, holds, and recedes.
    const appear = clamp((positionMs.value - line.startMs) / fadeMs, 0, 1);
    const recede =
      nextStartMs === null ? 0 : clamp((positionMs.value - nextStartMs) / fadeMs, 0, 1);

    return {
      opacity: appear * (1 - recede * (1 - DIM_OPACITY)),
      transform: motion.reduceMotion ? [] : [{ translateY: (1 - appear) * FADE_RISE_DISTANCE }],
    };
  });

  return (
    <Animated.Text
      accessibilityRole="text"
      allowFontScaling={false}
      onLayout={(event) => onLayoutY(event.nativeEvent.layout.y)}
      style={[
        style,
        {
          fontFamily: 'Fraunces_400Regular',
          fontSize: 30 * scale,
          lineHeight: 44 * scale,
          color: colors.text.primary,
          marginBottom: spacing.md,
        },
      ]}
    >
      {line.text}
    </Animated.Text>
  );
}

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** Exported for the renderer's tests — the 60% figure is a product-08 number. */
export const KARAOKE_DIM_OPACITY = DIM_OPACITY;
