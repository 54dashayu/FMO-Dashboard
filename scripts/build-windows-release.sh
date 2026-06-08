#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
APP_VERSION="$(node -p "require('./package.json').version")"
CHECKSUM_FILE="$RELEASE_DIR/SHA256SUMS-windows-v$APP_VERSION.txt"
REQUIRE_WINDOWS_SIGNING="${REQUIRE_WINDOWS_SIGNING:-1}"

cd "$ROOT_DIR"

if [[ "$REQUIRE_WINDOWS_SIGNING" == "1" && -z "${WINDOWS_SIGN_CERT_P12:-}" ]]; then
  cat >&2 <<EOF
WINDOWS_SIGN_CERT_P12 is not set.

Windows release builds must be signed to reduce SmartScreen and antivirus blocks.
For unsigned local test builds, run:
  REQUIRE_WINDOWS_SIGNING=0 npm run win:release
EOF
  exit 1
fi

bash "$ROOT_DIR/scripts/build-windows-portable-exe.sh" --arch x64
bash "$ROOT_DIR/scripts/build-windows-portable-exe.sh" --arch x86
bash "$ROOT_DIR/scripts/build-windows-portable-exe.sh" --legacy --arch x86

windows_artifacts=(
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable.zip"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-v$APP_VERSION.zip"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-v$APP_VERSION.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-x64.zip"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-x64-v$APP_VERSION.zip"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-x64.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-x64-v$APP_VERSION.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-x86.zip"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-x86-v$APP_VERSION.zip"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-x86.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-x86-v$APP_VERSION.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Legacy-Win7-x86.zip"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Legacy-Win7-x86-v$APP_VERSION.zip"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Legacy-Win7-x86.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Legacy-Win7-x86-v$APP_VERSION.exe"
)

bash "$ROOT_DIR/scripts/generate-release-checksums.sh" "$CHECKSUM_FILE" "${windows_artifacts[@]}"

cat <<EOF

Windows release artifacts are ready.

Mainline:
- $RELEASE_DIR/FMO-Dashboard-Windows-Portable-x64-v$APP_VERSION.exe
- $RELEASE_DIR/FMO-Dashboard-Windows-Portable-x64-v$APP_VERSION.zip
- $RELEASE_DIR/FMO-Dashboard-Windows-Portable-x86-v$APP_VERSION.exe
- $RELEASE_DIR/FMO-Dashboard-Windows-Portable-x86-v$APP_VERSION.zip

Legacy:
- $RELEASE_DIR/FMO-Dashboard-Windows-Legacy-Win7-x86-v$APP_VERSION.exe
- $RELEASE_DIR/FMO-Dashboard-Windows-Legacy-Win7-x86-v$APP_VERSION.zip

Checksums:
- $CHECKSUM_FILE
EOF
