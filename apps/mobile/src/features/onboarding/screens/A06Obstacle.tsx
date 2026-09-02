import type { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { onboardingCopy, type ObstacleKey } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

const OBSTACLE_ICON: Record<ObstacleKey, keyof typeof Ionicons.glyphMap> = {
  forget: 'time-outline',
  motivation: 'leaf-outline',
  selfdoubt: 'help-outline',
  busy: 'timer-outline',
};

/**
 * Q6 — obstacle. Configures mechanics, not content. Multi-select option rows.
 * Stored as the selected labels array: lands in `profiles.struggle`.
 */
export function A06Obstacle() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('a06-obstacle');
  const c = onboardingCopy.a06Obstacle;

  const [selected, setSelected] = useState<string[]>(() => {
    if (Array.isArray(existingValue)) return existingValue as string[];
    if (typeof existingValue === 'string' && existingValue.trim() !== '') {
      return existingValue.split(', ').map((s) => s.trim());
    }
    return [];
  });

  const toggle = (label: string) => {
    setSelected((current) =>
      current.includes(label) ? current.filter((v) => v !== label) : [...current, label],
    );
  };

  return (
    <ConversationScreen
      testID="a06-obstacle"
      screenId="a06-obstacle"
      question={c.question}
      helper={c.helper ?? 'Select all that apply'}
      primaryTitle={c.primary ?? 'Continue'}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected.length === 0}
    >
      <View style={{ gap: spacing.sm + 2 }}>
        {c.choices.map((choice) => (
          <AnswerRow
            key={choice.key}
            label={choice.label}
            icon={OBSTACLE_ICON[choice.key]}
            selected={selected.includes(choice.label)}
            onPress={() => toggle(choice.label)}
            testID={`a06-obstacle-${choice.key}`}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
