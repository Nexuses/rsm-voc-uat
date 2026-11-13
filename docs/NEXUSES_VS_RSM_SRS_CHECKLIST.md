# Nexuses VOC vs RSM SRS — Feature Checklist

> **Superseded scope decision (2026-09-28).** The "not feasible" verdicts below
> reflect the 2026-08-19 CSAT/CES/NPS-only scope. RSM has since approved
> expanding the platform (survey versioning, weighted scoring, cases/SLA,
> escalation, client confirmation, account health, training). Rows are being
> converted incrementally behind feature flags; see `PROJECT_BRIEF.md`
> ("Current Limitations And Decisions") and `MEMORY.md` task history for what
> has shipped. The marks below are kept as the historical baseline.

**Compared:** 2026-08-19  
**Nexuses VOC:** this repository (shipped Voice of Clients platform)  
**RSM (SRS):** the portal defined by [`RSM_Client_Survey_SRS_v1.md`](../RSM_Client_Survey_SRS_v1.md) v1.0 — not a second live codebase. Every SRS-defined row is **Yes** in that column because it is the requirement set.

Gap narrative (no ticks): [`SRS_v1_GAP_ANALYSIS.md`](SRS_v1_GAP_ANALYSIS.md).

## How to read the marks

| Mark | Meaning |
| --- | --- |
| **Yes** | Same capability as the SRS row (or, in the extras table, present in that product). |
| **Partial** | A nearby analog exists. **Not** the SRS feature. Read the Nexuses note. |
| **No** | Not present. |

A **Partial** is not a tick. Nearby work (CSAT/CES/NPS, invite emails, CX grouping) does not count as the SRS six-question, opportunity/budget, resolution, or training product.

**VOC feasible?** This product stays CSAT / CES / NPS. Rows that need CRM, a new question set, Partner/OMP workflows, resolution, or training are **not feasible** here and stay **No**.

---

## Scoreboard (SRS-defined rows only)

Counted from the tables below (goals, roles, FR-001–054, entities, state machines, NFRs, acceptance). Extra Nexuses-only features are **not** in this tally.

| Mark | Nexuses VOC | RSM (SRS) |
| --- | ---: | ---: |
| Yes | 4 | 105 (every SRS-defined row) |
| Partial | 26 | 0 |
| No | 75 | 0 |

SRS-defined rows counted: 6 goals + 7 roles + 54 FRs + 16 entities + 3 state machines + 7 NFRs + 12 acceptance criteria = **105**.

Nexuses **Yes** on this VOC product:

- **FR-011** optional comments (current survey)
- **FR-049** export PDF + Excel + CSV
- **FR-050** scheduled weekly / monthly / quarterly CX reports
- **NFR-002** secure login (SRS allows SSO **or** secure login; credentials qualify; SSO is not required)

Wave 2 does **not** convert CRM / scoring / resolution / training rows to Yes. Those are not feasible without replacing the product.

---

## Feasible on this VOC product?

### Not feasible (stay No)

Would replace Voice of Clients with the SRS CRM / six-question / resolution / training system.

| Area | Why not feasible |
| --- | --- |
| Measure satisfaction by project lifecycle (goal) | Needs opportunity/project stage, not walk-in/invite VOC. |
| Automate issue resolution (goal) | No resolution module by design. |
| Track team performance as SRS team dashboard (goal) | No Engagement Team role or team scoreboards. |
| Training actions from recurring low scores (goal) | No training module. |
| OMP, Engagement Partner, Team Leader, Engagement Team roles | Seven-role matrix is a different product. `cx` / `admin` stay. |
| Client role: verify issue resolution | No client portal or resolution loop. |
| FR-001–FR-005 | Opportunity won, eligibility engine, budget %, billing triggers = CRM. |
| FR-009–FR-010, FR-013–FR-016 | Approved instrument is CSAT/CES/NPS. Changing questions/weights/scales breaks the live agent, typed survey, and public metrics. |
| FR-017–FR-019, FR-021–FR-036 | Partner/Team Leader/OMP routing, five appreciation templates, apology copy, 24h SLA, client verification. Needs those roles and a resolution module. |
| FR-028–FR-029 | Single-negative-question rule depends on the six 1–5 questions. |
| FR-037–FR-043 | Training tasks, courses, Lessons Learned, OMP meetings. |
| FR-046–FR-048 | Team / resolution / training dashboards. |
| FR-052 | Immutable legal audit store. Invite events are editable application logs. |
| Entities: Roles, Projects (budget), Opportunities, Survey Questions (weighted bank), Survey Scores, Notifications, Resolution*, Training*, Escalations, Audit Logs | Not in this schema on purpose. |
| Resolution and training state machines | Modules do not exist. |
| NFR-001 SRS RBAC | Not the seven SRS roles. |
| NFR-003 99.5% uptime as an in-app feature | Hosting contract, not application code. |
| NFR-004 all critical actions logged | No SRS-wide audit log. |
| Acceptance: automation, weightage, score-band workflows, SLA, client verification, escalation, training, audit retained | Those accept the SRS product, not VOC. |

### Feasible or analog (stay on CSAT/CES/NPS)

| Area | Status after wave 2 |
| --- | --- |
| Identify issues early (themes/risk) | Partial analog. |
| Improve client experience (survey + thank-you) | Partial analog. |
| Admin / follow-up as CX users | Partial analog. |
| FR-006 invite email | Partial (manual/API, not opportunity-triggered). |
| FR-007 reminders every 3 days | Partial — **capped at 4** (spam policy). Uncapping is feasible later. |
| FR-008 follow-up notes | Partial analog (CX timeline, not engagement-role log). |
| FR-011 comments | **Yes.** |
| FR-012 identity-bearing / no anonymous toggle | Partial. Toggle is optional/out of wave 2. |
| FR-015 historical averages | Partial (per CSAT/CES/NPS, not SRS overall). |
| FR-020 thank-you | Partial (invite-linked, not score-band). |
| FR-044 executive VOC metrics | Partial (no open/escalated issues). |
| FR-045 CX client grouping | Partial (not a client portal). |
| FR-049 PDF + Excel + CSV | **Yes.** |
| FR-050 scheduled weekly/monthly/quarterly reports | **Yes** (internal CX mail with CSV + Excel). |
| FR-051 / FR-053 / FR-054 | Partial (invite events; no task/training/appreciation/resolution mail). |
| Survey invite lifecycle (sent/opened/completed) | Partial (no Draft/Archived). |
| Users / Clients / Responses | Partial entities. |
| NFR-002 secure login | **Yes** (SSO not required by the OR clause). |
| NFR-005 department/partner lists | Partial. |
| NFR-006 dashboard speed | Partial (not formally SLA-tested). |
| NFR-007 email retry | Partial — bounded SendGrid retries; not a durable queue. |
| Dashboards display VOC metrics (acceptance) | Partial. |

---

## 1. Product goals (SRS §1.2)

| Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- |
| Measure satisfaction throughout the project lifecycle | No | Yes | Surveys are invite- or walk-in-driven, not tied to project stage or budget. |
| Identify service issues early | Partial | Yes | Dashboard themes, sentiment, and risk exist. No lifecycle / per-SRS-question issue engine. |
| Automate issue resolution | No | Yes | No resolution tasks. |
| Improve client experience | Partial | Yes | Survey + thank-you. No resolution / client-verification loop. |
| Track team performance | No | Yes | Department/partner filters only; no team-performance dashboard. |
| Generate training actions from recurring low scores | No | Yes | No training module. |

---

## 2. User roles (SRS §2)

The SRS Client role is “complete surveys **and** verify issue resolution.” Completing `/survey` is not that role.

| Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- |
| System Admin (full access, SRS permission matrix) | Partial | Yes | `admin` / `cx` credentials exist; no SRS role split or permission matrix. |
| Office Managing Partner (OMP) | No | Yes | |
| Engagement Partner | No | Yes | |
| Team Leader | No | Yes | |
| Engagement Team | No | Yes | |
| Dedicated Follow-up Personnel | Partial | Yes | CX users send invites, reminders, and notes; not this role. |
| Client (complete survey **and** verify resolution) | Partial | Yes | Public survey completion only. No login or resolution verification. |

---

## 3. Contact, eligibility, budget, triggers (FR-001–FR-008)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-001 | Capture name + email when opportunity is won; block survey workflow without them | No | Yes | Invites need an email. No Opportunities entity or win-stage gate. |
| FR-002 | Configurable survey eligibility engine | No | Yes | |
| FR-003 | Continuous project budget monitoring | No | Yes | No Projects / budget integration. |
| FR-004 | First survey at budget ≥ 50% | No | Yes | |
| FR-005 | Second survey at budget ≥ 100% or final billing | No | Yes | |
| FR-006 | Email survey link to client | Partial | Yes | Branded tracked invites (dashboard + integration API). Not fired by opportunity/budget. |
| FR-007 | Reminder every 3 days until answered | Partial | Yes | Automatic reminders every 3 days, **max 4** (days 3, 6, 9, 12), then stop. |
| FR-008 | Record manual follow-up activities | Partial | Yes | Invite-tracker notes + activity timeline. Not an engagement-role activity log. |

---

## 4. Survey module (FR-009–FR-012)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-009 | Six weighted questions (Quality 20%, Value 5%, Communicator 25%, Competent 10%, Recommend 20%, vs alternatives 20%) | No | Yes | Approved instrument is CSAT (1–5), CES (1–7), NPS (0–10). Different questions, weights, and wording. |
| FR-010 | Uniform 1–5 scale on every question | No | Yes | Mixed scales. |
| FR-011 | Optional written comments | Yes | Yes | Optional per-metric comments on the current survey. |
| FR-012 | Anonymous responses off unless explicitly enabled | Partial | Yes | Responses are identity-bearing (name, company, designation; typed also email). No SRS anonymous toggle. |

---

## 5. Scoring engine (FR-013–FR-016)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-013 | Weighted score = question score × weight | No | Yes | CSAT / CES / NPS calculated independently. |
| FR-014 | Overall score = sum of weighted scores | No | Yes | |
| FR-015 | Historical average = total survey scores / number of surveys | Partial | Yes | Averages exist per CSAT/CES/NPS, not one SRS overall score. |
| FR-016 | Bands Positive+ / Positive / Neutral / Negative / Negative+ | No | Yes | No SRS category classification. |

---

## 6. Score-band workflows (FR-017–FR-027)

Internal “Needs attention” (CSAT ≤ 2, CES ≤ 3, or NPS ≤ 6) is **not** FR-017–FR-026.

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-017 | Positive trigger when overall score ≥ 4.00 | No | Yes | |
| FR-018 | Appreciation email to Partner, Team Leader, Engagement Team | No | Yes | |
| FR-019 | Random pick from 5 appreciation templates | No | Yes | |
| FR-020 | Client thank-you on positive | Partial | Yes | Thank-you for **tracked invite** completions, all scores, one template. Walk-ins get no client mail. |
| FR-021 | Neutral trigger 3.00–3.99 | No | Yes | |
| FR-022 | Neutral: notify Partner + Team Leader | No | Yes | One internal mailbox (`SURVEY_COMPLETION_NOTIFY_TO`), not those roles. |
| FR-023 | Neutral client acknowledgement email | No | Yes | |
| FR-024 | Negative trigger when overall &lt; 3.00 | No | Yes | |
| FR-025 | Negative: notify Partner + Team Leader | No | Yes | Attention flag on the same internal notify is not this workflow. |
| FR-026 | Client apology / acknowledgement | No | Yes | |
| FR-027 | Auto-create Issue Resolution Task | No | Yes | |

---

## 7. Single negative question (FR-028–FR-029)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-028 | Detect any question &lt; 3 even if overall still Positive+/Positive/Neutral | No | Yes | No six-question model / no this rule. |
| FR-029 | Notify Partner + Team Leader; create resolution task | No | Yes | |

---

## 8. Resolution management (FR-030–FR-036)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-030 | Assign resolution task to Engagement Partner | No | Yes | Entire module absent. |
| FR-031 | Partner records root cause, actions, resolution summary | No | Yes | |
| FR-032 | 24-hour resolution SLA | No | Yes | |
| FR-033 | Partner marks issue resolved | No | Yes | |
| FR-034 | Auto client verification email | No | Yes | |
| FR-035 | Client rejection → Partner, Team Leader, copy OMP | No | Yes | |
| FR-036 | Escalated status | No | Yes | |

---

## 9. Training (FR-037–FR-043)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-037 | Same question ≤ 3 across 5 consecutive surveys | No | Yes | Entire module absent. |
| FR-038 | Training task assigned to Engagement Team | No | Yes | |
| FR-039 | 15-calendar-day due date | No | Yes | |
| FR-040 | Lessons Learned attachment to OMP | No | Yes | |
| FR-041 | Repeat failure → meeting (OMP, Partner, Team Leader, Team) | No | Yes | |
| FR-042 | Map low scores to named training courses | No | Yes | |
| FR-043 | Show recommendations in task details | No | Yes | |

---

## 10. Dashboards (FR-044–FR-048)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-044 | Executive: response rate, average score, trends, **open issues**, **escalated issues** | Partial | Yes | Response rate, CSAT/CES/NPS averages, and trends exist. Open/escalated issues do not. |
| FR-045 | Client dashboard: history, previous surveys, average scores | Partial | Yes | CX `/dashboard/responses` groups by email or name+company. No client-facing portal. |
| FR-046 | Team dashboard: team performance, positive/negative surveys | No | Yes | |
| FR-047 | Resolution dashboard: open/closed tasks, SLA breaches | No | Yes | |
| FR-048 | Training dashboard: pending/completed, repeat offenders | No | Yes | |

---

## 11. Reporting (FR-049–FR-050)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-049 | Export PDF, Excel, **and** CSV | Yes | Yes | Overview PDF plus filtered responses CSV and Excel (SpreadsheetML `.xls`). |
| FR-050 | Scheduled weekly / monthly / quarterly reports | Yes | Yes | Cron emails CSV + Excel of the cadence window to `SURVEY_COMPLETION_NOTIFY_TO`. Not Partner-facing SRS packs. |

---

## 12. Audit and notifications (FR-051–FR-054)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| FR-051 | Audit: sent, opened, completed, reminder, emails, **tasks**, **resolution**, **training** | Partial | Yes | Invite events cover sent / opened / started / completed / reminder / thank-you / failed / notes. No task/resolution/training audit. |
| FR-052 | Immutable audit history | No | Yes | Events can be written; not an immutable audit store. |
| FR-053 | Emails: survey, reminder, **appreciation**, **resolution**, **escalation**, **training** | Partial | Yes | Invite, reminders (days 3/6/9/12), thank-you, internal completion. Missing appreciation / resolution / escalation / training. |
| FR-054 | Store notification delivery history | Partial | Yes | Invite activity events, not a dedicated notification-history entity. |

---

## 13. Database entities (SRS §17)

| Entity | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- |
| Users | Partial | Yes | CX credentials (`cx` / `admin`). |
| Roles | No | Yes | No SRS role model. |
| Clients | Partial | Yes | Name / company / designation / email. Not opportunity- or project-linked. |
| Projects | No | Yes | Invite metadata `projectId` is a string, not a Project entity. |
| Opportunities | No | Yes | |
| Surveys | Partial | Yes | Invites + responses; no SRS survey lifecycle entity (Draft → Archived). |
| Survey Questions | No | Yes | Hardcoded CSAT/CES/NPS constants, not the weighted question bank. |
| Survey Responses | Partial | Yes | Stored; different metrics and schema. |
| Survey Scores | No | Yes | No weighted overall / category score row. |
| Notifications | No | Yes | |
| Resolution Tasks | No | Yes | |
| Resolution Updates | No | Yes | |
| Training Tasks | No | Yes | |
| Training Courses | No | Yes | |
| Escalations | No | Yes | |
| Audit Logs | No | Yes | |

Nexuses tables **outside** the SRS list (do not tick SRS rows): `ResponseInsight`, `ResponseEmbedding`, `CsatSnapshot`, `ThemeRollup`, `SurveyInvite`, `SurveyInviteEvent`, `SurveyRateLimit`.

---

## 14. State machines (SRS §18)

| Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- |
| Survey: Draft → Sent → Opened → Completed → Archived | Partial | Yes | Invite statuses cover sent / opened / started / completed / reminder. No Draft or Archived. |
| Resolution task: Open → In Progress → Awaiting Client Confirmation → Resolved → Escalated → Closed | No | Yes | |
| Training task: Created → Assigned → In Progress → Submitted → Approved → Closed | No | Yes | |

---

## 15. Non-functional (NFR-001–NFR-007)

| ID | Feature | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- | --- |
| NFR-001 | Role-based access control (SRS roles) | Partial | Yes | Session gate for `cx` / `admin` only. |
| NFR-002 | SSO **or** secure login | Yes | Yes | Credentials login satisfies the OR clause. SSO is optional and not implemented. |
| NFR-003 | 99.5% uptime target | No | Yes | Hosting-dependent; not a product SLA in the app. |
| NFR-004 | All critical actions logged | No | Yes | No SRS-wide audit log. |
| NFR-005 | Multiple service lines and future offices | Partial | Yes | Department/partner lists. No multi-office product model. |
| NFR-006 | Dashboard loads under 3 seconds | Partial | Yes | Not formally validated against this NFR. |
| NFR-007 | Retry failed email delivery | Partial | Yes | Bounded SendGrid retries (up to 3 attempts on 429/5xx/network). Failed invite sends can log `failed` on the timeline. Not a durable mail queue. |

---

## 16. Acceptance criteria (SRS §20)

These are “platform complete when…” tests against the **SRS** product, not against Nexuses VOC extras.

| Criterion | Nexuses VOC | RSM (SRS) | Nexuses note |
| --- | --- | --- | --- |
| Survey automation works (budget / opportunity triggers) | No | Yes | Manual and API invites exist. |
| Scoring engine matches weightage | No | Yes | |
| Positive workflows trigger correctly | No | Yes | |
| Neutral workflows trigger correctly | No | Yes | |
| Negative workflows trigger correctly | No | Yes | |
| Single negative question workflow works | No | Yes | |
| Resolution SLA tracking works | No | Yes | |
| Client verification works | No | Yes | |
| Escalation workflows work | No | Yes | |
| Training workflows work | No | Yes | |
| Dashboards display correct (SRS) metrics | Partial | Yes | VOC metrics yes; issue/training metrics no. |
| Audit logs are retained | No | Yes | |

---

## 17. Nexuses-only extras (not in the SRS)

These do **not** close SRS rows. RSM SRS is **No** because the specification does not require them.

| Feature | Nexuses VOC | RSM (SRS) | Note |
| --- | --- | --- | --- |
| Voice survey (ElevenLabs), English/Arabic UI | Yes | No | |
| Typed CSAT, CES, and NPS (approved VOC questions) | Yes | No | Replaces, rather than implements, FR-009–FR-016. |
| OpenAI insights, embeddings, RAG CX assistant | Yes | No | |
| PII-free public metrics API and embeddable widget | Yes | No | |
| Public `/reports` experience page | Yes | No | |
| Department / partner filters on CX reports | Yes | No | |
| Server-to-server survey invite API | Yes | No | |
| Self-host (Docker Postgres + host Next.js) and Vercel paths | Yes | No | |

---

## 18. Ceiling on this VOC product

Wave 2 shipped the remaining VOC-native ops (Excel, scheduled CX reports, bounded mail retry) and labeled the rest **not feasible**. Remaining Partials (reminders cap, invite analog vs opportunity trigger, CX grouping vs client portal, invite events vs legal audit) stay Partial unless product choices change. They will not become SRS Yes without replacing this product.

---

*Checklist only. Sources: `RSM_Client_Survey_SRS_v1.md`, `PROJECT_BRIEF.md`, `MEMORY.md` current state (including wave 2 Excel, scheduled reports, bounded SendGrid retry).*
