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
      // 禁止空的 catch 块，统一通过 try/catch + 日志处理
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
  {
    files: ['utils/logger.ts'],
    rules: {
      // 允许在日志工具内部使用 console 映射
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      // 脚本允许使用 console 输出（CLI 体验优先）
      'no-console': 'off',
    },
  },
]);
