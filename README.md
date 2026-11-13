# RSM Voice of Clients Platform

Next.js backend and dashboards for the RSM Voice of Clients platform. The
ElevenLabs voice agent is external; this app receives its signed post-call
webhook, stores feedback in Postgres, generates AI insights and embeddings, and
serves:

- Public PII-free CSAT, CES, and NPS APIs and embeddable widgets.
- A public voice or typed survey at `/survey`.
- An email/password protected CX insights dashboard.
- A protected RAG chatbot with response-ID citations.

## Project Context

Before changing the project, read:

1. `PROJECT_BRIEF.md` for architecture, flows, APIs, database, credentials,
   security, setup, and deployment.
2. `MEMORY.md` for the current operational state and task history.
3. `AGENTS.md` for the mandatory rule that memory is read before every task and
   updated after every task.

Verify the memory system with:

```bash
npm run memory:check
```

## Requirements

- Node.js 20+
- A Postgres database with the `pgvector` extension
- OpenAI API access
- An ElevenLabs post-call webhook signing secret

## Environment

Copy the committed template and add real values only to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:

```text
DATABASE_URL
OPENAI_API_KEY
ELEVENLABS_WEBHOOK_SECRET
ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID
NEXTAUTH_SECRET
NEXTAUTH_URL
```

Generate `NEXTAUTH_SECRET` locally:

```bash
openssl rand -base64 32
```

For local development, set `NEXTAUTH_URL=http://localhost:3000`. In Vercel, set
it to the production origin, currently
`https://rsm-voc-platform.vercel.app`.

`ELEVENLABS_API_KEY` is used only on the server to create temporary signed
conversation URLs. `ELEVENLABS_AGENT_ID` identifies the existing Voice of
Client agent. Neither value is exposed to the browser.

## Setup

```bash
npm install
npx prisma migrate deploy
npm run dev
```

The local app is available at [http://localhost:3000](http://localhost:3000).
The public survey is available at
[http://localhost:3000/survey](http://localhost:3000/survey).

## Docker Postgres (recommended for local / VM)

Run only Postgres + pgvector in Docker. Run the Next.js app on the host with
Node.js. This avoids slow full-app image rebuilds on small VMs.

Start the database:

```bash
docker compose up -d
```

Point the app at Docker Postgres in `.env.local`:

```bash
cp .env.example .env.local
# or copy from .env.docker.example for Docker-oriented defaults
```

Set:

```text
DATABASE_URL="postgresql://rsm_voc:rsm_voc@localhost:5432/rsm_voc?schema=public"
```

Then run the app on the host:

```bash
npm install
npm run db:migrate
npm run dev
```

For a production-style host process:

```bash
npm run build
npm start
```

Postgres data persists in the named Docker volume `rsm_voc_postgres_data`.

Helpful commands:

```bash
docker compose ps
docker compose logs -f db
docker compose exec db psql -U rsm_voc -d rsm_voc -c "SELECT extname FROM pg_extension WHERE extname='vector';"
npm run db:migrate:status
docker compose down
```

An optional full-app `Dockerfile` remains in the repo for advanced use, but the
supported self-host path is Docker Postgres + host Node app.

## CX Credentials

The dashboard uses credentials stored in the `User` table. To create or update
a development CX user while seeding, set these temporary shell variables:

```bash
CX_SEED_EMAIL="cx@example.com" \
CX_SEED_PASSWORD="use-a-strong-password" \
npm run db:seed
```

Without those two variables, the seed creates only sample feedback. No
credentials are committed to the repository.

Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with
the seeded credentials.

## Sample Data

Seed four idempotent scenarios: happy, unhappy, neutral, and go-back.

```bash
npm run db:seed
```

The seed also creates insights, searchable embeddings, and refreshed public
aggregates.

## Webhook

Local endpoint:

```text
http://localhost:3000/api/webhooks/elevenlabs
```

Production endpoint:

```text
https://rsm-voc-platform.vercel.app/api/webhooks/elevenlabs
```

Post the provided signed sample fixture locally:

```bash
npm run webhook:sample
```

Set `BASE_URL` to target another deployment:

```bash
BASE_URL="https://rsm-voc-platform.vercel.app" npm run webhook:sample
```

The webhook verifies the signature before parsing and upserts by
`conversation_id`, so retries do not duplicate responses.

## Public Widget

The public metrics API is:

```text
GET /api/public/metrics
```

`GET /api/public/csat` remains available as a compatibility route. Both read
only `CsatSnapshot` and `ThemeRollup`. Embed one metric or all three:

```html
<div id="rsm-voc-metrics"></div>
<script
  src="https://rsm-voc-platform.vercel.app/widget.js"
  data-api="https://rsm-voc-platform.vercel.app/api/public/metrics"
  data-metric="all"
  data-target="rsm-voc-metrics"
></script>
```

`data-metric` accepts `csat`, `ces`, `nps`, or `all`.

## Verification

With the development server running:

```bash
npx tsc --noEmit
npm run lint
npm run build
node scripts/verify-webhook-ingest.mjs
node scripts/verify-insight-on-ingest.mjs
node scripts/verify-aggregates.mjs
node scripts/verify-public-csat.mjs
node scripts/verify-auth.mjs
node scripts/verify-dashboard.mjs
node scripts/verify-chat.mjs
node scripts/verify-seed.mjs
npm run verify:e2e
npm run verify:survey
```

`verify:e2e` uses disposable data and verifies the complete signed webhook,
insight, embedding, public aggregate, authenticated dashboard, and cited
chatbot flow.

`verify:survey` verifies typed submission idempotency, all three metric
records, generated insight and embedding data, authenticated CX visibility,
and the PII-free public metrics boundary.
