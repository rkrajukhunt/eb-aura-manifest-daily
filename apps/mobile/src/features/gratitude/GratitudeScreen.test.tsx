import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { gratitudeCopy } from '@/copy/gratitude';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MotionProvider } from '@/theme/motion';

import { GratitudeScreen, STARTER_DELAY_MS } from './GratitudeScreen';

/**
 * The Gratitude tab (Phase 8 test list: RTL both tabs).
 *
 * What these mostly assert is ABSENCE again: no loading state, no error state,
 * no streak, no "you missed". Product 09 §9.4 wants a ten-second habit, and
 * every one of those additions would make it something that can fail or scold.
 */
describe('GratitudeScreen', () => {
  const dots = [
    { date: '2026-07-14', filled: true },
    { date: '2026-07-15', filled: false },
    { date: '2026-07-16', filled: true },
    { date: '2026-07-17', filled: false },
    { date: '2026-07-18', filled: false },
    { date: '2026-07-19', filled: true },
    { date: '2026-07-20', filled: false },
  ];

  const renderScreen = (props: Partial<React.ComponentProps<typeof GratitudeScreen>> = {}) =>
    render(
      <ThemeProvider forceScheme="light">
        <MotionProvider>
          <GratitudeScreen
            prompt={gratitudeCopy.prompt}
            dots={dots}
            history={[]}
            todaysEntry={null}
            showContract={false}
            onSave={jest.fn()}
            {...props}
          />
        </MotionProvider>
      </ThemeProvider>,
    );

  describe('the prompt', () => {
    it('shows the default question', async () => {
      await renderScreen();

      expect(screen.getByText(gratitudeCopy.prompt)).toBeTruthy();
    });

    it('shows a personalized one when given', async () => {
      const prompt = gratitudeCopy.personalizedPrompt.replace('{person}', 'Nadia');
      await renderScreen({ prompt });

      expect(screen.getByText(/Nadia/)).toBeTruthy();
    });
  });

  describe('writing', () => {
    it('cannot save an empty line', async () => {
      const onSave = jest.fn();
      await renderScreen({ onSave });

      await fireEvent.press(screen.getByTestId('gratitude-save'));

      expect(onSave).not.toHaveBeenCalled();
    });

    it('saves what she wrote, trimmed', async () => {
      const onSave = jest.fn();
      await renderScreen({ onSave });

      await fireEvent.changeText(screen.getByTestId('gratitude-input'), '  the coffee  ');
      await fireEvent.press(screen.getByTestId('gratitude-save'));

      expect(onSave).toHaveBeenCalledWith('the coffee');
    });

    it('pre-fills today’s line so a second visit is an EDIT, not a blank field', async () => {
      await renderScreen({ todaysEntry: 'the coffee on the balcony' });

      expect(screen.getByDisplayValue('the coffee on the balcony')).toBeTruthy();
    });

    it('reads as kept once today’s line is saved', async () => {
      await renderScreen({ todaysEntry: 'the coffee' });

      expect(screen.getByText(gratitudeCopy.saved)).toBeTruthy();
    });
  });

  describe('the starter suggestion', () => {
    it('stays away at first — it is an offer after a pause, not a nag', async () => {
      jest.useFakeTimers();
      await renderScreen();

      expect(screen.queryByTestId('gratitude-starter')).toBeNull();
      jest.useRealTimers();
    });

    it('appears once the field has sat empty', async () => {
      jest.useFakeTimers();
      await renderScreen();

      await act(async () => {
        jest.advanceTimersByTime(STARTER_DELAY_MS);
      });

      expect(screen.getByTestId('gratitude-starter')).toBeTruthy();
      jest.useRealTimers();
    });

    it('disappears the moment she starts writing', async () => {
      jest.useFakeTimers();
      await renderScreen();
      await act(async () => {
        jest.advanceTimersByTime(STARTER_DELAY_MS);
      });
      jest.useRealTimers();

      await fireEvent.changeText(screen.getByTestId('gratitude-input'), 'the coffee');

      expect(screen.queryByTestId('gratitude-starter')).toBeNull();
    });
  });

  describe('the memory contract', () => {
    it('is stated plainly when it is due', async () => {
      await renderScreen({ showContract: true });

      expect(screen.getByText(gratitudeCopy.memoryContract)).toBeTruthy();
    });

    it('is absent once she has seen it', async () => {
      await renderScreen({ showContract: false });

      expect(screen.queryByTestId('gratitude-contract')).toBeNull();
    });
  });

  describe('history', () => {
    it('invites rather than scolds when empty', async () => {
      await renderScreen({ history: [] });

      expect(screen.getByText(gratitudeCopy.historyEmpty)).toBeTruthy();
    });

    it('lists what she has written', async () => {
      await renderScreen({
        history: [
          { entryDate: '2026-07-19', entry: 'Nadia called' },
          { entryDate: '2026-07-18', entry: 'the river' },
        ],
      });

      expect(screen.getByText('Nadia called')).toBeTruthy();
      expect(screen.getByText('the river')).toBeTruthy();
    });
  });

  describe('shame-free by construction (product 16, 14)', () => {
    it('never mentions a streak, a break, or a missed day', async () => {
      await renderScreen({ dots });

      expect(screen.queryByText(/streak|missed|broke|don’t break|keep it up/i)).toBeNull();
    });

    it('shows no error state, ever — the write is local and cannot fail', async () => {
      await renderScreen();

      expect(screen.queryByText(/error|failed|couldn’t save|try again/i)).toBeNull();
    });

    it('shows no spinner — there is nothing to wait for', async () => {
      await renderScreen();

      expect(screen.queryByTestId('ActivityIndicator')).toBeNull();
    });
  });
});
