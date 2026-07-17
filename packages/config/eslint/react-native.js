const globals = require('globals');
const base = require('./base');

/** React Native/Expo flavour. */
module.exports = [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021, ...globals.jest, __DEV__: 'readonly' },
    },
  },
];
