import type { Update } from '@aura/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Card, Label, Screen, TextButton } from '@/components';
import { profileCopy } from '@/copy/profile';
import { profileKeys, useProfile } from '@/hooks/useProfile';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

import { deactivatePerson, fetchPeople, saveFreeTextNote, updateProfileField } from './api';
import { EditFieldSheet } from './EditFieldSheet';

interface EditableField {
  key: 'name' | 'self_description' | 'dream_city' | 'dream_home' | 'note';
  title: string;
  multiline?: boolean;
}

/**
 * Profile — the trust center and memory front door (product 11). Everything
 * here answers one question: "what does Aura think is true about me, and how
 * do I change it?" Edits go through sheets; saves state the memory contract.
 */
export function ProfileTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);

  const { data: profile } = useProfile(userId ?? undefined);
  const { data: people } = useQuery({
    queryKey: ['people', userId],
    queryFn: () => fetchPeople(userId as string),
    enabled: Boolean(userId),
  });

  const [editing, setEditing] = useState<EditableField | null>(null);

  const fieldValue = (key: EditableField['key']): string => {
    if (!profile) return '';
    if (key === 'note') return profile.free_text_note ?? '';
    return (profile[key] as string | null) ?? '';
  };

  const save = async (value: string) => {
    if (!userId || !editing) return;

    if (editing.key === 'note') await saveFreeTextNote(userId, value);
    else await updateProfileField(userId, editing.key as keyof Update<'profiles'>, value);

    await queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
  };

  const removePerson = async (personId: string) => {
    await deactivatePerson(personId);
    await queryClient.invalidateQueries({ queryKey: ['people', userId] });
  };

  const row = (field: EditableField) => (
    <Pressable
      key={field.key}
      accessibilityRole="button"
      accessibilityLabel={field.title}
      onPress={() => setEditing(field)}
      style={{ paddingVertical: spacing.sm }}
    >
      <Label>{field.title}</Label>
      <Text style={[typography.body, { color: colors.text.primary }]}>
        {fieldValue(field.key) || profileCopy.edit.empty}
      </Text>
    </Pressable>
  );

  return (
    <Screen testID="profile-tab">
      <ScrollView contentContainerStyle={{ gap: spacing.xl, paddingVertical: spacing.xl }}>
        <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
          {profileCopy.tagline}
        </Text>

        <Card variant="solid">
          <Label>{profileCopy.sections.basics}</Label>
          {row({ key: 'name', title: profileCopy.fields.name })}
          {row({
            key: 'self_description',
            title: profileCopy.fields.selfDescription,
            multiline: true,
          })}
        </Card>

        <Card variant="solid">
          <Label>{profileCopy.sections.dream}</Label>
          {row({ key: 'dream_city', title: profileCopy.fields.dreamCity })}
          {row({ key: 'dream_home', title: profileCopy.fields.dreamHome })}
        </Card>

        <Card variant="solid">
          <Label>{profileCopy.sections.people}</Label>
          {(people ?? []).length === 0 && (
            <Text style={[typography.body, { color: colors.text.secondary }]}>
              {profileCopy.people.empty}
            </Text>
          )}
          {(people ?? []).map((person) => (
            <View
              key={person.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={[typography.body, { color: colors.text.primary }]}>
                {person.name}
                {person.descriptor ? ` — ${person.descriptor}` : ''}
              </Text>
              <TextButton
                title={profileCopy.people.remove}
                onPress={() => void removePerson(person.id)}
              />
            </View>
          ))}
        </Card>

        <Card variant="solid">
          <Label>{profileCopy.sections.note}</Label>
          {row({ key: 'note', title: profileCopy.fields.note, multiline: true })}
        </Card>

        <View style={{ gap: spacing.sm }}>
          <TextButton
            title={profileCopy.links.whatAuraKnows}
            onPress={() => router.push('/profile/what-aura-knows' as never)}
          />
          <TextButton
            title={profileCopy.links.neverInclude}
            onPress={() => router.push('/profile/never-include' as never)}
          />
        </View>
      </ScrollView>

      <EditFieldSheet
        open={editing !== null}
        title={editing?.title ?? ''}
        initialValue={editing ? fieldValue(editing.key) : ''}
        multiline={editing?.multiline ?? false}
        onSave={(value) => void save(value)}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}
