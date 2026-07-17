const base = require('@aura/config/eslint/base');
const globals = require('globals');

module.exports = [
  ...base,
  {
    // Type-aware rules only for TS sources — config .js files sit outside the program.
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
    },
  },
];
