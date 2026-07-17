import { useState } from 'react';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';

import { ConversationScreen } from '../ConversationScreen';
import { useConversation } from '../useConversation';

/** Past this, it's probably a paste or a joke — nudge toward what friends use. */
const GENTLE_TRIM_LENGTH = 40;

/**
 * S3: the key personalization token, used within 10 seconds on S4. The one
 * question that cannot be skipped (product 07) — everything downstream opens
 * with her name.
 */
export function S03Name() {
  const { submit, existingValue } = useConversation('s03-name');
  const [name, setName] = useState(typeof existingValue === 'string' ? existingValue : '');

  const tooLong = name.length > GENTLE_TRIM_LENGTH;

  return (
    <ConversationScreen
      testID="s03-name"
      question={onboardingCopy.s03Name.question}
      primaryTitle={onboardingCopy.s03Name.primary}
      onPrimary={() => void submit(name.trim())}
      // Empty or absurdly long blocks Continue — but the copy stays gentle, and
      // there is no red anywhere (product 12 §inputs).
      primaryDisabled={name.trim() === '' || tooLong}
    >
      <Input
        value={name}
        onChangeText={setName}
        autoFocus
        {...(tooLong ? { hint: onboardingCopy.s03Name.tooLong } : {})}
      />
    </ConversationScreen>
  );
}
