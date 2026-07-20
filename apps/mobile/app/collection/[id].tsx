import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { Card, Screen, SerifDisplay } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { useRecentMoments } from '@/features/moments/useMoments';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * `collection/[id]` (06 §1) — a group of moments.
 *
 * V1 has exactly one real collection — everything she has kept — because
 * collections as a user-authored concept are gated premium and the grouping
 * rules are not designed yet (product 09 §9.5 covers favourites; the grid is a
 * stub in the Phase 7 plan). This route exists so the deep link and the
 * navigation shape are real rather than dangling.
 */
export default function CollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const userId = useAppState((s) => s.userId);
  const { data: moments } = useRecentMoments(userId ?? undefined, 50);

  const kept = (moments ?? []).filter((moment) => moment.favorited_at !== null);

  return (
    <Screen testID="collection">
      <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.lg }}>
        <SerifDisplay variant="title">{momentsCopy.home.recentLabel}</SerifDisplay>

        {kept.length === 0 ? (
          <Card variant="solid">
            <Text style={{ color: colors.text.secondary }} testID={`collection-empty-${id}`}>
              {momentsCopy.states.formingPreview}
            </Text>
          </Card>
        ) : (
          kept.map((moment) => (
            <Card key={moment.id} variant="solid">
              <Text style={{ color: colors.text.primary }}>{moment.title ?? 'A moment'}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
