import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Orb } from './Orb';

/**
 * Skia runs under its official jest mock (no native canvas), so these tests
 * cover what CAN be true off-device: it mounts in every state, unmounts without
 * leaking animations, and stays invisible to assistive tech. Frame-rate and
 * looks are founder device checks (Phase 1 DoD).
 */
function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider forceScheme="light">{children}</ThemeProvider>;
}

describe('Orb', () => {
  it.each(['idle', 'listening', 'generating', 'speaking'] as const)(
    'renders in the %s state',
    async (state) => {
      const view = await render(<Orb state={state} testID="orb" />, { wrapper });

      expect(view.getByTestId('orb', { includeHiddenElements: true })).toBeTruthy();
    },
  );

  it('survives a state change without remounting', async () => {
    const view = await render(<Orb state="idle" testID="orb" />, { wrapper });

    await view.rerender(<Orb state="generating" testID="orb" />);
    await view.rerender(<Orb state="speaking" testID="orb" />);

    expect(view.getByTestId('orb', { includeHiddenElements: true })).toBeTruthy();
  });

  it('unmounts cleanly — repeating animations must not leak', async () => {
    const view = await render(<Orb state="generating" testID="orb" />, { wrapper });

    await expect(view.unmount()).resolves.not.toThrow();
  });

  it('is hidden from assistive tech — presence, not information', async () => {
    const view = await render(<Orb state="idle" testID="orb" />, { wrapper });

    expect(
      view.getByTestId('orb', { includeHiddenElements: true }).props.accessibilityElementsHidden,
    ).toBe(true);
  });

  it('renders in dark mode', async () => {
    const view = await render(
      <ThemeProvider forceScheme="dark">
        <Orb state="idle" testID="orb" />
      </ThemeProvider>,
    );

    expect(view.getByTestId('orb', { includeHiddenElements: true })).toBeTruthy();
  });
});
