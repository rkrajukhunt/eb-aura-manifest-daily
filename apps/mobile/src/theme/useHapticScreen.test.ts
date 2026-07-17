import { renderHook } from '@testing-library/react-native';

import { useHapticScreen } from './useHapticScreen';

let mockPathname = '/(tabs)/home';
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
}));

const mockBeginHapticScreen = jest.fn();
jest.mock('./haptics', () => ({
  beginHapticScreen: (name: string) => mockBeginHapticScreen(name),
}));

describe('useHapticScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/(tabs)/home';
  });

  it('begins a haptic screen for the current route on mount', async () => {
    await renderHook(() => useHapticScreen());

    expect(mockBeginHapticScreen).toHaveBeenCalledWith('/(tabs)/home');
  });

  it('resets the budget when the route changes', async () => {
    const { rerender } = await renderHook(() => useHapticScreen());
    expect(mockBeginHapticScreen).toHaveBeenLastCalledWith('/(tabs)/home');

    mockPathname = '/(tabs)/gratitude';
    await rerender({});

    expect(mockBeginHapticScreen).toHaveBeenLastCalledWith('/(tabs)/gratitude');
    expect(mockBeginHapticScreen).toHaveBeenCalledTimes(2);
  });

  it('does not re-fire while the route is unchanged', async () => {
    const { rerender } = await renderHook(() => useHapticScreen());
    await rerender({});
    await rerender({});

    expect(mockBeginHapticScreen).toHaveBeenCalledTimes(1);
  });
});
