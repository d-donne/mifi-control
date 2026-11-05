#!/usr/bin/env sh
# Publishes a JS-only update to the preview channel for the installed APK.
# The Android runtime version is a fingerprint of the app config, so any edit
# EAS makes to app.json while publishing targets a runtime no phone has.
set -eu

message="${1:?usage: bun run update 'what changed'}"
config="app.json eas.json"

if ! git diff --quiet -- $config; then
  echo "app.json or eas.json has uncommitted changes; commit or revert them first." >&2
  exit 1
fi

runtime=$(bunx expo-updates fingerprint:generate --platform android | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).hash))')
echo "Publishing for Android runtime ${runtime} (Settings → App → Runtime shows the first 8 characters)."

bunx eas-cli update --platform android --channel preview --environment preview --message "$message"

if ! git diff --quiet -- $config; then
  git diff -- $config
  git checkout -- $config
  echo "EAS edited the app config while publishing (reverted above). The update may target a different runtime than ${runtime}; check the Runtime line it printed." >&2
  exit 1
fi
