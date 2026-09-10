import { useState } from 'react';
import { Text, View } from 'react-native';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useGratitude } from '@/features/gratitude/useGratitude';
import { useAppState } from '@/stores/appState';
import { haptic } from '@/theme/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/typography';

import { ConversationScreen } from '../ConversationScreen';
import { OptionChip } from '../OptionChip';
import { useConversation } from '../useConversation';

/**
 * VALUE — the first gratitude entry. Seeds the journal before the money ask.
 * Renders example option chips below the description box. Selecting an option
 * fills the description box with a complete sentence (replacing any existing text).
 */
export function VGratitude() {
  const { colors, spacing } = useTheme();
  const userId = useAppState((s) => s.userId);
  const { submit, skip, existingValue } = useConversation('v-gratitude');
  const gratitude = useGratitude(userId ?? undefined);
  const c = onboardingCopy.vGratitude;
  const [entry, setEntry] = useState(typeof existingValue === 'string' ? existingValue : '');

  const save = async () => {
    const trimmed = entry.trim();
    if (trimmed === '') return;
    gratitude.save(trimmed, c.question, false);
    await submit(trimmed);
  };

  const handleSelectExample = (example: string) => {
    const sentence = `Today, I’m grateful for ${example.charAt(0).toLowerCase()}${example.slice(1)}.`;
    setEntry(sentence);
    void haptic('onboardingContinue');
  };

  return (
    <ConversationScreen
      testID="v-gratitude"
      screenId="v-gratitude"
      question={c.question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={() => void save()}
      primaryDisabled={entry.trim() === ''}
      secondaryTitle={c.skip}
      onSecondary={() => void skip()}
    >
      <Input
        value={entry}
        onChangeText={setEntry}
        placeholder={c.placeholder}
        multiline
        autoFocus
        testID="v-gratitude-input"
      />

      {/* Example sentences below the description box */}
      <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 11.5,
            letterSpacing: 1.3,
            textTransform: 'uppercase',
            color: colors.text.label,
          }}
        >
          {c.examplesLabel}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {c.examples.map((example) => {
            const isSelected = entry.trim() === example;
            return (
              <OptionChip
                key={example}
                label={example}
                selected={isSelected}
                onPress={() => handleSelectExample(example)}
                testID={`v-gratitude-example-${example}`}
              />
            );
          })}
        </View>
      </View>
    </ConversationScreen>
  );
}
