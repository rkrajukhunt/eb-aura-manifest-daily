import { useState } from 'react';

import { Input } from '@/components';
import { onboardingCopy } from '@/copy/onboarding';

import { ConversationScreen } from '../ConversationScreen';
import { ReflectionBeat } from '../ReflectionBeat';
import { useConversation } from '../useConversation';

const REFLECTION_READ_MS = 1400;

/**
 * S8: the Letter opens in this city (product 08). "Not sure" is a real answer —
 * stored as the feeling-word she typed; the Letter says "the place you're still
 * choosing" (product 07 S8 edge).
 */
export function S08DreamCity() {
  const { submit, existingValue } = useConversation('s08-dream-city');
  const [city, setCity] = useState(typeof existingValue === 'string' ? existingValue : '');
  const [reflecting, setReflecting] = useState(false);

  if (reflecting) {
    return (
      <ConversationScreen
        testID="s08-dream-city"
        question={onboardingCopy.s08DreamCity.question}
        showEditGuard={false}
      >
        <ReflectionBeat
          line={onboardingCopy.s08DreamCity.reflection.replace('{city}', city.trim())}
          holdMs={REFLECTION_READ_MS}
          onDone={() => void submit(city.trim())}
        />
      </ConversationScreen>
    );
  }

  return (
    <ConversationScreen
      testID="s08-dream-city"
      question={onboardingCopy.s08DreamCity.question}
      primaryTitle={onboardingCopy.s08DreamCity.primary}
      onPrimary={() => setReflecting(true)}
      primaryDisabled={city.trim() === ''}
      skipTitle={onboardingCopy.s08DreamCity.skip}
      onSkip={() => void submit(null, true)}
    >
      <Input value={city} onChangeText={setCity} autoFocus />
    </ConversationScreen>
  );
}
