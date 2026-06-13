#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ce script doit etre execute en root." >&2
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/c2p}"
WEBROOT="${APP_DIR}/ops/certbot/www"
HOOK="${APP_DIR}/ops/scripts/deploy-certbot-certificate.sh"

install -d -m 0755 "${WEBROOT}/.well-known/acme-challenge"

certbot reconfigure \
  --cert-name c2p.sn \
  --webroot \
  --webroot-path "${WEBROOT}" \
  --deploy-hook "${HOOK}" \
  --run-deploy-hooks

systemctl enable --now certbot.timer
certbot renew --cert-name c2p.sn --dry-run
