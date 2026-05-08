#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARGET_FILE="${1:-/etc/cron.d/c2p-postgres-backup}"
SCHEDULE="${BACKUP_CRON_SCHEDULE:-30 2 * * *}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$REPO_ROOT/ops/env/compose.production.env}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

cat > "$TARGET_FILE" <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
COMPOSE_ENV_FILE=$COMPOSE_ENV_FILE
BACKUP_RETENTION_DAYS=$BACKUP_RETENTION_DAYS
$SCHEDULE deploy $REPO_ROOT/ops/scripts/postgres-backup.sh >> /var/log/c2p-postgres-backup.log 2>&1
EOF

chmod 644 "$TARGET_FILE"
echo "Installed cron file: $TARGET_FILE"
