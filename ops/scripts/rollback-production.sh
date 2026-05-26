#!/usr/bin/env bash
set -Eeuo pipefail

ROLLBACK_REF="${1:-}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

if [[ -z "$ROLLBACK_REF" ]]; then
  if [[ -f .deploy/previous-ref ]]; then
    ROLLBACK_REF="$(tr -d '[:space:]' < .deploy/previous-ref)"
  fi
fi

if [[ -z "$ROLLBACK_REF" ]]; then
  echo "[c2p rollback] Aucun rollback ref fourni et .deploy/previous-ref est absent." >&2
  exit 1
fi

echo "[c2p rollback] Rollback vers $ROLLBACK_REF"
C2P_DEPLOY_REF="$ROLLBACK_REF" "$(dirname "$0")/deploy-production.sh"
