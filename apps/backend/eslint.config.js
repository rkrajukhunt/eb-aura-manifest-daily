const node = require('@aura/config/eslint/node');

module.exports = [
  ...node,
  {
    // Type-aware rules only for TS sources — config .js files sit outside the program.
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
    },
  },
];
