import { useState } from 'react';
import { Text, View } from 'react-native';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { useTheme } from '@/theme/ThemeProvider';

import { submitAnswer } from '../commit';
import { ConversationScreen } from '../ConversationScreen';
import { OptionChip } from '../OptionChip';
import { useConversation } from '../useConversation';

/** Past this, it's probably a paste or a joke — nudge toward what friends use. */
const GENTLE_TRIM_LENGTH = 40;

/**
 * Q4 — name and pronoun. Both skippable (design v5): an empty name is
 * recorded as a skip, and the pronoun defaults to they/them downstream —
 * never inferred from the name. The pronoun rides along as its own answer
 * (`q-pronoun`) so it syncs like everything else.
 */
export function S03Name() {
  const { colors, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);
  const { submit, skip, existingValue } = useConversation('s03-name');
  const existingPronoun = useOnboardingDraft((s) => s.answers['q-pronoun']?.value);
  const c = onboardingCopy.s03Name;

  const [name, setName] = useState(typeof existingValue === 'string' ? existingValue : '');
  const [pronoun, setPronoun] = useState<string | null>(
    typeof existingPronoun === 'string' ? existingPronoun : null,
  );

  const tooLong = name.length > GENTLE_TRIM_LENGTH;

  const recordPronoun = async () => {
    if (!userId) return;
    // Fire-and-forget like `submit`: the draft write is synchronous, the sync
    // is drained later if the network drops it.
    void submitAnswer(userId, 'q-pronoun', pronoun, pronoun === null);
  };

  const onContinue = async () => {
    await recordPronoun();
    const trimmed = name.trim();
    if (trimmed === '') await skip();
    else await submit(trimmed);
  };

  const onSkip = async () => {
    await recordPronoun();
    await skip();
  };

  return (
    <ConversationScreen
      testID="s03-name"
      screenId="s03-name"
      question={c.question}
      primaryTitle={c.primary}
      onPrimary={() => void onContinue()}
      primaryDisabled={tooLong}
      onSkip={() => void onSkip()}
    >
      <Input
        value={name}
        onChangeText={setName}
        placeholder={c.placeholder}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={() => {
          if (!tooLong) void onContinue();
        }}
        {...(tooLong ? { hint: c.tooLong } : {})}
      />

      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
          {c.pronounHelper}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 1 }}>
          {c.pronouns.map((option) => (
            <OptionChip
              key={option}
              label={option}
              selected={pronoun === option}
              onPress={() => setPronoun((current) => (current === option ? null : option))}
              testID={`q-pronoun-${option}`}
            />
          ))}
        </View>
      </View>
    </ConversationScreen>
  );
}
