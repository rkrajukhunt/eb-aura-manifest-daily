import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { Input, Screen, SerifDisplay, TextButton } from '@/components';
import { memoryCopy } from '@/copy/memory';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

import { useAddNeverInclude, useNeverInclude, useRemoveNeverInclude } from './hooks';

/**
 * Never-Include (product 10 §45: "sacred"). The list of things that would hurt
 * to hear — excluded from prompts AND checked post-generation (09 §6).
 *
 * The term itself never leaves the device as analytics; the event that records
 * an addition is deliberately payload-free (13 §2).
 */
export function NeverIncludeScreen() {
  const { colors, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);

  const { data: terms } = useNeverInclude(userId ?? undefined);
  const add = useAddNeverInclude(userId ?? undefined);
  const remove = useRemoveNeverInclude(userId ?? undefined);

  const [draft, setDraft] = useState('');

  const submit = () => {
    const term = draft.trim();
    if (term === '') return;
    add.mutate(term);
    setDraft('');
  };

  return (
    <Screen testID="never-include">
      <View style={{ flex: 1, gap: spacing.lg, paddingVertical: spacing.xl }}>
        <SerifDisplay variant="title">{memoryCopy.neverInclude.title}</SerifDisplay>
        <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
          {memoryCopy.neverInclude.description}
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder={memoryCopy.neverInclude.addPlaceholder}
          />
          <TextButton title={memoryCopy.neverInclude.addAction} onPress={submit} />
        </View>

        <FlatList
          data={terms ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.text.secondary }]}>
              {memoryCopy.neverInclude.empty}
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={[typography.body, { color: colors.text.primary }]}>{item.term}</Text>
              <TextButton
                title={memoryCopy.neverInclude.removeAction}
                onPress={() => remove.mutate(item.id)}
              />
            </View>
          )}
        />
      </View>
    </Screen>
  );
}
