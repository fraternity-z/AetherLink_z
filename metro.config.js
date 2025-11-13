// Custom Metro config to work around a resolution bug with @opentelemetry/api
// Some versions try to require "./semver" from
// node_modules/@opentelemetry/api/build/src/internal/global-utils.js
// Metro on RN may fail to resolve this relative import on some setups.
// We redirect that request explicitly to the actual file.

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const realSemverPath = path.join(
  projectRoot,
  'node_modules',
  '@opentelemetry',
  'api',
  'build',
  'src',
  'internal',
  'semver.js'
);

const baseResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    const originRaw = context?.originModulePath || '';
    const origin = originRaw.replace(/\\/g, '/');

    if (
      moduleName === './semver' &&
      origin.includes(['@opentelemetry', 'api', 'build', 'src', 'internal', 'global-utils.js'].join('/'))
    ) {
      return { type: 'sourceFile', filePath: realSemverPath };
    }
  } catch (e) {
    // 调试目的：解析异常不应阻断后续默认解析
    // 仅输出错误以便排查（Metro 配置环境允许 console.error）
    console.error('[metro.config] resolveRequest hook error:', e);
  }

  if (typeof baseResolve === 'function') {
    return baseResolve(context, moduleName, platform);
  }
  const { resolve } = require('metro-resolver');
  return resolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
