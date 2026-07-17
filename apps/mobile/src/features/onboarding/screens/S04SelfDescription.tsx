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
  const [reflection, setReflection] = useState<{ line: string; skipped: boolean } | null>(null);

  const name = useOnboardingDraft((s) => s.answers['s03-name']?.value as string | undefined);
  const question = onboardingCopy.s04SelfDescription.question.replace('{name}', name ?? 'then');

  const reflect = () => {
    const phrase = harvestPhrases(text)[0];
    setReflection({
      line: phrase ? `“${phrase}.” I like that. Noted.` : 'Noted. Thank you.',
      skipped: false,
    });
  };

  // A skip still gets a beat — "We'll fill this in together as we go." (product
  // 07 S4 edge). Skipping must never feel like a door closing.
  const skip = () => {
    setReflection({ line: onboardingCopy.s04SelfDescription.skippedReflection, skipped: true });
  };

  if (reflection !== null) {
    return (
      <ConversationScreen testID="s04-self-description" question={question} showEditGuard={false}>
        <ReflectionBeat
          line={reflection.line}
          holdMs={REFLECTION_READ_MS}
          onDone={() => void (reflection.skipped ? submit(null, true) : submit(text.trim()))}
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
      onSkip={skip}
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
