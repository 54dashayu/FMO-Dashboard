#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
PACKAGE_NAME="FMO-Dashboard-Windows-Portable"
PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
NODE_VERSION="${NODE_VERSION:-v26.0.0}"
NODE_ZIP="node-${NODE_VERSION}-win-x64.zip"
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
cp "$tmp_node_dir"/node-"$NODE_VERSION"-win-x64/node.exe "$PACKAGE_DIR/runtime/node.exe"
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
)

echo "Created: $RELEASE_DIR/$PACKAGE_NAME.zip"
