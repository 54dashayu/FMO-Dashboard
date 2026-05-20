#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
PACKAGE_NAME="FMO-Dashboard-Windows-Portable"
PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
OUTPUT_EXE="$RELEASE_DIR/$PACKAGE_NAME.exe"
NSIS_SCRIPT="$ROOT_DIR/scripts/windows-portable-exe.nsi"

if ! command -v makensis >/dev/null 2>&1; then
  echo "makensis was not found. Install NSIS first, for example: brew install nsis" >&2
  exit 1
fi

bash "$ROOT_DIR/scripts/build-windows-portable.sh"

if [[ ! -d "$PACKAGE_DIR" ]]; then
  echo "Portable package directory was not created: $PACKAGE_DIR" >&2
  exit 1
fi

rm -f "$OUTPUT_EXE"
makensis \
  -D"SOURCE_DIR=$PACKAGE_DIR" \
  -D"OUTPUT_EXE=$OUTPUT_EXE" \
  "$NSIS_SCRIPT"

echo "Created: $OUTPUT_EXE"
