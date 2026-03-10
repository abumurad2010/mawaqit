const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude .local (agent temp files) from file watching to prevent crashes
// when the agent creates/deletes temporary files during development
const localDir = path.join(__dirname, ".local");
config.resolver.blockList = [
  new RegExp(`^${localDir.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&")}.*`),
];

module.exports = config;
