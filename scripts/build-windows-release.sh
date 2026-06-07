#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
APP_VERSION="$(node -p "require('./package.json').version")"
CHECKSUM_FILE="$RELEASE_DIR/SHA256SUMS-windows-v$APP_VERSION.txt"

cd "$ROOT_DIR"

bash "$ROOT_DIR/scripts/build-windows-portable-exe.sh"
bash "$ROOT_DIR/scripts/generate-release-checksums.sh" \
  "$CHECKSUM_FILE" \
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable.zip" \
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-v$APP_VERSION.zip" \
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable.exe" \
  "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-v$APP_VERSION.exe"

cat <<EOF

Windows release artifacts are ready.

Artifacts:
- $RELEASE_DIR/FMO-Dashboard-Windows-Portable.zip
- $RELEASE_DIR/FMO-Dashboard-Windows-Portable-v$APP_VERSION.zip
- $RELEASE_DIR/FMO-Dashboard-Windows-Portable.exe
- $RELEASE_DIR/FMO-Dashboard-Windows-Portable-v$APP_VERSION.exe
- $CHECKSUM_FILE

Signing:
- If WINDOWS_SIGN_CERT_P12 was set, the EXE artifacts were signed.
- If not, the EXE artifacts are unsigned and may trigger SmartScreen or antivirus warnings.
EOF
