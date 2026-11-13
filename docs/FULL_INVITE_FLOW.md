# Full invite → survey → notification flow

**Audience:** CX ops, Nexuses handoff, screenshot documentation  
**Host:** `https://voc.rsm.com.kw`  
**Related:** [`GO_LIVE_CHECKLIST.md`](GO_LIVE_CHECKLIST.md), [`SURVEY_INVITE_API.md`](SURVEY_INVITE_API.md), [`API_CRM_STATUS_WEBHOOK.md`](API_CRM_STATUS_WEBHOOK.md), [`API_SURVEY_COMPLETION_PAYLOAD.md`](API_SURVEY_COMPLETION_PAYLOAD.md)

High-level use case: send a tracked survey invite (platform or CRM), client completes voice or typed survey, response is saved, thank-you and team emails go out, CRM can receive status callbacks, and incomplete invites get automatic or manual follow-ups.

Use disposable test emails for walkthroughs. Prefer a **CX** dashboard user for UI shots; **Admin** only if Settings is needed.

---

## One-line summary

**CRM or CX sends invite → client email → open/start tracked survey → voice or typed answers saved → thank-you + team notify (+ optional CRM callback) → if incomplete, auto or manual follow-ups until done.**

---

## Actors and systems

| Who / what | Role |
| --- | --- |
| CX user | Sends invites, tracks status, sends manual follow-ups |
| Client | Receives email, fills survey |
| CRM / integration | Optional API send + inbound status webhooks |
| Platform (Next.js + DB) | Invite tracking, response ingest, emails, cron |
| ElevenLabs | Voice session + signed post-call webhook |

---

## Happy path (platform send → typed complete)

### 1. Send invite from the platform

| | |
| --- | --- |
| **Who** | CX |
| **Where** | `/dashboard/invite` |
| **Do** | Single recipient **or** CSV upload → Send |
| **Screenshots** | `F01-send-invite-single.png`, `F02-send-invite-csv.png` |

Creates a tracked invite and a unique public survey URL (plus a private result link for CRM use).

### 2. Invite appears in tracker

| | |
| --- | --- |
| **Who** | CX |
| **Where** | `/dashboard/invite-tracker` |
| **Do** | Find the new row (status ≈ sent) |
| **Screenshot** | `F04-invite-tracker-sent.png` |

Note status, recipient, and next follow-up date if shown.

### 3. Client receives invitation email

| | |
| --- | --- |
| **Who** | Client |
| **Where** | Email inbox (SendGrid) |
| **Do** | Open the branded invite; show subject + CTA |
| **Screenshot** | `F05-invite-email.png` |

Blur real addresses in shared docs.

### 4. Client opens survey (tracked)

| | |
| --- | --- |
| **Who** | Client |
| **Where** | `/survey?invite=…` |
| **Do** | Land on mode chooser (voice vs typed) |
| **Screenshot** | `F06-survey-mode-chooser.png` |

Opening can mark the invite **opened**; starting the survey marks **filling / started**.

### 5. Client completes typed survey

| | |
| --- | --- |
| **Who** | Client |
| **Where** | Typed flow → review → submit |
| **Screenshots** | `F07-typed-identity.png`, `F08-typed-csat.png`, `F09-typed-ces.png`, `F10-typed-nps.png`, `F11-typed-review.png`, `F12-typed-thankyou-screen.png` |

Typed path collects full name, email, company, designation, then CSAT / CES / NPS (optional comments). Submit saves the response and marks the invite **completed**.

### 6. CX sees completion in tracker

| | |
| --- | --- |
| **Who** | CX |
| **Where** | Invite tracker list / detail |
| **Screenshot** | `F13-tracker-completed.png` |

Status shows completed; scores may appear on the detail view.

### 7. Client thank-you email

| | |
| --- | --- |
| **Who** | System → client |
| **Where** | Client inbox |
| **Screenshot** | `F14-client-thankyou-email.png` |

Thank-you includes the client’s scores.

### 8. Team completion notification

| | |
| --- | --- |
| **Who** | System → CX mailbox |
| **Where** | Internal inbox (`SURVEY_COMPLETION_NOTIFY_TO`) |
| **Screenshot** | `F15-team-notify-email.png` |

Internal notice with recipient/company/scores; low scores can be flagged as needs attention.

---

## Voice branch (optional)

### 5B. Client completes voice survey

| | |
| --- | --- |
| **Who** | Client |
| **Where** | Voice host picker → session → end |
| **Screenshots** | `F07b-voice-host-picker.png`, `F08b-voice-in-session.png` (or ready state if mic is skipped for the doc) |

Host choice is **English** or **Arabic** (same ElevenLabs agent; Arabic uses the allowlisted female TTS voice). After the call, ElevenLabs posts a signed webhook; the platform upserts the response and marks the invite **completed**. Then continue from steps 6–8 above.

---

## CRM branch (optional)

### 1B. Send invite from CRM / API

| | |
| --- | --- |
| **Who** | CRM / integrator |
| **Where** | `POST /api/integrations/survey-invites` |
| **Do** | Bearer `SURVEY_INVITE_API_KEY`; single, bulk, or CSV; optional `externalEngagementId`, `triggerStage`, `idempotencyKey` |
| **Screenshot** | `F03-crm-api-sample.png` (Postman or sanitized request/response) |

Same invite emails and tracked links as a dashboard send. Details: [`SURVEY_INVITE_API.md`](SURVEY_INVITE_API.md).

### 9. CRM status callback

| | |
| --- | --- |
| **Who** | Platform → CRM / Power Automate |
| **Where** | `CRM_STATUS_WEBHOOK_URL` (no CX UI) |
| **Screenshot** | `F16-crm-completed-payload.png` (sanitized sample) |

VOC posts `completed` only, and only when CSAT, CES, and NPS are present. See [`API_CRM_STATUS_WEBHOOK.md`](API_CRM_STATUS_WEBHOOK.md) and [`API_SURVEY_COMPLETION_PAYLOAD.md`](API_SURVEY_COMPLETION_PAYLOAD.md).

### 10. Private result link

| | |
| --- | --- |
| **Who** | CRM / CX |
| **Where** | `/results/[resultToken]` |
| **Screenshot** | `F21-private-results.png` |

Per-invite result page for CRM embedding — not the public metrics widget.

---

## Incomplete path — follow-ups

### 11. Automatic follow-ups

| | |
| --- | --- |
| **Who** | Cron → client |
| **Where** | `/api/cron/survey-followups` (secured with `CRON_SECRET`) |
| **Schedule** | Days **3, 6, 9, and 12** after send (max four reminders) |
| **Screenshots** | `F17-tracker-awaiting-followup.png`, `F18-followup-email.png` |

Only for invites that are not yet completed. Tracker shows next follow-up timing when applicable.

### 12. Manual follow-up

| | |
| --- | --- |
| **Who** | CX |
| **Where** | Invite tracker → send follow-up |
| **Screenshots** | `F19-manual-followup.png`, optional `F20-manual-followup-email.png` |

Same reminder template, on demand, without waiting for the cron day.

---

## Suggested document sections (when assembling the gallery)

1. One-line summary  
2. Happy path (platform → typed → emails)  
3. Voice branch  
4. CRM branch (API send + status webhook + results link)  
5. Incomplete branch (auto + manual follow-ups)  
6. Screenshot gallery keyed to `F01`…`F21`

---

## Screenshot index

| ID | Shot |
| --- | --- |
| F01 | Send invite — single |
| F02 | Send invite — CSV |
| F03 | CRM API sample (optional) |
| F04 | Tracker — sent |
| F05 | Invite email |
| F06 | Survey mode chooser |
| F07–F12 | Typed steps + on-page thanks |
| F07b–F08b | Voice picker / session (optional) |
| F13 | Tracker — completed |
| F14 | Client thank-you email |
| F15 | Team notify email |
| F16 | CRM completed payload (optional) |
| F17–F18 | Awaiting follow-up + auto reminder email |
| F19–F20 | Manual follow-up (+ email) |
| F21 | Private `/results/…` page (optional) |

---

## Browser capture prompt (optional)

```text
Document the RSM VoC full invite→completion use case using docs/FULL_INVITE_FLOW.md steps F01–F21.
I will log into the CX dashboard and open email inboxes when needed.
Use only disposable test data. Blur PII in screenshots/captions.
For each step: navigate, screenshot with the Fxx filename, write 2–3 bullets (who / what / result).
Skip CRM API/webhook steps if I say credentials aren’t available; mark them “deferred”.
Do not send bulk real-client mail. Wait between steps if I need to switch inbox or role.
Start at F01 when I say go.
```
