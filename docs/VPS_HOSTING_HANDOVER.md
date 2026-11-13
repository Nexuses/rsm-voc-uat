# RSM Voice of Clients Platform — VPS Hosting & Operations Handover

**Document version:** 2026-08-13  
**Audience:** Client IT / operations team taking over hosting and ongoing maintenance  
**Application:** RSM in Kuwait Voice of Clients (VoC) survey, analytics dashboard, and public metrics widgets

---

## 1. What this platform is

This is a **Next.js 16** web application that:


| Area                  | URL (examples)             | Who uses it                                                                      |
| --------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| Public survey         | `/survey`                  | Clients complete CSAT, CES, and NPS via **voice** (ElevenLabs) or **typed** form |
| Public metrics report | `/reports`                 | Anyone — PII-free aggregate statistics                                           |
| CX dashboard          | `/dashboard`               | RSM CX team (login required) — analytics, response ledger, PDF export, RAG chat  |
| Survey invitations    | `/dashboard/invite`        | CX team sends editable email invitations (requires SendGrid)                     |
| Public widget API     | `/api/public/metrics`      | Embeddable CSAT/CES/NPS widgets on external websites                             |
| Voice webhook         | `/api/webhooks/elevenlabs` | ElevenLabs post-call transcript delivery (server-to-server)                      |


**Important:** The conversational AI voice agent itself runs on **ElevenLabs**, not on your VPS. The VPS hosts the website, API, database connection, and business logic.

**Current production reference (Nexuses-managed):**

- App: `https://rsm-voc-platform.vercel.app`
- Database: Neon PostgreSQL (`RSM VOC`, `aws-us-east-1`)
- Repository: private GitHub `Nexuses/rsm-voc-platform`

When you move to a VPS, you will replace the Vercel URL with your own domain everywhere listed in Section 8.

---

## 2. Architecture overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  End users (browser)                                                     │
│    → HTTPS → Your VPS (reverse proxy → Node.js Next.js on port 3000)    │
└─────────────────────────────────────────────────────────────────────────┘
         │                              │
         │ voice session                │ survey submit, dashboard, widgets
         ▼                              ▼
┌──────────────────┐           ┌─────────────────────┐
│  ElevenLabs API  │           │  PostgreSQL +       │
│  (external SaaS) │           │  pgvector extension │
└──────────────────┘           └─────────────────────┘
         │ post-call webhook              ▲
         └──────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │  OpenAI API         │  GPT insights, embeddings, RAG chat, theme summaries
         │  (external SaaS)    │
         └─────────────────────┘

Optional:
  SendGrid → survey invitation, follow-up, thank-you, and team notification emails

External assets (not on VPS):
  RSM Prelo fonts — loaded from www.rsm.global
  RSM logo — loaded from res.cloudinary.com
```

You may either:

1. **Self-host everything on the VPS** — Next.js app + PostgreSQL (with pgvector) on the same or a separate server, **or**
2. **Hybrid** — Next.js on VPS, PostgreSQL on a managed provider (Neon, RDS, etc.) via `DATABASE_URL`.

Option 2 is often simpler for backups and pgvector support.

---

## 3. VPS server requirements

### Minimum recommended specs


| Resource | Minimum                     | Notes                                                   |
| -------- | --------------------------- | ------------------------------------------------------- |
| CPU      | 2 vCPU                      | Build step is CPU-heavy; runtime is moderate            |
| RAM      | 2 GB                        | 4 GB recommended if PostgreSQL runs on the same machine |
| **Swap** | **4 GB**                    | **Required, not optional — see below**                  |
| Storage  | 20 GB SSD                   | Application + logs; database grows with survey volume   |
| OS       | Ubuntu 22.04 LTS or similar | Any Linux with Node 20+ support                         |
| Network  | Public IPv4 + HTTPS         | Required for ElevenLabs webhooks and public survey      |


### Swap is mandatory

`npm run build` (Prisma generate + Next.js 16 + React 19 + Tailwind 4) peaks
well above 1 GB. On a box with no swap, the kernel resolves that pressure by
OOM-killing a process — and the process it picks is usually the **running
`next-server`**, not the build. The symptom is a site that dies during every
deploy while the build itself appears to succeed.

Create swap once, before the first deploy:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Confirm with `free -h` — the Swap row must be non-zero.


### Software to install on the VPS


| Software            | Version                  | Purpose                                |
| ------------------- | ------------------------ | -------------------------------------- |
| **Node.js**         | **20.x or later**        | Runtime (`README.md` requirement)      |
| **npm**             | Bundled with Node        | Package install and scripts            |
| **Git**             | Latest stable            | Deploy from repository                 |
| **Reverse proxy**   | Nginx, Caddy, or similar | TLS termination, proxy to Node         |
| **Process manager** | PM2, systemd, or Docker  | Keep `next start` running after reboot |
| **PostgreSQL**      | 15+ (if self-hosted)     | Must support **pgvector** extension    |
| **Certbot / ACME**  | If using Nginx           | Free TLS certificates (Let's Encrypt)  |


The repository ships `docker-compose.yml` (Postgres + pgvector, the recommended
self-host database path), an optional full-app `Dockerfile`, a PM2 process
definition in `ecosystem.config.js`, and a deploy script at
`scripts/deploy.sh`. The supported VPS path is Dockerized Postgres plus a
host-run Next.js process managed by PM2.

---

## 4. External services and accounts (client-owned)

These are **not included** in VPS hosting. The client must maintain active accounts, billing, and API access for each.


| Service                        | Required?                  | What it powers                                                                                                | Client must obtain                                                                                              |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL + pgvector**      | **Yes**                    | All survey data, insights, embeddings, public aggregates, auth users, rate limits                             | Connection string (`DATABASE_URL`). Neon, Supabase, RDS, or self-hosted Postgres with `CREATE EXTENSION vector` |
| **OpenAI**                     | **Yes**                    | Per-response GPT insights (`gpt-4o`), embeddings (`text-embedding-3-small`), RAG chat, public theme summaries | API key with chat + embeddings access; monitor usage/cost                                                       |
| **ElevenLabs**                 | **Yes** (for voice survey) | Conversational AI agent, signed browser sessions, post-call webhooks                                          | API key, agent ID, webhook HMAC secret; agent configuration in ElevenLabs console                               |
| **SendGrid**                   | Optional                   | `/dashboard/invite` email invitations, follow-ups, thank-you, and team notifications                          | Verified sender identity, API key                                                                               |
| **DNS registrar**              | **Yes**                    | Point your domain to the VPS                                                                                  | A/AAAA records for app hostname                                                                                 |
| **TLS certificate**            | **Yes**                    | HTTPS for survey, webhooks, auth cookies                                                                      | Let's Encrypt or commercial cert via reverse proxy                                                              |
| **GitHub** (or other Git host) | Recommended                | Source code access and updates                                                                                | Read/deploy access to `Nexuses/rsm-voc-platform` or a fork                                                      |


### External assets (no account needed, but network access required)

The app loads these from the public internet at runtime:

- **Prelo fonts** — `https://www.rsm.global/kuwait/.../fonts/Prelo-*.woff2`
- **RSM logo** — `https://res.cloudinary.com/rsmglobal/...`

If corporate firewalls block these domains, typography and logos will not render correctly until those hosts are allowlisted.

### Data residency note

Survey responses, client names, and comments are stored in **your PostgreSQL database**. OpenAI and ElevenLabs process data according to **their** terms when insights, embeddings, voice, and chat run. Confirm this meets RSM compliance requirements before go-live.

---

## 5. Environment variables

Copy `.env.example` to `.env.local` (development) or set the same variables in your production environment (systemd, PM2 ecosystem file, `/etc/environment`, etc.).

**Never commit real values to Git.**


| Variable                    | Secret?          | Required    | Purpose                                               | How to obtain                                           |
| --------------------------- | ---------------- | ----------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`              | Yes              | Yes         | Prisma → PostgreSQL connection                        | Database provider or local Postgres                     |
| `OPENAI_API_KEY`            | Yes              | Yes         | Insights, embeddings, chat, theme AI                  | [OpenAI API keys](https://platform.openai.com/api-keys) |
| `ELEVENLABS_WEBHOOK_SECRET` | Yes              | Yes         | Verify post-call webhook HMAC                         | ElevenLabs → agent/webhook settings                     |
| `ELEVENLABS_API_KEY`        | Yes              | Yes         | Server-side signed voice session URLs                 | ElevenLabs API settings                                 |
| `ELEVENLABS_AGENT_ID`       | Treat as private | Yes         | Identifies the Voice of Clients agent                  | ElevenLabs agent settings                               |
| `NEXTAUTH_SECRET`           | Yes              | Yes         | JWT sessions + rate-limit client digests              | `openssl rand -base64 32`                               |
| `NEXTAUTH_URL`              | No               | Yes         | Canonical app URL for auth redirects and survey links | `https://your-domain.example` (no trailing slash)       |
| `FROM_EMAIL`                | No               | For invites | Sender address for invitation emails                  | Verified SendGrid sender identity                       |
| `SENDGRID_API_KEY`          | Yes              | For invites | SendGrid Mail Send API key                            | SendGrid API key settings                               |
| `SURVEY_INVITE_DEFAULT_TO`  | No               | Optional    | Prefilled recipient on invite page                    | CX operations choice                                    |
| `SURVEY_COMPLETION_NOTIFY_TO` | No             | Optional    | Internal recipients for completion notifications and scheduled CX reports | CX operations choice                                    |
| `SURVEY_STAFF_DIRECTORY`    | No (staff emails) | Optional   | JSON `{"Full Name":"email"}` fallback when the invite has no email for that partner or manager and `StaffContact` has none | RSM-provided staff list                                 |
| `CRON_SECRET`               | Yes              | For follow-ups and scheduled reports | Bearer token for `GET /api/cron/survey-followups` and `GET /api/cron/scheduled-reports/[cadence]`  | `openssl rand -base64 32`                               |
| `SURVEY_INVITE_API_KEY`     | Yes              | Optional    | Bearer for `POST /api/integrations/survey-invites`    | `openssl rand -base64 32`                               |


**Production checklist:**

- Set `NODE_ENV=production`
- Set `NEXTAUTH_URL` to the **exact** public HTTPS origin users visit
  (no trailing slash). Survey POSTs (`/api/survey/voice-session`, typed,
  track, invite-link) reject the browser if `Origin` does not match this
  URL, `SURVEY_PUBLIC_URL`, or the reverse-proxy Host / `X-Forwarded-*`
  origin. A mismatch shows as `cross-origin request rejected`.
- Ensure the reverse proxy forwards `Host`, `X-Real-IP` (overwritten with
  `$remote_addr`), `X-Forwarded-For`, and `X-Forwarded-Proto` (see Nginx
  example below). Rate limiting trusts `X-Real-IP`.
- Ensure all secret variables are present before `npm run build`

If SendGrid is not configured, the dashboard and survey still work; only `/dashboard/invite` email sending is disabled.

---

## 6. Database setup

### Requirements

- PostgreSQL with the `**vector`** extension (pgvector)
- Prisma manages schema via migrations in `prisma/migrations/`

### First-time setup

```bash
# On the VPS (or from a machine that can reach the database)
npm install
npx prisma migrate deploy    # Apply all migrations — do NOT use `prisma db push` in production
npx prisma generate          # Also runs during `npm run build`
```

### Applied migrations (as of 2026-06-23)

```text
20260611162551_init
20260611175704_add_credentials_auth
20260612090000_add_survey_rate_limit
20260613133000_add_three_metric_survey
20260622120000_add_complete_response_count
```

Verify status anytime:

```bash
npx prisma migrate status
```

### pgvector on self-hosted Postgres

Connect as a superuser and run once per database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Neon and most managed Postgres offerings enable this via dashboard or include it in the connection setup.

### Backups

The application stores:

- Private: client identity, survey answers, raw ElevenLabs payloads, AI insights, embeddings
- Public-safe: `CsatSnapshot`, `ThemeRollup` (used by widgets and `/reports`)

Weekly `pg_dump` backups go to the private S3 bucket `rsm-voc-db-backups` via
system cron. Setup, verification, and restore steps are in
[`docs/DB_BACKUPS.md`](DB_BACKUPS.md). In short, as `rsmuser`:

```bash
cd ~/rsm-voc-survey-eng && git pull
./scripts/backup/install-cron.sh
```

---

## 7. Deploying the application on a VPS

### 7.1 First-time setup

```bash
git clone <repository-url> ~/rsm-voc-survey-eng
cd ~/rsm-voc-survey-eng
npm ci                         # reproducible install from package-lock.json
cp .env.example .env.local     # then edit with production values
npx prisma migrate deploy
npm run build                  # runs prisma generate + next build
pm2 start ecosystem.config.js
pm2 save
pm2 startup                    # run the command it prints, once
```

Never run `npm ci`, `npm run build`, or `pm2` with `sudo`. Doing so leaves
root-owned files in `.next` and `node_modules` that the PM2 user can no longer
manage, which has previously broken this deployment. `scripts/deploy.sh` refuses
to run as root for this reason.

### 7.2 Routine deploys

```bash
cd ~/rsm-voc-survey-eng && ./scripts/deploy.sh
```

**CX PDFs (one-time per host, then after Python/Playwright upgrades):**
Overview Annual and CSAT/NPS/CES report PDFs all use `pdf-files/cx_report`
(metric builds pass `--type=`). Before first use (and whenever the report
venv is missing):

```bash
# Debian/Ubuntu: venv package required once (match `python3 --version`)
sudo apt update && sudo apt install -y python3.12-venv
# if python3 is 3.11, use python3.11-venv instead

cd ~/rsm-voc-survey-eng && ./scripts/setup-cx-report.sh
# If Chromium still fails to launch (shared libs / sandbox), install OS deps:
sudo ~/rsm-voc-survey-eng/pdf-files/cx_report/.venv/bin/playwright install-deps chromium
```

That creates `pdf-files/cx_report/.venv` with jinja2 + Playwright Chromium.
`build_report.py` launches Chromium headless with `--no-sandbox` for VPS hosts.
Optional overrides: `CX_REPORT_ROOT`, `CX_METRIC_REPORT_ROOT`, `CX_REPORT_PYTHON`.
Not required on Vercel serverless — only on the Node/PM2 host that serves the
dashboard.

That script is the supported deploy path. It:

1. **Refuses to deploy while a tracked survey is in progress.** A voice survey
   runs 20-30 minutes. The call itself is browser-to-ElevenLabs and does not
   touch this server, but the open tab holds assets from the current build, so
   swapping builds underneath it can cost the respondent their progress. Override
   with `--force` when you know nobody is mid-survey.
2. **Builds into `.next-build` while the live server keeps serving `.next`.**
   The old procedure rebuilt `.next` in place, which served broken chunks during
   the build and made the OOM killer target the live server.
3. **Swaps the finished build in with a rename and rolling-reloads PM2.** Two
   cluster workers restart one at a time, so the site never stops answering.
4. **Health-checks `/api/public/metrics` and rolls back** to the previous build
   automatically if the new one does not come up.

Useful flags: `--force` (ignore the active-survey check), `--skip-migrate`
(skip `prisma migrate deploy`).

The previous build stays in `.next-prev`. To roll back by hand:

```bash
cd ~/rsm-voc-survey-eng && rm -rf .next && mv .next-prev .next && pm2 reload ecosystem.config.js
```

### 7.2.1 Why the process manager settings matter

`ecosystem.config.js` is not interchangeable with `pm2 start npm -- start`. It
sets:

- `exec_mode: cluster` with 2 instances, so `pm2 reload` is a rolling restart
  with no downtime window, and one worker dying leaves the other serving.
- `kill_timeout: 60000`. The ElevenLabs post-call webhook runs OpenAI insight
  generation, embedding creation, email notification and aggregate recompute
  **inline**, so a single ingest request can run for a minute. This gives an
  in-flight ingest time to finish on reload instead of losing a completed
  survey.
- `max_memory_restart: 400M`, recycling a leaking worker before the kernel
  picks a victim.
- `time: true`, so log lines carry timestamps and restarts can be investigated
  afterwards.

Ingest is idempotent (`upsert` on `conversationId`), so if a webhook does fail
during a deploy, an ElevenLabs retry cannot create a duplicate response.

### 7.3 Reverse proxy (Nginx example)

The app expects to sit behind HTTPS. Configure forwarding headers so rate limiting sees real client IPs:

```nginx
server {
    listen 443 ssl http2;
    server_name voc.example.com;

    # ssl_certificate / ssl_certificate_key — your cert paths

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Webhook endpoint** must be reachable at:

```text
https://<your-domain>/api/webhooks/elevenlabs
```

ElevenLabs sends `POST` with an `elevenlabs-signature` HMAC header. No browser or session auth is used.

### 7.4 Firewall

Allow inbound:

- **443/tcp** (HTTPS) — public users, ElevenLabs webhooks, widget consumers
- **22/tcp** — SSH (restrict to admin IPs if possible)

Do **not** expose PostgreSQL port `5432` to the public internet.

---

## 8. Manual configuration after go-live

These steps require human action in external consoles or one-time server commands. They are **not** automated by `npm run build`.

### 8.1 DNS


| Record                         | Target        |
| ------------------------------ | ------------- |
| `A` or `AAAA` for app hostname | VPS public IP |


Wait for propagation, then issue TLS certificate for that hostname.

### 8.2 Update `NEXTAUTH_URL`

Set to your production origin, e.g. `https://voc.rsm.global`. Wrong values break login redirects and survey links in invitation emails.

### 8.3 ElevenLabs — post-call webhook URL

In the ElevenLabs workspace, configure (or recreate) an **HMAC-authenticated** post-call webhook pointing to:

```text
https://<your-domain>/api/webhooks/elevenlabs
```

Copy the webhook **signing secret** into `ELEVENLABS_WEBHOOK_SECRET`.

The repository script `scripts/configure-elevenlabs-agent.mts` currently references the Vercel production URL. After changing domains, either:

- Update the webhook URL in that script and run `npm run elevenlabs:configure -- --apply`, **or**
- Manually attach the new webhook to the agent in the ElevenLabs console

Dry-run first:

```bash
npm run elevenlabs:configure
```

### 8.4 ElevenLabs — origin allowlist (voice survey)

Voice sessions are blocked unless the browser **Origin** hostname is allowlisted on the agent.

Current code allowlist (`lib/elevenlabs/agent-config.ts`):

- `rsm-voc-platform.vercel.app`
- `rsm-voc-survey.nexuses.xyz`
- `localhost`

**You must add your production hostname** before voice survey works on a new VPS domain (if it is not already in that list):

1. Edit `lib/elevenlabs/agent-config.ts` → `platformSettings.auth.allowlist`
2. Rebuild and redeploy
3. Ensure an enabled HMAC workspace webhook exists for
   `https://<your-host>/api/webhooks/elevenlabs` (create it in the ElevenLabs
   console if missing; set `ELEVENLABS_WEBHOOK_SECRET` from that webhook)
4. Set `NEXTAUTH_URL` (or `ELEVENLABS_WEBHOOK_URL`) to the public origin, then
   run `npm run elevenlabs:configure -- --apply`

Alternatively, add the hostname manually in the ElevenLabs agent **Authentication → Allowlist** UI, and point the post-call webhook at your VPS URL.

Without these steps, visitors can open `/survey` but **voice mode will fail** when connecting to ElevenLabs.

### 8.5 ElevenLabs — agent data collection fields

The agent must collect these fields (configured via script or ElevenLabs UI):

```text
client_name, client_company, client_designation, language,
q1_rating, q1_reason, q2_rating, q2_reason, q3_rating, q3_reason
```

Run `npm run elevenlabs:configure` to validate. Do not change survey questions without RSM approval.

### 8.6 SendGrid — survey invitations (optional)

If CX users should send invitations from `/dashboard/invite`:

1. Verify `FROM_EMAIL` as a SendGrid sender identity (single sender or authenticated domain)
2. Create a SendGrid API key with Mail Send permission
3. Set `SENDGRID_API_KEY` and `FROM_EMAIL`
4. Optionally set `SURVEY_INVITE_DEFAULT_TO` for a prefilled recipient

Test by sending an invite from the dashboard and confirming delivery + correct survey link.

### 8.6.1 Survey follow-up cron (required if invites are used)

Tracked invites get automatic reminder emails every **3 days by default** (max
**5**; Settings → Reminders) while the survey is still incomplete. The VPS cron
script must `source` `.env` or `.env.local` (whichever exists). Optional kill
switch: `SURVEY_FOLLOWUPS_CRON_ENABLED=0` skips the curl. Cap per run via
`SurveyReminderConfig.maxAutoSendsPerRun` (default 200) to stagger backlog. The
app exposes that job as:

```text
GET /api/cron/survey-followups
Authorization: Bearer <CRON_SECRET>
```

On Vercel this was scheduled via `vercel.json` (`0 8 * * *`, 08:00 UTC). On the
self-hosted VM, **Vercel Cron must not be the production trigger** — schedule
the same HTTP call on the server with system cron (or another on-box scheduler).

**Why:** the Next.js process does not wake itself up. Without an external daily
call, day-3/6/9/12 reminder emails never send (manual send from
`/dashboard/invite-tracker` still works).

**Setup (as the app user, e.g. `rsmuser`):**

1. Ensure `.env` or `.env.local` has `CRON_SECRET` and working `SENDGRID_API_KEY` / `FROM_EMAIL`.
2. Reload the app so PM2 sees the secret: `pm2 reload ecosystem.config.js`.
3. Create a small wrapper that does not put the secret in crontab:

```bash
mkdir -p ~/bin
cat > ~/bin/rsm-survey-followups-cron.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "${HOME}/rsm-voc-survey-eng"   # adjust if the app directory differs
set -a
# shellcheck disable=SC1091
source .env.local
set +a
: "${CRON_SECRET:?CRON_SECRET missing in .env.local}"
curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:3000/api/cron/survey-followups"
echo
EOF
chmod 700 ~/bin/rsm-survey-followups-cron.sh
```

4. Smoke-test once (expect JSON with `ok: true`):

```bash
~/bin/rsm-survey-followups-cron.sh
```

5. Install the daily schedule (same wall-clock as the old Vercel cron — 08:00 UTC):

```bash
crontab -e
# add:
# Sun–Thu only (Kuwait weekend is Fri–Sat). 08:00 UTC = 11:00 Asia/Kuwait.
0 8 * * 0-4 /home/rsmuser/bin/rsm-survey-followups-cron.sh >> /home/rsmuser/logs/survey-followups-cron.log 2>&1
```

Create `~/logs` if needed. Prefer `127.0.0.1:3000` (Next is loopback-bound) over
the public hostname so the job does not depend on DNS/TLS.

6. If the Vercel project is still deployed, disable or remove its cron so it
   cannot hit a different database or send duplicate reminders. Repo
   `vercel.json` still documents the old schedule for that platform only.

### 8.6.2 Scheduled CX reports (optional)

Weekly, monthly, and quarterly internal reports email CSV + Excel of responses
in that window to `SURVEY_COMPLETION_NOTIFY_TO`. Same `CRON_SECRET` as
follow-ups.

```text
GET /api/cron/scheduled-reports/weekly
GET /api/cron/scheduled-reports/monthly
GET /api/cron/scheduled-reports/quarterly
Authorization: Bearer <CRON_SECRET>
```

On Vercel, `vercel.json` schedules Monday 08:00 UTC (weekly), the 1st at 08:00
UTC (monthly), and 1 Jan/Apr/Jul/Oct at 08:00 UTC (quarterly). On the
self-hosted VM, schedule the HTTP calls with system cron.

```bash
cat > ~/bin/rsm-scheduled-report-cron.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "${HOME}/rsm-voc-survey-eng"   # adjust if the app directory differs
set -a
# shellcheck disable=SC1091
source .env.local
set +a
: "${CRON_SECRET:?CRON_SECRET missing in .env.local}"
cadence="${1:?weekly|monthly|quarterly}"
curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:3000/api/cron/scheduled-reports/${cadence}"
echo
EOF
chmod 700 ~/bin/rsm-scheduled-report-cron.sh
```

```bash
crontab -e
# add (08:00 UTC):
0 8 * * 1 /home/rsmuser/bin/rsm-scheduled-report-cron.sh weekly >> /home/rsmuser/logs/scheduled-report-cron.log 2>&1
0 8 1 * * /home/rsmuser/bin/rsm-scheduled-report-cron.sh monthly >> /home/rsmuser/logs/scheduled-report-cron.log 2>&1
0 8 1 1,4,7,10 * /home/rsmuser/bin/rsm-scheduled-report-cron.sh quarterly >> /home/rsmuser/logs/scheduled-report-cron.log 2>&1
```

If the 1st of the month is a Monday, weekly and monthly (and in Jan/Apr/Jul/Oct,
quarterly) can all send that morning.

### 8.6.3 Background job tick

Platform events (for example `SURVEY_RESPONSE_SUBMITTED`) enqueue rows in the
`Job` table. `GET /api/cron/jobs` (same `CRON_SECRET` bearer header) drains due
jobs for up to ~45 seconds: scoring, needs-attention evaluation, and (when the
`cases.auto_create` flag is `live`) recovery-case creation. It sends no email.

```bash
cat > ~/bin/rsm-jobs-cron.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "${HOME}/rsm-voc-survey-eng"   # adjust if the app directory differs
set -a
# shellcheck disable=SC1091
source .env.local
set +a
: "${CRON_SECRET:?CRON_SECRET missing in .env.local}"
curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:3000/api/cron/jobs"
echo
EOF
chmod 700 ~/bin/rsm-jobs-cron.sh
```

```bash
crontab -e
# add (every minute):
* * * * * /home/rsmuser/bin/rsm-jobs-cron.sh >> /home/rsmuser/logs/jobs-cron.log 2>&1
```

Feature flags live in the `FeatureFlag` table; `FEATURE_FLAG_CASES_AUTO_CREATE`
(`off` | `shadow` | `live`) in `.env.local` overrides the row. Before going
live, run `npm run cases:backfill` (read-only dry run) and confirm the would-open
count matches historical needs-attention volume.

### 8.7 CX dashboard user accounts

**Create or reset a dashboard user only** (preferred on production — no sample
survey rows):

```bash
cd ~/rsm-voc-survey-eng   # or your app directory
CX_SEED_EMAIL="cx.admin@rsm-voc.app" \
CX_SEED_PASSWORD="<strong-password>" \
CX_SEED_ROLE="admin" \
npx tsx scripts/upsert-cx-user.mts
```

Requires `DATABASE_URL` loaded the same way the app uses it (e.g. `.env.local`
or exported in the shell). Password must be at least 12 characters. Then sign in
at `https://voc.rsm.com.kw/login`.

**Full seed** (also inserts sample survey scenarios — avoid on live data):

```bash
CX_SEED_EMAIL="cx@rsm.example.com" \
CX_SEED_PASSWORD="<strong-password>" \
npm run db:seed
```

Users are stored in the PostgreSQL `User` table with scrypt-hashed passwords. Roles: `cx` or `admin`.

There is **no self-service registration** in the app. Every new CX user requires a database insert with a hashed password (via `scripts/upsert-cx-user.mts`, seed, Prisma Studio, or a custom script using `lib/password.ts` → `hashPassword`).

### 8.8 Public widget embeds on other websites

If RSM Kuwait or partner sites embed metrics widgets, update embed code to your new domain:

```html
<div id="rsm-voc-metrics"></div>
<script
  src="https://<your-domain>/widget.js"
  data-api="https://<your-domain>/api/public/metrics"
  data-metric="all"
  data-target="rsm-voc-metrics"
></script>
```

`data-metric` accepts: `csat`, `ces`, `nps`, or `all`.

The public metrics API allows cross-origin `GET` (CORS `*`). Widget script must be served from your app origin.

### 8.9 Recompute public aggregates (if migrating existing data)

Public widgets and `/reports` read `CsatSnapshot` and `ThemeRollup`, not raw responses. After migration or schema updates, aggregates may need refresh. Ingest normally triggers recompute; for a manual backfill, use existing maintenance scripts or contact the development team for the supported procedure.

---

## 9. Application routes reference


| Route                            | Access                   | Notes                                |
| -------------------------------- | ------------------------ | ------------------------------------ |
| `/`                              | Public                   | Redirects to `/survey`               |
| `/survey`                        | Public                   | Voice + typed survey                 |
| `/reports`                       | Public                   | PII-free client experience report    |
| `/login`                         | Public                   | CX credentials login                 |
| `/dashboard/*`                   | Authenticated            | Redirects to login if anonymous      |
| `POST /api/webhooks/elevenlabs`  | HMAC only                | ElevenLabs post-call ingest          |
| `POST /api/survey/voice-session` | Same-origin + rate limit | Creates signed ElevenLabs URL        |
| `POST /api/survey/typed`         | Same-origin + rate limit | Typed survey ingest                  |
| `POST /api/survey/invite`        | CX session + SendGrid    | Sends invitation email               |
| `GET /api/public/metrics`        | Public, CORS             | Widget and report data               |
| `GET /api/insights`              | CX session               | Dashboard data (up to 500 responses) |
| `POST /api/chat`                 | CX session               | RAG assistant                        |


### Rate limits (automatic, database-backed)


| Action        | Limit       | Window                            |
| ------------- | ----------- | --------------------------------- |
| Voice session | 10 attempts | 10 minutes per client fingerprint |
| Typed submit  | 20 attempts | 10 minutes per client fingerprint |


Fingerprint is the client IP hashed with `NEXTAUTH_SECRET`. The IP comes from
`X-Real-IP` (nginx must set `proxy_set_header X-Real-IP $remote_addr;` so a
client cannot spoof it), falling back to the rightmost `X-Forwarded-For` hop.
Login, chat, invite-link, track, and dashboard-invite routes are also
rate-limited through the same `SurveyRateLimit` table.

---

## 10. Ongoing operations

### Deploying updates

```bash
cd /opt/rsm-voc-platform
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart rsm-voc    # or your process manager equivalent
```

Always run migrations **before** restarting the new build.

### Monitoring recommendations


| Check                               | Frequency                | How                               |
| ----------------------------------- | ------------------------ | --------------------------------- |
| App process running                 | Continuous               | PM2/systemd/Docker health         |
| HTTPS certificate expiry            | Monthly                  | Certbot or provider alerts        |
| Disk and memory                     | Weekly                   | VPS monitoring                    |
| PostgreSQL connectivity             | Continuous               | App logs; Neon/provider dashboard |
| OpenAI / ElevenLabs quota & billing | Monthly                  | Provider dashboards               |
| Webhook delivery failures           | After voice survey tests | ElevenLabs webhook logs           |
| Failed login / 5xx spikes           | Continuous               | Reverse proxy or app logs         |


### Log locations

Next.js logs to stdout/stderr. Configure your process manager to rotate and retain logs.

AI or aggregate failures during ingest are logged but do **not** fail webhook storage — survey data is saved even if OpenAI is temporarily down (insights may be missing until retried).

### Costs to plan for

- VPS hosting (compute, bandwidth, backups)
- PostgreSQL hosting (if managed)
- OpenAI usage scales with response volume (insights + embeddings per response, plus chat usage)
- ElevenLabs usage scales with voice survey minutes
- SendGrid (usually low volume for invitations)
- Domain registration and optional commercial TLS

---

## 11. Verification checklist (post go-live)

For the full tickable backend/API and end-to-end cutover checklist (Miro vs
current flow, every route, CRM lifecycle, invites, cron, domain cutover to
`voc.rsm.com.kw`), use **[`docs/GO_LIVE_CHECKLIST.md`](GO_LIVE_CHECKLIST.md)**.

Quick smoke from a machine that can reach production (replace `BASE_URL`):

```bash
export BASE_URL="https://<your-domain>"

# Quick HTTP checks
curl -I "$BASE_URL/survey"          # expect 200
curl -I "$BASE_URL/login"           # expect 200
curl -I "$BASE_URL/dashboard"       # expect redirect to login

# Public metrics boundary
curl -s "$BASE_URL/api/public/metrics" | head

# Full automated suites (requires env vars loaded locally or on server)
npm run verify:survey
npm run verify:e2e
npm test
npm run build
npx prisma migrate status
npm run memory:check
```

**Manual smoke tests (summary — prefer the full checklist above):**

1. Complete a **typed** survey on `/survey` → appears in dashboard within `/api/insights`
2. Complete a **voice** survey → webhook received → same dashboard visibility
3. Log in to `/dashboard` → overview metrics load
4. Ask a question in `/dashboard/insights` chat → cited answer returns
5. Load `/reports` → public metrics without PII
6. Embed widget on a test page → charts render from `/api/public/metrics`
7. Send test invite from `/dashboard/invite` (if SendGrid configured)

---

## 12. Security summary


| Topic                  | Implementation                                              |
| ---------------------- | ----------------------------------------------------------- |
| Public PII boundary    | `/api/public/`* reads only `CsatSnapshot` and `ThemeRollup` |
| Webhook auth           | HMAC signature verification on raw body                     |
| Dashboard auth         | NextAuth JWT, credentials in `User` table                   |
| Survey POST protection | Same-origin JSON + honeypot (typed) + rate limits           |
| Secrets                | Server-side only; never in browser or Git                   |
| Idempotent ingest      | Upsert by `conversationId` — webhook retries safe           |


Rotate `NEXTAUTH_SECRET`, API keys, and the SendGrid API key on a schedule or after staff changes. Rotating `NEXTAUTH_SECRET` invalidates existing CX sessions and changes rate-limit digests.

---

## 13. Handover items from development team

Confirm receipt of:

- [ ] Git repository access (or deployment artifact + migration history)
- [ ] Production `.env` variable **names** and storage location (values via secure channel only)
- [ ] ElevenLabs workspace access (agent, webhooks, API keys)
- [ ] OpenAI organization/project access
- [ ] PostgreSQL connection details and backup procedure
- [ ] SendGrid account access (if invitations used)
- [ ] DNS / domain control for production hostname
- [ ] List of existing CX user emails (passwords are not recoverable — reset via hash if needed)
- [ ] Any embed codes already placed on rsm.global or partner sites that need URL updates

---

## 14. Support contacts


| Area                             | Owner                                                 |
| -------------------------------- | ----------------------------------------------------- |
| Application source & defects     | Nexuses development team (via agreed support channel) |
| VPS infrastructure               | Client IT / hosting provider                          |
| ElevenLabs agent & voice quality | Client + ElevenLabs account admin                     |
| OpenAI billing & model access    | Client OpenAI account admin                           |
| RSM survey wording & compliance  | RSM in Kuwait stakeholders                            |


For technical architecture detail beyond hosting, see `PROJECT_BRIEF.md` and `README.md` in the repository root.

---

## Appendix A — npm scripts useful for operations


| Command                                   | Purpose                                           |
| ----------------------------------------- | ------------------------------------------------- |
| `npm run dev`                             | Local development server                          |
| `npm run build`                           | Production build                                  |
| `npm run start`                           | Production server (port 3000)                     |
| `npx prisma migrate deploy`               | Apply database migrations                         |
| `npm run db:seed`                         | Seed sample data / CX user (with env vars)        |
| `npm run elevenlabs:configure`            | Validate ElevenLabs agent config (dry run)        |
| `npm run elevenlabs:configure -- --apply` | Push agent config to ElevenLabs                   |
| `npm run elevenlabs:backfill`             | Backfill missed voice conversations (maintenance) |
| `npm run verify:survey`                   | End-to-end survey + PII boundary test             |
| `npm run verify:e2e`                      | Full platform integration test                    |
| `npm test`                                | Unit and integration test suite                   |


## Appendix B — Technology versions (from package.json)


| Package                   | Version      |
| ------------------------- | ------------ |
| next                      | 16.2.9       |
| react                     | 19.2.4       |
| prisma / @prisma/client   | ^6.19.3      |
| next-auth                 | ^4.24.14     |
| openai                    | ^6.42.0      |
| @elevenlabs/elevenlabs-js | ^2.52.0      |
| Node.js                   | 20+ required |


