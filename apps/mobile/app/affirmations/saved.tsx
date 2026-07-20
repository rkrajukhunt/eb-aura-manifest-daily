import { ScrollView, Text } from 'react-native';

import { Card, Screen, SerifDisplay } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { useKeptAffirmations } from '@/features/affirmations/useAffirmations';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * `affirmations/saved` (06 §1) — her kept words in full.
 *
 * The tab shows the collection inline; this is the pushed view for when it
 * outgrows a card list. Empty copy is an invitation, never a scold (product 09).
 */
export default function SavedAffirmationsRoute() {
  const { colors, spacing } = useTheme();
  const userId = useAppState((s) => s.userId);
  const { data: kept } = useKeptAffirmations(userId ?? undefined);

  return (
    <Screen testID="affirmations-saved">
      <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.lg }}>
        <SerifDisplay variant="title">{affirmationsCopy.collectionTitle}</SerifDisplay>

        {(kept ?? []).length === 0 ? (
          <Card variant="solid">
            <Text style={{ color: colors.text.secondary }}>{affirmationsCopy.collectionEmpty}</Text>
          </Card>
        ) : (
          (kept ?? []).map((item) => (
            <Card key={item.id} variant="solid">
              <Text style={{ color: colors.text.primary }}>{item.text}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
