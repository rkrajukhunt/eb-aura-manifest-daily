const reactNative = require('@aura/config/eslint/react-native');

module.exports = [
  ...reactNative,
  {
    ignores: ['.expo/**', 'dist/**', 'ios/**', 'android/**', 'expo-env.d.ts'],
  },
  {
    // Type-aware rules only for TS sources — config .js files sit outside the program.
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  },
];
