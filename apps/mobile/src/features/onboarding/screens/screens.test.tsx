import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { S03Name } from './S03Name';
import { S06Values } from './S06Values';
import { S10Struggle } from './S10Struggle';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
}));
jest.mock('../commit', () => ({
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

describe('conversation screens (product 07 rules)', () => {
  beforeEach(() => {
    useOnboardingDraft.getState().reset();
  });

  describe('S3 name — the one unskippable question', () => {
    it('offers no skip control at all', async () => {
      const view = await render(<S03Name />, { wrapper });

      expect(view.queryByText(/skip/i)).toBeNull();
      expect(view.queryByText(/not today/i)).toBeNull();
    });

    it('gates Continue until she types something', async () => {
      const view = await render(<S03Name />, { wrapper });

      const button = view.getByLabelText('Continue');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });

    it('nudges gently on an absurdly long name — no red, no rejection', async () => {
      const view = await render(<S03Name />, { wrapper });

      await fireEvent.changeText(
        view.getByDisplayValue(''),
        'a name far far far longer than anyone is actually called anywhere',
      );

      expect(view.getByText(/what do the people closest to you use/i)).toBeTruthy();
      expect(view.getByLabelText('Continue').props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('S10 struggle — vulnerability with dignity', () => {
    it('offers "Not today" — skippable by design', async () => {
      const view = await render(<S10Struggle />, { wrapper });

      expect(view.getByText('Not today')).toBeTruthy();
    });

    it('shows the holding reflection after Continue, before advancing', async () => {
      const view = await render(<S10Struggle />, { wrapper });

      await fireEvent.changeText(view.getByDisplayValue(''), 'I feel stuck');
      await fireEvent.press(view.getByLabelText('Continue'));

      // The input is gone; the beat is running. Nothing sales-shaped exists here.
      expect(view.queryByDisplayValue('I feel stuck')).toBeNull();
    });
  });

  describe('S6 values — the ≤2 rule in the UI, not just the DB', () => {
    it('replaces the oldest pick rather than dead-tapping at the cap', async () => {
      const view = await render(<S06Values />, { wrapper });

      await fireEvent.press(view.getByText('Feeling truly fulfilled'));
      await fireEvent.press(view.getByText('Financial freedom'));
      await fireEvent.press(view.getByText('Being free'));

      const selected = ['Feeling truly fulfilled', 'Financial freedom', 'Being free'].filter(
        (label) => {
          // Chip renders selected state on the Pressable's accessibilityState.
          const node = view.getByText(label);
          let parent = node.parent;
          while (parent && parent.props.accessibilityState === undefined) parent = parent.parent;
          return parent?.props.accessibilityState?.selected === true;
        },
      );

      expect(selected).toEqual(['Financial freedom', 'Being free']);
    });
  });
});
