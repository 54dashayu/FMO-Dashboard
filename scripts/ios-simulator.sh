#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
PROJECT_PATH="$ROOT_DIR/ios/App/App.xcodeproj"
DERIVED_DATA_PATH="$ROOT_DIR/.xcode-derived-data/ios-simulator"
APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphonesimulator/App.app"
BUNDLE_ID="net.bh1jss.fmodashboard.ios"

export DEVELOPER_DIR

if [ ! -d "$DEVELOPER_DIR" ]; then
  echo "找不到 Xcode: $DEVELOPER_DIR"
  echo "请先安装完整 Xcode。"
  exit 1
fi

cd "$ROOT_DIR"

echo "同步 iOS 资源..."
npm run ios:sync

DEVICE_ID="${IOS_SIMULATOR_DEVICE_ID:-}"
if [ -z "$DEVICE_ID" ]; then
  DEVICE_ID="$(
    xcrun simctl list devices available |
      awk '
        /-- iOS / { in_ios = 1; next }
        /^-- / { in_ios = 0 }
        in_ios && /iPhone/ { print; exit }
      ' |
      sed -E 's/.*\(([A-F0-9-]+)\).*/\1/'
  )"
fi

if [ -z "$DEVICE_ID" ]; then
  echo "没有找到可用的 iPhone 模拟器。请在 Xcode 中安装 iOS Platform Support。"
  exit 1
fi

echo "构建 iOS 模拟器版本..."
xcodebuild \
  -project "$PROJECT_PATH" \
  -scheme App \
  -configuration Debug \
  -destination "id=$DEVICE_ID" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  build

echo "启动模拟器..."
xcrun simctl boot "$DEVICE_ID" >/dev/null 2>&1 || true
open -a Simulator

echo "安装并启动 App..."
xcrun simctl install "$DEVICE_ID" "$APP_PATH"
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID"

echo "iOS 模拟器已启动: $BUNDLE_ID"
