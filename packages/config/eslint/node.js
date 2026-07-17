const globals = require('globals');
const base = require('./base');

/** Node/NestJS flavour: server globals, decorator-friendly relaxations. */
module.exports = [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'commonjs',
    },
    rules: {
      // Nest DI resolves providers via decorator metadata; empty ctor-only classes are idiomatic.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
];
