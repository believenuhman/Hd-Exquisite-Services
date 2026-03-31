const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const defaultBlockList = config.resolver.blockList
  ? [].concat(config.resolver.blockList)
  : [];

config.resolver.blockList = [
  ...defaultBlockList,
  /\.local\/skills\/.*/,
  /\.local\/state\/.*/,
  /\.local\/tasks\/.*/,
  new RegExp(`^${__dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/web/.*`),
];

module.exports = config;
