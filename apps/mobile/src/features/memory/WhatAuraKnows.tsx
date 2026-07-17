import { useEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { memoryCopy } from '@/copy/memory';
import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';

import type { MemoryItem } from './api';
import { useDeleteMemoryItem, useMemoryItems } from './hooks';

/**
 * "What Aura Knows" (09 §6, product 10 §43) — the transparency screen.
 *
 * Reads `memory_items` directly via RLS; no backend endpoint exists or is needed.
 *
 * TWO RULES THAT LOOK LIKE STYLING BUT ARE PRODUCT REQUIREMENTS:
 *
 * 1. **Every item renders identically.** A sensitive item gets no badge, no lock
 *    icon, no muted styling. Marking her struggle as special on the one screen
 *    she reviews it would stigmatize the thing she was bravest to tell us. The
 *    tier does its work invisibly, in what generation may spend (09 §2).
 * 2. **Plain language only.** The `content` column is already a sentence; this
 *    screen never shows a category, tier, weight or id. If it reads like a
 *    database row, it reads like surveillance.
 *
 * Styling is placeholder — Phase 1 brings the design system (05 §4). The
 * behaviour and the copy are what matter here and are tested.
 */
export function WhatAuraKnows() {
  const userId = useAppState((s) => s.userId);
  const { data: items, isLoading } = useMemoryItems(userId ?? undefined);
  const deleteItem = useDeleteMemoryItem(userId ?? undefined);

  useEffect(() => {
    analytics.capture('what_aura_knows_viewed');
  }, []);

  const confirmDelete = (item: MemoryItem) => {
    Alert.alert(
      memoryCopy.whatAuraKnows.deleteConfirmTitle,
      memoryCopy.whatAuraKnows.deleteConfirmBody,
      [
        { text: memoryCopy.whatAuraKnows.deleteConfirmCancel, style: 'cancel' },
        {
          text: memoryCopy.whatAuraKnows.deleteConfirmAccept,
          style: 'destructive',
          onPress: () => deleteItem.mutate({ id: item.id, category: item.category }),
        },
      ],
    );
  };

  if (isLoading) return <View testID="what-aura-knows-loading" style={styles.container} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{memoryCopy.whatAuraKnows.title}</Text>
      <Text style={styles.contract}>{memoryCopy.whatAuraKnows.contract}</Text>

      <FlatList
        testID="memory-list"
        data={items ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>{memoryCopy.whatAuraKnows.empty}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {/* `content` only — never category, tier or weight. */}
            <Text style={styles.content}>{item.content}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${memoryCopy.whatAuraKnows.deleteAction}: ${item.content}`}
              onPress={() => confirmDelete(item)}
            >
              <Text style={styles.delete}>{memoryCopy.whatAuraKnows.deleteAction}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24 },
  contract: { fontSize: 14, opacity: 0.7 },
  empty: { fontSize: 15, opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  content: { flex: 1, fontSize: 16 },
  delete: { fontSize: 14 },
});
