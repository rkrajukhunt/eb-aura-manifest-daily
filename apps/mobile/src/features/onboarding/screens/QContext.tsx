import { onboardingCopy } from '@/copy/onboarding';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { ChoiceScreen } from '../ChoiceScreen';
import { primaryGoalOf } from '../flow';
import { CONTEXT_ICON_BY_LABEL } from '../optionIcons';
import { useConversation } from '../useConversation';

/**
 * Q3 — context, branched on the primary goal: five variants, one question
 * each. Habits has none and the flow skips this screen for it. Skippable from
 * the header. The label is what gets recorded.
 */
export function QContext() {
  const answers = useOnboardingDraft((s) => s.answers);
  const { skip } = useConversation('q-context');
  const primary = primaryGoalOf(answers);
  const c = onboardingCopy.qContext;
  const variant = primary === 'habits' ? c.variants.confidence : c.variants[primary];
  const goalLabel =
    onboardingCopy.a04Goals.choices.find((g) => g.key === primary)?.label.toLowerCase() ?? primary;

  return (
    <ChoiceScreen
      testID="q-context"
      screenId="q-context"
      eyebrow={c.eyebrow.replace('{goal}', goalLabel)}
      question={variant.question}
      options={variant.choices.map((label) => ({
        key: label,
        label,
        ...(CONTEXT_ICON_BY_LABEL[label] ? { icon: CONTEXT_ICON_BY_LABEL[label] } : {}),
      }))}
      onSkip={() => void skip()}
    />
  );
}
