import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { completeOnboarding } from './commit';
import { onboardingCopy } from '@/copy/onboarding';

import { S11ArrivalTime } from './screens/S11ArrivalTime';

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));
jest.mock('./commit', () => ({
  submitAnswer: jest.fn(async () => undefined),
  completeOnboarding: jest.fn(async () => undefined),
  flushPending: jest.fn(async () => true),
}));
jest.mock('@/stores/appState', () => ({
  useAppState: (selector: (s: { status: string; userId: string }) => unknown) =>
    selector({ status: 'ready', userId: 'user-1' }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider forceScheme="light">
      <MotionProvider>{children}</MotionProvider>
    </ThemeProvider>
  );
}

/**
 * The seam between the conversation and the wow (product 07 S12, 08 §1).
 *
 * The emotional setup from S10 is the reason the Letter lands, so nothing is
 * allowed to sit between the last answer and the ritual — no Home, no interstitial,
 * no permission prompt. This is the single most important transition in the funnel,
 * and before Phase 6 it went to Home; the test exists so it cannot drift back.
 */
describe('finishing the conversation', () => {
  beforeEach(() => {
    useOnboardingDraft.getState().reset();
    jest.clearAllMocks();
  });

  const finish = async () => {
    const view = await render(<S11ArrivalTime />, { wrapper });
    // Continue is disabled until she picks an arrival time.
    await fireEvent.press(view.getByText(onboardingCopy.s11ArrivalTime.morning));
    await fireEvent.press(view.getByText(onboardingCopy.s11ArrivalTime.primary));
    return view;
  };

  it('stamps the profile as completed', async () => {
    await finish();

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith('user-1'));
  });

  it('goes straight into the generation ritual', async () => {
    await finish();

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/generating'));
  });

  it('never routes to Home first — that would spend the setup S10 just built', async () => {
    await finish();

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalledWith('/(tabs)/home');
  });

  it('replaces rather than pushes, so a back-swipe cannot reopen the conversation', async () => {
    await finish();

    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
