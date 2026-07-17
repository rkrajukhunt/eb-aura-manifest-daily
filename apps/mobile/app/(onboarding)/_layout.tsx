import { Stack } from 'expo-router';

/**
 * Onboarding stack (06 §1). Phase 3 fills in S1–S11 + generating.tsx.
 *
 * `gestureEnabled: false` at the stack level is deliberate: back means "edit a
 * previous answer" and runs through the edit-guard sheet (product 07), so a raw
 * swipe-back must not bypass it.
 */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />;
}
