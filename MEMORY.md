# RSM Voice of Clients Project Memory

Last updated: 2026-11-13
Current branch: `main` (UAT repo `Nexuses/rsm-voc-uat`)



Linear: [NEX-1265](https://linear.app/nexuses/issue/NEX-1265) Dashboard KPI row: NPS tile showed promoter share labelled "NPS" (screen fix kept; its jsPDF half removed with the dead dashboard export).
[NEX-1264](https://linear.app/nexuses/issue/NEX-1264) Partner CX PDF zero-CES crash + report PDF sweep.
[NEX-1263](https://linear.app/nexuses/issue/NEX-1263) Period CX PDF build crash + error layout.
[NEX-1262](https://linear.app/nexuses/issue/NEX-1262) Response ledger mobile layout.
[NEX-1261](https://linear.app/nexuses/issue/NEX-1261) Report pages mobile header + trend layout.
[NEX-1260](https://linear.app/nexuses/issue/NEX-1260) Dashboard sentiment stat grid overflow on mobile.
[NEX-1255](https://linear.app/nexuses/issue/NEX-1255/replace-typed-survey-rating-sliders-with-a-static-labelled-scale) Typed survey static rating scale.
[NEX-1254](https://linear.app/nexuses/issue/NEX-1254/unify-privacy-notice-across-login-survey-forms-voice-survey-and) One shared privacy notice (login + survey).
[NEX-1248](https://linear.app/nexuses/issue/NEX-1248/voice-survey-ready-screen-scroll-start-button-into-view-prompt-to) Voice ready screen auto-scroll + start prompt.
[NEX-1102](https://linear.app/nexuses/issue/NEX-1102/survey-ui-overhaul-uat-typed-two-column-layout-voice-call-ux) Survey UI overhaul UAT (Done on branch).
Prior: [NEX-1093](https://linear.app/nexuses/issue/NEX-1093/vps-deploy-master-cx-one-pager-pdf-env) VPS master + CX one-pager deploy.

Production URL: `https://rsm-voc-platform.vercel.app`
Live CX host used for ops walkthroughs: `https://voc.rsm.com.kw`

## How To Use This Memory

Read this file and `PROJECT_BRIEF.md` before every task. Update this file before
finishing every task, including documentation, investigation, configuration,
database, and deployment work.

Never place secret values, passwords, connection strings, raw client feedback,
names, companies, or other private records here.

## Current State

- UAT source of truth for this workspace: GitHub `Nexuses/rsm-voc-uat`
  (`https://github.com/Nexuses/rsm-voc-uat`), default branch `main`.
- Production remains GitHub `Nexuses/rsm-voc-platform` → Vercel project
  `rsm-voc-platform`.
- Recommended self-host path is Dockerized Postgres only
  (`docker-compose.yml` `db` service with pgvector) plus a host-run Next.js
  process. Optional full-app `Dockerfile` remains but is not the primary path.
- Self-hosted VPS deploys run `./scripts/deploy.sh`, which blocks on in-progress
  surveys, builds into `.next-build` while the live server keeps serving
  `.next`, swaps by rename, rolling-reloads PM2 from `ecosystem.config.js`, and
  auto-rolls-back on a failed health check. Never build or run PM2 with `sudo`.
- Weekly DB backups: S3 bucket `rsm-voc-db-backups` (`us-east-1`) is created
  and configured; the app-agnostic kit `scripts/backup/` plus
  `docs/DB_BACKUPS.md` is in the repo. Cron is **not yet installed on the
  VPS** (operator runs `./scripts/backup/install-cron.sh` as `rsmuser`).
- Public survey supports voice through the existing ElevenLabs agent and a
  typed fallback.
- **UAT UI (`feature/survey-ui-overhaul-uat` only):** full-width shared white
  chrome (banner + intro always visible) for choose / voice / typed /
  complete.   Mode choose and voice-host (language) pickers share a full-width dual-path
  stage (not boxed cards) matched to `respond-section.html`: SVG voice wave,
  typed face-rating preview (unboxed; the face scale pins `direction: ltr` so
  the smile stays on the visual left in Arabic too instead of mirroring with
  the RTL page), bottom CTA with CSAT/CES/NPS pills +
  duration/hint. UI language switcher is a matching segment control.
  Voice host (EN/AR) picker tiles show a sample-card preview (avatar +
  greeting quote + play/pause + waveform + duration) per `language-option-2.html`
  instead of the metric-pill visual.
  Typed uses a two-column step layout (left RSM logo + metric art,
  vertical stepper, right question/answers). CSAT/CES/NPS use a static
  numbered scale: every score is a visible tile grouped under a labelled
  sentiment band (from `nps-scale-static.html`,
  `components/survey/MetricScaleRating.tsx`). The drag slider and its face
  readout were removed — clients found the slider hard to understand.
  Smile/icons version and toggle removed.
  Active voice uses a richer call stage (soft green/navy atmosphere, live
  status chrome + timer, caption panel, orb halos) with Orb + hold/end/typed
  controls — still no blue call stage. Host picker Arabic card is always
  `dir=rtl` / right-aligned even when the UI language is English. Captions
  advance by estimated speech length and freeze while on Hold. Shared subtle
  motion across choose / typed / voice / complete. The voice ready step
  (03) auto-scrolls its lower controls into view when it opens, because the
  stage is taller than short laptop/phone viewports, and its instruction
  caption names the **Start voice survey** button. Production/`master` keeps
  the prior single-column UI until this branch is approved and merged.
- Survey frontend offers English or Arabic via a top-right language switcher.
  Banner, intro, panels, privacy note, and footer stay in the shared shell;
  they localize with RTL for Arabic. The tab title and `<html lang>` follow the
  active language client-side (`lib/survey/use-localized-document.ts`), because
  route metadata can only be rendered in one language. The banner artwork has
  English text baked in, so it stays English until Arabic art is supplied; only
  its alt text is localized. The Arabic brand name is "RSM الكويت" everywhere
  (client preference, never "RSM في الكويت"). Voice surveys show a step-2 host picker
  with **English** or **Arabic**. Both use the same signed agent
  (`ELEVENLABS_AGENT_ID`); Arabic sessions set
  `overrides.agent.language: ar` plus allowlisted `overrides.tts.voiceId` from
  `lib/survey/arabic-voice-options.ts`. English keeps the agent default voice
  with `language: en`. Browser never sends raw agent or voice IDs from user
  input. Typed responses collect full name, email, company, designation, and
  the approved CSAT, CES, and NPS questions with optional per-metric comments;
  voice responses continue collecting full name, company, designation, and the
  same three metrics.
- Voice and typed responses use the same idempotent ingest pipeline.
- Voice webhooks are attached, production ingestion has been backfilled, and
  the live agent extracts all three metric ranges. Voice sessions auto-end after
  the agent invokes `end_call` (with a 45-second silence fallback); the browser
  cleans up active sessions on unmount or tab close.
- Each current response receives a stored GPT insight and pgvector embedding.
- Public metrics and every `/api/public/*` route read only PII-free
  `CsatSnapshot`, `ThemeRollup`, and `PublicReviewSnippet` tables.
- `/dashboard/widget` previews the aggregate metrics embed plus a second
  recent-reviews showcase embed (`public/widget-reviews.js` →
  `GET /api/public/reviews`, most recent commented responses, max 12 items,
  with optional respondent name and company attribution).
- CX dashboard is credentials-protected with email OTP MFA on every login and
  includes all-time CSAT, CES, NPS,
  response volume, monthly trends, distributions, themes, sentiment, risk,
  respondent detail, dedicated CSAT/NPS/CES report pages, a cited RAG assistant
  that also receives dashboard analytics context (including per-theme company
  attribution) and invite-tracker outreach status (full sent/opened/completed
  totals plus per-email linked feedback when asked), and a public widget preview with
  copyable embed code plus public page links (`/widget`, `/widget/reviews`). Dashboard
  navigation uses a shared sidebar layout across `/dashboard` (overview),
  `/dashboard/reports/csat`, `/dashboard/reports/nps`, `/dashboard/reports/ces`,
  `/dashboard/responses`, `/dashboard/testimonials`, `/dashboard/escalations`
  (recovery-case Kanban + table for needs-attention surveys; `cases.read` /
  `cases.manage`; optimistic drag transitions via `PATCH /api/cases/[id]`),
  `/dashboard/widget`, `/dashboard/invite`, and
  `/dashboard/invite-tracker` (outreach tracker with recipient status, next
  follow-up date, activity timeline, notes, manual follow-up send, and CSV/Excel
  export including non-openers and non-responders), and
  `/dashboard/insights` (RAG chat with inline line/bar/donut charts on
  data-heavy answers), and `/dashboard/leaderboard` (department / partner /
  business manager / job manager rankings for a chosen period). Overview
  Overview has two PDF buttons: **PDF Download** → custom-period 4-page
  (`POST /api/reports/period-cx` → `build_report.py --type=cx`, exact
  dateFrom/dateTo or window preset, no YoY/AI); **Annual PDF** always
  generates an AI narrative (`POST /api/reports/narrative` →
  `AiReportNarrative`), then posts filters + narrative to
  `POST /api/reports/annual-cx` (full Playwright deck; narrative →
  `text_overrides`). CSAT/NPS/CES report pages post to
  `POST /api/reports/metric-cx` (`pdf-files/cx_report --type=` via one-page
  `single_reports.py` v3 plates; same `resolvePeriodCxReportPlan` + org
  filters as period-cx). Host needs `./scripts/setup-cx-report.sh`
  (venv includes numpy/pillow for gauges). Overview,
  CSAT/NPS/CES reports, and the responses page share date, company, respondent,
  department, service, partner, and manager filters beside the reporting period. The invite tracker also filters by sent
  date and status (including not completed). Send survey suggestions come from
  the Settings directory (`StaffContact`: department, service, partner,
  business manager, job manager, their emails, and team leader). Dashboard
  filters still use the values stored on each invite. `/dashboard/settings/directory`
  lets anyone who can open Settings add, edit, and delete those entries.
  Sending an invite also adds a new department, service, person, or team leader
  to that directory. If the person has no email stored yet, the invite email is
  saved with them. An email already stored in the directory is left as edited
  in Settings.
  Responses are matched via linked `SurveyInvite` metadata on `/api/insights`.
  `GET /api/responses/[id]/transcript` returns the three scored answers and,
  for voice surveys, conversation turns. CRM status webhooks post `completed`
  only, and only when CSAT, CES, and NPS are present. `/dashboard/settings` includes an Account tab
  (`/dashboard/settings/account`) so any user with Settings access can change
  their own password (current + new + confirm; audited). `/dashboard/invite` lets CX users send branded HTML survey
  invitations through SendGrid, import recipient lists from CSV with
  `email`, `firstname`, `lastname`, and `company` columns (with downloadable
  sample CSV), send unique tracked links per recipient, and personalize single
  sends with a recipient name field. Invite, follow-up, and thank-you emails
  greet with `Dear {name}` (no hardcoded Mr./Ms. honorific). Automatic follow-up reminders go out every
  3 days by default (max 5; Settings → Reminders for interval, max, VoC CC, and
  daily send cap) for invites that have not been completed. Manual reminder
  sends count toward the max. Stop/Re-enable is available per invite and per
  contact. Third-party systems can send the same tracked invites
  via `POST /api/integrations/survey-invites` with a `SURVEY_INVITE_API_KEY` bearer token
  (server-to-server only; supports single, bulk `emails`, or `csv`). CRM callers
  can pass `externalEngagementId`, `triggerStage` (`mid`|`post`), and
  `idempotencyKey`; responses include `surveyUrl` and private `resultLinkUrl`
  (`/results/[resultToken]`). Lifecycle status webhooks (`sent` / `opened` /
  `filling` / `completed`, with scores on completed) POST to
  `CRM_STATUS_WEBHOOK_URL` when configured and echo `idempotencyKey` when set.
  Completion scores stay structured CSAT/CES/NPS (no weighted `totalScore` or
  `surveyResults[]`). Completion payload `sentiment` uses the same combined
  score out of 22 as emails (`crmSentimentFromScores`: Satisfied / Neutral /
  Dissatisfied ↔ Positive / Neutral / Negative). Completion scores JSON
  contract is documented for RSM consumers. Dashboard RBAC: system `admin` /
  `cx` / `surveyor` / `portfolio` roles plus admin-managed custom roles;
  `portfolio` sees only invites/responses attributed to their email (staff-email
  scope) and can change their own password via Settings → Account
  (`settings.account`); `responses.manage` (exclude/delete) and
  `testimonials.manage` are admin-only among system roles; audit log at
  `/dashboard/audit`.
  Complete ingest soft-excludes earlier same-email responses in the same UTC
  calendar quarter. Every complete survey
  sends an internal completion notification to `SURVEY_COMPLETION_NOTIFY_TO` (with a
  needs-attention flag when CSAT ≤ 2, CES ≤ 3, or NPS ≤ 6); needs-attention also
  sends a second action-required email to the same mailbox. The same mailbox
  receives scheduled weekly/monthly/quarterly CX reports (CSV + Excel). Tracked invite
  completions also send the client a branded thank-you with CSAT/CES/NPS summary.
  When that result is overall Positive, the thank-you adds a highlighted
  testimonial request and a private `/testimonial/[token]` link. Comments get an
  AI draft from the client's own words; no comment asks for a written testimonial
  or a video link. Consent (name, website, social) is stored on `Testimonial`.
  Admins manage the list at `/dashboard/testimonials`. Publishing does not write
  the public reviews widget. Partner-created testimonial links are not built yet;
  `Testimonial.source` reserves `partner_link`.
  SendGrid mail retries up to three times on 429, 5xx, or network errors.
  `/dashboard/responses` uses period/department/partner filters, a By email /
  By recency layout toggle (default By recency), pagination (25/50/100 rows),
  and exports the filtered table as CSV or Excel. Dashboard overview and CSAT/NPS/CES
  report pages show surveys sent, responses received, and response rate for the
  selected reporting period. Insights data is fetched once per
  dashboard session and cached in `DashboardInsightsProvider` for instant
  navigation between sidebar sections.
- Public `/reports` page shows PII-free CSAT, CES, NPS, monthly trends,
  distributions, NPS mix, sanitized themes, methodology notes, and a survey CTA.
  It reads only `GET /api/public/metrics`.
- RSM in Kuwait visual language follows `rsm-design-system.html` (official navy,
  green, blue) with Prelo typography from the RSM Kuwait webfont CDN and the
  Cloudinary-hosted RSM logo. Dashboard, PDF, public report, and embed widgets
  distinguish metrics as CSAT `#3f9c35`, CES `#888b8d`, and NPS `#009cde`.
  Rating-scale good/neutral/bad colors stay independent; CSAT Satisfied and CES
  Easy use `#65b05d`.
- Platform expansion (2026-09-28; migrations applied to the `.env.local` Neon
  DB on 2026-10-05 and confirmed applied on the VPS Docker DB on 2026-10-09,
  23/23 up to date): outbox + job queue, feature flags, org structure and
  per-user data scope, versioned surveys, trigger engine with fatigue and
  approvals, recovery cases with SLA/escalation/client confirmation, account
  health and revenue, scoped AI (Ask Your Data tools, summaries), SendGrid
  event webhook, managed API keys, training rules, benchmarks, platform admin.
  Everything new is behind flags defaulting to `off`/`shadow` except
  `events.outbox` (live). See `PROJECT_BRIEF.md` → Platform Expansion
  Architecture.

## Operational Snapshot

Checked on 2026-06-13:

- Neon project: `RSM VOC`
- Region: `aws-us-east-1`
- Database/schema: `neondb.public`
- pgvector extension: enabled
- Prisma migrations: 4 found, database schema up to date
- Responses: 56
- Clients: 48
- Response insights: 56
- Response embeddings: 56
- CSAT snapshots: 1
- Theme rollups: 2
- CX users: 1
- Survey rate-limit rows: 34
- Legacy responses with a valid CSAT score: 27
- Legacy responses contributing to CES or NPS: 0

These counts are a point-in-time health check and will change.

## Active Architecture Decisions

- Next.js App Router, TypeScript, Prisma, Postgres with pgvector (Neon for
  managed production, or Dockerized Postgres with a host-run Next.js app for
  self-hosting), NextAuth, ElevenLabs, and OpenAI remain the selected stack.
- Public survey write endpoints are not CX-authenticated; they are protected by
  allowed-Origin JSON validation (nextUrl, reverse-proxy Host /
  X-Forwarded-*, or NEXTAUTH_URL / SURVEY_PUBLIC_URL) plus database-backed
  rate limits.
- Webhook is authenticated only with the ElevenLabs HMAC signature.
- `Response.rawPayload` is retained for future parser corrections.
- Public aggregation is a one-way boundary: private tables to sanitized public
  tables (`CsatSnapshot`, `ThemeRollup`, `PublicReviewSnippet`), then public API.
- Dashboard analytics are calculated from authenticated `/api/insights` data.
- RAG answers cite stored response IDs in the API payload but surface company
  names (or respondent names) in the UI instead of raw database row IDs.
- `Response.avgRating` is retained only as a legacy CSAT alias. CSAT, CES, and
  NPS are calculated independently on their native scales.
- Public reporting defaults to all time and trends are grouped monthly.
- Existing responses are `legacy-v1` and contribute only to CSAT when a valid
  historical rating exists.

## Known Follow-Ups

- Security audit run-1 (2026-09-16): cron `?secret=` removal, custom-role
  fail-closed + transactional PATCH, system-role PATCH rejection and trusted
  rate-limit IP are fixed in code (2026-09-28, not yet deployed). Still open:
  rotate `CRON_SECRET` if query auth was ever used; set nginx
  `proxy_set_header X-Real-IP $remote_addr`; validate VPS/Vercel
  `X-Forwarded-Host` stripping for survey Origin checks. Full report:
  `~/security-audit-skill/rsm-voc-survey-new-main/run-1/REPORT.md`.
  Note: `GET /api/insights` now uses `requireAnyPermission` for analytics
  permissions (surveyor cannot pull the response ledger).
- Apply migration `20260918120000_response_exclude_login_otp` on any remaining
  deployed databases that are not yet migrated. Neon (`.env.local` target) and
  the four RSM Kuwait admin accounts were upserted on 2026-09-18 via
  `npm run db:upsert-rsm-admins` (password supplied only through env for that
  run; not recorded here). Re-run the upsert on other hosts if needed.
- Avra API/webhook integration remains deferred (meeting action item, out of
  this build).
- After the first Playwright visual CI run on Ubuntu, regenerate and commit
  linux/amd64 screenshot baselines via Actions `update_snapshots=true` (or
  `./scripts/update-e2e-snapshots.sh`) if pixel diffs exceed the configured
  threshold against the locally generated baselines.
- Decide and document the approved data-residency position for OpenAI
  processing.
- Implement Whisper transcription fallback only if RSM approves the need and
  data handling.
- Review whether the login page should receive the same RSM Kuwait visual
  redesign as the survey and dashboard.
- Consider a retention policy for raw payloads, responses, rate-limit rows, and
  embeddings.
- Consider separate least-privilege database roles for public aggregate reads,
  application writes, and administrative migrations.
- Migrate `next-auth` to v5/Auth.js and bump `next` to 16.3.0 to clear remaining
  `npm audit` advisories. Direct `nodemailer` usage was removed when mail
  delivery moved to SendGrid; reachability analysis is in the 2026-08-09
  security entry.
- Consider a Content-Security-Policy. Deliberately not added blind, since a
  wrong policy would break the survey; needs to be derived from the actual
  script/style/connect origins (ElevenLabs, Cloudinary, RSM webfonts) and
  rolled out report-only first.
- The self-hosted VM is below the documented minimum (1 vCPU / 1.8 GB versus
  2 vCPU / 2 GB, and 4 GB is recommended with Postgres on the same host). A 4 GB
  swapfile now absorbs build spikes, but builds are slow on a single core.
  Resizing the VM remains the real fix.
- Scope reversed on 2026-09-28: the platform expansion plan (survey
  versioning, weighted scoring, cases/SLA/escalation, account health,
  automation, training, scoped AI) is approved and being delivered additively
  behind feature flags. `docs/NEXUSES_VS_RSM_SRS_CHECKLIST.md` is now the
  historical baseline, not the current scope. Linear MCP was not available in
  the implementing session, so Linear issues for the expansion slices still
  need to be created manually.
- Platform expansion follow-ups: (`20260928*` migrations are applied on both
  the `.env.local` Neon DB and the VPS DB as of 2026-10-09); add the VPS cron for
  `/api/cron/jobs` (see `docs/VPS_HOSTING_HANDOVER.md` §8.6.3) and a Vercel
  cron equivalent if Vercel stays live; run `npm run org:backfill` and
  `npm run cases:backfill` (dry run) before flipping flags; RSM to confirm SLA
  hours, health-model weights/thresholds, communication (fatigue) policy, and
  training thresholds; serve published `SurveyVersion` rows to the live survey;
  apply data scope to dashboard analytics pages/exports and `/api/insights`;
  UserScope and CommunicationPolicy admin UI; role templates; reports hub
  (PDF/XLSX), tenant config and SSO deferred; document/accept HNSW index
  drift; configure `SENDGRID_WEBHOOK_PUBLIC_KEY` and
  `INTEGRATION_ENCRYPTION_KEY` in production before enabling those features.
- Apply migration `20261026120000_add_ai_report_narrative` on Neon and VPS
  before using AI narrative persistence in production.

## Task History

### 2026-11-13 - First commit and push to Nexuses/rsm-voc-uat
- Linear: [NEX-1401](https://linear.app/nexuses/issue/NEX-1401/commit-and-push-local-workspace-to-nexusesrsm-voc-uat)
- Problem: local workspace had no `.git`; UAT remote
  `https://github.com/Nexuses/rsm-voc-uat.git` was empty.
- Change: `git init -b main`, staged tree (754 files), documented UAT remote
  in `PROJECT_BRIEF.md` / this file, committed, pushed to `origin/main`.
- Verification: `.gitignore` excludes `.env*`; only `.env.example` /
  `.env.docker.example` / `starter/.env.example` staged; `gh repo view`
  confirmed empty remote before push; `git status` clean after push.
- Deploy/DB: none.
- Follow-up: wire UAT hosting/env separately from production if needed.

### 2026-11-08 - Audit: other collective-rating call sites vs combined score

- Audited every production use of overall/CRM/mood sentiment helpers after the
  CRM fix. **No further misalignment** for the collective rating.
- Combined-score consumers (aligned): completion/thank-you/action-required
  emails (`overallSurveyResult`), CRM completion payload
  (`crmSentimentFromScores`), dashboard/insights/export/scheduled reports /
  AI/RAG/narrative (`resolveOverallSentiment`), ingest + recalculate script
  (`overallSentimentFromScores`), testimonial eligibility.
- Intentionally CSAT-only (not collective): responses-page mood picker
  (labeled "Filter by CSAT"; inline thresholds). `csatSentimentFromScore` is
  now unused in production code (tests/scoring parity only).
- Vocabulary difference is intentional: emails Positive/Neutral/Negative vs
  CRM Satisfied/Neutral/Dissatisfied (same bands). Private `/results` page
  shows metric scores only, no overall label. Historical MEMORY notes that
  CRM stayed CSAT-bucketed are superseded by the fix entry below. No code
  change this turn.

### 2026-11-08 - CRM webhook sentiment aligned to combined score (emails parity)

- **Report.** Sudindev flagged email Overall **Neutral** vs CRM webhook
  `sentiment` **Satisfied** for CSAT 4 / CES 5 / NPS 8 (same invite).
- **Root cause.** Emails used combined score out of 22; CRM still used
  CSAT-only `csatSentimentFromScore` (left unchanged in the 2026-10-21
  combined-score work).
- **Fix.** Added `crmSentimentFromScores` in `lib/survey/metrics.ts` (same
  bands as `overallSurveyResult`, CRM vocabulary Satisfied/Neutral/Dissatisfied).
  `lib/crm/completion-payload.ts` now uses it. Docs updated:
  `docs/API_SURVEY_COMPLETION_PAYLOAD.md`, `docs/API_CRM_STATUS_WEBHOOK.md`,
  `docs/API_TRIGGER_SURVEY_EMAIL.md`, `PROJECT_BRIEF.md`. Dashboard CSAT mood
  filters still use `csatSentimentFromScore`. No schemaVersion bump (same
  enum values; meaning of `sentiment` changed). Linear MCP unavailable —
  no issue created.
- **Verification.** `tests/crm/completion-payload.test.ts` covers the
  reported 17/22 → Neutral case; `tests/survey/metrics.test.ts` covers
  Satisfied/Neutral/Dissatisfied mapping. Run targeted vitest + `npm run
  memory:check`. No database or deploy in this turn (deploy when ready).

### 2026-11-08 - CRM webhook sentiment vs email overall result mismatch (investigation)

- Investigation preceding the fix above; confirmed 17/22 Neutral (email) vs
  CSAT-4 Satisfied (API). Fix implemented in the entry above.

### 2026-11-05 - Phase 1 deck v6, client sheet items added

- **Task.** The client sheet (P1-01 to P1-17) had items v5 did not show.
  Checked each against the product before adding a slide.
- **Output.** `docs/presentations/RSM_VoC_Phase1_v6.pptx` from
  `build_phase1_deck_v6.py` (20 slides). New crops:
  `docs/presentations/assets/dash-filters-only.png` (filter bar only; the
  overview NPS ring on the source shot is the old figure) and
  `dash-reminders-crop.png` (interval and max only; the CC address field was
  cut off). Handoff for a later edit pass:
  `docs/presentations/PHASE1_DECK_FOR_CLAUDE.md`.
- **Shown as live.** Testimonial ask on the single portal thank-you (combined
  score above 80% of 22; comment stays optional). Invite fields for service,
  partner, managers, project and survey order. Date and org filters. Reminder
  every 3 days, max 5, Friday and Saturday skipped. Admin delete of a duplicate
  invite, and exclude or delete of a response. Portfolio login for a partner
  or job manager. Low-score flag and partner email. Portal vs RSM ownership,
  with training called out as not live.
- **Not shown as live.** Training assignment (`training.rules` defaults off).
  Partner-created testimonial links. Comments-stay-optional as its own slide
  (it is a no-change). The June score widget, CSAT/NPS/CES pages, and the
  thank-you email itself as a new page.
- **Left untouched.** `RSM_VoC_Phase1.pptx` and `_v1` through `_v5`.
- **Linear.** No Linear MCP namespace in this session.
- **Verification.** The v6 script ran. Not opened in PowerPoint.
- **No database or deploy change.**

### 2026-11-05 - Phase 1 deck v5, corrected against June version 1

- **Task.** v4 marked some existing screens as new. Version 1 is the June 2026
  product. The public score widget (from 17 Jun) and the CSAT, NPS and CES
  report pages (from 22 Jun) were already there. Insights charts, the invite
  tracker, thank-you mail and the CRM invite trigger were also already there.
- **Output.** `docs/presentations/RSM_VoC_Phase1_v5.pptx` from
  `build_phase1_deck_v5.py`. The widget slide is gone. CSAT, NPS, sign-in,
  insights, filters, send-survey and invite-tracker screens are not presented
  as new pages. Survey slides are labelled as a redesign. Leaderboard, roles,
  escalations and the directory stay as pages added after version 1.
- **Left untouched.** `RSM_VoC_Phase1.pptx` and `_v1` through `_v4`.
- **Linear.** No Linear MCP namespace in this session.
- **Verification.** The v5 script ran. Not opened in PowerPoint.
- **No database or deploy change.**

### 2026-11-05 - Phase 1 deck v4

- **Task.** Keep v1–v3. Add back the six theme cards and the full survey-page
  screenshot, and show more dashboard screens.
- **Output.** `docs/presentations/RSM_VoC_Phase1_v4.pptx` from
  `build_phase1_deck_v4.py`. New crops in `docs/presentations/assets/`
  (`dash-login`, `dash-filters`, `dash-nps`, `dash-invite-stats`,
  `dash-insights`, `dash-roles`, `dash-escalations`, `dash-directory`,
  `dash-widget`). Invite picture is the summary counts only. Audit log, user
  list, reminder CC addresses, response ledger, and testimonials were not used
  because those screens show email addresses or client names.
- **Left untouched.** `RSM_VoC_Phase1.pptx`, `_v1.pptx`, `_v2.pptx`, `_v3.pptx`.
- **Linear.** No Linear MCP namespace in this session.
- **Verification.** The v4 script ran and wrote 22 slides. Not opened in
  PowerPoint.
- **No database or deploy change.**

### 2026-11-05 - Phase 1 decks kept as v1, v2 and v3

- **Task.** Later edits had replaced `RSM_VoC_Phase1.pptx`. Keep each deck as its
  own file. v3 should bring back the version 1 / Phase 1 list and the three
  report pages, and still show what is new.
- **Files.** `docs/presentations/RSM_VoC_Phase1_v1.pptx` (first deck, rebuilt
  because the original file had been overwritten), `RSM_VoC_Phase1_v2.pptx`
  (copy of the screenshot deck; `RSM_VoC_Phase1.pptx` is that same file and was
  left in place), `RSM_VoC_Phase1_v3.pptx` (list, then before/after and
  one-screenshot slides, then the annual / year-before / one-metric reports).
  Generators: `build_phase1_deck_v1.py`, `build_phase1_deck_v2.py`,
  `build_phase1_deck.py` (writes v3 only).
- **Linear.** No Linear MCP namespace in this session.
- **Verification.** Both generate scripts ran. v3 slide order was read back
  from the file. Slides were not opened in PowerPoint.
- **No database or deploy change.**

### 2026-11-05 - Phase 1 deck revised: themes, then one screenshot each

- **Task.** The first deck’s tick-list (slides 3–4) and the drawn slider on the
  rating slide were wrong for the presentation. The rating control changed on
  2026-11-04 to a traditional numbered scale.
- **Change.** `docs/presentations/build_phase1_deck.py` now builds 11 slides:
  title, six theme cards with no screenshots, then one screenshot and one
  sentence for the survey start, the traditional scale, the voice host, the
  identity step, the dashboard overview, a metric page, send survey, the
  leaderboard, and the CSAT report page. Regenerated
  `docs/presentations/RSM_VoC_Phase1.pptx`.
- **Linear.** Still no Linear MCP namespace in this session.
- **Verification.** Script ran and wrote the pptx. Slides were not opened in
  PowerPoint.
- **No database or deploy change.**

### 2026-11-05 - Phase 1 marketing deck

- **Task.** A client-facing deck of what version 1 already did and what Phase 1
  added, for the survey and the dashboard. Written inventory on two comparison
  slides. Later slides are pictures of the same work, not a second list.
- **Linear.** The Linear MCP namespace was not available in this session, so no
  issue was opened.
- **Output.** `docs/presentations/RSM_VoC_Phase1.pptx`, generated by
  `docs/presentations/build_phase1_deck.py`. Screenshots live in
  `docs/presentations/assets/`.
- **Baseline kept out of the “added” rows.** Voice and typed collection, CSAT /
  CES / NPS with a comment, English and Arabic, a stored insight, Ask Your Data
  itself, the public score widget, and the signed-in overview. Those rows are
  ticked in both columns.
- **Not presented as live.** Survey builder, training, automation and account
  health stay behind flags and are not in the deck.
- **Pictures.** Survey shots are from local `/survey` on
  `feature/survey-ui-overhaul-uat` (no submission). Dashboard crops are from
  `docs/dashboard-walkthrough/screenshots/` and show aggregates or empty forms.
  The testimonials screenshot was not used: it contains client names and emails.
  Report pages are from the generated CX PDFs under `pdf-files/cx_report/output/`.
- **Verification.** `python3 docs/presentations/build_phase1_deck.py` writes the
  deck. Shape positions were checked against the slide size. Keynote could not
  export a PDF (automation permission denied), so the slides were not opened in
  PowerPoint.
- **No database, deploy, or schema change.**

### 2026-11-04 - Local dashboard login for shivali.r@nexuses.in

Linear: [NEX-1266](https://linear.app/nexuses/issue/NEX-1266/local-db-create-admin-dashboard-login-for-shivalirnexusesin).

- **Task.** "Make a login for `shivali.r@nexuses.in` in local neon db" with an
  operator-supplied password and admin role.
- **Pre-check.** `DATABASE_URL` in `.env.local` resolves to the shared Neon
  endpoint (`neondb`, us-east-1) that holds live data: 8 pre-existing users
  (all `admin`) and 338 responses at the time of the change. Recorded here as a
  dated snapshot, not a durable fact.
- **Password policy conflict.** `scripts/upsert-cx-user.mts` rejects passwords
  under 12 characters, so it cannot take the requested value.
  `scripts/upsert-local-dev-user.mts` enforces an 8-character floor (same
  hash/role logic, no `name` or `sessionVersion` handling) and is the intended
  path for local logins. Used that script; `upsert-cx-user.mts` was left
  unchanged. It does not reset `disabledAt` or bump `sessionVersion`, which is
  fine for a brand-new account.
- **Command.** `CX_SEED_EMAIL`, `CX_SEED_PASSWORD`, `CX_SEED_ROLE=admin` piped
  into `npx tsx scripts/upsert-local-dev-user.mts`. Secrets were supplied via
  the one-off shell environment only; no value is stored in this file, the
  brief, git, or Linear.
- **Change.** Upserted one `User` row: `role = "admin"`, `roleId` = Administrator
  role, `passwordHash` = scrypt (see `lib/password.ts`), `disabledAt` null. No
  schema, migration, or code change.
- **Verification (live, against `next dev` on :3000).**
  `POST /api/auth/mfa/start` returned 200 for the account (wrong-password and
  unknown-email both return 401 on this route).
  `POST /api/auth/callback/credentials` with the emailed/dev-printed OTP
  returned 200, `GET /api/auth/session` returned
  `{ role: "admin" }` for the new user id, and `GET /dashboard` returned 200.
- **Login is two-factor.** Email + password only completes step one; a 6-digit
  OTP from `LoginOtp` is required (`lib/auth.ts` -> `consumeLoginOtp`, 10 min
  TTL, 5 attempts, single use). Under `next dev` the code is printed to the
  server console as `[login-otp] code for <email>: <code>`, so local sign-in
  works without inbox access. In production the code goes out by email.
- **Temporary files.** Two one-off `.mts` scripts were used for the first pass
  (list users, create user) and deleted; working tree left clean.
- **Follow-up.** The account uses a 10-character password on a shared Neon
  database that contains real client data; rotate it to 12+ characters if this
  login is ever pointed at a non-local host or granted to someone outside the
  immediate UAT group.

### 2026-11-04 - Same reset applied to ekansh.k@nexuses.in

Linear: [NEX-1266](https://linear.app/nexuses/issue/NEX-1266/local-db-create-admin-dashboard-login-for-shivalirnexusesin).

- **Task.** "Do the exact same for `ekansh.k@nexuses.in` — it may already be
  there but just in case." Same password, same admin role, same DB.
- **Pre-state.** The account already existed as an `admin` (it is one of the 8
  pre-existing users), so this was a re-upsert rather than a create. Only its
  `passwordHash`, `role`, and `roleId` were rewritten.
- **Command.** Same env-var form of `scripts/upsert-local-dev-user.mts`
  (`CX_SEED_EMAIL`, `CX_SEED_PASSWORD`, `CX_SEED_ROLE=admin`). Password value
  again supplied only through the one-off shell environment.
- **Change.** No new `User` row. `role = "admin"`, `roleId` = Administrator
  role, `disabledAt` null, `sessionVersion` 0, new scrypt hash. No schema,
  migration, or code change.
- **Verification.** `passwordOk: true` against the freshly stored hash.
  `POST /api/auth/mfa/start` returned 200; `POST /api/auth/callback/credentials`
  with the OTP returned 200; `GET /api/auth/session` returned `role: "admin"`;
  `GET /dashboard` returned 200.
- **Note.** `upsert-local-dev-user.mts` does not clear `disabledAt` or bump
  `sessionVersion` on update. Both were already null / 0 here, so no stale
  session or disable flag needed clearing. If a disabled account is ever
  re-enabled through this script, clear `disabledAt` separately.
- **Same follow-up applies.** 10-character password against live client data;
  rotate before pointing at a non-local host.

### 2026-11-04 - Production build verification (no source change)

- **Task.** "Build and push everything" after the NPS hero / donut-centring work.
- **Push state at start.** Working tree clean and `feature/survey-ui-overhaul-uat`
  already matched `origin` at `1e012df`; nothing was left unpushed. The five
  commits from this session (`7e5d166` partner PDF, `9357b32` KPI row,
  `9b85494` dead PDF removal, `88229dd` NPS hero, `1e012df` donut centring) were
  all pushed as they were made.
- **Build.** `NEXT_DIST_DIR=.next-build npm run build` (Next 16.3.5) succeeded in
  39s, exit 0. `.next-build/` is already gitignored (line 25). Used the side
  directory on purpose — `next dev` is running on :3000 from `.next`, so a plain
  build would have clobbered the dev server's output. Build routes confirm the
  removed jsPDF chain and the temporary fixture routes (`/tmp-kpi`,
  `/tmp-report`, `/tmp-donut`) are all absent from the route table.
- **Side effect reverted.** The build rewrote `tsconfig.json`: Next reformatted
  `lib` / `paths` / `exclude` onto multiple lines and appended
  `.next-build/types/**/*.ts` + `.next-build/dev/types/**/*.ts` to `include`.
  That is a NEXT_DIST_DIR artifact, not a project change, so `tsconfig.json` was
  restored with `git checkout`; `.next-build/` was deleted afterwards.
- **Verification.** `npx tsc --noEmit` clean before the build. Final state:
  working tree clean, local `HEAD` = `origin/feature/survey-ui-overhaul-uat` =
  `1e012df`. No database or deployment effect.
- **Follow-up worth knowing.** Any future local build with a custom
  `NEXT_DIST_DIR` will re-add those two `include` paths and reformat
  `tsconfig.json`. Revert it rather than committing, or let `scripts/deploy.sh`
  manage it in the deploy flow.

### 2026-11-04 - Donut centre label was off-centre

- **Report.** Screenshot of the NPS donut: "31" sits left of the ring's centre
  while "NPS score" below it looks centred.
- **Root cause.** The centre overlay is `position: absolute; inset: 0; display:
  grid; place-content: center`. `place-content` centres the grid's content box,
  but `justify-items` defaults to `stretch`, so every row stretches to the
  **widest** row — the label — and `text-align` defaults to `start`, so the
  figure left-aligned inside that width. Measured on the real component before
  the fix: the `strong` box was 47.33px wide (exactly the label's width) with
  its glyphs starting at the box's left edge, so a 19px-wide "31" appeared
  ~14px left of the ring centre.
- **Why only the figure looked wrong.** The label was already the widest row, so
  it filled the stretched width and appeared correctly centred. `.methodDonutCenter`
  was unaffected because it already carried `text-align: center`.
- **Fix.** Added `justify-items: center; text-align: center` to
  `.panelDonutCenter` / `.kpiDonutCenter` (shared rule) and `.shareDonutCenter`,
  and `justify-items: center` to `.methodDonutCenter` for consistency. Items are
  now max-content width and individually centred. Re-measured after the fix:
  the score's box is 19.65px (its own glyph width) and its centre is 154.00px,
  matching the SVG centre at 154.00px — delta 0.004px.
- **Affected surfaces.** Every donut: the dashboard KPI row, the metric report
  hero card, the public widget preview, and the methodology card (which was
  already correct). One CSS rule covers all of them.
- **Verification.** Rendered `ShareDonutChart` with `centerText="31"` through a
  temporary `/tmp-donut` route (deleted) and measured both before and after with
  `Runtime.evaluate` + `Range.getBoundingClientRect` (jsdom cannot apply a CSS
  module, so a component test cannot see this). New
  `tests/dashboard/donut-center-css.test.ts` (4 tests) asserts each of the four
  centre classes centres its items. `npx tsc --noEmit` clean. Full `npm test`:
  573 passed / 12 failed — the same pre-existing DB/authz failures.

### 2026-11-04 - NPS report page: hero showed promoter share as the "overall score"

- **Report.** "On a page where one sees NPS, the first box they see will be a
  promoter-only score, so they might be fooled into thinking they are seeing the
  NPS score. Similarly for CSAT. Is that okay?" Instinct was correct.
- **Diagnosis.** `OverallScoreCard` in `components/dashboard/MetricReportAnalytics.tsx`
  filled its hero donut with `report.nps.promoterPercent` while the card's
  aria-label read `Net Promoter Score (NPS) overall score`. On a fixture with one
  promoter and one detractor that rendered **50%** in the score slot when the NPS
  was **0**, and the real score only appeared lower down inside an insight card
  (`content.scoreDisplay`). CSAT and CES were already definitional
  (% favorable, 1–7 mean), so only the NPS page was wrong — but it was the worst
  case, because promoter share and NPS are different numbers that can differ by
  more than 50 points.
- **Decision (user).** Make the NPS hero show the score. Leave the CSAT hero
  labelled "CSAT", since its score *is* the % favorable and there is no second
  number to confuse it with.
- **Change.** New `heroFigure()` helper in `MetricReportAnalytics.tsx` returns
  `{ percent, label, centerText, ariaLabel }` per metric:
  NPS → ring at `(score + 100) / 2`, centre `content.scoreDisplay`, label
  "NPS score", aria `NPS score <value>`; CSAT → unchanged % favorable labelled
  "CSAT"; CES → unchanged. The NPS subtitle became the derivation
  `x% promoters − y% detractors`. `ShareDonutChart`'s existing `centerText` /
  `ariaLabel` props (added for the dashboard KPI row) made this a prop change.
- **Unchanged on purpose.** The footer still reads `Promoters (9+10)` and
  `Total responses`; detractor share moved up into the subtitle instead of
  displacing the response count, which is the only place that count is shown
  (`content.meta` is never rendered anywhere).
- **Verification.** Rendered the real component through a temporary `/tmp-report`
  route (deleted) for NPS and CSAT: NPS hero now prints **0** with label
  "NPS score" and subtitle "50% promoters − 50% detractors"; CSAT still prints
  50% labelled "CSAT". New `tests/dashboard/metric-report-hero.test.tsx` (3
  tests) asserts the NPS hero exposes `NPS score 0` and that no element is
  labelled `NPS 50%`, plus CSAT and CES keep their own headlines.
  `npx tsc --noEmit` clean. Full `npm test`: 569 passed / 12 failed — the same
  pre-existing DB/authz failures (581 total, up 3 with the new tests).

### 2026-11-04 - Removed the dead jsPDF dashboard export

- **Report.** "Which PDF did you fix? We don't even use that anymore, remove it."
  Confirmed: the dashboard jsPDF export was dead code.
- **Why it was dead.** `components/dashboard/DownloadReportButton.tsx` was the only
  importer of `lib/dashboard-pdf.ts`, and that component was not imported by any
  page or component — so nothing mounted it and Next never bundled the chain.
  `lib/dashboard-pdf-classic.ts` had no importer at all (only a stale hint
  comment), and `lib/pdf-face-icons.ts` was consumed solely by
  `lib/dashboard-pdf.ts` plus its own test.
- **Removed.** `lib/dashboard-pdf.ts`, `lib/dashboard-pdf-classic.ts`,
  `lib/pdf-face-icons.ts`, `components/dashboard/DownloadReportButton.tsx`,
  `tests/dashboard/dashboard-pdf.test.ts`, `tests/dashboard/pdf-face-icons.test.ts`.
  No imports, exports, or route wiring referenced them afterwards.
- **Supersedes part of NEX-1265.** The screen changes from commit `9357b32` stand
  and are what the user sees: CSAT % favorable labelled "Favorable", NPS printing
  the net score labelled "NPS score" with the ring normalised over −100..+100, CES
  printing the 1–7 mean. The PDF half of that commit (CES card average, CES metric
  page mean donut, NPS ring normalisation, `ensureSummarySection` `addPage()` fix)
  went away with the deleted files — that code no longer exists, so there is
  nothing to keep in sync.
- **Unchanged on purpose.** `jspdf` stays in `package.json`: `lib/annual-cx-report-pdf.ts`
  and `docs/dashboard-walkthrough/build-guide-pdf.mjs` still use it. `sharp` stays
  (guide PDF script). The live report downloads are unaffected — annual, period
  (`--type=cx`), metric, and partner all render through the Python Playwright tree
  in `pdf-files/cx_report`, not jsPDF. `lib/annual-cx-report-pdf.ts` is still
  unreferenced by UI but was out of scope here.
- **Verification.** `npx tsc --noEmit` clean. Full `npm test`: 566 passed / 12
  failed — the same 12 DB/authz-dependent failures as before; the totals drop from
  583 to 578 because the 5 deleted tests went with the files. Dev server healthy
  after removal: `/dashboard` 307 (auth redirect), `/login` 200, and the live
  `POST /api/reports/metric-cx` / `POST /api/reports/period-cx` still return 200.
  `PROJECT_BRIEF.md` no longer advertises the jsPDF export as a rollback path.

### 2026-11-04 - Dashboard KPI row: honest headlines, NPS score, PDF pagination (NEX-1265)

- **Report.** "Why do we show positive scores in the first box for NPS and CSAT,
  but an average for CES?" The row was mixing three different statistics and
  one of the labels was wrong.
- **Diagnosis.** Each tile prints a different thing:
  CSAT donut = `favorablePercent` with the sublabel "CSAT";
  NPS donut = `promoterPercent` with the sublabel "NPS" (so the tile read
  "50% NPS" while its own meta line said "Score 33" — the NPS score never
  appeared as the headline, and the aria-label announced "NPS 50%");
  CES gauge = `average` out of 7. CSAT's average was demoted to tiny meta text
  while CES's average was the headline, which is what made the row feel arbitrary.
- **Decision (user).** Keep each metric's definitional KPI and make the labels
  honest, matching `metric-report-content.ts` and the PDF export:
  CSAT 93% "Favorable" · NPS 33 "NPS score" · CES 4.8/7 "Average".
  Averaging the three instead was rejected: averaging the 0–10 NPS answers is not
  NPS, and CSAT targets are percentages (`PROJECT_BRIEF.md` already says never to
  average these incompatible scales).
- **Change (web).** `ShareDonutChart` gained optional `centerText` and
  `ariaLabel` props so `percent` can drive the ring while the centre prints a
  non-percentage figure. The NPS tile now passes `(score + 100) / 2` as the ring
  position, prints the score itself, and is labelled "NPS score"; CSAT is
  labelled "Favorable". Meta lines now carry the complementary statistic instead
  of repeating the headline: CSAT `Avg 4.6/5 · n ratings`, NPS
  `x% promoters · y% detractors · n ratings`, CES `x% favorable · n ratings`.
- **Change (dashboard PDF).** The same cards now agree with the screen: CES
  centre is the average and its ring is the mean's position on 1–7 (it was the
  % favorable), and the NPS metric-page ring is normalised over −100..+100 to
  match its centre (it was promoter share under a score label).
- **Bug found while verifying (pre-existing, fixed).** `ensureSummarySection()`
  painted the "Executive summary (continued)" header without calling
  `doc.addPage()`, so whenever the summary spilled the continuation was drawn
  over the page that had just overflowed: the trend chart was covered by a navy
  band and the footer read "Page 5 of 4" on a 4-page file. It now adds the page;
  the export is 5 pages with "Page 5 of 5". `dashboard-pdf.test.ts` expected 4.
- **Verification.** Rendered the real component through a temporary
  `/tmp-kpi` route (deleted) and screenshotted: CSAT 50% "Favorable",
  NPS 0 "NPS score" with the ring at the halfway position, CES 4.5/7
  "Avg ease score". Rendered the real dashboard PDF from a fixture with
  `npx tsx` (temp script, deleted) and rasterised every page: CES page shows
  `9 ÷ 2 = 4.50`, centre `4.5/7`, formula "Sum of ratings ÷ Total Responses =
  CES average"; summary cards read 50% Favorable / 0 NPS score / 4.5/7 Average;
  "Page 5 of 5". `npx tsc --noEmit` clean, ESLint clean apart from the
  pre-existing unused `responseCount` prop warning. Full `npm test`:
  571 passed / 12 failed — the same 12 DB/authz-dependent failures as before
  this change. No database or deployment effect.

### 2026-11-04 - Report PDFs: partner zero-CES crash, full sweep of every deck (NEX-1264)

- **Report.** Asked to check whether the other downloadable reports (annual deck,
  the CSAT/CES/NPS one-pagers, the partner report) had the same edge-case crash
  the period deck had, and to produce a partner report to look at because no
  partner-level login is available.
- **Sweep.** Built a throwaway harness (`/tmp/stress.py`, not committed) that
  deep-copies the fixtures and rewrites them, then runs the real builder for all
  six kinds: `annual`, `cx`, `partner`, `csat`, `nps`, `ces` × seven variants
  (baseline, zero CSAT, zero NPS, zero CES, zero all three, zero
  `surveys_sent`, zero invites + zero CES) = 42 builds.
- **Result of the sweep.** 39/42 passed; the three failures were all
  `--type=partner` with zero CES (`ZeroDivisionError`). The annual deck and all
  three one-pagers were already safe because they share `build_report.metrics()`
  and the `pct()` helper added in NEX-1263. `single_reports.donut()` and
  `partner_report.widths()` already guard their own totals with `or 1`.
- **Root cause.** `partner_report.py` renders its page-3 CES paragraph with a
  raw `round(cc['easy'] / cc['total'] * 100)` — the last unguarded division in
  the PDF code, outside the shared `metrics()`. It only fires when a partner has
  responses but no CES ratings.
- **Change (builder).** That site now uses `B.pct(cc['easy'], cc['total'])`.
  After the fix all 42 builds exit 0; the zero-case page 3 reads
  "0 of 0 clients (0%)" instead of crashing.
- **Change (route).** `post /api/reports/partner-cx` only rejected
  `responses.received === 0`, so a sparse partner still reached the builder.
  It now also runs `metricHasScores` for CSAT, NPS and CES (same shape as
  `period-cx`) and answers 422 naming the empty measure(s) before any build,
  so a misleading "0%" partner deck is never produced.
- **Not changed.** `annual-cx` keeps its existing guard (only rejects a wholly
  empty period). The annual deck is the full-fiscal-year deliverable, and the
  builder is now zero-safe, so a partial measure renders as 0% rather than
  failing. `metric-cx` already gates on the single requested metric.
- **Sample artifact for review.** Rendered the partner deck from
  `pdf-files/cx_report/data/partner_example.json` to
  `pdf-files/cx_report/out/sample-partner-report.pdf` (3 pages, 1.1 MB) and
  copied it to `public/samples/sample-partner-report.pdf` so it is reachable at
  `/samples/sample-partner-report.pdf` while `npm run dev` is up. Both paths are
  now in `.gitignore` — these are local review fixtures and are never deployed.
  Rasterised all three pages to confirm layout: 3 pages, no overflow, real
  numbers and narration, "Sample Partner" attribution on every page.
- **Verification.** 42/42 builder cases pass. `npx vitest run tests/reports` →
  4 files / 12 tests pass, including the new
  `tests/reports/partner-cx-route.test.ts` (4 tests: 422 on no responses, 422
  naming CES, 422 listing "CSAT or CES", 200 + `partner` kind when all three
  have scores). `curl` of the sample URL returns 200 `application/pdf`.
  Full `npm test`: 571 passed / 12 failed; the same 12
  `cx-dashboard` / `survey-invite-tracker-route` / `testimonials/admin-route`
  failures reproduce with these changes stashed (DB/authz dependent, unrelated).
  No database or deployment effect.

### 2026-11-04 - Period CX PDF: build crash and broken error layout (NEX-1263)

- **Report.** Downloading the PDF report for a selected period returned
  "CX PDF build failed: Traceback (most recent call last): File
  "/Users/.../main-pdf-files/cx_report/build_report.py", line 480 …" and the
  dashboard layout broke — the message ran across the header, crushed the "CX
  Intelligence" title to a sliver and pushed the buttons out of place.
- **Root cause 1 (build).** `build_report.py`'s `metrics()` divided by each
  measure's response total and by `surveys_sent` with no zero guard
  (`cs['pct']`, `cs['pcts']`, the three NPS percentages, `cc['score']`,
  `cc['pcts']`, `resp['rate']`). `POST /api/reports/period-cx` only rejected a
  period with *no* responses at all, so a narrow date range that held responses
  but no CES (or CSAT/NPS) ratings reached the builder and raised
  `ZeroDivisionError: division by zero` inside `metrics()`. Reproduced locally by
  zeroing one measure in `data/cx_example.json`.
- **Root cause 2 (message).** `humanizeBuildFailure` sliced the **first** 280
  characters of stderr. A Python traceback carries absolute source paths in its
  head and the actual exception on its **last** line, so the user saw only paths
  (also leaking the host filesystem into the browser) and never the cause.
- **Root cause 3 (layout).** `.downloadReportError` set only colour, size and
  `text-align: right` — no wrapping, no cap. The unbroken path had no break
  opportunity, so it forced the header's `auto` actions column wider than the
  viewport (`.overviewLead` was `minmax(0,1fr) auto`) and spilled over the title.
- **Change (builder).** Added a `pct(num, den, rounder)` helper in
  `build_report.py` that returns 0 for an empty denominator and used it for all
  six percentage sites plus the response rate; CES mean guards its own total.
  Verified four zero cases (CSAT, NPS, all three, and zero invites) now build.
- **Change (route).** `period-cx` now checks `metricHasScores` for CSAT, NPS and
  CES (the deck covers all three) and answers 422 naming the empty measure(s)
  before any build runs, matching the existing `metric-cx` behaviour. This keeps
  a misleading "0%" deck from being produced for a measure nobody answered.
- **Change (message).** `humanizeBuildFailure` now takes the last
  `SomethingError` line of the output, strips POSIX and Windows absolute paths
  and caps at 180 characters. Missing-template messages use a new `displayPath`
  helper (repo-relative) instead of absolute server paths.
- **Change (layout).** `.downloadReportError` is now a contained alert:
  `overflow-wrap: anywhere`, `white-space: normal`, left aligned, tinted surface,
  `max-width: 22rem`, `max-height: 5.6rem` with `overflow: auto` (full card width
  under 720px). `.downloadButtonStack` and `.overviewLeadActions` get
  `min-width: 0; max-width: 100%`, and `.overviewLead` uses
  `minmax(0, 1fr) minmax(0, auto)` so the actions column can shrink. It is a
  shared class, so all five download buttons benefit.
- **Not changed.** The 422s still return `application/json`, which the buttons
  already read; no client change was needed.
- **Verification.** Real builder: `--type=cx` on the example payload and on the
  four zero-metric variants all exit 0 and write a PDF. Probe route rendering the
  real `.overviewLead` with a traceback-shaped message: at 390 / 768 / 1280px the
  document has no horizontal overflow, the title keeps 230-742px, and the error
  box is 352px wide and 90px tall (wrapping) instead of one endless line.
  `npx tsc --noEmit` clean. New tests: `tests/reports/pdf-build-error.test.ts`
  (3, stub interpreter, asserts the cause is surfaced and no paths leak),
  `tests/reports/period-cx-route.test.ts` (4, 422 naming the empty measure and a
  200 when all three have scores) and `tests/dashboard/download-error-css.test.ts`
  (4). Full `tests/reports` + `tests/dashboard` run: 205 passed, 10 failed —
  the same 10 `cx-dashboard` / `survey-invite-tracker-route` failures reproduce
  on a stashed clean tree. No database or deployment effect.

### 2026-11-04 - Response ledger: mobile toolbar, filters and pagination (NEX-1262)

- **Report.** On phones the "Client feedback detail" ledger cut off the right
  side of the card: "338 shown" sat above a full-width, half-clipped Export CSV
  and Export Excel, the filter row wrapped into ragged lines, and pagination
  stacked into four rows of mismatched widths.
- **Root cause.** `.sectionTitle` is a `space-between` flex row whose second
  child is `.topbarActions` with `flex-shrink: 0`. An existing
  `@media (max-width: 760px)` rule sets `.topbarActions { width: 100% }` and
  `.topbarActions > * { width: 100% }` for the page header, but the same class is
  reused inside `.sectionTitle`, so both children claimed the full row. The
  actions column started at x=136 and ended at x=450 inside a 362px card, and
  `.responseSection { overflow: hidden }` clipped the exports. Also the count
  rendered with default `strong` sizing because `.sectionTitle > strong`
  (0,1,1) does not match a `strong` nested in `.topbarActions`.
- **Change.** A scoped mobile block in `dashboard.module.css` (inside the
  existing 760px query) styles only `.responseSection`:
  - `.sectionTitle` → column, stretch, 12px gap.
  - `.topbarActions` → 2-column grid; the count spans both columns as a muted
    0.72rem meta line; both export buttons full width, 42px tall.
  - `.filters` → 2-column grid with the search, mood row and view switch each
    spanning both columns; the sentiment select and risk toggle form a matched
    pair; the CSAT mood buttons become 4 equal columns; By email / By recency
    become two equal halves.
  - `.tablePagination` → single column with the row-size picker justified
    between its label and select, and a `1fr auto 1fr` control bar so Previous
    and Next are equal width with the page label centred.
  - `.responseSection` padding drops to `18px 14px`.
- **Not changed.** The ledger table itself (`CompactDataTable`, `minWidth={0}`)
  already scrolls inside `.tableWrap` (1116px of columns in a 264px window at
  320px) without leaking to the page, which is the intended dense-ledger
  behaviour. Desktop (>760px) is untouched; 761 / 900 / 1280px still render the
  single-row heading.
- **Verification.** Temporary probe routes replicating the real `.sectionTitle`,
  `.topbarActions`, `.filters` and pagination markup with the real classes, plus
  a `CompactDataTable` with the real 12 column widths (all deleted after
  measuring). Chromium at 320 / 390 / 560 / 700 / 761 / 900 / 1280px:
  `documentElement.scrollWidth === clientWidth` at every width, no element
  crossing the viewport outside the intended table scroller, section height
  454 → the actions block drops from 132px to 67px, pagination 185 → 139px with
  a 3-column control bar. `npx tsc --noEmit` clean. New
  `tests/dashboard/responses-mobile-css.test.ts` (4 assertions); the three
  dashboard CSS suites total 13 passed. No database or deployment effect.

### 2026-11-04 - Report pages: mobile header and trend-chart layout (NEX-1261)

- **Report.** On phones the CSAT / CES / NPS report header pushed the PDF
  Download button to the right of a wrapping flex row while its hint paragraph
  restarted at the left edge, so the button looked stranded; the long CSAT title
  also ran past the viewport at 320px. Separately, the public `/reports`
  experience-trend chart needed ~550px of bars inside a 218-398px phone panel,
  and `.report` clips overflow, so the later months were unreachable.
- **Root cause (header).** `.metricReportHeaderMain` is a wrapping desktop row
  (`title left, PDF action right`). On a phone the title took the first row and
  the PDF block wrapped underneath but kept its desktop
  `max-width: min(280px, 100%)` and `justify-items: end`; the hint kept
  `text-align: right`. `.metricReportPageTitle` also kept `white-space: nowrap`.
- **Change (header).** At `@media (max-width: 900px)` the header becomes a
  single column: stretch-aligned, 14px gap, title allowed to wrap, icon pinned
  at 26px, PDF action `width: 100%; max-width: 340px` with a 46px-tall
  full-width button and centred hint. A `@media (max-width: 560px)` block drops
  the 340px cap so the button spans the phone width. Desktop (>900px) is
  untouched.
- **Change (public trend).** At `@media (max-width: 760px)` in
  `reports.module.css`: `.trendChart` gets `overflow-x: auto`,
  `.trendMonths` gets `min-width: max-content` with a 10px gap, bar gap drops to
  5px and each bar to 14px, so all six months are reachable by swiping instead
  of being clipped.
- **Verification.** Temporary probe routes (real `MetricReportView` +
  `SurveyParticipationStats`, then `MetricReportAnalytics` with synthetic rows
  for all three metrics; both routes deleted after measuring). Chromium at
  320 / 360 / 390 / 430 / 768 / 1024px and RTL at 390px:
  `documentElement.scrollWidth === clientWidth` at every width, zero elements
  crossing the viewport, button 362px wide at 390px, 340px at 768px, and the
  desktop row layout (115px inline button) unchanged at 1024px. Trend strip:
  `overflow-x: auto`, `scrollWidth` 370 inside a 288px window at 390px, scrolls
  to the last month.
  `npx tsc --noEmit` clean. New
  `tests/dashboard/report-mobile-css.test.ts` (5 assertions) plus the existing
  `sentiment-grid-css.test.ts`: 8 passed. No database or deployment effect.

### 2026-11-04 - Dashboard: sentiment stat tiles overflowed the card on phones (NEX-1260)

- **Report.** In the CX dashboard "Sentiment and risk" panel on mobile, the
  second column (Neutral / Risk signals) rendered outside the card. The
  Neutral tile was clipped at the card edge and the page scrolled sideways.
- **Root cause 1 (cascade).** The tile chrome was written as
  `.sentimentStats div`, specificity 0,1,1. That also matched the stat badge and
  the copy block, so it outranked `.sentimentStatCopy`'s `display: grid`
  (0,1,0) and replaced it with a flex row. The score and its label were laid out
  side by side instead of stacked, which is what inflated each tile's
  min-content width to ~183px.
- **Root cause 2 (grid).** `grid-template-columns: repeat(2, 1fr)` resolves to
  `minmax(auto, 1fr)`, so each column retained a min-content floor and could
  not shrink. At 320-390px the two ~183px columns needed 371px inside a 246px
  row, so the second column overflowed the panel (`scrollWidth` 371 vs
  `clientWidth` 246).
- **Change.** `.sentimentStats div` became `.sentimentStats > div` (the copy and
  badge get their declared `display: grid` back), the tile rule gained
  `min-width: 0`, and the columns are now
  `repeat(2, minmax(0, 1fr))`. No markup change.
- **Visual effect.** Number above label inside each tile, as the stylesheet
  already declared, instead of inline. Desktop stays a 2x2 grid.
- **Verification.** Chromium at 320 / 360 / 390 / 430 px and RTL at 390px:
  `documentElement.scrollWidth === clientWidth` (no horizontal scroll), panel
  `scrollWidth === clientWidth`, columns 119px at 320px, and no tile crosses the
  card edge. Added `tests/dashboard/sentiment-grid-css.test.ts` (asserts the
  direct-child selector and the `minmax(0, 1fr)` columns) because jsdom applies
  no CSS module. `tests/dashboard/sentiment-grid-css.test.ts` 2 passed, `tsc`
  clean. Full suite: 545 passed / 12 failed — the same 12 failures
  (`cx-dashboard.test.tsx`, `survey-invite-tracker-route.test.ts`,
  `admin-route.test.ts`, Prisma/session mocks) reproduce on a stashed clean tree,
  so they pre-date this change. No database or deployment effect.

### 2026-11-04 - Mobile intro: three lines instead of two (NEX-1259)

- **Report.** On phones the shell intro paragraph was clamped to two lines and
  cut mid-word ("…the quality of our servic…"), with an ellipsis.
- **Change.** `.intro p` keeps its two-line clamp at 681px and up, but inside
  the existing `@media (max-width: 680px)` block it now uses
  `-webkit-line-clamp: 3`. Nothing else about the intro changes; the base rule
  and the `.intro` measure (820px) stay as they were.
- **Why 680px.** That is the existing phone breakpoint in this stylesheet (it
  also swaps the banner and stacks the mode paths), so the clamp now changes at
  the same point as the rest of the mobile layout.
- **Verification.** Chromium at 320 / 360 / 390 px: `-webkit-line-clamp: 3`,
  three rendered lines, and English now truncates on a whole word ("service…").
  Arabic fits its full copy in three lines at those widths. At 681 / 768 / 1280
  px the clamp stays 2 and the copy renders on one or two lines. `tsc` clean,
  `tests/survey` 147 passed.

### 2026-11-04 - Rating scale: the chosen band was dimmed with the others (NEX-1258)

- **Report.** In typed mode, picking a score faded the *selected* band's smiley
  and label, instead of leaving it lit while the others recede.
- **Cause.** CSS specificity, not the state logic. `data-active="true"` was set
  correctly on the chosen band, but the dim rule
  `.ratingScale[data-rated="true"] .ratingScaleRegion` (0,3,0) outranked the
  restore rule `.ratingScaleRegion[data-active="true"]` (0,2,0), so every band
  computed to `opacity: 0.32` — including the chosen one. Measured in Chromium:
  low/mid/high all `0.32` with `data-active="true"` on `high`.
- **Fix.** The dim rule now excludes the active band structurally:
  `.ratingScale[data-rated="true"] .ratingScaleRegion:not([data-active="true"])`.
  There is no restore rule to lose the cascade any more, so the fix cannot be
  undone by specificity. Verified: chosen band `opacity: 1` + face `scale(1.22)`,
  others `0.32`, on CSAT/CES/NPS.
- **Why it slipped.** The existing unit test only asserted the `data-active`
  attribute, and jsdom never applies the CSS module (computed opacity is empty),
  so a cascade bug is invisible to it.
- **Regression guard.** New `tests/survey/rating-scale-css.test.ts` parses
  `survey.module.css` and fails if any rule dims rating regions under
  `[data-rated="true"]` without `:not([data-active="true"])`. Mutation-checked:
  restoring the old two-rule form fails the test.
- **Verification.** `tsc` clean; `tests/survey` 147 passed; Playwright probe on
  the live dev server across CSAT/CES/NPS with screenshots of each scale.
- **Note (pre-existing, unrelated).** `tests/e2e/survey.spec.ts` is stale on
  this branch: its helper waits for "Choose how you would like to respond" and
  other copy that the UI overhaul replaced, so the Playwright suite is red
  independently of this change. Screenshot baselines must be regenerated on
  Ubuntu/Chromium per `playwright.config.ts`. **Follow-up:** refresh the e2e
  selectors and baselines.

### 2026-11-04 - Arabic/RTL localisation pass: titles, aria labels, review layout, survey copy (NEX-1257)

- **Problem.** Client review of the Arabic experience reported a second batch:
  English leaking into Arabic mode (tab title, banner alt, "Live voice orb",
  "Choose English"), layout faults (NPS band range wrapping, duplicate review
  heading, RTL email, URL placeholder direction, footer punctuation), and copy
  issues in the fixed survey text (CES first-person wording, duplicate CES
  labels, NPS metric name, harsh "المنتقدون", brand name drift).
- **Document shell.** New `lib/survey/use-localized-document.ts` hook sets
  `document.title` and `<html lang>` from the active locale. It deliberately
  does **not** touch `<html dir>`, because the survey and testimonial shells
  already set `dir` on their own containers and a root direction would mirror
  them twice. Wired into `SurveyExperience` (uses
  `shell.documentTitle`) and `TestimonialReviewExperience` (uses
  `copy.documentTitle`), so the tab title follows the switcher on both routes.
- **Copy added.** `shell.documentTitle`, `shell.bannerAlt`,
  `voicePicker.chooseEnglish` / `chooseArabic`, `voice.orbLabel`;
  `TestimonialCopy.documentTitle`. The voice-picker tiles now take their
  description and screen-reader action from the locale instead of hardcoded
  Arabic, so an English UI announces "Continue in Arabic / Choose Arabic".
- **Aria.** `VoiceOrb` gets `label={copy.orbLabel}` at both call sites
  (default stays "Live voice orb" for other callers). Rating radios now use
  `"<label> — <score> / <max>"`, so 6 and 7 on the CES scale are distinct even
  though both read "سهل جداً", without changing any visible text.
- **Scale bands.** `ScaleBand` now carries `label` + `range` separately;
  `MetricScaleRating` wraps the range in `.ratingScaleRegionRange`
  (`white-space: nowrap; unicode-bidi: isolate`). Arabic "المروجون (9–10)"
  no longer splits into "(9–" / "10)"; the band name may still wrap above an
  intact range (verified at 320 / 390 / 1280 px, no overflow).
- **Review step.** The right-panel `h3` is no longer rendered on the review
  step; `SurveyStepLayout` takes an optional `headingId`, so `aria-labelledby`
  now points at the left-panel `h2`. The heading renders once at every
  breakpoint (previously twice on mobile and in the a11y tree on desktop).
  Removed the dead `.reviewDesktopHide` rule.
- **RTL fields.** `.reviewEmail` gets `unicode-bidi: isolate` + `text-align:
  start`. The testimonial video URL input keeps `dir="ltr"` (URLs must not
  mirror) but is right-aligned inside the RTL card via
  `[dir="rtl"] .urlInput { text-align: right }`.
- **Arabic copy (client-approved wording).**
  - CES question → second person: "إلى أي مدى توافقون على أن RSM الكويت
    سهّلت لكم الحصول على الخدمة والدعم الذي احتجتموه؟".
  - NPS metric name → "مؤشر صافي الترويج" (was "صافي نقاط الترويج").
  - Detractors → "غير المروّجين" everywhere (per-score labels + band label +
    `npsDetractors`), chosen by the client over "المنتقدون".
  - Brand name normalised to "RSM الكويت" (was "RSM في الكويت") in the shell
    brand title, intro, CSAT/CES/NPS questions and every testimonial string
    including the footer.
- **Banner.** The top banner is baked into
  `public/Frame-1171276008.png` / `Frame-117127598111.png`, so it cannot be
  localized in CSS. Client chose to keep the English artwork for now; only the
  alt text is localized. **Follow-up:** supply Arabic banner art (or approve an
  Arabic tagline for an HTML banner) before the Arabic launch.
- **Tests.** Updated `tests/survey/rating-scale.test.tsx`,
  `tests/survey/survey-experience.test.tsx` and
  `tests/testimonials/review-experience.test.tsx` for the new aria-label
  format, the locale-driven picker hints and the new brand string.
  `tests/survey` = 145 passed; `tests/testimonials` pass except the
  pre-existing `admin-route` auth-mock failures (`getSessionPermissions`
  missing from the `@/lib/auth` mock), which also affect the dashboard suite.
- **Verification.** `npx tsc --noEmit` clean. Playwright: EN/AR tab titles
  switch on the survey and testimonial routes, `<html lang>` follows, picker
  aria text is Arabic in Arabic mode, review step has exactly one
  `يُرجى مراجعة إجاباتكم`, NPS ranges stay intact at 320/390/1280, testimonial
  URL input is `direction: ltr` with `text-align: right`.
- **Open.** The reported "footer full stop on the wrong side" and "review email
  left-aligned" could not be reproduced at 320/390/768/1280 in Chromium: the
  testimonial footer's `©` and `·` resolve to the RTL-correct positions and the
  email already right-aligns inside the card. Both got the isolation hardening
  above; a screenshot is needed to pin the exact fault if it persists.

### 2026-11-04 - Typed-tile face preview: smile stays on the left in Arabic (NEX-1256)

- Client pointed at the mode-chooser typed tile in Arabic: under `dir=rtl` the
  whole preview mirrored, so the frown sat at the left edge and the smile at
  the right. The face scale should read the same in both languages — smile
  always on the visual left.
- Root cause: the scale is absolutely positioned with logical offsets
  (`inset-inline-start`) inside the RTL survey body, so it inherited the page
  direction. `ModeTypedPreview` also carried `isRtl` branches that mirrored
  pointer and arrow-key mapping.
- `components/survey/survey.module.css`: `.modeTypedTrack` now pins
  `direction: ltr`, so the nodes' `inset-inline-start` resolves to the physical
  left and the fill's `inset-inline-end` stays on the frown (right) edge in
  Arabic too.
- `components/survey/ModeTypedPreview.tsx`: removed the dead direction checks —
  pointer mapping is `4 - fromLeft` again and arrow keys are physical
  (right/down lowers, left/up raises) in both languages. `Home`/`End` unchanged.
- Verified in dev on `/survey`: EN nodes at x = 269/200/131/67/0 for Rating
  1→5 (smile x=0); AR page `direction: rtl`, track `ltr`, identical node x
  positions, fill still anchored on the right edge. Synthetic pointerdown at
  the leftmost face in Arabic selects "Rating 5 of 5". `npx tsc --noEmit`
  clean; `npx vitest run tests/survey/` 133/134 — the one failure
  (`survey-experience.test.tsx:220`, "Found multiple elements with the text
  <CSAT question>") comes from the in-progress typed two-column work on this
  branch rendering the question in both panes, not from this change.

### 2026-11-04 - Typed survey: static labelled scale replaces the drag slider (NEX-1255)

- Clients found the slider hard to understand: the range was only discoverable
  by dragging, the handle was deliberately hidden until first interaction, and
  the large face/score readout competed with the question.
- Replaced it with the static scale from `nps-scale-static.html`:
  `components/survey/MetricScaleRating.tsx` (new) renders a band strip — one
  face per band, labelled with its range and spanning the numbers it covers —
  above one tile per score. `SurveyRatingScale.tsx` (renamed from
  `SurveySliderRating.tsx`) supplies the per-metric band spans: NPS 7/2/2,
  CES 3/1/3, CSAT 2/1/2, which always sum to the column count so bands align
  over their numbers.
- Selection is a real `<input type="radio">` group inside a `<fieldset>`, one
  group per question field, so keyboard arrows and screen readers behave
  normally and the checked state is native, not painted. The radio is
  transparent and overlays its tile, which makes the whole number the hit area.
  The fieldset is named with `aria-label` rather than a `<legend>` because the
  question is already rendered in the left step panel and a legend duplicated
  that text (it broke `getByText(SURVEY_QUESTIONS[0].question)`).
- Chosen tile fills with its band colour (grey / blue / green); the chosen band
  stays lit while the others dim to 0.32 opacity and its face scales to 1.22.
  Tile `aria-label` keeps the `"5: Very Satisfied"` shape so existing
  `getByLabelText(/^5:/)` queries and assistive tech both keep working.
- Deleted `MetricSliderRating.tsx` and `SurveySliderRating.tsx`, plus the
  `.ratingSlider*` CSS, the `sliderNotRated` / `sliderDragHint` copy in both
  locales, and the low/high end labels (the band strip carries that meaning).
- RTL verified by measurement: in Arabic the numbers run right→left (score 1
  at the right edge) and each band strip sits exactly over its numbers.
- Mobile: tiles are 44px tall on desktop; at ≤560px the scale reclaims 18px of
  the step's side padding so 11 numbers stay ≥24px wide (24.9px at 360px,
  27.6px at 390px) instead of the ~22px the plain column allowed.
- Added `tests/survey/rating-scale.test.tsx` (tile counts 11/7/5, single radio
  group, selection callback, checked-on-revisit, band labels EN + AR, dimming).
- Verified: `tsc --noEmit` clean; `vitest run tests/survey` 145 passed; browser
  checks on CSAT/CES/NPS desktop, 390/360/320 mobile and Arabic RTL, no
  horizontal overflow. Full suite still has the same 12 pre-existing failures in
  `tests/dashboard/*` and `tests/testimonials/admin-route.test.ts` (missing
  `getSessionPermissions` in their `@/lib/auth` mocks). Review step unchanged
  and still renders scores, band pills and comments.
- No database or deployment effect.

### 2026-11-04 - Privacy notice: widen the measure so it is not a narrow column (NEX-1254)

- Client asked why the notice had "such low max width". The size was a
  deliberate consequence of the two-line ceiling: `80ch` (≈649px) forced the
  copy into two balanced lines. The copy needs ≈752px to sit on one line at
  `0.86rem`, so any two-line block is necessarily ≤~750px wide.
- Changed the paragraph to `width: 100%; max-width: min(100%, 60rem)` (960px):
  the statement now spans the available width and renders on **one** line on
  desktop, two lines on tablet/mobile. Still never more than two.
- Verified line count (block height ÷ line-height, plus glyph-baseline binning)
  and paragraph centre delta 0 at 1920/1600/1440/1280/1024/900/768/600/560/
  480/414/390/375/360 in EN and AR, and `/login` at 1920/1440/1024/768/390.
  No horizontal overflow anywhere.
- Tradeoff to remember: two lines and a wide block are mutually exclusive here
  because the copy is fixed. Widening inevitably collapses it to one line.
- CSS-only change; no test or type changes.

### 2026-11-04 - Privacy notice trimmed to a maximum of two lines (NEX-1254)

- Follow-up to the shared privacy notice: it rendered 3 lines at desktop,
  4 on `/login` and 4 on phones. The client asked for a hard ceiling of two
  lines.
- Rewrote `shell.privacy` in `lib/survey/voice-locale.ts` to a compact form that
  keeps all three original facts (confidentiality, the voice audio processor,
  and who can see the feedback) while dropping filler:
  - EN: "Confidential. Voice audio goes to our provider. Only authorised RSM
    Kuwait CX team sees your feedback."
  - AR: "سري. يُعالج الصوت لدى مزوّد الخدمة الصوتية. لا يطّلع على ملاحظاتكم سوى
    فريق CX المعتمد في RSM الكويت."
  The wording is shortened, not re-scoped: no new claim was added and no
  disclosure was dropped. The Arabic is a tightened translation of the same
  three facts.
- Layout: paragraph `max-width` is now `80ch` (was `74ch`) with
  `text-wrap: balance`, so each language breaks into two even lines instead of
  one long line. Phone sizes drop to `0.75rem`, and `<=380px` to `0.71rem`
  with a smaller inset. `/login`'s `.notice` widened to `min(100%, 34rem)` so
  the card column can hold two lines.
- Verified line counts at 1440/1280/1024/768/480/414/390/375/360 in EN and AR,
  plus `/login` at 1440/1024/768/390: every case is exactly 2 lines, paragraph
  centre delta 0, no horizontal overflow.
- `tsc --noEmit` clean; `vitest run tests/survey` 138 passed (test copy
  assertions updated to the new EN/AR strings).

### 2026-11-04 - One shared privacy notice across login + survey (NEX-1254)

- Privacy messaging was inconsistent: the survey shell had a confidentiality
  sentence with no policy link, `/login` had no privacy notice at all, and the
  statement was left-aligned with the lock icon as a separate flex item, so the
  text sat 16px off-centre.
- Added `components/PrivacyNotice.tsx` + `PrivacyNotice.module.css` as the
  single source of truth. It composes the existing confidentiality sentence
  with "Read our Privacy Notice" (AR: "اقرأوا إشعار الخصوصية") linking to
  `https://www.rsm.global/kuwait/privacy-notice`. The URL is exported as
  `RSM_PRIVACY_NOTICE_URL` so it cannot drift from the published page. The link
  uses `target="_blank"` + `rel="noopener noreferrer"` so mid-survey readers do
  not lose progress.
- `SurveyShell` renders it, which covers the homepage/mode chooser, every typed
  form step, the voice host picker and active voice call, review and thank-you.
  `/login` renders the same component under the card (`flex-direction: column`
  on `.page`).
- Centring: the lock icon moved from a sibling flex item to an inline element
  inside the paragraph, and the paragraph is `max-width: 74ch; margin: 0 auto;
  text-align: center`. Verified `centredDelta` is 0 (was 16px) on desktop,
  390px mobile and the login card.
- Copy lives in `lib/survey/voice-locale.ts` as `shell.privacy` +
  `shell.privacyLinkLabel` for EN and AR; the component sets `dir="rtl"` for
  Arabic. Removed the now-dead `.privacy` / `.rtl .privacy` rules from
  `survey.module.css`.
- Added `tests/survey/privacy-notice.test.tsx` (link target/rel, single
  statement, EN+AR, single notice inside `SurveyShell`).
- Verified: `tsc --noEmit` clean; `vitest run tests/survey` 138 passed; browser
  probe found exactly one notice with the correct href on `/survey`,
  `/login`, typed steps 1-2 and the voice picker, with no horizontal overflow
  at 360-390px. Full suite still has the same 12 pre-existing failures in
  `tests/dashboard/*` and `tests/testimonials/admin-route.test.ts` (missing
  `getSessionPermissions` in their `@/lib/auth` mocks) — confirmed identical on
  a clean tree, unrelated to this change.
- No database or deployment effect. Dev-only note: the machine ran out of disk
  during this task; `~/.npm/_cacache` (18 GB) was cleared to recover space.

### 2026-11-04 - Compact mobile banner on the survey shell (NEX-1253)

- The survey shell showed the wide 3.2:1 banner (`Frame-1171276008.png`) at
  every width. On a phone it collapses to a ~120px strip and the headline is
  unreadable, so the client asked for the compact 16:10 art on mobile.
- `public/Frame 117127598111.png` (2560x1600, 4.0 MB) was untracked and its
  filename contained a space. Renamed to `public/Frame-117127598111.png` so it
  has a URL-safe path (`next/image` encodes the space anyway, but the URL stays
  cleaner and matches the existing `Frame-1171276008.png` convention).
- `SurveyShell` now renders both banners: the wide one keeps `loading="eager"`
  + `fetchPriority="high"` (it is the LCP element on desktop), the compact one
  is lazy so mobile-only art is not fetched on desktop. CSS swaps them at the
  existing `max-width: 680px` breakpoint via `.headerBannerWide` /
  `.headerBannerCompact`.
- Note: the 4.0 MB source is a placeholder-sized export. `next/image` re-encodes
  to AVIF/WebP per request, so the wire cost is a fraction of that, but the
  original should still be re-exported smaller before production.

### 2026-11-04 - Review step artwork overflow fix (NEX-1252)

- Bug: on the review step the metric artwork rendered 178px tall inside its
  106px box and painted over the score, hiding the ratings. The card used
  `height: 100%` on the `<img>` inside a grid track with no definite height, so
  the percentage did not resolve and the 512px PNG fell back to full card width.
- Fix in `survey.module.css`: fixed `80px` height on both `.reviewCardArt` and
  `.reviewCardArt img` (never a percentage), plus `flex: none` so the art box
  cannot be squeezed.
- Verified by measuring geometry in the browser, not just by eye: artwork
  80x80 at `top 432 / bottom 512`, score at `top 520` — no overlap on all three
  cards; same at 390x844 with RTL (quote border on the inline-start side, no
  horizontal overflow).
- Follow-up: an e2e geometry guard was drafted in `tests/e2e/survey.spec.ts`
  but removed because the typed-survey entry click does not take effect under
  Playwright on this branch, so it could not pass reliably. The repo's shared
  `openSurvey` helper is also stale (it asserts the pre-overhaul mode-chooser
  heading), so the whole e2e spec needs updating before guards can be added.

### 2026-11-04 - Review step follow-up: use the CX PDF metric illustrations (NEX-1252)

- Follow-up to the entry below. The first pass drew bespoke SVG visuals, which
  read as off-brand next to the rest of the survey. The client asked for the
  artwork already used in the CX PDF reports and pointed at
  `public/metrics/*.png`.
- `public/metrics/{csat,ces,nps}.png` are the same illustrations as the PDF
  sources in `pdf-files/cx_report/assets/` (`csat_smiley_v3.png`,
  `nps_fan_art.png`, `ces_bands_art.png`) and are already web-served, 512px,
  transparent, and used by `MetricKindIcon` as the 24px metric logos. Reused
  them directly instead of copying new assets into `public/`.
- `SurveyReviewSummary` now renders one `<img src="/metrics/<metric>.png">` per
  card (decorative `alt=""`, `aria-hidden`, article carries the metric name)
  and the hand-drawn SVG helpers were deleted. Card layout is now centred like
  the PDF blocks: accent top bar, centred two-line-safe title, 106px artwork,
  big score in the metric colour, band pill, then the comment in a tinted
  quote box with a metric-coloured inner border.
- `tests/survey/review-summary.test.tsx` now asserts the three `src` values and
  that no SVG is used.
- Verified: `tsc --noEmit` clean; `vitest run tests/survey
  tests/dashboard/rating-visuals.test.ts` 145 passed; targeted eslint clean.
  Browser check at 1440x1000 (three cards, artwork loaded at 176px natural 512),
  390x844, and Arabic RTL (cards mirrored, quote border on the inline-start
  side).

### 2026-11-04 - Typed survey review step: scored metric cards instead of a plain list (NEX-1252)

- User feedback: the last typed step ("review your answers") showed the scores
  and comments as a plain grey list; they asked for a card view like the RSM
  CSAT/NPS/CES reference (metric title, visual, big score, caption).
- New `components/survey/SurveyReviewSummary.tsx`:
  - Respondent card: navy initials avatar, "Respondent" eyebrow, name,
    "Designation · Company", email.
  - One card per metric with a top border in the metric identity colour
    (CSAT `#3f9c35`, NPS `#009cde`, CES `#888b8d`), the approved full name plus
    acronym as the title, a visual, the raw score (`4 / 5`), a band pill, and
    the comment as a quoted line (italic "No comment provided" when empty).
  - Visuals are hand-drawn SVG and encode the actual score: CSAT face whose
    mouth bends with the rating, NPS 0–10 radiating fan with the chosen
    segment emphasised plus a thumbs-up, CES 1–7 segmented arc with a needle
    and pivot on the chosen score. No aggregate %, target, or "pts below"
    is shown — those reference numbers are portfolio aggregates and RSM
    target policy, neither of which exists for a single response.
  - Band labels reuse the approved per-rating copy
    (`csatRatingLabels` / `cesRatingLabels` / `npsRatingLabels`), so the card,
    the slider name, and the review agree.
- `lib/rating-visuals.ts`: added `metricBand()` (CSAT 1–2/3/4–5, CES
  1–3/4/5–7, NPS 0–6/7–8/9–10) plus `METRIC_BAND_COLORS`, and
  `MetricSliderRating` now calls the shared helper instead of its private
  copy, so the slider zones and the review cards cannot drift.
- `survey.module.css`: replaced the old `.review` block with the summary /
  identity / card styles (logical `border-inline-start`, `text-align: start`,
  `repeat(auto-fit, minmax(190px, 1fr))` grid, two-line title min-height so
  visuals and scores align across cards).
- Tests: `tests/survey/review-summary.test.tsx` (one card per metric, scores,
  bands, empty-comment fallback, single respondent label, order) and a
  `metricBand` / `METRIC_BAND_COLORS` case in
  `tests/dashboard/rating-visuals.test.ts`.
- Verified: `npx tsc --noEmit` clean; `npx vitest run tests/survey
  tests/dashboard/rating-visuals.test.ts` 145 passed; targeted eslint clean.
  Browser check on `/survey` at 1440x1000: three 212px cards, all internal
  rows aligned (title 19, visual 67, score 153, band 199, comment 238), all
  three SVGs render, no horizontal overflow at 390px (single 298px column),
  and the Arabic step stays RTL with cards mirrored right-to-left and Arabic
  titles/bands.

### 2026-11-04 - Arabic/RTL survey + testimonial polish batch (NEX-1251)

- User-reported UAT batch on `feature/survey-ui-overhaul-uat` (9 items). All
  addressed:
  1. Arabic typed step 1 repeated "نبذة عنكم" in the left panel and above the
     form, and the intro sentence appeared twice. `lib/survey/voice-locale.ts`
     now mirrors the English split: left `identityTitle` "من نتحدث إليه؟" with
     its own `identityIntro`, right `identityFormHeading` "بياناتكم" with
     `identityFormSubtitle` "يُرجى إكمال الحقول الأربعة كاملة.". Both are
     translations of the already-approved English UI copy (no new survey
     content).
  2. Arabic sliders: `.ratingSliderInput` filled with
     `linear-gradient(to right, …)`, but a native range input under
     `direction: rtl` runs right→left, so the green bar did not meet the
     handle. Added `.rtl .ratingSliderInput` with the mirrored `to left`
     gradient. Verified at 1440x900 in Arabic: CSAT 4 → `--p: 75%` filled from
     the right, CES 5 → 66.67% from the right.
  3. Testimonial page had no language support. `lib/testimonials/review.ts`
     now selects `Response.language` and returns it; new
     `app/testimonial/[token]/testimonial-copy.ts` holds EN/AR copy and
     `TestimonialReviewExperience.tsx` defaults to the respondent's language,
     offers an EN/AR switcher, and sets `dir="rtl"` + `lang` on `<main>` so
     the draft textarea and consent fields render RTL.
  4. Testimonial chrome: dropped the English-only banner image; added an RSM
     header (logo + language switch), a footer, a full-width white page with a
     980px column (no grey/narrow strip), larger 24px radios/checkboxes with
     14px spacing, and larger controls/spacing in `review.module.css`.
  5. Review step: left panel body repeated the "Respondent"/"المشارك" card
     label. `leftColumnForStep` now returns an empty body for step 5 and
     `SurveyStepLayout` skips the body paragraph when it is blank.
  6. Slider labels: band labels 0.82rem → 0.95rem (mobile 0.58rem → 0.8rem),
     end labels 0.7rem → 0.88rem in `#575756` (mobile 0.82rem), and unselected
     bands dim to 0.75 instead of 0.35 after a rating.
  7. Unified step badges: the typed left panel replaced the "STEP X OF 5"
     pill with the same 2.15rem square numeral badge as the voice pages
     (`02`), keeping the full "Step X of N" text as visually hidden copy for
     screen readers.
  8. Arabic landing intro: the `بـ RSM` marker was non-breaking but kept its
     space. `withNonBreakingArabicBrandJoin` now renders `بـRSM` as one
     non-breaking span; measured in the browser with no space character and
     adjacent glyph boxes (0 gap).
  9. Left navy panel balance: `.splitIntroCopy` gets `margin-block: auto`, so
     the heading/body sit in the middle of the space under the brand lockup
     instead of hugging the top (desktop CSAT step: 147px above vs 163px
     below the copy; step 1 keeps the identity preview pinned at the bottom).
- Tests: added `tests/testimonials/copy.test.ts` (every EN/AR string present,
  Arabic stays Arabic) and `tests/testimonials/review-experience.test.tsx`
  (RTL default from `language`, no English fallback, switcher keeps the draft,
  locked state localized). Extended `tests/survey/voice-locale.test.ts` to
  assert the identity copy is not duplicated in either language.
- Verified: `npx tsc --noEmit` clean; `npx vitest run tests/survey
  tests/testimonials` 153 passed with the 2 pre-existing
  `tests/testimonials/admin-route.test.ts` authz-mock failures; targeted
  eslint clean apart from the pre-existing `<img>` logo warning. Browser
  checks on `localhost:3000/survey` (Arabic): step 1 shows four distinct
  strings, badges read `02`/`05`, review step has no respondent body, and the
  slider fill directions/percentages match the handle. The testimonial page
  was verified through component tests rather than a live token, to avoid
  opening a real private testimonial link.
- Follow-up: Playwright visual baselines under `tests/e2e/**/*-snapshots/`
  will need regeneration (`update_snapshots=true` workflow dispatch) because
  the typed left panel and test ids changed visually.

### 2026-11-04 - Voice ready screen: auto-scroll controls into view + ask for Start (NEX-1248)

- User feedback: on the voice survey step that follows the English/Arabic host
  picker, the Back / **Start voice survey** buttons and the "use typed survey"
  link sit below the fold; and the instruction never says to press Start.
- `components/survey/VoiceSurvey.tsx`: added `readyStageRef` on the
  `.voiceReadyStage` container plus a mount effect that scrolls the window so
  the stage bottom (controls + typed fallback) clears the viewport bottom by
  20px. It measures on the next animation frame and again after 600ms (entry
  fade-up animation, font swap, and orb mount still change the panel height),
  skips the scroll when the stage is already fully visible, and uses instant
  scrolling under `prefers-reduced-motion`. No change to the connected call
  stage.
- `lib/survey/voice-locale.ts`: extended `voice.agentIdle` (the ready-screen
  instruction caption) in EN ("When you are ready, choose Start voice survey
  to begin.") and AR ("عندما تكونون مستعدين، اختاروا «بدء الاستبيان الصوتي»
  للبدء."), built from the already approved `start` / `statusReady` wording.
- `tests/survey/voice-locale.test.ts`: asserts the instruction contains the
  localized Start button label in both locales.
- Verified: `npx vitest run tests/survey/voice-locale.test.ts` 3/3 passed,
  `npx tsc --noEmit` clean, targeted `eslint` on the changed files shows only
  pre-existing react-compiler errors. Browser check on `localhost:3000/survey`
  (823x552 pane): after choosing the English host the page scrolled to
  scrollY 513 and the Start button sat at 416-456px with 552px viewport height
  (`fullyVisible: true`), i.e. no manual scrolling needed. Arabic uses the same
  code path.
- Full `npm test` still reports the pre-existing 12 failures in
  `tests/dashboard/cx-dashboard.test.tsx`,
  `tests/dashboard/survey-invite-tracker-route.test.ts`, and
  `tests/testimonials/admin-route.test.ts` (DB/auth mocks), unrelated to this
  change.

### 2026-11-04 - Typed-tile face preview: default selection starts on the smile (NEX-1250)

- User asked for the mode-chooser typed tile to open on the smile face instead
  of the neutral middle face.
- `components/survey/ModeTypedPreview.tsx`: extracted `INITIAL_RATING = 4`
  (faces render reversed, so value 4 is the smile) and used it as the
  `useState` initial value instead of the hardcoded neutral `2`. Reordered
  `AUTO_SEQ` to `[4, 3, 2, 1, 0, 1, 2, 3]` so the auto-demo starts on the smile
  and walks down to the frown before returning, rather than jumping 4 -> 3 -> 4
  on the first two ticks.
- Verified: `npx tsc --noEmit` clean, `npx vitest run tests/survey/` 122/122.
  On a fresh `/survey` load the accessibility snapshot shows "Rating 5 of 5"
  `checked`, i.e. the smile face (leftmost) is selected and the fill spans the
  full track.

### 2026-11-04 - Typed-tile face preview: restore reversed (smile-left) order (NEX-1248)

- User asked whether the reversed smiley order on the mode-chooser typed tile
  had been undone. It had — `af86e8b` (NEX-1244) flipped it back to scale order
  (frown at inline-start, smile at inline-end) because line 57 of
  `rsm-voc-technical-fixes-prompt.md` explicitly requested "faces sad to happy
  (left to right in English, mirrored in Arabic)". The auto-demo animation was
  never removed; only the left/right order changed.
- User chose to restore the reversed order, so the tile is back to smile at
  inline-start / frown at inline-end (the `43cdd8d` behaviour), without
  reverting the RTL hardening added later:
  - `components/survey/ModeTypedPreview.tsx`: node position back to
    `pos = 4 - value`; pointer mapping now converts physical x into the logical
    inline index first (`isRtl ? 4 - fromLeft : fromLeft`) and then inverts, so
    dragging still picks the face under the cursor in both directions.
    Arrow keys are now physical-direction aware (right/down lowers the rating
    in English, raises it in Arabic) instead of purely logical.
  - `components/survey/survey.module.css`: `.modeTypedFill` anchor moved from
    `inset-inline-start` to `inset-inline-end` so the fill still starts at the
    frown edge and grows toward the active node (unfills smile -> frown as the
    rating worsens). The `width: calc(current / 4 * (100% - node))` formula is
    unchanged.
- Verified: `npx tsc --noEmit` clean, `npx vitest run tests/survey/` 122/122.
  Browser/CDP geometry check in dev, both languages: LTR fill spans
  frown-centre -> active-node-centre (rating 2: fill 664-730, node centre 663);
  RTL mirrors correctly (rating 4: fill 93-294, nodes running frown x=70 to
  smile x=338). Note: the `width` transition appears frozen when the browser
  tab is backgrounded, so geometry checks need the transition temporarily
  disabled — the component itself is correct.

### 2026-11-03 - Typed survey left panel: CSAT/CES/NPS full names fill empty space (NEX-1247)

- User screenshot showed the CSAT/CES/NPS metric steps (steps 2-4) with a lot
  of empty vertical space below the bare acronym heading and the "1-5 scale"
  caption.
- Added `metricFullNames: Record<"csat"|"ces"|"nps", string>` to the `typed`
  locale copy type in `lib/survey/voice-locale.ts`, EN ("Client Satisfaction
  Score", "Customer Effort Score", "Net Promoter Score" — reusing the exact
  wording already used in the ElevenLabs agent script) and AR ("درجة رضا
  العميل", "درجة بذل الجهد", "صافي نقاط الترويج").
- Added an optional `subheading` prop to `SurveyStepLayout`
  (`components/survey/SurveyStepLayout.tsx`), rendered as a new
  `.splitSubheading` paragraph between the `h2` heading and the scale body
  text; added the CSS rule in `survey.module.css`.
- Wired it through `TypedSurvey.tsx`'s `leftColumnForStep` for steps 1-3:
  `subheading: copy.metricFullNames[definition.metric]`.
- Verified: `npx vitest run tests/survey/` -> 122/122 passed, `npx tsc
  --noEmit` clean. Visually confirmed in dev via browser screenshot/snapshot:
  CSAT -> "Client Satisfaction Score", CES -> "Customer Effort Score", NPS ->
  "Net Promoter Score", each rendered between the acronym and the scale
  caption with no layout overflow.

### 2026-11-03 - Typed survey left-panel overlap fix + headline gray -> #231F20 (NEX-1246)

- User screenshot showed the typed-survey split-left panel's "STEP 1 OF 5" /
  "Five short steps" meta row rendering on top of the RSM logo and "Voice of
  Clients" brand subtitle. Root cause: `.splitBrand` in
  `components/survey/survey.module.css` was `position: absolute` pinned to
  the panel top, while `.splitIntroCopy` (meta pill + heading + body) sat in
  normal flex flow with `.splitLeft { justify-content: center }` — on shorter
  content the centered intro block rose up into the absolutely-positioned
  brand row.
  - Fix: `.splitBrand` -> normal flow (`flex: none`, no `position`/`top`),
    `.splitLeft` -> `justify-content: flex-start` so brand / intro / identity
    preview stack top-to-bottom; the preview card still docks to the bottom
    via its existing `margin-top: auto`. Removed the mobile-only
    `padding-top: clamp(96px, 20vw, 120px)` on `.splitLeft` that had been
    compensating for the old absolute overlap.
- User also asked that any headline text using the dark gray shade be
  `#231F20` exactly (the repo already defines `--charcoal: #231f20`).
  Audited every `color: #575756` in `survey.module.css` and
  `review.module.css`; only `.modeStageHeader h2` (mode-choose headline) and
  `.voiceCallHeader h2` (active-call stage headline) were real headlines
  using `#575756` — both switched to `var(--charcoal)`. Other `#575756` uses
  (body copy, icon fills, link hovers, labels, the testimonial page's
  `.secondary` button) were left as-is — that gray was an earlier deliberate
  choice for body/label text, not headlines.
- Verified: `npx vitest run tests/survey/` -> 122/122 passed. Visually
  confirmed in a local dev server via browser screenshot (overlap gone) and
  CDP `getComputedStyle` on the mode-choose `h2` and typed-step `h3`, both
  returning `rgb(35, 31, 32)` (`#231F20`).

### 2026-11-03 - Rebrand "Voice of Client" -> "Voice of Clients" everywhere, phase 2 (NEX-1245)

- Follow-up to the UI-only pass below: user asked to extend the rebrand to
  "everything" after reviewing the first pass. Expanded to email
  subjects/templates, the ElevenLabs voice-agent system prompt/scripts, docs,
  README/PROJECT_BRIEF/BUILD_CONTEXT/AGENTS headers, `prisma/schema.prisma`
  comment + `prisma/seed.ts` log line, and `docs/postman/*`.
- Changed in `lib/`: `login-otp.ts` (subject + email body heading),
  `survey-thankyou-email.ts` (all 4 subject constants + body strings),
  `survey-invite-templates.ts` (invite/followup subjects),
  `elevenlabs/agent-config.ts` (EN + AR first message, system prompt, intro/
  closing scripts — this changes what the live voice host says), `survey/
  voice-first-message.ts`, `annual-cx-report-pdf.ts`, `scheduled-cx-report.ts`,
  `ai/cx-report-narrative.ts`.
- Changed email HTML in `templates/email/voc-*.html` (6 files: followup-day3,
  followup-day5, login-otp, team-action-required, team-notify, thankyou).
- Changed doc headers/body in `README.md`, `PROJECT_BRIEF.md`,
  `BUILD_CONTEXT.md`, `AGENTS.md`, `RSM_VoC_Full_Implementation_Plan.md`,
  `rsm-voc-copy-update-instructions.md`, `MEMORY.md` (this file's own `#`
  header only — older dated task-history entries below were left verbatim
  per memory hygiene: never rewrite history), and the `docs/` tree (API/
  SRS/VPS/handover docs, `docs/superpowers/plans|specs`,
  `docs/dashboard-walkthrough/`, `docs/postman/*.json`).
- Updated matching test expectations so behavior still passes:
  `tests/dashboard/survey-completion-notify.test.ts`,
  `tests/dashboard/survey-invite-tracking.test.ts`,
  `tests/integrations/survey-invites-route.test.ts`.
- Deliberately left unchanged: `starter/` and `SKILL.md` (read-only per
  project rules), `backups/elevenlabs/*` (point-in-time snapshots),
  `tests/crm/completion-timing.test.ts` (uses `"Voice of Client"` only as an
  arbitrary unrelated fixture string, not a real assertion), `__fixtures__/
  elevenlabs-post-call-transcription.json` (recorded mock transcript data),
  and several untracked stray reference files at the repo root (e.g. `Avra_*`,
  `Voice of Client_Email_VoC.html`, `details-step (2).html`,
  `rsm_kuwait_cx_intelligence_dashboard.html`, `templates/Voice_of_Client_Email_VoC
  (1).html`) that are unused design references, not loaded by the app.
- Verified: `npx vitest run` (full suite) -> 514/526 passed; the 12 failures
  across `tests/dashboard/cx-dashboard.test.tsx`,
  `tests/dashboard/survey-invite-tracker-route.test.ts`, and
  `tests/testimonials/admin-route.test.ts` are pre-existing baseline failures
  confirmed unrelated via `git stash` (missing `getSessionPermissions` mock
  export, etc.), not caused by this change.

### 2026-11-03 - Rebrand "Voice of Client" -> "Voice of Clients" in UI (NEX-1245)

- User asked for the correct plural brand name everywhere. Scoped (per user
  decision, asked explicitly) to **survey-facing and dashboard UI text only**;
  excluded outbound email subjects/templates, the live ElevenLabs voice-agent
  system prompt/script, docs, tests, and `backups/` to avoid regressing sent
  email history, test fixtures, and production voice-agent behavior.
- Changed `Voice of Client` -> `Voice of Clients` (and AR `صوت العميل` ->
  `صوت العملاء`) in: `lib/survey/voice-locale.ts` (`brandSubtitle`,
  `introTitle`, EN+AR), `app/results/[resultToken]/page.tsx` (eyebrow),
  `app/testimonial/[token]/page.tsx` (banner alt text — note: the external
  banner image asset itself was not changed and may still show the old
  wording), `app/layout.tsx` (survey `<title>`), `app/login/page.tsx` (CX
  login copy), `app/widget/reviews/page.tsx` (meta description),
  `components/dashboard/SurveyInviteForm.tsx`,
  `components/dashboard/DashboardOverview.tsx`,
  `components/dashboard/DashboardLeaderboard.tsx`,
  `components/dashboard/MetricReportView.tsx`,
  `components/reports/PublicVocReport.tsx`.
- `starter/components/CxDashboard.tsx` left untouched (read-only per project
  rules). Email templates (`lib/survey-invite-templates.ts`,
  `lib/survey-thankyou-email.ts`, `lib/login-otp.ts`), the ElevenLabs agent
  config (`lib/elevenlabs/agent-config.ts`, `lib/survey/voice-first-message.ts`),
  `lib/annual-cx-report-pdf.ts`, docs, and tests still read "Voice of Client"
  (singular) — a deliberate scope decision, not an oversight.
- Verified: `npx vitest run tests/survey/` -> 122/122 passed.

### 2026-11-03 - Technical/UI fixes batch from `rsm-voc-technical-fixes-prompt.md` (NEX-1244)

- Applied the layout/behaviour/RTL/a11y-only fix list (hard rule: zero
  visible EN/AR string changes — confirmed via `git diff
  lib/survey/voice-locale.ts` being empty).
  1. **Sliders start unrated**: `MetricSliderRating.tsx` now parks the
     (hidden) native thumb at `min` and renders 0% fill until a value is
     chosen; `survey.module.css` adds
     `.ratingSlider[data-rated="false"]` rules to hide the thumb and grey
     the track. `aria-valuetext` already carried the "not rated" copy, so
     no ARIA change was needed.
  2. **Step badges**: unified `.sectionHeading > span` (voice page "3")
     with the existing `.modeStageEyebrow > span` style (navy, 2.15rem,
     2px radius) and changed the two badges in `VoiceSurvey.tsx` from
     `3` to `03`.
  3. **Arabic voice error re-render**: `VoiceSurvey.tsx` now stores an
     error *key* (`localErrorKey`) instead of a resolved string, and
     resolves `copy[localErrorKey]` from the current-render `copy`, so
     the alert re-renders correctly if language toggles while an error is
     shown. Also loosened `.formActions`/`.voiceActions` from a fixed
     `0.72fr 1.5fr` grid to `minmax(100px, auto) minmax(140px, auto)` and
     let the buttons wrap (`white-space: normal`, `height: auto`,
     `padding-block: 9px`) instead of being squeezed.
  4. **RTL punctuation**: `ArabicVoiceChooser.tsx`'s English sample quote
     tile now gets explicit `lang="en" dir="ltr"` so the trailing period
     renders on the correct side inside the RTL picker. `SurveyShell.tsx`
     wraps the literal substring "بـ RSM" from the (unchanged) Arabic
     intro copy in a `.nowrapJoin` (`white-space: nowrap`) span so the
     line never breaks right after "بـ"; `.intro p` also gets
     `text-wrap: balance`.
  5. **Top intro line**: `SurveyShell` takes a new `showIntro` prop;
     `SurveyExperience.tsx` passes `showIntro={mode === "choose"}` so the
     grey intro paragraph only renders on the landing/mode-choose stage,
     not on voice/typed/review/thank-you.
  6. **Thank-you hierarchy + testimonial link**: `.completePanel
     .sectionHeading h2` ("Thank you") is now the largest text on the
     card (`clamp(1.9rem, 4vw, 2.5rem)`, 800 weight); `.completePanel h3`
     (the message sentence) and `> p` are body-size. Removed
     `target="_blank"`/`rel` from the testimonial link in
     `SurveyExperience.tsx` so it opens in the same tab.
  7. **Review step (typed step 5)**: confirmed the RSM logo already
     renders unconditionally for every step via `SurveyStepLayout.tsx`
     (no code change needed there — if it was missing on the live
     deployed URL, that build likely predates the NEX-1241 logo/left-panel
     rework already on this branch). De-duplicated "Respondent" and
     "Please review your answers": both now carry a `.reviewDesktopHide`
     class (visually-hidden-only-at-desktop via `@media (min-width:
     901px)`, kept in the accessibility tree and visible on mobile where
     the panel stacks). Split the job line into two `<small>` lines using
     the existing step-1 field labels (`copy.designation`,
     `copy.company`) instead of a single comma-joined string. Bumped
     `.review > div > span`/`.review article > span` (labels) from
     0.65rem to 0.8rem and `.review > div > small`/`.review article > p`
     ("No comment provided" etc.) to 0.88rem; widened the metric-card
     label columns from 70px/58px to 78px/64px to fit.
  8. **Typed step 1**: changed `.splitActions` from `margin-top: auto`
     (which pinned the buttons to the bottom of the tall split-layout
     column, creating a large gap after Designation) to a fixed
     `margin-top: 28px`. Added a decorative `*` (`aria-hidden`) plus
     `aria-required="true"` to all four identity `Field`s (no native
     `required` attribute, to avoid colliding with the existing custom
     validation/error-focus flow). Confirmed the honeypot field already
     had `aria-hidden="true"` (label), `tabIndex={-1}`, and
     `autoComplete="off"` — no change needed.
  9. **Readability**: `.ratingSliderHint` 0.75rem→0.85rem (color switched
     from `--mid-grey` to the higher-contrast `--body-text`);
     `.ratingSliderBands` 0.68rem→0.82rem. Band underline bars were
     already proportional via per-band `weight` → `fr` grid columns
     (`bandsFor()` in `SurveySliderRating.tsx`) and already used a
     consistent low/mid/high grey/blue/green colour mapping — no change
     needed there. `.languageMark` (Aa/ع) enlarged 22px→28px,
     0.62rem→0.78rem font. The language switcher is one fixed-position
     component shared by every survey mode, so its position was already
     consistent page to page.
  10. **Landing typed-card face order**: `ModeTypedPreview.tsx` positioned
      nodes at `pos = 4 - value` (smile left, frown right — backwards vs.
      the 1–5 scale). Changed to `pos = value` (frown/sad first, smile/
      happy last) and switched the node's inline `left` to
      `insetInlineStart`, and `.modeTypedFill`'s CSS anchor from `right`
      to `inset-inline-start`, so the fill now grows from the sad end
      toward the chosen rating and the whole preview mirrors
      automatically under `dir="rtl"` (Arabic) without extra plumbing.
  11. **Testimonial page** (`app/testimonial/[token]/review.module.css`):
      background white (was `#f6f6f6`) to match the survey frame; `.card`
      gets the same `border-top: 3px solid var(--green)` accent used by
      survey panels; primary button recolored from navy to
      `var(--green)`/`var(--green-d)` hover (secondary button's hover
      state now inverts to navy, matching the survey pattern); "Your
      draft" heading (`.card h2`) bumped to `clamp(1.35rem, 2.6vw,
      1.7rem)` / 800 weight; page `max-width` widened 720px→860px
      (still centered); radio/checkbox inputs sized to 20x20 with
      `accent-color: var(--green)` and 10px gaps between fieldset
      options. Did **not** add new header/footer text (e.g. a CX-login
      link or legal footer line) — see "Needs a wording decision" below.
- **Needs a wording decision** (flagged, not invented): a literal "same
  footer" for the testimonial page would need new copy (e.g. a footer
  link/label) that doesn't exist today; left the existing banner-image
  header as-is and did not add a footer element with invented text.
- Verification: `npx tsc --noEmit` clean; `npx vitest run tests/survey/`
  122/122 passed; `git diff lib/survey/voice-locale.ts` is empty (no
  string changes). `npx eslint` on touched files shows only pre-existing
  `react-hooks/refs` / `react-hooks/purity` / `react-hooks/set-state-in-effect`
  errors in `VoiceSurvey.tsx` and `MetricSliderRating.tsx` that predate
  this change (confirmed via `git stash` + lint-before comparison) —
  not introduced here, left as pre-existing debt. Browser automation
  could not reach the local dev server in this sandbox (network
  isolation), so visual verification at 1280/1920/390px in both
  languages is by code/CSS review only — recommend a manual UAT pass
  before merge.
- No database or deployment changes.

Linear: https://linear.app/nexuses/issue/NEX-1244

### 2026-11-03 - Typed identity step matched to `details-step (2).html` reference (NEX-1243)

- User supplied `details-step (2).html` (a static reference mock for the
  typed survey's first/identity page) and asked to adopt it almost as-is.
  Implemented for step 0 only (does not change CSAT/CES/NPS/Review steps):
  - `SurveyStepLayout.tsx`: added a meta row above the left-panel title
    (step pill now shows a small green dot + a duration chip with a clock
    icon, new `durationLabel` prop) and an optional `identityPreview` card
    rendered at the bottom of the left panel (avatar initials or a person
    icon, name, role · company, email, shimmer skeleton placeholders for
    empty fields, and a green checkmark badge once all four identity
    fields are valid).
  - `TypedSurvey.tsx`: passes `durationLabel={locale.modeChooser.typedDuration}`
    (reused existing copy, no new string) and a live `identityPreview`
    object (name/role/company/email/complete) computed from form state,
    only for step 0. Right-panel heading for step 0 is now
    `copy.identityFormHeading` ("Your details") with a new
    `copy.identityFormSubtitle` line ("Please complete all four fields."),
    decoupled from the left-panel headline (`copy.identityTitle`, now
    "Who are we hearing from?") and lede (`copy.identityIntro`, updated to
    match the reference copy). Added `isIdentityComplete()` helper
    (name length, email regex, company/designation length) mirroring the
    reference's validation used only to drive the preview checkmark.
  - `voice-locale.ts`: added `identityFormHeading` / `identityFormSubtitle`
    to the `typed` copy type, both locales. EN uses the reference's new
    copy; AR intentionally reuses the already-approved `identityTitle` /
    `identityIntro` Arabic strings (no new Arabic text invented) per the
    project rule against inventing Arabic copy.
  - `survey.module.css`: new `.splitMeta`/`.splitPillDot`/`.splitDuration`
    (meta row), `.splitPreview`/`.previewCard*`/`.previewAvatar*`/
    `.previewText`/`.previewLine` (+ shimmer keyframes)/`.previewRole`/
    `.previewMail`/`.previewCheck` (preview card), and
    `.splitQuestionSub` (right-panel subcopy under the h3).
- Verification: `npx tsc --noEmit` clean; `npx eslint` on the three changed
  files (0 errors, 1 pre-existing `<img>` warning); `npx vitest run
  tests/survey/` 122/122 passed. Browser automation could not reach the
  local dev server in this sandbox (network isolation), so visual
  verification was by code/CSS review only — recommend a manual UAT check
  on `/survey` (desktop + mobile, EN + AR) before merge.
- No database or deployment changes.

Linear: https://linear.app/nexuses/issue/NEX-1243

### 2026-11-03 - Typed left-panel gradient rebalanced to navy-majority; text color changed to #575756

- `.splitLeft` gradient (typed survey left panel) in
  `components/survey/survey.module.css` had too much of the lighter
  blue (`var(--blue)` reached at 135%, i.e. ~74% of the way across the
  panel). Changed to `linear-gradient(165deg, var(--navy) 0%,
  var(--navy) 70%, var(--blue) 140%)` so the panel reads as solid navy
  with only a small blue accent in the far corner.
- All 23 occurrences of `color: #000;` in `survey.module.css` (added by
  the earlier "swap navy text to black" task) changed to
  `color: #575756;` per updated direction — backgrounds/borders/fills
  and the one unrelated `mask-image: ... #000 ...` (Orb mask, not text
  color) were left untouched.
- Verification: `npx tsc --noEmit` (clean), `npx vitest run
  tests/survey/` (122 passed), manual browser screenshot confirms the
  navy-majority gradient and `getComputedStyle` confirms the mode
  chooser heading renders `rgb(87, 87, 86)` (#575756).

Linear: https://linear.app/nexuses/issue/NEX-1241 (follow-up)

### 2026-11-03 - Build, commit, and push all pending work on `feature/survey-ui-overhaul-uat`

- Ran `npm run build` on the full accumulated working tree (survey UI
  overhaul, partner CX report, testimonial copy polish). It initially
  failed TypeScript checking on `components/survey/MetricSliderRating.tsx`
  (`SVGSVGElement` has no `offsetWidth` in this TS DOM lib version);
  fixed by swapping the reflow-forcing read to
  `faceRef.current.getBoundingClientRect().width`. Build then succeeded.
- Ran the full test suite (`npx vitest run`): 514 passed, 12
  pre-existing failures confined to
  `tests/dashboard/cx-dashboard.test.tsx`,
  `tests/dashboard/survey-invite-tracker-route.test.ts`, and
  `tests/testimonials/admin-route.test.ts`. Confirmed via `git stash`
  that these same 12 failures reproduce on the last committed HEAD
  (`4e9aec8`) with no working-tree changes applied, i.e. they predate
  this session and are unrelated to any of today's or the
  already-staged partner-report/testimonial changes. Follow-up needed:
  the testimonials admin-route tests mock `@/lib/auth` without
  `getSessionPermissions`, and the dashboard tests look for copy
  (`"All time"` etc.) that no longer matches the current
  `DashboardOverview.tsx` markup — both need a dedicated fix pass, out
  of scope for this push.
- Committed the working tree in four logical commits on
  `feature/survey-ui-overhaul-uat` and pushed to
  `origin/feature/survey-ui-overhaul-uat`:
  1. Survey UI split-screen typed layout + voice/mode chooser polish +
     typed-tile fill-bar fix (`43cdd8d`).
  2. Partner CX report PDF + API + dashboard download button
     (`1a06bec`).
  3. Testimonial review page copy polish (`4051f29`).
  4. This documentation update (`PROJECT_BRIEF.md` typed-survey layout
     description refreshed to match the split-screen redesign;
     `MEMORY.md` entry).
- Verification: `npx tsc --noEmit` (clean after the
  `MetricSliderRating.tsx` fix), `npm run build` (succeeds), `npx
  vitest run` (514 passed / 12 pre-existing unrelated failures, see
  above), `git push` succeeded.

Linear: see NEX-1236–NEX-1241 for the individual survey UI issues this
push includes; the partner-report and testimonial-copy work was already
in the working tree from a prior session without a tracked issue.

### 2026-11-03 - Partner-specific PDF download button (3-page partner report)

- New report kind `partner`, alongside the existing period CX / annual / metric
  one-pagers, for showing a single partner their own period results.
- `pdf-files/cx_report`: merged `partner_report.py` (python 3.9-safe, no
  backslashes in f-string expressions), `layouts/partner.json`,
  `plates/partner_p1-3.jpg`, `assets/partner_smiley.png`,
  `data/partner_example.json` from the staging `files/cx_report/` pack (now
  deleted). `build_report.py` dispatches `--type=partner` to `main_partner`,
  using the same `launch_chromium` headless-Chromium args as the other
  kinds. `gauges.py` updated to accept `fan_tag(pct, x, y, w, h, off=None)`
  (partner report tints the unfilled NPS fan differently) and trims the
  translucent halo around the fan artwork — backward compatible, re-smoked
  annual/cx/csat/nps/ces to confirm no visual regression.
- `lib/annual-cx-report-payload.ts`: `buildPartnerCxReportDataJson` filters
  scoped items/invites to one partner for the selected period, derives
  `followup` (raised = responses with risk signals, closed = 0 — no case
  resolution tracking is wired into this field yet), and `value_themes` /
  `improve_themes` from aggregated `keyDrivers` / `riskSignals` text
  (top 2 each, >=2 mentions). `focus` left empty (partner_report.py's
  built-in "follow up with detractors and passives" item is auto-added
  client-side by the python template). `partnerCxFilename(...)`.
- `POST /api/reports/partner-cx`: same permission/scope pattern as
  `period-cx`. Resolves the target partner from the `partner` filter field,
  or — if omitted — from the signed-in user's own already-scoped response
  set (`loadAnnualCxReportSource` honors `responseScopeWhere`/portfolio
  staff-email scoping) when it contains exactly one distinct partner name;
  422 if neither resolves to a single partner, or if there are zero
  responses in range. Partner contact email via
  `lookupStaffContactEmail("partner", name)` (StaffContact table), falling
  back to the general RSM contact defaults in the template.
- UI: `components/dashboard/DownloadPartnerReportButton.tsx` (same
  download-blob pattern as the other buttons). `DashboardOverview.tsx`
  computes `effectivePartnerName` (org.partner filter if set, else the sole
  partner name across all loaded items when exactly one is present) and
  renders the button in the lead action row only when it resolves — this
  covers both "admin filtered to one partner" and "logged in as a
  portfolio/partner user" without needing a client-side session/role check.
- Verification: python smoke (`--type=partner` on
  `data/partner_example.json`, 3-page PDF) plus regression smoke of
  annual/cx/csat/nps/ces after the `gauges.py` change. `npx tsc --noEmit`
  clean (only pre-existing unrelated `MetricSliderRating.tsx` error). New
  `tests/dashboard/partner-cx-route.test.ts` (4 tests: permission gate,
  ambiguous-partner 422, single-partner auto-detect, explicit filter wins)
  plus full existing `annual-cx-report-*`/`period-cx-route` suites all
  green. Full `npx vitest run`: pre-existing unrelated failures only
  (`tests/testimonials/admin-route.test.ts` — confirmed via `git stash`
  that they fail on `main` too, unrelated to this change).
- Follow-up: `focus` items beyond the automatic detractor/passive one, and
  richer theme `quote`/`text` copy (currently generic "Mentioned by N of the
  responses…" placeholders) are not wired to real client comment text —
  revisit if the partner report needs literal client quotes per theme.
  Staging `files/` directory removed after merge.

Linear: https://linear.app/nexuses/issue/NEX-1242

### 2026-11-03 - Mode chooser typed-tile face preview: reversed smiley order

- `components/survey/ModeTypedPreview.tsx` (the decorative face-rating
  illustration on the "Take typed survey" tile) previously rendered frown
  (value 0) on the left through smile (value 4) on the right. Reversed the
  visual order so smile renders on the left and frown on the right: each
  node's visual position is now `pos = 4 - value` (value/color/mouth/aria
  label/current-state logic unchanged), the progress fill width is
  `(4 - current)/4` of the track, and pointer-drag hit testing
  (`pickFromClientX`) converts the clicked position back to `value = 4 -
  pos` so clicking still selects the correct face. Keyboard arrow
  increment direction left as-is (ArrowRight still increases the
  underlying rating value, now moving focus visually leftward).
- Verification: `npx vitest run tests/survey/` (122 passed), `npx tsc
  --noEmit` (only the pre-existing unrelated `MetricSliderRating.tsx`
  error), manual browser screenshot confirms smile-left/frown-right order
  with correct active-state highlight and fill direction.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-03 - Survey text color: navy text swapped to black (backgrounds/borders unchanged)

- In `components/survey/survey.module.css`, every `color: var(--navy)`
  declaration (text/icon-color property specifically, not `background`/
  `border-color`) was changed to `color: #000;` — 25 occurrences across
  headings, body copy, buttons, step indicators, gauge/slider labels, and
  voice-call status text. Navy backgrounds, borders, and fills (e.g. the
  eyebrow badge, avatar circles, step dots, CTA hover fills) are untouched
  since those aren't text color.
- Verification: `npx vitest run tests/survey/ tests/dashboard/metric-icons.test.tsx`
  (124 passed); manual browser screenshots across mode chooser, voice host
  picker, and typed survey step 1 confirm headings/labels now render black
  while navy fills/borders are unchanged.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-03 - Mode chooser typed-tile face preview: fill bar anchor fixed to connect to active node

- Root cause: after reversing the smiley order on the "Take typed survey"
  tile (smile left / frown right), `components/survey/ModeTypedPreview.tsx`
  set the progress fill width to `current / 4` (magnitude of the rating)
  while `.modeTypedFill` in `components/survey/survey.module.css` stayed
  anchored with `left: calc(var(--mode-typed-node) / 2)`. For any
  non-extreme, non-exact-midpoint rating this produced a colored sliver
  anchored at the smile side that was visually disconnected from the
  actual selected node elsewhere on the track — confirmed via CDP
  `getBoundingClientRect` on `.modeTypedFill` vs. the checked radio.
- Fix: changed `.modeTypedFill` to anchor from
  `right: calc(var(--mode-typed-node) / 2)` instead of `left`, keeping
  the existing `width: calc(${current} / 4 * ...)` formula in
  `ModeTypedPreview.tsx` unchanged. The filled segment now always starts
  at the frown (right) edge and grows toward whichever node is active,
  so it stays visually connected to the selected face at every rating:
  invisible at frown, full bar at smile, and reaching exactly to the
  active node in between — the bar unfills from smile (left) to frown
  (right) as the rating worsens.
- Verification: `npx vitest run tests/survey/` (122 passed); manual
  browser screenshots/CDP geometry checks at ratings 1/5, 2/5, 3/5, 5/5
  confirm the fill always touches the active node and the unfilled
  portion is always on the smile side.

Linear: https://linear.app/nexuses/issue/NEX-1239

### 2026-11-03 - Typed survey: split-screen layout with navy/blue step-card panel

- Scope: typed survey flow only (mode choose / voice / complete unchanged).
  Redesigned `components/survey/SurveyStepLayout.tsx` + `.splitLeft`/
  `.splitLayout`/`.splitStepList`/`.splitStepCard` etc. in
  `components/survey/survey.module.css` to a two-pane layout matching a
  reference onboarding design: left pane is a full-height RSM navy→blue
  gradient panel with the white RSM logo (`RSM_WHITE_LOGO_URL`), a
  "Step X of N" pill, the `typed.heading` headline, the existing
  `shell.introBody` copy (reused, not invented), and a vertical list of
  step cards (one per of the 5 typed steps: `identityTitle`, CSAT, CES,
  NPS, `reviewTitle` — all existing locale strings, no new copy
  invented). The active card is highlighted white/green; completed cards
  show a checkmark. Right pane (`.splitRight`, white) is unchanged and
  still renders the live question/inputs for the current step.
- Removed the old thin dot-only `VerticalStepper.tsx` component (deleted,
  was only used here) and its CSS, plus the old white `.splitLeft` card
  (logo + per-step metric art + eyebrow/title/body) and the unused
  `METRIC_ART` map in `TypedSurvey.tsx`, since the step list + question
  heading now cover that role.
- Responsive: under 900px the step list becomes a horizontal
  scroll-snap row instead of a vertical stack; `.splitLayout` already
  collapsed to one column at that breakpoint. RTL: existing `.rtl`
  handling kept; added a mirrored `translateX` for the active step card
  nudge.
- Verification: `npx tsc --noEmit` (only the pre-existing unrelated
  `MetricSliderRating.tsx` error); `npx vitest run tests/survey/` (122
  passed); manual browser walkthrough through identity → CSAT steps at
  desktop width confirms the step list advances, the active/done states
  render correctly, and the right panel keeps showing the correct
  question each step.

Linear: https://linear.app/nexuses/issue/NEX-1240

### 2026-11-03 - Typed survey left panel: removed step-card list, calmer brand gradient, bigger logo, new identity-step copy

- Removed the `.splitStepList`/`.splitStepCard` numbered-card list added
  in the prior entry (too much info per user feedback). The left panel
  (`components/survey/SurveyStepLayout.tsx`, `.splitLeft` in
  `survey.module.css`) now only shows: a larger white RSM logo (68px,
  was 40px) with a small brand lockup next to it (`shell.brandTitle` /
  `shell.brandSubtitle`, e.g. "RSM in Kuwait" / "Voice of Client" —
  reused existing locale copy, not invented), then a vertically centered
  "Step X of N" pill + per-step heading + per-step body (restored
  step-specific left-panel copy in `TypedSurvey.tsx`'s
  `leftColumnForStep`, which the prior entry had made static).
- Gradient simplified to a single calm diagonal using only the existing
  brand tokens: `linear-gradient(165deg, var(--navy) 0%, var(--blue)
  135%)` (previously had an extra bright radial accent layer).
- Updated the step-0 (identity) copy in `lib/survey/voice-locale.ts`
  (English only — Arabic left as the existing translated strings since
  no Arabic wording was supplied): `typed.identityTitle` → "A Few
  Details Before We Begin", `typed.identityIntro` → "To get started,
  please share a few details about yourself and the email address we
  should use for future communication." This value now drives both the
  left-panel heading and the right-panel `#typed-heading` question text
  for step 0 (previously "A little about you"), satisfying the request
  to make the right-panel heading more professional without duplicating
  copy.
- Deleted the now-unused step-card CSS (`.splitStepList`,
  `.splitStepCard`, `.splitStepNumber`, `.splitStepLabel` and their
  reduced-motion/mobile rules).
- Verification: `npx tsc --noEmit` (only the pre-existing unrelated
  `MetricSliderRating.tsx` error); `npx vitest run tests/survey/` (122
  passed); manual browser screenshot at desktop width confirms no step
  boxes, the calmer gradient, the larger logo + brand lockup, and the
  new step-0 copy on both the left panel and the right-panel heading.

Linear: https://linear.app/nexuses/issue/NEX-1241

### 2026-11-03 - Intro paragraph: added spacing before the next section

- `.intro` in `components/survey/survey.module.css` had no bottom
  margin, so the shell intro paragraph ("Thank you for taking a few
  minutes...") sat flush against the next section (mode chooser /
  typed / voice / complete, whichever is active). Added
  `margin: 0 auto 28px` (was `margin: 0 auto`) to give breathing room
  before `.surveyBody` begins.
- Verification: `npx vitest run tests/survey/` (122 passed); manual
  browser screenshot on `/survey` confirms visible gap between the
  intro paragraph and the "01 / How would you like to share your
  feedback?" heading.

Linear: https://linear.app/nexuses/issue/NEX-1241 (included as a follow-up, no separate issue — trivial spacing tweak)

### 2026-11-03 - Voice host picker Arabic hint always Arabic; intro matches content width

- The Arabic tile's hint (`<small>`) used `copy.arabicHint`, which is
  translated by the *UI* language toggle (so it showed the English string
  "Continue in Arabic" whenever the UI language was English). Hardcoded it
  to the native Arabic string "المتابعة بالعربية" in
  `ArabicVoiceChooser.tsx`, consistent with the already-hardcoded quote/
  go-label, so the Arabic card's hint is always in Arabic regardless of the
  UI language. Added explicit `lang`/`dir` to the `<small>` and quote spans.
  Updated `tests/survey/survey-experience.test.tsx` (3 assertions) to match
  the Arabic hint text instead of the English translation string.
- `.intro`/`.intro p` in `survey.module.css` were capped at 880px/820px
  (added earlier this session for 2-line wrapping); changed to
  `width: 100%` / `max-width: none` so the intro paragraph spans the exact
  same width as the rest of `.content` (heading, mode tiles) at any
  viewport, instead of an arbitrary fixed cap.
- Verification: `npx vitest run tests/survey/ tests/dashboard/metric-icons.test.tsx`
  (124 passed); manual browser screenshots at 1024px and 1440px confirm the
  Arabic hint text and the full-width intro paragraph.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-03 - Survey intro paragraph capped at 2 lines

- `.intro`/`.intro p` in `survey.module.css` were capped at 700px/560px,
  wrapping the shell intro copy to 3 lines on common widths. Widened to
  880px/820px so it renders as 2 lines at typical desktop/tablet widths
  (still responsive/wraps further on narrow viewports).
- Verification: `npx vitest run tests/survey/survey-experience.test.tsx`
  (21 passed); manual browser screenshot confirms 2-line wrap at 1024px.

### 2026-11-03 - Voice host picker whitespace tightened + dead-CSS collision fixed

- Found and removed orphaned `.voicePickerPanel` / `.voicePickerActions` /
  `.voicePickerCard` (+ hover/focus/nth-child/strong/small) rules in
  `survey.module.css` — leftover from an older, now-unused host-picker
  design. These shared the exact class name with the new sample-card
  `.voicePickerCard` added for NEX-1236 and were silently overriding its
  `padding`, `box-shadow`, `border-radius`, `border`, `text-align`, and
  `min-height` (CSS Modules hashes same-named classes in one file
  identically, so the later-declared rule in the file was winning ties).
- Added a `.voicePickerStage` class on `ArabicVoiceChooser`'s `<section>`
  to scope compact spacing to this screen only, without touching the
  shared `.modeStage`/`.modePaths`/`.modePath` sizing still used by
  `ModeChooser` (which needs the larger min-heights for its richer tile
  content): zeroes the forced `min-height`s, reduces `.modePath` padding,
  `.voicePickerBody` padding, `.voicePickerCard` padding/gap, and
  `.modePathGo` margin-top.
- Verification: `npx vitest run tests/survey/ tests/dashboard/metric-icons.test.tsx`
  (124 passed); manual browser screenshots show the sample-card shadow now
  renders correctly and the host-picker tiles no longer have large empty
  space below the arrow CTA. Pre-existing unrelated failures in
  `tests/dashboard/cx-dashboard.test.tsx` and
  `tests/dashboard/survey-invite-tracker-route.test.ts` (10 tests) were
  already failing before this change and are untouched by it.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-03 - Voice host picker Arabic quote right-aligned under icon (NEX-1236 follow-up)

- `dir`/`lang` alone didn't shift the Arabic quote's text-align visually
  (the `<span>` is a grid item that stretches full width, so it still
  rendered flush left). Added `.modePathRtl .voicePickerQuote { text-align:
  right; }` in `survey.module.css` so the quote sits under the avatar icon
  on the right, matching the row above.
- Verification: `npx vitest run tests/survey/survey-experience.test.tsx`
  (21 passed), manual browser screenshot confirms the quote is now
  right-shifted under the circle icon.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-03 - Voice host picker Arabic quote gets explicit dir/lang (NEX-1236 follow-up)

- The Arabic sample quote (`.voicePickerQuote`) only inherited RTL alignment
  from an ancestor; added explicit `dir="rtl" lang="ar"` directly on the
  quote `<span>` (and `dir`/`lang` passthrough for the English tile too) so
  the element is unambiguously RTL regardless of inheritance/DOM nesting.
- Verification: `npx vitest run tests/survey/ tests/dashboard/metric-icons.test.tsx`
  (124 passed); manual browser screenshot confirms the Arabic quote renders
  right-aligned with correct bidi punctuation order.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-03 - Voice host picker Arabic row proper RTL mirroring (NEX-1236 follow-up)

- The Arabic tile's single-row (avatar + waveform + duration) had an explicit
  `flex-direction: row-reverse` that double-flipped against the `dir="rtl"`
  already set on the tile, so it rendered in the same left-to-right order as
  English instead of mirrored.
- Fix: removed the `.modePathRtl .voicePickerVoiceNote { flex-direction:
  row-reverse; }` override in `survey.module.css` so the row follows the
  natural RTL flex direction from the ancestor `dir="rtl"` (avatar now on the
  right, duration on the left, quote right-aligned).
- Verification: `npx vitest run tests/survey/survey-experience.test.tsx`
  (21 passed), manual browser screenshot confirming Arabic row/quote mirror
  correctly while English stays unaffected.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-03 - Voice host picker: single-row waveform, quote below, auto-loop (NEX-1236 follow-up)

- Further revised `ArabicVoiceChooser.tsx` sample card per feedback: the
  avatar circle ("S"/"س"), waveform bars, and duration now sit on one row;
  the greeting quote ("Hello, I'm Sara." / "مرحبًا، أنا سارة.") moved below
  that row instead of beside the avatar.
- Removed the manual play/pause button and all play-state React
  state/`requestAnimationFrame` logic; the avatar circle itself is now just
  a static icon (no longer a control). Waveform animates automatically and
  continuously via a CSS `infinite alternate` keyframe with per-bar
  `animationDelay` stagger (respects `prefers-reduced-motion`).
- Component no longer needs `"use client"`/hooks for this screen.
- Verification: `npx vitest run tests/survey/ tests/dashboard/metric-icons.test.tsx`
  (124 passed), `npx tsc --noEmit` (only the pre-existing unrelated
  `MetricSliderRating.tsx` error), manual browser screenshot confirming the
  one-row icon+waveform+duration layout with quote below and no play button.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-03 - Voice host picker sample-card redesign (NEX-1236)

- Step-02 voice host picker (`ArabicVoiceChooser.tsx`) rebuilt to match the
  `language-option-2.html` design reference: title top, centered sample card
  (avatar initial + greeting quote + play/pause button + animated waveform
  bars + duration), hint line, arrow CTA — replacing the old script-line /
  CSAT-CES-NPS metric-pill visual on this screen only.
- Kept existing RSM theme tokens: English tile keeps `.modePathTyped`
  (navy radial gradient), Arabic tile keeps `.modePathVoice` + `.modePathRtl`
  (green radial gradient, `dir=rtl`/`lang=ar`, right-aligned, mirrored arrow).
- Sample greeting text reuses the existing host name "Sara" /
  "سارة" already used in `lib/survey/voice-first-message.ts` (not invented).
- Outer tile changed from `<button>` to `div[role=button]` (Enter/Space
  handled) so the nested native play/pause `<button>` is valid HTML; play
  button uses `stopPropagation` so toggling playback doesn't choose the
  voice. Play/pause state is a client-side demo animation only (8s progress
  drives bar-lit count + `prefers-reduced-motion`-aware CSS wave).
- New CSS: `.voicePickerBody/Card/CardHead/Avatar/Quote/VoiceNote/Play/Bars/Dur`
  in `components/survey/survey.module.css`. Old `.modeScriptLines` /
  `.modeMetricRail` classes are now unused dead CSS (left in place, low risk).
- Verification: `npx vitest run tests/survey/ tests/dashboard/metric-icons.test.tsx`
  (124 passed, incl. `survey-experience.test.tsx` host-picker specs unchanged
  since accessible names still contain "Continue in English/Arabic").
  Manual browser check at `/survey` → Take voice survey (English + Arabic
  tiles render per screenshot; play/pause toggles without navigating).
  `npx tsc --noEmit` shows only a pre-existing unrelated error in
  `MetricSliderRating.tsx`. `npm run memory:check` run after this entry.

Linear: https://linear.app/nexuses/issue/NEX-1236

### 2026-11-02 - Metric PDFs use selected period + filters (NEX-1168)

- `POST /api/reports/metric-cx` now passes `resolvePeriodCxReportPlan` so
  CSAT/NPS/CES one-pagers use exact dateFrom/dateTo (and org filters) like
  the custom-period CX report, not only the window preset clipped to 12m.
- Test: metric route asserts period dates + received count for Oct filter.

Linear: https://linear.app/nexuses/issue/NEX-1168

### 2026-11-02 - Custom-period CX PDF beside Annual (NEX-1166)

- Merged `files/cx_report` `--type=cx` (4-page, no YoY) into
  `pdf-files/cx_report` (plates `p01_cx`/`p06_cx`, `cx.html.j2`, Chromium
  patches). Staging `files/` removed.
- `POST /api/reports/period-cx` + runner kind `cx`; period plan prefers
  dateFrom/dateTo. Overview: PDF Download = period, Annual PDF = full deck + AI.
- Smoke: 4-page period PDF; route/period unit tests.

Linear: https://linear.app/nexuses/issue/NEX-1166

### 2026-11-02 - CX PDF v3 one-pagers from pdf-files-new (NEX-1156)

- Swapped `pdf-files/cx_report` from latest `pdf-files-new` (kept `.venv`):
  `single_reports.py` + `plates/*_v3.jpg` + `layouts/v3_*.json` (replaces
  `single_v2` / v2 plates). Re-applied Py3.9 + headless Chromium patches.
  Removed `pdf-files-new/`. Runner expects `single_reports.py`.
- Smoke: CSAT/NPS/CES 1 page each; annual builds.

Linear: https://linear.app/nexuses/issue/NEX-1156

### 2026-11-02 - CX PDF template refresh from pdf-files-new (NEX-1150)

- Swapped `pdf-files/cx_report` from updated `pdf-files-new` (kept `.venv`).
  Changelog: CSAT full-disc ring + vector smiley, NPS fan whole-segment fill,
  CES needle pivot, annual CES summary box room; also `single_v2` /
  `gauges` / `p06` updates. Re-applied Py3.9 + headless Chromium patches.
  Removed `pdf-files-new/`.
- Smoke: CSAT/NPS/CES 1 page each; annual builds.

Linear: https://linear.app/nexuses/issue/NEX-1150

### 2026-10-30 - Survey UI overhaul UAT branch (NEX-1102)

- Branched `feature/survey-ui-overhaul-uat` from `master` (UAT only; not
  production).
- Typed survey: full-width two-column layout with left brand/metric art
  (`public/metrics/*.png`), vertical 1–5 stepper, gauge option cards for
  CSAT/CES, NPS detractor/passive/promoter bands plus exact score chips.
- Voice survey: call-stage gradient UI with timer, large line-by-line captions
  (`splitCaptionLines`), hold (mute) / end / switch-to-typed circular controls,
  enlarged reactive orb. No phone bezel.
- Files: `components/survey/{TypedSurvey,VoiceSurvey,SurveyShell,SurveyExperience,SurveyStepLayout,VerticalStepper,MetricGaugeCard,survey.module.css}`,
  `lib/survey/{voice-locale,voice-transcript}.ts`, survey experience +
  voice-transcript tests.
- Verification: `npx vitest run tests/survey/survey-experience.test.tsx
  tests/survey/voice-transcript.test.ts` (26 passed). `npm run memory:check`.
- Follow-up: visual UAT on branch; do not merge to production until approved.
- Survey shell is full-viewport white (no 1120px / 700px body caps); choose,
  voice, and typed share the same banner + intro chrome.
- NPS typed answers use one gauge card per score 0–10 (no detractor/passive/
  promoter band grouping).
- Voice UI uses React Bits WebGL2 `Orb` (`components/survey/Orb.tsx`) via
  `VoiceOrb`, with RSM colors `#3f9c35` / `#009cde` / `#49c7df`. Speaking/
  listening/muted map to Orb speed/wobble/opacity props. Orb container is
  absolutely sized inside a fixed square wrap (avoids 0-height canvas); CSS
  radial fallback shows if WebGL is unavailable. Dev fix: do not
  `loseContext()` on cleanup (Strict Mode remount was leaving a dead GL
  context / blank orb); recreate the canvas if the context is already lost.
- Ready and active voice Orb both use soft-fill `backgroundColor="#ffffff"`
  on the shared white panel (no blue call-stage backdrop).

### 2026-11-03 - Copy update per rsm-voc-copy-update-instructions.md (NEX-1235)

- Scope: applied section 3 (EN+AR copy) and the three named Arabic-mode
  bugs from `rsm-voc-copy-update-instructions.md`. Section 4 (full layout
  rebuild removing CSAT/CES/NPS pills, 3-column "before you begin", etc.)
  was explicitly deferred by the user to a follow-up pass; not done here.
- `lib/survey/voice-locale.ts`: replaced EN+AR strings for shell intro/
  privacy, mode chooser heading/copy/hints/durations, voice host picker
  heading/copy/hints, typed identity intro/title, email-invalid, comment
  placeholder, review title, no-comment, submitting ellipsis, submit
  error, voice status/agent/error copy (statusError, agentIdle,
  agentActive, micDenied, sessionFailed, creditsExhausted,
  connectionInterrupted, tryAgain AR), unified `useTyped`/`switchTyped` to
  "Use the typed survey instead", and complete title/body. Added
  `complete.iconAlt` ("Submission received" / "تم استلام الإجابة").
  `shell.privacy` AR keeps "RSM الكويت" untouched; only the opening clause
  changed per the brief.
- `app/layout.tsx`: page title "Voice of Clients" → "Voice of Client";
  meta description updated to the warmer copy.
- Arabic-mode bug fixes:
  - `SurveyShell.tsx` always rendered the English intro regardless of
    language (`getVoiceLocale("en")` was hardcoded). Now renders
    `copy.introBody` for the active language.
  - `VerticalStepper.tsx` hidden step-status labels ("Current step 2",
    etc.) were hardcoded English with Latin digits even in Arabic. Now
    accepts a `language` prop (threaded through `SurveyStepLayout` from
    `TypedSurvey`) and renders Arabic status text with Arabic-Indic
    digits (٠–٩) when `language === "ar"`.
  - Voice connection/session error copy was already keyed off the
    `language` prop in `VoiceSurvey`; no separate fix needed beyond the
    locale text itself.
- `SurveyExperience.tsx`: removed the stray "4" step badge on the
  thank-you screen (doc: "remove it"); `VoiceOrb` now takes an optional
  `label` prop and the complete screen passes `completeCopy.iconAlt`
  instead of the generic "Live voice orb" alt text.
- Testimonial page (`app/testimonial/[token]/page.tsx`,
  `TestimonialReviewForm.tsx`): applied all EN copy swaps from section
  3.5 (banner alt, greeting, instructions, draft note, consent/publish
  wording, approval checkbox, decline button → "Not at this time",
  submitted/declined messages, locked-state labels/text, generic error).
  **Not done:** full Arabic version of the testimonial page. The brief
  calls for opening it in the respondent's survey language, but no
  language is currently stored/retrievable for a testimonial token
  (`loadTestimonialReview` has no language field) — needs a small schema/
  lookup addition before AR copy can be wired in; flagged as follow-up.
- Also not done (flagged, not requested in this pass): the "مشاركة شهادة"
  faded-button styling note from section 3.4 — no clear CSS cause was
  found on inspection; needs a visual repro to fix safely.
- Test fixes: `vitest.setup.ts` now stubs `window.matchMedia` (pre-existing
  gap since `ModeVoiceWave`/`ModeTypedPreview` added this session, was
  crashing every survey-experience test). Updated
  `tests/survey/survey-experience.test.tsx` assertions to match new copy
  and the current slider rating's `aria-label` format (pre-existing stale
  assertions from the NEX-1192 slider migration, unrelated to this task).
- Verification: `npx tsc --noEmit` (clean, one pre-existing unrelated
  error in `MetricSliderRating.tsx`); `npx vitest run` → 510/522 passing;
  the 12 remaining failures are pre-existing `tests/testimonials/
  admin-route.test.ts` auth-mock issues, confirmed via `git stash` to
  predate this change. `npm run memory:check` passing.

Linear: https://linear.app/nexuses/issue/NEX-1235

### 2026-11-03 - Survey banner uses Frame-1171276008 (NEX-1234)

- `SurveyShell` already pointed at `/Frame-1171276008.png`. User replaced
  the asset (now 7680×2400). Updated `next/image` width/height/`sizes` to
  match the 3.2:1 art. Hard refresh may be needed to clear optimized cache.

Linear: https://linear.app/nexuses/issue/NEX-1234

### 2026-11-03 - Align typed preview with title/wave (NEX-1232)

- Face nodes were inset at 10%/90% (card-era layout), so the first face
  sat right of the title while the voice wave was flush. Repositioned
  nodes flush left→right, matched track height/max-width/margin to the
  wave (80px / 520px / 18px). Files: `ModeTypedPreview.tsx`,
  `survey.module.css`.

Linear: https://linear.app/nexuses/issue/NEX-1232

### 2026-11-03 - Mode chooser less whitespace (NEX-1231)

- Tightened stage/tile min-heights, path padding, wave/preview top
  margins, bottom block padding, and go-button margin in
  `survey.module.css`. Visual refresh in browser.

Linear: https://linear.app/nexuses/issue/NEX-1231

### 2026-11-03 - Mode chooser metric pills in bottom text (NEX-1230)

- Moved CSAT/CES/NPS `modeMetricRail` from under the illustration into
  `modePathBottom` (above duration/hint) on voice and typed tiles.
  Files: `ModeChooser.tsx`, `survey.module.css`. Host picker unchanged.
  Verified structure in component; CSS scopes rail spacing inside bottom.

Linear: https://linear.app/nexuses/issue/NEX-1230

### 2026-11-03 - Mode chooser type sizes + unbox typed (NEX-1229)

- Title on top uses larger type; duration below is smaller. Removed typed
  preview card border/shadow/padding. File: `survey.module.css`.

Linear: https://linear.app/nexuses/issue/NEX-1229

### 2026-11-03 - Mode chooser title swap + drop steps (NEX-1228)

- Top line is now action title (Take voice/typed survey); duration sits in
  the bottom block. Removed typed 1–5 step boxes. File: `ModeChooser.tsx`.

Linear: https://linear.app/nexuses/issue/NEX-1228

### 2026-11-03 - Mode chooser matches respond-section.html (NEX-1227)

- Ported Claude `respond-section.html`: SVG parallel-line voice wave, typed
  interactive face preview with auto demo, steps + pills, flex tile bottom CTA.
- Files: `ModeChooser.tsx`, `ModeVoiceWave.tsx`, `ModeTypedPreview.tsx`,
  `survey.module.css`. Verified lints; memory:check.

Linear: https://linear.app/nexuses/issue/NEX-1227

### 2026-11-03 - Restore strong voice wave visibility

- Prior raise pass over-shrank amplitude. Restored taller box, centered
  fuller ribbon, stronger strokes; kept margin under wave vs pills.
  Bumped opacity/line weight/amplitude further for readability on light bg.
  Shifted draw midY upward (~18%) so the ribbon sits higher in its box.
  Files: `ModeVoiceWave.tsx`, `survey.module.css`.

### 2026-11-03 - Raise voice wave (NEX-1224)

- Pulled wave closer to duration label (tighter visual gap, higher draw midY).
  Files: `ModeVoiceWave.tsx`, `survey.module.css`.

Linear: https://linear.app/nexuses/issue/NEX-1224

### 2026-11-03 - Voice wave no longer overlaps pills (NEX-1223)

- Contained wave with `overflow: hidden`, safer draw amplitude, metric rail
  above the canvas (`z-index`). Files: `survey.module.css`, `ModeVoiceWave.tsx`.

Linear: https://linear.app/nexuses/issue/NEX-1223

### 2026-11-03 - Fix clipped voice wave (NEX-1222)

- Wave arcs were cropped by short height + `overflow: hidden`. Raised box,
  `overflow: visible`, lower draw amplitude. Files: `survey.module.css`,
  `ModeVoiceWave.tsx`.

Linear: https://linear.app/nexuses/issue/NEX-1222

### 2026-11-03 - Voice wave pattern without dark panel (NEX-1220)

- Removed navy panel, border, glow from `ModeVoiceWave`; waves draw on the
  existing light voice path. Stroke alpha bumped for readability on white.
- Files: `ModeVoiceWave.tsx`, `survey.module.css`. memory:check.

Linear: https://linear.app/nexuses/issue/NEX-1220

### 2026-11-03 - Mode chooser animated voice wave (NEX-1197)

- Replaced bar equalizer on the voice path with a canvas ribbon waveform
  (layered sine mesh, RSM green→blue). Later stripped dark panel (NEX-1220).
- Files: `ModeVoiceWave.tsx`, `ModeChooser.tsx`, `survey.module.css`.

Linear: https://linear.app/nexuses/issue/NEX-1197

### 2026-11-03 - Remove Icons rating; slider only (NEX-1196)

- Confirmed slider as the typed CSAT/CES/NPS control. Removed Icons/smile
  path, view toggle, `MetricSmileRating` / `SurveySmileRating` /
  `smile-icons.ts`, smile CSS, and `public/csat-icons` + `public/ces-icons`.
  Renamed locale maps to `*RatingLabels`.
- Files: `TypedSurvey.tsx`, `voice-locale.ts`, `survey.module.css` (+ deletes).
- Verification: vitest voice-locale; memory:check.

Linear: https://linear.app/nexuses/issue/NEX-1196

### 2026-11-03 - Smile vs slider rating toggle (NEX-1192)

- Added slider rating UI for CSAT/CES/NPS adapted from `nps-slider.html`
  (SVG face mouth morph, score readout, proportional region bands, range
  fill, tappable ticks, end labels). Icons ↔ Slider segment toggle above
  the control; preference persists across metric steps in the session.
- Files: `MetricSliderRating.tsx`, `SurveySliderRating.tsx`, `TypedSurvey.tsx`,
  `survey.module.css`, `voice-locale.ts`. Verified vitest locale; memory:check.

Linear: https://linear.app/nexuses/issue/NEX-1192

### 2026-11-03 - Smile labels include score in brackets (NEX-1191)

- Label text now shows `Label (n)` beside the face; removed separate score
  chips. Selected score uses blue weight. Applies to CSAT/CES/NPS.
- Files: `MetricSmileRating.tsx`, `survey.module.css`. memory:check OK.

Linear: https://linear.app/nexuses/issue/NEX-1191

### 2026-11-03 - CSAT smile compact + no focus border (NEX-1190)

- Shrunk default smile faces (~22–32px) and labels/keys; tighter option
  padding. Removed hover/focus/selection border, box-shadow, and background
  ring on smile options (fade + bold label remain the selected cue).
- Files: `survey.module.css`. Verification: visual CSS check; memory:check.

Linear: https://linear.app/nexuses/issue/NEX-1190

### 2026-11-03 - Typed CES/NPS smile ratings (NEX-1189)

- Extended smile row to CES (1–7) and NPS (0–10) using cleaned
  `public/ces-icons/` (`hard`, `difficult`, `neutral`, `easy`, `great`).
- CES labels: Very Difficult / Difficult / Neutral / Easy / Very Easy
  (Difficult + Very Easy reused on adjacent scores).
- NPS labels: Detractors (0–6) / Neutral (7–8) / Promoters (9–10); icons
  reused within each band.
- Shared `MetricSmileRating` + `SurveySmileRating`; denser CSS for 7/11 ticks.
- Files: `MetricSmileRating.tsx`, `SurveySmileRating.tsx`, `smile-icons.ts`,
  `TypedSurvey.tsx`, `voice-locale.ts`, `survey.module.css`, `public/ces-icons/*`.
- Verification: vitest voice-locale + definition; browser CES/NPS steps;
  `npm run memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1189

### 2026-11-03 - Typed CSAT smile ratings (NEX-1178)

- Replaced CSAT gauge cards with a compact one-line smile row using
  `public/csat-icons/` (sad×2, neutral, fine, great for scores 1–5).
- Unselected faces grayscale + fade after a choice; selected face scales up
  with bold label and blue score chip (reference smile-scale pattern).
- Labels EN: Dissatisfied / Dissatisfied / Neutral / Satisfied / Very Satisfied
  (AR: غير راضٍ / غير راضٍ / محايد / راضٍ / راضٍ جداً). CES/NPS still gauges.
- Files: `CsatSmileRating.tsx`, `TypedSurvey.tsx`, `survey.module.css`,
  `voice-locale.ts`, `public/csat-icons/*`.
- Verification: vitest voice-locale + definition (7 passed); `npm run memory:check`.
- Follow-up: optional CES/NPS smile treatment; UAT visual check on narrow phones.

Linear: https://linear.app/nexuses/issue/NEX-1178

### 2026-11-02 - Build + push typed left/gauge UAT (NEX-1174)

- `npm run build` OK. Commit includes every-gauge band labels, left metric
  art settled at 180px (forced Image width), copy size tweaks, upscaled
  metric PNGs. Pushed to `origin/feature/survey-ui-overhaul-uat`.

Linear: https://linear.app/nexuses/issue/NEX-1174

### 2026-11-02 - Typed left: larger metric art + copy only

- Metric art forced via Image width (max-width alone was ignored). Settled at
  200px after 340px was too large. Text sizes kept. Files:
  `SurveyStepLayout.tsx`, `survey.module.css`.

### 2026-11-02 - Revert left rail; metric art slightly larger (NEX-1173)

- Reverted splitStack / equal-border / oversized-title experiments to the
  original left column layout. Restored original `public/metrics/*.png`.
  Only change kept: CSAT/CES/NPS art a bit larger than NEX-1151
  (`max-width` ~260px / `max-height` 176px vs 220/148).
  Files: `SurveyStepLayout.tsx`, `survey.module.css`, `RsmLogo.tsx`,
  `public/metrics/*.png`.

Linear: https://linear.app/nexuses/issue/NEX-1173

### 2026-11-02 - Typed left rail width aligned (NEX-1172)

- Equal-border rail attempt; later reverted (NEX-1173).

Linear: https://linear.app/nexuses/issue/NEX-1172

### 2026-11-02 - Typed metric art sizing passes (NEX-1171)

- Oversized then dialed art; later fully reverted to original layout with a
  modest bump only (NEX-1173).

Linear: https://linear.app/nexuses/issue/NEX-1171

### 2026-11-02 - Typed left art larger + gauge band labels (NEX-1170)

- Bumped typed split-left logo/art and intro type after it felt empty
  (logo ~52px, art up to ~320×220, title/body larger).
- Every gauge now shows its band label (CSAT/CES Low/Neutral/High; NPS
  Detractors/Passives/Promoters), aligned with meter color thirds.
  Files: `survey.module.css`, `TypedSurvey.tsx`, `voice-locale.ts`.
  Tests: survey-experience 21/21.

Linear: https://linear.app/nexuses/issue/NEX-1170

### 2026-11-02 - Build + push UAT branch (NEX-1169)

- `npm run build` succeeded on `feature/survey-ui-overhaul-uat` (includes
  survey UI polish, voice ready/call stage, gauges, caption hold, plus
  pending CX period-report / pdf v3 workspace changes). Pushed to origin
  for later merge to master. No secrets committed.

Linear: https://linear.app/nexuses/issue/NEX-1169

### 2026-11-02 - Local admin login for manager UAT (NEX-1167)

- Upserted local dashboard admin `neeraj@nexuses.in` via
  `scripts/upsert-local-dev-user.mts` (password via env only; not stored in
  docs/git). Verified row exists, role admin, not disabled. Login still needs
  email OTP; under `next dev` the code prints to the server console as
  `[login-otp] code for <email>: <code>`.

Linear: https://linear.app/nexuses/issue/NEX-1167

### 2026-11-02 - Voice ready stage matches call surface (NEX-1159)

- Pre-call ready page now uses the same flat atmospheric surface, status
  chrome, caption panel, orb halos, and circular orb clip as the active call.
  `data-call` always on for VoiceSurvey. Files: `VoiceSurvey.tsx`,
  `survey.module.css`. Tests: survey-experience 21/21.

Linear: https://linear.app/nexuses/issue/NEX-1159

### 2026-11-02 - Voice call: drop orb square + nested boxes (NEX-1158)

- Active call no longer nests a bordered stage inside `voicePanel`
  (`data-call` flattens outer box; stage has no border).
- Orb soft-fill white canvas corners clipped with circular `orbWrap`
  overflow so the square no longer shows against the atmosphere.
  Files: `VoiceSurvey.tsx`, `survey.module.css`.

Linear: https://linear.app/nexuses/issue/NEX-1158

### 2026-11-02 - Voice host RTL + richer call stage + caption hold (NEX-1157)

- Arabic host option card always `dir=rtl` / right-aligned (even in EN UI).
- Active voice stage: atmospheric panel, live status pill + timer chrome,
  caption card, pulsing orb halos; kept orb + 3 controls.
- Captions: `captionAdvanceMs` by line length; advance paused while on Hold.
  Files: `ArabicVoiceChooser.tsx`, `VoiceSurvey.tsx`, `voice-transcript.ts`,
  `survey.module.css`. Tests: voice-transcript + survey-experience 28/28.

Linear: https://linear.app/nexuses/issue/NEX-1157

### 2026-11-02 - Typed gauges: speedometer + exact RSM tones (NEX-1155)

- Rebuilt `MetricGaugeCard` as dual-arc speedometer with needle (reference
  style). Score fill uses only exact tokens: low `--mid-grey` (#919093),
  neutral `--rsm-blue` (#009CDE), good `--rsm-green` (#3F9C35) — no cyan /
  tinted shades. Bands by scale position (CSAT 1–2 grey, 3 blue, 4–5 green).
  Discrete fill so score 1 still shows a short arc. Custom SVG kept (recharts
  too heavy for 5–11 tiny cards). Files: `MetricGaugeCard.tsx`, `survey.module.css`.
  Verified computed strokes match tokens; survey tests 21/21.

Linear: https://linear.app/nexuses/issue/NEX-1155

### 2026-11-02 - Fix hold orb gray overlay (NEX-1154)

- Hold muted the soft-fill orb with opacity &lt; 1, which painted a translucent
  white square over the canvas. Hold now freezes a listening-like orb at full
  opacity (no CSS fade). Files: `VoiceOrb.tsx`, `survey.module.css`.

Linear: https://linear.app/nexuses/issue/NEX-1154

### 2026-11-02 - Build + push survey UI UAT branch (NEX-1152)

- `npm run build` passed. Committed survey UI overhaul to
  `feature/survey-ui-overhaul-uat` (`4924d69`) and pushed
  `origin/feature/survey-ui-overhaul-uat`. Local unrelated
  `pdf-files/cx_report` edits left unstaged.

Linear: https://linear.app/nexuses/issue/NEX-1152

### 2026-11-02 - Typed left metric art: plain, left, smaller (NEX-1151)

- Removed tinted/rounded art panel behind CSAT/CES/NPS illustrations on the
  typed left column. Image is left-aligned, transparent, and capped
  (`max-width` ~220px / `max-height` 148px) so edges do not clip.
- Files: `survey.module.css`. `npm run memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1151

### 2026-10-30 - Host stage density + disclaimer type floor (NEX-1113)

- Voice-host / mode stages fill more viewport (`modeStageFill`, taller paths).
  Host paths use language wordmarks + denser script lines + metric chips.
  Wordmarks toned down (~1.35–1.9rem) after UAT feedback they were too large.
- Privacy / footer chrome raised to ~0.92rem minimum; path hints / back link
  slightly larger. Files: `ArabicVoiceChooser.tsx`, `ModeChooser.tsx`,
  `survey.module.css`. Vitest survey-experience. `npm run memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1113

### 2026-10-30 - Voice Hold pauses session (not mic-only) (NEX-1112)

- Hold now mutes mic, sets agent volume to 0, and sends periodic
  `sendUserActivity` keep-alives (ElevenLabs has no official pause yet).
  Resume restores volume + unmute. Timer pauses while held. UI uses Pause/Play
  icons, status "On hold" / "في الانتظار", calmer orb (no grey wash).
- Files: `VoiceSurvey.tsx`, `VoiceOrb.tsx`, `voice-locale.ts`,
  `survey.module.css`, survey-experience test. Vitest 24 passed.

Linear: https://linear.app/nexuses/issue/NEX-1112

### 2026-10-30 - Voice call controls icons + alignment (NEX-1111)

- Replaced hand SVGs with `lucide-react` (`Mic`/`MicOff`, `PhoneOff`,
  `Keyboard`). Equal 60px control circles in a 3-column grid; end button no
  longer oversized. Labels bumped (~0.88rem) with balanced wrap; timer/status
  typography slightly larger. Header stack centered.
- Dep: added `lucide-react`. Files: `VoiceSurvey.tsx`, `survey.module.css`,
  `package.json`/`package-lock.json`. Vitest survey-experience 21 passed.

Linear: https://linear.app/nexuses/issue/NEX-1111

### 2026-10-30 - Survey-wide subtle motion polish (NEX-1110)

- Extended mode-path attention to detail across typed, voice, and complete:
  step fade-ups, vertical stepper progress fill + active pulse, gauge hover/
  select + sweep transition, voice caption/status/control motion, complete
  staggered enter. `prefers-reduced-motion` respected.
- Files: `SurveyStepLayout.tsx`, `VerticalStepper.tsx`, `MetricGaugeCard.tsx`,
  `VoiceSurvey.tsx`, `SurveyExperience.tsx`, `survey.module.css`.
  Vitest survey-experience 21 passed. `npm run memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1110

### 2026-10-30 - Path visuals: content over glorified icons (NEX-1109)

- Removed centered mic/keyboard/Aa/ع glyph heroes from mode and host paths.
- Voice path shows duration + waveform + CSAT/CES/NPS chips; typed shows
  duration + 1–5 step rail + same chips; host paths use LTR/RTL script lines.
- Files: `ModeChooser.tsx`, `ArabicVoiceChooser.tsx`, `survey.module.css`.

Linear: https://linear.app/nexuses/issue/NEX-1109

### 2026-10-30 - Voice-host picker + language switcher match split paths (NEX-1108)

- Restyled `ArabicVoiceChooser` to the same full-width path stage as mode
  choose (02 eyebrow, EN Aa / AR ع glyphs, shared path motion).
- Language switcher is a two-segment navy/green control with matching marks.
- Files: `ArabicVoiceChooser.tsx`, `SurveyLanguageSwitcher.tsx`,
  `survey.module.css`. Vitest survey-experience. `npm run memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1108

### 2026-10-30 - Redesign mode chooser split paths (NEX-1107)

- Replaced boxed dual cards (blue-tinted voice card) with a full-width
  two-path stage: pulsing mic rings for voice, animated step bars for typed;
  navy/green RSM accents; approved locale copy unchanged.
- Files: `ModeChooser.tsx`, `survey.module.css`. Vitest survey-experience +
  voice-locale: 24 passed. `npm run memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1107

### 2026-10-30 - Drop blue call stage; full-width shared chrome (NEX-1105)

- Blue gradient call stage was reference-only; removed. Active voice stays in
  the white `.voicePanel` with dark captions/controls.
- Removed immersive chrome that hid intro for typed/voice. Shell is always
  full-width with banner + intro visible (choose included).
- Files: `SurveyShell.tsx`, `SurveyExperience.tsx`, `VoiceSurvey.tsx`,
  `survey.module.css`, `PROJECT_BRIEF.md`. `npm run memory:check` passed.

Linear: https://linear.app/nexuses/issue/NEX-1105

### 2026-10-30 - Voice call-stage Orb white soft-fill (NEX-1104)

- Call stage previously passed navy Orb `backgroundColor`, which switched the
  shader to a ring-on-dark look vs the soft filled white ready orb.
- Fix: pass `#ffffff` on call stage; add white circular `.voiceCallOrb .orbWrap`
  backing with soft shadow.
- Files: `VoiceSurvey.tsx`, `survey.module.css`. Verified via CSS/module compile
  on `npm run dev`.

Linear: https://linear.app/nexuses/issue/NEX-1104

### 2026-10-29 - One-page CSAT/NPS/CES templates from pdf-files-new (NEX-1090)

- Replaced `pdf-files/cx_report` with `pdf-files-new` pack (kept `.venv`):
  `single_v2.py`, `gauges.py`, `plates/*_v2.png`, `layouts/v2_*.html`; annual
  plate tweaks included. Re-applied Py3.9 + headless Chromium patches.
  Installed numpy/pillow into the report venv. Removed `pdf-files-new/`.
- Runner accepts `single_v2.py` (legacy `single_reports.py` fallback). UI hint
  and docs say one-page metric PDFs.

Verification: smoke CSAT/NPS/CES = 1 page each; annual builds; `memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1090

### 2026-10-29 - Portfolio Settings Account password change (NEX-1079)

- Added permission `settings.account` to portfolio (and CX/admin via
  operational set). Settings gate includes it so partners see Settings →
  Account only. Directory tab/API use `SETTINGS_DIRECTORY_PERMISSIONS` so
  portfolio cannot edit the staff directory.
- Verified with rbac settings-tabs / permissions unit tests.

Linear: https://linear.app/nexuses/issue/NEX-1079

### 2026-10-29 - Fix Annual PDF download header layout (NEX-1071)

- Helper copy was nested inside `overviewLeadActions`, so it sat beside the
  PDF button. Removed permanent hint; actions column is button (+ error only).
  Narrative preview still spans full width under the title after download.

Linear: https://linear.app/nexuses/issue/NEX-1071

### 2026-10-29 - VPS deploy + provision portfolio users (NEX-1070)

- SSH as `rsmuser` to production VPS. No surveys in progress.
- `./scripts/deploy.sh`: ff-only pull `4d63f89` → `b0f72ac` (PR #69 scope
  login), `npm ci`, no pending migrations, side build, rolling PM2 reload,
  health 200.
- Provisioned **25** `portfolio` users (created 25 / updated 0) via
  `npm run db:provision-portfolio-users` with operator-supplied temp password
  (not recorded here). StaffContact emails upserted.
- Backfilled **7** invites missing partner emails (dry-run then apply).
- Verified: 25 portfolio / 0 disabled / roleId set; metrics + login HTTP 200;
  PM2 `rsm-voc` online on `master` @ `b0f72ac`.

Linear: https://linear.app/nexuses/issue/NEX-1070

### 2026-10-29 - Partner / Job Manager portfolio data access (NEX-1069)

- Added staff-email data scope in `lib/authz` (`staffEmails`,
  `inviteScopeWhere`, `testimonialScopeWhere`) and mirrored it in
  `lib/ai/scope-sql`. System role `portfolio` is always restricted to invites
  where the user's email matches partner / BM / JM on `SurveyInvite`.
- Permissions: `PORTFOLIO_PERMISSIONS`; new `dashboard.leaderboard` so
  portfolio users do not see peer rankings. Invite-stats, invite tracker,
  invite note/follow-up/reminder routes, testimonials, and annual CX invite
  lists enforce scope.
- Ops scripts: `npm run db:provision-portfolio-users` (25 RSM emails +
  StaffContact) and `npm run db:backfill-invite-staff-emails`. Passwords via
  `PORTFOLIO_SEED_PASSWORD` only; deliver out of band. Not run against prod in
  this session.
- Verified: `vitest` authz / rbac / leaderboard / ask tests.

Linear: https://linear.app/nexuses/issue/NEX-1069

### 2026-10-29 - Annual PDF always generates AI narrative (NEX-1064)

- Overview “PDF Download” now always calls `/api/reports/narrative` first,
  then `/api/reports/annual-cx` with that draft. Removed separate Generate /
  Include checkbox UI. Narrative failure blocks the download.

Linear: https://linear.app/nexuses/issue/NEX-1064

### 2026-10-28 - Remove pdf-files-individual (NEX-1047)

- Deleted unused `pdf-files-individual/` after unified CX tree under
  `pdf-files/cx_report`. Cleaned `.gitignore` / PROJECT_BRIEF / runner comments.

Linear: https://linear.app/nexuses/issue/NEX-1047

### 2026-10-28 - Swap CX plates from pdf-files-cx (NEX-1046)

- Replaced `pdf-files/cx_report` with updated design from `pdf-files-cx`
  (kept `.venv`). Re-applied Py3.9 `inline_arrow` + headless Chromium
  launch. Metric PDFs now default to the same unified tree
  (`single_reports.py` / layouts / csat|nps|ces plates). Removed
  `pdf-files-cx/`. Setup script installs one venv again.

Verification: smoke annual + `--type=csat` PDFs; `npm run memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1046

### 2026-10-28 - Local/dev Neon P1001 was macOS DNS, not a dead DB (NEX-1039)

- Symptom: `next dev` MFA (`POST /api/auth/mfa/start`) and `npm run db:migrate`
  failed with Prisma `P1001` for Neon pooler host `ep-blue-river…aws.neon.tech`.
- Root cause: Wi-Fi had Cloudflare IPs (`1.1.1.1` / `1.0.0.1`) set as **search
  domains**, with no custom DNS servers — traffic used the router resolver,
  which **REFUSED** Neon lookups. Public resolvers and TCP to Neon port 5432
  still worked.
- Fix (local machine only): `networksetup -setdnsservers Wi-Fi 1.1.1.1 1.0.0.1
  8.8.8.8` and clear search domains. No app/code/env changes.
- Verification: hostname resolves; `nc` to `:5432` ok; `npm run db:migrate`
  reaches Neon (`No pending migrations`); Prisma `SELECT 1` ok. Restart
  `npm run dev` if an old Node process still has a failed DNS cache.
- Deployment/database: none (dev laptop DNS only).

### 2026-10-28 - CSAT/NPS/CES Playwright PDF downloads (NEX-1003)

- Wired report-page “PDF Download” to `POST /api/reports/metric-cx` using
  `pdf-files-individual/cx_report` (`--type=csat|nps|ces`), same live-scale
  `report_data.json` mapper + YoY as Annual. Runner supports kind; setup
  script installs both annual and metric venvs. Py3.9 + headless Chromium
  fixes applied to individual `build_report.py`.
- UI: `DownloadMetricReportButton` on `MetricReportView`. Env:
  `CX_METRIC_REPORT_ROOT` (optional). Docs: PROJECT_BRIEF, VPS handover.

Verification: Vitest payload + metric route; local smoke `--type=csat` when
venv present; `npm run memory:check`.

Linear: https://linear.app/nexuses/issue/NEX-1003

### 2026-10-27 - Walkthrough PDF email invite / thank-you / team (NEX-988)

- Added Part B sections for invitation email, client thank-you, and internal
  team completion notice (user-provided Gmail screenshots, gitignored).
- Journey order: invite -> survey UI -> thank-you -> team notice. PDF ~1.1 MB /
  27 pages. Verification: rebuilt + opened; `npm run memory:check`.

### 2026-10-27 - Walkthrough PDF layout + survey reshoot (NEX-987)

- Part A/B dividers no longer get content footers (grey text on green bar).
- Header bar taller (22mm) with padded right-aligned logo.
- Survey screenshots re-captured at 1440x900 without captureBeyondViewport
  (avoids horizontal tile artifact). PDF rebuilt (~910 KB).
- Verification: opened PDF; `npm run memory:check`.

### 2026-10-27 - Walkthrough PDF survey taker Part B (NEX-985)

- Captured light `/survey` screens on `voc.rsm.com.kw` (intro/mode chooser,
  typed identity, voice host, voice-ready) without completing a survey.
- PDF now has Part A (CX dashboard) and Part B (survey taker) with divider
  pages; blue accent strip for survey sections. Rebuilt ~865 KB / 24 pages.
- Verification: opened PDF; `npm run memory:check`.

### 2026-10-27 - Walkthrough PDF header logo right + padding (NEX-984)

- Header bar taller (18mm); official white logo right-aligned with vertical
  padding on every inner page. Rebuilt PDF. Verification: opened locally.

### 2026-10-27 - Walkthrough PDF official RSM logo (NEX-982)

- Cover and page headers now embed `public/RSM Logo - White.png` (trimmed via
  sharp at build time) instead of the drawn grey/blue block mark.
- Rebuilt PDF (~714 KB). Verification: opened locally; `npm run memory:check`.

### 2026-10-27 - Walkthrough PDF one-fold + text fix (NEX-981)

- Problem: embedded screenshots showed the portal painted 2–3 times (tall CDP
  viewports); some body lines letter-spaced because Helvetica cannot encode
  Unicode arrows/dashes.
- Fix: hard-cap screenshot extract to top 1100px; sanitize copy to WinAnsi
  ASCII before `jspdf` text. Rebuilt PDF (~647 KB).
- Verification: opened PDF; send-survey crop is single fold; memory:check.

### 2026-10-27 - Walkthrough PDF redesign (NEX-977)

- Problem: first PDF spammed multi-page screenshot bands and ignored RSM
  design tokens; user wanted richer write-up and one shot per portal section.
- Fix: rebuilt `docs/dashboard-walkthrough/build-guide-pdf.mjs` as portrait A4
  using navy `#00153D`, green `#3F9C35`, blue `#009CDE` from
  `rsm-design-system.html`. Fourteen sections (login + sidebar pages); Settings
  and Escalations/Send survey describe extra tabs in copy. Exactly one cropped
  screenshot per section.
- Verification: PDF ~815 KB / 17 pages; opened locally; `npm run memory:check`.

### 2026-10-27 - VPS Annual CX Chromium launch fail (NEX-979)

- After Playwright install, PDF Download still failed at
  `pw.chromium.launch()` on the VPS (typical missing OS deps / sandbox).
- `build_report.py` now launches headless with `--no-sandbox`,
  `--disable-dev-shm-usage`, `--disable-gpu`. Runner maps launch/shared-lib
  errors to the setup + `playwright install --with-deps chromium` hint.
- Ops if still broken after pulling this change:
  `sudo …/.venv/bin/playwright install-deps chromium`
  then retry PDF Download (redeploy/pull so `build_report.py` launch args land).

Linear: https://linear.app/nexuses/issue/NEX-979

### 2026-10-27 - VPS setup-cx-report needs python3-venv (NEX-973)

- `./scripts/setup-cx-report.sh` on VPS failed: ensurepip unavailable
  (Debian/Ubuntu needs `python3.12-venv`).
- Ops: `sudo apt update && sudo apt install -y python3.12-venv` then re-run
  setup (match minor version to `python3 --version`). Script now prints that
  hint and removes a broken half-created `.venv`; handover doc updated.

Linear: https://linear.app/nexuses/issue/NEX-973

### 2026-10-27 - Full CX dashboard walkthrough PDF (NEX-970)

- Problem: need a login-to-every-page CX dashboard guide PDF from the live
  app, with full desktop screenshots (not the narrow IDE browser panel).
- Fix: authenticated walk on `https://voc.rsm.com.kw`; CDP capture at 1920px
  width and full content height for overview (with filters), CSAT/NPS/CES
  reports, responses, testimonials, escalations (kanban + table), widget,
  send survey (single + CSV), invite tracker, insights, leaderboard, and all
  Settings tabs (account, directory, users, roles, audit, reminders). Built
  landscape PDF via `docs/dashboard-walkthrough/build-guide-pdf.mjs`.
- Files: `docs/dashboard-walkthrough/README.md`,
  `docs/dashboard-walkthrough/build-guide-pdf.mjs`,
  `docs/dashboard-walkthrough/save-cdp-shot.mjs`, `.gitignore` (screenshots +
  PDF ignored — live captures can include client data). Local deliverable:
  `docs/dashboard-walkthrough/RSM_VoC_Dashboard_Walkthrough.pdf`.
- Verification: PDF generated (~8.6 MB); screenshot set listed at 1920px
  width; `npm run memory:check`.
- Note: Vercel login rejected the same credentials; live CX host is
  `voc.rsm.com.kw`.

### 2026-10-27 - VPS Annual CX PDF missing Playwright (NEX-971)

- Dashboard PDF Download on `voc.rsm.com.kw` failed with
  `ModuleNotFoundError: No module named 'playwright'` — host never ran
  `./scripts/setup-cx-report.sh`, so Node fell back to system `python3`.
- Runner no longer falls back to bare `python3`; missing venv or missing
  playwright/jinja2 returns a short setup hint. Documented one-time setup in
  `docs/VPS_HOSTING_HANDOVER.md`.
- Ops (must run on VPS as `rsmuser`):
  `cd ~/rsm-voc-survey-eng && ./scripts/setup-cx-report.sh`
  then retry PDF Download (no PM2 restart needed unless env overrides change).

Verification: code/docs updated locally; SSH to VPS not available from this
workstation (publickey denied). Operator must run the setup script.

Linear: https://linear.app/nexuses/issue/NEX-971

### 2026-10-27 - VPS build hang after weekend-cadence pull (NEX-969)

- After `git pull` to `943bd6f` (Kuwait Sun–Thu reminder cadence), VPS
  `next build` appeared stuck at "Creating an optimized production build"
  (load ~6 on 1 vCPU / 1.8 GB). Raw `npm run build` also wiped live `.next`
  mid-compile (no `BUILD_ID`). Earlier `npm ci --omit=dev` had dropped
  `@tailwindcss/postcss` (devDependency required for the PostCSS pipeline).
- Restored `.next-prev` → `.next`, then rebuilt with PM2 stopped,
  `NODE_OPTIONS=--max-old-space-size=1536`, output to `.next-build`, swap,
  restart. Compile ~92s; full pipeline ~5 min with headroom.
- Verified: metrics=200, survey=200, commit `943bd6f`, weekend helpers
  (`isKuwaitReminderWeekday` / `bumpToKuwaitReminderWeekday` /
  `kuwait_weekend`) in tree; crontab `0 8 * * 0-4`.
- Docs: `PROJECT_BRIEF.md` Self-hosted VPS deploys — memory-pressure playbook.

Linear: https://linear.app/nexuses/issue/NEX-969

### 2026-10-27 - Build fix: AnnualCxQuote.metric in payload test (NEX-967)

- `npm run build` typecheck failed TS2741: quote fixture in
  `tests/dashboard/annual-cx-report-payload.test.ts` missing required
  `metric` on `AnnualCxQuote`.
- Added `metric: "csat"` to the fixture.

Verification: Vitest payload suite 2/2; `tsc --noEmit` clean.

Linear: https://linear.app/nexuses/issue/NEX-967

### 2026-10-27 - Escalations Kanban tab (NEX-966)

- Added `/dashboard/escalations` under Testimonials in the sidebar
  (`cases.read`). Kanban (default) + table toggle; cards show scores,
  department, partner, CX task, severity, SLA; drag moves status asynchronously
  with optimistic UI (`cases.manage`). Detail drawer for activity/transitions.
- Restored `GET/PATCH /api/cases` (+ `[id]`); enriched `listCases` with scores,
  invite department/partner, open task title, `allowedTransitions`; added
  `view=board` (excludes closed).
- `cases.auto_create` default is now **live**; FeatureFlag upsert script
  `scripts/set-cases-auto-create-live.mts`. Backfill script
  `cases:backfill --apply` now opens missing Cases directly (idempotent) when
  historical shadow executions already exist.
- Verification: `vitest` RBAC path, cases state/board view, cases route tests
  (13 passed); `npm run memory:check`. FeatureFlag `cases.auto_create` was
  upserted to **live** on Neon. Historical `cases:backfill --apply` started
  but Neon dropped mid-run — re-run `npm run cases:backfill -- --apply` (and
  the same on VPS) when the DB is stable so existing needs-attention responses
  become Kanban cards.

### 2026-10-27 - Annual CX PDF via pdf-files/cx_report (NEX-963)

- Wired overview “PDF Download” to server-side Playwright engine
  `pdf-files/cx_report` (live CSAT 1–5 / NPS 0–10 / CES 1–7 scales). Kept
  operational 4-page jsPDF path for rollback; legacy
  `lib/annual-cx-report-pdf.ts` no longer used by the button.
- Mapper: `lib/annual-cx-report-payload.ts` builds `report_data.json` from
  overview window + org filters with equal-length prior YoY; quotes and
  optional AI narrative → `text_overrides`. Source load in
  `lib/annual-cx-report-source.ts`. Runner spawns
  `build_report.py` (`lib/annual-cx-report-runner.ts`); API
  `POST /api/reports/annual-cx` (`maxDuration` 120). UI:
  `DownloadAnnualReportButton.tsx`. Setup: `scripts/setup-cx-report.sh`.
- Fixed Python 3.9 f-string backslash SyntaxError in
  `pdf-files/cx_report/build_report.py` (`inline_arrow` helper). Root
  `cx_report/` remains a stale plate copy — do not use for downloads.
- Ops: VPS/host must run setup script (venv + Chromium); not Vercel
  serverless. Env optional: `CX_REPORT_ROOT`, `CX_REPORT_PYTHON`.

Verification: Vitest payload/route/period suites (7 passed earlier);
`./scripts/setup-cx-report.sh` OK; smoke
`build_report.py data/report_data.json` → valid ~4.5 MB PDF; `npm run
memory:check` after this entry.

Files: payload/source/runner, `app/api/reports/annual-cx/route.ts`,
`DownloadAnnualReportButton.tsx`, `DashboardOverview.tsx`, setup script,
`build_report.py`, tests, `PROJECT_BRIEF.md`, `MEMORY.md`, `.gitignore`.

Linear: https://linear.app/nexuses/issue/NEX-963

### 2026-10-26 - Share testimonial button on survey thank-you page

- Eligible (overall Positive) survey completions now get a thank-you-page
  “Share a testimonial” / “Review your testimonial” button beside “Submit
  another response”, matching the thank-you email CTA.
- Typed: `POST /api/survey/typed` prepares the ask after ingest and returns
  `{ ok, testimonial: { kind, url } | null }` (no respondent PII).
- Voice: thank-you panel polls `POST /api/survey/testimonial-offer` by
  `conversationId` (pending until webhook ingest, then ready/ineligible).
- `prepareThankYouTestimonial` accepts optional `surveyInviteId` so walk-ins
  without an invite still get a page offer. Shared helper
  `lib/testimonials/offer.ts` marks `requestedAt` when the page offers the
  link. Locale strings added in `lib/survey/voice-locale.ts` (en/ar).
- Verification: Vitest for typed route, offer helper, offer route, thank-you
  email, completion notify (35 tests); `tsc` clean for this change. Linear
  MCP unavailable in this session, so no Linear issue was opened.
- Files: `lib/testimonials/{prepare,offer}.ts`, `app/api/survey/{typed,
  testimonial-offer}/route.ts`, `components/survey/{SurveyExperience,
  TypedSurvey,VoiceSurvey}.tsx`, `survey.module.css`,
  `lib/survey/{voice-locale,complete-result}.ts`, tests, `PROJECT_BRIEF.md`.

### 2026-10-26 - Annual CX PDF cover uses branded artwork

- Cover page of the Annual CX Report now draws
  `public/pdf/pdf-cover-page.png` full-bleed on A4 when the asset loads.
- Programmatic navy cover remains only as a fallback if the image fails.
- Cover load skips logo transparent-margin cropping so artwork is not trimmed.

Files changed: `lib/annual-cx-report-pdf.ts`,
`tests/dashboard/annual-cx-report-pdf.test.ts`, `MEMORY.md`.

Verification:

```text
npm test -- tests/dashboard/annual-cx-report-pdf.test.ts - passed
npm run memory:check - passed
```

### 2026-10-26 - NEX-919 automatic survey reminders (gap close + VPS cron fix)

- Problem: code already had daily auto reminders (every 3d, max 4), but
  production cron sourced `.env.local` while the VPS only has `.env` → 46+ days
  of failures; **0** auto/manual follow-up events; ~103 overdue incomplete
  invites. PDR also asked for max 5, Stop/Re-enable, VoC CC, admin settings,
  tracker columns, and manual counts toward max.
- Fix (code): `SurveyReminderConfig` + stop fields on `SurveyInvite` +
  `SurveyReminderContactStop`; cadence default max 5; manual increments cap;
  CC on reminders; Clear Reminder subject; tracker/export columns; Settings →
  Reminders; APIs for stop/reenable invite and contact; `maxAutoSendsPerRun`
  stagger (default 25). Migration
  `20261026140000_survey_reminder_controls`.
- Fix (ops): VPS cron script now sources `.env`/`.env.local`; kill switch
  `SURVEY_FOLLOWUPS_CRON_ENABLED=0` until deploy+arm. Sample script
  `scripts/rsm-survey-followups-cron.sh`.
- Verification: vitest invite tracking/email/followups-cron + settings-tabs
  green. Neon migrate from laptop unreachable (P1001); production migrate +
  deploy + arm cron still required.
- Linear: [NEX-919](https://linear.app/nexuses/issue/NEX-919/pdr-automatic-survey-reminders-every-3-days-rsm-kuwait-voc-owner) In Progress.
- Follow-up: commit/deploy to `voc.rsm.com.kw`, `prisma migrate deploy`, set
  `SURVEY_FOLLOWUPS_CRON_ENABLED=1`, smoke cron, demo, then Done + Sooraj/Noha email.

### 2026-10-26 - Leaderboard + AI CX report narrative

- Added `/dashboard/leaderboard` and `GET /api/insights/leaderboard` to rank
  invite-attributed CSAT/CES/NPS by department, partner, business manager, or
  job manager for a period (min n=3; no 500-row query cap). Sidebar nav +
  `dashboard.overview` path gate.
- Added `AiReportNarrative` Prisma model/migration, `lib/ai/cx-report-narrative.ts`,
  runtime prompts under `lib/ai/prompts/`, and `POST /api/reports/narrative`
  (`dashboard.reports`). Overview PDF download can generate/regenerate an AI
  narrative preview and embed it in Summary and Outlook (template fallback).
- Tests: leaderboard helpers/route, narrative helpers, annual PDF with
  `aiNarrative`, RBAC path map. Docs: `PROJECT_BRIEF.md`, this entry.
- Follow-up: apply migration `20261026120000_add_ai_report_narrative` on Neon
  and VPS; Linear MCP unavailable in session (create VOC issues manually if
  needed). Scheduled mail remains CSV/Excel only.

### 2026-10-23 - Testimonial greeting: feedback about RSM, not client company

- The client-facing `/testimonial/[token]` greeting said “thank you again for
  your feedback about {company}”, but `company` is the respondent’s company
  (e.g. Nexuses), not who was being rated. Copy now reads “thank you again for
  your feedback about RSM in Kuwait.” Files: `app/testimonial/[token]/page.tsx`.

### 2026-10-22 - Single “PDF Download” button + testimonial page banner

- Dashboard overview: the old operational PDF button
  (`DownloadReportButton` → `lib/dashboard-pdf.ts`) is hidden (removed from
  `DashboardOverview`; component and lib kept for rollback). The Client
  Experience Report button is now the primary-style button labelled simply
  **“PDF Download”** (“Preparing PDF…” while exporting) in
  `DownloadAnnualReportButton`.
- Client testimonial page (`app/testimonial/[token]`): the RSM banner
  `https://assets.rsm-kw.com/rsm-banner-voc-testimonial_1792679515214_avf8.png`
  (5877×1192) now renders at the top of the form via a plain `<img>` (asset
  host is not in `next/image` remote patterns) with a `.banner` class in
  `review.module.css`. The eyebrow (“RSM in Kuwait · Voice of Client”) and
  visible “Share a testimonial” heading below the banner were removed as
  duplicates of the banner text; the heading stays as an sr-only `<h1>`.
  Banner, greeting, and form now form one contiguous block (banner with
  top-only rounding, greeting shifted to the top inside the white form
  card, no grey gap between banner and form).
- Verification: seeded a disposable testimonial, screenshotted the page —
  banner renders full-width above the form; seed rows deleted afterwards.
  `tsc` clean; annual/testimonial Vitest suites pass. Linear MCP unavailable
  in this session, so no Linear issue was opened.

### 2026-10-22 - Annual CX PDF: official white logo + banner moved to footer

- Follow-up to the feedback round below, per user direction:
  - The navy banner no longer sits in the inner-page header. Inner headers
    are plain navy text (report title + period line + hairline). The banner
    moved to the **footer of every inner page**: grey/green/blue brand bars
    along the top edge of a full-width navy band containing
    “RSM Assurance | THE POWER OF BEING UNDERSTOOD” (left),
    “RSM Albazie & Co. · page x / 12”, and the logo on the right.
  - The hand-drawn vector lockup was replaced with the **official white RSM
    logo** (`public/RSM Logo - White.png`, new `RSM_WHITE_LOGO_URL` in
    `lib/brand.ts`; the dark Cloudinary `RSM_LOGO_URL` is unchanged for the
    website). It sits top-right on the navy cover and back page, and
    right-side inside the footer band on inner pages. The PNG is a
    9000×9000 transparent canvas, so `cropTransparentMargins` in
    `lib/annual-cx-report-pdf.ts` crops + downscales it in the browser at
    load; a white “RSM” text fallback draws if the image fails. Annual PDF
    only — the operational/classic dashboard PDFs were not changed.
- Verification: rendered the 12-page PDF locally with the real (pre-cropped)
  logo and inspected cover, pages 2–3, and the back page — official logo
  crisp top-right on cover/back and in every footer band; no header banner.
  Vitest annual/testimonial suites pass (24 tests) and `tsc` is clean.
  Linear MCP unavailable in this session, so no Linear issue was opened.

### 2026-10-22 - Annual CX PDF report: client feedback round (branding, visuals, fonts, testimonials)

- Implemented the client feedback on `lib/annual-cx-report-pdf.ts`:
  - Branding: RSM lockup is now drawn as vector shapes, always on the right,
    with white “RSM / IN KUWAIT” text on navy (raster logo has dark text).
    Title is “Client Experience Report”, tagline “Listening, Learning,
    Improving” sits below the title, reporting period below the tagline.
    “RSM Albazie & Co.” is out of all headers (`headerPeriodLine` now reads
    RSM in Kuwait) and appears only in page footers and the back page.
    Every inner page footer: “RSM Assurance | THE POWER OF BEING
    UNDERSTOOD” (left) + “RSM Albazie & Co. · page x / 12” (right).
  - Visual data: semicircular gauges on the page-3 KPI cards (CSAT %,
    NPS −100–100, CES 1–7), target-vs-achieved bars with a navy target
    marker on the performance page, “How We Listen” as a 4-step timeline
    with a connector line and arrow, page 2 filled with a Client Experience
    Dashboard overview (surveys sent, responses, response rate, positive
    responses) plus an “In this report” contents block, and a stats strip
    on the conclusion page. Zero-value distribution bars no longer draw a
    false baseline fill.
  - Fonts: minimum 9pt everywhere in this PDF (12px equivalent); layouts
    reflowed (practice grid, question cards, governance boxes).
  - Testimonials: `listPublishableQuotes` now tags each published quote
    with its best-fit metric (favourable CSAT/CES/NPS comment the approved
    text is based on) and selects at most 2 per metric, interleaved
    CSAT/NPS/CES across the two quote pages, each labelled by metric.
    Sample quotes exist only as test fixtures — production still renders
    published, consented testimonials only (no invented client quotes).
- Verification: rendered the 12-page PDF locally with sample data and
  inspected every page image (cover order, gauges, timeline, target bars,
  quote labels, back-page disclaimer/footer all correct). Vitest: annual
  copy/PDF + testimonial suites pass (21 tests); `tsc` clean.
- Not done / open: side-by-side comparison with Sharen's reference report
  (file is not in the repo — needs the reference supplied), “How We Listen”
  as a fixed illustration (timeline is vector-drawn and annual-update
  friendly instead), and RSM approach photography on page 2 (no approved
  imagery in repo; contents/overview blocks fill the page instead).
  Linear MCP unavailable in this session, so no Linear issue was opened.
- Files: `lib/annual-cx-report-pdf.ts`, `lib/annual-cx-report-copy.ts`,
  `lib/testimonials/quotes.ts`, tests (annual copy/PDF, quotes route,
  new `tests/testimonials/quotes-selection.test.ts`), `PROJECT_BRIEF.md`.

### 2026-10-21 - Testimonials admin page layout redesign (cards, not table)

- Report: `/dashboard/testimonials` table looked messy — status words wrapped
  mid-word, actions stacked in a tall column, near-empty rows.
- Rewrote `components/dashboard/DashboardTestimonials.tsx` as a card list:
  pill status tabs (All/Requested/Submitted/Declined/Published/Archived),
  client + company/email header with a colored status pill and date, the
  quote in a green-accent block (labeled client-approved vs AI draft), a
  muted "waiting for the client" state when there is no text yet, score /
  request-type / consent chips, and one horizontal action row. **Copy quote**
  is now disabled until a client has submitted with consent. New styles in
  `dashboard.module.css` (`.testimonial*`); API unchanged. `tsc` + lints pass.
- Verified in a local browser as a disposable dev admin against two seeded
  rows mirroring the production screenshot (one submitted, one requested);
  cards render cleanly. Seeded rows and the dev user were deleted afterwards.
- Note: a pre-existing React hydration warning overlay appears on `/login`
  in dev (unrelated, seen before this change). Changes are uncommitted on
  `temp`, together with the system-role permission fix below.

### 2026-10-21 - Testimonials sidebar hidden by stale system-role rows (fix)

- Report: admin did not see **Testimonials** in the sidebar. The nav item
  exists (`DashboardShell.tsx`, `/dashboard/testimonials`) and is gated on
  `testimonials.manage`, but stored system-role rows synced before that
  permission existed never gained it — role sync only ran on an empty roles
  table at login, or when Settings → Users/Roles was opened.
- Fix in `lib/rbac/roles.ts`: `resolvePermissionSet` now returns the canonical
  set for system slugs (`admin` / `cx` / `surveyor`, which are not editable),
  ignoring stale stored rows. Custom roles still fail closed. Added a
  regression test in `tests/rbac/guards.test.ts`; RBAC suite passes (17 tests).
- Correction to the same-day note below the fold: `temp` is **not** ahead
  because it was already merged — `origin/master` contains PR #56
  (`d5a356e`, includes `cf37086`), so `temp` is 0 ahead / 36 behind
  `origin/master` and `/dashboard/testimonials` exists on deployed master.
  Local `master` is simply stale (behind `origin/master` by 120). So the
  hidden sidebar is the production role-row sync, not missing code: opening
  Settings → Roles or Users (which calls `ensureSystemRoles`) syncs
  `testimonials.manage` into the admin role, after which the item appears.
  Whether migration `20261019170000_add_testimonial` is applied on the
  production DB still needs confirming before the page loads data. Local
  `.env.local` DB admin role already has the permission (27 perms).
  Linear MCP unavailable in this session.

### 2026-10-21 - Production (VPS) recalculation run via SSH; 18/22 survey verified Positive

- Ekansh supplied the VPS SSH key (workspace file `rsm_voc_vps`, already
  covered by `.gitignore:62`; never commit it) and host. Connected as the
  app user to production (`voc.rsm.com.kw`): app at `~/rsm-voc-survey-eng`
  on `master` (merge PR #56) already contains the combined-score code and
  the invitation department/service block, PM2 `rsm-voc` online, git tree
  clean. Respondent identifiers are not recorded here per memory hygiene.
- Located the corrected 18/22 survey in the production database: typed,
  submitted 20 Oct 2026 08:56 Kuwait time, CSAT 4 + CES 6 + NPS 8 =
  **18/22 (81.82%) → Positive** (old worst-band rule would have said
  Neutral because NPS 8). Its invite carries a department and service, so
  future invites/reminders for it show the new service block. Its stored
  sentiment already read `positive`.
- Ran `npx tsx scripts/recalculate-overall-sentiment.mts` on production:
  dry-run then `--apply`. Production holds only 7 responses, all complete;
  **all 7 already aligned** with the new pattern (stored = combined), so
  `updated: 0` — every previous production response now follows the
  combined-score rule, both in stored labels and (with the deployed code)
  at read time. Post-run dry-run confirms 0 pending; `GET /survey` on
  production returns 200. No code deploy was needed in this step (code was
  already live) and no other production data was changed.
- Earlier "production action still required" notes below are therefore
  **done** for both databases (`.env.local` Neon: 11 labels updated in the
  prior entry; production VPS: 0 needed, all verified aligned).

### 2026-10-21 - Correction: identity of the 18/22 survey; all-previous recalculation re-audited

- Correction to the entry below: the 18/22 survey belongs to a different
  respondent than first named in chat — a typed response submitted
  20 Oct 2026 08:56 (Kuwait time) (respondent identity supplied by Ekansh in
  chat; not recorded here per memory hygiene). 18/22 = 81.8% → **Positive**
  under the combined-score rule.
- Searched the `.env.local` (Neon) database by the supplied name, email, and
  company: no matching response. That database holds 305 responses / 76
  complete, and that 20 Oct typed response is only in the production VPS
  database (`voc.rsm.com.kw` Docker Postgres), which this workstation cannot
  reach (no SSH config/access). Linear MCP was again unavailable in this
  session.
- "New pattern for any previous as well" — re-audited every previous
  complete response in the accessible database:
  `npx tsx scripts/recalculate-overall-sentiment.mts` dry-run now reports
  76 complete, 70 already aligned, **0 would update**, 6 missing an insight
  row. The 6 without insights (and all partial responses that cannot be
  combined) still display the combined sentiment wherever scores allow,
  because dashboard/API/AI reads derive it from CSAT+CES+NPS at read time
  (`resolveOverallSentiment`); there is no other stored per-response
  sentiment field (CRM `scores.sentiment` remains CSAT-bucketed by design).
  Band totals across all 76 complete responses: 39 positive, 16 neutral,
  21 negative.
- Production action still required (operator, on the VPS after deploy):
  `npx tsx scripts/recalculate-overall-sentiment.mts --apply` — this aligns
  stored labels including that respondent's; the dashboard will already
  show that survey as Positive from its scores once the code is deployed,
  even before the script runs. No code change in this follow-up; no
  deployment performed.

### 2026-10-21 - Combined-score (out of 22) overall sentiment + department/service in invite email

- Request (Ekansh): (1) overall sentiment from the combined score out of 22 —
  below 60% negative, 60–80% neutral, above 80% positive — with existing
  responses recalculated, including an 18/22 survey (respondent corrected
  in the entry above) which must show positive; (2) add department and
  service to the survey invitation email so clients know which service
  they are rating. This supersedes the same-day
  worst-band note below for overall sentiment/result. Linear MCP
  (`plugin-linear-linear`) was unavailable in this session (not in the tool
  catalog), so no Linear issue was created.
- Sentiment: new `combinedSurveyScore`, `overallSentimentFromScores`, and
  `resolveOverallSentiment` in `lib/survey/metrics.ts` (max 22 = CSAT 5 +
  CES 7 + NPS 10; integer totals ≤13 negative, 14–17 neutral, ≥18 positive;
  all three metrics required). `overallSurveyResult` now maps from the
  combined sentiment, so the completion-email subject/body, action-required
  gate, and testimonial eligibility follow the new rule. Per-metric
  needs-attention flagging (CSAT ≤2, CES ≤3, NPS ≤6) and the CRM
  CSAT-bucketed `scores.sentiment` are unchanged.
- Recalculation: dashboard/API sentiment (`lib/cx-insights-map.ts`,
  `lib/dashboard-analytics-data.ts`, `app/api/insights/route.ts` filter),
  AI/RAG context (`lib/ai/context/feedback.ts`, `lib/ai/summaries.ts`,
  `lib/chat-invite-context.ts`, `app/api/chat/route.ts`) now derive sentiment
  from scores at read time (stored GPT label only as fallback for partial
  responses), so existing responses are recalculated on every read. Ingest
  (`lib/survey/ingest.ts`) overrides the stored GPT sentiment with the
  combined result for new/re-ingested complete responses. New
  `scripts/recalculate-overall-sentiment.mts` (dry-run default, `--apply`)
  aligns stored labels: run against the `.env.local` database — 76 complete
  responses, 11 updated (neutral→negative ×8, positive→neutral ×3), 6 complete
  responses have no insight row; re-run dry-run shows 0 pending. No respondent
  matching the first-named respondent exists in the `.env.local`
  database, so that 18/22 record is presumably only in the production
  (VPS) database: 18/22 = 81.8% →
  positive is covered by unit tests (`tests/survey/metrics.test.ts`,
  completion-notify, testimonial eligibility), the dashboard will show
  positive from scores after deploy even before the script runs there, and
  the operator should run `npx tsx
  scripts/recalculate-overall-sentiment.mts --apply` against the production
  database to align its stored label too.
- Invite email: `{{department_service}}` placeholder in
  `templates/email/voc-invite.html` plus the day-3/day-5 reminder templates,
  rendered by `buildDepartmentServiceBlock` in
  `lib/survey-invite-templates.ts` as a "This survey is about the following
  service:" block with Department and Service lines (HTML-escaped, omitted
  when neither is set; also present in the plain-text part).
  `recipientFromInvite` in `lib/survey-invite-tracking.ts` now carries
  department/service (and the follow-up query selects them) so reminders keep
  the same context. Invite send already stored both fields; no schema change.
- Verification: affected suites pass (metrics, survey-completion-notify,
  testimonial eligibility, insights-route, survey-invite-tracking). Full
  `npm test`: 464 passed, 7 failed — the same 7 failures reproduce on clean
  HEAD in a temp worktree (pre-existing: `cx-dashboard.test.tsx` ×6,
  `survey-invite-email.test.ts` ×1). `npx tsc --noEmit` clean; ESLint on
  touched files: 0 errors (2 pre-existing unused-import warnings in
  `survey-invite-tracking.ts`). Not deployed; no migration.

### 2026-10-21 - Overall survey result for NPS 8 checked (no bug)

- Investigation only; no code, database, or deployment change.
- Client query: NPS 8 with positive CSAT/CES showed overall "Neutral".
  Confirmed correct by design in `overallSurveyResult`
  (`lib/survey/metrics.ts`): each metric is banded first (NPS 9–10 Positive,
  7–8 Neutral, 0–6 Negative; CSAT 4–5 / 3 / 1–2; CES 5–7 / 4 / 1–3) and the
  overall result is the worst band present — scales are never averaged. So
  NPS 8 caps the overall result at Neutral even when CSAT and CES are
  Positive. AI sentiment is not used for this label.
- Verification: `npx vitest run tests/dashboard/survey-completion-notify.test.ts
  -t "uses one overall result"` passed. Linear MCP was unavailable in this
  session, so no Linear issue was created. No attachment accompanied the
  forwarded feedback in chat, so no specific response record was inspected.
- Follow-up (same day) on global standard: there is no global standard for a
  single composite of CSAT+CES+NPS — each metric has its own convention
  (Bain NPS: 9–10 Promoter, 7–8 Passive, 0–6 Detractor) and best practice is
  to report them separately; if one label is required, a non-compensatory
  worst-band rule (ours) is a recognised conservative choice for closed-loop
  follow-up, while weighted normalised composites are the compensatory
  alternative and require published weights. No change made.

### 2026-10-19 - Survey language switcher to top-right

- Moved the fixed English/Arabic language switcher on `/survey` from
  bottom-right to top-right (`components/survey/survey.module.css`).
- Updated unit test description and `PROJECT_BRIEF.md` / current-state wording.
- Verification: `npx vitest run tests/survey/survey-experience.test.tsx -t
  "language switcher"` passed; `npm run memory:check` passed.
- No database or deployment changes. Linear MCP was unavailable in this
  session, so no Linear issue was created.

### 2026-10-23 - Voice prefill gap: wrong live agent on voc.rsm.com.kw

- Screenshot: session Listening; agent says "May I have your full name, please?"
  while `voice-session` 200 returns `inviteContext` Ekansh/Nexuses/Developer.
- Signed URL `agent_id` is `agent_7501kz366xe2e1jtjp1x5rm2thss`. All invite
  prompt/`{{invite_opening}}` pushes went to local/env agent
  `agent_6401ktv5yqkmf2a95qpd3nh62380` (has placeholders +
  `{{invite_opening}}` in first message; version
  `agtvrsn_5601m5kt3sjkekyatj7hw2p4byxx`). Prod agent 404 with local API key
  (different workspace/key). Same class of issue as 2026-09-09 Arabic note:
  VPS `ELEVENLABS_AGENT_ID` ≠ agent we configure from laptop.
- Gap is ops/config, not missing invite API data. Fix: align VPS
  `ELEVENLABS_AGENT_ID` to the configured agent, or run
  `npm run elevenlabs:configure -- --apply` on the VPS with VPS env so the
  live agent gets invite placeholders + first-message template. Then hard
  refresh / redeploy frontend that sends `invite_opening` dyn vars.
- User confirmed (2026-10-23): wrong live agent id was the issue.
- No code change this entry; Linear MCP unavailable.

### 2026-10-23 - Voice connection interrupted (firstMessage override)

- Screenshot on `voc.rsm.com.kw`: `invite-context` + `voice-session` 200 with
  correct `inviteContext` (name/company/designation); `invite-link` 200 then
  UI "Connection issue" / interrupted. So prefill payload was fine; the
  WebSocket bounced after connect (same early-disconnect path as before).
- Root cause: re-enabling client `overrides.agent.firstMessage` on signed-url
  sessions. ElevenLabs recommends dynamic vars over firstMessage override.
- Fix: remove client `firstMessage` again; personalize only via
  `{{invite_opening}}` + string invite dyn vars + invite-context fetch.
  Agent security `firstMessage` override set back to false. Live agent
  `agtvrsn_6801m5krx087f0bs6ssqdqsdzs22` → `agtvrsn_5601m5kt3sjkekyatj7hw2p4byxx`
  (backup `...2026-10-23T07-20-23-930Z.json`). Tests 35 passed; configure PASS.
- Deploy the VoiceSurvey change to `voc.rsm.com.kw` / Vercel before retesting.

### 2026-10-23 - Voice invite prefill still broken (typed OK) — harden path

- Symptom: typed invite prefill worked; voice still opened with ask-name.
- Cause mix: (1) `has_invite_context` was a boolean — ConvAI can drop non-string
  dynamic vars; placeholders/prompt now use `"true"`/`"false"`. (2) Voice needed
  the same `POST /api/survey/invite-context` load as typed. (3) Attempted
  `firstMessage` override — later reverted (see connection-interrupted entry).
- Fix retained: invite-context fetch, merge with voice-session, string dyn vars
  + `invite_opening`. Do not client-override `firstMessage`.
- Interim live agent with firstMessage enabled:
  `agtvrsn_6801m5krx087f0bs6ssqdqsdzs22` (superseded same day).

### 2026-10-23 - Voice survey finishing immediately after Start

- Symptom: pressing Start voice survey jumped to the thank-you screen.
- Likely cause: session connect→disconnect bounce (firstMessage *override*
  was a prime suspect) while `onDisconnect` treated any active session as
  complete. Unmount cleanup could also fire `onComplete` via the same path.
- Fix: (1) only call `onComplete` from `onDisconnect` if the session lived
  ≥2.5s; early bounces show connection error instead. (2) Unmount clears
  `sessionActive` before `endSession`. (3) Temporarily stopped overriding
  `firstMessage` and used `{{invite_opening}}` only — later re-enabled with
  disconnect guard (see voice invite prefill harden entry same day).
  (4) Keep ConversationProvider for all of voice mode (picker + survey).
- Live agent at that step: `agtvrsn_9201m5knxb2pem7r6cv8f58q8wzs`. Tests for
  voice-first-message / agent-config / survey-experience passed.

### 2026-10-19 - Voice invite: override firstMessage (confirm in opening)

- Root cause of voice not confirming: typed uses form prefill; voice relied on
  the LLM reading `{{has_invite_context}}` after a language/name-first opening.
  Arabic preset first message also asked for full name immediately.
- Fix: `buildVoiceFirstMessage` in `lib/survey/voice-first-message.ts`;
  `VoiceSurvey` passes `overrides.agent.firstMessage` with confirm-known or
  ask-name. Enabled `firstMessage` override on the agent; Arabic preset
  greeting is greeting-only (no name ask). Prompt opening notes personalized
  first messages.
- Live push: agent version `agtvrsn_2101m5ac7rrzfrzr6d480td1v03c`
  (from `agtvrsn_9901m5a9zzcvegdrerj7xtaa4gyk`). Backup
  `backups/elevenlabs/agent_6401ktv5yqkmf2a95qpd3nh62380-2026-10-19T15-24-44-021Z.json`.
- Verification: voice-first-message, agent-config, survey-experience tests
  passed; configure script PASS.

### 2026-10-19 - Live ElevenLabs agent push (invite identity)

- Ran `ELEVENLABS_WEBHOOK_URL=https://rsm-voc-platform.vercel.app/api/webhooks/elevenlabs npm run elevenlabs:configure -- --apply`
  (local `NEXTAUTH_URL` targets nexuses.xyz; workspace HMAC webhook exists only
  on the Vercel URL).
- Agent `agent_6401ktv5yqkmf2a95qpd3nh62380`: previous
  `agtvrsn_0901m2393zfjfns81fw3r1eqty9v` →
  `agtvrsn_9901m5a9zzcvegdrerj7xtaa4gyk`. Pre-update JSON backup:
  `backups/elevenlabs/agent_6401ktv5yqkmf2a95qpd3nh62380-2026-10-19T14-45-31-181Z.json`.
  Repo TS backup still at
  `backups/elevenlabs/agent-config-2026-10-19T14-31-53Z.ts`.
- Verification: configure script PASS.

### 2026-10-19 - Agent prompt: invite identity confirm / ask-missing

- Updated `lib/elevenlabs/agent-config.ts` with
  `confirmInviteIdentityEnglish` / `confirmInviteIdentityArabic`, Goal/data
  collection notes for `invite_*` vars, and empty
  `dynamicVariablePlaceholders` in `buildAgentUpdate`. Arabic confirm lines are
  draft-aligned with existing Sara script.
- Verification: `tests/survey/agent-config.test.ts` updated and passed.
  Live push recorded in the following task entry.

### 2026-10-19 - Invite client details prefill (typed + voice wiring)

- Built optional invite identity capture and survey prefill. Added
  `SurveyInvite.designation` + migration
  `20261019180000_add_survey_invite_designation`. Dashboard invite form and CSV
  / integration API accept optional company + designation; sample CSV updated.
- Added `lib/survey/invite-context.ts` (pure) and
  `lib/survey/load-invite-context.ts` (DB). Public
  `POST /api/survey/invite-context` returns safe
  `{ fullName, email, company, designation }` (empty on unknown token).
- Typed survey prefills those fields and keeps them editable.
  `POST /api/survey/voice-session` returns `inviteContext` (no email) and
  `VoiceSurvey` passes `dynamicVariables` (`has_invite_context`,
  `invite_full_name`, `invite_company`, `invite_designation`) at startSession.
- Prompt/agent deploy: see following task entry (repo prompt updated; live
  ElevenLabs push still pending approval).
- Verification: vitest invite-context, invite-context-route, voice-session,
  survey-experience, survey-invite-tracking (48 tests) passed; `prisma generate`
  ok. Linear MCP unavailable this session. Apply migration on deploy:
  `npx prisma migrate deploy`.

### 2026-10-19 - Backup of agent-config.ts before invite prefill work

- Copied `lib/elevenlabs/agent-config.ts` to
  `backups/elevenlabs/agent-config-2026-10-19T14-31-53Z.ts` (838 lines;
  SHA-256 matched source). No prompt or agent changes.

### 2026-10-19 - Automated testimonial capture

- Problem: Positive survey takers were not asked for a testimonial, and there
  was no admin place to review consented quotes.
- Added `Testimonial` (migration `20261019170000_add_testimonial`) and admin-only
  `testimonials.manage`. Overall Positive thank-you emails (CSAT 4–5, CES 5–7,
  NPS 9–10) include a highlighted ask. The review page drafts from the client's
  comments when present, or asks for a written testimonial or video link when
  not. Consent is stored privately. `/dashboard/testimonials` lists, copies,
  publishes, and archives. Publishing does not write `PublicReviewSnippet`.
- Verified with Vitest for eligibility, thank-you copy, submit, and admin auth
  (36 tests). Applied migration `20261019170000_add_testimonial` to the
  `.env.local` Neon database. Browser: opened `/testimonial/[token]`, set name
  consent to no, website yes, approved, submitted; status became `submitted`
  with consent stored and no public-snippet write. Disposable browser-check
  rows were deleted afterward.
- Linear MCP was not available in this session, so no Linear issue was opened.
- Follow-up: apply the same migration on VPS/other hosts before production use.
  Partner testimonial links stay out of this slice. Admins receive
  `testimonials.manage` the next time system roles sync (login or user admin).

### 2026-10-19 - Platform function list for the RSM / Sudindev matrix

- Request: a sheet-ready list of functions the Voice of Client platform
  already covers, so RSM (Sudindev) can drop overlapping checklist rows and
  see what stays with the client.
- Deliverable: `docs/NEXUSES_PLATFORM_FUNCTION_LIST.csv` (57 Nexuses rows:
  43 live, 14 built but switched off; 11 rows that stay with RSM). Live rows
  match the current survey, invite, dashboard, public widget, and CRM-boundary
  product. Expansion rows (cases, training, weighted surveys, health,
  automation) are marked switched off so they are not treated as running.
  CRM timing (opportunity, budget, billing) and the Power Automate flow stay
  with RSM; the platform only exposes the invite API and the completion post.
- No code, schema, deployment, or env changes. Linear MCP was not available
  in this session, so no issue was filed.

### 2026-10-15 - Invite context for the voice agent (investigation only)

- Question: can the ElevenLabs agent receive per-invite client details (name,
  company) at call start so the client only confirms them instead of being
  asked again?
- Finding: yes, via ElevenLabs dynamic variables. Installed `@elevenlabs/react`
  1.6.6 accepts `startSession({ dynamicVariables })` (flat string/number/boolean
  map); values fill `{{var}}` in the prompt and first message. No agent
  override toggle is needed for this (unlike `overrides.agent.prompt`).
- Caveats recorded: the live prompt already uses `{{full_name}}`,
  `{{company_name}}`, `{{position}}` as capture placeholders, so injected
  variables need distinct names (e.g. `invite_full_name`); every variable the
  prompt references must be sent on every session (empty for non-invite
  visits) or have an agent placeholder default; `SurveyInvite` has
  `firstName`/`lastName`/`company` but no designation; the new confirm lines
  (English and Arabic) need RSM approval before going live.
- Proposed flow: `/api/survey/voice-session` looks up the invite by token and
  returns only name/company with the signed URL; `VoiceSurvey` passes them as
  dynamic variables; the prompt asks the client to confirm or correct them.
- No code, schema, agent, deployment, or env changes. No Linear issue (Q&A).

### 2026-10-14 - Invite tracker: admin delete

- Request: admins need to delete rows from the invite tracker table.
- Added `DELETE /api/survey/invites/[id]` gated on `responses.manage` (the
  existing admin-only data-management permission; a new permission would need a
  system-role re-sync before admins saw it). Label is now "Exclude or delete
  survey responses and invitations".
- `deleteSurveyInvite` in `lib/survey-invite-tracking.ts` hard-deletes the
  `SurveyInvite`. `SurveyInviteEvent` rows cascade, `CrmWebhookDelivery.inviteId`
  is set null, and a linked `Response` is kept (only the link goes). Writes
  audit `survey_invite.deleted` (flags only, no email) and recomputes invite
  outreach snapshots.
- `components/dashboard/SurveyInviteTracker.tsx`: red Delete column shown only
  with `responses.manage`, with a confirm prompt; closes the activity panel if
  the deleted row was open. Style `inviteTableActionDanger`.
- Verification: `tests/dashboard/survey-invite-tracker-route.test.ts` (3 new
  delete cases: 200, 404, 403) and `survey-invite-tracking.test.ts` 19/19 pass;
  `tsc --noEmit` clean. ESLint reports a pre-existing
  `react-hooks/set-state-in-effect` error on the tracker's initial load effect
  (unchanged line). Not browser-tested (login needs email OTP).
- No schema, migration, deployment, or env changes. Linear MCP was not
  available in this session, so no Linear issue was created.

### 2026-10-14 - RSM team column: Business Manager moved up, Team Leader removed

- Request: RSM marked up the preview (arrow moving Business Manager under
  Engagement Partner; Team Leader struck through). Nexuses confirmed following
  the markup.
- `lib/survey-thankyou-email.ts`: RSM team order is now Department,
  Engagement Partner, Business Manager, Job Manager, Project ID, Service.
  Team Leader is no longer shown in the completion emails (still stored on the
  invite; it was never CC'd).
- Verification: `tests/dashboard/survey-completion-notify.test.ts` 15/15 pass
  (order assertion and no Team Leader); `tsc --noEmit` clean.
- No database, deployment, or env changes.

### 2026-10-14 - Completion email header columns back to 50/50

- Request: make the client and RSM team columns equal width.
- `lib/survey-thankyou-email.ts`: both respondent-detail columns are 50%
  (were 40/60). Test updated to assert two 50% cells.
- No database, deployment, or env changes.

### 2026-10-14 - Completion and thank-you email dates in Kuwait time

- Request: dates and times in the email must be in, and say, Kuwait time.
- `lib/survey-thankyou-email.ts`: `formatCompletedDate` (intro sentence in the
  team, action-required, and client thank-you emails) now formats in
  `Asia/Kuwait`; it previously used the server time zone, so late-evening UTC
  submissions could show the previous day. The "Submitted" row now ends with
  "(Kuwait time)".
- Verification: new test for a 22:30 UTC completion showing 14 October / 1:30
  am (Kuwait time); 18/18 tests pass across the team-notify and thank-you email
  suites; `tsc --noEmit` clean.
- No database, deployment, or env changes.

### 2026-10-14 - Completion email header: balance the client column

- Follow-up to the entry below: the client column had 4 rows against 8 on the
  RSM side, leaving empty space on the left.
- `lib/survey-thankyou-email.ts`: Channel moved to "Client information", and a
  new "Submitted" row was added (date and time, `Asia/Kuwait`, e.g.
  `13 Oct 2026, 1:22 pm`, with a non-breaking space before am/pm). Columns are
  now 40% / 60%. Plain-text body matches.
- Verification: `tests/dashboard/survey-completion-notify.test.ts` 14/14 pass
  (assertions for Channel/Submitted in the client section and the 40/60
  widths); `tsc --noEmit` clean; rendered sample checked visually.
- No database, deployment, or env changes.

### 2026-10-14 - Completion email header split into client and RSM team columns

- Request: RSM annotated a printed internal completion email: split the
  header into client info (left) and RSM Kuwait info (right), drop Language,
  keep Channel, fix a field shown twice, and tidy the layout.
- Root cause of the duplicate: the paired-row grid in
  `buildRespondentContextHtml` listed `Email` twice (rows 2 and 7). There is no
  respondent photo in the template; "photo showing twice" was the email.
- Fix (`lib/survey-thankyou-email.ts`): respondent details are now two stacked
  columns with headings. "Client information": Company, Name, Designation,
  Email. "RSM in Kuwait team": Department, Engagement Partner, Job Manager,
  Project ID, Service, Business Manager, Team Leader, Channel. Order follows
  the client's circled numbers; Business Manager and Team Leader (unnumbered)
  were kept after the numbered fields at Nexuses' request. Staff emails render
  on a smaller second line. Language is no longer shown (still on the context
  type and in the DB). Plain-text body uses the same two sections. Applies to
  both the team-notify and action-required emails.
- Tests: new case in `tests/dashboard/survey-completion-notify.test.ts`
  (no Language, one Email, section order, staff email line). `tests/dashboard`
  email tests pass; `tsc --noEmit` clean. `tests/dashboard/cx-dashboard.test.tsx`
  has 6 failures that reproduce without this change (pre-existing).
- Visual check: rendered a sample locally and confirmed the two-column header.
- No database, deployment, or env changes. Linear MCP was not available in
  this session, so no Linear issue was created.

### 2026-09-28 - RSM VoC ratings in vendor comparison matrix

- Request: RSM asked Nexuses to (1) confirm all existing features are covered
  in the "Extended Matrix" tab, (2) review the "New Criteria Scoring" tab, and
  (3) insert RSM VoC's ratings, in
  `RSM_VoC_Vendor_Comparison_Matrix_24_Sep2026 (1).xlsx`.
- Output: new file `RSM_VoC_Vendor_Comparison_Matrix_28_Sep2026_RSM_rated.xlsx`
  in the repo root (untracked; the original is unchanged). Column I on both
  scoring tabs now holds live-production scores (1 / 0.5 / 0). Two new tabs:
  "RSM VoC Rating Basis" (evidence and projected post-release score per
  criterion) and "Review Response" (answers to the three questions). The file
  was edited as raw OOXML so the sensitivity label and customXml parts are
  preserved. `fullCalcOnLoad` is set, `calcChain.xml` removed and stale
  `#DIV/0!` caches stripped, so Excel recalculates on open.
- Scores (computed in Python from the workbook formulas; dated snapshot).
  Live: Extended 52.3% (rank 8 of 10), New 33.3% (rank 9), combined 70/30
  46.6% (rank 8). After the Sep-2026 expansion is deployed: 73.0% (rank 4),
  58.3% (rank 6), 68.6% (rank 5). The original Comparison Matrix column K
  (~90%) scores the earlier Dynamics 365 / SRS design, not the delivered
  platform; the Review Response tab recommends relabelling it.
- Review findings: weights sum to 104% (rebalance to 100%); criteria for
  features 2-6 are RSM-process-specific; the Missing Features column G and the
  narrative tabs understate the live platform (NPS computed, Arabic RTL, AI
  analytics and ask-your-data live, self-hosted rather than D365). Five
  additional criteria suggested.
- For RSM IT to confirm: Azure VM region and retention policy (Extended I76 is
  a provisional 0.5), whether the CRM mid/post trigger flow is live in
  production, and sub-processor certifications (Azure, OpenAI, ElevenLabs,
  SendGrid).
- Verification: the output loads in openpyxl with 13 sheets; column I cells are
  filled; label and customXml parts are present; the zip tests clean. The Excel
  recalculation check could not finish because the screen was locked.
- No code, database or deployment change. Linear MCP unavailable, so no issue
  was created.

### 2026-09-28 - Platform expansion implementation (phases 0-13)

- Implemented the approved expansion plan additively in the working tree (not
  committed, not deployed, no database touched). Linear MCP unavailable; issues
  not created.
- Security hardening: header-only timing-safe cron auth with audited failures;
  fail-closed custom roles, system-role PATCH guard, transactional role update;
  trusted client IP (`X-Real-IP`, rightmost XFF) for rate limits; login, chat,
  invite-link, track and invite rate limits; integration invite recipient cap;
  snippet moderation (`publicApprovedAt`); result-link expiry/revocation
  (`RESULT_LINK_TTL_DAYS`); `proxy.ts` page gate replaces `middleware.ts`;
  security headers with report-only CSP; audit before/after + correlation.
- Backbone: `DomainEvent`/`Job`/`FeatureFlag`, `/api/cron/jobs`, `/api/health`,
  optional PM2 worker (`RSM_ENABLE_WORKER`), `lib/scoring` parity with the
  live metrics, shadow needs-attention evaluation and recovery cases.
- Org + scope: Organization/ServiceLine/Employee/Account/Engagement/UserScope,
  `lib/authz`, `/dashboard/clients`, `/dashboard/engagements`,
  `npm run org:backfill`.
- Phases 5-8: survey versioning (`/dashboard/surveys`, Arabic taken verbatim
  from `voice-locale.ts`), `ResponseAnswer` rows, automation rules with
  shadow/live versions, dry run, fatigue policy, approvals, templates (en/ar,
  RTL HTML), approval-gated messaging; case client confirmation and
  escalations; account health model (placeholder weights) and manual revenue.
- Phases 9-13: vendor-neutral AI provider; Ask Your Data with scoped tools,
  contact aliasing, untrusted-content wrapping, citation filtering and
  `AiInteraction` metadata logging; legacy chat path now scoped and aliased;
  AI account summaries as reviewable `AiArtifact` drafts; SendGrid message-id
  capture and signed event webhook; managed inbound API keys (hash + prefix)
  and AES-256-GCM secret box; training rules (shadow = proposed assignments,
  live = assign + LMS enroll + event + audit); cross-sell coverage gaps;
  internal/external benchmarks (never blended); feature-flag admin and
  dead-job replay at `/dashboard/settings/platform`.
- Migrations (unapplied): `20260928100000_security_hardening`,
  `20260928110000_platform_backbone`, `20260928120000_org_structure`,
  `20260928130000_surveys_automation_health`,
  `20260928140000_ai_integrations_training_benchmarks`. SQL generated offline
  with `prisma migrate diff` against schema snapshots; never run against the
  `.env.local` (production Neon) database.
- New env var names only: `RESULT_LINK_TTL_DAYS`, `RSM_ENABLE_WORKER`,
  `FEATURE_FLAG_<KEY>`, `SENDGRID_WEBHOOK_PUBLIC_KEY`,
  `INTEGRATION_ENCRYPTION_KEY`.
- Behavior changes visible without flags: chat answers are scoped per user and
  contact details are aliased in prompts; cron routes reject `?secret=`;
  integration invite route also accepts managed keys; rate limits on more
  routes; SendGrid message IDs recorded; `/dashboard` pages gated by `proxy.ts`.
- Verification: `npx tsc --noEmit -p .` clean; `npx vitest run` 385 passed,
  5 failed (the same pre-existing baseline failures in
  `tests/dashboard/cx-dashboard.test.tsx` ×4 and
  `tests/survey/agent-config.test.ts` ×1); eslint clean on all new/changed
  files except the pre-existing `set-state-in-effect` error in
  `DashboardShell.tsx` (present on `HEAD`).
- Follow-ups: see Known Follow-Ups → "Platform expansion follow-ups".

### 2026-09-28 - OTP email still blank in Outlook (investigation)

- Report: after the 2026-09-24 template fix, RSM recipients still see a blank
  OTP body under the M365 caution banner.
- Evidence: the reported screenshot's empty area samples `#E7EBF4`, which is
  the pre-fix template's body background `#E8ECF3` (JPEG). The current
  `voc-login-otp.html` (table + inline, outer `#F5F6F8`, white card) contains
  no such colour. So the blank mail was rendered from the **old** template.
- Fix commits `5c8b2d9`/`986bb02` are on `origin/master` (PR #46) and
  `origin/temp`, not on `origin/ekansh`. Live `voc.rsm.com.kw` assets carry an
  empty `?dpl=`, so the running build was not produced by `scripts/deploy.sh`
  (which sets `NEXT_DEPLOYMENT_ID`); live commit could not be read remotely.
  The template is read from disk at send time (`lib/login-otp.ts`), so the VPS
  checkout must contain the new file. Full-app `Dockerfile` runtime stage does
  not copy `templates/` (would use the inline table-safe fallback).
- Next step for operator: on VPS confirm branch/commit and
  `templates/email/voc-login-otp.html` content, run `./scripts/deploy.sh`,
  request a **new** OTP, and compare. No code change this entry.

### 2026-10-12 - RSM: business/job manager missing on completion emails (investigation)

- RSM said two completion emails received today still show no Business
  Manager / Job Manager and they were not CC'd. Prod invite tracker shows both
  invites were sent 5 and 7 Oct, before the fields shipped (9 Oct). Their
  `SurveyInvite` rows have no `businessManager*` / `jobManager*` / `serviceName`
  / `teamLeader`; only the 12 Oct test invite has them.
- `notifyTeamOfSurveyCompletion` reads these values only from the linked
  invite, and CC comes from the invite (then `StaffContact` / env by name). No
  name on the invite means "—" and no CC. Working as built; data never captured.
- Seen in the same email: `buildRespondentContextHtml` pairs `Language` with
  `Email`, so Email prints twice. Not fixed yet.
- Next: backfill BM/JM on open pre-9-Oct invites (or tell RSM only new invites
  carry them); confirm the CRM / Power Automate caller now sends
  `businessManagerName`, `jobManagerName` and emails; fix the duplicate Email
  row. No code or DB change. Linear MCP not available in this session.
- Follow-up same day: confirmed `POST /api/integrations/survey-invites`
  handles the new fields. Added tests in
  `tests/integrations/survey-invites-route.test.ts` (all six fields reach the
  invite; blank manager emails are dropped; a malformed one returns 400 for
  the whole call) and `tests/crm/completion-timing.test.ts` (fields are written
  to `SurveyInvite` and the directory; a reused `idempotencyKey` returns the
  old invite unchanged and sends nothing). Caveats for CRM: `emails` mode
  ignores all metadata; reusing an old key will not add managers to an old
  invite. `npm test`: 414 pass, 7 fail in `cx-dashboard.test.tsx` and
  `agent-config.test.ts`. The same 7 fail without these changes. Tests only;
  no deploy, no prod call.

### 2026-10-09 - Upload-only backup IAM user blocked (follow-up)

- `create-bucket.sh rsm-voc-db-backups --uploader-user` re-applied bucket
  settings, then failed at `iam:CreateUser`: the `RSM-e-invoicing` key has no
  IAM permissions. No user created. User accepted running with the shared key
  for now.
- Follow-up (needs AWS account admin): create `rsm-voc-db-backups-uploader`
  with inline policy `s3:PutObject` + `s3:AbortMultipartUpload` on
  `rsm-voc-db-backups/weekly/*` and `latest/*`, swap its key into the VPS
  `.env`, run the backup once. Until then the VPS holds a key that can list
  (and likely read) other clients' buckets in the shared account.

### 2026-10-09 - VPS backup verified in S3

- After the operator added `BACKUP_APP_NAME`/`BACKUP_DB_*` to the VPS `.env`,
  `install-cron.sh` uploaded `weekly/rsm_voc_2026-10-09T090341Z.dump` and
  `latest/rsm_voc.dump` (~197 KB each, SSE AES256). Downloaded to a temp dir
  (deleted after): `PGDMP` custom-format header, 62 `public` tables in the TOC
  including `Response`, `Client`, `SurveyInvite`, `ResponseEmbedding`, `User`,
  and `CREATE EXTENSION ... vector`. Operator then ran `npx prisma migrate
  status` on the VPS: 23 migrations found (same as the repo), schema up to
  date, so the platform-expansion migrations are applied there; current-state
  and follow-up sections corrected.
- Operator reports the remaining steps done and the backup kit pushed to
  `origin/temp` (commits `7273bd8`, `67e6a85`). A restore test on the VPS was
  not observed from this session.

### 2026-10-09 - VPS backup first run: missing BACKUP_* config

- First `install-cron.sh` run on the VPS failed with `pg_dump is not on PATH`:
  the server `.env.local` lacked `BACKUP_DB_CONTAINER`, so the script fell
  back to URL mode. No upload, no cron installed. Fix is adding the `BACKUP_*`
  and `AWS_*` lines to the server env file (operator). The URL-mode error now
  names the cause. Verification: `bash -n`; `npm run memory:check`.
- Operator check showed the VPS app dir has **no `.env.local`**; config lives
  in `~/rsm-voc-survey-eng/.env` (already has `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_REGION`). The script's
  `.env` fallback covers this; `BACKUP_APP_NAME`/`BACKUP_DB_*` to be appended
  there. `docs/DB_BACKUPS.md` updated to name `.env` for this server.

### 2026-10-09 - Reusable Postgres → S3 backup kit

- Added app-agnostic `scripts/backup/`: `db-backup-to-s3.sh` (Docker
  `docker exec pg_dump -Fc` or URL mode with Prisma-only query params
  stripped; `pg_restore --list` check; uploads `weekly/<app>_<ts>.dump` then
  `latest/<app>.dump`; flock; optional `BACKUP_NOTIFY_URL` success ping; reads
  env vars then parses `.env.local`/`.env` without executing it),
  `install-cron.sh` (test backup, then idempotent crontab line tagged
  `# db-backup-to-s3:<app dir>`, default Sunday 02:00 server time, keeps other
  jobs, `--remove`), `create-bucket.sh` (idempotent bucket + settings,
  optional `--uploader-user` with PutObject/AbortMultipartUpload on
  `weekly/*` and `latest/*` only). Runbook `docs/DB_BACKUPS.md` (setup, verify,
  restore test, disaster restore, reuse for other apps). Updated
  `docs/VPS_HOSTING_HANDOVER.md` backups section, `.env.example` (commented
  backup vars), `PROJECT_BRIEF.md` (structure, deployment, env table).
- Bucket re-applied via `create-bucket.sh`: lifecycle rule IDs are now
  `weekly-expire` (84 days), `latest-keep-prior-30d`,
  `abort-incomplete-uploads`; tag set is `purpose=db-backups`.
- Verification (no Docker/Postgres on the dev Mac, none installed): `bash -n`
  on all scripts; `libpq_url` against Prisma and Neon-style URLs; backup run
  with a stub `docker` uploaded both keys to the real bucket (SSE AES256),
  failing-dump run uploaded nothing, missing-config run errored; all test
  object versions deleted (bucket empty). `install-cron.sh` against a stub
  `crontab`: install, re-install, schedule change, bad schedule, remove; first
  pass lost other jobs under the stub, fixed by reading the crontab before
  writing and re-verified. `create-bucket.sh` re-run on the existing bucket.
  `npm run memory:check`.
- Not done: VPS setup (AWS CLI install, env vars, `install-cron.sh`) and a real
  restore test there; no SSH access from this session. Server currently would
  use the shared `RSM-e-invoicing` key; upload-only user still recommended.
  Linear MCP unavailable.

### 2026-10-09 - Backup bucket: rolling 12 weeks plus always-kept latest

- User wants old backups pruned but the newest always retained. S3 lifecycle
  is age-only, so the layout is two prefixes: `weekly/<timestamp>.dump`
  (rule `weekly-expire-12w`: expire after 84 days, noncurrent after 7) and
  `latest/` (single object overwritten each run; rule `latest-keep-prior-30d`
  never expires the current object, prior versions after 30 days). Rule
  `abort-incomplete-uploads` aborts multipart after 7 days bucket-wide.
  Supersedes the keep-forever entry below. If backups stop, `latest/` still
  holds the last good dump. VM credentials can stay write-only (no delete).
- The future backup script must upload to both prefixes, writing `latest/`
  only after the `weekly/` upload succeeds.
- Verification: read back lifecycle config. `npm run memory:check`.

### 2026-10-09 - Backup bucket retention changed to keep forever

- User decided backups must never auto-expire. Replaced lifecycle rule
  `expire-weekly-backups-12w` with `retain-forever-cleanup-only`: no expiry on
  current objects; noncurrent (overwritten/deleted) versions expire after 30
  days; incomplete multipart uploads abort after 7 days. Supersedes the 84-day
  retention in the entry below.
- Follow-up: indefinite retention of client PII should be confirmed against
  RSM's data-retention policy (ties to the existing retention follow-up).
- Verification: read back lifecycle config. `npm run memory:check`.

### 2026-10-09 - Created S3 backup bucket `rsm-voc-db-backups`

- Created private bucket `rsm-voc-db-backups` in `us-east-1` (user's region
  choice) with the AWS keys from local `.env.local` (`AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`; values not recorded). Those keys
  belong to the shared Nexuses AWS account's `RSM-e-invoicing` IAM user, not a
  VoC-specific identity.
- Settings: Block Public Access (all four), default SSE-S3 with bucket key,
  versioning on, `BucketOwnerEnforced`, bucket policy denying non-TLS access,
  lifecycle `expire-weekly-backups-12w` (current objects 84 days, noncurrent
  versions 7 days, incomplete multipart 7 days), tags `project=rsm-voc`,
  `purpose=db-backups`.
- `.env.local` now sets `AWS_S3_BUCKET_NAME` (bucket name only). Installed
  AWS CLI locally via Homebrew.
- Verification: read back every setting; stdin-streamed test upload,
  download, and SSE check, then deleted all test versions (bucket empty);
  anonymous HTTPS request returns 403. `npm run memory:check`.
- Not done yet (user deferred): backup script, VM cron, VM AWS credentials,
  restore runbook. Follow-up: give the VM a write-only IAM user scoped to this
  bucket rather than the shared `RSM-e-invoicing` keys. Linear MCP was not
  available in this session; no issue created.

### 2026-10-09 - Weekly DB backup to S3 (investigation)

- User asked whether weekly database backups to S3 are possible. Investigation
  only; no code, server, or database change.
- Found: VPS production DB is the Docker `rsm-voc-db` container
  (`pgvector/pgvector:pg16`, db/user `rsm_voc`, volume
  `rsm_voc_postgres_data`, loopback-only port). The repo has no backup script or
  cron; `docs/VPS_HOSTING_HANDOVER.md` says backups are a manual
  responsibility. Vercel/Neon target relies on Neon's own restore history.
- Recommended: weekly system cron as the app user running
  `docker exec rsm-voc-db pg_dump -Fc` streamed to `aws s3 cp -` (no local
  disk use), with a write-only IAM user, SSE, Block Public Access, and an S3
  lifecycle expiry; region choice is a data-residency decision for RSM because
  the dump contains client PII. Not implemented pending user confirmation.
- Verification: read `docker-compose.yml`, VPS handover cron sections, and
  prior memory entries. `npm run memory:check`.

### 2026-10-08 - Full invite API examples

- `docs/API_TRIGGER_SURVEY_EMAIL.md` examples now show every optional field:
  single send and the schema example list all metadata, the CSV example uses
  every column, and the email-list example shows the only fields that mode
  reads. Docs only.

### 2026-10-08 - Invite API schema note for callers

- `docs/API_TRIGGER_SURVEY_EMAIL.md` now has the optional invite fields to hand
  to CRM (`serviceName`, partner and manager names and emails) plus the CSV
  headers. `docs/SURVEY_INVITE_API.md` lists the same fields. Existing calls
  that omit them still work.

### 2026-10-08 - New invite values join the directory

- Sending an invite adds a department, service, partner, business manager, job
  manager, or team leader that is not already in the directory. A person's
  email is saved when the directory row does not have one yet. An email already
  stored there is not replaced.

### 2026-10-08 - Send survey suggestions open on focus

- Send survey directory suggestions open when the field is focused, without
  typing a letter first. Choosing a known person still fills an empty email.

### 2026-10-08 - Survey directory in Settings

- Settings → Directory lists department, service, partner, business manager,
  job manager, and team leader. Partner, business manager, and job manager
  rows include email. Anyone who can open Settings can add, edit, and delete.
  Changes are audited.
- Send survey suggestions read that directory only. Choosing a known person
  fills their email when the email field is empty. Sending an invite no longer
  creates directory rows. Past invites and dashboard filters keep the text
  already stored on the invite.
- Migration `20261008120000_survey_directory_seed` seeds the seven departments
  and distinct names and emails already on invites. Applied locally with
  `npm run db:migrate`. Not deployed.

### 2026-10-08 - Header action buttons clear the content below

- Page headers (`.topbar`) now keep 20px under the title and the buttons on
  the right. Invite tracker and Send survey were sitting those buttons on the
  card border. Responses export buttons, users/roles refresh, and the audit
  toolbar get the same clearance above the table.

### 2026-10-08 - Filter panel collapsed by default

- Report and invite-tracker filters start collapsed. The bar shows “Show filters”
  or an active count, and opens the grouped fields when clicked.
- Vertical space around the bar is 20px on the overview, reports, and responses
  pages (the following block’s own top margin is cleared). Inside the invite
  tracker card the bar sits 16px under the status counts, with the table’s
  existing 18px gap below it.

### 2026-10-08 - Phase 2 screens removed; filters regrouped

- The cases, clients, engagements, surveys, automation, training, integrations,
  and settings platform screens came from the internal roadmap in commit
  `cbb14b2`, not from the RSM meetings. Removed those pages, their APIs, the
  sidebar links, and the settings tab. Yesterday's invite, score, CRM, filter,
  and transcript work stays. Database tables from that commit were left in
  place so the local Neon schema does not need a destructive rollback.
- Report and invite-tracker filters now sit in a panel under the page title,
  grouped as period, client, RSM team, and engagement.
- Linear MCP unavailable in this session.

### 2026-10-07 - Local login 401 and pending staff migration

- `npx prisma migrate deploy` failed with `DATABASE_URL` missing because the
  Prisma CLI does not load `.env.local`. `npm run db:migrate` does.
- Applied `20261007140000_invite_staff_and_service` on the `.env.local` Neon
  DB (`neondb`, `ep-blue-river…`). `migrate status` is up to date (22).
  Additive only. VPS untouched.
- Local `POST /api/auth/mfa/start` returned 401, not a schema 500. The
  `ekansh.k@nexuses.in` admin exists, is not disabled, and its password matches
  `CX_SEED_PASSWORD` in `.env.local`. The failed attempt used that email with
  a different password.
- No source change. Linear MCP unavailable in this session.

### 2026-10-07 - CRM completed-only, filters, survey transcript

- Problem: the CRM status webhook posted `sent` when the invite went out, and
  RSM treated that call as a response. The dashboard could not isolate
  non-responders by sent date or company, and partners saw scores without the
  voice conversation.
- Fix: `createAndSendSurveyInvite` and open/start tracking no longer call the
  CRM webhook. `completeSurveyInviteForResponse` posts `completed` only when
  CSAT, CES, and NPS are present and the completion payload builds; a failed
  payload is logged and skipped. Invite tracker filters by sent date and status
  (All, Invitation sent, Opened, Survey started, Completed, Not completed).
  Shared dashboard filters add date, company, and respondent from loaded invite
  and response values. `GET /api/responses/[id]/transcript` and the responses
  row show question, score, comment, and voice turns. The same turns are
  appended under the scores in the internal completion and action-required
  emails. Suggestion label `CORPORATE TAX` renamed to `CORPORATE FINANCE`.
  The rest of RSM's department list was not invented.
- Files: `lib/survey-invite-tracking.ts`, `lib/dashboard-report-filters.ts`,
  `lib/invite-tracker-filters.ts`, `lib/survey/transcript.ts`,
  `app/api/responses/[id]/transcript/route.ts`, dashboard filter and responses
  components, `lib/survey-thankyou-email.ts`, `lib/survey-org-structure.ts`,
  `docs/API_CRM_STATUS_WEBHOOK.md`, `PROJECT_BRIEF.md`.
- Verification: `tests/crm/completion-timing.test.ts`,
  `tests/dashboard/dashboard-report-filters.test.ts`,
  `tests/survey/transcript.test.ts`. Not deployed. VPS still needs this change
  and migration `20261007140000_invite_staff_and_service` before live invites
  match it. Linear MCP unavailable in this session.

### 2026-10-07 - Free-text invite fields, auto filters, one overall result

- RSM meeting: partner, business manager, and job manager (name + email) and
  service name as free text; CC those three on a response; subject
  company + contact + result; fix subject/body result mismatch; overall
  result is worst band, not the AI label.
- `SurveyInvite` columns `partnerEmail`, `businessManagerName`,
  `businessManagerEmail`, `jobManagerName`, `jobManagerEmail`, `serviceName`.
  New `StaffContact` master. Migration
  `20261007140000_invite_staff_and_service` seeds current partner names with
  no email. Upsert on invite create: new name inserted; email filled only
  when the master email is empty. `teamLeader` still stored, not CC'd.
- Invite form, CSV, and `POST /api/integrations/survey-invites` accept the
  fields. Form inputs are free text with datalist suggestions. Dashboard and
  invite-tracker filters use distinct stored values (department no longer
  clears partner).
- Completion subject `{Company} — {Contact} — Result: Positive|Neutral|Negative`
  from `overallSurveyResult` (CSAT 1–2 / CES 1–3 / NPS 0–6 Negative; CSAT 3 /
  CES 4 / NPS 7–8 Neutral; else Positive; any Negative wins). Same word in
  the body. Action-required email only when Negative. CC order: invite email,
  then `StaffContact`, then `SURVEY_STAFF_DIRECTORY`. CRM `scores.sentiment`
  unchanged.
- Reply text for RSM is at the end of `docs/API_TRIGGER_SURVEY_EMAIL.md`.
  Not deployed. Linear auth was skipped this session.
- Verification: staff, completion-email, filter, metrics, and insights tests;
  `tsc --noEmit`. `npm run memory:check`.

### 2026-10-06 - Confirmed one-page completion email status

- User asked if the one-page response email (Noha feedback) was done. The
  compact layout, `Label: value` details, subject result and staff CC are in
  commit `cbb14b2` on branch `temp` (in sync with `origin/temp`). The email
  RSM screenshotted (2026-10-01) predates it, so the VPS still needs this
  commit deployed; only completions after deploy use the new layout.
- Working tree has an uncommitted user edit adding the header banner and
  legal footer to `templates/email/voc-team-action-required.html` (not from
  this session). No code change this entry.

### 2026-10-05 - RSM updated department list (analysis + RSM email draft)

- RSM shared a new 16-department list (Accounting & Bookkeeping, Assurance,
  A-TAX, Business Development, Corporate Finance, Corporate Secretarial
  Services, Customer Experience, Customer Relationship Management,
  Cybersecurity, Family Business, FSA, Risk Consulting, Sustainability, Tax,
  Tax Solutions, Technology Advisory Services). Current
  `lib/survey-org-structure.ts` has 7 departments with partner mapping; it
  drives the invite form department→partner dropdowns, dashboard
  department/partner filters, invite tracker, and `lib/domain/org-backfill.ts`.
  API/CSV department stays free text; matching is case-insensitive.
- Related to staff CC: drafted one email asking RSM for department → partner
  (+ email) and team leaders (+ email), plus old→new department mapping for
  existing invites. No code change yet; awaiting RSM data.

### 2026-10-05 - Internal completion email fixes from RSM client-test feedback

- RSM feedback on the internal "new survey response" email (client test sent
  2026-09-29): (1) Engagement Partner / Team Leader "not shown — BCC?";
  (2) respondent details need `Label: value`; (3) overall result (e.g.
  Positive) in subject; (4) all three questions on the first printed page.
- `lib/survey-thankyou-email.ts`: respondent details now a two-column
  `Label: value` table; labels renamed `Email`, `Engagement Partner`,
  `Team Leader`. New `resolveOverallResult` (AI insight `overallSentiment`,
  CSAT-bucket fallback) → subject suffix `— Result: <X>` and body
  "Overall result" on team-notify and action-required emails (plain text too).
  Survey summary (shared with client thank-you) restacked: metric + score on
  one row, question, comments full width; `page-break-inside: avoid`.
- Templates `voc-team-notify.html` / `voc-team-action-required.html`: tighter
  spacing, `{{overall_result}}` placeholder, `@media print` rules.
- Print check (Playwright A4, long comments on all three): NPS block bottom
  moved from 1344px to 873px (page ≈ 1046px), leaving room for the mail
  client print header.
- Point (1): partner/team leader were stored as **names only** and never
  recipients (no BCC). User chose a name→email directory with **CC**. Added
  `lib/survey-staff-directory.ts` reading env `SURVEY_STAFF_DIRECTORY` (JSON
  `{"Full Name":"email"}`, case/whitespace-insensitive match, invalid entries
  skipped with a warning). `sendSurveyInviteEmailToRecipients` gained `cc`
  (deduped against `to`, since SendGrid rejects repeats). Team notify +
  action-required emails CC the invite's partner/team leader when resolvable;
  `TeamNotifyResult` now includes `cc`. Env documented in `.env.example`,
  `PROJECT_BRIEF.md`, `docs/VPS_HOSTING_HANDOVER.md`.
- Follow-up: RSM must supply partner/team-leader emails; operator sets
  `SURVEY_STAFF_DIRECTORY` in VPS `.env.local` and restarts PM2. Until then
  no CC is sent (behaviour unchanged).
- Verification: email/directory tests 28 pass (new
  `tests/lib/survey-staff-directory.test.ts`, CC cases in notify and SendGrid
  payload tests), `tsc --noEmit` clean, eslint (pre-existing `min` warning
  only). Full vitest 393 pass / 5 fail in `cx-dashboard.test.tsx` and
  `agent-config.test.ts`, unrelated (do not import the email modules; from
  other uncommitted work). Not deployed. Linear MCP unavailable.

### 2026-10-05 - Local admin login + platform migrations on `.env.local` Neon

- Problem: local `/login` returned 500 on `POST /api/auth/mfa/start` with
  Prisma P2022 `User.disabledAt` missing — the working-tree platform code
  expected the five `20260928*` migrations, which were unapplied on the
  `.env.local` Neon DB (`neondb`, endpoint `ep-blue-river…`). Not a missing
  user (`dev.team@nexuses.in` already existed).
- Database: with user approval, ran `npm run db:migrate` (migrate deploy) on
  that Neon DB; all five migrations applied, `migrate status` now up to date
  (21). Reviewed first: additive only (new tables, nullable columns,
  `User.sessionVersion` default 0), so older deployed code sharing this DB is
  unaffected. VPS Postgres untouched.
- Upserted admin `ekansh.k@nexuses.in` via `scripts/upsert-local-dev-user.mts`.
  Generated password stored only in gitignored `.env.local` as
  `CX_SEED_EMAIL` / `CX_SEED_PASSWORD` / `CX_SEED_ROLE` (rerun the script
  to reset). Note `npm run db:seed` also reads `CX_SEED_*`.
- Verification: `POST /api/auth/mfa/start` → 200 against local `next dev`;
  `[login-otp]` code printed in the dev console (OTP also emailed).
- No source code change. Linear MCP unavailable in this session.

### 2026-10-05 - RSM banner + footer on action-required team email

- Problem: the internal "Action required" (needs-attention) email had no RSM
  header banner, legal disclaimer, or footer image; git history shows it never
  had them (original omission, not a regression).
- `templates/email/voc-team-action-required.html`: added the same ImageKit
  header banner, RSM Albazie disclaimer row, and footer image used by
  `voc-team-notify.html`.
- `tests/dashboard/survey-completion-notify.test.ts`: action-required render
  test now asserts the banner and footer image URLs.
- Verification: `survey-completion-notify.test.ts` 13/13 pass. Not deployed;
  no database change. Linear MCP unavailable in this session.

### 2026-09-29 - VPS test-data purge commands (ops guidance)

- User asked for commands to delete all test invites + responses on the Vultr
  VPS Docker DB (`rsm-voc-db`, db/user `rsm_voc`), keeping only the one real
  client invite sent today (kept by invite email; its linked response kept via
  `responseId` / `conversationId` / client email).
- Provided: `pg_dump -Fc` backup, read-only preview, single-transaction delete
  (CrmWebhookDelivery → SurveyInvite [cascades events] → Response [cascades
  insight/embedding/ScoreResult/ResponseAnswer] → orphan Client → clear
  CsatSnapshot/ThemeRollup/PublicReviewSnippet) with an abort guard, manual
  COMMIT/ROLLBACK, then `recomputeAggregates()` via `npx tsx` in the app dir.
  AuditLog intentionally left intact.
- No change run from this session (no VPS access); verified recompute one-liner
  resolves locally (import only, no DB). `npm run memory:check`.

### 2026-09-29 - CRM Power Automate status webhook smoke test

- User asked to test the Power Automate CRM status webhook URL. It is identical
  to the `CRM_STATUS_WEBHOOK_URL` already in local `.env.local` (no
  `CRM_STATUS_WEBHOOK_SECRET`; auth is the URL `sig`).
- Sent one standalone `completed` `survey.status` payload (same headers/shape as
  `lib/crm/status-webhook.ts` + `lib/crm/completion-payload.ts`) with obvious
  test data (`externalEngagementId` `VOC-WEBHOOK-TEST`, `example.com` email,
  comment marked TEST). Response **HTTP 200** body `success` (~1.7s), Azure
  region westeurope; flow run id returned in `x-ms-workflow-run-id`. A tampered
  `sig` returned **401 AuthorizationFailed**.
- No DB write on the VOC side (bypassed `dispatchCrmStatusWebhook`). The test
  row may appear in RSM CRM and should be ignored/deleted by RSM. No code
  change. Linear MCP unavailable this session. URL value not recorded.
- Verification: live fetch smoke test; `npm run memory:check`.

### 2026-09-24 - CRM production Power Automate webhook URL guidance

- RSM provided a production Power Automate HTTP trigger URL for the same CRM
  status flow previously smoke-tested on the **dev** URL. Usage: set
  `CRM_STATUS_WEBHOOK_URL` to the full invoke URL (including `sig`); leave
  `CRM_STATUS_WEBHOOK_SECRET` unset (auth is the URL signature). Same as the
  2026-09-08 smoke test. Do not commit the URL. Local: `.env.local` + restart;
  production VPS: env for the Next.js process + restart PM2.
- Verification: docs/`API_CRM_STATUS_WEBHOOK.md` + prior smoke pattern; no
  code change. URL value not recorded in memory.

### 2026-09-24 - Fix TypeScript build failures in tests

- `npm run build` typecheck failed on outdated test fixtures after
  department/partner, analytics completion fields, and NextRequest typing
  landed in app code. Updated fixtures and helpers across dashboard/
  integrations/survey tests; aligned `voice-locale` test with single-arg
  `getVoiceConversationLanguage`.
- Verification: `npm run build` succeeded; `npm run memory:check` after this
  entry.

### 2026-09-24 - Outlook-safe thank-you + team emails

- Same Outlook blank-body risk as OTP: `voc-thankyou.html`,
  `voc-team-notify.html`, and `voc-team-action-required.html` used CSS
  variables / card classes. Rebuilt all three as table + inline Arial
  styles. Attention banners and respondent-context / summary HTML in
  `lib/survey-thankyou-email.ts` now use inline styles (no `.attention`
  / `.label` classes). Invite, follow-ups, and OTP were already safe.
- Noted in `docs/EMAIL_DELIVERABILITY.md` §3.
- Verification: `npx vitest run tests/dashboard/survey-thankyou-email.test.ts
  tests/dashboard/survey-completion-notify.test.ts` passed (12 tests);
  `npm run memory:check` after this entry.

### 2026-09-24 - OTP email blank in Outlook

- Login OTP HTML used modern CSS (variables/div cards) that Outlook often
  blanks. Rebuilt `voc-login-otp.html` as table + inline styles so the
  verification code stays visible even when remote images are blocked.
  Plain-text part already included the code.

### 2026-09-24 - Outlook “outside RSM” email caution

- Root cause: VOC sends via SendGrid, so M365 stamps the org “external email”
  warning on mail to RSM Kuwait mailboxes. Not a template bug.
- App: disable SendGrid click/open/subscription tracking so links stay on
  rsm/voc domains. Documented DNS (SPF/DKIM) + M365 transport-rule exception in
  `docs/EMAIL_DELIVERABILITY.md`. Note: banner alone does not hide the body;
  blank OTP body was a separate Outlook HTML issue (see next entry).

### 2026-09-21 - Client request changes documentation

- `docs/CLIENT_REQUEST_CHANGES_2026-09.md` is a feature-by-feature status of the
  Nexuses/RSM request list only (Done / Partial / Pending). Updated
  `docs/NEXUSES_VOC_FEATURES.md` inventory separately.

### 2026-09-21 - npm audit: safe dependency bumps

- `npm audit fix` for transitive browserslist / baseline-browser-mapping / js-yaml.
- Bumped `next` + `eslint-config-next` to `16.3.5` (security patches; keeps Next 16).
- Bumped `vitest` to `^4.1.11` (mocker advisory; avoided Vitest 5).
- Overrides: `deepmerge-ts@^8.0.2`, `sharp@^0.35.4` (Prisma / Next transitive).
- Result: `npm audit` reports 0 vulnerabilities. Spot-checked vitest suites.

### 2026-09-21 - Responses default recency + pagination

- Default layout is By recency. Added pagination with 25/50/100 rows per page,
  First/Previous/Next/Last controls, and status text (also paginates email
  groups in By email view).

### 2026-09-21 - Responses layout: drop By client

- Removed the By client (name) layout toggle from `/dashboard/responses`.
  Only By email (default) and By recency remain.

### 2026-09-21 - Voice invite email on Responses / Client

- Voice never asks for email (agent policy); Responses Email column only read
  `Client.email`, so tracked-invite voice rows showed "No email on file" and
  quarterly overwrite could not key them.
- Fix: fall back to `SurveyInvite.email` in insights mapping; on invite
  completion copy invite email onto Client; repair script
  `scripts/repair-voice-invite-emails.mts` for existing rows (then
  `repair-quarterly-overwrite.mts`).

### 2026-09-19 - Password change show/hide toggles

- New password, confirm, and current password fields on Settings → Account now
  have eye-icon toggles to reveal/hide the typed value.

### 2026-09-19 - Fix chat-invite-context build type error

- `InviteRow.client.name` was typed as `string` but Prisma `Client.name` is
  `String?`. Switched to `Prisma.SurveyInviteGetPayload` from the select so
  Next build typecheck passes.

### 2026-09-19 - Outlook-safe survey follow-up emails

- Root cause: invite HTML used table + inline styles; follow-ups used modern CSS
  (flex, CSS variables, Google Fonts, rounded cards) that Outlook desktop (Word
  engine) renders poorly. Reminders also used a different subject, so they did
  not thread with the original invite.
- Fix: rebuilt `voc-followup-day3/day5.html` as table-based emails with plain
  URL fallback; VML-safe CTA; subjects now `Re: <original invite subject>`.
- Files: follow-up templates, `lib/survey-invite-templates.ts`,
  `lib/survey-invite-tracking.ts`.

### 2026-09-19 - Insights chat invite totals + per-email feedback

- Root cause: invite context only token-matched names/emails, so questions like
  “how many invites were sent?” became weak searches (`how`/`many`) with no
  totals. Fix: always inject full outreach summary counts; treat aggregate
  questions without email/quoted name as summary-only; include linked response
  scores/comments for matched invites (and orphan email feedback).
- Files: `lib/chat-invite-context.ts`, `app/api/chat/route.ts` prompt,
  `tests/dashboard/chat-invite-context.test.ts`.

### 2026-09-19 - Dashboard ElevenLabs voice credits warning

- Added `GET /api/dashboard/voice-credits` (reads ElevenLabs
  `/v1/user/subscription`) and a dashboard banner when usage is ≥80% / ≥95% /
  exhausted. Survey voice start now shows a clear credits-exhausted message
  when ElevenLabs closes with `quota_exceeded`.
- Files: `lib/elevenlabs/subscription.ts`, route, `VoiceCreditsBanner`,
  `DashboardShell`, `VoiceSurvey` + locale copy, unit test.

### 2026-09-18 - Fix voice+invite quarterly overwrite

- Root cause: ElevenLabs webhooks do not include `inviteToken`, so overwrite
  ran with no email even when the survey opened from a tracked invite (invite
  is linked by `conversationId` earlier). Both voice completions stayed active.
- Fix: resolve overwrite email from invite by conversationId/responseId, and
  re-run soft-exclude after invite linking in enrichment.
- Added `scripts/repair-quarterly-overwrite.mts` to soft-exclude existing
  same-email duplicates in the current data.
- Verified with ingest unit test for conversationId invite email resolution.

### 2026-09-18 - Responses search + By email; overwrite confirmation

- Overwrite is per respondent **email** in the same UTC calendar quarter (not
  name/company). Voice rows without email/invite email are not merged — both
  keep showing. Added Responses table Email column, Search box, and **By email**
  layout plus a short overwrite hint.
- Files: `components/dashboard/DashboardResponses.tsx`,
  `lib/dashboard-responses-export.ts`, tests, CSS.

### 2026-09-18 - Dashboard handles Neon P1001 without crash

- Neon briefly unreachable (`P1001` on `getUserPermissionSet`) was bubbling
  through `app/dashboard/layout.tsx` as a runtime crash. Transient Prisma
  connectivity errors now render a retry notice instead of throwing.

### 2026-09-18 - Compact mobile report filters + center sentiment donut

- Shrunk CSAT/NPS/CES report filter selects on mobile (32px height, tighter
  gaps) so they stop dominating the viewport.
- Centered the sentiment-distribution donut when the card stacks to a column
  layout (was left-aligned with empty space on the right).

### 2026-09-18 - Single-line CSAT/NPS/CES report titles

- Redesigned metric report headers: kicker above a single-line icon+title,
  filters aligned right and visually quiet (no card chrome) so the heading
  stays primary; filters wrap cleanly on narrow widths.

### 2026-09-18 - Remove Experience trend demo months

- Removed `withDemoTrendMonths` filler from the overview Experience trend chart
  so it only shows real `report.trend` months. Deleted `lib/trend-demo.ts` and
  `tests/dashboard/trend-demo.test.ts`.

### 2026-09-18 - Branded login OTP email

- Rebuilt `templates/email/voc-login-otp.html` to match VoC invite/thank-you
  branding (RSM top logo, Voice of Client banner, code panel, legal disclaimer,
  footer image). Updated subject/text and HTML fallback in `lib/login-otp.ts`.

### 2026-09-18 - Login OTP field password autofill

- Fixed MFA step where browsers/password managers often prefilled the
  verification code input with the password from the prior step.
- OTP input is now controlled (digits only), form uses autofill traps plus
  `one-time-code` / password-manager ignore attrs, and delayed autofill is
  scrubbed on step enter.

### 2026-09-18 - Local Neon dashboard login for Nexuses

- Upserted admin user `dev.team@nexuses.in` on the local Neon `DATABASE_URL`
  (password supplied only via one-off env for that run; not stored in repo).
- Added `scripts/upsert-local-dev-user.mts` for short-password local upserts
  (min 8 chars) when the production CX upsert script’s 12-char gate is too
  strict for a temporary local account.
- Non-production login OTP codes now always print to the server console
  (`[login-otp] code for …`) so localhost MFA works even when the OTP email
  is not readable from the local mailbox.

### 2026-09-18 - Dashboard metric brand logos

- Added transparent CSAT (green smiley), NPS (blue thumbs-up), and CES (grey
  stars) logos under `public/metrics/` from provided brand artwork.
- Wired `MetricKindIcon` / `MetricTitle` to those assets on overview summary
  cards, response breakdown headers, and CSAT/NPS/CES report page titles.
- Verified with `tests/dashboard/metric-icons.test.tsx`.

### 2026-09-18 - Swap CES / NPS identity colors

- Metric identity colors are now CSAT `#3f9c35`, CES `#888b8d`, NPS `#009cde`
  (CES/NPS swapped). Rating-scale tones unchanged.
- Touched: `lib/rating-visuals.ts`, widget scripts, dashboard/report CSS,
  PDF trend accents, tests, brief/memory.

### 2026-09-18 - Widget CES identity color

- `/widget` CES gauge arc was painting green on high scores; it now always uses
  the CES identity color (now grey after the CES/NPS swap). Same identity fill
  on dashboard `CesGaugeChart` and classic PDF CES gauge.
- Files: `public/widget.js`, `components/dashboard/MetricCharts.tsx`,
  `lib/dashboard-pdf-classic.ts`.
- Note: change was local as of this entry — VPS `voc.rsm.com.kw/widget.js` still
  served the old score-based green fill until redeploy.

### 2026-09-18 - Meeting action items (auth, RBAC, responses, widgets)

- Email OTP MFA on every dashboard login (`LoginOtp`, `/api/auth/mfa/start`,
  two-step `/login`, NextAuth credentials require `otp`).
- System `surveyor` role (invite send + tracker); `responses.manage` for admin
  exclude/delete; bootstrap script `scripts/upsert-rsm-admins.mts` for the four
  RSM Kuwait admin emails (password via env only).
- Soft-exclude / hard-delete response APIs + responses UI; aggregates, insights,
  RAG, and scheduled reports skip excluded rows.
- Per-email UTC calendar-quarter overwrite on ingest (prior responses
  soft-excluded).
- Invite tracker CSV/Excel export; insights chat receives invite-tracker
  context; needs-attention completions send a second action-required email.
- Public pages `/widget` and `/widget/reviews` with copyable links on
  `/dashboard/widget`.
- Docs: `PROJECT_BRIEF.md`, this memory entry. Migration:
  `prisma/migrations/20260918120000_response_exclude_login_otp`.
- Verification: targeted Vitest (RBAC, quarterly helpers, widget links, notify,
  chat route); `npx prisma generate`; `npm run memory:check`; migration applied
  to Neon via `db:migrate`; four RSM admin users upserted with
  `db:upsert-rsm-admins`.
- Ops: re-apply migration + admin upsert on any other hosts (e.g. VPS) if they
  use a different database. Avra integration skipped per meeting.

### 2026-09-16 - CSAT/CES/NPS identity colors

- Dashboard, PDF, public report, and embed widgets now use metric identity
  colors CSAT `#3f9c35`, CES `#009cde`, and NPS `#888b8d` on cards, trends,
  titles, and donuts. Rating-scale good/neutral/bad mapping is unchanged.
  CSAT Satisfied and CES Easy scale segments use `#65b05d` instead of `#57a000`.
- Files: `lib/rating-visuals.ts`, `lib/metric-report-content.ts`,
  `lib/dashboard-pdf.ts`, dashboard/report CSS and charts, `public/widget.js`,
  `public/widget-reviews.js`, and related tests.
- Verification: Vitest for rating visuals, metric report content, widgets, and
  PDF; browser check of `/reports` and the metrics/reviews widgets (CSAT green,
  CES blue, NPS grey; Satisfied/Easy scale `#65b05d`). Linear MCP was not
  available in this session. `npm run memory:check` passed.
- No database or deployment changes.

### 2026-09-16 - Cloudflare security-audit skill run (source review)

- Installed and ran Cloudflare `security-audit` skill against this repo
  (commit `a427bb6`, dirty worktree). Output outside repo:
  `~/security-audit-skill/rsm-voc-survey-new-main/run-1/`
  (`REPORT.md`, `FINDINGS-DETAIL.md`, `NEEDS-VALIDATION.md`, `findings.json`).
- Confirmed high: `GET /api/insights` uses `requireCxUser` only while dashboard
  shell always fetches it, exposing `client.email` to under-privileged custom
  roles. Confirmed medium: `CRON_SECRET` via `?secret=`; empty RolePermission
  fail-open to OPERATIONAL; system-role PATCH mutable; survey rate-limit XFF
  spoof on documented VPS nginx. Needs validation: survey Origin /
  `X-Forwarded-Host`. Rejected: chat `$queryRawUnsafe` SQLi.
- Late hunters corroborated and added three medium findings; Phase 5 verified.
  Validators passed (7 findings). No application source changes. Linear MCP
  not available in this session (tracking skipped).

### 2026-09-15 - Reviews widget shows who said it

- Added `respondentName` and `company` on `PublicReviewSnippet` (migration
  `20260915140000_public_review_attribution`) for showcase attribution.
- Public reviews API/widget now render `Name · Company` when available; email
  and phone remain excluded. Comment text still sanitized.
- Updated AGENTS/PROJECT_BRIEF binding rules for this intentional exception on
  the reviews showcase only.
- Ran migrate + `recomputePublicReviewSnippets()`; verified Vitest and
  `npm run memory:check`.

### 2026-09-15 - Recent reviews: drop 14-day cutoff

- Widget was empty because snippets were filtered to the last 14 days only.
- Changed rebuild to take the most recent commented responses overall (cap 12),
  regardless of age; API now returns `limit` instead of `windowDays`.
- Updated widget/dashboard copy to “Most recent” and refreshed docs.
- Ran `recomputePublicReviewSnippets()` to populate the public table.
- Verification: targeted Vitest + `getPublicReviews()` count after rebuild;
  `npm run memory:check`.

### 2026-09-15 - Apply PublicReviewSnippet migration (fix 500)

- Root cause of `GET /api/public/reviews` 500 was missing table
  `PublicReviewSnippet` (migration not deployed), not an empty 14-day window.
- Ran `npm run db:migrate` against the configured Neon DB; schema is up to date.
- Verified `getPublicReviews()` returns `{ windowDays: 14, count: 0, reviews: [] }`
  when no recent commented responses exist (empty state, not an error).
- Follow-up: after new commented surveys land, `recomputeAggregates()` (on ingest)
  will populate snippets for the widget.

### 2026-09-15 - Public recent-reviews showcase widget

- Added `PublicReviewSnippet` (migration
  `20260915120000_add_public_review_snippet`) rebuilt on aggregate recompute
  for a rolling 14-day window (max 12 anonymized comments with CSAT/CES/NPS).
- Added `GET/OPTIONS /api/public/reviews`, `lib/public-reviews.ts`,
  `public/widget-reviews.js`, and a second preview/embed block under the
  metrics widget on `/dashboard/widget`.
- Updated public binding rules to allow `PublicReviewSnippet` only (still no
  `Response` / `Client` / `ResponseInsight` on public routes).
- Linear MCP was unavailable in this session; tracking issue was not created.
- Verification: targeted Vitest for public reviews, widget source, embed
  helper, and comment/PII helpers; `npm run memory:check`.
- Follow-up: run `npx prisma migrate deploy` on each environment, then trigger
  `recomputeAggregates()` (or ingest a response) so snippets populate.

### 2026-09-11 - Full invite flow doc outline

- Added `docs/FULL_INVITE_FLOW.md`: high-level platform/CRM invite → email →
  survey → save → thank-you/team notify → auto/manual follow-ups, with
  screenshot IDs F01–F21. Cross-linked from `GO_LIVE_CHECKLIST.md` and
  `PROJECT_BRIEF.md`.

### 2026-09-10 - Hamburger missing in mid-width dashboard

- Collapsed nav (no left sidebar) only kicked in at 1100px; mid widths still
  felt “between desktop and mobile” without a reliable menu control.
  `display: contents` on the header also made the toggle flaky.
- Sidebar now collapses with hamburger at `max-width: 1280px`; header is always
  a normal flex row (brand + icon button).

### 2026-09-10 - Send-invite CSV panel overflow on mobile

- CSV upload panel (file input, column `code` strip, subject) overflowed the
  card on narrow widths. Constrained invite containers with `min-width: 0` /
  `max-width: 100%`, forced file inputs to full width, and stacked CSV actions
  under 760px.

### 2026-09-10 - Mobile survey link text visibility

- “Open client survey” in the mobile nav was white-on-white because
  `.sidebar nav a` beat `.surveyLinkMobile` on color specificity. Raised the
  survey-link selector so charcoal text shows on the white button.

### 2026-09-10 - Mobile dashboard header cleanup

- Fixed jumbled ≤1100px header: brand + Menu label + “Open client survey”
  competed on one row and overlapped “CX Intelligence”.
- Mobile now uses brand | icon hamburger only; survey link lives inside the
  opened nav. Topbar actions (PDF download / filters) stack full-width under
  760px.

### 2026-09-10 - Mobile dashboard hamburger nav

- Narrow layouts (`max-width: 1100px`) hid `.sidebar nav` with no opener, so
  dashboard sections were unreachable on phones/tablets.
- Added a Menu/Close hamburger on `DashboardShell` that expands the nav under
  the top bar; closes on route change and Escape.

### 2026-09-09 - Arabic still male after Heba voiceId (language preset)

- Live `voc.rsm.com.kw` bundle already included Heba `tts.voiceId` override;
  `voice-session` 200 only proves signed URL creation, not which TTS voice
  ConvAI uses after `agent.language: ar`.
- Agent Arabic language preset had `tts: null`. English default is Flash v2 /
  Siren (female). Switching to Arabic without a language-specific voice makes
  ElevenLabs use a default Arabic-capable voice (male). Heba is female Arabic
  and is not on `eleven_flash_v2`.
- Fix: set `language_presets.ar.overrides.tts.voice_id` to
  `ARABIC_HOST_VOICE_ID`. Applied on the local `.env.local` agent; VPS uses a
  different `ELEVENLABS_AGENT_ID` and must run
  `npx tsx scripts/set-arabic-host-voice.mts --apply` with VPS env (or set
  Arabic voice in the ElevenLabs agent Additional Languages UI).
- Also wired the Arabic preset + `voc.rsm.com.kw` allowlist into
  `buildAgentUpdate()`.

### 2026-09-09 - Arabic host uses TTS voiceId (not a second agent)

- `v7UCHHCrHj1KBa4E41gb` is an ElevenLabs **voice** id, not an agent id.
  Reverted `ELEVENLABS_ARABIC_AGENT_ID` signed-URL path. Both hosts sign
  `ELEVENLABS_AGENT_ID`; Arabic applies allowlisted `tts.voiceId` +
  `agent.language: ar`.
- Remove unused `ELEVENLABS_ARABIC_AGENT_ID` from VPS `.env` (optional) and
  deploy/reload so Arabic sessions stop 503-ing on a fake agent id.
- Note: an earlier screenshot showed a live `ELEVENLABS_API_KEY` fragment —
  rotate that key in ElevenLabs if it may have been exposed.

### 2026-09-09 - Arabic voice 503 locally (missing env)

- Arabic voice sessions returned 503 because `.env.local` lacked
  `ELEVENLABS_ARABIC_AGENT_ID`. Added the configured Arabic agent id locally
  (not committed). Restart `npm run dev` required to pick up the env var.
- Same ops step still needed on VPS `.env` + `pm2 reload` for production.

### 2026-09-09 - Voice host picker side-by-side layout

- Removed leftover `.voicePickerActions > :last-child { grid-column: 1 / -1 }`
  from the old three-option picker so English and Arabic sit as equal
  side-by-side cards on desktop (stack on narrow screens).

### 2026-09-09 - English / Arabic voice host switch

- Replaced Hana/Heba/Sara picker with English and Arabic hosts.
- `POST /api/survey/voice-session` accepts `language: "en" | "ar"` and signs
  `ELEVENLABS_AGENT_ID` or `ELEVENLABS_ARABIC_AGENT_ID` server-side; client
  `agentId` still rejected. Removed browser `tts.voiceId` overrides.
- Updated `.env.example`, `PROJECT_BRIEF.md`, voice locale copy, unit/e2e tests.
- Verification: focused Vitest for voice-session, elevenlabs client, host
  options, and survey-experience; `npm run memory:check`.
- Ops follow-up: set `ELEVENLABS_ARABIC_AGENT_ID` on VPS `.env` and `pm2 reload`.

### 2026-09-09 - Checklist updated from operator VPS confirmations

- Operator confirmed on VPS: `SURVEY_INVITE_API_KEY`, `CRON_SECRET`, system
  crontab, ElevenLabs webhook URL + secret, live mic voice call, team notify
  working. Outbound CRM / Power Automate automation still in progress — marked
  deferred (not blocking cutover).
- Updated `docs/GO_LIVE_CHECKLIST.md` accordingly; removed stale “still needs
  VPS” command block for confirmed items.
- No code change. Linear MCP not in tool catalog this session.
- Verification: doc update; `npm run memory:check`.

### 2026-09-09 - Remaining go-live checklist sweep on voc.rsm.com.kw

- Walked leftover checklist items with admin session then logout:
  dashboard single+CSV invites (links on `voc.rsm.com.kw`); tracker note +
  manual follow-up + completed **409**; track open/start/**404** unknown;
  invite-linked typed complete → invite `completed`/`thank_you`; `/results`
  **200**; voice-session signed URL; host picker UI; invite-link **200**;
  `/reports` + `/widget.js`; Vitest 237 passed; logout clears session.
- Blocked without VPS secrets (laptop keys 401): CRM
  `/api/integrations/survey-invites`, authorized cron, signed ElevenLabs
  webhook happy path. Manual mic call + inbox confirmations still open.
- Rewrote ticks in `docs/GO_LIVE_CHECKLIST.md` with remaining operator
  commands. Admin session was signed out at end of walk — user must log in
  again.
- Linear MCP not in tool catalog this session.
- Verification: live browser/API + `npm test`; `npm run memory:check`.

### 2026-09-09 - Admin RBAC live walk on voc.rsm.com.kw

- Session `admin@rsm.kw` role `admin`: `/api/settings/users` + `/roles` 200;
  Settings Users/Roles UI loads; created disposable CX user
  `golive-cx-…@example.test`; custom role create/delete OK; system role delete
  rejected 400; bad-password credentials callback 401 without clearing admin
  session. Logout still unchecked.
- Updated `docs/GO_LIVE_CHECKLIST.md` §1 (and §7 permission note).
- Linear MCP not in tool catalog this session.
- Verification: browser session + API calls; `npm run memory:check`.

### 2026-09-09 - Remove hardcoded Mr. from invite greeting

- Invite HTML (`templates/email/voc-invite.html` and the source
  `templates/email/Survey Email.html`) greeted every recipient as
  `Dear Mr. [Client Name]`. Follow-up and thank-you templates already used
  `Dear [Client Name]` with no honorific, and the platform does not store a
  title/gender field, so the hardcoded Mr. was always wrong for many clients.
- Greeting is now `Dear [Client Name]`, matching the other VoC emails.
- Linear MCP not in tool catalog this session.

Verification:

```text
npx vitest run tests/dashboard/survey-invite-tracking.test.ts
npm run memory:check
```

### 2026-09-09 - Live walk §1/§7 dashboard on voc.rsm.com.kw

- After login fix, walked CX dashboard as `cx.admin@rsm-voc.app` (session role
  `cx`, host stayed `voc.rsm.com.kw`): overview metrics/filters; CSAT/NPS/CES
  reports; responses ledger (39, CSV/Excel, by client/recency); widget preview;
  invite form + tracker (10 shown); insights RAG answered themes question;
  `/api/insights` 200; audit UI shows login + invite events.
- Permission gates: `GET /api/settings/users|roles` 403 for `cx` role; settings
  users URL redirects to overview. Bad-password and logout not re-tested;
  admin users/roles create not exercised.
- Ticked matching §1/§7 rows in `docs/GO_LIVE_CHECKLIST.md`.
- Linear MCP not in tool catalog this session.
- Verification: browser walk + in-session API fetches; `npm run memory:check`.

### 2026-09-09 - VPS Docker CX user reset commands (ops guidance)

- User has VPS access; SSH from agent still blocked. Gave docker `psql`
  inspect + host-side upsert against `rsm-voc-db` (scrypt via app
  `hashPassword`). No production change from this session.
- Verification: guidance only; `npm run memory:check`.

### 2026-09-09 - CX user upsert path for VPS login

- SSH from this laptop to `134.149.188.8` is Permission denied (publickey) for
  rsmuser/azureuser/ubuntu/admin/root — cannot seed the VPS DB remotely from here.
- Added `scripts/upsert-cx-user.mts` + `npm run db:upsert-cx-user` to create/reset
  a single admin/cx user without sample survey seed data. Documented under
  `docs/VPS_HOSTING_HANDOVER.md` §8.7.
- Operator must run the script on the VPS (or any shell with production
  `DATABASE_URL`) for `cx.admin@rsm-voc.app`, then retry login on
  `voc.rsm.com.kw`.
- Linear MCP not in tool catalog this session.
- Verification: script added; `npm run memory:check`.

### 2026-09-09 - Login failure on voc.rsm.com.kw (investigation only)

- User reported unable to log in after go-live smoke walks. Confirmed this
  session did **not** change auth code, users, passwords, or VPS env — only
  checklist docs, MEMORY/brief links, and public typed-survey API posts.
- Auth probes: `/api/auth/providers` + `/csrf` 200 on `voc.rsm.com.kw`;
  providers already advertise callback host `voc.rsm.com.kw`. Same providers
  payload on `rsm-voc-survey.nexuses.xyz` also points callbacks at
  `voc.rsm.com.kw` (shared `NEXTAUTH_URL`). Empty session when anonymous.
- Login UI maps any `authorize` null (bad password **or** DB unreachable) to
  “Invalid email or password.” Local Neon DB previously lacked VPS typed rows,
  so CX users may live only on one DB — credentials must match the VPS User
  table for this host.
- No code change. Awaiting exact UI error / whether nexuses host still works.
- Verification: live auth endpoint curls; `npm run memory:check`.

### 2026-09-09 - Re-ran §4 typed survey live on voc.rsm.com.kw

- Fresh disposable typed submit: happy path 200, idempotent retry 200,
  honeypot 400, invalid schema 400, no-Origin 403.
- Public metrics `totalResponses` 21→22; no company/email/name leak.
- UI re-check: EN typed identity form + AR localized fields; English intro stays.
- Conversation `typed_2edf81f5-0d21-4e70-9dfa-f0fb80355197`. Invite-linked
  thank-you/`/results` still not exercised; local DB still not VPS DB.
- Updated ticks in `docs/GO_LIVE_CHECKLIST.md` §4.
- Linear MCP not in tool catalog this session.
- Verification: live API + browser; `npm run memory:check`.

### 2026-09-09 - Live walk §4 typed survey on voc.rsm.com.kw

- Posted disposable typed survey to production with matching Origin:
  200 `ok`, idempotent retry 200, honeypot `website` → 400.
- Public metrics `totalResponses` 20→21; marker company/email/name not in
  public JSON.
- UI: Arabic switcher localizes typed identity step; English intro stays.
- Local `.env.local` Prisma DB does not contain the VPS row (separate DB) —
  enrichment / team-notify / insight not confirmed from this machine.
- Invite-linked thank-you and `/results/[resultToken]` not exercised.
- Ticked §4 items in `docs/GO_LIVE_CHECKLIST.md`.
- Linear MCP not in tool catalog this session.
- Verification: live API + browser; `npm run memory:check`.

### 2026-09-09 - Live walk §0 + remote auth/public checks on voc.rsm.com.kw

- Ran go-live checklist §0 HTTP/TLS/DNS against `https://voc.rsm.com.kw`:
  `/survey` `/login` `/reports` 200; `/` → `/survey`; `/dashboard` →
  `/login?callbackUrl=/dashboard` on same host; LE cert CN=`voc.rsm.com.kw`;
  DNS A=`134.149.188.8`. Survey UI loads (voice/typed + EN/AR switcher).
- Also verified remotely: public metrics/csat + OPTIONS 204; no email-like PII
  in metrics JSON; integration invite 401; ElevenLabs webhook no-sig 401;
  cron no-secret 401; typed without Origin 403; insights anonymous 401.
- Ticked matching rows in `docs/GO_LIVE_CHECKLIST.md`. Remaining §0 items need
  VPS/env/ElevenLabs/SendGrid/cron console confirmation.
- Linear MCP not in tool catalog this session.
- Verification: live curls + browser open of `/survey`; `npm run memory:check`.

### 2026-09-09 - Go-live backend/API test checklist

- Added `docs/GO_LIVE_CHECKLIST.md`: Miro vs current flow deltas, updated
  end-to-end diagram, and tickable sections for domain cutover
  (`voc.rsm.com.kw`), auth/RBAC, dashboard + CRM invites, track/CRM lifecycle
  webhooks, typed + voice paths, shared ingest/AI/mail, dashboard surfaces,
  public PII boundary, cron jobs, full API inventory, smoke order, and
  automated gates.
- Cross-linked from `PROJECT_BRIEF.md` Verification and
  `docs/VPS_HOSTING_HANDOVER.md` §11.
- Linear MCP not in this session’s tool catalog (same as prior entries); no
  issue created.
- Verification: checklist aligned with brief API inventory and CRM docs;
  `npm run memory:check`.

### 2026-09-08 - Drafted CRM reply on completion callback shape

- Drafted email for CRM: echo `idempotencyKey`; keep structured CSAT/CES/NPS;
  decline `totalScore` and `surveyResults[]` with rationale; outline webhook
  setup next steps. No code change this turn.
- Verification: aligned with `docs/API_CRM_STATUS_WEBHOOK.md` and
  `API_SURVEY_COMPLETION_PAYLOAD.md`; `npm run memory:check`.

### 2026-09-08 - Sample Postman body for CRM status webhook

- Provided sample `completed` (and brief `opened`) JSON for Postman against
  Power Automate CRM status URL. No code change.
- Verification: aligned with current completion docs; `npm run memory:check`.

### 2026-09-08 - CRM Power Automate dev webhook smoke test

- CRM provided a Power Automate **dev** HTTP trigger URL (signed; stored only in
  local `.env.local` as `CRM_STATUS_WEBHOOK_URL`, not committed).
- Smoke POST of a `completed` status payload returned **HTTP 200** body
  `success` (~1.5s). No `CRM_STATUS_WEBHOOK_SECRET` (sig is in the URL).
- VPS/production still needs the same env key when they cut over; await prod URL.
- Verification: local fetch smoke test; `npm run memory:check`. Do not log the
  full URL or `sig` in docs/git.

### 2026-09-08 - Fix CRM idempotencyKey build break + audit

- Build failed: `recordSurveyInviteEvent` Prisma select omitted
  `idempotencyKey` after `toCrmInviteFields` required it (opened/filling webhooks).
- Fix: include `idempotencyKey` in that select. Audited other
  `toCrmInviteFields` call sites (create/complete use full invite rows).
- Added `tests/crm/completion-payload.test.ts` for idempotencyKey + sentiment.
- Verification: vitest CRM/metrics tests; `npm run build` TypeScript passed.
- Linear MCP unavailable this session.

### 2026-09-08 - Add CSAT-bucketed sentiment to CRM completion payload

- Added `sentiment`: `Satisfied` (CSAT 4–5) / `Neutral` (3) / `Dissatisfied`
  (1–2) / `null` via `csatSentimentFromScore` in `lib/survey/metrics.ts`;
  included on `buildSurveyCompletionPayload`.
- Docs + PROJECT_BRIEF updated; metrics unit tests extended.
- Linear MCP unavailable. Still no weighted `totalScore`.
- Verification: `npx vitest run tests/survey/metrics.test.ts`; memory check.

### 2026-09-08 - Draft email language: sentiment vs totalScore

- Provided paste-ready wording for CRM: no weighted totalScore; dashboard
  Positive/Neutral/Negative is GPT insight; mood filters use CSAT only;
  CRM should keep csat/ces/nps separate. No code change.
- Verification: n/a draft only; `npm run memory:check`.

### 2026-09-08 - Clarified dashboard sentiment vs CRM totalScore

- Responses-page Positive/Neutral/Negative comes from GPT insight
  `overallSentiment` (OpenAI on answers), not a weighted total score.
- Mood filters (happy/neutral/unhappy) use CSAT alone (4–5 / 3 / 1–2).
- Team “needs attention” uses per-metric thresholds (CSAT≤2, CES≤3, NPS≤6).
- Reinforces not sending CRM `totalScore`. No code change.
- Verification: code read of insight + DashboardResponses; memory check.

### 2026-09-08 - Drafted CRM email on completion callback contract

- Drafted reply explaining VOC→CRM webhook: echo `idempotencyKey`; structured
  CSAT/CES/NPS; no `totalScore` / `surveyResults[]`; ask for their endpoint.
- Linear MCP unavailable this session. No code change.
- Verification: aligned with current API docs; `npm run memory:check`.

### 2026-09-08 - Echo idempotencyKey on CRM webhooks; keep structured scores

- Agreed with CRM draft: add `idempotencyKey` to status + completion payloads;
  do **not** add weighted `totalScore` or `surveyResults[]` — keep csat/ces/nps.
- Code: `lib/crm/status-webhook.ts`, `lib/crm/completion-payload.ts`,
  `toCrmInviteFields` in `lib/survey-invite-tracking.ts`; docs + PROJECT_BRIEF;
  `tests/crm/status-webhook.test.ts`.
- Linear issue create blocked (workspace free-issue limit).
- Verification: vitest CRM webhook tests passed; `npm run memory:check`.

### 2026-09-08 - CRM completion omits stored idempotencyKey

- Confirmed: `idempotencyKey` is accepted on invite create, stored uniquely on
  `SurveyInvite`, used for reuse — but **not** included in
  `buildCrmStatusPayload` / `buildSurveyCompletionPayload`. Completion
  correlation today is via `inviteId` / `externalEngagementId` / `triggerStage`.
- CRM draft expects `idempotencyKey` echoed back; easy add if they need it.
- Linear issue create hit free-plan limit; clarification only, no code change.
- Verification: code/doc grep; `npm run memory:check`.

### 2026-09-08 - Clarified CRM completion callback ask

- CRM email asked for response fields (`idempotencyKey`, `totalScore`,
  `resultLinkUrl`, `surveyResults[]`) after a CRM-sent invite is filled.
- That is the outbound completion callback, not the invite trigger API. VOC
  already posts `status: "completed"` + `scores` via `CRM_STATUS_WEBHOOK_URL`
  (`docs/API_CRM_STATUS_WEBHOOK.md`, `API_SURVEY_COMPLETION_PAYLOAD.md`).
- Their draft differs: no weighted `totalScore` in VOC; metrics are csat/ces/nps
  with scales/comments, not a question array. Linear [NEX-305](https://linear.app/nexuses/issue/NEX-305/clarify-crm-survey-response-callback-parameters) Done.
- Next: CRM endpoint details; wire env or optional payload mapper if required.

### 2026-09-07 - Linear MCP tracking for VoC work

- Authenticated Linear MCP; project **RSM in Kuwait Survey - VOC**.
- Workflow: create issue → Todo → In Progress → Done on completion.
- Created and closed [NEX-295](https://linear.app/nexuses/issue/NEX-295/fix-vps-survey-invite-500-missing-surveyinvitefollowupcount-migration)
  for the VPS invite/migration fix (Todo → In Progress → Done).
- Added always-apply rule `.cursor/rules/linear-voc-tracking.mdc`.
- Verification: Linear status transitions succeeded; `npm run memory:check`.

### 2026-09-07 - Ways to retest invite APIs after VPS migrate fix

- User fixed VPS DB migrations; asked for alternate API test methods.
- Pointed to `docs/postman/RSM_VoC_Trigger_API.postman_collection.json`,
  `docs/API_TRIGGER_SURVEY_EMAIL.md`, and curl recipes for Mode A/B,
  idempotency reuse, auth 401, and opening `surveyUrl` / `resultLinkUrl`.
- Base URL for VPS: `https://rsm-voc-survey.nexuses.xyz`. No code change.

### 2026-09-07 - VPS invite fail is missing `followupCount` column

- User confirmed VPS `FROM_EMAIL=survey-noreply@rsm.com.kw` (verified in the
  local SendGrid account). PM2 logs show the live failure is Prisma **P2022**:
  `SurveyInvite.followupCount` does not exist on the VPS database.
- Column is added by migration `20260819120000_add_survey_invite_events`.
  App code is ahead of the VPS DB; invite create/`findUnique` throw and the
  integration route maps that to `"Failed to send email"`. Team completion
  mail can still send; client thank-you skipped with `no_pending_invite`.
- Fix on VPS (app dir). Prisma only auto-loads `.env`, not `.env.local`, so
  bare `npx prisma migrate deploy` fails with P1012 `DATABASE_URL` not found
  even when the app runs fine. Use:
  `set -a && source .env.local && set +a && npx prisma migrate deploy && npx prisma migrate status`
  then `pm2 reload ecosystem.config.js`. Also apply later CRM migration if
  still pending.
- Verification: user-provided PM2 error log + migrate P1012 screenshot;
  migration SQL grep; no remote VPS changes from this agent.

### 2026-09-07 - Invite API 500 "Failed to send email" on both hosts

- User POST to `rsm-voc-survey-eng.vercel.app/api/integrations/survey-invites`
  returned 500 `{ error: "Failed to send email" }` (~5s).
- Confirmed same 500 on `rsm-voc-survey.nexuses.xyz`. Auth works (401/400
  behave correctly). `rsm-voc-platform.vercel.app` returns 404 for this route
  (older deploy without the integration endpoint).
- Not a missing mail config (that path returns 503). Local
  `SENDGRID_API_KEY` / `FROM_EMAIL` (`rsm.com.kw`) validate: scopes include
  `mail.send`, sender verified, domain auth valid; sandbox Mail Send returns
  200.
- Neon `SurveyInviteEvent` rows (cron follow-ups 2026-09-05/06) show the real
  SendGrid error: **403 — from address does not match a verified Sender
  Identity**. User confirmed VPS `FROM_EMAIL=survey-noreply@rsm.com.kw`. That
  address **is** verified in the SendGrid account tied to local `.env.local`
  (and `rsm.com.kw` domain auth is valid). So the VPS is almost certainly using
  a **different `SENDGRID_API_KEY` / account** where that From is not verified,
  or an outdated env after a sender change. Fix: align VPS `SENDGRID_API_KEY`
  with the account that owns `survey-noreply@rsm.com.kw`, or verify that sender
  on the account the VPS key belongs to; then `pm2 reload`.
- No Vercel project changes; CLI token invalid; only HTTP probes + local DB
  read of failure messages.

### 2026-09-04 - Login stays on current host after sign-in

- `SURVEY_PUBLIC_URL` must remain the old survey host
  (`rsm-voc-survey.nexuses.xyz`); invite links are unchanged.
- Root cause of post-login bounce: `app/login/page.tsx` used
  `router.push(result.url)` which is absolute from `NEXTAUTH_URL`.
- Fix: navigate only with a same-origin relative `callbackPath`; never follow
  NextAuth absolute `result.url`.
- VM recommendation: `NEXTAUTH_URL=https://voc.rsm.com.kw` (login/dashboard
  canonical) + keep `SURVEY_PUBLIC_URL` on the old host; then `pm2 reload`.
- Verification: code review of login + app-base-url split; `npm run memory:check`.

### 2026-09-04 - Login still on old URL? (not fixed yet)

- Confirmed we did not change production env or auth code for
  `voc.rsm.com.kw`. Login absolute redirects follow `NEXTAUTH_URL` on the VM.
- Local `.env.local` still has localhost URLs (dev); ElevenLabs allowlist in
  `lib/elevenlabs/agent-config.ts` still lists `rsm-voc-survey.nexuses.xyz`
  and not `voc.rsm.com.kw`.
- Fix when cutting over: set `NEXTAUTH_URL` and `SURVEY_PUBLIC_URL` to
  `https://voc.rsm.com.kw` on the VM, `pm2 reload`, update ElevenLabs webhook
  + allowlist.
- Verification: grepped env keys (values not recorded); `npm run memory:check`.

### 2026-09-03 - Corrected domain to voc.rsm.com.kw

- Client corrected hostname: use `voc.rsm.com.kw` (not
  `voc-albazie.rsm.com.kw`). Provided replacement nginx + certbot commands;
  advised removing any albazie site/cert if already created.
- No server/DNS/cert changes performed from this agent session.
- Verification: guidance only; `npm run memory:check` after entry.

### 2026-09-02 - Nginx configs for voc-albazie.rsm.com.kw

- Provided concrete nginx site + certbot commands for
  `voc-albazie.rsm.com.kw` as an additional hostname (proxy to
  `127.0.0.1:3000`), without modifying the existing
  `rsm-voc-survey.nexuses.xyz` site or cert.
- No server/DNS/cert changes performed from this agent session.
- Verification: guidance only; `npm run memory:check` after entry.

### 2026-09-02 - Nginx new domain + SSL steps (guidance only)

- User asked for steps to add a new domain in nginx and issue SSL on the
  self-hosted path (Azure VM / nginx → `127.0.0.1:3000`).
- No code, nginx config, DNS, or certificate changes made in this task.
- Guidance given: DNS A record → HTTP nginx site → `certbot --nginx` → reload
  verify; reminded to update `NEXTAUTH_URL` / ElevenLabs allowlist after cutover.
- Verification: re-read `docs/VPS_HOSTING_HANDOVER.md` §7.3–8.1 and existing
  MEMORY nginx notes; `npm run memory:check` after this entry.

### 2026-08-27 - Trigger API mode scenarios in docs

- Expanded `docs/API_TRIGGER_SURVEY_EMAIL.md` with concrete scenarios under Modes
  A/B/C (CRM mid/post/retry, blast list, CSV mailing list) plus what to send /
  what comes back.
- No code, database, or deployment changes.

### 2026-08-27 - Clarify trigger API modes in docs

- Rewrote `docs/API_TRIGGER_SURVEY_EMAIL.md` so Modes A/B/C (single `to`,
  `emails[]`, `csv`) are labeled with when to use each; CRM path called out as
  Mode A only.
- No code, database, or deployment changes.

### 2026-08-27 - Tighten CRM API docs (types + schema version)

- Rewrote `docs/API_TRIGGER_SURVEY_EMAIL.md`, `API_CRM_STATUS_WEBHOOK.md`, and
  `API_SURVEY_COMPLETION_PAYLOAD.md` to contract version `1.0` with TypeScript
  type blocks and short examples (removed long setup/narrative clutter).
- Added `schemaVersion: "1.0"` to CRM status webhook payloads
  (`lib/crm/status-webhook.ts`); completion payload already carried it.
- Verified: `npx vitest run tests/crm/status-webhook.test.ts`.
- No database or deployment changes.

### 2026-08-27 - Settings Users/Roles/Audit list cache + refresh

- Added session cache (`components/dashboard/settings-list-cache.ts`, 60s TTL)
  so Users, Roles, and Audit tabs reuse last payload on remount instead of
  blocking on a full reload.
- Fresh cache skips network; stale or empty cache fetches in background while
  keeping existing rows visible (`Refreshing…`).
- Refresh buttons force refetch; create/assign/delete invalidate related caches.
- Verified: no new linter issues on touched dashboard settings components.
- No database or deployment changes.

### 2026-08-27 - Fix settings server/client boundary

Moved `firstSettingsHref` / tab config to `lib/rbac/settings-tabs.ts` so server
layouts can call it (was exported from a `"use client"` module and crashed
Settings).

Verification: inspected imports; `npm run memory:check`.

### 2026-08-27 - Settings sidebar with Users / Roles / Audit tabs

Collapsed Audit, Users, and Roles into one sidebar **Settings** item.
`/dashboard/settings` hosts tabbed Users, Roles, Audit; legacy `/dashboard/audit`
redirects to `/dashboard/settings/audit`.

Verification: permissions path tests; `npm run memory:check`.

### 2026-08-27 - Audit log human-readable labels

Audit API now resolves actor/resource user IDs to emails and returns
`actionLabel` / `actorLabel` / `resourceLabel` / `detailsLabel`. UI shows
“Logged in”, email addresses, etc. instead of `auth.login_success` and truncated
UUIDs. Labels live in `lib/audit.ts`.

Verification: `tests/dashboard/audit-labels.test.ts`; `npm run memory:check`.

### 2026-08-27 - Audit page table layout fix

Audit (and Users/Roles) used nonexistent CSS module class `styles.table`, so
columns collapsed into one unreadable blob. Switched Audit to
`CompactDataTable` + toolbar alignment styles; Users/Roles use `compactTable`.

Verification: inspected CSS module exports; `npm run memory:check`.

### 2026-08-27 - Login failure: Neon unreachable + empty Role table

Dashboard login failed with `PrismaClientInitializationError: Can't reach
database server` during `ensureSystemRoles` / role backfill in `authorize`.
Root cause was Neon connectivity (transient); Role rows had never been seeded
(`roles=0`). Ran `backfillUserRoles` successfully (admin + cx roles linked to
existing user). Hardened login to backfill only when `Role` count is 0 and to
catch user-lookup DB errors instead of throwing through NextAuth.

Verification: Prisma user/role counts after backfill; host TCP 5432 reachable;
`npm run memory:check`.

### 2026-08-25 - CRM-driven VOC integration + RBAC

Implemented meeting-driven CRM loop around the existing invite API:

- Invite API: `externalEngagementId`, `triggerStage` (mid/post), `idempotencyKey`;
  response returns `surveyUrl` + `resultLinkUrl`; docs + Postman updated.
- Private `/results/[resultToken]` page for per-invite scores/comments.
- Outbound CRM status webhooks (`lib/crm/status-webhook.ts`) with
  `CrmWebhookDelivery`; docs `API_CRM_STATUS_WEBHOOK.md`.
- Completion scores payload attached on `completed` webhook; schema doc
  `API_SURVEY_COMPLETION_PAYLOAD.md`.
- `AuditLog` + `/dashboard/audit` (CSV export); login/invite/role events.
- Custom RBAC: `Role` / `RolePermission`, permission-gated nav/APIs,
  `/dashboard/settings/users` and `/roles`.
- Migration `20260825120000_crm_integration_rbac`.

Verification: focused Vitest (invite routes, CRM webhook, RBAC) passed;
`npx prisma generate`; `npm run memory:check`. Deploy requires
`npx prisma migrate deploy` and optional `CRM_STATUS_WEBHOOK_*` env vars.
Testimonials deferred.

### 2026-08-24 - Nexuses VOC feature inventory for client

Wrote `docs/NEXUSES_VOC_FEATURES.md`: a short A–Z table of what the Nexuses VOC
platform has today (no SRS comparison, no gaps). Requested after client
feedback that prior comparison docs were too dense.

Verification: checked against PROJECT_BRIEF / MEMORY current state;
`npm run memory:check`. Docs only.

### 2026-08-21 - Big-area can-add vs cannot-add for stakeholders

Stakeholder asked for the 12-area Nexuses-vs-SRS summary split into (1) features
we can still add on this VOC product with indicative go-live dates and (2)
features we cannot add with reasons. Product ceiling remains: stay CSAT/CES/NPS;
no CRM, six-question instrument, Partner/OMP resolution, or training modules.

Reporting and login security already match SRS (nothing left to ship there).
Feasible remaining work is VOC polish only (e.g. uncap reminders, anonymous
toggle, optional SSO, stronger mail history). The five missing SRS modules and
full seven-role / client-resolution / immutable audit stay not feasible without
replacing the product.

Verification: checklist + Wave 2 memory; `npm run memory:check`. No code change.

### 2026-08-19 - Recency list toggle on responses

`/dashboard/responses` now has a By client / By recency toggle. Client grouping
remains the default; recency shows one table newest-first.

Files: `components/dashboard/DashboardResponses.tsx`,
`lib/dashboard-responses-export.ts`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/cx-dashboard.test.tsx`.
Verification: Vitest for recency sort and layout toggle; `npm run memory:check`.

### 2026-08-19 - Keep response groups inside the dashboard workspace

The “Not provided” client group on `/dashboard/responses` could grow past the
main column because the responses table forced `min-width: 1120px` and the
group grid item used the default `min-width: auto`. Groups now stay within the
workspace; the table scrolls inside the card when columns are wider than the
pane.

Files: `components/dashboard/dashboard.module.css`,
`components/dashboard/DashboardResponses.tsx`,
`components/dashboard/CompactDataTable.tsx`.
Verification: CSS overflow constraints; `npm run memory:check`. No schema change.

### 2026-08-19 - Fix dashboard sentiment type for production build

`npx next build` failed type-checking `lib/cx-insights-map.ts`: Prisma stores
`overallSentiment` as `String` and insight lists as JSON, while
`DashboardInsight` expects `positive | neutral | negative` and `string[]`. The
mapper now narrows those fields.

Files: `lib/cx-insights-map.ts`.
Verification: typecheck on the mapper; `npm run memory:check`. No schema or
deployment change.

### 2026-08-19 - Wave 2 VOC ops ceiling

Stayed on CSAT/CES/NPS. Annotated the SRS checklist with not-feasible vs
VOC-feasible rows. Reclassified NFR-002 as Yes (SSO or secure login). Scoreboard
is 4 Yes / 26 Partial / 75 No of 105.

Shipped Excel export of the same filtered responses as CSV, scheduled
weekly/monthly/quarterly CX report mail (CSV + Excel attachments to
`SURVEY_COMPLETION_NOTIFY_TO`), and bounded SendGrid retries (3 attempts on
429/5xx/network). Reminder cap stays 4. No CRM, new questions, resolution, or
training.

Files: `docs/NEXUSES_VS_RSM_SRS_CHECKLIST.md`, `lib/dashboard-responses-export.ts`,
`components/dashboard/DashboardResponses.tsx`, `lib/survey-invite-email.ts`,
`lib/scheduled-cx-report.ts`, `lib/cron-auth.ts`, `lib/cx-insights-map.ts`,
`app/api/cron/scheduled-reports/[cadence]/route.ts`, `vercel.json`,
`docs/VPS_HOSTING_HANDOVER.md`, `PROJECT_BRIEF.md`.

Verification: `npm test`; `npm run memory:check`. No schema change. Deployed
hosts need the new Vercel/system cron paths after this ships; `CRON_SECRET` and
`SURVEY_COMPLETION_NOTIFY_TO` are reused (no new secret names).

### 2026-08-19 - Nexuses vs RSM SRS feature checklist

Wrote `docs/NEXUSES_VS_RSM_SRS_CHECKLIST.md`: side-by-side Yes / Partial / No
for every SRS goal, role, FR, entity, state machine, NFR, and acceptance row
versus shipped Nexuses VOC (including first-wave invite events). RSM column is
the SRS requirement set (all Yes). Nexuses extras (voice, CSAT/CES/NPS, RAG,
public widgets) are a separate table. Pointer added from
`docs/SRS_v1_GAP_ANALYSIS.md`.

Verification: checklist vs SRS v1, brief, memory current state;
`npm run memory:check`. No product code change.

### 2026-08-19 - First-wave SRS gaps (reminders, notes, CSV, attention, history)

Implemented the feasible SRS overlaps on the current CSAT/CES/NPS product:

- Automatic invite reminders every 3 days, max 4 (days 3, 6, 9, 12), using the
  existing reminder template (no “Final reminder” outbound).
- `SurveyInviteEvent` timeline plus `followupCount`; notes via
  `POST /api/survey/invites/[id]/notes`.
- Internal team notify flags needs attention when CSAT ≤ 2, CES ≤ 3, or NPS ≤ 6;
  client thank-you unchanged.
- Responses page: org filters, CSV export of visible rows, group by email or
  name+company; CX insights now include `client.email`.

Migration: `20260819120000_add_survey_invite_events`. Cron route still GET with
`CRON_SECRET`; counters are `{ sent, skipped, failed, checked }`.

Verification: targeted Vitest for cadence, tracker/notes routes, team-notify
attention, insights email, CSV/grouping; `npm run memory:check`.

### 2026-08-19 - Feasible first-wave SRS gaps (advice only)

User asked which SRS v1 gaps are practical, feasible, and easy to do first.
No product change. Answer based on `docs/SRS_v1_GAP_ANALYSIS.md` plus current
invite/email/dashboard capabilities.

First-wave candidates: reminder cadence (FR-007), manual follow-up notes
(FR-008), CSV export of existing CX data (FR-049 partial), score-banded
emails using current CSAT/CES/NPS (practical analog of FR-017–FR-026),
stronger send/delivery flags (FR-054), and a CX client-history grouping
(FR-045 partial). Not first-wave: opportunity/budget engine, 6-question
weighted survey, RBAC/SSO, resolution, training, scheduled PDF/Excel.

Verification: re-read gap doc, brief, and current-state memory; `npm run memory:check`.

### 2026-08-18 - Remove `Mail_TO` and add required typed-survey email

Removed the legacy `Mail_TO` invite-default fallback; the dashboard invite page
now only honors `SURVEY_INVITE_DEFAULT_TO` when a prefilled recipient is
desired. Added a required email field to the typed survey, threaded it through
the typed route and shared ingest pipeline, and persisted it on `Client.email`
without a schema migration. Voice survey collection is unchanged.

Files: `lib/survey-invite-email.ts`, `lib/survey/schema.ts`,
`components/survey/TypedSurvey.tsx`, `lib/survey/voice-locale.ts`,
`app/api/survey/typed/route.ts`, `lib/survey/ingest.ts`,
`tests/survey/typed-route.test.ts`, `tests/survey/survey-experience.test.tsx`,
`tests/survey/ingest.test.ts`, `tests/dashboard/survey-invite-email.test.ts`,
`PROJECT_BRIEF.md`, `docs/VPS_HOSTING_HANDOVER.md`, `MEMORY.md`.

Verification: targeted typed-survey, ingest, and invite-default tests; `npm run memory:check`.
No database migration or deployment changes.

### 2026-08-18 - Add reply-to on client-facing emails

Client-facing emails (invites, day-3/day-5 follow-ups, thank-you) now set
`reply_to` to the first address from `SURVEY_COMPLETION_NOTIFY_TO` so client
replies reach the CX team inbox. Team notification emails are unchanged.
If `SURVEY_COMPLETION_NOTIFY_TO` is not set, `reply_to` is omitted (no
behavior change). No new env vars.

Files: `lib/survey-invite-email.ts`, `lib/survey-invite-tracking.ts`,
`lib/survey-thankyou-email.ts`, `tests/dashboard/survey-invite-email-recipients.test.ts`.

Verification: 33 mail-related tests pass; `npm run memory:check`.
No database or deployment changes.

### 2026-08-13 - Switch survey mail delivery to SendGrid

Replaced AWS SES SMTP / nodemailer with SendGrid's Mail Send HTTP API for
invites, day-3/day-5 follow-ups, client thank-you, and internal completion
notifications. Mail is configured when `SENDGRID_API_KEY` and `FROM_EMAIL` are
set. `isSmtpConfigured` remains as a compatibility alias for `isMailConfigured`.
Removed the direct `nodemailer` dependency.

Files: `lib/survey-invite-email.ts`, invite UI copy, env examples, VPS handover,
API trigger docs, email tests, `PROJECT_BRIEF.md`.

Verification: unit tests for SendGrid payload and mail readiness; `npm run memory:check`.
No database changes. Local `.env.local` still needs the API key filled in; Vercel
and VPS must receive the same two variables before production sends work.

### 2026-08-10 - SRS v1 vs current app gap comparison

Compared `RSM_Client_Survey_SRS_v1.md` (client SRS) to the current VOC platform
via `PROJECT_BRIEF.md` / `MEMORY.md` current state. Wrote comparison-only gap
doc at `docs/SRS_v1_GAP_ANALYSIS.md` (differences and unmet FRs/NFRs; no
remediation plan).

Headline: SRS is a lifecycle satisfaction / resolution / training system with
weighted 6×1–5 scoring and multi-role RBAC; current app is CSAT/CES/NPS VOC
with invites and CX analytics. Most SRS acceptance criteria unmet; invite/
reminder/thank-you and some executive metrics are only partial overlaps.

Verification: full SRS read; brief + memory current state; `npm run memory:check`.
No code or schema changes.

### 2026-08-10 - VPS survey follow-up cron (replace Vercel Cron)

Documented why `/api/cron/survey-followups` exists and how to run it on the
Azure VM instead of Vercel Cron.

Why: tracked survey invites need day-3 and day-5 reminder emails when still
incomplete. The route sends those via SMTP; nothing inside Next.js schedules
itself. `vercel.json` still has `0 8 * * *` for the Vercel project only.

VPS procedure (also in `docs/VPS_HOSTING_HANDOVER.md` §8.6.1): ensure
`CRON_SECRET` + SMTP in `.env.local`, wrapper script curling
`http://127.0.0.1:3000/api/cron/survey-followups` with Bearer auth, crontab
`0 8 * * *`, disable Vercel cron if that deployment must not send mail / touch
another DB. `PROJECT_BRIEF.md` invite bullet updated to say VPS uses system cron.

Verification: read cron route, `vercel.json`, follow-up processor; docs +
`npm run memory:check`. No server crontab installed from this pass (operator
runs steps on the VM).

### 2026-08-10 - Neon vs Docker Postgres audit (colleague flag)

Investigated whether the app can / does connect to Neon instead of local Docker
Postgres. No secrets committed; hostnames only inspected from untracked env.

Findings:

- Runtime DB target is solely `DATABASE_URL` via Prisma (`prisma/schema.prisma`
  `env("DATABASE_URL")`, `lib/db.ts` plain `PrismaClient`). No
  `@neondatabase/*` package dependency; no hardcoded Neon hostname in app code.
- Local untracked `.env.local` currently points at Neon:
  host `*.aws.neon.tech` (pooler), database `neondb`, `sslmode=require`.
  So local `npm run dev` against this checkout talks to Neon, not Docker.
- Untracked `.env.docker` (if used) points at compose service `db:5432` /
  `rsm_voc` — Docker path. Tracked examples/CI/Playwright use localhost Docker
  URLs (`rsm_voc@127.0.0.1:5432`).
- Docs still describe Neon as the Vercel/managed production DB (`PROJECT_BRIEF`,
  `MEMORY` operational snapshot, `docs/VPS_HOSTING_HANDOVER`). Self-host path is
  Docker Postgres + host Next.js; hybrid Neon-from-VPS remains documented as an
  option if `DATABASE_URL` is set that way.
- Code/docs “Neon traces”: agent skill copies, brief/memory/handover wording,
  and a comment in `lib/prisma-errors.ts` (“Neon / pooler”). Not a connection.
- User confirmed VPS `.env.local` `DATABASE_URL` host is `localhost` with user
  `rsm_voc` — that is the Docker Postgres on the same VM (loopback), not Neon.
  Vercel/managed path may still use Neon separately; self-hosted production does
  not.

Conclusion: colleague flag is valid for this laptop’s `.env.local` (Neon). VPS
self-host is on Docker via localhost. Codebase does not force Neon.

Follow-up (same day): confirmed `docker-compose.yml` still binds Postgres as
`127.0.0.1:5432:5432` (fix landed in `721ce56`). Original `"5432:5432"` was
Compose’s documented default (publish on all host interfaces); Docker does not
auto-restrict published ports to loopback.

Verification: grepped repo for `neon.tech` / `neondb` / `@neondatabase`; parsed
local env hosts without printing credentials; user-supplied VPS host check;
re-read compose ports mapping. No deploy or DB changes.

### 2026-08-09 - Security audit, Postgres tuning, and ingest latency

Full security and performance pass on the self-hosted Azure VM
(`westeurope`, `Standard_B1ms`, 1 vCPU / 1.8 GB).

Security fixes applied:

- Postgres was published on `0.0.0.0:5432` using the `docker-compose` default
  credentials (username as password). Rebound to `127.0.0.1`, and the role
  password was rotated. `POSTGRES_PASSWORD` now comes from an untracked `.env`.
- Next.js was listening on `0.0.0.0:3000`, reachable without TLS and bypassing
  every nginx header. Now bound to `127.0.0.1` via `ecosystem.config.js`.
- `ufw` was inactive with an iptables INPUT policy of ACCEPT. Enabled, allowing
  only 22/80/443.
- SSH accepted passwords (`50-cloud-init.conf` re-enables it on Azure images).
  Added `/etc/ssh/sshd_config.d/01-hardening.conf`, which sorts first and sets
  `PasswordAuthentication no`, `KbdInteractiveAuthentication no`,
  `X11Forwarding no`, `MaxAuthTries 3`. Key auth verified before and after.
- `.env.local` was mode 644 (world-readable, containing every secret).
  Now 600, as is the new `.env`.
- nginx served no security headers. Added HSTS, `X-Content-Type-Options`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, and a `Permissions-Policy`
  that **must** keep `microphone=(self)` for the voice survey. `server_tokens`
  off.
- `npm audit`: 12 vulnerabilities (2 critical, 8 high) reduced to 4 via
  lockfile updates; both criticals (next-auth `getToken()`, vitest UI) fixed.

Remaining advisories, all requiring major bumps and deliberately not taken in
this change:

- `nodemailer` HIGH needs 9.x (from 7.x). The advisory is `envelope.size`
  command injection; this codebase never sets `envelope`, so it is unreachable.
- `next-auth` MODERATE needs the v5/Auth.js migration.
- `sharp` HIGH is fixed by `next@16.3.0` (a minor bump). Only used to optimize
  the project's own Cloudinary logo.
- `next` HIGH requires Turbopack + middleware + a single locale. This app has
  no middleware file, does not use Turbopack, and sets no `i18n` config, so the
  advisory does not apply.

Postgres tuning (`docker-compose.yml`): stock config assumed it owned the
machine — `effective_cache_size` defaulted to 4 GB on a 1.8 GB host, biasing
the planner toward index scans that then hit disk. Now `shared_buffers=192MB`,
`effective_cache_size=640MB`, `work_mem=8MB`, `max_connections=50`,
`random_page_cost=1.1` and `effective_io_concurrency=200` for SSD,
`pg_stat_statements` plus `track_io_timing` for observability, WAL sizing and
`wal_compression`, a 640 MB container memory cap and 256 MB shm. `DATABASE_URL`
gained `connection_limit=10&pool_timeout=20` (2 workers x 10 stays well under
`max_connections`).

Latency work:

- `lib/survey/ingest.ts` split into `storeSurveyResponse` (durable write) and
  `enrichSurveyResponse` (GPT insight, embedding, invite completion, SMTP,
  aggregate recompute — 10-30s, and `recomputeAggregates` calls OpenAI again).
  `ingestSurveyResponse` still awaits both, so existing callers and
  `tests/survey/ingest.test.ts` are unchanged. New
  `ingestSurveyResponseDeferred` stores, returns, and enriches in the
  background; the webhook and typed routes now use it. Previously the typed
  survey made respondents wait for all of that after pressing submit, and the
  ElevenLabs webhook risked exceeding the proxy timeout and being retried,
  redoing the AI work at full cost. Safe to detach: the row is committed first,
  each step is individually guarded and idempotent, and PM2's 60s
  `kill_timeout` lets in-flight work finish across a reload.
- OpenAI clients in `lib/insight.ts` and `lib/aggregate.ts` now set
  `timeout: 30s, maxRetries: 2`; the SDK default is a 10-minute timeout.
- nginx: gzip enabled (static JS 5587 -> 2018 bytes, CSS 11523 -> 3052),
  upstream keepalive pool, and `Connection: upgrade` limited to real WebSocket
  requests via a `map` (it was previously sent on every request, defeating
  keepalive). `proxy_read_timeout` raised to 120s.

Verification: `npm test` 50 files / 207 tests passed; `npx tsc --noEmit` and
`npm run lint` show only pre-existing issues (identical set at HEAD, none in
changed files); `npm run memory:check` passed. Confirmed post-deploy that the
firewall, SSH key-only auth, loopback bindings, headers and compression are all
live and the site serves 200s.

Network note: VM egress to `api.elevenlabs.io` and `api.openai.com` is already
fast (TLS handshake ~50ms), and CPU steal is 0, so neither network distance nor
burstable throttling was contributing to latency.

### 2026-08-09 - Fix VPS crash loop and add zero-downtime deploys

Investigated repeated crashes of the self-hosted Azure VM
(`rsm-voc-survey.nexuses.xyz`). Root cause was memory, not application code.

Diagnosis:

- PM2 restart counter stood at 265. `journalctl` recorded
  `Out of memory: Killed process (next-server)` — the kernel was killing the
  **running server**, not the build, so builds appeared to succeed while the
  site went down.
- The VM has 1 vCPU, 1.8 GB RAM and had **no swap**. Postgres runs on the same
  box as a Docker container, so `npm run build` had roughly 1 GB of headroom for
  a build that needs more.
- The deploy procedure rebuilt `.next` in place while the server was live,
  which also produced the `Failed to find Server Action` errors in the PM2 log
  (browsers holding assets from the previous build).
- Shell history showed `sudo npm run build` used repeatedly, leaving root-owned
  build output that the PM2 user (`rsmuser`) could not manage.

Changes:

- `next.config.ts`: `distDir` now reads `NEXT_DIST_DIR`, and `deploymentId`
  reads `NEXT_DEPLOYMENT_ID`. Both are unset outside the VPS deploy path, so
  local, CI and Vercel builds are unchanged. `deploymentId` is Next 16's
  version-skew protection and is the supported fix for the Server Action errors.
- `ecosystem.config.js` (new): PM2 cluster mode with 2 instances so `pm2 reload`
  is a rolling restart; `kill_timeout` 60s so an in-flight webhook ingest
  finishes rather than being killed mid-write; `max_memory_restart` 400M;
  timestamped logs.
- `scripts/deploy.sh` (new): refuses to run as root, blocks deploys while a
  tracked survey is in progress, builds into `.next-build` while the live server
  keeps serving `.next`, rewrites the distDir baked into
  `required-server-files.json`, swaps by rename, rolling-reloads PM2,
  health-checks and auto-rolls-back.
- `scripts/check-active-surveys.mjs` (new): counts `SurveyInvite` rows started
  inside `ACTIVE_SURVEY_WINDOW_MINUTES` (default 45) with no `completedAt`.
  Only sees invite-tracked surveys; anonymous `/survey` visits are not recorded.
- Server: created a 4 GB swapfile with an `/etc/fstab` entry.
- Docs: VPS handover section 3 now lists swap as a hard requirement and no
  longer claims the repo ships no container tooling; section 7 documents the
  deploy script and why the PM2 settings matter.

Deployment note: the voice conversation itself runs browser-to-ElevenLabs and
does not traverse this server. The VPS is only required at session start and for
the post-call webhook, and ingest is idempotent on `conversationId`, so an
ElevenLabs retry after a failed delivery cannot duplicate a response. That is
why a rolling reload is sufficient and a maintenance window is not needed.

Known gap recorded as a follow-up: the Dockerized Postgres still uses the
default `docker-compose.yml` credentials and binds to `0.0.0.0:5432`, with
`ufw` inactive. It is currently unreachable from the public internet only
because of an upstream provider firewall.

### 2026-08-06 - ElevenLabs allowlist + webhook URL for nexuses.xyz

- `npm run elevenlabs:configure -- --apply` on the Azure VM failed because the
  script hard-coded the Vercel webhook URL and no enabled HMAC webhook matched.
- Added `rsm-voc-survey.nexuses.xyz` to the agent origin allowlist.
- Configure script now resolves webhook URL from `ELEVENLABS_WEBHOOK_URL`, else
  `NEXTAUTH_URL` / `SURVEY_PUBLIC_URL`, and prints existing workspace webhooks
  when lookup fails.
- Documented that an HMAC workspace webhook must exist for the public host
  before `--apply` can succeed.

Files changed: `lib/elevenlabs/agent-config.ts`,
`scripts/configure-elevenlabs-agent.mts`, `tests/survey/agent-config.test.ts`,
`.env.example`, `docs/VPS_HOSTING_HANDOVER.md`, `PROJECT_BRIEF.md`,
`MEMORY.md`.
Verification: `npm test -- tests/survey/agent-config.test.ts`;
`npm run memory:check`.

### 2026-08-06 - Fix survey same-origin check behind reverse proxy

- Voice survey failed on the Azure VM with
  `cross-origin request rejected` because `validatePublicPost` compared
  browser `Origin` only to `request.nextUrl.origin`, which is often the
  internal `http://127.0.0.1:3000` (or similar) behind nginx.
- Allowed origins now include: `request.nextUrl.origin`, origin reconstructed
  from `Host` / `X-Forwarded-Host` + `X-Forwarded-Proto`, and configured
  `NEXTAUTH_URL` / `SURVEY_PUBLIC_URL`. Still rejects missing Origin and
  `sec-fetch-site: cross-site`.
- Documented the requirement in `docs/VPS_HOSTING_HANDOVER.md` and
  `PROJECT_BRIEF.md`.

Files changed: `lib/survey/request-security.ts`,
`tests/survey/request-security.test.ts`, `PROJECT_BRIEF.md`,
`docs/VPS_HOSTING_HANDOVER.md`, `MEMORY.md`.
Verification: `npm test -- tests/survey/request-security.test.ts
tests/survey/voice-session-route.test.ts tests/survey/typed-route.test.ts`;
`npm run memory:check`.

### 2026-07-31 - Stabilize Playwright screenshots for CI height drift

- Switched survey visual baselines from `fullPage` to fixed viewport
  (1280x720, `deviceScaleFactor: 1`) so Ubuntu font metrics cannot change
  screenshot height (Arabic mode chooser was 985px locally vs 1012px on CI).
- Tightened screenshot CSS stabilization (shared Arial stack + line-height).
- CI uploads `*-actual.png` on visual failure for easier baseline replacement.
- Also fixed stale invite-route Vitest subject expectation (`Share`).

Files changed: `tests/e2e/survey.spec.ts`,
`tests/e2e/survey.spec.ts-snapshots/*`, `playwright.config.ts`,
`.github/workflows/ci.yml`, `tests/integrations/survey-invites-route.test.ts`,
`MEMORY.md`.
Verification: `npx playwright test` 7/7; `npm test`; `npm run memory:check`.

### 2026-07-31 - Fix stale survey-invite integration test expectation

- Updated `tests/integrations/survey-invites-route.test.ts` to expect the
  current default invite subject (`Share` capitalization) and to match the
  recipient with `objectContaining`, matching `SurveyRecipient` fields passed
  through by the route.

Files changed: `tests/integrations/survey-invites-route.test.ts`, `MEMORY.md`.
Verification: `npm test -- tests/integrations/survey-invites-route.test.ts`;
`npm test`; `npm run memory:check`.

### 2026-07-31 - Playwright survey visual + interaction tests in CI

- Added `@playwright/test`, `playwright.config.ts`, `tests/e2e/survey.spec.ts`,
  and `scripts/update-e2e-snapshots.sh`.
- Survey coverage: EN/AR mode-chooser screenshots, voice host picker, typed
  start screenshots; interactions for language RTL, voice picker back, and typed
  validation/advance. Live ElevenLabs sessions are out of scope.
- Extended `.github/workflows/ci.yml`: trigger on `master`/`main`, parallel
  `visual` job in Playwright Ubuntu container, failure artifacts, and
  `workflow_dispatch` `update_snapshots` to upload Ubuntu baselines.
- Committed Chromium screenshot baselines (generated locally with a shared
  Arial font override for cross-OS stability). Prefer regenerating baselines on
  Ubuntu via Actions `update_snapshots=true` or the Docker helper script so CI
  matches GHA linux/amd64 rendering exactly.
- Scripts: `npm run test:e2e`, `npm run test:e2e:update`.

Files changed: `package.json`, `package-lock.json`, `playwright.config.ts`,
`.gitignore`, `.github/workflows/ci.yml`, `tests/e2e/survey.spec.ts`,
`tests/e2e/survey.spec.ts-snapshots/*`, `scripts/update-e2e-snapshots.sh`,
`PROJECT_BRIEF.md`, `MEMORY.md`.
Verification: `npm run build` with stub env; `npx playwright test` 7/7 passed
locally; `npm run memory:check`.

### 2026-07-30 - Add thumbnail image to shared link preview

- Updated `surveyThumbnail` in `app/layout.tsx` to use `RSM_LOGO_URL` (the RSM
  Kuwait Cloudinary logo already used as the app favicon) instead of the
  unrelated PDF-preview PNG. Open Graph `og:image` and Twitter `twitter:image`
  now resolve to the same image as the app icon, so link previews in messaging
  apps and social platforms show the RSM logo.

Files changed: `app/layout.tsx`, `MEMORY.md`.
Verification: `npm run memory:check`.

### 2026-07-30 - Docker Postgres only; host-run Next.js app

- Slimmed Compose to a single `db` service so VMs avoid slow full-app image
  rebuilds. App runs on the host with Node against `localhost:5432`.
- Updated README / PROJECT_BRIEF / `.env.example` / `.env.docker.example` for
  the Docker-Postgres + host-app workflow. Optional full-app Dockerfile kept.

Files changed: `docker-compose.yml`, `.env.docker.example`, `.env.example`,
`README.md`, `PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: `npm run memory:check`.

### 2026-07-29 - Include lib/ in Docker runner for db:seed

- Seed failed in the app container with `Cannot find module '../lib/aggregate'`
  because the production runner image copied Prisma/scripts but not `lib/`.
- Dockerfile runner stage now copies `lib/` so `npm run db:seed` can resolve
  aggregate, insight, password, and survey helpers.

Files changed: `Dockerfile`, `MEMORY.md`.

Verification: local Dockerfile updated; rebuild on VM with
`docker compose up --build -d`, then re-run seed.

### 2026-07-29 - Dockerized full stack (app + Postgres pgvector)

- Added first-party Docker runtime support so the app can run fully in
  containers with Dockerized Postgres instead of Neon.
- Added `Dockerfile` (multi-stage Node 20 build), `docker-compose.yml` (`app`
  + `db` services), `docker/entrypoint.sh` (startup migration retry +
  `next start`), `docker/db/init/01-pgvector.sql` (extension bootstrap),
  `.dockerignore`, and `.env.docker.example`.
- Updated docs for Docker-first setup and self-hosted operation guidance.

Files changed: `Dockerfile`, `docker-compose.yml`, `docker/entrypoint.sh`,
`docker/db/init/01-pgvector.sql`, `.dockerignore`, `.env.docker.example`,
`.gitignore`, `README.md`, `PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: `npm run memory:check`; attempted `docker compose up --build` but
blocked because Docker CLI is not installed in this environment (`docker: command not found`).

### 2026-07-06 - Voice picker always shown after voice survey click

- Fixed UX gap: picker previously required Arabic to be selected before voice
  mode, so English-default users never saw Hana/Heba.
- Voice host picker now appears for every voice survey selection with Hana,
  Heba, and English (Sara). Choosing Hana/Heba switches UI to Arabic; Sara keeps
  English.
- Added compact `voicePickerCard` layout so both Arabic options fit without
  excessive scrolling.

Files changed: `components/survey/SurveyExperience.tsx`,
`components/survey/ArabicVoiceChooser.tsx`, `lib/survey/arabic-voice-options.ts`,
`lib/survey/voice-locale.ts`, `components/survey/survey.module.css`,
`tests/survey/survey-experience.test.tsx`, `MEMORY.md`, `PROJECT_BRIEF.md`.

Verification: `npm test -- tests/survey/survey-experience.test.tsx`; manual
`/survey` voice flow in browser.

### 2026-07-06 - Arabic voice picker (Hana / Heba)

- Branch `feature/arabic-voice-picker` from `ekansh`.
- Arabic voice surveys now show step 2 voice selection (Hana or Heba) after
  choosing voice mode. Voice IDs are allowlisted in
  `lib/survey/arabic-voice-options.ts` and passed via ElevenLabs client
  `overrides.tts.voiceId`; Arabic sessions use `overrides.agent.language: ar`.
- English voice path unchanged (no picker, default Sara voice).
- `buildAgentUpdate()` enables runtime `language` and `voiceId` overrides on
  the live agent.

Files changed: `lib/survey/arabic-voice-options.ts`, `lib/survey/voice-locale.ts`,
`components/survey/ArabicVoiceChooser.tsx`, `components/survey/SurveyExperience.tsx`,
`components/survey/VoiceSurvey.tsx`, `lib/elevenlabs/agent-config.ts`,
`tests/survey/survey-experience.test.tsx`, `tests/survey/voice-locale.test.ts`,
`MEMORY.md`, `PROJECT_BRIEF.md`.

Verification: `npm test -- tests/survey/survey-experience.test.tsx tests/survey/voice-locale.test.ts tests/survey/voice-session-route.test.ts`;
`npm run memory:check`.

Follow-up: run `npm run elevenlabs:configure -- --apply` after merge/deploy so
the live agent accepts `language` and `voiceId` overrides.

### 2026-07-03 - Fix missed completion emails after delayed invite linking

- Root cause: moving thank-you/team sends to ingest-only meant voice webhooks often
  ran before `/api/survey/invite-link` linked the invite, so emails were skipped and
  never retried when linking completed later.
- `completeSurveyInviteForResponse()` now calls `sendSurveyCompletionNotifications()`
  after linking (idempotent). Added `npm run survey:resend-notifications` backfill.

Files changed: `lib/survey-invite-tracking.ts`, `lib/survey-thankyou-email.ts`,
`scripts/resend-completion-notifications.mts`, `package.json`,
`tests/dashboard/survey-invite-sync.test.ts`, `MEMORY.md`.

Verification: targeted vitest; manual resend script against Neon.

### 2026-07-03 - Fix multi-recipient completion notification delivery

- Team completion emails failed when `SURVEY_COMPLETION_NOTIFY_TO` listed multiple
  comma-separated addresses because Zod validated the joined string as one email.
- Added `sendSurveyInviteEmailToRecipients()` and structured skip/sent logging in
  `sendSurveyCompletionNotifications()`.

Files changed: `lib/survey-invite-email.ts`, `lib/survey-thankyou-email.ts`,
`tests/dashboard/survey-completion-notify.test.ts`,
`tests/dashboard/survey-invite-email-recipients.test.ts`, `MEMORY.md`.

Verification: targeted vitest; `npm run memory:check`.

### 2026-07-03 - Browser tab favicon uses RSM logo

- Root layout `metadata.icons` now points at `RSM_LOGO_URL` from `lib/brand.ts`,
  the same asset used by `RsmLogo` in the dashboard sidebar and login page.
- Removed the default Next.js/Vercel `app/favicon.ico` and partial generated icon
  files from an earlier attempt.

Files changed: `app/layout.tsx`, `MEMORY.md`.

Verification: confirmed `/dashboard` HTML emits `rel="icon"` with the Cloudinary RSM
logo URL; `npm run memory:check`.

### 2026-07-03 - Dedicated env var for completion notification recipient

- Completion notification emails now read `SURVEY_COMPLETION_NOTIFY_TO`
  (comma-separated) instead of reusing invite-page defaults.
- `SURVEY_INVITE_DEFAULT_TO` is again invite-page default only.

Files changed: `lib/survey-thankyou-email.ts`, `.env.example`,
`tests/dashboard/survey-completion-notify.test.ts`, `PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: targeted vitest; `npm run memory:check`.

### 2026-07-03 - Survey completion notification emails

- Added internal RSM team email on every complete survey (voice and typed), sent
  to `SURVEY_COMPLETION_NOTIFY_TO` via existing SMTP. Includes
  respondent identity, invite metadata when present, and the same CSAT/CES/NPS
  summary as the client thank-you.
- Client thank-you for tracked invites unchanged; both sends centralized in
  `sendSurveyCompletionNotifications()` from shared ingest.
- Idempotent via `Response.teamNotifySentAt` (new column) and existing
  `SurveyInvite.thankYouSentAt`.

Files changed: `prisma/schema.prisma`,
`prisma/migrations/20260703120000_add_response_team_notify_sent/migration.sql`,
`lib/survey-thankyou-email.ts`, `lib/survey/ingest.ts`,
`lib/survey-invite-tracking.ts`, `templates/email/voc-team-notify.html`,
`tests/dashboard/survey-completion-notify.test.ts`, `tests/survey/ingest.test.ts`,
`.env.example`, `PROJECT_BRIEF.md`.

Verification: `npx prisma generate`; targeted vitest (13 passed);
`npm run memory:check`.

### 2026-07-03 - Auto-end ElevenLabs voice survey sessions

- Problem: after the agent said goodbye, the WebRTC session stayed open and
  continued billing until the user clicked End survey.
- Added `builtInTools.endCall` and `turn.silenceEndCallTimeout: 45` to
  `buildAgentUpdate()` in `lib/elevenlabs/agent-config.ts`; strengthened prompt
  step 8 to invoke the end-call tool after the final thank-you.
- Extended `verifyConfiguration()` in `scripts/configure-elevenlabs-agent.mts`
  to assert end-call tool and silence timeout.
- Added `useEffect` cleanup in `components/survey/VoiceSurvey.tsx` that calls
  `endSession()` on unmount or `pagehide` while `sessionActive` is true.
- Tests: `tests/survey/agent-config.test.ts`,
  `tests/survey/survey-experience.test.tsx` (unmount cleanup).
- Applied live agent via `npm run elevenlabs:configure -- --apply`; backup at
  `backups/elevenlabs/agent_6401ktv5yqkmf2a95qpd3nh62380-2026-07-03T07-40-38-795Z.json`;
  new version `agtvrsn_6101kwkerc6yehatbr5arnp9chse`.
- Post-call webhook ingest unchanged.

Verification:

- `npm test -- tests/survey/survey-experience.test.tsx tests/survey/agent-config.test.ts` — 20 passed
- `npm run elevenlabs:configure` — dry run passed
- `npm run elevenlabs:configure -- --apply` — live agent verified
- `npm run memory:check` — passed

### 2026-07-03 - Fix voice session ending immediately on start (regression)

- Root cause: `useEffect` cleanup in `VoiceSurvey.tsx` depended on
  `[conversation]`, but `useConversation()` returns a new object every render.
  Cleanup ran on each status change and called `endSession()` while
  `sessionActive` was set before `onConnect`.
- Fix: use stable refs (`endSessionRef`, `connectedRef`, `sessionEnded`) with
  an empty dependency array; only end on unmount/`pagehide` when connected and
  not already ended; remove premature `sessionActive = true` before
  `startSession()` (set only in `onConnect`).
- Tests: all 20 survey/agent-config tests pass.

Files changed: `components/survey/VoiceSurvey.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/survey/survey-experience.test.tsx tests/survey/agent-config.test.ts` — 20 passed.

### 2026-07-03 - Restore approved RSM Kuwait bilingual VOC agent prompt

- Replaced the shortened English-only `AGENT_PROMPT` in
  `lib/elevenlabs/agent-config.ts` with the full approved RSM Kuwait VOC script
  (English/Arabic, structured CSAT/CES/NPS flow, observation logic, guardrails).
- Updated `AGENT_FIRST_MESSAGE` to ask for English or Arabic before identity
  collection.
- Kept `builtInTools.endCall`, `silenceEndCallTimeout: 45`, and a short
  `Session termination` section for auto-end after `closeSurveyEnglish` /
  `closeSurveyArabic`.
- Data collection schema unchanged (`client_name`, `q1_rating`, etc.).

Files changed: `lib/elevenlabs/agent-config.ts`, `tests/survey/agent-config.test.ts`,
`MEMORY.md`.

Verification: `npm test -- tests/survey/agent-config.test.ts` — 5 passed;
`npm run elevenlabs:configure -- --apply` — live agent verified; backup at
`backups/elevenlabs/agent_6401ktv5yqkmf2a95qpd3nh62380-2026-07-03T14-29-22-762Z.json`;
new version `agtvrsn_1401kwm64sg4ekgajcgn4acj5aby`.

### 2026-07-02 - Survey metadata title, description, and thumbnail update

- Updated root app metadata to the approved survey copy:
  `Post-Engagement Satisfaction Survey | Voice of Clients` with description
  `Tell us about your recent service experience with RSM in Kuwait.`
- Added social preview metadata on the root layout so Open Graph and Twitter
  cards use the provided survey thumbnail image from `public/`.

Files changed: `app/layout.tsx`, `MEMORY.md`.
Verification: `npm run memory:check`.

### 2026-07-01 - Incomplete survey completion guard

- Voice webhooks were marking `Response.completedAt` and `SurveyInvite.completedAt`
  even when CSAT, CES, or NPS were missing (abrupt hang-ups).
- Exported `isCompleteSurveyResponse` from `lib/survey/metrics.ts` and use it in
  ingest, invite completion, and thank-you email paths so only all-three-metric
  responses count as complete.
- Incomplete responses still upsert (raw payload preserved) with `completedAt:
  null`, leaving invites eligible for day-3/day-5 follow-ups.

Files changed: `lib/survey/metrics.ts`, `lib/survey/ingest.ts`,
`lib/survey-invite-tracking.ts`, `lib/survey-thankyou-email.ts`,
`tests/survey/metrics.test.ts`, `tests/survey/ingest.test.ts`,
`tests/dashboard/survey-invite-sync.test.ts`, `MEMORY.md`.
Verification: `npm test` (186 passed); `npm run memory:check`.
Follow-up: existing rows incorrectly marked complete before this fix may need a
one-time DB reconcile if follow-ups were blocked.

### 2026-07-01 - API docs: trigger invite + survey success webhook

- Added `docs/API_TRIGGER_SURVEY_EMAIL.md` (send survey email / integration trigger API
  with Postman setup) and importable
  `docs/postman/RSM_VoC_Trigger_API.postman_collection.json` (Bearer
  `SURVEY_INVITE_API_KEY`, three example requests).
- Added `docs/API_SURVEY_SUCCESS_WEBHOOK.md` (ElevenLabs post-call webhook URL,
  HMAC auth, payload contract, responses, ElevenLabs configuration).
- Linked new docs from `docs/SURVEY_INVITE_API.md` and `PROJECT_BRIEF.md`.

Files changed: `docs/API_TRIGGER_SURVEY_EMAIL.md`, `docs/API_SURVEY_SUCCESS_WEBHOOK.md`,
`docs/postman/RSM_VoC_Trigger_API.postman_collection.json`, `docs/SURVEY_INVITE_API.md`,
`PROJECT_BRIEF.md`, `MEMORY.md`.
Verification: documentation-only; `npm run memory:check`.

### 2026-07-01 - Widen squeezed public survey panels

- Fixed typed/voice/mode survey panels collapsing to intrinsic content width
  because the `SurveyShell` child wrapper had no width under `align-items: center`.
- Added `.surveyBody` (`min(700px, 100%)`) on the shell wrapper and set panels to
  `width: 100%` so they match the intro column (was effectively ~320px on some
  viewports despite a 600px CSS cap).

Files changed: `components/survey/survey.module.css`, `components/survey/SurveyShell.tsx`,
`MEMORY.md`.
Verification: browser width check (panel 700px at 1400px viewport, ~591px at 717px);
`npm test -- tests/survey/survey-experience.test.tsx` — 14 passed.

### 2026-07-01 - Mid-engagement survey invite email template

- Replaced the first-send invite HTML (`templates/email/voc-invite.html`) with the
  Mid-Engagement Survey design from `templates/email/Survey Email.html`. Follow-up
  templates (`voc-followup-day3.html`, `voc-followup-day5.html`) are unchanged.
- Wired placeholders to match the existing invite pipeline: `[Client Name]` for
  personalization, `href="#"` on the CTA button, and `{{survey_link}}` for the
  copy-paste URL (per-recipient tracked `?invite=` links via
  `renderSurveyInviteTemplate`).
- Restored sign-off (`Best regards,` / `RSM in Kuwait`) and the legal disclaimer
  plus branded footer image from the prior invite template.

Files changed: `templates/email/voc-invite.html`, `templates/email/Survey Email.html`,
`tests/dashboard/survey-invite-tracking.test.ts`, `MEMORY.md`.
Verification: `npm test -- tests/dashboard/survey-invite-tracking.test.ts`;
`npm run memory:check`.

### 2026-07-01 - Disable Arabic voice survey sessions

- Arabic voice agent is temporarily disabled. `getVoiceConversationLanguage()`
  always returns `en` for ElevenLabs `overrides.agent.language`, while voice UI
  copy and RTL layout still follow the selected survey language. Typed survey
  localization is unchanged.

Files changed: `lib/survey/voice-locale.ts`, `components/survey/VoiceSurvey.tsx`,
`tests/survey/survey-experience.test.tsx`, `tests/survey/voice-locale.test.ts`,
`PROJECT_BRIEF.md`, `MEMORY.md`.
Verification: `npm test -- tests/survey/survey-experience.test.tsx tests/survey/voice-locale.test.ts`;
`npm run memory:check`.

### 2026-06-30 - Widget CSAT scale smiley alignment

- Fixed methodology scale smiley misalignment in `public/widget.js` when the CSAT
  "Somewhat satisfied" label wrapped to two lines. Scale icons now align from the
  top and label spans reserve uniform min-height so taller labels do not push
  smileys out of row.

Files changed: `public/widget.js`, `tests/public/widget.test.ts`, `MEMORY.md`.
Verification: `npm test -- tests/public/widget.test.ts`; `npm run memory:check`.

### 2026-06-30 - Fix partnersForDepartment build type error

- `npm run build` failed because `partnersForDepartment()` inferred a readonly
  literal partner-name tuple, so `Array.includes(next.partner)` rejected plain
  `string` in `SurveyInviteForm`. Added explicit `string[]` return types on
  `partnersForDepartment` and `allSurveyPartners` in `lib/survey-org-structure.ts`.

Files changed: `lib/survey-org-structure.ts`, `MEMORY.md`.
Verification: `npm run build` passes; `npm run memory:check` passes.

### 2026-06-30 - Invite tracker canonical department/partner filters

- Invite tracker department and partner dropdowns now use `lib/survey-org-structure.ts`
  (same as reporting and send form), with partner cascading and case-insensitive matching.

Files changed: `components/dashboard/SurveyInviteTracker.tsx`, `MEMORY.md`.

### 2026-06-30 - Sidebar invite nav active-state fix

- Fixed `/dashboard/invite` using prefix matching so it stayed active on
  `/dashboard/invite-tracker`; Send survey now uses exact path match.

Files changed: `components/dashboard/DashboardShell.tsx`, `MEMORY.md`.

### 2026-06-30 - Invite form department/partner dropdowns

- Replaced free-text department and partner fields on `/dashboard/invite` single-send
  form with canonical dropdowns from `lib/survey-org-structure.ts` (partner cascades
  after department). Updated sample CSV and CSV format hint.

Files changed: `components/dashboard/SurveyInviteForm.tsx`,
`components/dashboard/dashboard.module.css`, `lib/survey-outreach.ts`,
`PROJECT_BRIEF.md`, `MEMORY.md`.

### 2026-06-30 - Department and partner reporting filters

- Added canonical RSM department/partner hierarchy in `lib/survey-org-structure.ts`.
- Extended `/api/insights` and invite stats to expose `department` and `partner`
  from linked `SurveyInvite` rows.
- Added shared `DashboardReportFilters` on overview and CSAT/NPS/CES report pages;
  client-side filtering via `lib/dashboard-report-filters.ts` (period + org).
- Single-recipient invite form uses the same department/partner dropdowns
  (`SurveyInviteForm.tsx`); sample CSV updated to canonical values.
- PDF overview export subtitle includes active department/partner filters.

Files changed: `lib/survey-org-structure.ts`, `lib/dashboard-report-filters.ts`,
`lib/cx-response-select.ts`, `lib/survey-outreach.ts`, `lib/survey-invite-tracking.ts`,
`lib/dashboard-pdf.ts`, `app/api/insights/route.ts`,
`components/dashboard/types.ts`, `components/dashboard/DashboardReportFilters.tsx`,
`components/dashboard/DashboardOverview.tsx`, `components/dashboard/MetricReportView.tsx`,
`components/dashboard/DownloadReportButton.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/dashboard-report-filters.test.ts`, `tests/dashboard/insights-route.test.ts`,
`tests/dashboard/cx-dashboard.test.tsx`, `PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/dashboard-report-filters.test.ts tests/dashboard/insights-route.test.ts tests/dashboard/cx-dashboard.test.tsx`; `npm run memory:check`.

### 2026-06-30 - Survey frontend Arabic language switcher

- Added a fixed bottom-right English/Arabic language switcher on `/survey`.
- Kept the English banner image and intro paragraph at the top regardless of
  selected language.
- Localized mode chooser, typed survey (including approved Arabic question
  translations), voice UI, privacy note, footer, and RTL layout below the intro.
- Removed the separate post-voice language chooser step; language is global for
  the session via `SurveyLanguageSwitcher`.

Files changed: `components/survey/SurveyLanguageSwitcher.tsx`,
`components/survey/SurveyShell.tsx`, `components/survey/SurveyExperience.tsx`,
`components/survey/ModeChooser.tsx`, `components/survey/TypedSurvey.tsx`,
`components/survey/survey.module.css`, `lib/survey/voice-locale.ts`,
`tests/survey/survey-experience.test.tsx`, `tests/survey/voice-locale.test.ts`,
`PROJECT_BRIEF.md`, `MEMORY.md`.

Removed: `components/survey/VoiceLanguageChooser.tsx`.

Verification:

```text
npm test tests/survey/survey-experience.test.tsx tests/survey/voice-locale.test.ts - 16 passed
npm run memory:check - passed
```

### 2026-06-30 - Shared compact React table for admin portal

- Added `@tanstack/react-table` and shared `components/dashboard/CompactDataTable.tsx`
  for column-driven, scrollable admin tables with sticky headers.
- Migrated `/dashboard/responses` and `/dashboard/invite-tracker` from hand-written
  `<table>` markup to `CompactDataTable` with per-view column definitions.
- Unified compact table CSS (`.compactTable`, `.tableWrap`) so both views share the
  same typography, padding, zebra rows, hover state, and empty-row styling.

Files changed: `package.json`, `package-lock.json`,
`components/dashboard/CompactDataTable.tsx`, `components/dashboard/DashboardResponses.tsx`,
`components/dashboard/SurveyInviteTracker.tsx`, `components/dashboard/dashboard.module.css`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx` (6 passed);
`npm run memory:check`.

### 2026-06-30 - Client-facing survey invite API integration doc

- Added `docs/SURVEY_INVITE_API.md` with concise server-to-server integration
  instructions (auth, payload modes, examples, responses, errors) for external clients.

Files changed: `docs/SURVEY_INVITE_API.md`, `MEMORY.md`.

Verification: documentation-only; no code tests required.

### 2026-06-30 - Survey invite integration API (Option A)

- Added server-to-server `POST /api/integrations/survey-invites` secured by
  `SURVEY_INVITE_API_KEY` bearer auth (timing-safe comparison, fail closed when unset).
- Extracted shared invite parsing and send orchestration into
  `lib/survey-invite-request.ts`; refactored dashboard `POST /api/survey/invite` to use it.
- Added bulk-aware integration rate limiting (100 recipients per 10-minute window)
  via `consumeIntegrationInviteRateLimit` in `lib/survey/request-security.ts`.
- Integration API supports single `to`, `emails` array, and `csv` payloads with optional
  metadata fields; `subject` defaults to the branded invite template when omitted.
- Responses return `inviteId` (single) or `batchId` + per-email results (bulk); survey
  tokens/links are not exposed in API responses.

Files changed: `lib/survey-invite-request.ts`, `lib/integration-auth.ts`,
`lib/survey/request-security.ts`, `app/api/survey/invite/route.ts`,
`app/api/integrations/survey-invites/route.ts`, `.env.example`,
`tests/integrations/integration-auth.test.ts`,
`tests/integrations/survey-invites-route.test.ts`,
`tests/survey/request-security.test.ts`, `PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: `npm test -- tests/integrations/ tests/dashboard/survey-invite-route.test.ts tests/survey/request-security.test.ts`; `npm run memory:check`.

Deployment: set `SURVEY_INVITE_API_KEY` in Vercel/VPS before enabling external integrators.

### 2026-06-26 - NPS passive terminology renamed to neutral in dashboard

- Replaced user-facing "Passives"/"passive" NPS labels with "Neutral"/"neutral"
  across dashboard report content, participation stats, PDF methodology text,
  RAG analytics context, shared NPS bucket definitions, public VOC report NPS
  mix, and the embeddable widget scale legend.
- Renamed `NPS_SEGMENT_COLORS.passives` to `neutral` and `nps-passives` bucket
  id to `nps-neutral`. Internal data fields (`passives`, `passivePercent`) are
  unchanged to match the database schema.

Files changed: `lib/metric-report-content.ts`, `lib/metric-participation-stats.ts`,
`lib/dashboard-pdf.ts`, `lib/dashboard-analytics.ts`, `lib/rating-visuals.ts`,
`lib/chat-charts.ts`, `components/reports/PublicVocReport.tsx`,
`public/widget.js`, `PROJECT_BRIEF.md`,
`tests/dashboard/metric-participation-stats.test.ts`,
`tests/dashboard/rating-visuals.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/rating-visuals.test.ts tests/dashboard/metric-participation-stats.test.ts tests/dashboard/metric-report-content.test.ts tests/reports/public-voc-report.test.tsx`; `npm run memory:check`.

### 2026-06-26 - Suppress transient voice survey connection error flash

- Explained and fixed the red "Connection issue" orb/status that could flash at
  voice survey startup when ElevenLabs emitted a transient `onError` during
  WebSocket handshake before `onConnect`.
- `onError` now sets the interrupted message only after a session has connected
  once; startup attempts keep showing "Connecting" instead of the error state.
- Added a regression test for transient startup errors during `startSession`.

Files changed: `components/survey/VoiceSurvey.tsx`,
`tests/survey/survey-experience.test.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/survey/survey-experience.test.tsx`; `npm run memory:check`.

### 2026-06-26 - Overview response breakdown smiley colors

- Aligned overview dashboard Response breakdown smiley icon colors with bar fills
  using `methodologyBucketColor` (green / blue / gray by bucket tone).

Files changed: `components/dashboard/PerformanceIndicators.tsx`, `MEMORY.md`.

### 2026-06-26 - Dashboard CES/NPS report methodology palette alignment

- Applied the unified green / blue / gray methodology palette to dashboard
  CES and NPS report pages: Sentiment distribution donut/list colors now use
  `methodologyBucketColor`, and Methodology & calculation scale bars use
  `methodologyScaleBarSegments` from `lib/rating-visuals.ts`.

Files changed: `lib/rating-visuals.ts`, `components/dashboard/MetricReportAnalytics.tsx`,
`components/dashboard/MetricMethodologyCard.tsx`, `tests/dashboard/rating-visuals.test.ts`,
`MEMORY.md`.

### 2026-06-26 - Unified PDF methodology green / blue / gray palette

- Standardized PDF bucket boxes, global scale bar segments, and smiley icon
  colors to one methodology palette: positive green shades, neutral blue, negative
  grays. Fixed CES scale so rating 4 is blue and 3–1 are gray.

Files changed: `lib/rating-visuals.ts`, `lib/dashboard-pdf.ts`,
`tests/dashboard/rating-visuals.test.ts`, `MEMORY.md`.

### 2026-06-26 - PDF CES scale smiley and range alignment

- Fixed global scale smiley and footer range alignment by parsing scale-cell
  ratings robustly and positioning icons and group labels against the actual
  segmented bar widths (including segment gaps).

Files changed: `lib/dashboard-pdf.ts`, `tests/dashboard/dashboard-pdf.test.ts`,
`MEMORY.md`.

### 2026-06-26 - PDF executive summary sentiment panel layout

- Removed the risk-signals stat from the PDF sentiment panel and centered
  Positive, Neutral, and Negative labels above their corresponding bar segments.

Files changed: `lib/dashboard-pdf.ts`, `MEMORY.md`.

### 2026-06-25 - PDF scale bar segment separators

- Added gaps, rounded segment corners, and white outlines between global scale
  bar segments in the PDF so adjacent same-color ratings (especially NPS) read as
  distinct steps.

Files changed: `lib/dashboard-pdf.ts`, `MEMORY.md`.

### 2026-06-25 - PDF scale bar colors aligned to RSM methodology palette

- Switched PDF global scale bars from the red-to-green spectrum to the RSM
  green / blue / gray methodology colors used on dashboard report pages and the
  public widget (`csatReportScaleColor`, `npsReportScaleColor`,
  `cesReportScaleColor` in `lib/rating-visuals.ts`).

Files changed: `lib/rating-visuals.ts`, `lib/dashboard-pdf.ts`,
`tests/dashboard/rating-visuals.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/rating-visuals.test.ts tests/dashboard/dashboard-pdf.test.ts`.

### 2026-06-25 - PDF footer decorative pattern removed

- Removed the programmatic blue square pattern from the bottom-right footer on all
  PDF report pages. Left the small colored accent line above the footer note.

Files changed: `lib/dashboard-pdf.ts`, `MEMORY.md`.

### 2026-06-25 - PDF scale smileys, layout overlap, and metric-page logo

- Fixed missing methodology smileys above the global scale bar by preloading
  scale-tone icon colors and aligning icons to `scaleCells` from
  `buildMetricReportContent` (same mapping as dashboard methodology cards).
- Separated the calculation/donut row from the scale panel so the donut no longer
  overlaps the scale container; reduced donut size and vertically centered it on
  the calculation block.
- Removed the RSM logo from CSAT/NPS/CES metric report page headers (summary page
  unchanged).

Files changed: `lib/dashboard-pdf.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/dashboard-pdf.test.ts`.

### 2026-06-25 - Dashboard PDF report restyled to match RSM reference

- Restyled `lib/dashboard-pdf.ts` metric pages (CSAT, NPS, CES) to follow the
  October 2025 Voice of Client PDF reference: decorative header wave, green title
  banner, white outreach stats strip (`Total surveys sent` / `Responses received`),
  dashed bucket grouping boxes, gray scale panel with face icons, green-bordered
  formula example, equals sign to donut, subtitle labels, and footer accent line
  with geometric pattern.
- Added `public/pdf/header-wave.jpg` from the reference SVG asset.
- `DownloadReportButton` now passes dashboard outreach stats into the PDF export.

Files changed: `lib/dashboard-pdf.ts`, `components/dashboard/DownloadReportButton.tsx`,
`components/dashboard/DashboardOverview.tsx`, `public/pdf/header-wave.jpg`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/dashboard-pdf.test.ts`; `npm run memory:check`.

### 2026-06-25 - Widget breakdown bars replaced with compact methodology cards

- Replaced the widget `Response breakdown` bar-chart section in `public/widget.js`
  with compact `Methodology & calculation` cards for CSAT, NPS, and CES.
- Each metric now shows the dashboard-style scale representation: tone-colored
  smiley labels, short methodology copy, and the exact colored rating scale bar
  (no response-count rows). Scale blocks are bottom-anchored across CSAT/NPS/CES
  columns so smiley rows and color bars align on one line.

Files changed: `public/widget.js`, `tests/public/widget.test.ts`.

Verification: `npm test -- tests/public/widget.test.ts`; `node --check public/widget.js`;
`ReadLints public/widget.js` (no errors).

### 2026-06-25 - Survey top header replaced with provided VOC banner

- Replaced the survey shell top header block (logo + "Voice of Client" brand text area)
  with the provided banner image asset `public/Frame 1171276008.png`.
- Updated survey shell styles so the banner renders full-width at the top of the
  survey frame and scales responsively.
- Removed the intro progress bars and duplicate "Voice of Client" `h1` below the
  banner; the intro area now shows only the supporting body copy.

Files changed: `components/survey/SurveyShell.tsx`, `components/survey/survey.module.css`.

Verification: `ReadLints` on edited files (no errors); `npm run memory:check`.

### 2026-06-30 - Automatic survey thank-you email on invite completion

- Sends a branded thank-you email to the invite recipient when a tracked survey
  response is recorded, including CSAT/CES/NPS scores and comments.
- Idempotent via `SurveyInvite.thankYouSentAt`; skipped when SMTP is not configured.
- Triggered from invite completion paths in `lib/survey-invite-tracking.ts`.

Files changed: `prisma/schema.prisma`,
`prisma/migrations/20260630120000_add_survey_thankyou_sent/migration.sql`,
`templates/email/voc-thankyou.html`, `lib/survey-thankyou-email.ts`,
`lib/survey-invite-tracking.ts`, `tests/dashboard/survey-thankyou-email.test.ts`.

Verification: `npm test -- tests/dashboard/survey-thankyou-email.test.ts`;
`npm run build`; `npm run db:migrate`; `npm run memory:check`.

### 2026-06-25 - Invite recipient metadata fields and tracker filters

- Added `department`, `partner`, `teamLeader`, `customerName`, `projectId`, and
  `surveyOrder` to `SurveyInvite`, the send form (single + CSV), sample CSV, and
  invite tracker table with filter dropdowns and search.
- Send form now uses a single-recipient / CSV mode switch so only one input path
  is active at a time; API rejects combined single + CSV payloads.

Files changed: `prisma/schema.prisma`,
`prisma/migrations/20260625120000_add_survey_invite_metadata/migration.sql`,
`lib/survey-outreach.ts`, `lib/survey-invite-tracking.ts`, `lib/survey-invite-email.ts`,
`app/api/survey/invite/route.ts`, `components/dashboard/SurveyInviteForm.tsx`,
`components/dashboard/SurveyInviteTracker.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/survey-invite-tracking.test.ts`, `tests/dashboard/survey-invite-email.test.ts`,
`tests/dashboard/survey-invite-route.test.ts`.

Verification: `npx prisma generate`; `npm test -- tests/dashboard/survey-invite-tracking.test.ts tests/dashboard/survey-invite-email.test.ts tests/dashboard/survey-invite-route.test.ts`;
`npm run build`; `npm run memory:check`.

### 2026-06-25 - Survey invite sender display name

- Set SMTP `from` display name to `RSM in Kuwait` for all survey invitation and
  follow-up emails via `formatSurveyInviteFromAddress()`.

Files changed: `lib/survey-invite-email.ts`, `tests/dashboard/survey-invite-email.test.ts`,
`.env.example`.

Verification: `npm test -- tests/dashboard/survey-invite-email.test.ts`; `npm run memory:check`.

### 2026-06-25 - Invite tracker, recipient name, sample CSV, and invite template refresh

- Added `/dashboard/invite-tracker` with a table of sent invitations (recipient,
  sent date, next follow-up date, status, and manual first follow-up action).
- Added sidebar link and a top-bar button on `/dashboard/invite` to open the tracker.
- Added recipient name field for single-email sends, sample CSV download beside
  CSV upload, and `GET /api/survey/invites` plus
  `POST /api/survey/invites/[id]/followup` for tracker data and manual day-3
  follow-up sends (`force: true`, regardless of schedule).
- Replaced the initial invite HTML template with
  `templates/Voice_of_Client_Email_VoC (1).html` (updated banner asset).

Files changed: `templates/email/voc-invite.html`,
`lib/survey-outreach.ts`, `lib/survey-invite-tracking.ts`,
`app/api/survey/invites/route.ts`, `app/api/survey/invites/[id]/followup/route.ts`,
`components/dashboard/SurveyInviteForm.tsx`, `components/dashboard/SurveyInviteTracker.tsx`,
`app/dashboard/invite-tracker/page.tsx`, `app/dashboard/invite/page.tsx`,
`components/dashboard/DashboardShell.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/survey-invite-tracking.test.ts`,
`tests/dashboard/survey-invite-tracker-route.test.ts`.

Verification: `npm test -- tests/dashboard/survey-invite-tracking.test.ts tests/dashboard/survey-invite-tracker-route.test.ts tests/dashboard/survey-invite-route.test.ts`;
`npm run memory:check`.

### 2026-06-23 - CSAT report survey channel breakdown card

- Replaced the redundant rating breakdown card on the CSAT individual report
  with a survey channel card showing English voice, Arabic voice, voice total,
  and typed (text) response counts for the selected period.
- Exposed `language` on the authenticated insights API payload for channel
  attribution.

Files changed: `components/dashboard/MetricReportAnalytics.tsx`,
`components/dashboard/MetricReportView.tsx`, `components/dashboard/types.ts`,
`lib/survey-channel-stats.ts`, `lib/cx-response-select.ts`,
`app/api/insights/route.ts`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/survey-channel-stats.test.ts`, `tests/dashboard/insights-route.test.ts`,
`tests/dashboard/cx-dashboard.test.tsx`.

Verification: `npm test -- tests/dashboard/survey-channel-stats.test.ts tests/dashboard/insights-route.test.ts`;
`npm run memory:check`.

### 2026-06-23 - CSAT metric report layout aligned to reference dashboard

- Restructured individual metric report pages (CSAT/NPS/CES) to match the
  `csat_dashboard (1).html` reference layout while keeping survey outreach
  stats, the survey question block, and client voices unchanged.
- Added two-column rows for overall score donut, sentiment distribution,
  horizontal rating breakdown, methodology/calculation, and a three-card
  customer insights section.

Files changed: `components/dashboard/MetricReportView.tsx`,
`components/dashboard/MetricReportAnalytics.tsx`, `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `lib/rating-visuals.ts`.

Verification: `npm test -- tests/dashboard/metric-report-content.test.ts tests/dashboard/rating-visuals.test.ts`;
`npm run memory:check`.

### 2026-06-23 - Demo trend months on dashboard overview

- Added `withDemoTrendMonths` to pad the overview Experience trend chart with six
  months of placeholder CSAT/CES/NPS values when earlier months have no responses.
  Real months are preserved; filler is UI-only (not used in RAG context or PDF).

Files changed: `lib/trend-demo.ts`, `components/dashboard/DashboardOverview.tsx`,
`tests/dashboard/trend-demo.test.ts`.

Verification: `npm test -- tests/dashboard/trend-demo.test.ts tests/dashboard/cx-dashboard.test.tsx`;
`npm run memory:check`.

### 2026-06-23 - Dashboard experience trend: grouped bar chart

- Replaced the overview Recharts line chart (misleading single Y-axis for CSAT,
  CES, and NPS) with the grouped monthly bar trend already used on the public
  report: blue CSAT, green CES, navy NPS bars per month, each scaled to its
  native range, plus a latest-period legend.

Files changed: `components/dashboard/MetricCharts.tsx`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`; `npm run memory:check`.

### 2026-06-23 - Breakdown chart palette: blue mid-tier, gray for low only

- Updated bucket-tone colors so Response breakdown bars no longer place two greys
  side by side: green (top), theme blue `#009cde` (positive, matching CES gauge
  mid-range), navy (neutral), and logo grey only for negative/low buckets.
- Synced `NPS_SEGMENT_COLORS` passives to blue and `public/widget.js` tone map.

Files changed: `lib/rating-visuals.ts`, `public/widget.js`,
`tests/dashboard/rating-visuals.test.ts`.

Verification: `npm test -- tests/dashboard/rating-visuals.test.ts tests/public/widget.test.ts`;
`npm run memory:check`.

### 2026-06-24 - Interactive experience trend chart with Y-axis

- Replaced the static CSS bar trend on the dashboard overview with a Recharts
  grouped bar chart: horizontal grid lines, a 0–100% Y-axis (each metric scaled
  to its native range), and hover tooltips showing CSAT, CES, and NPS in native
  units.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`; `npm run memory:check`.

### 2026-06-24 - Dashboard heading colors and CSAT metric icon

- Replaced navy (`#00153d`) heading text with RSM charcoal (`#231f20`) across
  the CX dashboard and public report pages so headings align with brand guidance.
- Swapped the CSAT summary-card icon from a smiley face to a star (satisfaction)
  via `MetricKindIcon`; metric title icons now use brand green.
- Smiley faces remain for sentiment breakdown rows and mood filters where they
  convey rating tone.

Files changed: `components/dashboard/MetricIcons.tsx`,
`components/dashboard/dashboard.module.css`, `components/reports/reports.module.css`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`; `npm run memory:check`.

### 2026-06-24 - Methodology scale smileys match label tone colors

- Methodology card scale icons (CSAT, NPS, CES reports) inherit green, blue, or grey
  from their adjacent label via `--scale-tone-color` on the icon cell.
- Overview response-breakdown smileys use `toneColor()` to match their bar colors.

Files changed: `components/dashboard/dashboard.module.css`,
`components/dashboard/PerformanceIndicators.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`; `npm run memory:check`.

### 2026-06-24 - Dashboard label text uses brand body gray (#63666A)

- Set uppercase label text (metric titles CSAT/NPS/CES, participation labels,
  response breakdown heading, breakdown column headers, section labels, filter
  labels) to `--body-text` (#63666A) instead of lighter `--muted` or charcoal.

Files changed: `components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`; `npm run memory:check`.

### 2026-06-24 - Fix voice invite completion tracking for response rate

- Voice surveys were tracked as opened/started but not completed because the
  ElevenLabs conversation ID from the signed URL did not match the webhook
  conversation ID, leaving `SurveyInvite.conversationId` null.
- Added `POST /api/survey/invite-link` and client linking after the voice session
  connects (`conversation.getId()`). Webhook ingest now falls back via
  `reconcileVoiceInviteCompletion` when a started invite has no conversation
  link yet.
- Backfilled the latest orphaned invite/response pair in Neon so the dashboard
  response rate reflects the completed voice survey.

Verification: `npm test -- tests/survey/ingest.test.ts tests/survey/invite-link-route.test.ts`.

### 2026-06-24 - Clear stale voice survey connection errors on connect

- Fixed a UI bug where `VoiceSurvey` could show "Connection issue" and the
  startup error banner while the ElevenLabs session was actually connected and
  Sara was speaking.
- `onConnect` now clears `localError`; startup catch skips setting an error when
  already connected; error UI is hidden whenever `conversation.status` is
  `connected`.
- Hardened survey experience tests with `getId` on the ElevenLabs mock and a
  regression test for stale errors after a failed `startSession` promise.

Files changed: `components/survey/VoiceSurvey.tsx`,
`tests/survey/survey-experience.test.tsx`.

Verification: `npm test -- tests/survey/survey-experience.test.tsx`; `npm run memory:check`.

### 2026-06-24 - Metric report insight card colors

- Changed the "Watch Area" insight tag and trend icon from orange to brand body
  gray (`#63666A`) on CSAT, NPS, and CES report pages.
- Insight headline values now match their card icon color: green for Strength,
  blue for Highlight, gray for Watch Area.

Files changed: `components/dashboard/MetricReportAnalytics.tsx`,
`components/dashboard/dashboard.module.css`.

Verification: visual check on `/dashboard/reports/csat`, `/nps`, `/ces`; `npm run memory:check`.

### 2026-06-24 - Remove navy text color from dashboard and reports

- Replaced all `color: var(--navy)` text usages in `dashboard.module.css` and
  `reports.module.css` with brand charcoal (`#231F20`) across overview, metric
  reports, responses, invite, chat, and public report pages.
- Neutral sentiment/channel indicators now use body gray (`#63666A`) instead of
  navy for labels, legend dots, and chart segments on metric reports.
- Public embed widget text colors updated from navy to charcoal; neutral chart
  tone aligned to body gray in `rating-visuals.ts` and `widget.js`.

Files changed: `components/dashboard/dashboard.module.css`,
`components/reports/reports.module.css`, `components/dashboard/MetricReportAnalytics.tsx`,
`components/dashboard/MetricCharts.tsx`, `lib/rating-visuals.ts`,
`lib/survey-channel-stats.ts`, `public/widget.js`,
`tests/dashboard/rating-visuals.test.ts`.

Verification: `npm test -- tests/dashboard/rating-visuals.test.ts tests/dashboard/survey-channel-stats.test.ts tests/dashboard/cx-dashboard.test.tsx tests/public/widget.test.ts`; `npm run memory:check`.

### 2026-06-24 - Experience trend NPS bars use body gray

- Changed NPS grouped-bar color in the dashboard Experience trend chart (and
  matching legend dot) from navy to brand body gray (`#63666A`), including the
  public report trend fallback bars.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `components/reports/reports.module.css`.

Verification: visual check on dashboard overview Experience trend; `npm run memory:check`.

### 2026-06-24 - Survey public URL for invite links and Prisma .env.local migrate helper

- Added `SURVEY_PUBLIC_URL` so invite email buttons point at the deployed survey
  site (`/survey?invite=...`) even when the CX dashboard runs on a different
  origin.
- Added `npm run db:migrate` via `scripts/prisma-with-env.mjs` so Prisma loads
  `.env.local` (fixes `DATABASE_URL` not found when only `.env.local` exists).
- Applied migration `20260624120000_add_survey_invite_followups` locally.

Verification: `npm run db:migrate`; `npm test -- tests/lib/app-base-url.test.ts`.

### 2026-06-24 - Branded invite HTML templates, CSV personalization, and follow-up cron

- Replaced plain-text survey invitations with branded HTML templates in
  `templates/email/` (`voc-invite.html`, `voc-followup-day3.html`,
  `voc-followup-day5.html`) sourced from the provided AVRA/RSM designs.
- CSV import now parses `email`, `firstname`, `lastname`, and `company` columns
  to personalize greetings; the invite UI documents the expected CSV format.
- Added automatic follow-up reminders on day 3 and day 5 for incomplete invites
  via `GET /api/cron/survey-followups` (Vercel Cron daily at 08:00 UTC, secured
  by `CRON_SECRET`). Migration `20260624120000_add_survey_invite_followups` adds
  recipient name/company fields and follow-up sent timestamps on `SurveyInvite`.
- Day-5 follow-up template includes a blue/green theme strip in place of the
  banner image.

Files changed: `templates/email/*`, `lib/survey-invite-templates.ts`,
`lib/survey-invite-email.ts`, `lib/survey-invite-tracking.ts`,
`lib/survey-outreach.ts`, `prisma/schema.prisma`,
`prisma/migrations/20260624120000_add_survey_invite_followups/migration.sql`,
`app/api/survey/invite/route.ts`, `app/api/cron/survey-followups/route.ts`,
`components/dashboard/SurveyInviteForm.tsx`, `components/dashboard/dashboard.module.css`,
`vercel.json`, `.env.example`, `Avra_Email_VoC_Followup (1).html`,
`tests/dashboard/survey-invite-*.test.ts`, `tests/dashboard/survey-followups-cron.test.ts`,
`PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/survey-invite-route.test.ts tests/dashboard/survey-invite-email.test.ts tests/dashboard/survey-invite-tracking.test.ts tests/dashboard/survey-followups-cron.test.ts`;
`npm run memory:check`.

Follow-up: run `npx prisma migrate deploy` on Neon/production and set
`CRON_SECRET` in Vercel before enabling the follow-up cron.

### 2026-06-23 - Apply invite migrations and restart dev after schema change

- Fixed local `GET /api/public/metrics` 500 (`Unknown field invitesSentCount`) by
  applying pending migrations `20260623120000_add_survey_invite_tracking` and
  `20260623140000_add_invite_outreach_counts` to Neon, then restarting the dev
  server so the Prisma client picked up new `CsatSnapshot` / `SurveyInvite` fields.

Verification: `npx prisma migrate deploy`; restart `npm run dev`;
`GET /api/public/metrics` returns 200.

### 2026-06-23 - Widget outreach stats parity with dashboard

- Replaced the public widget top participation strip (responses in period, voice
  share, completion rate) with **Surveys sent**, **Responses received**, and
  **Response rate** to match the CX dashboard outreach cards.
- Added `invitesSentCount` and `inviteResponsesCount` to `CsatSnapshot`
  (migration `20260623140000_add_invite_outreach_counts`); aggregate recompute
  rolls up invite outreach by sent month. `GET /api/public/metrics` now exposes
  `surveysSent`, `inviteResponsesReceived`, and `inviteResponseRate`.

Files changed: `prisma/schema.prisma`,
`prisma/migrations/20260623140000_add_invite_outreach_counts/migration.sql`,
`lib/aggregate.ts`, `lib/public-csat.ts`, `public/widget.js`,
`tests/public/public-metrics.test.ts`, `tests/public/widget.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/public/`; `npm run memory:check`.

Follow-up: run `npx prisma migrate deploy` and `recomputeAggregates()` so
existing snapshots backfill invite outreach counts.

### 2026-06-23 - Tracked survey invites, CSV bulk send, and outreach dashboard stats

- Added `SurveyInvite` model and migration `20260623120000_add_survey_invite_tracking`
  for per-recipient unique tokens, sent/open/start/complete timestamps, and
  optional voice `conversationId` / `responseId` linkage.
- Each invite email uses a personalized `/survey?invite=<token>` link via
  `{{survey_link}}` in the message template. `POST /api/survey/invite` supports
  single recipient, email arrays, or CSV import (up to 500 addresses).
- Added `POST /api/survey/track` for open and start events; typed and voice
  ingest complete the invite on submission. Voice sessions accept optional
  `inviteToken` and link the ElevenLabs `conversationId`.
- Dashboard overview and CSAT/NPS/CES report pages now show **Surveys sent**,
  **Responses received**, and **Response rate** (with open/start detail) for the
  active reporting period via `GET /api/survey/invite-stats`.
- Updated `/dashboard/invite` with CSV mailing-list upload and bulk-send UX.

Files changed: `prisma/schema.prisma`,
`prisma/migrations/20260623120000_add_survey_invite_tracking/migration.sql`,
`lib/app-base-url.ts`, `lib/survey-outreach.ts`, `lib/survey-outreach-stats.ts`,
`lib/survey-invite-tracking.ts`, `lib/survey-invite-email.ts`, `lib/survey/ingest.ts`,
`lib/survey/schema.ts`, `app/api/survey/invite/route.ts`,
`app/api/survey/invite-stats/route.ts`, `app/api/survey/track/route.ts`,
`app/api/survey/voice-session/route.ts`, `app/api/survey/typed/route.ts`,
`app/survey/page.tsx`, `components/survey/*`, `components/dashboard/*`,
`tests/dashboard/survey-invite-route.test.ts`, `tests/dashboard/survey-invite-tracking.test.ts`,
`tests/dashboard/survey-invite-email.test.ts`, `tests/dashboard/cx-dashboard.test.tsx`,
`tests/survey/voice-session-route.test.ts`, `tests/survey/ingest.test.ts`,
`PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: `npm test` (121 passed); `npm run build`; `npm run memory:check`.

Follow-up: run `npx prisma migrate deploy` on Neon/production before using tracked
invites in production.

### 2026-06-23 - RSM brand colors on overview breakdown charts

- Replaced rainbow bucket-tone fills on the dashboard Response breakdown bar
  charts (CSAT, NPS, CES) with the RSM design-system palette: green for
  very-positive, navy for positive, mid-grey for neutral, and logo/body grey for
  negative buckets (no red).
- Aligned `public/widget.js` breakdown bar colors with the same mapping.

Files changed: `lib/rating-visuals.ts`, `public/widget.js`,
`tests/dashboard/rating-visuals.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/rating-visuals.test.ts tests/public/widget.test.ts`;
`npm run memory:check`.

### 2026-06-23 - VPS hosting handover documentation

- Added `docs/VPS_HOSTING_HANDOVER.md` for client IT: VPS specs, stack, all env
  vars, external service/API dependencies, database + pgvector setup, deploy steps,
  reverse proxy, ElevenLabs webhook + origin allowlist manual work, SMTP invites,
  CX user creation, widget URL updates, verification checklist, and handover
  checklist.
- Linked the doc from `PROJECT_BRIEF.md` Deployment section.

Files changed: `docs/VPS_HOSTING_HANDOVER.md`, `PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: `npm run memory:check`.

### 2026-06-22 - Widget embed hydration fix and dashboard parity stats

- Fixed React hydration mismatch in `PublicWidgetEmbed` by setting
  `window.location.origin` in `useEffect` instead of the initial state so server
  and client both render the loading placeholder first.
- Added `voiceResponseCount` / `voicePercent` to public aggregates and aligned
  widget participation labels with the dashboard overview (responses in period,
  voice share, completion rate).

Files changed: `components/dashboard/PublicWidgetEmbed.tsx`, `lib/survey/metrics.ts`,
`lib/aggregate.ts`, `lib/public-csat.ts`, `prisma/schema.prisma`,
`prisma/migrations/20260622120000_add_complete_response_count/migration.sql`,
`public/widget.js`, `tests/survey/metrics.test.ts`, `tests/public/public-metrics.test.ts`,
`tests/public/widget.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/survey/metrics.test.ts tests/public/public-metrics.test.ts tests/public/widget.test.ts tests/dashboard/cx-dashboard.test.tsx`.

### 2026-06-22 - Fix widget completion rate vs dashboard

- Widget completion rate had used `min(csat, ces, nps)` rating counts, which is not
  the same as responses with all three metrics on one submission. Added
  `completeResponseCount` to period aggregates (`buildPeriodMetrics`,
  `CsatSnapshot`, migration `20260622120000_add_complete_response_count`) and
  exposed `completeResponseCount` / `completionPercent` on `GET /api/public/metrics`.
  Widget now reads those API fields. Aggregate recompute also counts every
  response in `totalResponseCount` (not only rows with at least one metric) so
  the denominator matches the dashboard.

Files changed: `lib/survey/metrics.ts`, `lib/aggregate.ts`, `lib/public-csat.ts`,
`prisma/schema.prisma`, `prisma/migrations/20260622120000_add_complete_response_count/migration.sql`,
`public/widget.js`, `tests/survey/metrics.test.ts`, `tests/public/public-metrics.test.ts`,
`tests/public/widget.test.ts`, `MEMORY.md`.

Verification: `npx prisma generate`, `npm test -- tests/survey/metrics.test.ts tests/public/public-metrics.test.ts tests/public/widget.test.ts`.

Follow-up: run `prisma migrate deploy` and trigger `recomputeAggregates()` so
existing snapshots backfill `completeResponseCount`.

### 2026-06-22 - Full-card sentiment stat backgrounds

- Moved Positive, Neutral, Negative, and Risk signal tint colors from the circular
  icon badge to the full sentiment stat card on the dashboard overview.

Files changed: `components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm run memory:check` passed.

### 2026-06-22 - Align public widget with dashboard overview styling

- Brought non-chart dashboard updates into `public/widget.js`: Prelo typography,
  CX Intelligence header, performance indicators section heading, three-card
  participation strip (surveys received, CSAT ratings, completion rate from
  public aggregates), larger metric titles with SVG icons, CSAT → NPS → CES
  order, and left-aligned breakdown headings. Donut, CES gauge, and breakdown
  bar chart rendering were left unchanged.

Files changed: `public/widget.js`, `tests/public/widget.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/public/widget.test.ts`, `node --check public/widget.js`, `npm run memory:check`.

### 2026-06-22 - Compact comment popovers in response ledger

- Replaced inline comment text in `/dashboard/responses` with a compact
  comment-count pill. Full CSAT/CES/NPS comments open in a fixed-position hover
  or click popover (portal) so the table stays narrow and rows stay even height.

Files changed: `components/dashboard/DashboardResponses.tsx`,
`components/dashboard/dashboard.module.css`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx` passed;
`npm run memory:check` passed.

### 2026-06-22 - Left-align breakdown column metric headings

- CSAT, NPS, and CES headings in the overview response breakdown row are
  left-aligned instead of centered.

Files changed: `components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm run memory:check` passed.

### 2026-06-22 - Dashboard insights cache across navigation

- Lifted `/api/insights` fetching into `DashboardInsightsProvider` inside
  `DashboardShell` so overview, metric reports, and responses share one in-memory
  cache while the sidebar layout persists. Sidebar navigation now shows cached
  data instantly instead of refetching on every page mount. Retry keeps stale
  data visible during background refresh.

Files changed: `components/dashboard/DashboardInsightsProvider.tsx`,
`components/dashboard/useDashboardInsights.ts`, `components/dashboard/DashboardShell.tsx`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`, `npm run memory:check`.

### 2026-06-22 - Non-redundant metric report participation cards

- Replaced duplicate headline KPIs in individual report participation strips with
  rating coverage and watch metrics (dissatisfied, passives, high effort).

Files changed: `lib/metric-participation-stats.ts`,
`components/dashboard/SurveyParticipationStats.tsx`,
`tests/dashboard/metric-participation-stats.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/metric-participation-stats.test.ts`, `npm run memory:check`.

### 2026-06-22 - Metric-specific participation stats on report pages

- Individual CSAT, NPS, and CES reports now show metric-specific participation
  cards (ratings received, headline score, and supporting breakdown) instead of
  the overview voice-share and completion-rate strip.

Files changed: `lib/metric-participation-stats.ts`,
`components/dashboard/SurveyParticipationStats.tsx`, `components/dashboard/MetricReportView.tsx`,
`components/dashboard/dashboard.module.css`, `tests/dashboard/metric-participation-stats.test.ts`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/metric-participation-stats.test.ts tests/dashboard/cx-dashboard.test.tsx`, `npm run memory:check`.

### 2026-06-22 - Metric report survey question callout

- Added the approved voice-survey question text to CSAT, NPS, and CES report
  pages in a callout between participation stats and the KPI summary card.

Files changed: `lib/metric-report-content.ts`, `components/dashboard/MetricReportView.tsx`,
`components/dashboard/dashboard.module.css`, `tests/dashboard/metric-report-content.test.ts`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/metric-report-content.test.ts`, `npm run memory:check`.

### 2026-06-22 - Remove metric report bucket smiley row

- Removed the smiley icon row above the bucket bars on CSAT, NPS, and CES
  individual report pages.

Files changed: `components/dashboard/MetricReportView.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm run memory:check`.

### 2026-06-22 - Remove breakdown section metric icons

- Removed CSAT, NPS, and CES icons from the response breakdown column headers;
  labels are text-only while summary cards still show icons.

Files changed: `components/dashboard/PerformanceIndicators.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`, `npm run memory:check`.

### 2026-06-22 - Larger summary card metric titles

- Increased CSAT, NPS, and CES heading size and icon scale on the dashboard
  overview summary cards so metric labels read more prominently above the charts.

Files changed: `components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx tests/dashboard/metric-icons.test.tsx`, `npm run memory:check`.

### 2026-06-22 - Dashboard survey email invitations

- Added authenticated `/dashboard/invite` with editable To, subject, and message
  fields plus a default template that includes the public `/survey` link.
- Added `POST /api/survey/invite` (CX session only) and `lib/survey-invite-email.ts`
  for SMTP delivery via nodemailer. Reads `FROM_EMAIL`, `SMTP_HOST`, `SMTP_PORT`,
  `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, optional `SURVEY_INVITE_DEFAULT_TO`,
  and `NEXTAUTH_URL` for the survey link.

Files changed: `lib/survey-invite-email.ts`, `app/api/survey/invite/route.ts`,
`app/dashboard/invite/page.tsx`, `components/dashboard/SurveyInviteForm.tsx`,
`components/dashboard/DashboardShell.tsx`, `components/dashboard/dashboard.module.css`,
`.env.example`, `package.json`, `package-lock.json`,
`tests/dashboard/survey-invite-route.test.ts`, `tests/dashboard/survey-invite-email.test.ts`,
`PROJECT_BRIEF.md`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/survey-invite-route.test.ts tests/dashboard/survey-invite-email.test.ts`.

### 2026-06-22 - CES gauge scale tick marks and alignment

- Added numbered 1–7 tick marks and an average-score marker dot on the CES gauge
  so scores like 5.3/7 are easier to read against the arc.
- Replaced the Recharts pie + separate tick overlay with a single SVG gauge so
  the arc, ticks, numbers, marker dot, and Difficult/Easy footer share one
  coordinate system and align correctly. Scale numbers sit in the inner hollow
  so they stay readable above the colored score arc.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`, `npm run memory:check`.

### 2026-06-22 - Survey participation stats strip

- Added a three-card participation row (responses in period, voice share,
  completion rate) to the dashboard overview and CSAT/NPS/CES report pages.
  Completion rate is the share of responses with all three metrics recorded.
  Risk signals are excluded from this strip.

Files changed: `lib/dashboard-analytics.ts`,
`components/dashboard/SurveyParticipationStats.tsx`, `components/dashboard/MetricIcons.tsx`,
`components/dashboard/PerformanceIndicators.tsx`, `components/dashboard/MetricReportView.tsx`,
`components/dashboard/dashboard.module.css`, `tests/dashboard/dashboard-analytics.test.ts`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

### 2026-06-22 - Larger CSAT and NPS overview donuts

- Increased panel donut chart height and radii for CSAT/NPS summary cards on the
  dashboard overview, with a wider max width and slightly larger center label.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-22 - SVG metric icons replace emoji visuals

- Replaced emoji decorations with inline SVG icons for CSAT, NPS, CES titles,
  report sections, status badges, scale cells, insights, improvements, and
  client quotes. Reuses existing `SmileyIcon` for tone-based faces.

Files changed: `components/dashboard/MetricIcons.tsx`, `lib/metric-labels.ts`,
`components/dashboard/MetricReportView.tsx`, `components/dashboard/PerformanceIndicators.tsx`,
`components/dashboard/dashboard.module.css`, `tests/dashboard/metric-icons.test.tsx`,
`MEMORY.md`. Removed `lib/metric-emojis.ts`.

Verification: `npm test` — 105 passed.

### 2026-06-22 - Metric report emoji visuals

- Added shared emoji helpers and richer smiley representation across CSAT, NPS,
  and CES report pages and the dashboard overview (card titles, breakdown bars,
  scale cells, status badges, insights, and client quotes).

Files changed: `lib/metric-emojis.ts`, `components/dashboard/MetricReportView.tsx`,
`components/dashboard/PerformanceIndicators.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/metric-emojis.test.ts`, `MEMORY.md`.

Verification: `npm test` — 105 passed.

### 2026-06-22 - CX metric report pages and Prelo typography

- Added compact **See full report** links under the CSAT, NPS, and CES summary
  cards on the dashboard overview.
- Created authenticated report pages at `/dashboard/reports/csat`,
  `/dashboard/reports/nps`, and `/dashboard/reports/ces` with KPI summary,
  scale guidance, benchmark context, distribution charts, data-driven insights,
  improvement focus, and client voice quotes from stored survey comments.
- Added CSAT, NPS, and CES report entries to the dashboard sidebar.
- Switched sitewide typography from Calibri/Geist to Prelo via RSM Kuwait CDN
  webfonts (`app/prelo.css`).

Files changed: `app/prelo.css`, `app/layout.tsx`, `app/globals.css`,
`app/dashboard/reports/csat/page.tsx`, `app/dashboard/reports/nps/page.tsx`,
`app/dashboard/reports/ces/page.tsx`, `components/dashboard/MetricReportView.tsx`,
`components/dashboard/PerformanceIndicators.tsx`, `components/dashboard/DashboardShell.tsx`,
`components/dashboard/dashboard.module.css`, `components/reports/reports.module.css`,
`components/survey/survey.module.css`, `app/login/login.module.css`,
`lib/metric-report-content.ts`, `public/widget-preview.html`,
`public/widget-backup.html`, `tests/dashboard/metric-report-content.test.ts`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

Verification:

```text
npm test - 103 tests passed
npm run memory:check - passed
```

### 2026-06-19 - Insights chat composer bottom anchor

- Fixed the insights layout flex chain so the message composer stays pinned to the bottom
  while the header and conversation scroll above it.

Files changed: `components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-19 - Chat theme bar chart horizontal labels

- Switched chat bar charts with long or numerous labels (e.g. leading themes) to a
  horizontal layout so category names no longer overlap under vertical bars.

Files changed: `components/dashboard/ChatCharts.tsx`, `components/dashboard/dashboard.module.css`,
`lib/chat-charts.ts`, `MEMORY.md`.

Verification: `npm run build`.

### 2026-06-19 - Server-built chat charts for theme and metric questions

- Added `buildAnalyticsChartsForQuestion` / `resolveChatCharts` so theme, trend,
  metric, and sentiment questions get charts from dashboard analytics even when the
  model omits them.

Files changed: `lib/chat-charts.ts`, `app/api/chat/route.ts`,
`tests/dashboard/chat-charts.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/chat-charts.test.ts tests/dashboard/chat-route.test.ts`;
`npm run build`.

### 2026-06-19 - Chat JSON answer rendering fix

- Hardened `parseChatModelOutput` so the prose `answer` is always extracted even when
  chart validation fails; single-period line charts normalize to bar charts.
- Added a client-side fallback when legacy responses still return raw JSON in `answer`.

Files changed: `lib/chat-charts.ts`, `components/dashboard/InsightsChat.tsx`,
`tests/dashboard/chat-charts.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/chat-charts.test.ts`; `npm run build`.

### 2026-06-19 - PDF face icon IconNode type fix

- Imported `IconNode` from `lucide` instead of a stricter local alias so PDF face icon
  mapping type-checks against current Lucide SVG props.

Files changed: `lib/pdf-face-icons.ts`, `MEMORY.md`.

Verification: `npm run build`.

### 2026-06-19 - Insights chat charts and no history sidebar

- Removed conversation history/localStorage from `/dashboard/insights`; chat is a single
  in-session thread with an optional Clear chat action.
- Chat API now returns structured JSON with up to three chart specs (`line`, `bar`,
  `donut`) for data-heavy answers; `ChatCharts` renders them inline with Recharts.
- Added `lib/chat-charts.ts` validation and chart rendering styles.

Files changed: `components/dashboard/InsightsChat.tsx`,
`components/dashboard/ChatCharts.tsx`, `lib/chat-charts.ts`, `app/api/chat/route.ts`,
`components/dashboard/dashboard.module.css`, `tests/dashboard/chat-charts.test.ts`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/chat-charts.test.ts tests/dashboard/chat-route.test.ts`;
`npm run memory:check`.

### 2026-06-19 - CSAT mood filter icon-only buttons

- Removed score-range labels (4–5, 3, 1–2) from the CSAT mood filter buttons; smiley
  filters are now icon-only with accessible aria-labels.

Files changed: `components/dashboard/DashboardResponses.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`; `npm run memory:check`.

### 2026-06-19 - Response table layout and CSAT filter label

- Renamed the CSAT mood filter default from "Every CSAT" (with smiley icons) to plain
  "All".
- Fixed response table column widths with `table-layout: fixed`, explicit `colgroup`
  widths, and word wrapping so long names no longer stretch columns inconsistently.
- Combined CSAT/CES/NPS comments behind a single View more/View less control to reduce
  row height.

Files changed: `components/dashboard/DashboardResponses.tsx`,
`components/dashboard/dashboard.module.css`, `tests/dashboard/cx-dashboard.test.tsx`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`; `npm run memory:check`.

### 2026-06-19 - Dashboard chat and widget separate pages

- Split the CX dashboard into route-based sections with a shared `app/dashboard/layout.tsx`
  and `DashboardShell` sidebar (`Overview`, `Responses`, `Widget`, `Insights`).
- Moved the RAG assistant to `/dashboard/insights` with a ChatGPT-style layout:
  message thread, composer, suggested prompts, and a right-hand conversation history
  persisted in `localStorage`.
- Moved the public widget embed preview to `/dashboard/widget`; overview page now
  shows KPIs and analytics only.

Files changed: `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`,
`app/dashboard/responses/page.tsx`, `app/dashboard/widget/page.tsx`,
`app/dashboard/insights/page.tsx`, `components/dashboard/DashboardShell.tsx`,
`components/dashboard/DashboardOverview.tsx`, `components/dashboard/DashboardResponses.tsx`,
`components/dashboard/InsightsChat.tsx`, `components/dashboard/useDashboardInsights.ts`,
`components/dashboard/types.ts`, `components/dashboard/PublicWidgetEmbed.tsx`,
`components/dashboard/dashboard.module.css`, `components/CxDashboard.tsx`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/`; `npm run memory:check`.

### 2026-06-19 - PDF summary page spacing and pagination

- Let executive-summary sections flow onto a continuation page when needed instead of
  overlapping the footer; themes no longer collide with the confidentiality line.
- Added consistent section gaps, taller KPI donut cards with bottom padding, and a
  roomier trend chart legend area.

Files changed: `lib/dashboard-pdf.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/dashboard-pdf.test.ts`; `npm run memory:check`.

### 2026-06-19 - PDF face icons and layout cleanup

- Replaced hand-drawn PDF smileys with Lucide icons (`Laugh`, `Smile`, `Meh`,
  `Frown`, `Angry`) rasterized to PNG via `lib/pdf-face-icons.ts` for crisp bucket
  cards; removed crowded per-rating faces from scale bars.
- Fixed executive-summary header overlap (title vs metadata, page number vs logo)
  and tightened sentiment panel spacing.

Files changed: `lib/dashboard-pdf.ts`, `lib/pdf-face-icons.ts`, `package.json`,
`package-lock.json`, `tests/dashboard/pdf-face-icons.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/pdf-face-icons.test.ts tests/dashboard/dashboard-pdf.test.ts`;
`npm run memory:check`.

### 2026-06-19 - Visual four-page dashboard PDF export

- Backed up the prior single-page dashboard PDF renderer as
  `lib/dashboard-pdf-classic.ts` (`renderClassicDashboardPdf` /
  `downloadClassicDashboardPdf`) for easy rollback.
- Replaced `lib/dashboard-pdf.ts` with a screenshot-inspired layout: navy header
  with volume stats and smiley bucket boxes, global-scale color bar, calculation
  formula strip, and donut score — one page each for CSAT (1–5), NPS (0–10), and
  CES (1–7).
- Added a fourth executive-summary page with all-metric KPI donuts, monthly trend,
  sentiment/risk mix, and leading themes.

Files changed: `lib/dashboard-pdf.ts`, `lib/dashboard-pdf-classic.ts`,
`tests/dashboard/dashboard-pdf.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/dashboard-pdf.test.ts`;
`npm run memory:check`.

### 2026-06-19 - Global rating scale colors for distributions

- Centralized the CSAT, CES, and NPS red-to-green color scales in
  `lib/rating-visuals.ts` to match the approved customer-experience measurement
  reference (1/5 CSAT, 1–7 CES, 0–10 NPS).
- Wired the public `/reports` distribution bars and NPS mix segments to those
  shared scale colors; added an NPS per-score distribution panel.
- Updated bucket/tone colors used by the CX dashboard breakdown charts and PDF
  export through the same palette.

Files changed: `lib/rating-visuals.ts`, `components/reports/PublicVocReport.tsx`,
`components/reports/reports.module.css`, `tests/dashboard/rating-visuals.test.ts`,
`tests/reports/public-voc-report.test.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/rating-visuals.test.ts tests/reports/public-voc-report.test.tsx`;
`npm run memory:check`.

### 2026-06-19 - Widget surveys received reference

- Added a top-of-widget "Surveys received" strip to `public/widget.js` that
  shows `totalResponses` from `GET /api/public/metrics` as reference context
  before the CSAT/CES/NPS summary cards.
- Extended widget source tests to assert the new volume label and API field.

Files changed: `public/widget.js`, `tests/public/widget.test.ts`, `MEMORY.md`.

Verification: `npm test -- tests/public/widget.test.ts`; `npm run memory:check`.

### 2026-06-18 - Public report sidebar branding

- Restructured `/reports` to use the same navy sidebar + logo treatment as the CX
  dashboard layout instead of a horizontal hero bar.
- Added Open Graph and Twitter card metadata with the Cloudinary RSM logo so
  shared links show branded previews.

Files changed: `components/reports/PublicVocReport.tsx`,
`components/reports/reports.module.css`, `app/reports/page.tsx`,
`tests/reports/public-voc-report.test.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/reports/public-voc-report.test.tsx`;
`npm run memory:check`.

### 2026-06-18 - Fix production build type errors

- Mapped dashboard `Insight` API rows to `DashboardAnalyticsItem` before calling
  `buildDashboardReport` (insights nest `company`/`clientName` under `client`).
- Replaced regex `/s` flag in `stripTrailingSourcesLine` with `[\s\S]` for the
  project's ES target.

Files changed: `components/CxDashboard.tsx`, `lib/chat-sources.ts`, `MEMORY.md`.

Verification: `npm run build` passed.

### 2026-06-18 - Tighten PDF breakdown spacing after label fix

- Reduced breakdown card height and section gap in `dashboard-pdf.ts` so labels
  stay inside each card without triggering a page break before Experience trend.
- Slightly reduced dashboard breakdown chart bottom margin/padding to match.

Files changed: `lib/dashboard-pdf.ts`, `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/dashboard-pdf.test.ts`; `npm run memory:check`.

### 2026-06-18 - PDF logo, breakdown chart labels, and theme capitalization

- PDF report logo now loads natural image dimensions and scales up to 40×12 mm
  while preserving aspect ratio (fixes stretched/small header logo).
- PDF breakdown bar charts reserve label space inside each card so x-axis group
  numbers no longer sit on the bottom border.
- Dashboard breakdown `BucketBarChart` uses a larger bottom margin and column
  padding so rating labels have clearer spacing.
- Leading themes on the dashboard and in the PDF use `formatThemeLabel` so the
  first letter of each theme is capitalized for display.

Files changed: `lib/dashboard-pdf.ts`, `lib/dashboard-analytics.ts`,
`components/dashboard/MetricCharts.tsx`, `components/CxDashboard.tsx`,
`components/dashboard/dashboard.module.css`,
`tests/dashboard/dashboard-analytics.test.ts`, `tests/dashboard/dashboard-pdf.test.ts`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/dashboard-analytics.test.ts tests/dashboard/dashboard-pdf.test.ts`;
`npm run memory:check`.

### 2026-06-18 - Center dashboard CES gauge score in arc bowl

- Applied the same CES score overlay treatment to the CX dashboard gauge:
  `5.3/7` and `Avg ease score` now sit inside the semicircle (matching CSAT/NPS
  donut centers and the public widget), with `1 Difficult` / `7 Easy` only in
  the footer row.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`;
`npm run memory:check`.

### 2026-06-18 - Center widget CES gauge score in arc bowl

- Moved the widget CES `5.4/7` score and `Avg ease score` label into an absolute
  overlay on the chart area (same pattern as CSAT/NPS donut centers) so the text
  sits higher inside the semicircle instead of on the footer baseline.
- Footer now only shows `1 Difficult` and `7 Easy` under the arc endpoints.

Files changed: `public/widget.js`, `MEMORY.md`.

Verification: `npm test -- tests/public/widget.test.ts`; `npm run memory:check`.

### 2026-06-18 - Response breakdown column separators

- Added vertical dividers between CSAT, NPS, and CES columns in the Response
  breakdown section so the three bar groups read as distinct metrics.
- Applied the same separators in `public/widget.js` for the embeddable widget;
  on narrow screens dividers switch to horizontal rules between stacked sections.

Files changed: `components/dashboard/dashboard.module.css`, `public/widget.js`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx tests/public/widget.test.ts`;
`npm run memory:check`.

### 2026-06-18 - Shorter comment preview in response ledger

- Reduced `COMMENT_PREVIEW_LENGTH` from 140 to 100 characters so collapsed
  CSAT/CES/NPS comments show roughly three lines instead of four before
  `View more`.

Files changed: `components/CxDashboard.tsx`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/cx-dashboard.test.tsx`.

### 2026-06-18 - Human-readable AI analyst sources

- Replaced raw `[response: <uuid>]` citations in the CX chat assistant with
  company or respondent names.
- Added per-theme company attribution to chat context so theme questions can
  name the companies behind each mention count.
- API now returns structured `sources` with `label`, `company`, `clientName`, and
  `responseId`; the dashboard renders a "Referenced companies" chip list.
- Stopped appending a misleading single random response citation on analytics-only
  questions (e.g. leading themes).

Files changed: `lib/chat-sources.ts`, `app/api/chat/route.ts`,
`lib/dashboard-analytics.ts`, `lib/dashboard-analytics-data.ts`,
`components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/chat-sources.test.ts`, `tests/dashboard/dashboard-analytics.test.ts`,
`tests/dashboard/chat-route.test.ts`, `scripts/verify-chat.mjs`,
`scripts/verify-e2e.mts`, `MEMORY.md`.

Verification: `npm test -- tests/dashboard/chat-sources.test.ts
tests/dashboard/chat-route.test.ts tests/dashboard/dashboard-analytics.test.ts`.

### 2026-06-18 - Balance sentiment and themes panel heights

- Set analytics grid to `align-items: stretch` so Sentiment and Leading themes
  cards share equal height.
- Wrapped panel content in flex bodies; risk summary uses `margin-top: auto` to
  anchor at the card bottom.
- Tightened theme row padding and gaps to reduce vertical overflow.

Files changed: `components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`,
`MEMORY.md`.

### 2026-06-18 - Tighten sentiment card and cap leading themes

- Removed redundant sentiment legend under the mix bar; stat tiles and bar chart
  now carry the breakdown.
- Enlarged and boldened stat-tile icons (`bold` prop on `SmileyIcon` /
  `RiskSignalIcon`).
- Capped Leading themes list to 7 items with a "+N more themes" overflow note.

Files changed: `components/dashboard/SmileyIcon.tsx`, `components/CxDashboard.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Refine sentiment stat tile layout

- Reworked Positive / Neutral / Negative / Risk stat boxes to a horizontal layout:
  tinted circular icon badge on the left, value and label stacked on the right.

Files changed: `components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`,
`MEMORY.md`.

### 2026-06-18 - Add smiley icons to sentiment and risk card

- Added `SmileyIcon` faces to the Positive, Neutral, and Negative stat boxes in the
  Sentiment and risk panel, with color-coded tones matching the sentiment bar.
- Replaced legend color dots with the same smiley icons for consistency.
- Added `RiskSignalIcon` (warning triangle) for the Risk signals stat box.

Files changed: `components/dashboard/SmileyIcon.tsx`, `components/CxDashboard.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Improve CSAT mood filter icons

- Replaced abstract Unicode characters (☺, —, ⌢) in the response ledger CSAT mood
  picker with the existing `SmileyIcon` SVG faces (positive, neutral, negative).
- Added `AllCsatIcon` — three mini faces in one row — for the "Every CSAT" filter.

Files changed: `components/dashboard/SmileyIcon.tsx`, `components/CxDashboard.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Fix PDF donut and gauge rendering

- Root cause: `drawArcRing` passed incorrect relative coordinates to jsPDF `lines()`
  (each segment was relative to the polygon start instead of the previous point),
  producing huge triangular fills over the page.
- Fixed `fillPolygon` to chain point-to-point deltas; corrected CES semi-gauge arc
  to sweep 180°→360° (top arc) instead of 180°→0° (bottom arc).

Files changed: `lib/dashboard-pdf.ts`, `tests/dashboard/dashboard-pdf.test.ts`,
`MEMORY.md`.

### 2026-06-18 - Dashboard PDF report download

- Added a **Download PDF report** button to the CX dashboard top bar. It exports a
  concise, RSM-themed A4 report for the active reporting period (all time, 90 days,
  or this year).
- PDF includes KPI summary cards (CSAT/NPS donuts, CES semi-gauge), response
  breakdown bar charts, monthly trend line chart, sentiment mix, leading themes,
  and methodology footer — matching dashboard colors and chart semantics.
- Uses `jspdf` with programmatic chart drawing (no PII; aggregate data only).
  Logo is fetched from the public Cloudinary URL when available.

Files changed: `lib/dashboard-pdf.ts`, `components/dashboard/DownloadReportButton.tsx`,
`components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`,
`package.json`, `package-lock.json`, `tests/dashboard/dashboard-pdf.test.ts`,
`MEMORY.md`.

Verification: `npm test -- tests/dashboard/dashboard-pdf.test.ts`,
`npm test -- tests/dashboard/cx-dashboard.test.tsx`, `npm run memory:check`.

### 2026-06-18 - Fix DownloadReportButton hydration mismatch

- `disabled={loading || error}` differed between SSR and client first paint; gate
  the button `disabled` attribute until after mount while keeping the click guard.

Files changed: `components/dashboard/DownloadReportButton.tsx`, `MEMORY.md`.

### 2026-06-18 - Fix broken widget CES gauge SVG arcs

- Replaced filled donut-segment paths (wrong sweep flags produced an inverted arc)
  with stroke-based semicircle arcs using the same technique as CSAT/NPS donuts.

Files changed: `public/widget.js`, `tests/public/widget.test.ts`, `MEMORY.md`.

### 2026-06-18 - Align public widget CES gauge with CX dashboard

- Replaced the clipped CSS conic-gradient CES gauge in `public/widget.js` with an
  SVG semi-circle donut matching the dashboard: arc on top, `5.3/7` footer row,
  and `1 Difficult` / `7 Easy` scale labels.
- CES widget card meta now includes `Avg x.x/7` like the dashboard.

Files changed: `public/widget.js`, `tests/public/widget.test.ts`, `MEMORY.md`.

### 2026-06-18 - Fix clipped CSAT/NPS donuts and add card padding

- Root cause: panel donut height (120px) was smaller than ring diameter (132px),
  clipping the top and bottom of CSAT/NPS charts.
- Set panel donuts to outer 58px in a 136px-tall chart with 8px PieChart margins.
- Added vertical padding on all three summary card visuals and CES gauge area.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Reduce CSAT/NPS summary donut size

- Scaled panel donuts down (outer 66px, height 120px, max width 200px) after the
  prior enlargement felt too large in the summary cards.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Enlarge CSAT/NPS donuts and tighten CES footer

- Increased panel donut size to match CES (outer 90px, max width 280px) and top-aligned
  all three summary cards.
- Replaced stacked CES scale labels with a three-column footer row:
  `1 Difficult` | `5.3/7` | `7 Easy` on one line directly under the arc.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/PerformanceIndicators.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Tighten CES gauge scale label spacing

- Pulled `1`/`7` scale labels closer to the `5.3/7` score block below the arc.

Files changed: `components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Reorder CES gauge: arc on top, score below

- Moved the arc directly under the card header and placed `5.3/7` plus
  `Avg ease score` below the chart, above the `1`/`7` scale labels. Chart size
  unchanged.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Move CES score above arc and enlarge gauge

- Placed `5.3/7` and `Avg ease score` in a dedicated header row above the arc so
  they no longer overlap the Recharts ring.
- Increased arc size (outer 94px, chart area 136px, max width 280px) and aligned
  the CES card visual to the top of the summary card to remove dead space.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/PerformanceIndicators.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Separate CES gauge arc from scale labels

- Restructured the gauge into a chart area plus a scale-label row below the arc,
  removing absolute positioning that caused `5.3/7`, `Difficult`, and `Easy` to
  overlap the Recharts arc.
- Arc pivot is anchored to the chart-area bottom (`cy="100%"`); score text sits
  in the hollow above the baseline.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Enlarge CES gauge and fix label positioning

- Increased panel gauge chart size (172px height, thicker arc, full card width up to
  240px) to match visual weight of CSAT/NPS donuts.
- Fixed conflicting CSS that pinned the center value to the card bottom; score now
  sits inside the arc bowl at 64%.
- Aligned `1 Difficult` / `7 Easy` scale labels with arc endpoints at 6% inset.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/dashboard.module.css`, `MEMORY.md`.

### 2026-06-18 - Clarify CES gauge scale and fix Recharts fill

- Root cause: `RadialBarChart` with a single data point treated the score as
  100% of the arc, so the meter looked fully filled and did not show position
  on the 1–7 scale.
- Replaced with a Recharts `PieChart` semi-circle (filled score + gray remainder),
  matching the CSAT/NPS donut pattern.
- Center label now shows `5.3/7` with subtitle `Avg ease score`; scale endpoints
  label `1 Difficult` and `7 Easy`; card meta includes `Avg x.x/7`.
- Verified: `npm test -- tests/dashboard/cx-dashboard.test.tsx tests/dashboard/rating-visuals.test.ts` passed.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/PerformanceIndicators.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

### 2026-06-17 - Handle transient Neon Prisma connection errors

- Added `lib/prisma-errors.ts` for shared `P1001` / `P1017` detection and a 503
  response with “Database connection was lost. Please try again.”
- Applied to `GET /api/insights`, `GET /api/public/metrics`, and `POST /api/chat`.
- Added insights route test for `P1017`.

### 2026-06-17 - Restyle public widget to match dashboard metrics

- Rebuilt `public/widget.js` with dashboard-aligned visuals: CSAT/NPS share
  donuts, CES semi-circle gauge, smiley + vertical bar breakdowns, and sanitized
  theme chips. NPS mix is derived from public `distribution` buckets.
- Added `public/widget-preview.html` with a metric selector for local testing.
  Left `public/widget-backup.js` and `public/widget-backup.html` unchanged.
- Replaced horizontal theme pills with a 3-card grid (label, sentiment, 3-line
  summary clamp, mention count) so themes are visible without sideways scroll.
- Fixed widget breakdown bars to grow from a shared baseline and aligned smileys
  with bars by using one column per bucket.
- Updated `tests/public/widget.test.ts` for the new aggregate field usage.

### 2026-06-17 - Balance sentiment panel against themes list

- Expanded the sentiment card with a stacked sentiment-mix bar, legend, and a
  follow-up risk summary row; stat tiles now use a 2×2 grid.
- Set `align-items: start` on the analytics grid so panels keep natural height
  instead of stretching to match the taller themes column.

### 2026-06-17 - Clarify monthly trend period labels

- Monthly trend grouping was already in place (`monthlyTrend` groups responses by
  UTC submission month). All 125 current responses fall in `2026-06`, so the chart
  correctly shows a single month until more periods have data.
- Fixed misleading axis labels: `Jun 26` (2-digit year) now reads `Jun 2026`
  via shared `lib/period-label.ts`, also used on the public `/reports` page.

### 2026-06-17 - Fix CX dashboard insights load hang

- Root cause: `/api/insights` used `include` on `Response`, which pulled full
  ElevenLabs `rawPayload` JSONB for every row. On Neon this query hung
  indefinitely instead of returning.
- Added `lib/cx-response-select.ts` with an explicit `select` that omits
  `rawPayload` but keeps metrics, answers, client, and insight fields.
- Updated `app/api/insights/route.ts` and `lib/dashboard-analytics-data.ts` to
  use the shared select; source detection now uses `typed_` conversation IDs.
- Added P1001 handling on the insights route and dashboard retry/timeout UX
  (45s abort, wake-up hint after 5s, Retry button).
- Verified locally: `GET /api/insights` returns 200 in ~16s; dashboard metrics
  render after load. `npm test -- tests/dashboard/` passed (18).

### 2026-06-17 - Recharts CES gauge and vertical breakdown bars

- Replaced the hand-drawn CES meter with a Recharts `RadialBarChart` semi-circle
  gauge and converted the smiley breakdown lists into vertical bar charts with
  smiley icons aligned above each category.

Files changed: `components/dashboard/MetricCharts.tsx`,
`components/dashboard/PerformanceIndicators.tsx`, `lib/rating-visuals.ts`,
`components/dashboard/dashboard.module.css`, `tests/dashboard/cx-dashboard.test.tsx`,
`tests/dashboard/rating-visuals.test.ts`, `MEMORY.md`.

### 2026-06-17 - Split CX dashboard summary and breakdown rows

- Separated performance indicators into a summary row (CSAT/NPS/CES charts only)
  and a lighter breakdown row (smiley chips only), removing per-panel bar charts
  that duplicated the same data.

Files changed: `components/dashboard/PerformanceIndicators.tsx`,
`components/dashboard/dashboard.module.css`, `tests/dashboard/cx-dashboard.test.tsx`,
`MEMORY.md`.

### 2026-06-17 - Compact unified metric panels on CX dashboard

- Collapsed the overview into three side-by-side panels (CSAT, NPS, CES), each
  with a summary chart, compact smiley chips, and a small distribution chart.
- Removed duplicate sections, long copy blocks, score strips, and the seven-tile
  CES row to reduce clutter.

Files changed: `components/dashboard/PerformanceIndicators.tsx`,
`components/dashboard/MetricCharts.tsx`, `components/dashboard/dashboard.module.css`,
`lib/rating-visuals.ts`, `tests/dashboard/cx-dashboard.test.tsx`,
`tests/dashboard/rating-visuals.test.ts`, `MEMORY.md`.

### 2026-06-17 - Restore top KPI summary cards above smiley breakdown

- Brought back the three headline CSAT/NPS donut and CES gauge cards at the top
  of the dashboard overview, while keeping the smiley breakdown sections below.

Files changed: `components/dashboard/PerformanceIndicators.tsx`,
`components/dashboard/MetricCharts.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

### 2026-06-17 - Smiley-based dashboard metrics with Recharts

- Rebuilt the CX dashboard overview to match the reference smiley-card layout for
  CSAT, NPS, and CES using live response counts and global scales (CSAT 1–5,
  NPS 0–10, CES 1–7). Excluded surveys sent / response rate.
- Added `recharts` for distribution bar charts, satisfaction donut, and monthly
  trend line chart; removed hand-built bar math from overview and analytics grid.

Files changed: `package.json`, `package-lock.json`, `lib/dashboard-analytics.ts`,
`lib/rating-visuals.ts`, `components/dashboard/PerformanceIndicators.tsx`,
`components/dashboard/MetricCharts.tsx`, `components/dashboard/SmileyIcon.tsx`,
`components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/cx-dashboard.test.tsx`, `tests/dashboard/rating-visuals.test.ts`,
`MEMORY.md`.

Verification:

```text
npm test tests/dashboard/ - 16 passed
npm run build - passed
npm run memory:check - passed
```

### 2026-06-17 - Visual KPI indicators on CX dashboard

- Replaced plain-number overview cards with `PerformanceIndicators`: CSAT and NPS
  donut charts (favorable / promoter %), CES semi-circle gauge (average on 1–7),
  and descriptive copy matching the reference layout.
- Response count, voice share, and risk count moved into the section header.

Files changed: `components/dashboard/PerformanceIndicators.tsx`,
`components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

Verification:

```text
npm test tests/dashboard/cx-dashboard.test.tsx - 4 passed
npm run build - passed
npm run memory:check - passed
```

### 2026-06-17 - Compact AI analyst layout and prompt hover contrast

- Reworked the dashboard AI analyst section to a single-column layout: compact
  header, input row first, suggestion chips below.
- Fixed prompt button hover contrast by scoping Ask-button styles to
  `button[type="submit"]` and using ghost-outline chips on the navy panel.

Files changed: `components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`,
`MEMORY.md`.

Verification:

```text
npm test tests/dashboard/cx-dashboard.test.tsx - 4 passed
npm run memory:check - passed
```

### 2026-06-17 - Backup public widget before restyle

- Created `public/widget-backup.js` (exact copy of `public/widget.js`) and
  `public/widget-backup.html` (preview page using the backup script) so the
  current widget look can be restored or compared after a restyle.

Files changed: `public/widget-backup.js`, `public/widget-backup.html`, `MEMORY.md`.

Verification:

```text
cp public/widget.js public/widget-backup.js - backup created
npm run memory:check - passed
```

### 2026-06-17 - Voice survey English/Arabic language selection

- Added a language chooser step after "Take voice survey" (English or Arabic).
- Localized voice survey UI, shell copy, thank-you screen, and RTL layout via
  `lib/survey/voice-locale.ts`.
- Voice sessions pass `overrides.agent.language` (`en` or `ar`) to ElevenLabs
  `startSession()`.
- Agent data-collection config now accepts `language` values `en` and `ar`.

Files changed: `components/survey/SurveyExperience.tsx`,
`components/survey/VoiceLanguageChooser.tsx`, `components/survey/VoiceSurvey.tsx`,
`components/survey/SurveyShell.tsx`, `components/survey/survey.module.css`,
`lib/survey/voice-locale.ts`, `lib/elevenlabs/agent-config.ts`,
`tests/survey/survey-experience.test.tsx`, `tests/survey/voice-locale.test.ts`,
`tests/survey/agent-config.test.ts`, `PROJECT_BRIEF.md`, `MEMORY.md`.

Verification:

```text
npm test tests/survey/survey-experience.test.tsx tests/survey/voice-locale.test.ts tests/survey/agent-config.test.ts - 17 passed
npm run memory:check - passed
```

### 2026-06-17 - Truncate long dashboard comments and insights

- Added expandable truncation for long CSAT/CES/NPS comments and AI insight
  summaries in the response ledger (`View more` / `View less` after 140 characters).

Files changed: `components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`,
`tests/dashboard/cx-dashboard.test.tsx`, `MEMORY.md`.

Verification:

```text
npm test tests/dashboard/cx-dashboard.test.tsx - 4 passed
```

### 2026-06-17 - Dashboard AI chat analytics context

- Enhanced `/api/chat` to include dashboard aggregate context (CSAT, CES, NPS,
  distributions, trends, themes, sentiment, risks) for the selected reporting
  window alongside RAG response retrieval.
- Added shared analytics helpers in `lib/dashboard-analytics.ts` and
  `lib/dashboard-analytics-data.ts`.
- Updated the dashboard AI panel with suggested prompts, clearer copy, reporting
  period passthrough, and a friendly message when `OPENAI_API_KEY` is missing.

Files changed: `app/api/chat/route.ts`, `components/CxDashboard.tsx`,
`components/dashboard/dashboard.module.css`, `lib/dashboard-analytics.ts`,
`lib/dashboard-analytics-data.ts`, `scripts/verify-chat.mjs`,
`tests/dashboard/dashboard-analytics.test.ts`, `tests/dashboard/chat-route.test.ts`,
`MEMORY.md`.

Verification:

```text
npm test tests/dashboard/dashboard-analytics.test.ts tests/dashboard/chat-route.test.ts tests/dashboard/cx-dashboard.test.tsx - 8 passed
npm run build - passed
npm run memory:check - passed
```

### 2026-06-17 - Restore earliest CX dashboard widget section

- Restored the original `/dashboard` widget section with live preview, metric
  selector, and copyable embed code (`lib/widget-embed.ts`).
- Kept `resolveWidgetScript` in `public/widget.js` so the preview renders when
  the script is injected from React.

Files changed: `components/CxDashboard.tsx`,
`components/dashboard/PublicWidgetEmbed.tsx`, `components/dashboard/dashboard.module.css`,
`lib/widget-embed.ts`, `public/widget.js`, `tests/dashboard/cx-dashboard.test.tsx`,
`tests/dashboard/widget-embed.test.ts`, `tests/public/widget.test.ts`, `MEMORY.md`.

Verification:

```text
npm test tests/dashboard/cx-dashboard.test.tsx tests/dashboard/widget-embed.test.ts tests/public/widget.test.ts - 7 passed
npm run memory:check - passed
```

### 2026-06-17 - Revert CX dashboard widget embed

- Reverted commit `ae44318`, removing the in-dashboard `public/widget.js` embed,
  `PublicWidgetEmbed` component, `lib/widget-embed.ts`, and related tests/styles.
- `public/widget.js` remains available for external site embeds only; `/reports` is
  unchanged.

Verification:

```text
git revert ae44318 - succeeded
npm test tests/dashboard/cx-dashboard.test.tsx tests/public/widget.test.ts - 4 passed
npm run memory:check - passed
```

### 2026-06-17 - Public client experience report page

- Added `/reports`, a client-side public statistics page for website visitors.
- Reused CX dashboard widget patterns (headline KPIs, monthly trend bars, NPS
  mix, CSAT/CES distributions) with RSM design-system styling and no private
  data.
- Shows AI-sanitized theme summaries, methodology footnotes, and a survey CTA.
- Data source remains `GET /api/public/metrics` only.

Files changed: `app/reports/page.tsx`, `components/reports/PublicVocReport.tsx`,
`components/reports/reports.module.css`, `tests/reports/public-voc-report.test.tsx`,
`PROJECT_BRIEF.md`, `MEMORY.md`.

Verification:

```text
npm test tests/reports/public-voc-report.test.tsx - 1 passed
npm run build - passed
npm run memory:check - passed
```

### 2026-06-16 - CX dashboard chart colors and table scroll

- Fixed empty distribution bars by replacing removed `--teal` token with a
  green-to-blue gradient (`var(--green)` → `var(--blue)`).
- Rebuilt the experience trend panel as colored vertical bars (CSAT blue, CES
  green, NPS navy) with a legend matching the reference screenshots.
- Fixed NPS mix stacked bar rendering (`display: block; height: 100%`) and
  passives color to grey.
- Set panel section labels (e.g. "Rating detail") to green; theme counts use
  green accent.
- Added inner vertical scrolling on the client feedback detail table with a
  sticky header (`max-height: 480px`, `overflow: auto`).

Files changed: `components/CxDashboard.tsx`, `components/dashboard/dashboard.module.css`.

Verification:

```text
npm test tests/dashboard/cx-dashboard.test.tsx - 2 passed
npm run build - passed
npm run memory:check - passed
```

### 2026-06-16 - Voice orb and mode icon visibility

- Restored voice orb inner ring contrast and blue-green gradient after the design
  system token update dropped `--rsm-cyan`.
- Set mode chooser icons to light blue (voice) and green (typed) backgrounds.

Verification:

```text
npm test tests/survey/survey-experience.test.tsx - passed
```

### 2026-06-16 - RSM in Kuwait branding and design system alignment

- Replaced text-based RSM marks with the official Cloudinary logo CDN across
  survey shell, CX dashboard, login, and public widget.
- Aligned survey, dashboard, login, and widget styling to `rsm-design-system.html`
  tokens: navy `#00153D`, green `#3F9C35`, blue `#009CDE`, Calibri typography,
  4px controls, and card borders with green top accent.
- Standardized user-facing copy from "RSM Kuwait" to "RSM in Kuwait" via
  `lib/brand.ts`.

Verification:

```text
npm test - 64 tests passed
npm run memory:check - passed
```

### 2026-06-16 - Strip ElevenLabs audio tags from voice survey transcript

- Added `stripVoiceAudioTags` in `lib/survey/voice-transcript.ts` to remove
  ElevenLabs TTS delivery tags such as `[happy]` and `[sad]` from displayed text.
- Applied the helper in `components/survey/VoiceSurvey.tsx` when agent messages
  arrive over the live conversation hook.
- Pushed the full platform to `Nexuses/rsm-voc-survey-new` `main`.
- Opened follow-up work on `ekansh` with render-time formatting and transcript
  regression tests for pull request review.

Verification:

```text
npm test tests/survey/voice-transcript.test.ts tests/survey/survey-experience.test.tsx - 12 tests passed
npm run memory:check - passed
git push origin main - succeeded
git push origin ekansh - pending PR
```

### 2026-06-13 - Canonical CSAT, CES, and NPS upgrade

- Replaced the single-question survey with approved CSAT 1-5, CES 1-7, and NPS
  0-10 contracts plus full name, company, and designation.
- Added `Response.surveyVersion`, explicit metric scores,
  `Client.designation`, and expanded PII-free snapshot aggregates.
- Applied migration `20260613133000_add_three_metric_survey` to Neon. Historical
  records remain `legacy-v1`; only valid historical CSAT values were backfilled.
- Updated typed and voice normalization, partial voice handling, GPT insights,
  embeddings, authenticated response detail, and RAG context.
- Rebuilt the public survey, voice orb/waveform experience, CX analytics
  dashboard, `/api/public/metrics`, and the multi-mode public widget.
- Dry-ran, applied, and re-read the live ElevenLabs agent configuration with
  full-name/company/designation and all three rating/comment pairs. The signed
  post-call webhook and origin allowlist were preserved.
- Deployed the production build to `https://rsm-voc-platform.vercel.app`.
- Updated `PROJECT_BRIEF.md`, `README.md`, fixtures, seeds, and verification
  scripts without storing secret values.

Verification:

```text
npm test - 60 tests passed
npm run memory:check - passed
npm run lint - passed
npm run build - passed
Browser survey checks - desktop and 390px mobile passed
ElevenLabs dry run and applied configuration verification - passed
Neon migration deploy and aggregate rebuild - passed
Production survey/widget/public metrics/auth/webhook smoke checks - passed
npm run verify:survey against production - passed
npm run verify:e2e against production - passed
```

### 2026-06-13 - Project brief and durable memory

- Added `PROJECT_BRIEF.md` as the stable architecture, security, setup, API,
  database, integration, credential, and deployment reference.
- Added `MEMORY.md` as the operational handoff and append-only task history.
- Expanded `AGENTS.md` with mandatory pre-task reads and post-task memory
  maintenance.
- Added secret-safe documentation rules: record variable names and locations,
  never values.
- Added `npm run memory:check` to validate required memory sections and detect
  common secret patterns.
- Verified Neon project connectivity, pgvector, critical unique indexes,
  migration status, and aggregate table counts without reading client records.

Verification:

```text
npm run memory:check - passed
npm run lint - passed
npm test - 48 tests passed
npm run build - passed
npx prisma migrate status - database schema is up to date
Neon read-only health inventory - pgvector and critical indexes confirmed
```

### 2026-06-12 - RSM Kuwait survey and CX dashboard redesign

- Restyled the survey using the approved grey, green, blue, cyan, glass, and
  geometric design language from `cdwe.html`.
- Added a state-driven live waveform only while the ElevenLabs session is
  connecting, listening, or speaking.
- Added dashboard CSAT, sentiment, voice-share, risk, rating-distribution, and
  service-driver analytics.
- Added working smiley, sentiment, theme, and risk filters.
- Verified desktop and mobile layouts, 48 tests, lint, and production build.
- Deployed commit `d5b02d4` to Vercel.

### 2026-06-12 - Voice webhook attachment and backfill

- Attached the production post-call webhook to the existing ElevenLabs agent.
- Confirmed HMAC delivery configuration.
- Backfilled three previously missed valid voice conversations.
- Deployed commit `03013be`.

### 2026-06-12 - Complete response ledger

- Extended authenticated insights to include respondent, company, source,
  submitted time, approved question, rating, comments, and AI insight.
- Updated the dashboard to display the complete response ledger.
- Deployed commit `70e9f4a`.

### 2026-06-12 - Public website survey

- Added public voice and typed survey modes.
- Added same-origin validation, honeypot protection, database-backed rate
  limiting, and idempotent typed submission IDs.
- Added secure ElevenLabs signed-session creation.
- Shared the ingest, insight, embedding, and aggregate pipeline between voice
  and typed responses.
- Deployed through commits `afcfee8` to `0d51322`.

### 2026-06-11 - Core platform

- Bootstrapped Next.js, Prisma, Neon Postgres with pgvector, OpenAI insight and
  embedding generation, public aggregates, NextAuth credentials, CX dashboard,
  RAG chatbot, seeds, and end-to-end verification.
- Established the public PII isolation rule and signed idempotent webhook
  ingest.

### 2026-07-30 - Add CI pipeline via GitHub Actions

- Created `.github/workflows/ci.yml` to run `npm test` (Vitest) on every push
  to `main` and on every pull request.
- Workflow uses `actions/checkout@v4`, `actions/setup-node@v4` with Node.js 20,
  `npm ci` for dependency installation, and `npm test` for the test run.
- No build or lint steps included (build requires database env vars; both are
  excluded per the issue requirements).
- No database or deployment changes.
