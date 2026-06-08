#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
APP_VERSION="$(node -p "require('./package.json').version")"
CHECKSUM_FILE="$RELEASE_DIR/SHA256SUMS-windows-desktop-v$APP_VERSION.txt"
REQUIRE_WINDOWS_SIGNING="${REQUIRE_WINDOWS_SIGNING:-1}"

cd "$ROOT_DIR"

if [[ "$REQUIRE_WINDOWS_SIGNING" == "1" && -z "${WINDOWS_SIGN_CERT_P12:-}" ]]; then
  cat >&2 <<EOF
WINDOWS_SIGN_CERT_P12 is not set.

Windows desktop releases should be signed to reduce SmartScreen and antivirus blocks.
For unsigned VM test builds, run:
  REQUIRE_WINDOWS_SIGNING=0 npm run win:release
EOF
  exit 1
fi

bash "$ROOT_DIR/scripts/build-windows-desktop.sh" --arch x64
bash "$ROOT_DIR/scripts/build-windows-desktop.sh" --arch x86

desktop_artifacts=(
  "$RELEASE_DIR/FMO-Dashboard-Windows-Desktop-x64-Setup.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Desktop-x64-Setup-v$APP_VERSION.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Desktop-x86-Setup.exe"
  "$RELEASE_DIR/FMO-Dashboard-Windows-Desktop-x86-Setup-v$APP_VERSION.exe"
)

bash "$ROOT_DIR/scripts/generate-release-checksums.sh" "$CHECKSUM_FILE" "${desktop_artifacts[@]}"

cat <<EOF

Windows desktop release artifacts are ready.

Mainline:
- $RELEASE_DIR/FMO-Dashboard-Windows-Desktop-x64-Setup-v$APP_VERSION.exe
- $RELEASE_DIR/FMO-Dashboard-Windows-Desktop-x86-Setup-v$APP_VERSION.exe

Checksums:
- $CHECKSUM_FILE
EOF
