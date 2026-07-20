import { ScrollView, Text } from 'react-native';

import { Card, Screen, SerifDisplay } from '@/components';
import { gratitudeCopy } from '@/copy/gratitude';
import { useGratitude } from '@/features/gratitude/useGratitude';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * `gratitude/history` (06 §1) — the full record, pushed from the tab.
 *
 * The tab shows a recent slice; this is everything. Reads the same local-first
 * store, so it works offline exactly as the tab does (product 09 §9.4).
 */
export default function GratitudeHistoryRoute() {
  const { colors, spacing } = useTheme();
  const userId = useAppState((s) => s.userId);
  const { history } = useGratitude(userId ?? undefined);

  return (
    <Screen testID="gratitude-history">
      <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.lg }}>
        <SerifDisplay variant="title">{gratitudeCopy.historyTitle}</SerifDisplay>

        {history.length === 0 ? (
          <Card variant="solid">
            <Text style={{ color: colors.text.secondary }}>{gratitudeCopy.historyEmpty}</Text>
          </Card>
        ) : (
          history.map((entry) => (
            <Card key={entry.entryDate} variant="solid">
              <Text style={{ color: colors.text.secondary, fontSize: 12 }}>{entry.entryDate}</Text>
              <Text style={{ color: colors.text.primary }}>{entry.entry}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
