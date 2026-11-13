#!/usr/bin/env bash
#
# Postgres backup to S3. App-agnostic: copy scripts/backup/ into any app.
# Full runbook: docs/DB_BACKUPS.md
#
# Takes a `pg_dump -Fc` dump, checks it is readable, then uploads it twice:
#
#   weekly/<app>_<UTC timestamp>.dump   expired by the bucket lifecycle (84 days)
#   latest/<app>.dump                   never expired; always the last good dump
#
# `latest/` is written only after the dated upload succeeds, so a failed run can
# never replace a good backup. Pruning is the bucket lifecycle's job, so the
# server's AWS key needs only s3:PutObject.
#
# Database source (first match wins):
#   BACKUP_DB_CONTAINER   Postgres running in Docker; dumps via `docker exec`
#                         using BACKUP_DB_NAME and BACKUP_DB_USER.
#   BACKUP_DATABASE_URL   Any reachable Postgres (falls back to DATABASE_URL);
#                         needs host pg_dump/pg_restore >= the server version.
#
# Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION,
#           BACKUP_S3_BUCKET (or AWS_S3_BUCKET_NAME).
# Optional: BACKUP_APP_NAME (default "db"), BACKUP_NOTIFY_URL (GET on success,
#           e.g. a healthchecks.io ping so missed backups raise an alert).
#
# Values come from the environment first, then from BACKUP_ENV_FILE (default:
# .env.local, else .env, in the app root two levels above this script). The
# file is parsed, never executed.
#
# Usage:
#   ./scripts/backup/db-backup-to-s3.sh
#
set -euo pipefail

CONFIG_KEYS=(
  AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION
  BACKUP_S3_BUCKET AWS_S3_BUCKET_NAME BACKUP_APP_NAME BACKUP_NOTIFY_URL
  BACKUP_DB_CONTAINER BACKUP_DB_NAME BACKUP_DB_USER
  BACKUP_DATABASE_URL DATABASE_URL
)

main() {
  local APP_DIR
  APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  local ENV_FILE="${BACKUP_ENV_FILE:-}"
  if [ -z "$ENV_FILE" ]; then
    if [ -f "${APP_DIR}/.env.local" ]; then ENV_FILE="${APP_DIR}/.env.local"; else ENV_FILE="${APP_DIR}/.env"; fi
  fi

  local key
  for key in "${CONFIG_KEYS[@]}"; do
    if [ -z "${!key:-}" ]; then
      printf -v "$key" '%s' "$(read_env_value "$ENV_FILE" "$key")"
    fi
  done

  local BUCKET="${BACKUP_S3_BUCKET:-${AWS_S3_BUCKET_NAME:-}}"
  local APP="${BACKUP_APP_NAME:-db}"
  [ -n "$BUCKET" ] || die "Set BACKUP_S3_BUCKET (or AWS_S3_BUCKET_NAME)."
  [[ "$APP" =~ ^[A-Za-z0-9._-]+$ ]] || die "BACKUP_APP_NAME may only contain letters, digits, . _ -"
  for key in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION; do
    [ -n "${!key:-}" ] || die "$key is not set (environment or ${ENV_FILE})."
  done
  export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION
  export AWS_DEFAULT_REGION="$AWS_REGION"

  local MODE DB_URL=""
  if [ -n "${BACKUP_DB_CONTAINER:-}" ]; then
    MODE="docker"
    [ -n "${BACKUP_DB_NAME:-}" ] || die "BACKUP_DB_NAME is required with BACKUP_DB_CONTAINER."
    [ -n "${BACKUP_DB_USER:-}" ] || die "BACKUP_DB_USER is required with BACKUP_DB_CONTAINER."
    command -v docker >/dev/null 2>&1 || die "docker is not on PATH."
  else
    MODE="url"
    DB_URL="$(libpq_url "${BACKUP_DATABASE_URL:-${DATABASE_URL:-}}")"
    [ -n "$DB_URL" ] || die "Set BACKUP_DB_CONTAINER, or BACKUP_DATABASE_URL / DATABASE_URL."
    local hint="BACKUP_DB_CONTAINER is not set (checked environment and ${ENV_FILE}), so URL mode needs host"
    command -v pg_dump >/dev/null 2>&1 || die "${hint} pg_dump. Set BACKUP_DB_CONTAINER for a Docker database, or install postgresql-client."
    command -v pg_restore >/dev/null 2>&1 || die "${hint} pg_restore. Set BACKUP_DB_CONTAINER for a Docker database, or install postgresql-client."
  fi
  command -v aws >/dev/null 2>&1 || die "aws CLI is not on PATH."

  # Weekly cron and a manual run must not race on the same app.
  if command -v flock >/dev/null 2>&1; then
    exec 9>"${TMPDIR:-/tmp}/db-backup-${APP}.lock"
    flock -n 9 || die "Another backup for ${APP} is already running."
  fi

  local STAMP
  STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
  local WEEKLY_KEY="weekly/${APP}_${STAMP}.dump"
  local LATEST_KEY="latest/${APP}.dump"

  umask 077
  WORK_DIR="$(mktemp -d)"
  trap 'rm -rf "$WORK_DIR"' EXIT
  local DUMP="${WORK_DIR}/${APP}.dump"

  if [ "$MODE" = "docker" ]; then
    log "Dumping ${BACKUP_DB_NAME} from container ${BACKUP_DB_CONTAINER}"
    docker exec "$BACKUP_DB_CONTAINER" pg_dump -U "$BACKUP_DB_USER" -d "$BACKUP_DB_NAME" -Fc >"$DUMP" \
      || die "pg_dump failed."
  else
    log "Dumping database from connection URL"
    pg_dump --dbname="$DB_URL" -Fc >"$DUMP" || die "pg_dump failed."
  fi
  [ -s "$DUMP" ] || die "pg_dump produced an empty file."

  # A truncated or corrupt custom-format dump fails to list its table of contents.
  if [ "$MODE" = "docker" ]; then
    docker exec -i "$BACKUP_DB_CONTAINER" pg_restore --list <"$DUMP" >/dev/null \
      || die "Dump failed the pg_restore --list check; not uploading."
  else
    pg_restore --list "$DUMP" >/dev/null \
      || die "Dump failed the pg_restore --list check; not uploading."
  fi

  local SIZE
  SIZE="$(wc -c <"$DUMP" | tr -d ' ')"

  log "Uploading s3://${BUCKET}/${WEEKLY_KEY} (${SIZE} bytes)"
  aws s3 cp "$DUMP" "s3://${BUCKET}/${WEEKLY_KEY}" --sse AES256 --only-show-errors \
    || die "Upload to ${WEEKLY_KEY} failed; ${LATEST_KEY} left unchanged."

  log "Updating s3://${BUCKET}/${LATEST_KEY}"
  aws s3 cp "$DUMP" "s3://${BUCKET}/${LATEST_KEY}" --sse AES256 --only-show-errors \
    || die "Upload to ${LATEST_KEY} failed (dated backup ${WEEKLY_KEY} is in place)."

  if [ -n "${BACKUP_NOTIFY_URL:-}" ]; then
    curl -fsS -m 10 --retry 3 -o /dev/null "$BACKUP_NOTIFY_URL" \
      || log "WARN: backup succeeded but BACKUP_NOTIFY_URL ping failed."
  fi

  log "Backup complete: ${WEEKLY_KEY}"
}

# Reads KEY=value from a dotenv file without executing it. Strips an optional
# `export ` prefix and one layer of surrounding quotes.
read_env_value() {
  local file="$1" name="$2" line value
  [ -f "$file" ] || return 0
  line="$(grep -E "^(export[[:space:]]+)?${name}=" "$file" | tail -n 1 || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"
  value="${value%$'\r'}"
  if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
    value="${BASH_REMATCH[1]}"
  fi
  printf '%s' "$value"
}

# ORM URLs carry query options libpq rejects (Prisma's connection_limit,
# pool_timeout, schema, pgbouncer). Keep only parameters pg_dump understands.
libpq_url() {
  local url="$1" base query kept="" param
  base="${url%%\?*}"
  if [ "$base" = "$url" ]; then printf '%s' "$url"; return; fi
  query="${url#*\?}"
  local -a params
  IFS='&' read -r -a params <<<"$query"
  for param in "${params[@]}"; do
    case "${param%%=*}" in
      sslmode|sslrootcert|sslcert|sslkey|channel_binding|connect_timeout|application_name|options|target_session_attrs|host|port)
        kept="${kept:+${kept}&}${param}" ;;
    esac
  done
  printf '%s' "${base}${kept:+?${kept}}"
}

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

main "$@"
