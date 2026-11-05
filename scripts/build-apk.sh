#!/usr/bin/env bash
# Local release build fenced off from the desktop: on this 16 GB machine an
# unbounded Gradle/Kotlin/C++ build filled RAM and swap, and the OOM killer
# took VS Code instead of the build. The build needs ~7 GB; a throttle below
# that (MemoryHigh) made it swap for its whole run, so there is only a hard cap.
set -euo pipefail

# /tmp is a tmpfs here (RAM); keep EAS's ~2 GB working copy on disk.
export EAS_LOCAL_BUILD_WORKINGDIR="${EAS_LOCAL_BUILD_WORKINGDIR:-$HOME/.cache/eas-build-local}"
mkdir -p "$EAS_LOCAL_BUILD_WORKINGDIR"

# One Gradle JVM that exits with the build, with Kotlin compiled inside it
# instead of in extra daemons.
export GRADLE_OPTS="-Dorg.gradle.daemon=false -Dorg.gradle.workers.max=8 -Dorg.gradle.jvmargs=-Xmx4g -Dkotlin.compiler.execution.strategy=in-process"

# Past MemoryMax only the build is killed. nice and best-effort IO keep the
# desktop responsive without starving the build. --non-interactive fails on a
# prompt instead of waiting on it unseen.
systemd-run --user --scope --quiet \
  -p MemoryMax=10G -p MemorySwapMax=1G \
  nice -n 10 ionice -c2 -n7 \
  bunx eas-cli build --platform android --profile preview --local --non-interactive "$@" \
  2>&1 | tee eas-build.log
