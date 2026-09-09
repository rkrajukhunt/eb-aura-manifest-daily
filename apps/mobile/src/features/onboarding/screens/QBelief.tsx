import { useState } from 'react';
import { Text, View } from 'react-native';

import { onboardingCopy, type BeliefKey } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { BeliefCard } from '../BeliefCard';
import { ConversationScreen } from '../ConversationScreen';
import { isGentle } from '../flow';
import { useConversation } from '../useConversation';

/**
 * Q9 — believability. In gentle_mode the bold identity card is not offered at
 * all. After the pick, one line explains why it matters before Continue.
 */
export function QBelief() {
  const { colors, spacing, typography } = useTheme();
  const { submit, existingValue } = useConversation('q-belief');
  const answers = useOnboardingDraft((s) => s.answers);
  const gentle = isGentle(answers);
  const c = onboardingCopy.qBelief;
  const [picked, setPicked] = useState<BeliefKey | null>(
    typeof existingValue === 'string' ? (existingValue as BeliefKey) : null,
  );
  const cards = c.cards.filter((card) => !(gentle && card.key === 'identity'));

  const pick = (key: BeliefKey) => {
    setPicked(key);
  };

  const continueWithSelection = () => {
    if (picked !== null) void submit(picked);
  };

  return (
    <ConversationScreen
      testID="q-belief"
      screenId="q-belief"
      question={c.question}
      primaryTitle="Continue"
      onPrimary={continueWithSelection}
      primaryDisabled={picked === null}
    >
      <View style={{ gap: spacing.md }}>
        {cards.map((card) => (
          <BeliefCard
            key={card.key}
            label={card.label}
            tag={card.tag}
            selected={picked === card.key}
            onPress={() => pick(card.key)}
            testID={`q-belief-${card.key}`}
          />
        ))}
      </View>
      {picked !== null && (
        <Text
          style={[
            typography.bodySmall,
            {
              color: colors.text.secondary,
              borderLeftWidth: 2,
              borderLeftColor: colors.accent.emberDeep,
              paddingLeft: spacing.md + 2,
              marginTop: spacing.sm,
            },
          ]}
        >
          {c.afterPick}
        </Text>
      )}
    </ConversationScreen>
  );
}
