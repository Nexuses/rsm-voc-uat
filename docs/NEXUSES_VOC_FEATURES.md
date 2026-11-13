# Nexuses VOC — What the platform has

**Product:** RSM in Kuwait Voice of Clients (Nexuses)  
**Listed:** 2026-09-21  
**Scope:** Features that are live in this platform today. Nothing about gaps or other products.  
**Recent client requests:** see `docs/CLIENT_REQUEST_CHANGES_2026-09.md`.

---

## Feature inventory

| # | Feature | What it does |
| --- | --- | --- |
| 1 | Voice survey | Client speaks with an AI host (ElevenLabs). Collects name, company, designation, CSAT, CES, NPS. |
| 2 | Typed survey | Same metrics via a web form, plus required email. |
| 3 | English / Arabic UI | Language switcher on the survey; Arabic layout is RTL. |
| 4 | Voice host choice | After choosing voice: English or Arabic (same agent; Arabic uses allowlisted TTS voice). |
| 5 | CSAT score | Satisfaction, scale 1–5. |
| 6 | CES score | Effort, scale 1–7. |
| 7 | NPS score | Recommend, scale 0–10. |
| 8 | Optional comments | Client can add a comment per metric. |
| 9 | Tracked invite links | Each invite gets a unique `/survey?invite=…` link. |
| 10 | Send survey email | CX dashboard sends branded HTML invites (single or CSV bulk). |
| 11 | Invite API (CRM trigger) | External systems / CRM send the same invites with an API key; mid/post stage + engagement id + idempotency. |
| 12 | Survey + result URLs in API response | CRM receives tracked survey URL and private result link per send. |
| 13 | Invite open / start tracking | Opens and survey starts are recorded on the invite. |
| 14 | CRM status webhooks | VOC posts `completed` to RSM (Power Automate) only after CSAT, CES, and NPS are present. |
| 15 | Completion scores JSON | Documented CSAT/CES/NPS + comments payload on completed webhook for RSM flows. |
| 16 | Private result link | Unique non-public `/results/…` page per invite for CRM embedding. |
| 17 | Auto reminders | Incomplete invites get reminders on days 3, 6, 9, and 12 (max 4). Outlook-safe HTML; subjects thread as `Re:` of the original invite. |
| 18 | Manual reminder | CX can send a follow-up from the invite tracker anytime. |
| 19 | Invite notes & timeline | Notes and activity history on each invite. |
| 20 | Client thank-you email | After a tracked invite is completed, client gets a thank-you with scores. |
| 21 | Team completion email | Internal mailbox gets a completion notice; flags low scores as “needs attention.” |
| 22 | Scheduled CX reports | Weekly / monthly / quarterly email with CSV + Excel of responses. |
| 23 | Email send retry | Failed SendGrid sends retry up to 3 times on temporary errors. |
| 24 | CX login | Credentials login for dashboard users, with email OTP (MFA). |
| 25 | Custom roles / RBAC | Admin creates roles with a permission matrix; users are assigned a role. |
| 25a | Self-serve password change | Settings → Account: any Settings-capable user can change their own password (audited). |
| 26 | Audit log | Logins, survey sends, role/user changes, password changes; CSV export. |
| 27 | Dashboard overview | CSAT, CES, NPS, volume, trends, themes, sentiment, risk, response rate. |
| 27a | Voice credits banner | Warns CX when ElevenLabs subscription usage is high or exhausted. |
| 28 | CSAT / NPS / CES report pages | Dedicated report pages per metric. |
| 29 | Period filter | All time, last 90 days, or current year. |
| 30 | Department / partner filter | Filter reports and responses by department and partner. |
| 31 | Responses ledger | Full response list with identity, scores, comments, insights; Email column. |
| 32 | By email / by recency views | Group by respondent email, or flat list newest first (default), with pagination. |
| 33 | Export CSV | Download filtered responses as CSV. |
| 34 | Export Excel | Download filtered responses as Excel. |
| 35 | Export PDF | Download overview / metric report as PDF. |
| 36 | AI insights | Each response gets sentiment, summary, drivers, risks, next steps. |
| 37 | Insights chat (RAG) | Ask questions over stored feedback and invite outreach; answers cite sources and can show charts. |
| 37a | Invite-aware chat | Outreach totals plus per-email invite status and linked survey feedback. |
| 38 | Website widget | Embeddable public CSAT / CES / NPS widgets for other sites. |
| 39 | Public metrics API | PII-free CSAT, CES, NPS aggregates for websites and partners. |
| 40 | Public experience report | Full-page `/reports` with scores, trends, themes (no personal data). |
| 41 | PII boundary | Public pages and APIs never expose names, emails, or raw comments. |
| 42 | RSM Kuwait branding | Official colours, Prelo font, RSM logo on survey and dashboard. |

---

## One-line summary

Nexuses VOC is a **CSAT / CES / NPS** Voice of Clients system: voice + typed survey (EN/AR), CRM-triggered invite outreach with status webhooks and private result links, CX analytics dashboard with RBAC and audit logging, AI insights chat, exports (PDF/Excel/CSV), scheduled reports, and public PII-free metrics/widgets.
