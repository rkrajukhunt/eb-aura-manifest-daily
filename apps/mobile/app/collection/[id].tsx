import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, Text } from 'react-native';

import { Card, ListRow, RowGroup, Screen, ScreenHeader, SkeletonList } from '@/components';
import { momentsCopy } from '@/copy/moments';
import { toPlayable, useCollectionMoments } from '@/features/moments/useMoments';
import { usePlayerStore } from '@/features/player/playerStore';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

/** Wide enough that a collection sees everything Home's grid counted. */
const COLLECTION_SCAN_LIMIT = 50;

/**
 * `collection/[id]` (06 §1, v4 §home) — a group of moments. Two collections
 * exist in v1: `favorites` (everything she has kept) and `ondemand` (what she
 * asked Manifest for). Rows play on press, exactly as Home's recent rows do.
 */
export default function CollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const scale = clampedFontScale();
  const userId = useAppState((s) => s.userId);
  const open = usePlayerStore((s) => s.open);
  const { data: moments, isLoading } = useCollectionMoments(
    userId ?? undefined,
    COLLECTION_SCAN_LIMIT,
  );

  const ondemand = id === 'ondemand';
  const title = ondemand ? momentsCopy.collections.ondemand : momentsCopy.collections.favorites;
  const items = (moments ?? []).filter((moment) =>
    ondemand ? moment.type === 'ondemand' : moment.favorited_at !== null,
  );

  // The listing rows are slim; the player needs the full moment, so fetch it on
  // press — the same shape Home uses for its recent rows.
  const play = useCallback(
    (momentId: string) => {
      void (async () => {
        const { data } = await supabase
          .from('moments')
          .select('*')
          .eq('id', momentId)
          .maybeSingle();
        if (!data) return;
        open(await toPlayable(data), 'replay');
        router.push('/player');
      })();
    },
    [open, router],
  );

  return (
    <Screen testID="collection">
      <ScrollView
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* A collection's name is DATA, so the header carries no ember mark. */}
        <ScreenHeader title={title} onBack={() => router.back()} emberMark={false} />

        {isLoading ? (
          // Skeleton, not the empty card: while the query is in flight `items`
          // is [] and would otherwise flash "nothing here yet" before her list.
          <SkeletonList rows={5} testID="collection-loading" />
        ) : items.length === 0 ? (
          <Card variant="solid">
            <Text
              testID={`collection-empty-${id}`}
              allowFontScaling={false}
              style={[scaledType('body', scale), { color: colors.text.secondary }]}
            >
              {momentsCopy.states.formingPreview}
            </Text>
          </Card>
        ) : (
          <RowGroup>
            {items.map((moment) => (
              <ListRow
                key={moment.id}
                title={moment.title ?? momentsCopy.home.untitled}
                onPress={() => play(moment.id)}
                testID={`collection-row-${moment.id}`}
              />
            ))}
          </RowGroup>
        )}
      </ScrollView>
    </Screen>
  );
}
