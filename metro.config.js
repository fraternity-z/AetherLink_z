// Custom Metro config to work around a resolution bug with @opentelemetry/api
// Some versions try to require "./semver" from
// node_modules/@opentelemetry/api/build/src/internal/global-utils.js
// Metro on RN may fail to resolve this relative import on some setups.
// We redirect that request explicitly to the actual file.

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

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

    // Workaround for Metro failing to resolve certain relative imports
    // inside react-native-markdown-display on some Windows/Posix mixes.
    // If the origin file is the package src/index.js and request starts with ./lib/
    // resolve it explicitly into node_modules/react-native-markdown-display/src/lib/*
    const rmdIndexSuffix = 'react-native-markdown-display/src/index.js';
    if (moduleName.startsWith('./lib/') && origin.endsWith(rmdIndexSuffix)) {
      // Normalize requested subpath and ensure .js extension
      let sub = moduleName.replace(/^\.\//, ''); // remove leading ./
      const candidate = path.join(
        projectRoot,
        'node_modules',
        'react-native-markdown-display',
        'src',
        sub
      );

      const withJs = candidate.endsWith('.js') ? candidate : candidate + '.js';
      const filePath = fs.existsSync(withJs) ? withJs : candidate;

      if (fs.existsSync(filePath)) {
        return { type: 'sourceFile', filePath };
      }
    }

    // Normalize deep imports for ramda, e.g. 'ramda/src/equals'.
    // Metro should resolve these, but on some setups it fails.
    if (moduleName.startsWith('ramda/src/')) {
      const sub = moduleName.replace(/^ramda\/src\//, '');
      const candidate = path.join(projectRoot, 'node_modules', 'ramda', 'src', sub);
      const withJs = candidate.endsWith('.js') ? candidate : candidate + '.js';
      const filePath = fs.existsSync(withJs) ? withJs : candidate;
      if (fs.existsSync(filePath)) {
        return { type: 'sourceFile', filePath };
      }
    }
  } catch {}

  if (typeof baseResolve === 'function') {
    return baseResolve(context, moduleName, platform);
  }
  const { resolve } = require('metro-resolver');
  return resolve(context, moduleName, platform);
};

module.exports = config;
