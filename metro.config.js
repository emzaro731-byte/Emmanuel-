const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://metrobundler.dev/docs/configuration
 */

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);