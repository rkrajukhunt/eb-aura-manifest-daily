import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Orb, PillButton } from '@/components';
import { letterCopy } from '@/copy/letter';
import { EASE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

import { RitualLine } from './RitualLine';

/** Gap between the three sequenced lines (product 08 §2). Unhurried, not slow. */
const LINE_INTERVAL_MS = 2_600;
/** How long the gradient takes to travel from light to dusk. */
const DUSK_MS = 12_000;

export interface GeneratingRitualProps {
  /** Her name, for the first line. */
  name: string | null;
  takingLonger: boolean;
  failed: boolean;
  onRetry: () => void;
  testID?: string;
}

/**
 * The generation ritual, S12 (product 08 §2).
 *
 * Everything here is designed around one rule: **the wait IS the ritual**. So
 * there is no spinner, no progress bar, and no percentage — those all say "this
 * is a system doing work", when the thing we want her to feel is "someone is
 * writing to me". The three lines arrive at reading pace, the orb breathes a
 * little faster, and the gradient sinks toward dusk so the Letter opens in a
 * darker room than the one onboarding ended in (product 08 §3).
 *
 * On failure she gets one in-voice line and a way forward — never a code, never
 * a red state. A failure here lands seconds after she told us the hardest thing
 * about her life; it has to read as care.
 */
export function GeneratingRitual({
  name,
  takingLonger,
  failed,
  onRetry,
  testID,
}: GeneratingRitualProps) {
  const { colors, spacing, layout } = useTheme();
  const motion = useMotion();
  const dusk = useSharedValue(0);

  useEffect(() => {
    // Reduce Motion still gets the shift — it is a colour change, not movement —
    // but it arrives as a plain crossfade rather than a long travel.
    dusk.value = withTiming(1, {
      duration: motion.reduceMotion ? 400 : DUSK_MS,
      easing: EASE,
    });
  }, [dusk, motion.reduceMotion]);

  const duskStyle = useAnimatedStyle(() => ({ opacity: dusk.value }));

  const lines = letterCopy.ritual.lines.map((line) => fillName(line, name));

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }}>
      {/* Two stacked gradients rather than an animated colour array: colour
          interpolation on a gradient is a JS-thread cost per frame, while a
          cross-fading opacity runs on the UI thread and holds 60fps. */}
      <LinearGradient
        colors={[colors.bg.gradientTop, colors.bg.gradientMid, colors.bg.gradientBottom]}
        style={{ ...StyleSheetAbsolute }}
      />
      <Animated.View style={[{ ...StyleSheetAbsolute }, duskStyle]}>
        <LinearGradient
          colors={[colors.bg.gradientMid, colors.bg.gradientBottom, colors.bg.base]}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: layout.screenMargin,
        }}
      >
        <Orb state="generating" size={140} testID="ritual-orb" />

        <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
          {failed ? (
            <>
              <RitualLine text={letterCopy.ritual.retry} delayMs={0} testID="ritual-retry-line" />
              <View style={{ marginTop: spacing.xl }}>
                <PillButton
                  title={letterCopy.ending.primary}
                  onPress={onRetry}
                  testID="ritual-retry"
                />
              </View>
            </>
          ) : (
            <>
              {lines.map((line, index) => (
                <RitualLine
                  key={line}
                  text={line}
                  delayMs={index * LINE_INTERVAL_MS}
                  testID={`ritual-line-${index}`}
                />
              ))}

              {takingLonger && (
                <RitualLine
                  text={letterCopy.ritual.patience}
                  delayMs={0}
                  testID="ritual-patience"
                />
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Fills the `{name}` slot, taking the comma with it when there is no name.
 *
 * S3 makes a name near-certain, but "Thank you, ." would be the first thing the
 * Letter ever said to her — so the punctuation goes with the slot rather than
 * being left stranded. She gets "Thank you." instead.
 */
function fillName(line: string, name: string | null): string {
  return name ? line.replace('{name}', name) : line.replace(/,?\s*\{name\}/, '');
}

/** Inlined rather than a StyleSheet so both gradients share one literal. */
const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
