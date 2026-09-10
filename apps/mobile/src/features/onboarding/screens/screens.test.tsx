import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { onboardingCopy } from '@/copy/onboarding';
import { MotionProvider } from '@/theme/motion';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useOnboardingDraft } from '@/stores/onboardingDraft';

import { submitAnswer } from '../commit';

import { A04Goals } from './A04Goals';
import { A05Feeling } from './A05Feeling';
import { QBelief } from './QBelief';
import { QOffLimits } from './QOffLimits';
import { QPriority } from './QPriority';
import { S03Name } from './S03Name';
import { VInsight } from './VInsight';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock('@/lib/analytics', () => ({
  analytics: { capture: jest.fn() },
  initAnalytics: jest.fn(),
  getFeatureFlag: () => undefined,
  onFeatureFlags: () => () => {},
}));
jest.mock('../commit', () => ({
  submitAnswer: jest.fn(async (_u: string, screen: string, value: unknown, skipped = false) => {
    // Mirror the real commit path's first step so the flow can read the draft.
    const { useOnboardingDraft: draft } = jest.requireActual('@/stores/onboardingDraft');
    draft.getState().setAnswer(screen, value, skipped);
  }),
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

const isSelected = (view: Awaited<ReturnType<typeof render>>, label: string) => {
  let node = view.getByText(label).parent;
  while (node && node.props.accessibilityState === undefined) node = node.parent;
  return node?.props.accessibilityState?.selected === true;
};

describe('onboarding v5 screens', () => {
  beforeEach(() => {
    useOnboardingDraft.getState().reset();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('Q1 goals — up to three, a fourth tap is ignored', () => {
    it('caps at three and records the labels', async () => {
      const view = await render(<A04Goals />, { wrapper });
      const [a, b, c, d] = onboardingCopy.a04Goals.choices;

      await fireEvent.press(view.getByText(a!.label));
      await fireEvent.press(view.getByText(b!.label));
      await fireEvent.press(view.getByText(c!.label));
      await fireEvent.press(view.getByText(d!.label));

      expect(isSelected(view, d!.label)).toBe(false);
      await fireEvent.press(view.getByText(onboardingCopy.a04Goals.primary));
      expect(submitAnswer).toHaveBeenCalledWith(
        'user-1',
        'a04-goals',
        [a!.label, b!.label, c!.label],
        false,
      );
    });

    it('gates Continue until one goal is picked', async () => {
      const view = await render(<A04Goals />, { wrapper });
      expect(
        view.getByLabelText(onboardingCopy.a04Goals.primary).props.accessibilityState.disabled,
      ).toBe(true);
    });
  });

  describe('Q2 priority — piped from Q1, moves her pick to the front', () => {
    it('re-records the goals with the priority first', async () => {
      useOnboardingDraft
        .getState()
        .setAnswer('a04-goals', ['Career & purpose', 'Calm & less anxiety']);
      const view = await render(<QPriority />, { wrapper });

      await fireEvent.press(view.getByText('Calm & less anxiety'));
      await fireEvent.press(view.getByText('Continue'));

      await waitFor(() =>
        expect(submitAnswer).toHaveBeenCalledWith('user-1', 'a04-goals', [
          'Calm & less anxiety',
          'Career & purpose',
        ]),
      );
      expect(submitAnswer).toHaveBeenCalledWith(
        'user-1',
        'q-priority',
        'Calm & less anxiety',
        false,
      );
    });
  });

  describe('Q4 name and pronoun — both skippable', () => {
    it('removes the pronoun Skip chip and toggles a selected pronoun off', async () => {
      const view = await render(<S03Name />, { wrapper });

      expect(view.queryByTestId('q-pronoun-skip')).toBeNull();
      await fireEvent.press(view.getByText('they/them'));
      expect(view.getByTestId('q-pronoun-they/them').props.accessibilityState.selected).toBe(true);
      await fireEvent.press(view.getByText('they/them'));
      expect(view.getByTestId('q-pronoun-they/them').props.accessibilityState.selected).toBe(false);
    });

    it('records the pronoun beside the name on Continue', async () => {
      const view = await render(<S03Name />, { wrapper });

      await fireEvent.changeText(view.getByDisplayValue(''), 'Dharmik');
      await fireEvent.press(view.getByText('they/them'));
      await fireEvent.press(view.getByText(onboardingCopy.s03Name.primary));

      await waitFor(() =>
        expect(submitAnswer).toHaveBeenCalledWith('user-1', 'q-pronoun', 'they/them', false),
      );
      expect(submitAnswer).toHaveBeenCalledWith('user-1', 's03-name', 'Dharmik', false);
    });

    it('an empty name is a skip, not a wall', async () => {
      const view = await render(<S03Name />, { wrapper });

      await fireEvent.press(view.getByText(onboardingCopy.s03Name.primary));

      await waitFor(() =>
        expect(submitAnswer).toHaveBeenCalledWith('user-1', 's03-name', null, true),
      );
      expect(submitAnswer).toHaveBeenCalledWith('user-1', 'q-pronoun', null, true);
    });

    it('nudges gently on an absurdly long name — no red, no rejection', async () => {
      const view = await render(<S03Name />, { wrapper });

      await fireEvent.changeText(
        view.getByDisplayValue(''),
        'a name far far far longer than anyone is actually called anywhere',
      );

      expect(view.getByText(/what do the people closest to you use/i)).toBeTruthy();
      expect(
        view.getByLabelText(onboardingCopy.s03Name.primary).props.accessibilityState.disabled,
      ).toBe(true);
    });

    it('advances on the keyboard return key once the name is valid', async () => {
      const view = await render(<S03Name />, { wrapper });

      await fireEvent.changeText(view.getByDisplayValue(''), 'Dharmik');
      await fireEvent(view.getByDisplayValue('Dharmik'), 'submitEditing');

      await waitFor(() =>
        expect(submitAnswer).toHaveBeenCalledWith('user-1', 's03-name', 'Dharmik', false),
      );
    });
  });

  describe('Q5 mood — explicit Continue', () => {
    it('records the key only after Continue is pressed', async () => {
      const view = await render(<A05Feeling />, { wrapper });

      expect(view.getByText('Continue')).toBeTruthy();
      await fireEvent.press(view.getByText('Low'));
      expect(submitAnswer).not.toHaveBeenCalled();
      await fireEvent.press(view.getByText('Continue'));

      await waitFor(() =>
        expect(submitAnswer).toHaveBeenCalledWith('user-1', 'a05-feeling', 'low', false),
      );
    });
  });

  describe('the insight beat — support when she is really struggling', () => {
    it('shows the support card when she said she is really struggling', async () => {
      useOnboardingDraft.getState().setAnswer('a05-feeling', 'struggling');
      const view = await render(<VInsight />, { wrapper });

      expect(view.getByText(onboardingCopy.vInsight.support.label)).toBeTruthy();
    });

    it('shows the insight for her mood otherwise', async () => {
      useOnboardingDraft.getState().setAnswer('a05-feeling', 'updown');
      const view = await render(<VInsight />, { wrapper });

      expect(view.getByText(onboardingCopy.vInsight.byMood.updown)).toBeTruthy();
    });
  });

  describe('Q8 off limits — pre-filled from the language answer', () => {
    it('strikes the mystical words through for a practical reader', async () => {
      useOnboardingDraft.getState().setAnswer('q-lexicon', 'practical');
      const view = await render(<QOffLimits />, { wrapper });

      expect(isSelected(view, 'Manifest')).toBe(true);
      expect(isSelected(view, 'God')).toBe(false);
    });

    it('lets her add her own word, already struck through', async () => {
      const view = await render(<QOffLimits />, { wrapper });

      await fireEvent.press(view.getByText(onboardingCopy.qOffLimits.addYourOwn));
      await fireEvent.changeText(view.getByTestId('q-offlimits-add-input'), 'Hustle');
      await fireEvent(view.getByTestId('q-offlimits-add-input'), 'submitEditing');

      expect(isSelected(view, 'Hustle')).toBe(true);
      await fireEvent.press(view.getByText(onboardingCopy.qOffLimits.primary));
      expect(submitAnswer).toHaveBeenCalledWith(
        'user-1',
        'q-offlimits',
        { words: ['Hustle'], topics: [] },
        false,
      );
    });

    it('records the picks as words and topics', async () => {
      useOnboardingDraft.getState().setAnswer('q-lexicon', 'faith');
      const view = await render(<QOffLimits />, { wrapper });

      await fireEvent.press(view.getByText('Family'));
      await fireEvent.press(view.getByText(onboardingCopy.qOffLimits.primary));

      expect(submitAnswer).toHaveBeenCalledWith(
        'user-1',
        'q-offlimits',
        { words: [], topics: ['Family'] },
        false,
      );
    });
  });

  describe('Q9 believability — the bold card is withheld in gentle mode', () => {
    it('hides the identity card when she said it has been low', async () => {
      useOnboardingDraft.getState().setAnswer('a05-feeling', 'low');
      const view = await render(<QBelief />, { wrapper });

      expect(view.queryByText(/magnet for everything/)).toBeNull();
      expect(view.getByText(/learning to trust myself/)).toBeTruthy();
    });

    it('shows the research line after a pick and submits on Continue', async () => {
      const view = await render(<QBelief />, { wrapper });

      await fireEvent.press(view.getByText(/one clear step/));
      expect(view.getByText(/real research/)).toBeTruthy();
      expect(submitAnswer).not.toHaveBeenCalled();

      await fireEvent.press(view.getByText('Continue'));
      await waitFor(() =>
        expect(submitAnswer).toHaveBeenCalledWith('user-1', 'q-belief', 'practical', false),
      );
    });
  });
});
