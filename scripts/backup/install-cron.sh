#!/usr/bin/env bash
#
# One-time server setup for the S3 database backup (see docs/DB_BACKUPS.md).
# Runs one real backup first, and installs the cron line only if it succeeds.
# Safe to re-run: this app's existing backup line is replaced, never duplicated.
#
# Cron uses the server's timezone (check with `timedatectl`).
#
# Usage:
#   ./scripts/backup/install-cron.sh                       # test backup, then weekly Sunday 02:00
#   ./scripts/backup/install-cron.sh --schedule "0 2 * * *" # custom cron schedule
#   ./scripts/backup/install-cron.sh --skip-test           # install without the test backup
#   ./scripts/backup/install-cron.sh --remove              # remove this app's backup line
#
set -euo pipefail

main() {
  local SCRIPT_DIR APP_DIR
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
  local BACKUP_SCRIPT="${SCRIPT_DIR}/db-backup-to-s3.sh"

  local SCHEDULE="0 2 * * 0" SKIP_TEST=0 REMOVE=0 ALLOW_ROOT=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --schedule) SCHEDULE="${2:?--schedule needs a value}"; shift ;;
      --skip-test) SKIP_TEST=1 ;;
      --remove) REMOVE=1 ;;
      --allow-root) ALLOW_ROOT=1 ;;
      *) echo "Unknown option: $1" >&2; exit 2 ;;
    esac
    shift
  done

  if [ "$(id -u)" -eq 0 ] && [ "$ALLOW_ROOT" -eq 0 ]; then
    die "Run this as the app user (the one that owns the app and can run docker), not root. Pass --allow-root to override."
  fi
  command -v crontab >/dev/null 2>&1 || die "crontab is not installed."
  [ -x "$BACKUP_SCRIPT" ] || chmod +x "$BACKUP_SCRIPT"

  local MARKER="# db-backup-to-s3:${APP_DIR}"

  # Read the whole crontab before writing so other jobs are never lost.
  local OTHER_JOBS
  OTHER_JOBS="$(crontab -l 2>/dev/null | grep -vF "$MARKER" || true)"

  if [ "$REMOVE" -eq 1 ]; then
    write_crontab "$OTHER_JOBS"
    echo "Removed backup cron for ${APP_DIR}."
    exit 0
  fi

  [ "$(wc -w <<<"$SCHEDULE")" -eq 5 ] || die "--schedule must have 5 cron fields, got: ${SCHEDULE}"

  local LOG_DIR="${HOME}/logs"
  local LOG_FILE="${LOG_DIR}/db-backup-$(basename "$APP_DIR").log"
  mkdir -p "$LOG_DIR"

  if [ "$SKIP_TEST" -eq 0 ]; then
    echo "Running a test backup now..."
    "$BACKUP_SCRIPT" 2>&1 | tee -a "$LOG_FILE"
    echo
  fi

  local ENV_PREFIX=""
  if [ -n "${BACKUP_ENV_FILE:-}" ]; then
    ENV_PREFIX="BACKUP_ENV_FILE=$(quote "$BACKUP_ENV_FILE") "
  fi
  # Cron's default PATH is /usr/bin:/bin, which usually misses aws and docker.
  local LINE="${SCHEDULE} cd $(quote "$APP_DIR") && PATH=$(quote "$PATH") ${ENV_PREFIX}$(quote "$BACKUP_SCRIPT") >> $(quote "$LOG_FILE") 2>&1 ${MARKER}"
  [[ "$LINE" != *%* ]] || die "Paths must not contain '%' (cron treats it as a newline)."

  write_crontab "${OTHER_JOBS:+${OTHER_JOBS}
}${LINE}"

  echo "Installed cron (${SCHEDULE}):"
  crontab -l | grep -F "$MARKER"
  echo "Log: ${LOG_FILE}"
}

write_crontab() {
  if [ -n "$1" ]; then printf '%s\n' "$1" | crontab -; else crontab -r 2>/dev/null || true; fi
}

quote() {
  printf "'%s'" "${1//\'/\'\\\'\'}"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

main "$@"
