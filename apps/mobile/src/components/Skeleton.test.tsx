import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Skeleton } from './Skeleton';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// The component hides itself from accessibility, so queries must opt in to
// hidden elements to reach it at all — which is itself the behaviour under test.
const hidden = { includeHiddenElements: true } as const;

describe('Skeleton', () => {
  it('renders', async () => {
    await render(<Skeleton testID="skeleton" />, { wrapper });

    expect(screen.getByTestId('skeleton', hidden)).toBeTruthy();
  });

  it('is hidden from assistive tech — a shimmer carries no information', async () => {
    await render(<Skeleton testID="skeleton" />, { wrapper });

    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(screen.getByTestId('skeleton', hidden).props.accessibilityElementsHidden).toBe(true);
  });
});
