#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ID="$(
  sed -n 's/^project_id = "\(.*\)"$/\1/p' "$ROOT_DIR/supabase/config.toml" | head -n 1
)"
DB_CONTAINER="${SUPABASE_DB_CONTAINER:-}"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <sql-file> [sql-file ...]" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Start Supabase with: npx supabase start" >&2
  exit 1
fi

if [[ -z "$DB_CONTAINER" && -n "$PROJECT_ID" ]]; then
  CANDIDATE="supabase_db_$PROJECT_ID"
  if docker ps --format '{{.Names}}' | grep -Fxq "$CANDIDATE"; then
    DB_CONTAINER="$CANDIDATE"
  fi
fi

if [[ -z "$DB_CONTAINER" ]]; then
  DB_CONTAINERS=()
  while IFS= read -r CONTAINER_NAME; do
    DB_CONTAINERS+=("$CONTAINER_NAME")
  done < <(docker ps --filter 'name=^/supabase_db_' --format '{{.Names}}')

  if [[ ${#DB_CONTAINERS[@]} -eq 1 ]]; then
    DB_CONTAINER="${DB_CONTAINERS[0]}"
  elif [[ ${#DB_CONTAINERS[@]} -eq 0 ]]; then
    echo "No running Supabase database container found. Run: npx supabase start" >&2
    exit 1
  else
    echo "Multiple Supabase database containers found. Set SUPABASE_DB_CONTAINER." >&2
    printf '  %s\n' "${DB_CONTAINERS[@]}" >&2
    exit 1
  fi
fi

for SQL_FILE in "$@"; do
  if [[ "$SQL_FILE" != /* ]]; then
    SQL_FILE="$ROOT_DIR/$SQL_FILE"
  fi

  if [[ ! -f "$SQL_FILE" ]]; then
    echo "SQL file not found: $SQL_FILE" >&2
    exit 1
  fi

  docker exec \
    -e PGOPTIONS='-c client_min_messages=warning' \
    -i "$DB_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres <"$SQL_FILE"
done
