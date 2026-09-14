import type { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { onboardingCopy, type GoalKey } from '@/copy/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from '../AnswerRow';
import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/** Design Q1: "Pick up to three." A fourth tap is simply ignored. */
const MAX_GOALS = 3;

/** The design's line icons, in the system's icon set. */
const GOAL_ICON: Record<GoalKey, keyof typeof Ionicons.glyphMap> = {
  confidence: 'arrow-up-outline',
  love: 'heart-outline',
  money: 'logo-usd',
  career: 'locate-outline',
  calm: 'water-outline',
  habits: 'checkmark-outline',
};

/**
 * Q1 — goal, the root node. Multi-select up to three on the tile rows; the
 * labels are what gets recorded (they land in `values`, which the Letter
 * reads as prose). Q2 later moves her priority to the front of the list.
 */
export function A04Goals() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('a04-goals');
  const c = onboardingCopy.a04Goals;
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(existingValue) ? (existingValue as string[]) : [],
  );

  const toggle = (label: string) => {
    setSelected((current) => {
      if (current.includes(label)) return current.filter((v) => v !== label);
      if (current.length >= MAX_GOALS) return current;
      return [...current, label];
    });
  };

  return (
    <ConversationScreen
      testID="a04-goals"
      screenId="a04-goals"
      question={c.question}
      helper={c.helper}
      primaryTitle={c.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected.length === 0}
    >
      <View style={{ gap: spacing.sm + 2 }}>
        {c.choices.map((choice) => (
          <AnswerRow
            key={choice.key}
            label={choice.label}
            icon={GOAL_ICON[choice.key]}
            selected={selected.includes(choice.label)}
            onPress={() => toggle(choice.label)}
            multi
            testID={`a04-goals-${choice.key}`}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
