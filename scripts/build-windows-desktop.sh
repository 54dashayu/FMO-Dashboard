#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WINDOWS_ARCH="${WINDOWS_ARCH:-x64}"
RELEASE_DIR="$ROOT_DIR/release"
APP_VERSION="$(node -p "require('./package.json').version")"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --arch)
      WINDOWS_ARCH="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

case "$WINDOWS_ARCH" in
  x64)
    RUST_TARGET="x86_64-pc-windows-msvc"
    ;;
  x86)
    RUST_TARGET="i686-pc-windows-msvc"
    ;;
  arm64)
    RUST_TARGET="aarch64-pc-windows-msvc"
    ;;
  *)
    echo "Unsupported WINDOWS_ARCH: $WINDOWS_ARCH (expected x64, x86, or arm64)" >&2
    exit 1
    ;;
esac

cd "$ROOT_DIR"

if [[ "$(uname -s)" != MINGW* && "$(uname -s)" != MSYS* && "$(uname -s)" != CYGWIN* && "${ALLOW_WINDOWS_CROSS_BUILD:-0}" != "1" ]]; then
  cat >&2 <<EOF
Windows desktop installers should be built on a Windows VM or Windows CI runner.

Run this script inside the Windows VM with Git Bash, or set ALLOW_WINDOWS_CROSS_BUILD=1
if you have a fully configured Tauri cross-compilation environment.
EOF
  exit 1
fi

echo "Building Tauri desktop app for Windows $WINDOWS_ARCH ($RUST_TARGET)"
npm run tauri:build -- --target "$RUST_TARGET" --bundles nsis

bundle_dir="$ROOT_DIR/src-tauri/target/$RUST_TARGET/release/bundle"
if [[ ! -d "$bundle_dir" ]]; then
  bundle_dir="$ROOT_DIR/src-tauri/target/release/bundle"
fi

setup_exe="$(
  find "$bundle_dir/nsis" "$bundle_dir" -maxdepth 2 -type f \
    \( -name '*setup*.exe' -o -name '*Setup*.exe' \) 2>/dev/null \
    | sort \
    | head -n 1
)"
if [[ -z "$setup_exe" || ! -f "$setup_exe" ]]; then
  echo "Windows NSIS setup EXE was not found under: $bundle_dir" >&2
  exit 1
fi

mkdir -p "$RELEASE_DIR"
output_exe="$RELEASE_DIR/FMO-Dashboard-Windows-Desktop-$WINDOWS_ARCH-Setup.exe"
versioned_output_exe="$RELEASE_DIR/FMO-Dashboard-Windows-Desktop-$WINDOWS_ARCH-Setup-v$APP_VERSION.exe"
cp "$setup_exe" "$output_exe"

if [[ -n "${WINDOWS_SIGN_CERT_P12:-}" ]]; then
  bash "$ROOT_DIR/scripts/sign-windows-artifact.sh" "$output_exe"
else
  echo "WINDOWS_SIGN_CERT_P12 is not set; desktop setup EXE is unsigned."
fi

cp "$output_exe" "$versioned_output_exe"

echo "Windows desktop artifacts are ready:"
echo "- $output_exe"
echo "- $versioned_output_exe"
