#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
PACKAGE_NAME="FMO-Dashboard-Windows-Portable"
PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
OUTPUT_EXE="$RELEASE_DIR/$PACKAGE_NAME.exe"
APP_VERSION="$(node -p "require('./package.json').version")"
VERSIONED_OUTPUT_EXE="$RELEASE_DIR/$PACKAGE_NAME-v$APP_VERSION.exe"
NSIS_SCRIPT="$ROOT_DIR/scripts/windows-portable-exe.nsi"
ICON_FILE="$ROOT_DIR/src-tauri/icons/icon.ico"

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
  -D"ICON_FILE=$ICON_FILE" \
  -D"APP_VERSION=$APP_VERSION" \
  "$NSIS_SCRIPT"

cp "$OUTPUT_EXE" "$VERSIONED_OUTPUT_EXE"

echo "Created: $OUTPUT_EXE"
echo "Created: $VERSIONED_OUTPUT_EXE"
