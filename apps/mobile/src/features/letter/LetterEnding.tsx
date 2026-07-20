import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { PillButton } from '@/components';
import { letterCopy } from '@/copy/letter';
import { EASE, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';
import { durations } from '@/theme/tokens';
import { clampedFontScale } from '@/theme/typography';

/** The last line hangs alone for two seconds before anything else appears (product 08). */
const HANG_MS = 2_000;

export interface LetterEndingProps {
  onContinue: () => void;
  testID?: string;
}

/**
 * What follows the last word (product 08 §when the audio ends).
 *
 * The two-second hang is the whole design. The letter has just finished saying
 * something intimate; putting a button under it immediately would turn a moment
 * into a funnel step. So the screen holds its silence first, and only then does
 * the next thing arrive — quietly, one line and one button.
 */
export function LetterEnding({ onContinue, testID }: LetterEndingProps) {
  const { colors, spacing } = useTheme();
  const motion = useMotion();
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withDelay(
      HANG_MS,
      withTiming(1, { duration: Math.round(durations.crossfade * motion.scale), easing: EASE }),
    );
  }, [appear, motion.scale]);

  const style = useAnimatedStyle(() => ({ opacity: appear.value }));
  const scale = clampedFontScale();

  return (
    <Animated.View
      testID={testID}
      style={[style, { alignItems: 'center', paddingHorizontal: spacing.lg }]}
    >
      <Animated.Text
        allowFontScaling={false}
        style={{
          fontFamily: 'Fraunces_400Regular',
          fontSize: 20 * scale,
          lineHeight: 30 * scale,
          textAlign: 'center',
          color: colors.text.secondary,
        }}
      >
        {letterCopy.ending.more}
      </Animated.Text>

      <View style={{ marginTop: spacing.lg }}>
        <PillButton
          title={letterCopy.ending.primary}
          onPress={onContinue}
          testID="letter-continue"
        />
      </View>
    </Animated.View>
  );
}
