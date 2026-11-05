// The Android runtime version is this fingerprint: anything it hashes decides
// which installed APKs an EAS update reaches. These are the "balanced" preset's
// skips (the default) plus package.json scripts, which never reach the native app.
const { SourceSkips } = require("@expo/fingerprint");

/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  sourceSkips:
    SourceSkips.PackageJsonScriptsAll |
    SourceSkips.ExpoConfigVersions |
    SourceSkips.ExpoConfigRuntimeVersionIfString |
    SourceSkips.EasJson |
    SourceSkips.Easignore |
    SourceSkips.AutolinkingConfigPaths,
};
