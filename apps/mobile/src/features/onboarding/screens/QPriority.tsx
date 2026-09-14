import { onboardingCopy } from '@/copy/onboarding';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { ChoiceScreen } from '../ChoiceScreen';
import { submitAnswer } from '../commit';
import { GOAL_ICON_BY_LABEL } from '../optionIcons';

/**
 * Q2 — priority, piped from Q1. Only reached when she picked more than one
 * goal (flow.ts bypasses it otherwise). Her pick is recorded on its own AND
 * moved to the front of the goals list, so `values` carries the primary first
 * without a column of its own.
 */
export function QPriority() {
  const userId = useAppState((s) => s.userId);
  const goals = useOnboardingDraft((s) => s.answers['a04-goals']?.value);
  const picked = Array.isArray(goals) ? (goals as string[]) : [];
  const c = onboardingCopy.qPriority;

  const options = picked.map((label) => ({
    key: label,
    label,
    ...(GOAL_ICON_BY_LABEL[label] ? { icon: GOAL_ICON_BY_LABEL[label] } : {}),
  }));

  const reorderGoals = async (primary: string) => {
    if (!userId || !picked.includes(primary)) return;
    const reordered = [primary, ...picked.filter((g) => g !== primary)];
    void submitAnswer(userId, 'a04-goals', reordered);
  };

  return (
    <ChoiceScreen
      testID="q-priority"
      screenId="q-priority"
      question={c.question}
      helper={c.helper}
      options={options}
      beforeSubmit={reorderGoals}
    />
  );
}
