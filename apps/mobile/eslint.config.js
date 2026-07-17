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
  {
    // jest.mock factories are hoisted above imports, so require() inside them is
    // the supported jest idiom, not a style choice.
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // 05 §4: no raw hex in feature code. A literal colour can't respond to dark
    // mode and quietly forks the brand — everything comes from useTheme().
    // src/theme/ is exempt: it's where the raw values are DEFINED.
    files: ['app/**/*.tsx', 'src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message:
            'Raw hex colour in feature code (05 §4). Use a semantic token from useTheme() — raw values live only in src/theme/palette.ts.',
        },
      ],
    },
  },
];
