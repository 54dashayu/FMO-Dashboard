#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
APP_VERSION="$(node -p "require('./package.json').version")"
WINDOWS_ARCH="${WINDOWS_ARCH:-x64}"
WINDOWS_FLAVOR="${WINDOWS_FLAVOR:-Portable}"
NODE_VERSION="${NODE_VERSION:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --arch)
      WINDOWS_ARCH="${2:-}"
      shift 2
      ;;
    --node-version)
      NODE_VERSION="${2:-}"
      shift 2
      ;;
    --legacy)
      WINDOWS_FLAVOR="Legacy-Win7"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

case "$WINDOWS_ARCH" in
  x64 | x86 | arm64) ;;
  *)
    echo "Unsupported WINDOWS_ARCH: $WINDOWS_ARCH (expected x64, x86, or arm64)" >&2
    exit 1
    ;;
esac

if [[ -z "$NODE_VERSION" ]]; then
  if [[ "$WINDOWS_FLAVOR" == "Legacy-Win7" ]]; then
    NODE_VERSION="v14.16.1"
  else
    NODE_VERSION="v22.22.3"
  fi
fi

PACKAGE_NAME="FMO-Dashboard-Windows-$WINDOWS_FLAVOR-$WINDOWS_ARCH"
PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
NODE_ZIP="node-${NODE_VERSION}-win-${WINDOWS_ARCH}.zip"
NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_ZIP}"
NODE_CACHE="$RELEASE_DIR/$NODE_ZIP"

cd "$ROOT_DIR"

npm run build

rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/app" "$PACKAGE_DIR/runtime" "$RELEASE_DIR"

if [[ ! -f "$NODE_CACHE" ]]; then
  echo "Downloading Windows Node.js runtime: $NODE_URL"
  curl -L "$NODE_URL" -o "$NODE_CACHE"
fi

tmp_node_dir="$(mktemp -d)"
unzip -q "$NODE_CACHE" -d "$tmp_node_dir"
cp "$tmp_node_dir"/node-"$NODE_VERSION"-win-"$WINDOWS_ARCH"/node.exe "$PACKAGE_DIR/runtime/node.exe"
rm -rf "$tmp_node_dir"

cp -R dist/. "$PACKAGE_DIR/app/"
cp scripts/portable-server.mjs "$PACKAGE_DIR/server.mjs"
cp scripts/start-windows.bat "$PACKAGE_DIR/start-windows.bat"
cp scripts/start-windows-hidden.vbs "$PACKAGE_DIR/start-windows-hidden.vbs"
cp scripts/stop-windows.bat "$PACKAGE_DIR/stop-windows.bat"
cp scripts/PORTABLE_README.md "$PACKAGE_DIR/README.md"

(
  cd "$RELEASE_DIR"
  rm -f "$PACKAGE_NAME.zip"
  zip -qr "$PACKAGE_NAME.zip" "$PACKAGE_NAME"
  cp "$PACKAGE_NAME.zip" "$PACKAGE_NAME-v$APP_VERSION.zip"

  if [[ "$WINDOWS_FLAVOR" == "Portable" && "$WINDOWS_ARCH" == "x64" ]]; then
    cp "$PACKAGE_NAME.zip" "FMO-Dashboard-Windows-Portable.zip"
    cp "$PACKAGE_NAME.zip" "FMO-Dashboard-Windows-Portable-v$APP_VERSION.zip"
  fi
)

echo "Created: $RELEASE_DIR/$PACKAGE_NAME.zip"
echo "Created: $RELEASE_DIR/$PACKAGE_NAME-v$APP_VERSION.zip"
