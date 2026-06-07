#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="$ROOT_DIR/release"
OUTPUT_FILE="${1:-$RELEASE_DIR/SHA256SUMS.txt}"
shift || true

if [[ ! -d "$RELEASE_DIR" ]]; then
  echo "Release directory does not exist: $RELEASE_DIR" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
: > "$OUTPUT_FILE"

if [[ "$#" -gt 0 ]]; then
  for file in "$@"; do
    if [[ ! -f "$file" ]]; then
      echo "Artifact not found: $file" >&2
      exit 1
    fi
    rel="${file#$RELEASE_DIR/}"
    hash="$(shasum -a 256 "$file" | awk '{print $1}')"
    printf '%s  %s\n' "$hash" "$rel" >> "$OUTPUT_FILE"
  done
else
  find "$RELEASE_DIR" -maxdepth 2 -type f \
    \( -name '*.exe' -o -name '*.zip' -o -name '*.apk' -o -name '*.aab' \) \
    | sort \
    | while IFS= read -r file; do
      rel="${file#$RELEASE_DIR/}"
      hash="$(shasum -a 256 "$file" | awk '{print $1}')"
      printf '%s  %s\n' "$hash" "$rel" >> "$OUTPUT_FILE"
    done
fi

if [[ ! -s "$OUTPUT_FILE" ]]; then
  echo "No release artifacts found in $RELEASE_DIR" >&2
  exit 1
fi

echo "Created: $OUTPUT_FILE"
