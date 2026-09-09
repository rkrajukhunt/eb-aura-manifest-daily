import { onboardingCopy } from '@/copy/onboarding';

import { ChoiceScreen } from '../ChoiceScreen';

/** Q7 — belief language, the vocabulary fork. Pre-fills Q8's off-limits words. */
export function QLexicon() {
  const c = onboardingCopy.qLexicon;

  return (
    <ChoiceScreen
      testID="q-lexicon"
      screenId="q-lexicon"
      question={c.question}
      options={c.choices}
    />
  );
}
