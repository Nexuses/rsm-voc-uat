#!/usr/bin/env bash
# Install to ~/bin/rsm-survey-followups-cron.sh on the VPS (see docs/VPS_HOSTING_HANDOVER.md).
set -euo pipefail
cd "${HOME}/rsm-voc-survey-eng"
set -a
if [[ -f .env.local ]]; then
  # shellcheck disable=SC1091
  source .env.local
elif [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env
else
  echo "No .env.local or .env in $(pwd)" >&2
  exit 1
fi
set +a
: "${CRON_SECRET:?CRON_SECRET missing in env file}"
if [[ "${SURVEY_FOLLOWUPS_CRON_ENABLED:-1}" != "1" ]]; then
  echo "{\"ok\":true,\"skipped\":true,\"reason\":\"SURVEY_FOLLOWUPS_CRON_ENABLED!=1\"}"
  exit 0
fi
curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:3000/api/cron/survey-followups"
echo
