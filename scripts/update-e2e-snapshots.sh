#!/usr/bin/env bash
# Regenerate Playwright screenshot baselines to match CI (linux/amd64).
# Prefer GitHub Actions: CI workflow_dispatch with update_snapshots=true,
# then download the e2e-snapshots artifact.
#
# Docker (use --platform linux/amd64 to match GHA runners):
#   ./scripts/update-e2e-snapshots.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.62.1-jammy}"

docker run --rm \
  --platform linux/amd64 \
  -v "$ROOT":/work \
  -w /work \
  -e CI=1 \
  -e NEXTAUTH_SECRET=playwright-e2e-nextauth-secret \
  -e NEXTAUTH_URL=http://127.0.0.1:3000 \
  -e DATABASE_URL='postgresql://rsm_voc:rsm_voc@127.0.0.1:5432/rsm_voc?schema=public' \
  -e ELEVENLABS_API_KEY=test-el-key \
  -e ELEVENLABS_AGENT_ID=agent_test \
  -e ELEVENLABS_WEBHOOK_SECRET=whsec_test \
  -e OPENAI_API_KEY=sk-test \
  "$IMAGE" \
  bash -lc 'npm ci && npx playwright install chromium && npm run test:e2e:update'
