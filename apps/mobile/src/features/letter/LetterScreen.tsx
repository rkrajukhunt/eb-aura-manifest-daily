import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { letterCopy } from '@/copy/letter';
import { useTheme } from '@/theme/ThemeProvider';

import { KaraokeLetter } from './KaraokeLetter';
import { LetterEnding } from './LetterEnding';
import type { Letter } from './useLetter';
import { useLetterPlayback } from './useLetterPlayback';

export interface LetterScreenProps {
  letter: Letter;
  onContinue: () => void;
  testID?: string;
}

/**
 * The Letter (product 08 §4–8) — the emotional peak, and the only screen in the
 * app with no controls at all.
 *
 * It is a separate component from the route so it can be rendered in a test with
 * a fixture letter, and so the route keeps owning nothing but navigation.
 *
 * The gradient here is the dusk end of the family the ritual travelled toward,
 * so the Letter opens in the room the ritual darkened — and the paywall that
 * follows inherits the same world, "the next page of the letter, not an
 * interruption" (product 08).
 */
export function LetterScreen({ letter, onContinue, testID }: LetterScreenProps) {
  const { colors } = useTheme();
  const playback = useLetterPlayback(letter.audioSource, letter.lines, letter.durationMs);

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg.base }}>
      <LinearGradient
        colors={[colors.bg.gradientMid, colors.bg.gradientBottom, colors.bg.base]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView
        style={{ flex: 1 }}
        accessibilityLabel={letterCopy.a11yLabel}
        accessible={false}
      >
        <KaraokeLetter
          lines={letter.lines}
          positionMs={playback.positionMs}
          testID="letter-karaoke"
        />

        {playback.ended && (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 48 }}>
            <LetterEnding onContinue={onContinue} testID="letter-ending" />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
