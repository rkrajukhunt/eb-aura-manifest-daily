// Native modules have no JS implementation under jest — stub the ones the
// skeleton touches. Real behaviour is covered by Maestro flows on device (15).

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
