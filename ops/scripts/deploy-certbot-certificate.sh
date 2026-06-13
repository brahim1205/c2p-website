#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/c2p}"
LINEAGE="${RENEWED_LINEAGE:-/etc/letsencrypt/live/c2p.sn}"
CERT_DIR="${APP_DIR}/ops/nginx/certs"

install -d -m 0750 "${CERT_DIR}"
install -m 0644 "${LINEAGE}/fullchain.pem" "${CERT_DIR}/fullchain.pem.new"
install -m 0600 "${LINEAGE}/privkey.pem" "${CERT_DIR}/privkey.pem.new"
mv -f "${CERT_DIR}/fullchain.pem.new" "${CERT_DIR}/fullchain.pem"
mv -f "${CERT_DIR}/privkey.pem.new" "${CERT_DIR}/privkey.pem"

docker compose \
  --env-file "${APP_DIR}/ops/env/compose.production.env" \
  -f "${APP_DIR}/docker-compose.production.yml" \
  exec -T reverse-proxy nginx -s reload
