#!/usr/bin/env bash
#
# Zero-downtime deploy for the self-hosted (VPS) RSM VoC app.
#
# Why this exists: the previous procedure was `git pull && npm run build &&
# pm2 restart`, which rebuilt `.next` underneath the running server on a 1 vCPU
# / 1.8 GB box. That did two bad things — it served broken chunks to anyone
# mid-survey while the build ran, and the build's memory spike made the kernel
# OOM-kill the live server (265 PM2 restarts before this script existed).
#
# What this does instead:
#   1. refuses to deploy while a tracked survey is still in progress
#   2. builds into `.next-build` while the live server keeps serving `.next`
#   3. swaps the finished build in with a rename, then rolling-reloads PM2
#   4. health-checks, and rolls back to the previous build if anything fails
#
# Usage:
#   ./scripts/deploy.sh                # normal deploy
#   ./scripts/deploy.sh --force        # deploy even if a survey is in progress
#   ./scripts/deploy.sh --skip-migrate # skip `prisma migrate deploy`
#
set -euo pipefail

# Everything lives in main() so bash parses the whole file before running any of
# it. Without this, the `git pull` below could rewrite this script on disk while
# bash is still reading it and the rest of the run would execute garbage.
main() {
  local APP_NAME="rsm-voc"
  local APP_DIR
  APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  local BUILD_DIR=".next-build"
  local LIVE_DIR=".next"
  local PREV_DIR=".next-prev"
  local FAILED_DIR=".next-failed"
  local HEALTH_URL="http://127.0.0.1:3000/api/public/metrics"
  local HEALTH_ATTEMPTS=30

  local FORCE=0
  local SKIP_MIGRATE=0
  local arg
  for arg in "$@"; do
    case "$arg" in
      --force) FORCE=1 ;;
      --skip-migrate) SKIP_MIGRATE=1 ;;
      *) echo "Unknown option: $arg" >&2; exit 2 ;;
    esac
  done

  cd "$APP_DIR"

  # Building as root leaves root-owned files in .next and node_modules that the
  # PM2 user then cannot manage. This has bitten this deployment before.
  if [ "$(id -u)" -eq 0 ]; then
    die "Do not run this with sudo. Run it as the same user PM2 runs as."
  fi

  command -v pm2 >/dev/null 2>&1 || die "pm2 is not on PATH."

  # -------------------------------------------------------------------------
  # 1. Do not deploy on top of a live survey
  # -------------------------------------------------------------------------
  log "Checking for surveys in progress"
  local ACTIVE_STATUS=0
  node scripts/check-active-surveys.mjs || ACTIVE_STATUS=$?

  if [ "$ACTIVE_STATUS" -ne 0 ]; then
    if [ "$FORCE" -eq 1 ]; then
      warn "Survey check returned $ACTIVE_STATUS — continuing because --force was given."
    elif [ "$ACTIVE_STATUS" -eq 10 ]; then
      die "A survey is still in progress. Wait for it to finish, or re-run with --force."
    else
      die "Could not verify whether a survey is in progress. Fix the database connection, or re-run with --force."
    fi
  fi

  # -------------------------------------------------------------------------
  # 2. Source and dependencies
  # -------------------------------------------------------------------------
  # `next build` rewrites tsconfig.json to register its generated types, so a
  # side-directory build leaves `.next-build/types` entries behind. Restore it
  # before pulling, otherwise --ff-only refuses to run on the dirty tree.
  restore_tsconfig

  local OLD_SHA
  OLD_SHA="$(git rev-parse HEAD)"

  log "Pulling latest code"
  git pull --ff-only

  local DEPLOY_ID
  DEPLOY_ID="$(git rev-parse --short HEAD)"
  log "Deploying commit $DEPLOY_ID"

  # `npm ci` deletes node_modules and reinstalls it. Doing that under a running
  # server risks a lazy require() resolving into a directory that no longer
  # exists, so only reinstall when the dependency set actually changed.
  if git diff --quiet "$OLD_SHA" HEAD -- package.json package-lock.json; then
    log "Dependencies unchanged — skipping npm ci"
  else
    warn "Dependencies changed. npm ci replaces node_modules while the server is"
    warn "running; if the site errors during this step, the reload below clears it."
    log "Installing dependencies"
    npm ci
  fi

  if [ "$SKIP_MIGRATE" -eq 0 ]; then
    log "Applying database migrations"
    npm run db:migrate
  else
    warn "Skipping database migrations (--skip-migrate)."
  fi

  # -------------------------------------------------------------------------
  # 3. Build off to the side — the live server is untouched during this step
  # -------------------------------------------------------------------------
  log "Building into $BUILD_DIR (site keeps serving from $LIVE_DIR)"
  rm -rf "$BUILD_DIR"
  NEXT_DIST_DIR="$BUILD_DIR" NEXT_DEPLOYMENT_ID="$DEPLOY_ID" npm run build

  [ -f "$BUILD_DIR/BUILD_ID" ] || die "Build did not produce $BUILD_DIR/BUILD_ID."

  restore_tsconfig

  # Next bakes the build-time distDir into required-server-files.json. Since the
  # directory is about to be renamed to .next, that value has to be rewritten or
  # `next start` will look for the old path.
  log "Rewriting baked-in distDir"
  node -e '
    const fs = require("fs");
    const file = process.argv[1] + "/required-server-files.json";
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    json.config.distDir = process.argv[2];
    fs.writeFileSync(file, JSON.stringify(json));
    console.log("    distDir -> " + json.config.distDir);
  ' "$BUILD_DIR" "$LIVE_DIR"

  # -------------------------------------------------------------------------
  # 4. Swap and rolling reload
  # -------------------------------------------------------------------------
  log "Swapping the new build into place"
  rm -rf "$PREV_DIR"
  [ -d "$LIVE_DIR" ] && mv "$LIVE_DIR" "$PREV_DIR"
  mv "$BUILD_DIR" "$LIVE_DIR"

  # PM2 can only roll workers one at a time if the app is already in cluster
  # mode. An app started the old way (`pm2 start npm -- start`) is in fork mode,
  # so it needs one deliberate recreate to pick up ecosystem.config.js.
  local CURRENT_MODE
  CURRENT_MODE="$(pm2 jlist 2>/dev/null | node -e '
    let s = "";
    process.stdin.on("data", d => s += d).on("end", () => {
      try {
        const app = JSON.parse(s).find(p => p.name === process.argv[1]);
        process.stdout.write(app ? (app.pm2_env.exec_mode || "unknown") : "none");
      } catch { process.stdout.write("none"); }
    });
  ' "$APP_NAME" || echo none)"

  if [ "$CURRENT_MODE" = "cluster_mode" ]; then
    log "Rolling reload (no downtime)"
    pm2 reload ecosystem.config.js --update-env || { rollback; die "pm2 reload failed."; }
  elif [ "$CURRENT_MODE" = "none" ]; then
    log "Starting under PM2 for the first time"
    pm2 start ecosystem.config.js --update-env || { rollback; die "pm2 start failed."; }
  else
    warn "App is running in $CURRENT_MODE, not cluster mode."
    warn "Recreating it once so future deploys can reload with no downtime."
    warn "This one deploy has a few seconds of downtime; later ones will not."
    pm2 delete "$APP_NAME" || true
    pm2 start ecosystem.config.js --update-env || { rollback; die "pm2 start failed."; }
  fi

  # -------------------------------------------------------------------------
  # 5. Verify, or roll back
  # -------------------------------------------------------------------------
  log "Health check"
  local HEALTHY=0
  local i CODE
  for i in $(seq 1 "$HEALTH_ATTEMPTS"); do
    CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" || true)"
    if [ "$CODE" = "200" ]; then
      HEALTHY=1
      echo "    healthy after ${i}s (HTTP $CODE)"
      break
    fi
    sleep 1
  done

  if [ "$HEALTHY" -ne 1 ]; then
    rollback
    die "App did not return 200 from $HEALTH_URL within ${HEALTH_ATTEMPTS}s."
  fi

  pm2 save >/dev/null 2>&1 || warn "pm2 save failed — the process list may not survive a reboot."

  log "Deployed $DEPLOY_ID successfully"
  pm2 list
  echo
  echo "Previous build kept in $PREV_DIR for a manual rollback."
}

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m    %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mDEPLOY FAILED: %s\033[0m\n' "$*" >&2; exit 1; }

# `next build` registers its generated types by editing tsconfig.json in place.
# With NEXT_DIST_DIR set that adds `.next-build/types` entries which are wrong
# for the committed config and would dirty the tree for the next --ff-only pull.
restore_tsconfig() {
  if ! git diff --quiet -- tsconfig.json 2>/dev/null; then
    git checkout -- tsconfig.json
    warn "Restored tsconfig.json (rewritten by next build)."
  fi
}

rollback() {
  warn "Rolling back to the previous build."
  rm -rf .next-failed
  [ -d .next ] && mv .next .next-failed
  if [ -d .next-prev ]; then
    mv .next-prev .next
    pm2 startOrReload ecosystem.config.js --update-env || true
    warn "Previous build restored. The failed build is in .next-failed."
  else
    warn "No previous build to restore."
  fi
}

main "$@"
