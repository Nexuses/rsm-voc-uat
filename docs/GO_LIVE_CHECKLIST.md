# Go-live backend / API test checklist

**Target production host:** `https://voc.rsm.com.kw`  
**Audience:** Nexuses + RSM CX / IT before public cutover  
**Related:** [`PROJECT_BRIEF.md`](../PROJECT_BRIEF.md) API inventory, [`VPS_HOSTING_HANDOVER.md`](VPS_HOSTING_HANDOVER.md) §8–11, [`FULL_INVITE_FLOW.md`](FULL_INVITE_FLOW.md) (invite→survey→notify walkthrough), CRM docs below

Use disposable test emails and records. Do not leave real client PII in shared logs. Never paste secret values into tickets or this file.

Set a base URL for curl checks:

```bash
export BASE_URL="https://voc.rsm.com.kw"
```

Until DNS cutover finishes, the same checklist can be run against `https://rsm-voc-survey.nexuses.xyz` by changing `BASE_URL`.

**Status (2026-09-09):** Core go-live paths verified by remote/API walks + operator confirmation on VPS env, cron, ElevenLabs webhook, live voice mic, and team notify. **Outbound CRM / Power Automate automation deferred** (still in progress on RSM side) — skip for this cutover.

---

## Miro board vs current product

An older Miro flow (platform invite → email → CRM integration API → landing → voice/text → ElevenLabs webhook → API → DB → dashboard + RSM email + client output) is still directionally correct. The live product differs in these ways:

| Miro | Current product |
| --- | --- |
| One “Integration API” funnel | Two invite senders: CX `POST /api/survey/invite` and CRM `POST /api/integrations/survey-invites` |
| Landing page | `/` redirects to `/survey`; tracked links are `/survey?invite=<token>` |
| Both survey paths → ElevenLabs webhook | **Voice only** uses ElevenLabs + `POST /api/webhooks/elevenlabs`. **Typed** uses `POST /api/survey/typed` only |
| Simple “API → DB” | Shared ingest + OpenAI insight/embedding + public aggregate recompute |
| CRM inbound only | Also **outbound** `completed` webhook after CSAT, CES, and NPS |
| Client output = thank-you UI | Private `/results/[resultToken]` + optional thank-you email; separate public `/reports` + widgets (no PII) |
| RSM notification email only | Internal notify on every completion **and** scheduled weekly/monthly/quarterly CX report emails |
| Not on Miro | Invite tracker / notes / auto follow-ups, RBAC / audit, Arabic UI + Arabic TTS voice host, rate limits, dual-host cutover |

### Current end-to-end flow

```text
Dashboard invite ──┐
                   ├──► /survey?invite=… ──► track open/start ──┬── Voice (session → ElevenLabs → webhook)
CRM survey-invites ┘                                            └── Typed POST
                                                                         │
                                                              Shared ingest ──► Postgres
                                                                         ├── OpenAI insight + embedding
                                                                         ├── CRM status webhooks
                                                                         └── SendGrid (thank-you / team notify)
                                                              │
                    CX dashboard ◄── insights ────────────────┤
                    /results/[resultToken] ◄──────────────────┤
                    /reports + public widgets ◄── aggregates ─┘
```

---

## 0. Domain / environment cutover (pre-flight)

_Remote + live walks + operator VPS confirmation on 2026-09-09._

- [x] DNS A/AAAA for `voc.rsm.com.kw` points at the VPS; HTTPS cert valid — A=`134.149.188.8`; LE cert CN=`voc.rsm.com.kw`
- [x] Nginx (or reverse proxy) proxies to the Node app; Origin checks work — typed without Origin → 403; invite links on `voc.rsm.com.kw`
- [x] `NEXTAUTH_URL=https://voc.rsm.com.kw` — inferred: `/api/auth/providers` advertises callback host `voc.rsm.com.kw`
- [x] `SURVEY_PUBLIC_URL=https://voc.rsm.com.kw` — inferred: dashboard CSV invite returns `surveyUrl` on `voc.rsm.com.kw`
- [x] App serving post-migrate RBAC (Role/`roleId` present; admin login works)
- [x] ElevenLabs post-call webhook URL + HMAC secret configured for `voc.rsm.com.kw` — **operator confirmed** (webhook URL + secret on VPS / ElevenLabs)
- [x] ElevenLabs agent origin allowlist includes `voc.rsm.com.kw` — voice-session signed URL from this host + live mic OK
- [x] SendGrid sending works on VPS — dashboard invite **200**; invite events include `thank_you`
- [x] `SURVEY_COMPLETION_NOTIFY_TO` / team notify — **operator confirmed** working
- [x] `SURVEY_INVITE_API_KEY` present on VPS — **operator confirmed** (ready for CRM callers when automation goes live)
- [ ] `CRM_STATUS_WEBHOOK_URL` end-to-end with Power Automate — **deferred** (CRM automation still in progress; skip for this cutover)
- [x] VPS **system crontab** for follow-ups / scheduled reports — **operator confirmed**
- [x] `CRON_SECRET` present on VPS — **operator confirmed**
- [x] Prisma migrations applied — `Role` / `roleId` present after migrate
- [x] Login stays on `voc.rsm.com.kw` after sign-in (admin + earlier cx sessions)

---

## 1. Auth and RBAC

| Check | Route / page | Expected |
| --- | --- | --- |
| - [x] Credentials login | `/login` | `admin@rsm.kw` (admin) and earlier `cx.admin@rsm-voc.app` (cx) |
| - [x] Bad password | credentials callback | **401** `CredentialsSignin`; session kept |
| - [x] Anonymous dashboard | `/dashboard` | Redirect to `/login?callbackUrl=/dashboard` |
| - [x] Logout | `signout` | Session cleared; `/dashboard` → login; `/api/insights` → **401** (2026-09-09) |
| - [x] List users | `GET /api/settings/users` | Admin **200**; cx **403** |
| - [x] Create user + assign role | `POST /api/settings/users` | Disposable CX created |
| - [x] Custom roles | `/api/settings/roles` | Create/delete OK; system delete **400** |
| - [x] Audit feed | `/dashboard/settings/audit` | Login + invite events |

---

## 2. Invite paths

### 2a. Dashboard invite (`invite.send`)

| Check | Route / page | Expected |
| --- | --- | --- |
| - [x] Single invite | `POST /api/survey/invite` | **200** `sent:1` (disposable `@rsm.kw`) |
| - [x] CSV bulk | same | **200** `sent:2` with per-row `surveyUrl` / `resultLinkUrl` |
| - [x] Link shape | CSV result | `https://voc.rsm.com.kw/survey?invite=…` |
| - [x] Department / partner metadata | single send | Stored (`CX CONSULTING` / partner on tracker) |
| - [x] Missing SendGrid | staging only | N/A — SendGrid configured and sending in production |

### 2b. CRM / server invite (`SURVEY_INVITE_API_KEY`)

| Check | Route | Expected |
| --- | --- | --- |
| - [x] Unauthorized | no Bearer | **401** |
| - [x] API key configured on VPS | `SURVEY_INVITE_API_KEY` | **Operator confirmed** present (callers can use when ready) |
| - [ ] Single `to` / idempotency / CRM fields live E2E | Bearer + CRM | **Deferred** with CRM automation |
| - [ ] Bulk `emails` / CSV via integration API | same | **Deferred** with CRM automation |
| - [ ] CRM outbound `sent` → Power Automate | VOC → CRM | **Deferred** (automation still in works) |

### 2c. Invite tracker

| Check | Route / page | Expected |
| --- | --- | --- |
| - [x] List invites | `/api/survey/invites`, tracker UI | Loads (12+ shown; statuses) |
| - [x] Outreach stats | `/api/survey/invite-stats` | **200** |
| - [x] Add note | `POST …/notes` `{message}` | **200**; event type `note` |
| - [x] Manual follow-up | `POST …/followup` | **200** on open invite; **409** on completed |

---

## 3. Survey tracking + CRM lifecycle

| Check | Route | Expected |
| --- | --- | --- |
| - [x] Open tracked link | `POST /api/survey/track` `open` | **200**; invite events include `opened` |
| - [x] Start survey | `start` | **200**; events include `started` |
| - [x] Unknown token | `token` unknown | **404** `invite not found` |
| - [x] Completion status (VOC) | after invite-linked typed | Invite `completed` + events `completed`, `thank_you` |
| - [x] No weighted score fields | contract / code | Completion docs keep CSAT/CES/NPS only (no `totalScore`) |
| - [ ] Outbound CRM status webhooks received by Power Automate | VOC → CRM | **Deferred** (automation still in works) |

---

## 4. Typed survey path

| Check | Route / page | Expected |
| --- | --- | --- |
| - [x] EN UI | `/survey` typed | OK |
| - [x] AR UI switcher | language switcher | OK |
| - [x] Happy path | `POST /api/survey/typed` | **200** |
| - [x] Honeypot / invalid schema | same | **400** |
| - [x] Cross-site Origin | no Origin | **403** |
| - [x] Rate limit | >20 / 10 min | Not stress-tested; accepted for cutover (limits exist in code/DB) |
| - [x] Idempotent retry | same `submissionId` | **200**; metrics +1 once |
| - [x] Invite-linked completion | typed + `inviteToken` | Invite completed; `thank_you` event |
| - [x] Result page | `/results/[resultToken]` | **200**; score content present |

---

## 5. Voice survey path

| Check | Route / page | Expected |
| --- | --- | --- |
| - [x] Session create | `POST /api/survey/voice-session` | **200** signed ElevenLabs URL (no API key in body) |
| - [x] Host picker | English / Arabic | UI step present |
| - [x] Mic permission + live call | ElevenLabs widget | **Operator confirmed** live mic OK |
| - [x] `invite-link` | `POST /api/survey/invite-link` | **200** `ok` on fresh token |
| - [x] Webhook bad signature | webhook | **401** |
| - [x] Webhook URL + secret on VPS | ElevenLabs → VOC | **Operator confirmed** configured |
| - [x] Webhook happy path (live) | post-call ingest | Covered by live voice + configured webhook (operator) |
| - [x] Rate limit | >10 / 10 min | Not stress-tested; accepted for cutover |

---

## 6. Shared post-ingest

| Check | System | Expected |
| --- | --- | --- |
| - [x] `Response` + `Client` | insights feed | Invite-linked “GoLive Flow Tester” / Flow Co visible in `/api/insights` |
| - [x] Insight / embedding path | RAG earlier + ingest | RAG answered live; enrichment async |
| - [x] Aggregates | public metrics /reports | Counts/scores update on `/reports` |
| - [x] Team notify inbox | SendGrid → `SURVEY_COMPLETION_NOTIFY_TO` | **Operator confirmed** working |
| - [x] Thank-you path | invite events | `thank_you` recorded on completed invite |
| - [x] AI failure resilience | fault inject | Not fault-injected; accepted — ingest is designed not to fail the request on AI errors |

---

## 7. CX dashboard surfaces

_Live walks as `cx` then `admin` on `voc.rsm.com.kw`._

| Check | Page / API | Expected |
| --- | --- | --- |
| - [x] Overview | `/dashboard` | OK |
| - [x] CSAT / NPS / CES reports | `/dashboard/reports/…` | OK |
| - [x] Responses ledger | `/dashboard/responses` | Export + grouping OK |
| - [x] Insights API | `GET /api/insights` | Session **200** |
| - [x] RAG chat | `/dashboard/insights` | Themes answer + chart |
| - [x] Widget preview | `/dashboard/widget` | OK |
| - [x] Permission gates | admin vs cx | OK |

---

## 8. Public surfaces (PII boundary)

| Check | Route / page | Expected |
| --- | --- | --- |
| - [x] Metrics JSON | `/api/public/metrics` | OK; no email-like PII |
| - [x] Legacy CSAT alias | `/api/public/csat` | **200** |
| - [x] CORS preflight | OPTIONS | **204** |
| - [x] No PII in JSON | inspect | OK |
| - [x] Public report page | `/reports` | Loads CSAT/CES/NPS, trends, distributions |
| - [x] Embed widget script | `/widget.js` | **200** JS (~30KB), metric strings present |

---

## 9. Cron and scheduled mail

| Check | Route | Expected |
| --- | --- | --- |
| - [x] Unauthorized | no secret | **401** |
| - [x] `CRON_SECRET` on VPS | Bearer | **Operator confirmed** |
| - [x] VPS crontab | system cron → follow-ups / scheduled reports | **Operator confirmed** |
| - [x] Follow-ups / scheduled report routes | secured by `CRON_SECRET` | Configured for cutover (authorized smoke left to ops cron runs) |

---

## 10. API inventory quick reference

(See `PROJECT_BRIEF.md` API Inventory — unchanged.)

---

## 11. Recommended full-flow smoke order

Status 2026-09-09:

1. Pre-flight — **done** (operator confirmed webhook, keys, cron)  
2. Login — **done** (admin + cx)  
3. CRM integration invite E2E — **deferred** (automation in progress; API key present on VPS)  
4. Track open/start — **done**  
5. Invite-linked typed + results + thank_you — **done**  
6. Voice session + host picker + live mic + webhook config — **done**  
7. Dashboard — **done**  
8. `/reports` + widget.js — **done**  
9. Cron secret + crontab — **done** (operator)  
10. Automated gate — Vitest done; optional prod verify scripts not required for cutover  

---

## 12. Automated verification gate

- [x] Vitest green — **237** tests passed locally (2026-09-09)
- [x] Migrate status — applied on VPS (RBAC tables present)
- [x] Manual cutover smoke — complete except deferred CRM Power Automate E2E
- [ ] `verify:survey` / `verify:e2e` against production — optional; not required for this cutover

---

## Deferred (not blocking this cutover)

Outbound **CRM / Power Automate** status automation (`CRM_STATUS_WEBHOOK_URL` receipt of `completed` with CSAT, CES, and NPS) and live CRM-triggered `POST /api/integrations/survey-invites` E2E. VOC side invite API key is confirmed on the VPS; retest when RSM automation is ready. See [`API_CRM_STATUS_WEBHOOK.md`](API_CRM_STATUS_WEBHOOK.md) and [`API_TRIGGER_SURVEY_EMAIL.md`](API_TRIGGER_SURVEY_EMAIL.md).

---

## Sign-off

| Role | Name | Date | Notes |
| --- | --- | --- | --- |
| Engineering | | 2026-09-09 | Core VOC paths verified; CRM automation deferred |
| CX / product | | | |
| Client IT (domain / cron / secrets) | | 2026-09-09 | Keys, crontab, webhook, mic, team notify confirmed |

After sign-off, treat `https://voc.rsm.com.kw` as the canonical public and dashboard origin; keep ElevenLabs webhook and SendGrid links aligned with that host.
