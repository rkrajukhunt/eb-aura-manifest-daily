import { onboardingCopy } from '@/copy/onboarding';

import { ChoiceScreen } from '../ChoiceScreen';
import { LEXICON_ICON } from '../optionIcons';

/** Q7 — belief language, the vocabulary fork. Pre-fills Q8's off-limits words. */
export function QLexicon() {
  const c = onboardingCopy.qLexicon;

  return (
    <ChoiceScreen
      testID="q-lexicon"
      screenId="q-lexicon"
      question={c.question}
      options={c.choices.map((choice) => ({
        ...choice,
        ...(LEXICON_ICON[choice.key] ? { icon: LEXICON_ICON[choice.key] } : {}),
      }))}
    />
  );
}
