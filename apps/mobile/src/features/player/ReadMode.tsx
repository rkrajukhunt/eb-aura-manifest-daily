import { ScrollView, Text } from 'react-native';

import type { KaraokeLine } from '@/features/letter/karaoke';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

export interface ReadModeProps {
  lines: KaraokeLine[];
  body: string;
  /** Current playback position, for the synced highlight (product 09 §9.1). */
  positionMs: number;
  testID?: string;
}

/**
 * Read mode (product 09 §9.1, 10 §5).
 *
 * Deliberately NOT the Letter's karaoke renderer. That one materializes 2–6
 * word lines one at a time with everything ahead invisible — right for a
 * performance you are hearing for the first time, wrong for reading, where you
 * want the whole text and your place in it.
 *
 * So this shows the full moment and dims what has not been spoken yet, at
 * SENTENCE granularity (10 §5: "sentence-level highlight for Read mode"). Word
 * highlighting while reading is a metronome, not an aid.
 */
export function ReadMode({ lines, body, positionMs, testID }: ReadModeProps) {
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();

  const sentences = toSentences(lines, body);

  return (
    <ScrollView
      testID={testID}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: 'Fraunces_400Regular',
          fontSize: 20 * scale,
          lineHeight: 32 * scale,
          color: colors.text.primary,
        }}
      >
        {sentences.map((sentence, index) => (
          <Text
            key={`${index}-${sentence.text.slice(0, 12)}`}
            style={{
              // Spoken and current are full strength; what is still ahead is
              // dimmed rather than hidden, so she can read ahead if she wants to.
              opacity: positionMs >= sentence.startMs ? 1 : 0.45,
            }}
          >
            {sentence.text}{' '}
          </Text>
        ))}
      </Text>
    </ScrollView>
  );
}

interface ReadSentence {
  text: string;
  startMs: number;
}

/**
 * Regroups karaoke lines into sentences.
 *
 * Falls back to the raw body when there are no timings — a moment whose audio
 * never synthesized is still perfectly readable, and refusing to show the text
 * because the sync data is missing would be losing the content over a detail.
 */
export function toSentences(lines: KaraokeLine[], body: string): ReadSentence[] {
  if (lines.length === 0) {
    return body.trim() === '' ? [] : [{ text: body.trim(), startMs: 0 }];
  }

  const sentences: ReadSentence[] = [];
  let current: { words: string[]; startMs: number } | null = null;

  for (const line of lines) {
    for (const word of line.words) {
      current ??= { words: [], startMs: word.startMs };
      current.words.push(word.word);

      if (/[.!?]["'”’)\]]?$/.test(word.word)) {
        sentences.push({ text: current.words.join(' '), startMs: current.startMs });
        current = null;
      }
    }
  }

  if (current) sentences.push({ text: current.words.join(' '), startMs: current.startMs });

  return sentences;
}
