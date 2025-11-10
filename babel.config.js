module.exports = function (api) {  // 判断是否为生产环境
  const isProduction = api.env('production');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // 生产环境自动移除 console.log/info/warn/debug
      // 保留 console.error 用于崩溃报告
      ...(isProduction
        ? [
            [
              'transform-remove-console',
              {
                exclude: ['error'], // 保留 console.error
              },
            ],
          ]
        : []),
    ],
  };
};
