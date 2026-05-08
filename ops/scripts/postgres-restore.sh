#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /absolute/path/to/backup.sql.gz" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.production.yml"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-$REPO_ROOT/ops/env/compose.production.env}"

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "Missing compose env file: $COMPOSE_ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$COMPOSE_ENV_FILE"
set +a

: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"

gzip -dc "$BACKUP_FILE" | docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" exec -T \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  postgres \
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "PostgreSQL restore completed from: $BACKUP_FILE"
