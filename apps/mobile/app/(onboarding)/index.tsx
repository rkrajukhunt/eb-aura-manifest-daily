import { Redirect } from 'expo-router';

import { screenRoute } from '@/features/onboarding/flow';
import { resumeScreen, useOnboardingDraft } from '@/stores/onboardingDraft';

/**
 * Entry to the conversation: fresh drafts land on S1; a killed-mid-flow app
 * resumes at the exact screen she left (product 07 global edges). The draft
 * store is MMKV-persisted, so this works on a cold start.
 */
export default function OnboardingEntry() {
  const state = useOnboardingDraft();

  return <Redirect href={screenRoute(resumeScreen(state)) as never} />;
}
