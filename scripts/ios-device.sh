#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
PROJECT_PATH="$ROOT_DIR/ios/App/App.xcodeproj"
DERIVED_DATA_PATH="$ROOT_DIR/.xcode-derived-data/ios-device"
APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphoneos/App.app"
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

DEVICE_ID="${IOS_DEVICE_ID:-}"
if [ -z "$DEVICE_ID" ]; then
  DEVICE_ID="$(
    xcrun xctrace list devices 2>/dev/null |
      awk '
        /^== Devices ==/ { in_devices = 1; next }
        /^== / { in_devices = 0 }
        in_devices && /(iPhone|iPad)/ && !/Simulator/ {
          if (match($0, /\([0-9A-Fa-f-]{20,}\)/)) {
            value = substr($0, RSTART + 1, RLENGTH - 2)
            print value
            exit
          }
        }
      '
  )"
fi

if [ -z "$DEVICE_ID" ]; then
  echo "没有找到已连接的 iPhone/iPad。"
  echo "请用 USB 连接设备，在设备上点击“信任此电脑”，并确认 Xcode 的 Devices 窗口可以看到设备。"
  echo "如果设备已连接，也可以这样指定：IOS_DEVICE_ID=<设备UDID> npm run ios:device"
  exit 1
fi

echo "构建 iOS 真机版本..."
if [ -n "${IOS_DEVELOPMENT_TEAM:-}" ]; then
  xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme App \
    -configuration Debug \
    -destination "id=$DEVICE_ID" \
    -derivedDataPath "$DERIVED_DATA_PATH" \
    "DEVELOPMENT_TEAM=$IOS_DEVELOPMENT_TEAM" \
    build
else
  xcodebuild \
    -project "$PROJECT_PATH" \
    -scheme App \
    -configuration Debug \
    -destination "id=$DEVICE_ID" \
    -derivedDataPath "$DERIVED_DATA_PATH" \
    build
fi

echo "安装并启动 App..."
xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH"
xcrun devicectl device process launch --device "$DEVICE_ID" --terminate-existing "$BUNDLE_ID"

echo "iOS 真机已启动: $BUNDLE_ID"
