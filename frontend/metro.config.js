const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve CommonJS modules (e.g. axios)
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
