#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
APP_VERSION="$(node -p "require('./package.json').version")"
NSIS_SCRIPT="$ROOT_DIR/scripts/windows-portable-exe.nsi"
ICON_FILE="$ROOT_DIR/src-tauri/icons/icon.ico"
WINDOWS_ARCH="${WINDOWS_ARCH:-x64}"
WINDOWS_FLAVOR="${WINDOWS_FLAVOR:-Portable}"

portable_args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --arch)
      WINDOWS_ARCH="${2:-}"
      portable_args+=("$1" "$2")
      shift 2
      ;;
    --node-version)
      portable_args+=("$1" "${2:-}")
      shift 2
      ;;
    --legacy)
      WINDOWS_FLAVOR="Legacy-Win7"
      portable_args+=("$1")
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

PACKAGE_NAME="FMO-Dashboard-Windows-$WINDOWS_FLAVOR-$WINDOWS_ARCH"
PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
OUTPUT_EXE="$RELEASE_DIR/$PACKAGE_NAME.exe"
VERSIONED_OUTPUT_EXE="$RELEASE_DIR/$PACKAGE_NAME-v$APP_VERSION.exe"

if ! command -v makensis >/dev/null 2>&1; then
  echo "makensis was not found. Install NSIS first, for example: brew install nsis" >&2
  exit 1
fi

bash "$ROOT_DIR/scripts/build-windows-portable.sh" "${portable_args[@]}"

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

if [[ -n "${WINDOWS_SIGN_CERT_P12:-}" ]]; then
  bash "$ROOT_DIR/scripts/sign-windows-artifact.sh" "$OUTPUT_EXE"
  cp "$OUTPUT_EXE" "$VERSIONED_OUTPUT_EXE"
else
  echo "WINDOWS_SIGN_CERT_P12 is not set; created unsigned EXE artifacts"
fi

if [[ "$WINDOWS_FLAVOR" == "Portable" && "$WINDOWS_ARCH" == "x64" ]]; then
  cp "$OUTPUT_EXE" "$RELEASE_DIR/FMO-Dashboard-Windows-Portable.exe"
  cp "$VERSIONED_OUTPUT_EXE" "$RELEASE_DIR/FMO-Dashboard-Windows-Portable-v$APP_VERSION.exe"
fi

echo "Created: $OUTPUT_EXE"
echo "Created: $VERSIONED_OUTPUT_EXE"
