const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

/**
 * Shared flat-config base. Workspaces spread this and add their own environment
 * globals + parserOptions, scoped to `files: ['**\/*.ts']` so the JS block below
 * keeps winning for config files.
 */
module.exports = [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.turbo/**', '.expo/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Tooling config files (eslint.config.js, jest.config.js, .prettierrc.js …).
    // They're CommonJS and deliberately outside the TS program, so type-aware
    // rules can't run on them and require() is the correct idiom.
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
      parserOptions: { project: null, projectService: false },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
