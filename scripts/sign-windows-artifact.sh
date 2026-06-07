#!/usr/bin/env bash
set -euo pipefail

ARTIFACT="${1:-}"
TIMESTAMP_URL="${WINDOWS_SIGN_TIMESTAMP_URL:-http://timestamp.digicert.com}"

if [[ -z "$ARTIFACT" ]]; then
  echo "Usage: $0 path/to/artifact.exe" >&2
  exit 1
fi

if [[ ! -f "$ARTIFACT" ]]; then
  echo "Artifact not found: $ARTIFACT" >&2
  exit 1
fi

if [[ -z "${WINDOWS_SIGN_CERT_P12:-}" ]]; then
  echo "WINDOWS_SIGN_CERT_P12 is not set; skip signing: $ARTIFACT"
  exit 0
fi

if [[ ! -f "$WINDOWS_SIGN_CERT_P12" ]]; then
  echo "WINDOWS_SIGN_CERT_P12 does not exist: $WINDOWS_SIGN_CERT_P12" >&2
  exit 1
fi

if [[ -z "${WINDOWS_SIGN_CERT_PASSWORD:-}" ]]; then
  echo "WINDOWS_SIGN_CERT_PASSWORD is not set" >&2
  exit 1
fi

if command -v osslsigncode >/dev/null 2>&1; then
  tmp_signed="${ARTIFACT}.signed"
  osslsigncode sign \
    -pkcs12 "$WINDOWS_SIGN_CERT_P12" \
    -pass "$WINDOWS_SIGN_CERT_PASSWORD" \
    -n "FMO Dashboard" \
    -i "https://github.com/54dashayu/FMO-Dashboard" \
    -t "$TIMESTAMP_URL" \
    -in "$ARTIFACT" \
    -out "$tmp_signed"
  mv "$tmp_signed" "$ARTIFACT"
  echo "Signed with osslsigncode: $ARTIFACT"
  exit 0
fi

echo "osslsigncode was not found; install it or sign on Windows with signtool.exe" >&2
echo "macOS example: brew install osslsigncode" >&2
echo "Windows example: signtool sign /fd SHA256 /tr <timestamp-url> /td SHA256 /f cert.pfx artifact.exe" >&2
exit 1
