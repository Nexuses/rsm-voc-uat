# Reference — The Two Dashboards

## 1. Public CSAT widget (no auth)

**Where:** embeddable `<script>` on any website (`public/widget.js`).
**Reads:** `GET /api/public/csat` → only `csat_snapshot` + `theme_rollup`.
**Shows:**
- Overall average satisfaction (x/5)
- Total response count
- Rating distribution (1–5 bars)
- AI theme summaries (PII-free)

**Never shows:** client names, companies, or raw verbatim reasons.

**PII rule (enforced in code):** the public API must not import or query `Response`,
`Client`, or `ResponseInsight`. If you need a new public number, add it to the
aggregator (`lib/aggregate.ts`) so it lands in a snapshot table first.

**Public verbatims:** default OFF. If RSM ever signs off, comments must pass (a) a GPT
PII-stripping pass and (b) a human approval queue before publishing. Do not auto-publish.

## 2. CX team dashboard (auth required)

**Where:** `/dashboard` page rendering `components/CxDashboard.tsx`, gated by NextAuth.
**Reads:** `GET /api/insights` (per-response AI) and `POST /api/chat` (RAG chatbot).
**Shows per response:**
- Client (name, company, tier) + ratings
- AI satisfaction summary (why they feel this way)
- Key drivers, risk signals
- Suggested reply (EN + AR) + next steps

**Corpus tools:**
- Filter by sentiment / risk
- Chatbot: "which key client gave negative feedback", "draft a reply to this client",
  "where can we improve" → answered over real feedback with citations to response IDs.

**Auth rule:** every `/api/*` route except `/api/public/*` and the webhook must call
`requireCxUser`. The webhook is protected by signature verification instead of a session.
