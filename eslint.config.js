const expoConfig = require('eslint-config-expo');
const reactNative = require('@react-native/eslint-plugin');

module.exports = [
  expoConfig,
  {
    plugins: { '@react-native': reactNative },
  },
];
