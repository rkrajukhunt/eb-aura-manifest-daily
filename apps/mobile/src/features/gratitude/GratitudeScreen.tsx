import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card, Input, PillButton, SerifDisplay, WeekDots } from '@/components';
import { gratitudeCopy } from '@/copy/gratitude';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale } from '@/theme/typography';

/** How long the field may sit empty before Aura offers a starter (product 09 §9.4). */
export const STARTER_DELAY_MS = 5_000;

export interface GratitudeScreenProps {
  prompt: string;
  dots: { date: string; filled: boolean }[];
  history: { entryDate: string; entry: string }[];
  /** Today's line, if she has already written one — this is an edit, not a new entry. */
  todaysEntry: string | null;
  showContract: boolean;
  onSave: (entry: string) => void;
  testID?: string;
}

/**
 * The Gratitude tab (product 09 §9.4).
 *
 * There is no loading state and no error state anywhere in here, deliberately:
 * the write is local and the sync is silent, so the only feedback she ever gets
 * is the dot filling and the word "Kept." An error state would turn a
 * ten-second habit into something that can fail.
 *
 * The dots carry no streak and no break state — they fill, and that is all they
 * can express (see `weekDots`).
 */
export function GratitudeScreen({
  prompt,
  dots,
  history,
  todaysEntry,
  showContract,
  onSave,
  testID,
}: GratitudeScreenProps) {
  const { colors, spacing, layout } = useTheme();
  const scale = clampedFontScale();

  const [entry, setEntry] = useState(todaysEntry ?? '');
  const [showStarter, setShowStarter] = useState(false);

  // The starter is an offer after a pause, not a nag: it appears once, only if
  // the field is still empty, and never re-triggers once she starts typing.
  useEffect(() => {
    if (entry.trim() !== '') return;
    const timer = setTimeout(() => setShowStarter(true), STARTER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [entry]);

  const saved = todaysEntry !== null && entry.trim() === todaysEntry.trim();

  return (
    <ScrollView
      testID={testID}
      contentContainerStyle={{ padding: layout.screenMargin, gap: spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      <SerifDisplay variant="title">{gratitudeCopy.title}</SerifDisplay>

      <View testID="gratitude-dots">
        <WeekDots filled={dots.map((dot) => dot.filled)} />
      </View>

      <Text
        allowFontScaling={false}
        style={{ fontSize: 16 * scale, lineHeight: 24 * scale, color: colors.text.secondary }}
      >
        {prompt}
      </Text>

      <Input
        value={entry}
        onChangeText={setEntry}
        placeholder={gratitudeCopy.placeholder}
        multiline
        testID="gratitude-input"
      />

      {showStarter && entry.trim() === '' && (
        <Text
          testID="gratitude-starter"
          allowFontScaling={false}
          style={{ fontSize: 14 * scale, color: colors.text.secondary }}
        >
          {gratitudeCopy.starter}
        </Text>
      )}

      <PillButton
        title={saved ? gratitudeCopy.saved : gratitudeCopy.save}
        disabled={entry.trim() === '' || saved}
        onPress={() => onSave(entry.trim())}
        testID="gratitude-save"
      />

      {showContract && (
        <Text
          testID="gratitude-contract"
          allowFontScaling={false}
          style={{ fontSize: 14 * scale, lineHeight: 21 * scale, color: colors.text.secondary }}
        >
          {gratitudeCopy.memoryContract}
        </Text>
      )}

      <View style={{ gap: spacing.sm }}>
        <Text
          allowFontScaling={false}
          style={{ fontSize: 12 * scale, letterSpacing: 1, color: colors.text.secondary }}
        >
          {gratitudeCopy.historyTitle.toUpperCase()}
        </Text>

        {history.length === 0 ? (
          <Card variant="solid">
            <Text
              testID="gratitude-history-empty"
              allowFontScaling={false}
              style={{ fontSize: 15 * scale, color: colors.text.secondary }}
            >
              {gratitudeCopy.historyEmpty}
            </Text>
          </Card>
        ) : (
          history.map((item) => (
            <Card key={item.entryDate} variant="solid">
              <Text
                allowFontScaling={false}
                style={{ fontSize: 15 * scale, color: colors.text.primary }}
              >
                {item.entry}
              </Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}
