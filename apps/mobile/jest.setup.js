// Tells React this is a test environment so state updates are wrapped in act().
// Without it React warns on every render and async updates can escape assertions.
global.IS_REACT_ACT_ENVIRONMENT = true;

// Native modules have no JS implementation under jest — stub the ones the
// skeleton touches. Real behaviour is covered by Maestro flows on device (15).

// Reanimated's official jest mock: animations resolve instantly, worklets run
// on the JS thread. Without it, importing the library throws in a test env.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Its native view manager doesn't exist under jest; a plain View preserves
// children and layout, which is all the tests reason about.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Soft: 'soft', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// MMKV v4 is a Nitro module with no JS fallback; `createMMKV` is the factory.
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: jest.fn(() => ({
      getString: (k) => store.get(k),
      set: (k, v) => store.set(k, String(v)),
      remove: (k) => store.delete(k),
      clearAll: () => store.clear(),
    })),
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
  wrap: (c) => c,
}));

// Metro inlines these at build time; jest needs them set explicitly.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_API_URL = 'http://127.0.0.1:3000';
