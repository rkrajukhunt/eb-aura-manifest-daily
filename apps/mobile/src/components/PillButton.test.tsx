import { render, screen, fireEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { haptic } from '@/theme/haptics';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { PillButton } from './PillButton';

// The real module talks to expo-haptics, which has no JS implementation under
// jest. Mocking it keeps the product rule ("primary press = light impact")
// assertable; the guards themselves are covered by the haptics suite.
jest.mock('@/theme/haptics');

const mockedHaptic = haptic as jest.MockedFunction<typeof haptic>;

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('PillButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders its title', async () => {
    await render(<PillButton title="Continue" onPress={jest.fn()} />, { wrapper });

    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<PillButton title="Continue" onPress={onPress} testID="cta" />, { wrapper });

    fireEvent.press(screen.getByTestId('cta'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('fires the light primary-button haptic on press (product 13)', async () => {
    await render(<PillButton title="Continue" onPress={jest.fn()} testID="cta" />, { wrapper });

    fireEvent.press(screen.getByTestId('cta'));

    expect(mockedHaptic).toHaveBeenCalledWith('primaryButton');
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<PillButton title="Continue" onPress={onPress} disabled testID="cta" />, {
      wrapper,
    });

    fireEvent.press(screen.getByTestId('cta'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire a haptic when disabled', async () => {
    await render(<PillButton title="Continue" onPress={jest.fn()} disabled testID="cta" />, {
      wrapper,
    });

    fireEvent.press(screen.getByTestId('cta'));

    expect(mockedHaptic).not.toHaveBeenCalled();
  });

  it('swaps the label for a spinner while loading', async () => {
    await render(<PillButton title="Continue" onPress={jest.fn()} loading testID="cta" />, {
      wrapper,
    });

    expect(screen.queryByText('Continue')).toBeNull();
  });

  it('does not fire again while loading — one tap, one letter', async () => {
    const onPress = jest.fn();
    await render(<PillButton title="Continue" onPress={onPress} loading testID="cta" />, {
      wrapper,
    });

    fireEvent.press(screen.getByTestId('cta'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('reports busy and disabled to assistive tech while loading', async () => {
    await render(<PillButton title="Continue" onPress={jest.fn()} loading testID="cta" />, {
      wrapper,
    });

    expect(screen.getByTestId('cta').props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
  });
});
