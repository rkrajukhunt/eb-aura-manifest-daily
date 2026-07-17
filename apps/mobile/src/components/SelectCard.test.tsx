import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { SelectCard } from './SelectCard';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('SelectCard', () => {
  it('renders title and subtitle', async () => {
    await render(
      <SelectCard
        title="A calmer morning"
        subtitle="Ease into the day"
        selected={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText('A calmer morning')).toBeTruthy();
    expect(screen.getByText('Ease into the day')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<SelectCard title="A calmer morning" selected={false} onPress={onPress} />, {
      wrapper,
    });

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports its selection to assistive tech', async () => {
    await render(<SelectCard title="A calmer morning" selected onPress={jest.fn()} />, {
      wrapper,
    });

    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('renders the illustration slot', async () => {
    await render(
      <SelectCard title="A calmer morning" selected={false} onPress={jest.fn()}>
        <Text>illustration</Text>
      </SelectCard>,
      { wrapper },
    );

    expect(screen.getByText('illustration')).toBeTruthy();
  });
});
