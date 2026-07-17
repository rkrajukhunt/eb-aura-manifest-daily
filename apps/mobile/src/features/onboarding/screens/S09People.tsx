import { useState } from 'react';
import { Text, View } from 'react-native';

import { Input, TextButton } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import type { DraftPerson } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { ConversationScreen } from '../ConversationScreen';
import { ReflectionBeat } from '../ReflectionBeat';
import { useConversation } from '../useConversation';

/** 3 at onboarding; more later in Profile (product 07 S9). */
const MAX_PEOPLE = 3;

/**
 * S9: the strongest specificity token — the Letter names her people. "Just me
 * for now" is a fully supported path, not a failure state (the dignity rule):
 * the Letter adapts to self-focus, and nothing here nags about being alone.
 */
export function S09People() {
  const { colors, spacing, typography } = useTheme();
  const { submit, existingValue } = useConversation('s09-people');

  const [people, setPeople] = useState<DraftPerson[]>(
    Array.isArray(existingValue) ? (existingValue as DraftPerson[]) : [],
  );
  const [name, setName] = useState('');
  const [descriptor, setDescriptor] = useState('');
  const [reflectionFor, setReflectionFor] = useState<string | null>(null);

  const add = () => {
    const trimmed = name.trim();
    if (trimmed === '') return;

    setPeople((current) => [...current, { name: trimmed, descriptor: descriptor.trim() }]);
    setName('');
    setDescriptor('');
    // The beat proves listening: "{name}'s in. Your circle is forming."
    setReflectionFor(trimmed);
  };

  const canAddMore = people.length < MAX_PEOPLE;

  return (
    <ConversationScreen
      testID="s09-people"
      question={onboardingCopy.s09People.question}
      primaryTitle={onboardingCopy.s09People.primary}
      onPrimary={() => void submit(people)}
      primaryDisabled={people.length === 0}
      skipTitle={onboardingCopy.s09People.justMe}
      onSkip={() => void submit([], true)}
    >
      {people.map((person) => (
        <Text key={person.name} style={[typography.body, { color: colors.text.primary }]}>
          {person.name}
          {person.descriptor ? ` — ${person.descriptor}` : ''}
        </Text>
      ))}

      {reflectionFor !== null && (
        <ReflectionBeat
          line={onboardingCopy.s09People.reflection.replace('{name}', reflectionFor)}
          holdMs={1200}
          onDone={() => setReflectionFor(null)}
        />
      )}

      {canAddMore && reflectionFor === null && (
        <View style={{ gap: spacing.sm }}>
          <Input
            value={name}
            onChangeText={setName}
            placeholder={onboardingCopy.s09People.namePlaceholder}
          />
          <Input
            value={descriptor}
            onChangeText={setDescriptor}
            placeholder={onboardingCopy.s09People.descriptorPlaceholder}
          />
          <TextButton title={onboardingCopy.s09People.addAnother} onPress={add} />
        </View>
      )}
    </ConversationScreen>
  );
}
