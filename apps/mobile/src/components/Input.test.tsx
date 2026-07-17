import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ThemeProvider } from '@/theme/ThemeProvider';

import { Input } from './Input';

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('Input', () => {
  it('renders its value', async () => {
    await render(<Input value="First client signed" onChangeText={jest.fn()} />, { wrapper });

    expect(screen.getByDisplayValue('First client signed')).toBeTruthy();
  });

  it('reports edits through onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(<Input value="" onChangeText={onChangeText} testID="field" />, { wrapper });

    fireEvent.changeText(screen.getByTestId('field'), 'my coffee this morning');

    expect(onChangeText).toHaveBeenCalledWith('my coffee this morning');
  });

  it('shows the gentle hint copy when provided (product 12: no validation reds)', async () => {
    await render(
      <Input value="" onChangeText={jest.fn()} hint="A few more words helps me write for you" />,
      { wrapper },
    );

    expect(screen.getByText('A few more words helps me write for you')).toBeTruthy();
  });

  it('renders no hint copy when none is given', async () => {
    await render(<Input value="" onChangeText={jest.fn()} placeholder="One line" />, { wrapper });

    expect(screen.queryByText(/./)).toBeNull();
  });
});
