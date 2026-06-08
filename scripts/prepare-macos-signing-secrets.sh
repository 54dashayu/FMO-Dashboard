#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 /path/to/developer_id_application.cer [p12-password]" >&2
  exit 1
fi

cert_path="$1"
password="${2:-}"
work_dir="build/macos-signing"
key_path="$work_dir/DeveloperIDApplication.key"
pem_path="$work_dir/DeveloperIDApplication.cer.pem"
p12_path="$work_dir/DeveloperIDApplication.p12"
base64_path="$work_dir/DeveloperIDApplication.p12.base64.txt"

if [[ ! -f "$cert_path" ]]; then
  echo "Certificate not found: $cert_path" >&2
  exit 1
fi

if [[ ! -f "$key_path" ]]; then
  echo "Private key not found: $key_path" >&2
  echo "Generate the CSR/private key first before running this script." >&2
  exit 1
fi

if [[ -z "$password" ]]; then
  password="$(openssl rand -base64 24 | tr -d '\n')"
fi

mkdir -p "$work_dir"
openssl x509 -inform DER -in "$cert_path" -out "$pem_path"
openssl pkcs12 -export \
  -legacy \
  -inkey "$key_path" \
  -in "$pem_path" \
  -out "$p12_path" \
  -passout "pass:$password" \
  -name "Developer ID Application"
openssl base64 -A -in "$p12_path" -out "$base64_path"
chmod 600 "$key_path" "$p12_path" "$base64_path"

echo "Prepared macOS signing files:"
echo "  P12: $p12_path"
echo "  Base64 secret file: $base64_path"
echo
echo "GitHub secret values:"
echo "  APPLE_CERTIFICATE_P12_BASE64: copy the full contents of $base64_path"
echo "  APPLE_CERTIFICATE_PASSWORD: $password"
