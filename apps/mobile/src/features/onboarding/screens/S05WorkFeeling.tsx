import { useState } from 'react';
import { View } from 'react-native';

import { Chip } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { shouldReflowChips } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/**
 * S5: a low-effort beat between free-texts (product 07) — it plants the change
 * narrative the Letter contrasts against ("the work you do now").
 */
export function S05WorkFeeling() {
  const { spacing } = useTheme();
  const { submit, existingValue } = useConversation('s05-work-feeling');
  const [selected, setSelected] = useState<string | null>(
    typeof existingValue === 'string' ? existingValue : null,
  );

  // Dynamic Type reflow (05 §4): chips become a list at accessibility sizes.
  const asList = shouldReflowChips();

  return (
    <ConversationScreen
      testID="s05-work-feeling"
      question={onboardingCopy.s05WorkFeeling.question}
      primaryTitle={onboardingCopy.s05WorkFeeling.primary}
      onPrimary={() => void submit(selected)}
      primaryDisabled={selected === null}
    >
      <View
        style={
          asList ? { gap: spacing.sm } : { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }
        }
      >
        {Object.entries(onboardingCopy.s05WorkFeeling.choices).map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={selected === value}
            onPress={() => setSelected(value)}
          />
        ))}
      </View>
    </ConversationScreen>
  );
}
