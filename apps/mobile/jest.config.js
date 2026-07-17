/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4's jest mock pulls react-native-worklets, whose native entry
  // points cannot load under jest; this official resolver redirects them.
  resolver: 'react-native-worklets/jest/resolver.js',
  setupFilesAfterEnv: [
    // Skia's official self-mock — the native canvas cannot exist under jest.
    '@shopify/react-native-skia/jestSetup.js',
    '<rootDir>/jest.setup.js',
  ],
  // jest-expo ships RN source as untranspiled ESM; these must go through babel.
  // Scoped names appear twice under pnpm: `@scope/pkg` in the real tree and
  // `@scope+pkg` inside .pnpm/ — both spellings must be allowed or the .pnpm
  // copy is skipped by the transform and its ESM crashes the suite.
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?[/+].*|@expo-google-fonts[/+].*|react-navigation|@react-navigation[/+].*|@sentry[/+]react-native|native-base|react-native-svg|react-native-mmkv|@shopify[/+]react-native-skia|@gorhom[/+]bottom-sheet))',
  ],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};
