# Claude Code — Build Context: RSM Voice of Clients Platform

> Paste this whole file as your opening message to Claude Code (or save it as
> `BUILD_CONTEXT.md` at the repo root and tell Claude Code to read it first).
> The repo is currently EMPTY except for the skill files. You will initialise a fresh
> Next.js app and build the backend + two dashboards.

---

## 0. Read these first — do not skip, do not start coding yet

Before writing any code, read these files in this exact order and confirm you understand them:

1. `./SKILL.md` — the governing spec. Its **Hard rules** and **Build order** are binding.
2. `./reference/WEBHOOK_PAYLOAD.md` — the shape ElevenLabs sends and the data-collection fields.
3. `./reference/DASHBOARDS.md` — what each dashboard shows and the PII rules.
4. The starter files under `./starter/` — these are **reference implementations**, not yet wired into an app:
   - `starter/prisma/schema.prisma`
   - `starter/lib/db.ts`, `starter/lib/insight.ts`, `starter/lib/elevenlabs-verify.ts`, `starter/lib/aggregate.ts`
   - `starter/app/api/webhooks/elevenlabs/route.ts`
   - `starter/app/api/public/csat/route.ts`
   - `starter/app/api/insights/route.ts`
   - `starter/app/api/chat/route.ts`
   - `starter/public/widget.js`
   - `starter/components/CxDashboard.tsx`
   - `starter/.env.example`

**After reading, before coding: produce a short written plan** (the build order from SKILL.md, adapted to what you found) and list any contradictions you spotted between the starter files and the reference docs. Wait for my confirmation on the plan before scaffolding. This step is important.

---

## 1. What this app is (one paragraph)

The live voice survey is handled by an EXTERNAL ElevenLabs agent that already exists — **you are NOT building the voice agent.** You are building the backend it calls: a Next.js (App Router, TypeScript) app that receives ElevenLabs' post-call webhook, stores each conversation as JSONB in Postgres, generates a GPT insight per response on ingest, and serves two dashboards — a public embeddable CSAT widget (no PII) and an auth-gated CX team insights dashboard with a RAG chatbot over the feedback. OpenAI powers insights, embeddings, and a Whisper fallback (transcription only, never live).

---

## 2. The non-negotiable rules (from SKILL.md — repeat back to me before building)

1. **PII isolation.** The public widget and every `GET /api/public/*` route may read ONLY
   `csat_snapshot` and `theme_rollup`. They must NEVER query `Response`, `Client`, or
   `ResponseInsight`. Enforce in the query layer, not just the UI. This is the most
   important rule. This step is important.
2. **Secrets server-side only.** `OPENAI_API_KEY`, `ELEVENLABS_WEBHOOK_SECRET`,
   `DATABASE_URL` are used only in route handlers / server code. Never bundled to client.
3. **Verify the webhook signature** on every call before trusting the body; reject invalid with 401.
4. **Idempotent ingest.** Upsert on `conversation_id` — ElevenLabs retries webhooks.
5. **Store raw + parsed.** Persist the full webhook body as JSONB AND the parsed fields.
6. **No public verbatims.** Raw client comments never reach the public surface by default.

---

## 3. Step-by-step build order (verify each before moving on)

Follow SKILL.md's build order. Concretely:

```
STEP 1 · Scaffold
  - Initialise a fresh Next.js app (App Router, TypeScript, ESLint) IN PLACE at repo root.
    Use: npx create-next-app@latest . --typescript --app --eslint --tailwind --src-dir=false
  - Do NOT overwrite SKILL.md, /reference, or /starter.
  → verify: `npm run dev` boots a blank app.

STEP 2 · Dependencies
  - Add: prisma, @prisma/client, openai, next-auth, zod.
  - Dev: prisma.
  → verify: install succeeds, no peer-dep errors.

STEP 3 · Database
  - Copy starter/prisma/schema.prisma → prisma/schema.prisma.
  - In the target Postgres, run: CREATE EXTENSION IF NOT EXISTS vector;
  - npx prisma migrate dev --name init
  → verify: tables exist (Client, Response, ResponseInsight, ResponseEmbedding,
    CsatSnapshot, ThemeRollup, User). `npx prisma studio` opens.

STEP 4 · Lib layer
  - Copy starter/lib/* into lib/. Update import paths (@/lib/...).
  - Confirm tsconfig path alias "@/*" → "./*" (or "./src/*") matches where you placed files.
  → verify: `npx tsc --noEmit` passes for lib/.

STEP 5 · Webhook ingest
  - Copy starter/app/api/webhooks/elevenlabs/route.ts into app/api/webhooks/elevenlabs/.
  - Cross-check the parsing against reference/WEBHOOK_PAYLOAD.md. The field paths are a
    BEST-EFFORT GUESS — flag them, keep the structure, but expect to adjust once a real
    sample is available. Add a sample-payload fixture under __fixtures__/.
  → verify: POST the sample fixture (with a valid signature) → one Response row written;
    a second POST of the same conversation_id does NOT duplicate (idempotency).

STEP 6 · Insight on ingest
  - Wire lib/insight.ts into the webhook (already referenced). Generate insight + embedding
    after the upsert, inside try/catch so a GPT failure never fails the webhook.
  - The embedding write uses raw SQL (Prisma can't write vector) — keep that.
  → verify: ingesting the fixture produces a ResponseInsight row and a ResponseEmbedding row.

STEP 7 · Aggregates
  - Copy lib/aggregate.ts. Call recomputeAggregates() at the end of the webhook.
  - Implement the ThemeRollup TODO: a periodic GPT pass over ResponseInsight.keyDrivers →
    PII-FREE publicSummary. Until implemented, leave theme_rollup empty (do NOT leak raw text).
  → verify: after ingest, csat_snapshot numbers match a manual SQL AVG/COUNT.

STEP 8 · Public API + widget
  - Copy app/api/public/csat/route.ts and public/widget.js.
  - AUDIT: confirm the public route imports nothing from Response/Client/Insight.
  → verify: hit GET /api/public/csat — response contains NO names/companies/reasons.
    Drop widget.js onto a blank HTML page and confirm it renders.

STEP 9 · Auth (you must build this — it's a stub in the starter)
  - Implement lib/auth.ts `requireCxUser(req)` with NextAuth (email provider or simple
    credentials to start). Gate /dashboard and ALL /api/* EXCEPT /api/public/* and the webhook.
  - Webhook is protected by signature, not session — do NOT put it behind auth.
  → verify: anonymous request to /api/insights → 401; authenticated → 200.

STEP 10 · CX dashboard
  - Copy app/api/insights/route.ts, app/api/chat/route.ts, components/CxDashboard.tsx.
  - Create app/dashboard/page.tsx rendering <CxDashboard/> behind auth.
  → verify: dashboard lists insights from DB; filter by sentiment works.

STEP 11 · Chatbot (RAG)
  - Confirm /api/chat: embed question → pgvector search → GPT answer with [response: id] cites.
  → verify: ask "which client gave the lowest rating and why" → answer cites a real response.

STEP 12 · Seed + end-to-end
  - Add prisma/seed.ts with 3-4 sample responses (happy / unhappy / neutral / go-back).
  - Add a script to POST sample webhook fixtures locally.
  → verify: full flow — fixture POST → insight → snapshot → widget number moves → dashboard
    shows it → chatbot can answer about it.
```

---

## 4. What you must NOT do

- Do not build or simulate the ElevenLabs voice agent. It's external.
- Do not edit SKILL.md, /reference, or /starter (treat /starter as read-only source to copy from).
- Do not add features beyond the build order — no extra dashboards, exports, or analytics.
- Do not loosen the PII rule "to make the widget richer."
- Do not invent the survey questions or Arabic script — those come from RSM, not you.
- Do not commit secrets. Copy starter/.env.example → .env.local and leave real keys to me.

---

## 5. Things you should flag to me (don't silently resolve)

- Any mismatch between the webhook parser and reference/WEBHOOK_PAYLOAD.md once you
  inspect a real ElevenLabs sample.
- The `text-embedding-3-small` dimension (1536) must match the `vector(1536)` column. If
  you change the embedding model, change the column and migrate.
- The data-residency question (client feedback → US OpenAI). Note it; don't decide it.
- Whether I want NextAuth email magic-links vs simple credentials for v1.

---

## 6. Environment I need to provide (ask me for these)

- `DATABASE_URL` — Postgres with pgvector enabled.
- `OPENAI_API_KEY`.
- `ELEVENLABS_WEBHOOK_SECRET` (and `ELEVENLABS_API_KEY` if you implement the Whisper fallback).
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

If I haven't given these, scaffold against a local Postgres and stub the OpenAI calls
behind an env check so the app still boots, and tell me which keys are missing.

---

## 7. Definition of done

- `npm run dev` runs; `npx tsc --noEmit` clean; `npm run build` succeeds.
- Posting a sample webhook fixture creates Response + Insight + Embedding and updates the snapshot.
- `GET /api/public/csat` is provably PII-free.
- `/dashboard` is auth-gated, lists insights, filters, and the chatbot answers with citations.
- The widget renders on a plain HTML page.
- A short README documents setup, env vars, and how to run the seed + fixture scripts.

---

## 8. First message to send Claude Code

> "Read BUILD_CONTEXT.md, then SKILL.md, the two files in /reference, and everything in
> /starter. Don't write code yet. Give me: (1) your build plan following the SKILL.md
> build order, (2) any contradictions you found between the starter files and the
> reference docs, and (3) the list of env vars you need from me. Wait for my go-ahead."

---

## Adapting for Codex or Antigravity (if you don't use Claude Code)

The context above is tool-agnostic in substance; only the entry mechanics differ:
- **Codex:** paste Section 8's instruction plus a pointer to this file. Codex tends toward
  one-task completion, so drive it step-by-step through Section 3 rather than all at once.
- **Antigravity:** add this file to the workspace context and reference it in the task.
  Treat Sections 2 and 4 (rules / do-nots) as the agent's guardrails since it won't read
  SKILL.md as a privileged file the way Claude Code does — re-state the PII rule in the task.
