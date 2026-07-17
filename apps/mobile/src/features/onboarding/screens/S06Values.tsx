import { useState } from 'react';
import { View } from 'react-native';

import { Chip } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { shouldReflowChips } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/** ≤2, and the DB check agrees (02 §1). Naming values is itself affirming (Steele). */
const MAX_VALUES = 2;

export function S06Values() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('s06-values');
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(existingValue) ? (existingValue as string[]) : [],
  );

  const toggle = (value: string) => {
    setSelected((current) => {
      if (current.includes(value)) return current.filter((v) => v !== value);
      // At the cap, a new pick replaces the oldest — friendlier than a dead tap.
      if (current.length >= MAX_VALUES) return [...current.slice(1), value];
      return [...current, value];
    });
  };

  const asList = shouldReflowChips();

  return (
    <ConversationScreen
      testID="s06-values"
      question={onboardingCopy.s06Values.question}
      primaryTitle={onboardingCopy.s06Values.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected.length === 0}
    >
      <View
        style={
          asList ? { gap: spacing.sm } : { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }
        }
      >
        {onboardingCopy.s06Values.choices.map((label) => (
          <Chip
            key={label}
            label={label}
            selected={selected.includes(label)}
            onPress={() => toggle(label)}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
