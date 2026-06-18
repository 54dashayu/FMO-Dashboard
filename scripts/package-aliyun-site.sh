#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="${ROOT_DIR}/deploy/aliyun-site"
TARBALL="${ROOT_DIR}/deploy/fmo-bh1jss-net-aliyun-site.tar.gz"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/package-aliyun-site.sh package
  bash scripts/package-aliyun-site.sh deploy

Environment for deploy:
  ALIYUN_HOST    Required. SSH host or IP, for example 203.0.113.10
  ALIYUN_USER    Optional. Defaults to root
  ALIYUN_PATH    Optional. Defaults to /var/www/fmologs/dist

This packages the public homepage, downloads, and V2.02 web app for fmo.bh1jss.net.
EOF
}

command="${1:-package}"
if [[ "${command}" != "package" && "${command}" != "deploy" ]]; then
  usage
  exit 2
fi

cd "${ROOT_DIR}"

echo "==> Checking homepage download links"
missing_downloads="$(
  comm -23 \
    <(grep -Eo 'href="/downloads/[^"]+' deploy/vps-download-index.html | sed 's#^href="/downloads/##' | sort -u) \
    <(find deploy/downloads -type f | sed 's#^deploy/downloads/##' | sort -u)
)"
if [[ -n "${missing_downloads}" ]]; then
  echo "Missing files referenced by deploy/vps-download-index.html:" >&2
  echo "${missing_downloads}" >&2
  exit 1
fi

echo "==> Building Web V2.02 with /v2/ base"
npm run build -- --base=/v2/

echo "==> Preparing site directory: ${SITE_DIR}"
rm -rf "${SITE_DIR}"
mkdir -p "${SITE_DIR}/v2" "${SITE_DIR}/downloads"

cp deploy/vps-download-index.html "${SITE_DIR}/index.html"
cp deploy/vps-download-index.html "${SITE_DIR}/vps-download-index.html"
cp public/app-icon.png "${SITE_DIR}/app-icon.png"
cp public/app-icon-384.png "${SITE_DIR}/app-icon-384.png"
cp public/favicon.ico "${SITE_DIR}/favicon.ico"
cp public/apple-touch-icon.png "${SITE_DIR}/apple-touch-icon.png"
cp public/apple-touch-icon-precomposed.png "${SITE_DIR}/apple-touch-icon-precomposed.png"
cp public/apple-touch-icon-120x120.png "${SITE_DIR}/apple-touch-icon-120x120.png"
cp public/apple-touch-icon-120x120-precomposed.png "${SITE_DIR}/apple-touch-icon-120x120-precomposed.png"
cp -R deploy/assets "${SITE_DIR}/assets"
cp -R deploy/downloads/. "${SITE_DIR}/downloads/"
cp -R dist/. "${SITE_DIR}/v2/"

echo "==> Creating tarball: ${TARBALL}"
rm -f "${TARBALL}"
COPYFILE_DISABLE=1 tar -czf "${TARBALL}" -C "${SITE_DIR}" .

echo "==> Package ready"
du -sh "${SITE_DIR}" "${TARBALL}"

if [[ "${command}" == "deploy" ]]; then
  : "${ALIYUN_HOST:?ALIYUN_HOST is required for deploy}"
  ALIYUN_USER="${ALIYUN_USER:-root}"
  ALIYUN_PATH="${ALIYUN_PATH:-/var/www/fmologs/dist}"
  remote="${ALIYUN_USER}@${ALIYUN_HOST}"

  echo "==> Uploading to ${remote}:${ALIYUN_PATH}.new"
  ssh "${remote}" "mkdir -p '${ALIYUN_PATH}.new'"
  rsync -az --delete "${SITE_DIR}/" "${remote}:${ALIYUN_PATH}.new/"

  echo "==> Activating release on ${remote}"
  ssh "${remote}" "
    set -euo pipefail
    mkdir -p '$(dirname "${ALIYUN_PATH}")'
    rm -rf '${ALIYUN_PATH}.old'
    if [ -d '${ALIYUN_PATH}' ]; then mv '${ALIYUN_PATH}' '${ALIYUN_PATH}.old'; fi
    mv '${ALIYUN_PATH}.new' '${ALIYUN_PATH}'
  "

  echo "==> Deploy complete. Reload nginx on the server if config changed."
fi
