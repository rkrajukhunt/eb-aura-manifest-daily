import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { WeekDots } from './WeekDots';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('WeekDots', () => {
  it('describes progress to assistive tech', async () => {
    await render(<WeekDots filled={[true, true, true, false, false, false, false]} />, {
      wrapper,
    });

    expect(screen.getByLabelText('3 of 7 days this week')).toBeTruthy();
  });

  it('reads an untouched week as zero — not as failure (product 16: shame-free)', async () => {
    await render(<WeekDots filled={[false, false, false, false, false, false, false]} />, {
      wrapper,
    });

    expect(screen.getByLabelText('0 of 7 days this week')).toBeTruthy();
  });

  it('reads a complete week', async () => {
    await render(<WeekDots filled={[true, true, true, true, true, true, true]} />, { wrapper });

    expect(screen.getByLabelText('7 of 7 days this week')).toBeTruthy();
  });
});
