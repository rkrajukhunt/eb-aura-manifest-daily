import { render, screen, fireEvent } from '@testing-library/react-native';

import { letterCopy } from '@/copy/letter';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MotionProvider } from '@/theme/motion';

import { GeneratingRitual } from './GeneratingRitual';

/**
 * Ritual-screen states (Phase 6 test list).
 *
 * The assertions are mostly about what is ABSENT: no spinner, no percentage, no
 * error code. Product 08 §2 is a spec written in negatives — the wait is the
 * ritual — so the tests have to be too, or the screen could regress into a
 * loading screen with nice fonts and still pass.
 */
describe('GeneratingRitual', () => {
  const renderRitual = (props: Partial<React.ComponentProps<typeof GeneratingRitual>> = {}) =>
    render(
      <ThemeProvider>
        <MotionProvider>
          <GeneratingRitual
            name="Maya"
            takingLonger={false}
            failed={false}
            onRetry={jest.fn()}
            {...props}
          />
        </MotionProvider>
      </ThemeProvider>,
    );

  describe('while it is working', () => {
    it('shows the three lines of the ritual, in order', async () => {
      await renderRitual();

      expect(screen.getByTestId('ritual-line-0')).toBeTruthy();
      expect(screen.getByTestId('ritual-line-1')).toBeTruthy();
      expect(screen.getByTestId('ritual-line-2')).toBeTruthy();
    });

    it('greets her by name in the first line', async () => {
      await renderRitual({ name: 'Maya' });

      expect(screen.getByText('Thank you, Maya.')).toBeTruthy();
    });

    it('takes the comma with the slot when there is no name', async () => {
      await renderRitual({ name: null });

      expect(screen.queryByText('Thank you, .')).toBeNull();
      expect(screen.getByText('Thank you.')).toBeTruthy();
    });

    it('breathes the orb rather than showing a spinner (product 08 §2)', async () => {
      await renderRitual();

      // The orb is deliberately hidden from assistive tech (it is presence, not
      // information), so it has to be looked for explicitly.
      expect(screen.getByTestId('ritual-orb', { includeHiddenElements: true })).toBeTruthy();
      expect(screen.queryByTestId('ActivityIndicator')).toBeNull();
    });

    it('shows no percentage or progress anywhere', async () => {
      await renderRitual();

      expect(screen.queryByText(/%/)).toBeNull();
      expect(screen.queryByTestId('ProgressBar')).toBeNull();
    });

    it('withholds the patience line until the wait actually is long', async () => {
      await renderRitual({ takingLonger: false });

      expect(screen.queryByText(letterCopy.ritual.patience)).toBeNull();
    });
  });

  describe('when it is taking longer than expected', () => {
    it('adds the fourth line, honestly (product 08 §2)', async () => {
      await renderRitual({ takingLonger: true });

      expect(screen.getByText(letterCopy.ritual.patience)).toBeTruthy();
    });

    it('keeps the original three lines on screen', async () => {
      await renderRitual({ takingLonger: true });

      expect(screen.getByTestId('ritual-line-0')).toBeTruthy();
      expect(screen.getByTestId('ritual-line-2')).toBeTruthy();
    });
  });

  describe('when generation fails', () => {
    it('speaks in voice rather than reporting a fault', async () => {
      await renderRitual({ failed: true });

      expect(screen.getByText(letterCopy.ritual.retry)).toBeTruthy();
    });

    it('never shows an error code or the word error', async () => {
      await renderRitual({ failed: true });

      expect(screen.queryByText(/error/i)).toBeNull();
      expect(screen.queryByText(/\b[45]\d\d\b/)).toBeNull();
      expect(screen.queryByText(/failed/i)).toBeNull();
    });

    it('offers a way forward', async () => {
      const onRetry = jest.fn();
      await renderRitual({ failed: true, onRetry });

      fireEvent.press(screen.getByTestId('ritual-retry'));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('drops the anticipation lines — they would be a lie now', async () => {
      await renderRitual({ failed: true });

      expect(screen.queryByTestId('ritual-line-0')).toBeNull();
    });
  });
});
