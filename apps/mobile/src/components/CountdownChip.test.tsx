import { render, screen, act } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { CountdownChip } from './CountdownChip';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const MINUTE = 60_000;

describe('CountdownChip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-17T09:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the remaining time in hours and minutes — never seconds', async () => {
    const target = new Date(Date.now() + (2 * 60 + 14) * MINUTE);
    await render(<CountdownChip targetTime={target} prefix="Arrives in" />, { wrapper });

    expect(screen.getByText('Arrives in 2h 14m')).toBeTruthy();
  });

  it('ticks down once per minute', async () => {
    const target = new Date(Date.now() + (2 * 60 + 14) * MINUTE);
    await render(<CountdownChip targetTime={target} prefix="Arrives in" />, { wrapper });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(MINUTE);
    });

    expect(screen.getByText('Arrives in 2h 13m')).toBeTruthy();
  });

  it('drops the hours when less than one remains', async () => {
    const target = new Date(Date.now() + 14 * MINUTE);
    await render(<CountdownChip targetTime={target} />, { wrapper });

    expect(screen.getByText('14m')).toBeTruthy();
  });

  it('renders "now" once the target has passed', async () => {
    const target = new Date(Date.now() - MINUTE);
    await render(<CountdownChip targetTime={target} prefix="Arrives" />, { wrapper });

    expect(screen.getByText('Arrives now')).toBeTruthy();
  });

  it('reaches "now" by ticking across the target', async () => {
    const target = new Date(Date.now() + MINUTE);
    await render(<CountdownChip targetTime={target} prefix="Arrives" />, { wrapper });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2 * MINUTE);
    });

    expect(screen.getByText('Arrives now')).toBeTruthy();
  });

  it('stops ticking after unmount — no state update on a dead component', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const target = new Date(Date.now() + 10 * MINUTE);
    const { unmount } = await render(<CountdownChip targetTime={target} />, { wrapper });

    await unmount();
    await jest.advanceTimersByTimeAsync(5 * MINUTE);

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
