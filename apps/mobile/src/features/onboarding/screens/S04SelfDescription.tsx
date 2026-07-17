import { harvestPhrases } from '@aura/shared';
import { useState } from 'react';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { ConversationScreen } from '../ConversationScreen';
import { ReflectionBeat } from '../ReflectionBeat';
import { useConversation } from '../useConversation';

/** Dwell after the reflection lands, before advancing — time to read one line. */
const REFLECTION_READ_MS = 1400;

/**
 * S4: her voice, verbatim (product 07). The reflection echoes one of HER
 * phrases back — reciprocity: depth in, magic out. If nothing distinctive can
 * be found, echo nothing specific rather than something wrong (product 10:
 * silence over a wrong guess).
 */
export function S04SelfDescription() {
  const { submit, existingValue } = useConversation('s04-self-description');
  const [text, setText] = useState(typeof existingValue === 'string' ? existingValue : '');
  const [reflection, setReflection] = useState<string | null>(null);

  const name = useOnboardingDraft((s) => s.answers['s03-name']?.value as string | undefined);
  const question = onboardingCopy.s04SelfDescription.question.replace('{name}', name ?? 'then');

  const reflect = () => {
    const phrase = harvestPhrases(text)[0];
    setReflection(phrase ? `“${phrase}.” I like that. Noted.` : 'Noted. Thank you.');
  };

  if (reflection !== null) {
    return (
      <ConversationScreen testID="s04-self-description" question={question} showEditGuard={false}>
        <ReflectionBeat
          line={reflection}
          onDone={() => setTimeout(() => void submit(text.trim()), REFLECTION_READ_MS)}
        />
      </ConversationScreen>
    );
  }

  return (
    <ConversationScreen
      testID="s04-self-description"
      question={question}
      primaryTitle={onboardingCopy.s04SelfDescription.primary}
      onPrimary={reflect}
      primaryDisabled={text.trim() === ''}
      skipTitle={onboardingCopy.s04SelfDescription.skip}
      onSkip={() => void submit(null, true)}
    >
      <Input
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        {...(text.trim() === '' ? { hint: onboardingCopy.s04SelfDescription.emptyNudge } : {})}
      />
    </ConversationScreen>
  );
}
