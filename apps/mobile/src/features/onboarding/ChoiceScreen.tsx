import type { Ionicons } from '@expo/vector-icons';
import type { OnboardingScreenId } from '@aura/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AnswerRow } from './AnswerRow';
import { ConversationScreen } from './ConversationScreen';
import { useConversation } from './useConversation';

export interface ChoiceOption {
  key: string;
  label: string;
  /** What is recorded. Defaults to the key; the obstacle records its label. */
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface ChoiceScreenProps {
  screenId: OnboardingScreenId;
  question: string;
  helper?: string;
  eyebrow?: string;
  options: readonly ChoiceOption[];
  onSkip?: () => void;
  /** Runs after the pick and before the answer is submitted (priority reorders the goals). */
  beforeSubmit?: (value: string) => Promise<void> | void;
  footnote?: string;
  testID?: string;
}

/**
 * A single-select question: rows plus one explicit Continue action. Used for
 * priority, context, mood, obstacle, language, and calibration — the same
 * screen pattern throughout the flow.
 */
export function ChoiceScreen({
  screenId,
  question,
  helper,
  eyebrow,
  options,
  onSkip,
  beforeSubmit,
  footnote,
  testID,
}: ChoiceScreenProps) {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation(screenId);
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );
  const pick = (option: ChoiceOption) => {
    const value = option.value ?? option.key;
    setSelected(value);
  };

  const continueWithSelection = async () => {
    if (!selected) return;
    await beforeSubmit?.(selected);
    await submit(selected);
  };

  return (
    <ConversationScreen
      {...(testID ? { testID } : {})}
      screenId={screenId}
      question={question}
      {...(helper !== undefined ? { helper } : {})}
      {...(eyebrow !== undefined ? { eyebrow } : {})}
      {...(onSkip ? { onSkip } : {})}
      {...(footnote !== undefined ? { footnote } : {})}
      primaryTitle="Continue"
      onPrimary={() => void continueWithSelection()}
      primaryDisabled={selected === null}
    >
      <View style={{ gap: spacing.sm + 2 }}>
        {options.map((option) => (
          <AnswerRow
            key={option.key}
            label={option.label}
            selected={selected === (option.value ?? option.key)}
            onPress={() => pick(option)}
            {...(option.icon ? { icon: option.icon } : {})}
            testID={`${screenId}-${option.key}`}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
