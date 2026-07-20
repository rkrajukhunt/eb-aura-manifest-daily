import type { OnboardingScreenId } from '@aura/shared';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';
import { useOnboardingDraft } from '@/stores/onboardingDraft';
import { haptic } from '@/theme/haptics';

import { completeOnboarding, submitAnswer } from './commit';
import { nextScreen, screenRoute } from './flow';

/**
 * One hook per conversation screen: views, submits, advances, and understands
 * edit mode (product 07). Screens stay declarative; the flow logic lives here
 * exactly once.
 */
export function useConversation(screenId: OnboardingScreenId) {
  const router = useRouter();
  const userId = useAppState((s) => s.userId);
  const isEditing = useOnboardingDraft((s) => s.editReturnScreen !== null);
  const draftAnswer = useOnboardingDraft((s) => s.answers[screenId]);

  useEffect(() => {
    analytics.capture('onboarding_screen_viewed', { screen_id: screenId });
  }, [screenId]);

  /**
   * Submit an answer and move on. In edit mode the flow returns to where the
   * conversation was (revise, never restart); otherwise it advances.
   */
  const submit = async (value: unknown, skipped = false): Promise<void> => {
    void haptic('onboardingContinue');

    if (userId) await submitAnswer(userId, screenId, value, skipped);

    if (isEditing) {
      const returnTo = useOnboardingDraft.getState().endEdit();
      if (returnTo) router.replace(screenRoute(returnTo) as never);
      return;
    }

    const next = nextScreen(screenId);
    if (next) {
      useOnboardingDraft.getState().advanceTo(next);
      router.push(screenRoute(next) as never);
      return;
    }

    // S11: the conversation ends and the ritual begins (product 07 S12). She
    // goes straight into generating — the emotional setup from S10 is the whole
    // reason the Letter lands, so nothing is allowed between them (product 08
    // §1). `replace`, so a back-swipe cannot return her to the conversation.
    if (userId) {
      await completeOnboarding(userId);
      router.replace('/(onboarding)/generating');
    }
  };

  /** Advance without an answer (S1/S2 — no data screens). */
  const advance = (): void => {
    void haptic('onboardingContinue');
    const next = nextScreen(screenId);
    if (!next) return;
    useOnboardingDraft.getState().advanceTo(next);
    router.push(screenRoute(next) as never);
  };

  return {
    submit,
    advance,
    isEditing,
    /** Prefill when she re-enters via the edit-guard. */
    existingValue: draftAnswer?.value,
  };
}
