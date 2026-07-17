import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { EmptyState } from './EmptyState';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('EmptyState', () => {
  it('renders the in-voice sentence', async () => {
    await render(<EmptyState message="Hearts live here. Your first Letter already does." />, {
      wrapper,
    });

    expect(screen.getByText('Hearts live here. Your first Letter already does.')).toBeTruthy();
  });

  it('renders the action when both title and handler are given', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        message="Your first line starts the record."
        actionTitle="Write one"
        onAction={onAction}
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByText('Write one'));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders no action without a handler — a dead button is worse than none', async () => {
    await render(
      <EmptyState message="Your first line starts the record." actionTitle="Write one" />,
      { wrapper },
    );

    expect(screen.queryByText('Write one')).toBeNull();
  });
});
