// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // 禁用直接使用 console，允许 console.error（崩溃报告）
      'no-console': ['error', { allow: ['error'] }],
    },
  },
  {
    files: ['utils/logger.ts'],
    rules: {
      // 允许在日志工具内部使用 console 映射
      'no-console': 'off',
    },
  },
]);
