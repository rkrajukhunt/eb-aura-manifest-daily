import { onboardingCopy } from '@/copy/onboarding';

import { ChoiceScreen } from '../ChoiceScreen';
import { MOOD_ICON } from '../optionIcons';

/**
 * Q5 — mood, the safety router. The KEY persists to `profiles.feeling`;
 * 'low' and 'struggling' set gentle_mode, which shapes the next beat, hides
 * the bold belief card, and suppresses the exit offer.
 */
export function A05Feeling() {
  const c = onboardingCopy.a05Feeling;

  return (
    <ChoiceScreen
      testID="a05-feeling"
      screenId="a05-feeling"
      question={c.question}
      helper={c.helper}
      options={c.choices.map((choice) => ({
        ...choice,
        ...(MOOD_ICON[choice.key] ? { icon: MOOD_ICON[choice.key] } : {}),
      }))}
    />
  );
}
