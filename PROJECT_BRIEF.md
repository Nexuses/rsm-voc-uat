# RSM Voice of Clients Platform

Last reviewed: 2026-11-08

## Purpose

This repository contains the RSM in Kuwait Voice of Clients platform:

- a public website survey with voice and typed paths;
- a Next.js backend that receives signed ElevenLabs post-call webhooks;
- PostgreSQL storage for raw and normalized survey responses;
- OpenAI-generated insights and vector embeddings;
- PII-free public CSAT, CES, and NPS APIs and embeddable widgets;
- an authenticated CX analytics dashboard and RAG assistant.

The live ElevenLabs Conversational AI agent is an external service. This
repository configures and connects to it but does not implement the agent
runtime.

## Source Of Truth

Read these files in this order before changing the platform:

1. `AGENTS.md` - mandatory operating and memory rules.
2. `PROJECT_BRIEF.md` - stable architecture and operations.
3. `MEMORY.md` - current operational state and task history.
4. `SKILL.md` - original product constraints.
5. `reference/WEBHOOK_PAYLOAD.md` and `reference/DASHBOARDS.md`.
6. Current implementation, migrations, tests, and deployment configuration.

When old documentation conflicts with the current implementation, verify the
behavior in code and tests, then update this brief and `MEMORY.md`.

## Binding Rules

1. Public UI and `/api/public/*` may query only `CsatSnapshot`,
   `ThemeRollup`, and `PublicReviewSnippet`. They must never query `Response`,
   `Client`, or `ResponseInsight`. `PublicReviewSnippet` may include respondent
   name and company for the showcase widget; never email, phone, or other
   contact details. Comment text must still be identity/contact-sanitized.
2. Verify `elevenlabs-signature` against the raw request body before parsing.
3. Upsert on `conversationId` so retries are idempotent.
4. Store the full raw payload in JSONB and store normalized fields separately.
5. Do not expose emails, phones, or other contact PII publicly. Metrics and
   theme APIs remain aggregate-only (no respondent identity).
6. Do not invent survey questions or Arabic content.
7. Keep all secrets server-side and outside Git.
8. Treat `SKILL.md`, `reference/`, and `starter/` as read-only.

## Production Services

| Service | Current use |
| --- | --- |
| GitHub | Production: `https://github.com/Nexuses/rsm-voc-platform`. UAT: `https://github.com/Nexuses/rsm-voc-uat` |
| Vercel | Project `rsm-voc-platform` |
| Production | `https://rsm-voc-platform.vercel.app` |
| Neon Postgres | Project `RSM VOC`, region `aws-us-east-1` |
| ElevenLabs | Existing English Voice of Clients agent and signed post-call webhook |
| OpenAI | GPT insight generation, embeddings, theme summaries, and RAG answers |
| SendGrid | Survey invitations, follow-ups, thank-you, team completion emails, and scheduled CX reports |

The production webhook endpoint is:

```text
https://rsm-voc-platform.vercel.app/api/webhooks/elevenlabs
```

Self-hosted (Azure VM) production currently uses:

```text
https://rsm-voc-survey.nexuses.xyz/api/webhooks/elevenlabs
```

ElevenLabs agent auth allowlist includes `rsm-voc-platform.vercel.app`,
`rsm-voc-survey.nexuses.xyz`, and `localhost`.
## Technology

- Next.js 16 App Router and TypeScript
- React 19
- Tailwind CSS 4 plus CSS modules
- Prisma 6
- PostgreSQL with pgvector
- NextAuth 4 credentials provider with JWT sessions and email OTP (MFA)
- ElevenLabs React and server SDKs
- OpenAI SDK
- Zod
- Vitest and Testing Library
- Playwright (Chromium) for `/survey` visual regression and browser interaction tests

## Application Structure

```text
app/
  api/
    auth/[...nextauth]/       NextAuth handlers
    auth/mfa/start            Password step → email OTP for MFA
    chat/                     Authenticated RAG assistant
    insights/                 Authenticated response/insight feed
    insights/leaderboard      Authenticated dept/partner/manager rankings
    reports/narrative         Authenticated AI CX report narrative (PDF)
    reports/period-cx         Authenticated custom-period 4-page CX PDF
    reports/annual-cx         Authenticated annual CX PDF (Playwright)
    reports/metric-cx         Authenticated CSAT/NPS/CES one-page PDFs
    reports/partner-cx        Authenticated 3-page partner-own-data PDF
    responses/[id]            Admin exclude/delete survey responses
    public/csat/              Backward-compatible public CSAT alias
    public/metrics/           Public PII-free CSAT, CES, and NPS API
    public/reviews/           Public PII-free recent review snippets API
    survey/typed/             Public typed survey ingest
    survey/voice-session/     Public signed ElevenLabs session creation
    webhooks/elevenlabs/      Signed ElevenLabs post-call ingest
    survey/invite-stats/      Authenticated invite outreach records
    cron/survey-followups/    CRON_SECRET automatic invite reminders
    cron/scheduled-reports/   CRON_SECRET weekly/monthly/quarterly CX report mail
    integrations/survey-invites  SURVEY_INVITE_API_KEY CRM/server invite trigger
    audit/                    Authenticated audit log feed
    settings/users|roles      Admin user and custom-role management
    settings/directory        Survey directory (departments, services, staff)
    cases/                    Recovery cases list/detail + status transitions
  results/[resultToken]/     Private per-invite score result page (non-public)
  testimonial/[token]/      Private testimonial review and consent page (non-public);
                            defaults to the respondent's survey language with an
                            EN/AR switcher (`TestimonialReviewExperience.tsx`,
                            copy in `testimonial-copy.ts`)
  dashboard/                  Authenticated CX dashboard
  dashboard/leaderboard       Dept/partner/BM/JM score rankings (`dashboard.overview`)
  dashboard/audit             Audit log UI
  dashboard/testimonials      Admin testimonial review (`testimonials.manage`)
  dashboard/escalations       Recovery-case Kanban (`cases.read` / `cases.manage`)
  dashboard/settings/         Account, directory, users, roles, and audit (permission-gated)
  login/                      Credentials + email OTP login
  widget/                     Public metrics widget page
  widget/reviews/             Public reviews widget page
  reports/                    Public PII-free client experience report
  survey/                     Public survey
components/
  survey/                     Survey state, voice UI, typed form, RSM styling
  PrivacyNotice.tsx           Shared privacy statement + official RSM policy link
  dashboard/                  Dashboard styling
  reports/                    Public VOC report widgets and styling
lib/
  aggregate.ts                Private-to-public aggregate generation
  auth.ts                     CX authentication
  elevenlabs/                 Agent configuration, API client, payload parser
  insight.ts                  GPT insight and embedding generation
  public-csat.ts              Public aggregate query layer
  public-reviews.ts           Public recent-review snippet query layer
  survey/                     Validation, security, constants, shared ingest
  testimonials/               Positive-survey testimonial ask, draft, consent, admin list
  authz/                      Per-user data scope (fail closed)
  events/ jobs/ flags.ts      Outbox, job queue, feature flags
  scoring/ surveys/           Versioned scoring and survey definitions
  cases/ automation/          Recovery cases/SLA, trigger engine, approvals
  messaging/ providers/       Templates, deliveries, vendor adapters
  health/ growth/ benchmarks/ Account health, revenue, coverage gaps, benchmarks
  ai/                         Provider seam, scoped tools, minimization, logging
  integrations/ training/     Managed keys + secret box, training rules
  platform/                   Feature-flag and dead-job admin
proxy.ts                      Next 16 page gate for /dashboard (session + permission)
scripts/worker.mts            Optional long-running job worker (RSM_ENABLE_WORKER)
prisma/
  schema.prisma               Database source of truth
  migrations/                 Applied schema history
  seed.ts                     Sample feedback and optional CX user
public/widget.js              Embeddable public metric widgets
public/widget-reviews.js      Embeddable public recent-reviews showcase
scripts/                      Configuration, backfill, fixtures, and verification
scripts/backup/               App-agnostic Postgres → S3 backup, cron installer, bucket setup
tests/                        Route, ingest, security, dashboard, and survey tests
tests/e2e/                    Playwright survey visual and interaction tests
.github/workflows/ci.yml      Vitest unit job plus Playwright visual job
```

## User Flows

### Voice Survey

1. Visitor opens `/survey` and chooses voice.
2. Visitor chooses voice or typed survey. English or Arabic is selected from the
   top-right language switcher (only the banner artwork stays English; the
   intro localizes).
3. After choosing voice, visitor picks **English** or **Arabic** host on step 2
   (`components/survey/ArabicVoiceChooser.tsx`; keys in
   `lib/survey/arabic-voice-options.ts`). Selecting Arabic sets UI language to
   `ar`; selecting English sets it to `en`.
4. Browser requests microphone permission.
5. `POST /api/survey/voice-session` validates allowed-origin JSON and rate limits.
   Body may include `language: "en" | "ar"` (defaults to `en`) and optional
   `inviteToken`. Client-supplied `agentId` / prompt / voice overrides are
   rejected.
6. Server always signs the single env agent `ELEVENLABS_AGENT_ID` with
   `ELEVENLABS_API_KEY` (language does not select a different agent). When an
   invite token is present, the response also includes safe `inviteContext`
   (`fullName`, `company`, `designation` only — never email or staff fields).
7. When the URL has `?invite=`, the browser also calls
   `POST /api/survey/invite-context` (same source as typed) and merges that with
   `inviteContext` from the voice-session response. It starts the session with
   string `dynamicVariables` (`has_invite_context` as `"true"`/`"false"`,
   `invite_full_name`, `invite_company`, `invite_designation`, `invite_opening`).
   Agent first messages include `{{invite_opening}}` (do **not** client-override
   `firstMessage` — that rejects/bounces signed-url sessions). Other overrides:
   `agent.language`, and for Arabic an allowlisted `tts.voiceId`. English keeps
   the agent default voice. Live agent placeholders/prompt are pushed with
   `npm run elevenlabs:configure -- --apply`.
8. The agent collects full name, company, designation, and one CSAT, CES, and
   NPS rating with an optional comment for each metric. After the final goodbye,
   the agent invokes the `end_call` built-in tool to terminate the session.
   `silenceEndCallTimeout` (45 seconds) ends idle calls if the tool is not used.
   The browser also calls `endSession()` on component unmount or tab close while
   a session is active.
9. ElevenLabs sends the signed post-call transcript webhook.
10. The webhook is verified, normalized, and passed to shared ingest.

### Typed Survey

1. Visitor chooses typed survey at `/survey`.
2. When the URL has `?invite=`, `POST /api/survey/invite-context` loads known
   `fullName`, `email`, `company`, and `designation` from `SurveyInvite` and
   pre-fills the identity step (fields stay fully editable). Missing fields
   stay blank and remain required.
3. The form collects full name, email, company, designation, and one CSAT, CES,
   and NPS rating with an optional comment for each metric.
4. `POST /api/survey/typed` validates allowed-origin JSON, schema, honeypot, and
   rate limit.
5. A UUID-backed `typed_<submissionId>` conversation ID makes retries
   idempotent.
6. The same shared ingest pipeline used by voice stores and enriches the data.

### Shared Ingest And AI

1. Upsert `Response` by `conversationId`.
2. Create or update the associated `Client`.
3. Store normalized answers and full raw payload as JSONB.
4. Generate one `ResponseInsight` with `gpt-4o` when missing.
5. Generate one 1536-dimension `text-embedding-3-small` embedding when missing.
6. Recompute monthly CSAT, CES, and NPS snapshots and PII-stripped theme
   rollups.
7. When a response is complete, send completion notifications via SendGrid:
   a branded thank-you to the invite recipient (when a tracked invite with email
   is linked) and an internal copy to `SURVEY_COMPLETION_NOTIFY_TO` for
   every completion (voice and typed, with or without invite). Idempotent via
   `SurveyInvite.thankYouSentAt` and `Response.teamNotifySentAt`.
8. AI or aggregate failures are logged and do not make a valid webhook retry
   unsafe.

### CX Dashboard

1. User signs in at `/login` with email and password, then a 6-digit email OTP
   (`POST /api/auth/mfa/start` → NextAuth credentials with `otp`).
2. `/dashboard` calls `requireCxUser`.
3. The dashboard fetches `/api/insights` and `/api/survey/invite-stats`.
4. Analytics and filters are derived from stored response data. Overview and
   CSAT/NPS/CES report pages support reporting period plus department and partner
   filters aligned with survey-invite metadata (`lib/survey-org-structure.ts`).
5. Dedicated CSAT, NPS, and CES report pages live at `/dashboard/reports/csat`,
   `/dashboard/reports/nps`, and `/dashboard/reports/ces`. Each page “PDF
   Download” posts the page filters to `POST /api/reports/metric-cx` with
   `metric=csat|nps|ces`, reusing the same live-scale `report_data.json`
   mapper and `resolvePeriodCxReportPlan` (exact `dateFrom`/`dateTo` when set,
   else the reporting-period preset), then runs
   `pdf-files/cx_report/build_report.py --type=<metric>` (one-page Playwright
   plates in the same unified tree).
5a. Overview CX PDFs (two buttons):
   - **PDF Download** → custom-period 4-page report
     (`POST /api/reports/period-cx` → `build_report.py --type=cx`). Uses the
     exact dashboard date range when `dateFrom`/`dateTo` are set; otherwise
     the reporting-period preset (90d / year / 12m). No YoY comparisons and
     no AI narrative; covers KPIs, calculation pages, and summary only.
   - **Annual PDF** → full annual deck: always calls
     `POST /api/reports/narrative` (`dashboard.reports`) first, then posts
     overview filters + that narrative to `POST /api/reports/annual-cx`
     (`dashboard.overview` or `dashboard.reports`). Maps live scores
     (CSAT 1–5, NPS 0–10, CES 1–7) and equal-length prior-period YoY into
     `report_data.json`, then runs `pdf-files/cx_report/build_report.py`
     (Jinja plate templates + Playwright/Chromium). AI narrative always
     fills `text_overrides` (download fails if narrative generation fails).
     Narratives persist in `AiReportNarrative`. Quotes from
     `GET /api/testimonials/quotes`.
   - **Partner PDF** (shown only when a single partner is in scope) →
     3-page partner-own-data report (`POST /api/reports/partner-cx` →
     `build_report.py --type=partner` / `partner_report.py`). The dashboard
     resolves the target partner from the `partner` filter when set, else
     (for a portfolio user whose scoped data naturally contains exactly one
     partner) auto-detects it; 422 if ambiguous or empty. Data comes from
     `buildPartnerCxReportDataJson` (`lib/annual-cx-report-payload.ts`):
     live CSAT/NPS/CES buckets for that partner + period, `followup` counts
     from responses carrying risk signals, and `value_themes` /
     `improve_themes` aggregated from `keyDrivers` / `riskSignals` text
     (no YoY, no AI narrative). Contact email via
     `lookupStaffContactEmail("partner", name)`.
   Host setup: `./scripts/setup-cx-report.sh` (venv under
   `pdf-files/cx_report/.venv`); optional `CX_REPORT_ROOT` /
   `CX_METRIC_REPORT_ROOT` / `CX_REPORT_PYTHON`. Annual, period (`--type=cx`),
   and metric PDFs share that tree. The old jsPDF dashboard export
   (`lib/dashboard-pdf.ts` / `lib/dashboard-pdf-classic.ts` /
   `DownloadReportButton`) was removed; it had no live importer. Legacy browser
   jsPDF annual (`lib/annual-cx-report-pdf.ts`) is unused by the overview
   buttons. Cron CX reports remain CSV/Excel only.
   Root `cx_report/` is a stale plate copy; do not use it for live downloads.
5b. Leaderboard at `/dashboard/leaderboard` (`dashboard.overview`): ranks
   invite-attributed responses by department, partner, business manager, or job
   manager for a chosen period via `GET /api/insights/leaderboard` (no 500-row
   cap). Default sort metric is CSAT average; CES and NPS toggles available.
   Minimum group size is 3. Shows top, firm average and lowest callouts.
6. `/dashboard/invite` lets CX users send branded HTML survey invitations by
   email, including CSV bulk import with `email`, `firstname`, `lastname`,
   `company`, and optional `designation` (aliases `position` / `title` /
   `jobtitle`) for personalized greetings and survey prefill, a downloadable
   sample CSV, and single-send optional customer name, company, and designation. Each recipient receives a unique
   tracked `/survey?invite=<token>` link. Single-send mode accepts department,
   service, partner, business manager, job manager, their emails, and team
   leader as free text. Suggestions come from the survey directory in Settings
   (`StaffContact`). Choosing a known partner or manager fills that person's
   email when the email field is still empty. A name typed on an invite is
   stored on that invite and added to the directory, so it is suggested next
   time. If that person has no email in the directory yet, the email on the
   invite is saved with them. Opens, survey starts, and completions are
   recorded on `SurveyInvite`. The invitation email (and its day-3/day-5
   reminders) shows a "This survey is about the following service:" block with
   the invite's Department and Service when set (`{{department_service}}` in
   `templates/email/voc-invite.html`, rendered by
   `buildDepartmentServiceBlock` in `lib/survey-invite-templates.ts`), so the
   client knows which service they are rating; the block is omitted when
   neither is set. `/dashboard/invite-tracker` lists sent invitations
   with status, next follow-up date, activity history, notes, and a manual
   follow-up action (admins with `responses.manage` can also delete an
   invitation), and exports the filtered table (including non-openers and
   non-responders) as CSV or Excel.    Incomplete invites receive automatic follow-up reminders every 3 days by
   default (max 5; admin Settings → Reminders for interval, max, CC, and daily
   send cap) via
   `GET /api/cron/survey-followups` (secured by `CRON_SECRET`). Manual reminder
   sends count toward the max. Stop/Re-enable is available per invite and per
   contact. On the self-hosted
   VPS this must be triggered by system cron calling the local app; do not rely on
   Vercel Cron for that host. When a tracked invite is completed, a branded
   thank-you email with the respondent's CSAT, CES, and NPS summary is sent once
   to the invite email address. When the overall result is Positive (combined
   score above 80% of 22; see below), that email also includes a highlighted testimonial
   ask and a private `/testimonial/[token]` link. The same eligible respondents
   also see a “Share a testimonial” / “Review your testimonial” button on the
   in-survey thank-you panel (next to “Submit another response”): typed submits
   return the offer in `POST /api/survey/typed`; voice polls
   `POST /api/survey/testimonial-offer` by `conversationId` until the webhook
   lands. Walk-in (no invite) Positive completions get the page button even
   when no thank-you email is sent. A comment produces an AI draft from those
   comments for the client to approve or edit. No comment asks for a written
   testimonial or a video link. The client chooses name use and website and/or
   social consent. The row stays private; publishing on
   `/dashboard/testimonials` does not write `PublicReviewSnippet` or post to
   social. The review page defaults to the language the respondent used on the
   survey (`Response.language`) and offers an EN/AR switcher; Arabic renders
   RTL, including the draft textarea and consent options. Completions that are
   not overall Positive keep the thank-you unchanged and hide the page button.
   Every complete survey also sends an internal
   notification with the same response summary to `SURVEY_COMPLETION_NOTIFY_TO`.
   The subject is `{Company} — {Contact name} — Result: Positive|Neutral|Negative`.
   The same word is in the body. Overall result and overall sentiment come
   from the combined score out of 22 — CSAT (max 5) + CES (max 7) + NPS
   (max 10) — via `combinedSurveyScore` / `overallSentimentFromScores` /
   `overallSurveyResult` in `lib/survey/metrics.ts`: below 60% is
   Negative/negative, 60–80% is Neutral/neutral, above 80% is
   Positive/positive (integer totals: ≤13, 14–17, ≥18; e.g. 18/22 = 82% →
   Positive). All three metrics must be present; partial responses keep the
   stored GPT sentiment as a display fallback. Dashboard/API/AI-context
   sentiment is derived from scores at read time, new stored
   `ResponseInsight.overallSentiment` values are overridden to the combined
   result at ingest, and `scripts/recalculate-overall-sentiment.mts`
   (dry-run by default, `--apply` to write) recalculates existing stored
   labels. Per-metric low-score flagging (`needsAttentionScores`: CSAT ≤2,
   CES ≤3, NPS ≤6) is unchanged. A Negative overall result also sends the
   action-required email. Partner, business manager, and job manager are CC'd
   from the invite email, then `StaffContact`, then `SURVEY_STAFF_DIRECTORY`.
   Team Leader is not CC'd. Respondent details render as `Label: value` in two
   equal-width columns: "Client information" (Company, Name, Designation, Email,
   Channel, Submitted date/time labelled "(Kuwait time)") and "RSM in Kuwait team"
   (Department, Engagement Partner, Business Manager, Job Manager, Project ID,
   Service). Language and Team Leader are not shown. All dates in the completion
   and thank-you emails use the `Asia/Kuwait` time zone.
   The layout is compacted so all three questions print on the first A4 page.
   `/dashboard/responses` supports the
   same period/department/partner filters as overview, can list by client group
   or by recency, groups repeats by email
   or name+company, and can export the filtered rows as CSV or Excel. Admins with
   `responses.manage` can soft-exclude or permanently delete a response (excluded
   rows leave KPIs and public aggregates). Internal
   CX report emails (CSV + Excel of the cadence window) go to
   `SURVEY_COMPLETION_NOTIFY_TO` via
   `GET /api/cron/scheduled-reports/{weekly|monthly|quarterly}` (`CRON_SECRET`).
   On the self-hosted VPS those jobs must be triggered by system cron; do not
   rely on Vercel Cron for that host. SendGrid sends retry up to three times on
   429, 5xx, or network errors.
7. `/api/chat` embeds the question, retrieves nearest response embeddings with
   pgvector, always includes invite-tracker outreach summary counts (sent /
   opened / completed / response rate) plus matched invite rows with linked
   CSAT/CES/NPS feedback when an email or client is named, and asks GPT to
   answer with `[source: <name>]` citations.

### Public Metrics

1. `lib/aggregate.ts` reads private response/insight data and writes sanitized
   `CsatSnapshot`, `ThemeRollup`, and `PublicReviewSnippet` rows.
2. `lib/public-csat.ts` reads only `CsatSnapshot` and `ThemeRollup`.
3. `lib/public-reviews.ts` reads only `PublicReviewSnippet`.
4. `GET /api/public/metrics` returns CSAT, CES, and NPS scores, valid counts,
   distributions, monthly trends, and sanitized theme summaries.
5. `GET /api/public/csat` returns the same response with legacy CSAT aliases.
6. `GET /api/public/reviews` returns recent comments (newest first, capped)
   with optional respondent name/company, CSAT/CES/NPS scores, and dates —
   never email or phone.
7. `public/widget.js` renders `data-metric="csat|ces|nps|all"` on an external
   website. Metric identity colors are CSAT `#3f9c35`, CES `#888b8d`, and NPS
   `#009cde`. Rating-scale good/neutral/bad colors stay independent of those
   identities; CSAT Satisfied and CES Easy use `#65b05d`. `/widget` is the
   shareable full-page host for the metrics widget.
8. `public/widget-reviews.js` renders the recent-reviews showcase embed.
   `/widget/reviews` is the shareable full-page host for that widget.
9. `/reports` renders a full-page public experience report with the same
   aggregate data, trend charts, distributions, and sanitized themes.

## API Inventory

| Route | Access | Purpose |
| --- | --- | --- |
| `GET/POST /api/auth/[...nextauth]` | Public auth handler | Credentials login and session |
| `POST /api/webhooks/elevenlabs` | HMAC signature | Voice post-call ingest |
| `POST /api/survey/voice-session` | Same-origin + rate limit | Create signed voice session; returns optional invite identity context |
| `POST /api/survey/invite-context` | Same-origin + rate limit | Safe invite identity for typed prefill (`fullName`, `email`, `company`, `designation`) |
| `GET /api/dashboard/voice-credits` | CX session | ElevenLabs subscription usage for dashboard credit warnings |
| `POST /api/survey/typed` | Same-origin + rate limit | Typed response ingest |
| `POST /api/survey/invite` | CX session | Send single or bulk tracked survey invitation emails |
| `POST /api/integrations/survey-invites` | `SURVEY_INVITE_API_KEY` bearer, or a managed `voc_…` key with scope `survey_invites.send` | Server-to-server survey invite send (single, `emails`, or `csv`); returns `surveyUrl` / `resultLinkUrl`; supports `externalEngagementId`, `triggerStage` (`mid`\|`post`), `idempotencyKey` |
| `GET /api/survey/invites` | CX session + `invite.tracker` | List sent survey invitations for the invite tracker |
| `POST /api/survey/invites/[id]/followup` | CX session + `invite.tracker` | Manually send a reminder (counts toward the max) |
| `POST /api/survey/invites/[id]/reminders/stop` | CX session + `invite.tracker` | Stop auto/manual reminders for one invite |
| `POST /api/survey/invites/[id]/reminders/reenable` | CX session + `invite.tracker` | Re-enable with a fresh reminder cycle |
| `POST /api/survey/reminders/contact/stop` | CX session + `invite.tracker` | Stop reminders for all incomplete invites to an email |
| `POST /api/survey/reminders/contact/reenable` | CX session + `invite.tracker` | Clear contact stop and reset cycles |
| `GET`/`PUT /api/settings/reminders` | `invite.tracker` / `users.manage` | Read/update reminder interval, max, CC, daily cap |
| `POST /api/survey/invites/[id]/notes` | CX session + `invite.tracker` | Add a follow-up note to an invitation timeline |
| `DELETE /api/survey/invites/[id]` | CX session + `responses.manage` | Admin hard-delete of an invitation and its timeline; a linked response is kept |
| `GET /api/audit` | CX session + `audit.read` | Audit log rows (logins, sends, role changes) |
| `GET/POST/PATCH/DELETE /api/settings/roles` | CX session + `roles.manage` | List/create/update/delete custom roles and permissions |
| `GET/POST/PATCH /api/settings/users` | CX session + `users.manage` | List/create users and assign roles |
| `GET/POST /api/settings/directory` | CX session + any settings gate | List and add survey directory entries |
| `PATCH/DELETE /api/settings/directory/[id]` | CX session + any settings gate | Rename, update the email, or remove a directory entry |
| `POST /api/settings/password` | CX session + any settings gate (`users.manage` \| `roles.manage` \| `audit.read`) | Change own dashboard password |
| `POST /api/survey/invite-link` | Same-origin + rate limit | Link invite token to live ElevenLabs conversation ID |
| `GET /api/cron/survey-followups` | `CRON_SECRET` bearer | Send due automatic reminders (config; default every 3d, max 5, staggered) |
| `GET /api/cron/scheduled-reports/[cadence]` | `CRON_SECRET` bearer | Email weekly, monthly, or quarterly CX CSV+Excel to `SURVEY_COMPLETION_NOTIFY_TO` |
| `GET /api/survey/invite-stats` | CX session | PII-free invite outreach records for dashboard stats |
| `POST /api/survey/track` | Same-origin + rate limit | Record invite open/start events from tracked survey links |
| Private `/results/[resultToken]` | Token knowledge | Per-invite CSAT/CES/NPS + comments (not `/api/public/*`) |
| `GET /testimonial/[token]` | Token knowledge | Private testimonial review; noindex; no email |
| `POST /api/testimonial/[token]` | Same-origin + rate limit | Client approves, edits, or declines a testimonial |
| `POST /api/survey/testimonial-offer` | Same-origin + rate limit | Thank-you panel poll: pending / ineligible / ready testimonial URL by `conversationId` (no respondent identity) |
| `GET /api/testimonials` | CX session + `testimonials.manage` | Admin testimonial list |
| `GET /api/testimonials/quotes` | CX session + `dashboard.overview` | Up to 6 published testimonial quotes for the Annual CX PDF (text + optional name/company when `consentName`; no email/phone) |
| `PATCH /api/testimonials/[id]` | CX session + `testimonials.manage` | Mark a consented submission published, or archive it |

Outbound CRM status webhooks (env `CRM_STATUS_WEBHOOK_URL` / `CRM_STATUS_WEBHOOK_SECRET`) post `completed` to RSM Power Automate only after a survey has CSAT, CES, and NPS. Invite send, open, and start are not posted. If the completion payload cannot be built, VOC logs and skips the call rather than posting `completed` without scores. Payloads echo `idempotencyKey` when set on the invite. Completion includes structured CSAT/CES/NPS scores plus collective `sentiment` from the same combined score out of 22 as completion emails (`Satisfied` / `Neutral` / `Dissatisfied` ↔ Positive / Neutral / Negative; no weighted `totalScore` / `surveyResults[]`) in `docs/API_SURVEY_COMPLETION_PAYLOAD.md`. See `docs/API_CRM_STATUS_WEBHOOK.md` and `docs/API_TRIGGER_SURVEY_EMAIL.md`.
| `GET /api/responses/[id]/transcript` | CX session + `dashboard.responses` | Scored questions plus voice turns for one response. No raw webhook, email, or phone. |
| `GET /api/public/metrics` | Public, CORS | PII-free CSAT, CES, and NPS data |
| `OPTIONS /api/public/metrics` | Public, CORS | Widget preflight |
| `GET /api/public/reviews` | Public, CORS | Recent review snippets with optional name/company attribution |
| `OPTIONS /api/public/reviews` | Public, CORS | Reviews widget preflight |
| `GET /api/public/csat` | Public, CORS | PII-free aggregate data |
| `OPTIONS /api/public/csat` | Public, CORS | Widget preflight |
| `GET /api/insights` | CX session | Up to 500 responses and insights |
| `GET /api/insights/leaderboard` | CX session + `dashboard.overview` or `dashboard.reports` | Period rankings by department / partner / business manager / job manager (no 500-row cap) |
| `POST /api/reports/narrative` | CX session + `dashboard.reports` | AI CX report narrative for selected period; persists `AiReportNarrative` |
| `POST /api/reports/annual-cx` | CX session + `dashboard.overview` or `dashboard.reports` | Server-side Annual CX PDF (`pdf-files/cx_report` Playwright); overview filters + YoY; optional narrative → `text_overrides` |
| `POST /api/reports/period-cx` | CX session + `dashboard.overview` or `dashboard.reports` | Server-side 4-page custom-period CX PDF (`build_report.py --type=cx`); exact `dateFrom`/`dateTo` or window preset; no YoY / no AI narrative |
| `POST /api/reports/metric-cx` | CX session + `dashboard.overview` or `dashboard.reports` | Server-side one-page CSAT/NPS/CES PDF (`pdf-files/cx_report` `--type=` via `single_reports.py` v3 plates); same period plan + org filters as period-cx |
| `POST /api/reports/partner-cx` | CX session + `dashboard.overview` or `dashboard.reports` | Server-side 3-page partner-own-data PDF (`build_report.py --type=partner` / `partner_report.py`); resolves one partner from the `partner` filter or the caller's own scoped data; 422 if ambiguous/empty |
| `POST /api/chat` | CX session, data-scoped | Cited RAG answer; scoped tool-calling path when `ai.ask_your_data_tools` is `live` |
| `GET /api/cron/jobs` | `CRON_SECRET` bearer | Drain due background jobs (~45 s) and enqueue recurring jobs |
| `GET /api/health` | `CRON_SECRET` bearer | Job-queue health for monitors |
| `POST /api/webhooks/sendgrid` | SendGrid ECDSA signature (`SENDGRID_WEBHOOK_PUBLIC_KEY`) | Delivery/bounce events → `MessageDelivery`; raw event stored minus recipient email |
| `GET /api/cases`, `GET /api/cases/[id]` | `cases.read` + scope | Recovery case list/detail (`view=board` for Escalations Kanban) |
| `PATCH /api/cases/[id]` | `cases.manage` + scope | Transition, assign, notes, client confirmation |
| `GET /api/accounts`, `GET /api/accounts/[id]` | `accounts.read` + scope | Accounts and account detail |
| `GET /api/accounts/[id]/health` | `accounts.read` + scope | Health snapshot history |
| `GET/POST /api/accounts/[id]/revenue` | `revenue.read` (+ `accounts.manage` to record) | Manual revenue snapshots |
| `GET/POST /api/accounts/[id]/summaries` | `accounts.read` + scope | AI account summaries (draft artifacts) |
| `GET /api/accounts/[id]/opportunities` | `accounts.read` + scope | Service-line coverage gaps + feedback signals |
| `PATCH /api/ai/artifacts/[id]` | `approvals.decide` | Approve/reject AI drafts |
| `GET /api/engagements` | `engagements.read` + scope | Engagement list |
| `GET/PUT /api/settings/user-scopes` | `users.manage` | Data-scope rows per user |
| `GET /api/surveys`, `POST /api/surveys/[id]/versions`, `GET/PATCH /api/surveys/versions/[versionId]` | `surveys.manage` (`surveys.publish` to publish/archive) | Versioned survey definitions |
| `GET/POST /api/automation/rules`, `PATCH /api/automation/rules/[id]`, `POST /api/automation/rules/dry-run` | `automation.manage` | Trigger rules, versions, activation, dry run |
| `GET /api/automation/approvals`, `PATCH /api/automation/approvals/[id]` | `approvals.decide` | Approval queue for outbound messages |
| `GET/POST /api/automation/templates`, `PATCH /api/automation/templates/versions/[id]` | `automation.manage` (`approvals.decide` to approve) | Message templates (en/ar) |
| `GET/POST /api/integrations/keys`, `DELETE /api/integrations/keys/[id]` | `integrations.manage` | Provider status and managed inbound API keys (plaintext shown once) |
| `GET/POST /api/training` | `training.manage` | Training courses, rules, assignments |
| `GET/POST /api/benchmarks` | `dashboard.reports` (`benchmarks.manage` to import) | Internal vs external benchmarks, never blended; internal hidden for scoped users |
| `GET/PUT /api/settings/feature-flags` | `platform.manage` | Feature flag modes (env overrides shown) |
| `GET/POST /api/settings/jobs` | `platform.manage` | Queue stats, dead jobs, replay |

### Integration survey invites (server-to-server)

Full API reference and Postman collection: `docs/API_TRIGGER_SURVEY_EMAIL.md`,
`docs/postman/RSM_VoC_Trigger_API.postman_collection.json`. Voice completion
webhook: `docs/API_SURVEY_SUCCESS_WEBHOOK.md`.

Third-party systems (client websites, CRM automations) send invites from their
backend only — never from browser JavaScript, which would expose the API key.

```bash
curl -X POST https://rsm-voc-platform.vercel.app/api/integrations/survey-invites \
  -H "Authorization: Bearer $SURVEY_INVITE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"client@example.com","firstName":"Ahmed","company":"Acme"}'
```

Payload matches the dashboard invite form: `to`, `emails`, or `csv` (mutually
exclusive with `to` when using CSV), optional metadata fields, and an optional
`subject` (defaults to the branded invite template subject). Rate limit: 100
recipients per 10-minute window across all integration calls.

## Approved Survey Contract

The website typed and voice surveys offer English or Arabic UI via a
top-right language switcher. Shared survey chrome (full-width white frame,
English banner, intro, privacy, footer) stays visible for choose / voice /
typed / complete. The intro paragraph is clamped to two lines at 681px and up
and to three lines at 680px and below (`-webkit-line-clamp`), so a phone does
not cut the sentence mid-word. The banner artwork has English text baked into the PNG, so
it stays English in Arabic mode (only its alt text localizes) until Arabic
art is supplied. Because route metadata renders before a language can be
known, the tab title and `<html lang>` are set client-side from the active
locale by `lib/survey/use-localized-document.ts` (`shell.documentTitle`,
`TestimonialCopy.documentTitle`); that hook must not touch `<html dir>`, the
shell containers already set their own `dir`. The privacy line is one shared component,
`components/PrivacyNotice.tsx`, rendered by `SurveyShell` and by `/login`;
it combines the confidentiality sentence with a centred link to the official
RSM Kuwait privacy notice (`https://www.rsm.global/kuwait/privacy-notice`,
exported as `RSM_PRIVACY_NOTICE_URL`). Copy lives in
`lib/survey/voice-locale.ts` (`shell.privacy`, `shell.privacyLinkLabel`) and is
written to hold a maximum of two lines at every breakpoint. The paragraph uses
`width: 100%; max-width: min(100%, 60rem)`, so it spans the page and renders
one line on desktop / two on tablet and mobile — do not shrink it back to a
`ch`-based column, that is what made it look cramped. Do not add a
second privacy statement on any public surface. UAT branch
`feature/survey-ui-overhaul-uat` (not production
until merged) adds a split-screen typed layout
(`SurveyStepLayout.tsx`): left pane is an RSM navy→blue gradient panel
(white logo + brand lockup, numbered step badge — `02`, matching the voice
pages' `01`/`02`/`03` squares, not the old "Step X of N" pill — and
per-step heading/body balanced in the panel; no step-card list, that was
tried and removed per feedback); right pane is the white question/input
panel. Step 1 shows a distinct heading in each pane (left: who we are
hearing from, right: "Your details" / "بياناتكم") so the identity copy is
never repeated. CSAT/CES/NPS use a static numbered scale
(`components/survey/MetricScaleRating.tsx`, from `nps-scale-static.html`):
a band strip of one face per sentiment band (labelled with its name and its
score range, spanning exactly the numbers it covers; the range is rendered in
its own `white-space: nowrap` span so Arabic "(9–10)" never breaks into
"(9–" / "10)") above one tile per score. Every
score is visible at once — the drag slider and its big face readout were
removed because clients found the interaction hard to understand. The
chosen tile fills with its band colour (grey / blue / green), the chosen
band stays lit while the others dim (the dim rule must exclude the active band
via `:not([data-active="true"])` — a separate restore rule loses the cascade to
it, and `tests/survey/rating-scale-css.test.ts` guards that), and the scale
mirrors in RTL so band
strips still sit over their numbers. Tiles are 44px tall on desktop and
shrink to ~25px wide at 360px, where the scale reclaims the step's side
padding to stay above the 24px tap minimum. Step 5 ("review your
answers") shows a respondent card plus one scored card per metric
(`SurveyReviewSummary.tsx`): metric identity top border, approved full
name + acronym, the CX PDF metric illustration from
`public/metrics/*.png`, the raw score, a band pill, and the comment.
Single responses never show aggregate %, targets, or "pts
below". The shell header banner is `Frame-1171276008.png` (wide 3.2:1)
from 681px up and `Frame-117127598111.png` (compact 16:10) at
`max-width: 680px`. Mode choose
tiles match `respond-section.html` (SVG voice wave; typed face preview
with smile-left/frown-right order and a fill bar anchored to the frown
side so it always connects to the active face — the face scale pins
`direction: ltr`, so it keeps smile-left in Arabic rather than mirroring
with the RTL page). In-panel voice call
layout (line-by-line captions, Orb, hold/end/typed controls) stays on
the same white chrome—no separate blue call stage. Chooser paths and
later stages share restrained motion (step fade-ups, slider/control
hover, caption enter).
Approved localized copy, including Arabic typed-survey questions, lives in
`lib/survey/voice-locale.ts`. The voice agent runtime and Arabic survey script
remain configured in ElevenLabs. The Arabic brand name is always "RSM الكويت"
(never "RSM في الكويت"), the NPS metric is "مؤشر صافي الترويج", and the NPS
low band is "غير المروّجين" — the client asked for that softer term instead of
"المنتقدون".

The approved identity fields are full name, company, and designation for voice,
plus a required email field on the typed survey. The approved questions are
defined in `lib/survey/constants.ts`:

```text
CSAT 1-5:
How satisfied are you with the overall quality of services provided by RSM in Kuwait?

CES 1-7:
To what extent do you agree: RSM in Kuwait made it easy for me to get the service and support I needed?

NPS 0-10:
On a scale from 0 to 10, how likely are you to recommend RSM in Kuwait to a colleague or business associate?
```

The voice agent data collection fields are:

```text
client_name
client_company
client_designation
language
q1_rating
q1_reason
q2_rating
q2_reason
q3_rating
q3_reason
```

CSAT favorable is ratings 4-5. CES favorable is ratings 5-7. NPS promoters
are 9-10, neutral 7-8, and detractors 0-6; NPS is promoter percentage minus
detractor percentage. Never average these incompatible scales.

Dashboard KPI tiles print each metric's definitional figure: CSAT as % favorable,
NPS as the net score (the ring sits at its position on the -100..+100 range,
never at promoter share), and CES as the 1-7 mean. The complementary statistic
(CSAT average, NPS promoter/detractor split, CES % favorable) belongs in the
card's meta line, not as the headline. Metric report pages follow the same rule:
the `OverallScoreCard` hero shows the score, and promoter share appears in the
caption.

Do not add or alter survey questions or language scripts without explicit RSM
approval.

## Webhook Contract

Expected event type:

```text
post_call_transcription
```

The parser accepts current ElevenLabs timestamps and data collection results,
supports wrapped `{ value: ... }` entries, and reads the configured `q1`,
`q2`, and `q3` fields independently. Partial voice responses are retained and
missing metrics are excluded from their own calculations. The original
reference payload was a best-effort guess; current behavior is defined by:

- `lib/elevenlabs/payload.ts`
- `tests/survey/elevenlabs-payload.test.ts`
- real payloads retained in `Response.rawPayload`

When ElevenLabs changes its payload, add an anonymized fixture and parser test
before changing production parsing.

## Database

Provider: Neon PostgreSQL, database `neondb`, schema `public`, with the
`vector` extension enabled.

### Models

| Model | Purpose |
| --- | --- |
| `Client` | Private respondent name, company, and designation |
| `Response` | Survey version, metric scores, normalized JSONB answers, full raw JSONB payload |
| `ResponseInsight` | One GPT insight per response |
| `ResponseEmbedding` | One `vector(1536)` RAG embedding per response |
| `CsatSnapshot` | PII-free monthly CSAT, CES, and NPS aggregate |
| `ThemeRollup` | PII-free public theme summaries |
| `PublicReviewSnippet` | Recent comments for the showcase widget (optional name/company; no email/phone) |
| `Testimonial` | Private client testimonial from a Positive thank-you (`survey_thankyou`; `partner_link` reserved) |
| `User` | CX credentials and role |
| `SurveyInvite` | Tracked per-recipient survey invitation with unique link token, optional client identity (`customerName` / first+last, `company`, `designation`), CRM correlation (`externalEngagementId`, `triggerStage`), idempotency key, and `resultToken` |
| `SurveyInviteEvent` | Invite send/open/follow-up/note/thank-you activity timeline |
| `CrmWebhookDelivery` | Outbound CRM status webhook delivery attempts |
| `AuditLog` | Platform audit events (logins, sends, role/user changes) |
| `Role` / `RolePermission` | Admin-managed custom roles and feature permission matrix |
| `SurveyRateLimit` | Hashed client rate-limit windows |
| `DomainEvent` / `Job` / `FeatureFlag` | Transactional outbox, DB-backed job queue, off/shadow/live flags |
| `ScoreDefinition` / `ScoreResult` / `AutomationExecution` | Versioned scoring and idempotent rule-execution records |
| `Case` / `CaseActivity` / `Task` / `SlaPolicy` / `Escalation` | Closed-loop recovery cases, SLA and escalation |
| `Organization` / `ServiceLine` / `Employee` / `Account` / `ContactRole` / `Engagement` / `EngagementMilestone` / `UserScope` | Org structure and per-user data scope |
| `Survey` / `SurveyVersion` / `SurveyQuestion` / `SurveyOption` / `ResponseAnswer` | Versioned survey definitions and per-question answers |
| `AutomationRule` / `AutomationRuleVersion` / `CommunicationPolicy` / `ApprovalRequest` / `MessageTemplate` / `MessageTemplateVersion` / `MessageDelivery` / `Notification` | Trigger engine, fatigue policy, approvals, templated messaging |
| `HealthModel` / `HealthSnapshot` / `RevenueSnapshot` | Account health and manual revenue |
| `AiInteraction` / `AiArtifact` | AI call metadata (no prompt bodies) and reviewable AI drafts |
| `Integration` / `IntegrationCredential` / `WebhookEvent` | Provider config, hashed inbound keys / encrypted secrets, inbound webhook log |
| `TrainingCourse` / `TrainingRule` / `TrainingAssignment` | Low-score → training rules and assignments |
| `Benchmark` | Internal and external benchmarks (stored together, shown apart) |

### Integrity

- `Response.conversationId` is unique.
- Insight and embedding each have a unique `responseId`.
- Child insight/embedding rows cascade when a response is deleted.
- `CsatSnapshot.period` is unique.
- `PublicReviewSnippet.sourceKey` is unique (internal hash; not returned by API).
- Survey rate limits are unique by digest, action, and window.
- Client digests are HMACs; raw IP addresses are not stored in the rate-limit
  table.

### Migrations

```text
20260611162551_init
20260611175704_add_credentials_auth
20260612090000_add_survey_rate_limit
20260613133000_add_three_metric_survey
20260623120000_add_survey_invite_tracking
20260624120000_add_survey_invite_followups
20260703120000_add_response_team_notify_sent
20260819120000_add_survey_invite_events
20260825120000_crm_integration_rbac
20260915120000_add_public_review_snippet
20260915140000_public_review_attribution
20260918120000_response_exclude_login_otp
20260928100000_security_hardening
20260928110000_platform_backbone
20260928120000_org_structure
20260928130000_surveys_automation_health
20260928140000_ai_integrations_training_benchmarks
20261007140000_invite_staff_and_service
20261008120000_survey_directory_seed
20261019170000_add_testimonial
20261019180000_add_survey_invite_designation
```

The five `20260928*` migrations are additive. `ai_integrations_training_benchmarks`
also creates the HNSW index `ResponseEmbedding_embedding_hnsw_idx` inside a
`DO` block only when pgvector ≥ 0.5; the index is not in `schema.prisma`, so
`prisma migrate dev` may report it as drift.

Use:

```bash
npx prisma migrate status
npx prisma migrate deploy
```

Do not use `prisma db push` against production.

## Environment And Credentials

Real values belong only in ignored `.env.local`, Vercel encrypted environment
variables, and the relevant provider console. Never write values into this
brief, `MEMORY.md`, issues, commits, screenshots, logs, or chat responses.

| Variable | Secret | Purpose | Obtain from |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma/Postgres connection | Neon project connection details |
| `OPENAI_API_KEY` | Yes | Insights, themes, embeddings, RAG | OpenAI API key settings |
| `ELEVENLABS_WEBHOOK_SECRET` | Yes | Verify post-call HMAC | ElevenLabs webhook configuration |
| `ELEVENLABS_WEBHOOK_URL` | No | Optional override for `elevenlabs:configure` webhook lookup; defaults to `NEXTAUTH_URL` + `/api/webhooks/elevenlabs` | Public app origin webhook path |
| `ELEVENLABS_API_KEY` | Yes | Signed session, agent config, backfill | ElevenLabs API key settings |
| `ELEVENLABS_AGENT_ID` | Treat as private config | Voice agent identifier (English + Arabic sessions) | ElevenLabs agent settings |
| `NEXTAUTH_SECRET` | Yes | JWT/session signing and client digest HMAC | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | No | Canonical auth origin | Local or deployed application URL |
| `SURVEY_PUBLIC_URL` | No | Public survey origin for invite email buttons; may differ from dashboard URL | Deployed survey site, e.g. `https://rsm-voc-survey-new.vercel.app` |
| `FROM_EMAIL` | No | Survey invitation sender address | Verified SendGrid **domain** identity on `rsm.com.kw` (see `docs/EMAIL_DELIVERABILITY.md`) |
| `SENDGRID_API_KEY` | Yes | Send survey invitations, follow-ups, thank-you, team notifications, and scheduled CX reports | SendGrid API key settings |
| `SURVEY_INVITE_DEFAULT_TO` | No | Optional default recipient on invite page | CX operations choice |
| `SURVEY_COMPLETION_NOTIFY_TO` | No | Internal recipient(s) for survey completion notifications and scheduled CX reports (comma-separated) | CX operations choice |
| `SURVEY_STAFF_DIRECTORY` | No (staff emails; keep out of Git) | Optional JSON `{"Full Name":"email"}` fallback when an invite has a partner or manager name but no email and `StaffContact` has none either | RSM-provided staff list |
| `CRON_SECRET` | Yes | Bearer token (header only; query strings rejected) for `/api/cron/*` and `/api/health` | `openssl rand -base64 32` |
| `SENDGRID_WEBHOOK_PUBLIC_KEY` | No (public key) | Verify SendGrid signed event webhook; route returns 503 when unset | SendGrid Mail Settings → Signed Event Webhook |
| `INTEGRATION_ENCRYPTION_KEY` | Yes | AES-256-GCM key (32 bytes, base64) for stored provider secrets | `openssl rand -base64 32` |
| `RESULT_LINK_TTL_DAYS` | No | Private result-link lifetime (default 365) | Operations choice |
| `RSM_ENABLE_WORKER` | No | `1` adds the `rsm-voc-worker` PM2 process; otherwise `/api/cron/jobs` drains the queue | Operations choice |
| `FEATURE_FLAG_<KEY>` | No | Per-flag override (`off`/`shadow`/`live`), e.g. `FEATURE_FLAG_CASES_AUTO_CREATE` | Operations choice |
| `SURVEY_INVITE_API_KEY` | Yes | Bearer token for `POST /api/integrations/survey-invites` | `openssl rand -base64 32` |
| `CRM_STATUS_WEBHOOK_URL` | Treat as private | Outbound VOC→CRM status webhook URL (Power Automate) | RSM CRM / Power Automate HTTP trigger |
| `CRM_STATUS_WEBHOOK_SECRET` | Yes | Bearer + HMAC secret for CRM status webhooks | `openssl rand -base64 32` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Yes | S3 upload for DB backups (server env file only; not used by the app) | AWS IAM (prefer an upload-only user from `create-bucket.sh --uploader-user`) |
| `AWS_REGION` | No | Backup bucket region | AWS |
| `BACKUP_S3_BUCKET` (or `AWS_S3_BUCKET_NAME`) | No | Backup bucket name | `create-bucket.sh` |
| `BACKUP_APP_NAME` / `BACKUP_DB_CONTAINER` / `BACKUP_DB_NAME` / `BACKUP_DB_USER` | No | Backup file prefix and Docker DB source (see `docs/DB_BACKUPS.md`) | Server setup |
| `BACKUP_DATABASE_URL` | Yes | Alternative DB source for backups when Postgres is not in Docker | Database provider |
| `BACKUP_NOTIFY_URL` | Treat as private | Optional success ping (e.g. healthchecks.io) to alert on missed backups | Monitoring service |
| `CX_REPORT_ROOT` | No | Optional override for Annual CX plate root (default `pdf-files/cx_report`) | Host path after `./scripts/setup-cx-report.sh` |
| `CX_METRIC_REPORT_ROOT` | No | Optional override for CSAT/NPS/CES plate root (default same as `CX_REPORT_ROOT` / `pdf-files/cx_report`) | Same setup script |
| `CX_REPORT_PYTHON` | No | Optional Python binary for Playwright build (default venv under report root; metric may reuse annual venv) | Same setup script |

CX passwords are never stored in environment documentation. They are hashed
with scrypt in the `User.passwordHash` column.

Annual CX PDF generation needs host Python 3.9+ with jinja2 and Playwright
Chromium (`./scripts/setup-cx-report.sh`). It is not suitable for Vercel
serverless; use the VPS/PM2 host (or any Node host with that Python env).

## Security Boundaries

- Webhook authentication is HMAC, not a CX session.
- Integration invite sends use `SURVEY_INVITE_API_KEY` or a managed scoped
  key as bearer auth; no CORS.
- CX routes use server-side session checks.
- Survey write routes are intentionally public but require JSON plus an allowed
  browser `Origin` (matches `request` origin, reverse-proxy Host /
  `X-Forwarded-*`, or configured `NEXTAUTH_URL` / `SURVEY_PUBLIC_URL`) and
  reject `sec-fetch-site: cross-site`. They use database-backed limits: 10 voice
  or 20 typed attempts per 10 minutes.
- The public aggregate route has permissive CORS but no private-table query path.
- Browser code receives temporary ElevenLabs signed URLs, never provider keys.
- Raw voice payloads, client identity, comments, and insights are private.
- Existing `legacy-v1` records contribute only to CSAT; CES and NPS remain
  null unless explicitly collected.
- Data scope (`lib/authz`): users with no `UserScope` rows are unrestricted
  (except system role `portfolio`, which is always staff-email scoped).
  Otherwise every scoped query fails closed (`responseScopeWhere`,
  `inviteScopeWhere`, `testimonialScopeWhere`, and the raw-SQL twin
  `responseScopeSql` for vector search). Staff-email scope matches the session
  email (case-insensitive) to `SurveyInvite.partnerEmail` /
  `businessManagerEmail` / `jobManagerEmail`. Custom roles with no permission
  rows grant nothing.
- AI context boundary: only scope-filtered rows reach a prompt; emails/phones
  are aliased (`lib/ai/minimize.ts`) and rehydrated only for users with
  `dashboard.responses`; retrieved feedback is wrapped as untrusted; citations
  must come from tool-returned IDs; `AiInteraction` stores metadata only.
  Invite-tracker context (org-wide counts) is withheld from scoped users.
- Outbound automation messages need an approval, an approved template, an
  active `CommunicationPolicy` (none configured ⇒ held), a passing fatigue
  check, and `messaging.send` = `live`. A delivery interrupted mid-send is
  marked for review, never resent.
- Managed inbound API keys are stored as SHA-256 hashes with a display prefix;
  provider secrets are AES-256-GCM encrypted. SendGrid events are verified
  before parsing and stored without the recipient email.

## Platform Expansion Architecture

Escalations (`/dashboard/escalations`) is live: Kanban + table over recovery
`Case` rows for needs-attention surveys (CSAT ≤ 2 / CES ≤ 3 / NPS ≤ 6), with
optimistic drag transitions. Clients, engagements, survey-builder, automation,
training, and integrations screens remain phase 2 and are not linked from the
dashboard. The live product also includes the survey, invite tracker, responses,
reports, insights, testimonials, and widget.

- Events: `emitEvent` writes `DomainEvent` + `Job` rows in one transaction
  (idempotency key per event); catalogue in `lib/events/catalog.ts`.
- Jobs: `lib/jobs/*`; handlers in `lib/jobs/handlers.ts`. `/api/cron/jobs`
  (VPS cron every minute) or the opt-in PM2 worker drains the queue.
  Recurring: SLA monitor every 15 min; account health, training rules and
  internal benchmarks daily. Dead jobs are replayable from
  `/dashboard/settings/platform`.
- Feature flags (`lib/flags.ts`; DB row, env override wins):
  `events.outbox` (live), `cases.auto_create` (live), `jobs.background_work`,
  `automation.rules`, `accounts.health`, `messaging.send`,
  `ai.ask_your_data_tools`, `training.rules` (remaining off by default). Automation
  rule versions and training rules also carry their own shadow/live mode; live
  requires both.
- Providers are behind interfaces in `lib/providers` (email = SendGrid,
  CRM = status webhook, LMS = manual, WhatsApp/SMS = unconfigured); AI is
  behind `lib/ai/provider.ts` (OpenAI adapter).
- The live survey still runs from `lib/survey/constants.ts`; published
  `SurveyVersion` rows are materialized but not yet served to respondents.
- SLA hours and the default health model weights/thresholds are placeholders
  pending RSM confirmation.

## Local Setup

```bash
npm install
cp .env.example .env.local
npx prisma migrate deploy
npm run dev
```

Docker Postgres + host app (recommended local / VM path):

```bash
docker compose up -d
cp .env.example .env.local
# Set DATABASE_URL host to localhost and the compose db credentials
npm install
npm run db:migrate
npm run dev
```

The `db` service uses `pgvector/pgvector:pg16`, persists data in
`rsm_voc_postgres_data`, and initializes `CREATE EXTENSION IF NOT EXISTS vector;`.
An optional full-app `Dockerfile` exists but is not the primary self-host path.

Create or update a local CX user while seeding:

```bash
CX_SEED_EMAIL="cx@example.com" \
CX_SEED_PASSWORD="use-a-strong-password" \
npm run db:seed
```

Or upsert only the user (admin by default, min 8-char password; reads
`CX_SEED_*` from the shell or `.env.local`):

```bash
npx tsx scripts/upsert-local-dev-user.mts
```

Local login still needs the email OTP; under `next dev` the code is also
printed to the server console as `[login-otp] code for <email>: <code>`.

## Verification

Fast checks:

```bash
npm run memory:check
npm test
npm run test:e2e
npm run lint
npm run build
npm run verify:survey
npx prisma migrate status
```

Before production cutover to `https://voc.rsm.com.kw`, use the full tickable
backend/API and flow checklist in `docs/GO_LIVE_CHECKLIST.md` (Miro vs current
deltas, every route area, CRM/SendGrid/ElevenLabs, cron, and automated gates).
For a screenshot-oriented invite→survey→notify walkthrough, see
`docs/FULL_INVITE_FLOW.md`.

GitHub Actions (`.github/workflows/ci.yml`) runs Vitest on every PR and push to
`master`/`main`, and runs Playwright survey visual/interaction tests in the
official Playwright Ubuntu container. Screenshot baselines live under
`tests/e2e/**/*-snapshots/`. Regenerate on Ubuntu with Actions
`workflow_dispatch` (`update_snapshots=true`) or `./scripts/update-e2e-snapshots.sh`.

End-to-end checks are listed in `README.md`. They use disposable records and
must not leave test users or responses behind.

## Deployment

Pushing `main` to GitHub triggers the linked Vercel production deployment.

The repository supports self-hosting with Dockerized Postgres (`db` service) and
a host-run Next.js process for single-VM operation when a client-managed
environment is required.

For client-owned VPS hosting (requirements, env vars, external services, manual
ElevenLabs/SendGrid/DNS steps, and go-live checklist), see
`docs/VPS_HOSTING_HANDOVER.md`.

### Self-hosted VPS deploys

The supported VPS deploy command is:

```bash
cd ~/rsm-voc-survey-eng && ./scripts/deploy.sh
```

`scripts/deploy.sh` blocks the deploy while a tracked survey is in progress,
builds into `.next-build` while the running server keeps serving `.next`, swaps
the build in with a rename, rolling-reloads PM2 from `ecosystem.config.js`, then
health-checks and auto-rolls-back on failure. Never build or run PM2 with
`sudo`; the script refuses to run as root.

Two `next.config.ts` options exist for this path and are inert everywhere else:

- `distDir` reads `NEXT_DIST_DIR`, enabling the side-directory build.
- `deploymentId` reads `NEXT_DEPLOYMENT_ID` (set to the deployed commit SHA),
  giving Next version-skew protection so a browser holding the previous build
  gets a hard navigation instead of a `Failed to find Server Action` error.

Swap space is a hard requirement on the VPS: without it the build's memory spike
causes the kernel to OOM-kill the running server. See
`docs/VPS_HOSTING_HANDOVER.md` section 3.

On the current 1 vCPU / 1.8 GB box, Turbopack + `tsc` + the PM2 cluster can
thrash and appear hung at "Creating an optimized production build". Prefer
`./scripts/deploy.sh` (never raw `npm run build` into live `.next`). If a deploy
stalls under memory pressure: restore `.next-prev` if present, `pm2 stop
rsm-voc`, rebuild with `NODE_OPTIONS=--max-old-space-size=1536` into
`.next-build`, swap, then `pm2 start rsm-voc`. Always use full `npm ci` (not
`--omit=dev`) so `@tailwindcss/postcss` is available for the build.

### Database backups

`scripts/backup/` (runbook `docs/DB_BACKUPS.md`) takes weekly `pg_dump -Fc`
backups of the VPS Docker database to the private S3 bucket
`rsm-voc-db-backups` (`us-east-1`) via system cron, installed once with
`./scripts/backup/install-cron.sh`. Each run uploads `weekly/<app>_<ts>.dump`
(lifecycle-expired after 84 days) and then `latest/<app>.dump` (never expired),
so the last good backup always survives. Pruning is lifecycle-only; the server
key needs only upload permission. The kit is app-agnostic and is meant to be
copied into other apps.

Verify:

```bash
npx vercel ls rsm-voc-platform
npx vercel inspect <deployment-url> --wait --timeout 2m
curl -I https://rsm-voc-platform.vercel.app/survey
```

Production route expectations:

- `/` redirects to `/survey`.
- `/survey` and `/login` return `200`.
- Anonymous `/dashboard` redirects to `/login?callbackUrl=/dashboard`.

## Current Limitations And Decisions

- Survey UI supports English or Arabic via a top-right switcher; the English
  banner and intro remain at the top. Voice surveys use one ElevenLabs agent
  (`ELEVENLABS_AGENT_ID`) with step-2 English/Arabic host choice. Arabic applies
  an allowlisted `tts.voiceId`; English uses the agent default voice.
- Reporting defaults to all time, with optional 90-day and current-year
  dashboard filters and monthly trend grouping.
- The external ElevenLabs agent is the voice runtime.
- Whisper fallback is described in the original specification but is not
  currently implemented in the ingest path.
- Insight and theme generation currently use `gpt-4o`; benchmark/model changes
  require verification and a memory entry.
- Embeddings use `text-embedding-3-small`; changing dimensions requires a
  database migration.
- The dashboard uses feature RBAC: system roles `admin`, `cx`, `surveyor`, and
  `portfolio`, plus admin-created custom roles. `surveyor` is invite send +
  tracker only.   `portfolio` is Partner / Job Manager read access
  (`dashboard.overview` / `reports` / `responses` / `insights`,
  `invite.tracker`, `cases.read`, `settings.account`) with staff-email data
  scope; Settings shows Account (password change) only. No leaderboard,
  send-invite, directory, testimonials manage, or user admin. `cx` has operational access
  except `responses.manage`, `testimonials.manage`, `users.manage`, and
  `roles.manage`. `admin` includes `responses.manage` (exclude/delete responses
  and delete invitations) and `testimonials.manage` (review and mark
  testimonials published). Leaderboard requires `dashboard.leaderboard`
  (admin/cx; not portfolio). Provision partners with
  `npm run db:provision-portfolio-users`; backfill missing invite staff emails
  with `npm run db:backfill-invite-staff-emails`.
- Complete survey ingest soft-excludes earlier responses for the same respondent
  email within the same UTC calendar quarter so KPIs keep the latest submission.
- Data residency for OpenAI processing remains a business/compliance decision.
- Scope decision (2026-09-28): the platform is being expanded into a
  configurable, event-driven CX platform (survey versioning, configurable and
  weighted scoring, closed-loop cases with SLA/escalation/client confirmation,
  account health, trigger engine, training, scoped AI). This reverses the
  earlier "CSAT/CES/NPS only" decision recorded in
  `docs/NEXUSES_VS_RSM_SRS_CHECKLIST.md`. The expansion is additive: the live
  three-metric survey, public aggregates, invite flow, and CRM status webhooks
  keep their current contracts, and new behavior ships behind `FeatureFlag`
  rows (default `off` or `shadow`). Budget mid/post triggers are still fired by
  RSM CRM into `POST /api/integrations/survey-invites`; VOC does not compute
  budget utilization.

## Change Discipline

Every task must:

1. Read this brief and `MEMORY.md` before work.
2. Preserve the public PII boundary and security rules.
3. Update `MEMORY.md` before completion.
4. Update this brief if stable project facts changed.
5. Run `npm run memory:check`.
