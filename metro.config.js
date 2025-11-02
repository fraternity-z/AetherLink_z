// Custom Metro config to work around a resolution bug with @opentelemetry/api
// Some versions try to require "./semver" from
// node_modules/@opentelemetry/api/build/src/internal/global-utils.js
// Metro on RN may fail to resolve this relative import on some setups.
// We redirect that request explicitly to the actual file.

const { getDefaultConfig } = require('expo/metro-config');
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
    if (
      moduleName === './semver' &&
      context?.originModulePath?.includes(
        path.join('@opentelemetry', 'api', 'build', 'src', 'internal', 'global-utils.js')
      )
    ) {
      return { type: 'sourceFile', filePath: realSemverPath };
    }
  } catch {}

  if (typeof baseResolve === 'function') {
    return baseResolve(context, moduleName, platform);
  }
  const { resolve } = require('metro-resolver');
  return resolve(context, moduleName, platform);
};

module.exports = config;

