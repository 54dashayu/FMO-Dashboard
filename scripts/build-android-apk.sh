#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT_DIR/android"
RELEASE_DIR="$ROOT_DIR/release/android"
APP_VERSION="$(node -p "require('./package.json').version")"
BUILD_TYPE="Debug"
CLEAN_BUILD=false

print_help() {
  echo "用法: bash scripts/build-android-apk.sh [选项]"
  echo ""
  echo "选项:"
  echo "  --debug       编译 debug APK（默认）"
  echo "  --release     编译 release APK"
  echo "  --clean       构建前清理 Android 缓存"
  echo "  -h, --help    显示帮助"
  echo ""
  echo "正式 release 签名可通过环境变量或 ~/.gradle/gradle.properties 配置："
  echo "  ANDROID_KEYSTORE_PATH"
  echo "  ANDROID_KEYSTORE_PASSWORD"
  echo "  ANDROID_KEY_ALIAS"
  echo "  ANDROID_KEY_PASSWORD"
}

for arg in "$@"; do
  case "$arg" in
    --debug) BUILD_TYPE="Debug" ;;
    --release) BUILD_TYPE="Release" ;;
    --clean) CLEAN_BUILD=true ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo "未知参数: $arg" >&2
      print_help >&2
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

export FMO_LEGACY_ANDROID="${FMO_LEGACY_ANDROID:-1}"
echo "Android WebView legacy build: FMO_LEGACY_ANDROID=$FMO_LEGACY_ANDROID"

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" && ! -f "$ANDROID_DIR/local.properties" ]]; then
  cat >&2 <<EOF
Android SDK location was not found.

Set ANDROID_HOME / ANDROID_SDK_ROOT, or create android/local.properties:

  sdk.dir=/absolute/path/to/Android/sdk

Common macOS path:

  sdk.dir=$HOME/Library/Android/sdk
EOF
  exit 1
fi

npm run build
npx cap sync android

cd "$ANDROID_DIR"
if [[ "$CLEAN_BUILD" == true ]]; then
  ./gradlew clean
fi

./gradlew ":app:assemble$BUILD_TYPE"

build_type_lower="$(echo "$BUILD_TYPE" | tr '[:upper:]' '[:lower:]')"
source_apk="$ANDROID_DIR/app/build/outputs/apk/$build_type_lower/app-$build_type_lower.apk"

if [[ ! -f "$source_apk" ]]; then
  echo "APK was not generated: $source_apk" >&2
  exit 1
fi

mkdir -p "$RELEASE_DIR"
target_apk="$RELEASE_DIR/FMO-Dashboard-Android-v$APP_VERSION-$build_type_lower.apk"
cp "$source_apk" "$target_apk"

checksum_file="$RELEASE_DIR/SHA256SUMS-android-v$APP_VERSION-$build_type_lower.txt"
(
  cd "$RELEASE_DIR"
  shasum -a 256 "$(basename "$target_apk")" > "$(basename "$checksum_file")"
)

echo "Created: $target_apk"
echo "Created: $checksum_file"
