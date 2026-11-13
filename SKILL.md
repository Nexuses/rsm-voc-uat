---
name: rsm-voc-platform
description: >
  Build the RSM in Kuwait Voice of Client backend + two dashboards. The live voice
  survey is handled by an EXTERNAL ElevenLabs Conversational AI agent (already built
  separately). THIS app is the backend that receives the agent's post-call webhook,
  stores every conversation as JSONB in Postgres, generates GPT insights on ingest,
  and serves (1) an embeddable public CSAT widget and (2) an authenticated CX-team
  insights dashboard with an AI chatbot over the feedback corpus. Use when building,
  extending, or wiring any part of this platform in Next.js.
---

# RSM Voice of Client — Backend + Dashboards

## What you are building (read first)

A Next.js (App Router, TypeScript) application with three parts over one Postgres DB:

1. **Ingest** — a webhook endpoint that ElevenLabs calls when a survey call ends. It
   receives the transcript + structured data-collection JSON, validates it, and writes
   one row to Postgres. Everything is stored as JSONB.
2. **AI layer (OpenAI)** — on ingest, call GPT once to produce a stored insight per
   response (sentiment, drivers, risk signals, suggested reply EN+AR, next steps).
   Whisper is used ONLY as a fallback to re-transcribe the call audio if the supplied
   transcript is empty/poor — never in the live path.
3. **Two dashboards:**
   - **Public CSAT widget** — embeddable `<script>` on any website. Shows aggregate
     score, trend, response count, and AI theme summaries. **NEVER exposes client
     identity or raw verbatims.** Reads only pre-aggregated, PII-free tables.
   - **CX team dashboard** — auth-gated. Per-response AI insight, filterable corpus,
     and a chatbot (RAG over responses) the team can ask: "which major client gave
     negative feedback", "draft a reply to this 2-star client", "where can we improve".

```
ElevenLabs agent ──webhook──► /api/webhooks/elevenlabs ──► Postgres (JSONB)
                                        │
                                        └─► OpenAI GPT insight (stored) + embedding
                       ┌────────────────┴─────────────────┐
              /widget (public, no PII)          /dashboard (auth, CX team)
              GET /api/public/csat              per-response + /api/chat (RAG)
```

## Hard rules (do not violate)

1. **PII isolation.** The public widget and `GET /api/public/*` may read ONLY from
   `csat_snapshot` and `theme_rollup`. They must NEVER touch `response`, `client`,
   or `response_insight`. Enforce this at the query layer, not just the UI.
2. **Secrets server-side only.** `OPENAI_API_KEY`, `ELEVENLABS_WEBHOOK_SECRET`,
   `DATABASE_URL` live in env and are used only in route handlers. Never ship to client.
3. **Verify the webhook.** Validate ElevenLabs' HMAC signature on every webhook call
   before trusting the body. Reject unsigned/invalid requests with 401.
4. **Store raw + derived.** Persist the full webhook payload as JSONB (`raw_payload`)
   AND the parsed fields. Never discard the original.
5. **Idempotent ingest.** ElevenLabs may retry webhooks. Upsert on `conversation_id`
   so retries don't create duplicates.
6. **No raw verbatims in public.** Public comments default OFF. Only AI theme summaries
   (PII-stripped) are public. Do not add a code path that publishes raw reasons without
   an explicit, separately-gated moderation step.
7. **JSON everywhere for flexible data.** Ratings/reasons/insights are JSONB so the
   schema survives question-set changes without migrations.

## Build order (follow this sequence; verify each step)

```
1. Scaffold Next.js + TS + Tailwind + Prisma            → verify: app boots, prisma generates
2. Apply prisma/schema.prisma; migrate                  → verify: tables exist (psql \dt)
3. lib/db.ts (Prisma client singleton)                  → verify: a test query runs
4. /api/webhooks/elevenlabs (verify sig, upsert)        → verify: POST sample payload → row written
5. lib/insight.ts (GPT call, JSON mode)                 → verify: sample response → stored insight
6. Hook insight generation into the webhook (async)     → verify: ingest produces insight row
7. Aggregators: recompute csat_snapshot + theme_rollup  → verify: numbers match manual SQL
8. GET /api/public/csat (PII-free)                      → verify: response contains NO names/reasons
9. /widget embeddable script + /public/widget.js        → verify: renders on a blank test page
10. NextAuth (email) gating /dashboard + /api (non-public)→ verify: anon blocked, member allowed
11. CX dashboard: per-response insight + corpus filters  → verify: list + detail render from DB
12. /api/chat RAG (embed → pgvector search → GPT cite)   → verify: question returns cited answer
13. Seed + sample webhook payloads for local testing     → verify: full flow end-to-end locally
```

## Files included in this skill (use as starting points)

- `starter/prisma/schema.prisma` — full data model (clients, responses, insights,
  embeddings, snapshots, theme rollups) with JSONB.
- `starter/lib/db.ts` — Prisma singleton.
- `starter/lib/insight.ts` — GPT insight generation (JSON mode) + embedding.
- `starter/lib/elevenlabs-verify.ts` — webhook HMAC verification.
- `starter/app/api/webhooks/elevenlabs/route.ts` — the ingest endpoint.
- `starter/app/api/insights/route.ts` — list/get insights (auth).
- `starter/app/api/chat/route.ts` — RAG chatbot endpoint (auth).
- `starter/app/api/public/csat/route.ts` — PII-free public metrics.
- `starter/public/widget.js` — embeddable public CSAT widget.
- `starter/components/CxDashboard.tsx` — CX team dashboard shell.
- `starter/.env.example` — all required env vars.
- `reference/WEBHOOK_PAYLOAD.md` — the shape ElevenLabs sends + the data-collection
  fields the agent is configured to extract (matches the v2 agent guide).
- `reference/DASHBOARDS.md` — what each dashboard shows and the PII rules.

## OpenAI usage notes

- **Insight generation:** one GPT call per completed response, on ingest, in JSON mode
  with a fixed schema (see `lib/insight.ts`). Deterministic schema → storable, no
  hallucinated structure.
- **Chatbot:** embed the question → pgvector similarity search over `response_embedding`
  → pass top-k responses+insights to GPT → answer WITH citations back to response IDs.
- **Whisper fallback only:** if `raw_payload.transcript` is empty, fetch the call audio
  via ElevenLabs' get-conversation-audio API and send to Whisper; otherwise skip.

## Open items the human must supply (don't invent)

- Real survey questions (the agent's question set). The PDF has none.
- Arabic-approved script (handled in the agent, not here).
- `ELEVENLABS_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `DATABASE_URL`.
- Data-residency decision (US OpenAI processing of client feedback) — flag, don't decide.
- Whether public verbatims are ever enabled (default OFF; needs moderation if ON).

## Tech stack

Next.js (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL + pgvector ·
NextAuth (CX dashboard only) · OpenAI SDK (GPT + embeddings + Whisper fallback).
