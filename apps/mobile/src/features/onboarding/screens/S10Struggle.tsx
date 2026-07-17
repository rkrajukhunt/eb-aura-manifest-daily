import { useState } from 'react';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';

import { ConversationScreen } from '../ConversationScreen';
import { ReflectionBeat } from '../ReflectionBeat';
import { useConversation } from '../useConversation';

const REFLECTION_READ_MS = 1800;

/**
 * S10: the emotional core of the Letter (product 07). Three rules converge here:
 *   - Vulnerability is NEVER followed by a sales beat — the next screen is
 *     arrival time, and nothing monetary can be inserted between them.
 *   - "Not today" skips with full dignity; the Letter omits gracefully.
 *   - Her words are stored verbatim, sensitive-tier, and the crisis-language
 *     check runs server-side at generation (Phase 5, per plan §Phase 3) —
 *     until then this screen stores and never interprets.
 */
export function S10Struggle() {
  const { submit, existingValue } = useConversation('s10-struggle');
  const [text, setText] = useState(typeof existingValue === 'string' ? existingValue : '');
  const [reflecting, setReflecting] = useState(false);

  if (reflecting) {
    return (
      <ConversationScreen
        testID="s10-struggle"
        question={onboardingCopy.s10Struggle.question}
        showEditGuard={false}
      >
        <ReflectionBeat
          line={onboardingCopy.s10Struggle.reflection}
          onDone={() => setTimeout(() => void submit(text.trim()), REFLECTION_READ_MS)}
        />
      </ConversationScreen>
    );
  }

  return (
    <ConversationScreen
      testID="s10-struggle"
      question={onboardingCopy.s10Struggle.question}
      primaryTitle={onboardingCopy.s10Struggle.primary}
      onPrimary={() => setReflecting(true)}
      primaryDisabled={text.trim() === ''}
      skipTitle={onboardingCopy.s10Struggle.skip}
      onSkip={() => void submit(null, true)}
    >
      <Input value={text} onChangeText={setText} multiline autoFocus />
    </ConversationScreen>
  );
}
