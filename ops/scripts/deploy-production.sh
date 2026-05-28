#!/usr/bin/env bash
set -Eeuo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-ops/env/compose.production.env}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-ops/env/backend.production.env}"
DEPLOY_REF="${1:-${C2P_DEPLOY_REF:-}}"
DEPLOY_LOCK_FILE="${DEPLOY_LOCK_FILE:-/tmp/c2p-production-deploy.lock}"
POSTDEPLOY_BASE_URL="${POSTDEPLOY_BASE_URL:-}"
SKIP_GIT_CHECKOUT="${SKIP_GIT_CHECKOUT:-false}"
SKIP_PREDEPLOY_BACKUP="${SKIP_PREDEPLOY_BACKUP:-false}"
REQUIRE_PREDEPLOY_BACKUP="${REQUIRE_PREDEPLOY_BACKUP:-true}"
POSTDEPLOY_SKIP_BACKUP_CHECK="${POSTDEPLOY_SKIP_BACKUP_CHECK:-false}"
POSTDEPLOY_RESTORE_DRILL="${POSTDEPLOY_RESTORE_DRILL:-false}"
BACKUP_DIR="${BACKUP_DIR:-backups/postgres}"
ALLOW_DIRTY_DEPLOY_WORKTREE="${ALLOW_DIRTY_DEPLOY_WORKTREE:-false}"
BACKEND_HEALTH_TIMEOUT_SECONDS="${BACKEND_HEALTH_TIMEOUT_SECONDS:-120}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

log() {
  printf '[c2p deploy] %s\n' "$*"
}

die() {
  printf '[c2p deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_file() {
  local file_path="$1"
  [[ -f "$file_path" ]] || die "Fichier introuvable: $file_path"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Commande introuvable: $1"
}

compose() {
  docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

is_service_running() {
  compose ps --services --filter status=running | grep -qx "$1"
}

wait_service_healthy() {
  local service_name="$1"
  local timeout_seconds="$2"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local container_id
    container_id="$(compose ps -q "$service_name" 2>/dev/null || true)"
    if [[ -n "$container_id" ]]; then
      local health_status
      local state_status
      health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
      state_status="$(docker inspect --format '{{.State.Status}}' "$container_id" 2>/dev/null || true)"

      if [[ "$health_status" == "healthy" || ( -z "$health_status" && "$state_status" == "running" ) ]]; then
        return 0
      fi
    fi

    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      compose ps "$service_name" || true
      die "Service $service_name non prêt après ${timeout_seconds}s."
    fi

    sleep 2
  done
}

require_command git
require_command docker
require_command node
require_file "$COMPOSE_FILE"
require_file "$COMPOSE_ENV_FILE"
require_file "$BACKEND_ENV_FILE"

exec 9>"$DEPLOY_LOCK_FILE"
if ! flock -n 9; then
  die "Un autre déploiement production est déjà en cours."
fi

previous_ref="${C2P_PREVIOUS_REF:-$(git rev-parse --verify HEAD 2>/dev/null || true)}"
log "Révision actuelle: ${previous_ref:-inconnue}"

if [[ "$SKIP_GIT_CHECKOUT" != "true" ]]; then
  [[ -n "$DEPLOY_REF" ]] || die "Aucune révision à déployer. Passe un SHA/branche en argument ou C2P_DEPLOY_REF."
  if [[ "$ALLOW_DIRTY_DEPLOY_WORKTREE" != "true" ]]; then
    dirty_tracked="$(git status --porcelain --untracked-files=no)"
    [[ -z "$dirty_tracked" ]] || die "Worktree VPS modifié. Commit/stash/nettoie les fichiers suivis ou relance avec ALLOW_DIRTY_DEPLOY_WORKTREE=true."
  fi
  log "Récupération Git et checkout de $DEPLOY_REF"
  git fetch --all --tags --prune
  git checkout --detach "$DEPLOY_REF"
fi

target_ref="$(git rev-parse --verify HEAD)"
log "Révision cible: $target_ref"

mkdir -p .deploy
printf '%s\n' "$previous_ref" > .deploy/previous-ref
printf '%s\n' "$target_ref" > .deploy/current-ref
date -u +'%Y-%m-%dT%H:%M:%SZ' > .deploy/last-deploy-started-at

log "Statut env production"
node ops/scripts/production-env-status.mjs \
  --strict \
  --compose-env "$COMPOSE_ENV_FILE" \
  --backend-env "$BACKEND_ENV_FILE"

log "Préflight production"
node ops/scripts/production-preflight.mjs \
  --compose-env "$COMPOSE_ENV_FILE" \
  --backend-env "$BACKEND_ENV_FILE"

log "Validation Docker Compose"
node ops/scripts/production-compose-check.mjs \
  --compose-file "$COMPOSE_FILE" \
  --compose-env "$COMPOSE_ENV_FILE"

if [[ "$SKIP_PREDEPLOY_BACKUP" == "true" ]]; then
  log "Backup PostgreSQL pré-déploiement ignoré explicitement (SKIP_PREDEPLOY_BACKUP=true)"
elif is_service_running postgres; then
  log "Backup PostgreSQL pré-déploiement"
  COMPOSE_FILE="$COMPOSE_FILE" COMPOSE_ENV_FILE="$COMPOSE_ENV_FILE" \
    ops/scripts/postgres-backup.sh
else
  if [[ "$REQUIRE_PREDEPLOY_BACKUP" == "true" ]]; then
    die "PostgreSQL n'est pas en cours d'exécution, backup pré-déploiement impossible. Pour un premier déploiement, relancer avec REQUIRE_PREDEPLOY_BACKUP=false."
  fi
  log "Backup PostgreSQL pré-déploiement non exécuté: service postgres absent/non démarré"
fi

log "Build des images"
compose build --pull

log "Démarrage / mise à jour de la stack"
compose up -d --remove-orphans

log "Etat Docker Compose"
compose ps

log "Attente santé backend"
wait_service_healthy backend "$BACKEND_HEALTH_TIMEOUT_SECONDS"

log "Postdeploy"
postdeploy_args=(
  --compose-file "$COMPOSE_FILE"
  --compose-env "$COMPOSE_ENV_FILE"
  --backend-env "$BACKEND_ENV_FILE"
)
if [[ -n "$POSTDEPLOY_BASE_URL" ]]; then
  postdeploy_args+=(--base-url "$POSTDEPLOY_BASE_URL")
fi
if [[ "$POSTDEPLOY_SKIP_BACKUP_CHECK" == "true" || "$SKIP_PREDEPLOY_BACKUP" == "true" ]]; then
  postdeploy_args+=(--skip-backup-check)
fi
node ops/scripts/production-postdeploy-check.mjs "${postdeploy_args[@]}"

if [[ "$POSTDEPLOY_RESTORE_DRILL" == "true" ]]; then
  log "Restore drill PostgreSQL isolé"
  node ops/scripts/postgres-restore-drill.mjs --backup-dir "$BACKUP_DIR"
fi

date -u +'%Y-%m-%dT%H:%M:%SZ' > .deploy/last-deploy-succeeded-at
log "Déploiement terminé: $target_ref"
