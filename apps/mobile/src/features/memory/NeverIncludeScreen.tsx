import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { Input, Screen, ScreenHeader, TextButton } from '@/components';
import { memoryCopy } from '@/copy/memory';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

import { NEVER_INCLUDE_MAX_TERM } from './api';
import { useAddNeverInclude, useNeverInclude, useRemoveNeverInclude } from './hooks';

/**
 * Never-Include (product 10 §45: "sacred"). The list of things that would hurt
 * to hear — excluded from prompts AND checked post-generation (09 §6).
 *
 * The term itself never leaves the device as analytics; the event that records
 * an addition is deliberately payload-free (13 §2).
 */
export interface NeverIncludeScreenProps {
  /** Pops back to Profile. v4 gives every pushed screen a chevron. */
  onBack?: () => void;
}

export function NeverIncludeScreen({ onBack }: NeverIncludeScreenProps = {}) {
  const { colors, radii, spacing, typography } = useTheme();
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
      {/*
        Adding a term is the whole point of this screen, so the keyboard is up
        for most of her time on it. Under `edgeToEdgeEnabled=true` Android no
        longer applies the manifest's adjustResize, which put the field and its
        Add action under the keyboard.
      */}
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, gap: spacing.lg, paddingVertical: spacing.xl }}
      >
        <ScreenHeader
          title={memoryCopy.neverInclude.title}
          {...(onBack ? { onBack } : {})}
          testID="never-include-header"
        />
        <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
          {memoryCopy.neverInclude.description}
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder={memoryCopy.neverInclude.addPlaceholder}
            maxLength={NEVER_INCLUDE_MAX_TERM}
            // This screen is a list she adds to repeatedly, so the return key
            // has to add — reaching for "Add" between every term is the whole
            // friction. `submit` already no-ops on an empty draft and clears
            // the field, which is exactly the loop the keyboard wants.
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <TextButton title={memoryCopy.neverInclude.addAction} onPress={submit} />
        </View>

        <FlatList
          data={terms ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm }}
          ListEmptyComponent={
            <Text style={[typography.body, { color: colors.text.secondary }]}>
              {memoryCopy.neverInclude.empty}
            </Text>
          }
          renderItem={({ item }) => (
            // The v4 row language: each term on its own white bordered row.
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: spacing.md,
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radii.field,
                backgroundColor: colors.surface.card,
                borderWidth: 1,
                borderColor: colors.surface.border,
              }}
            >
              <Text style={[typography.body, { flex: 1, color: colors.text.primary }]}>
                {item.term}
              </Text>
              <TextButton
                title={memoryCopy.neverInclude.removeAction}
                onPress={() => remove.mutate(item.id)}
              />
            </View>
          )}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}
