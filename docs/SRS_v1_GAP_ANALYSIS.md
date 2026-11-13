# SRS v1 vs Current Application — Gap Comparison

**Source:** `RSM_Client_Survey_SRS_v1.md` (SRS v1.0)  
**Compared against:** Current RSM Voice of Clients platform (as of 2026-08-10)  
**Scope:** Differences, gaps, and unmet requirements only. No implementation guidance.

Side-by-side Yes / Partial / No ticks: [`NEXUSES_VS_RSM_SRS_CHECKLIST.md`](NEXUSES_VS_RSM_SRS_CHECKLIST.md).

---

## Summary

The SRS describes a full **project-lifecycle client satisfaction, issue-resolution, and training platform** driven by opportunity/budget triggers, a **6-question weighted 1–5 score**, role-based workflows, resolution SLAs, and training escalations.

The current application is a **Voice of Clients (VOC) survey + CX analytics platform**: CSAT / CES / NPS collection (voice + typed), invite/reminder outreach, AI insights, and dashboards. It does **not** implement the SRS’s opportunity engine, weighted scoring, score-category workflows, resolution module, training module, multi-role RBAC, audit log entity, or export/scheduling suite.

Many SRS acceptance criteria remain unmet because those modules do not exist.

---

## 1. Goals (SRS §1.2)

| SRS goal | Gap vs current app |
| --- | --- |
| Measure satisfaction throughout project lifecycle | Current surveys are invite- or walk-in-driven, not tied to project stage or budget milestones. |
| Identify service issues early | No per-question / project-lifecycle issue detection as specified; only VOC metrics + AI themes/risk on dashboard. |
| Automate issue resolution | No resolution task automation. |
| Improve client experience | Partial overlap via survey + thank-you; no resolution/verification loop. |
| Track team performance | No team-performance dashboards or role-scoped team views. |
| Generate training actions from recurring low scores | No training module or consecutive-low-score triggers. |

---

## 2. User Roles & Permissions (SRS §2)

| SRS role | Current status |
| --- | --- |
| System Admin | Not modeled as SRS role; only `admin` / `cx` credentials users with no feature split. |
| Office Managing Partner (OMP) | Not implemented. |
| Engagement Partner | Not implemented. |
| Team Leader | Not implemented. |
| Engagement Team | Not implemented. |
| Dedicated Follow-up Personnel | Not implemented (CX users can send invites / manual follow-ups; not this role). |
| Client | Clients complete public surveys; no authenticated client portal for resolution verification. |

**Gap:** SRS multi-role RBAC and permission matrix are not achieved. NFR-001 (RBAC) is only partially covered by a single CX login gate.

---

## 3. Functional Requirements — Contact, Eligibility, Budget, Triggers

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-001 | Client contact capture when opportunity is won (name + email required; block survey workflow otherwise) | No Opportunities entity or win-stage contact gate. Invites can be sent manually/API with email, but not as opportunity-won capture. |
| FR-002 | Configurable survey eligibility engine | Not implemented. |
| FR-003 | Continuous project budget consumption monitoring | Not implemented. No Projects/budget integration. |
| FR-004 | First survey at budget ≥ 50% | Not implemented. |
| FR-005 | Second survey at budget ≥ 100% or final billing | Not implemented. |
| FR-006 | Email survey link to client | **Partially met** — branded invite emails with tracked links exist. Not tied to budget/opportunity triggers. |
| FR-007 | Reminder every 3 days for unanswered surveys | **Partially met** — automatic reminders every 3 days, max 4 (days 3, 6, 9, 12), then stop. |
| FR-008 | Record manual follow-up activities | **Partially met** — invite tracker notes + activity timeline, plus manual reminder send. |

---

## 4. Survey Module (SRS §4)

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-009 | Six weighted questions (Quality 20%, Adding Value 5%, Communicator 25%, Competent 10%, Recommend 20%, Position vs alternatives 20%) | **Not met.** Current approved questions are CSAT (1–5), CES (1–7), NPS (0–10) — different instruments, weights, and wording. |
| FR-010 | Uniform 1–5 rating scale for all questions | **Not met.** Mixed scales (1–5 / 1–7 / 0–10). |
| FR-011 | Optional written comments | **Met** for current metrics (optional per-metric comments). |
| FR-012 | Anonymous responses not supported unless explicitly enabled | Responses are identity-bearing (name, company, designation). No SRS-style anonymous toggle/mode. |

**Structural gap:** Survey content and scoring model in production do not match the SRS survey contract.

---

## 5. Scoring Engine (SRS §5)

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-013 | Weighted score = question score × weight | Not implemented. |
| FR-014 | Overall score = sum of weighted scores | Not implemented. |
| FR-015 | Historical average across surveys | Not as SRS overall weighted average; current averages are per CSAT/CES/NPS. |
| FR-016 | Category bands (Positive+, Positive, Neutral, Negative, Negative+) | Not implemented. No SRS score-band classification. |

---

## 6. Positive / Neutral / Negative Workflows (SRS §6–8)

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-017–FR-019 | Positive trigger (≥ 4.00); appreciation email to Partner / Team Leader / Engagement Team; random pick from 5 templates | Not implemented as SRS bands. Internal notify is flagged when current CSAT/CES/NPS scores need attention. |
| FR-020 | Client thank-you on positive | **Partially met** — thank-you sent for tracked invite completions (not score-band–specific). |
| FR-021–FR-022 | Neutral (3.00–3.99); notify Partner + Team Leader | Not implemented. |
| FR-023 | Neutral client acknowledgement email | Not implemented as score-specific template. |
| FR-024–FR-025 | Negative (&lt; 3.00); notify Partner + Team Leader | Not implemented. |
| FR-026 | Client apology / acknowledgement email | Not implemented as score-specific template. |
| FR-027 | Auto-create Issue Resolution Task | Not implemented. |

**Note:** Current app sends a generic client thank-you (invite-linked) and an internal completion notice to a configured mailbox — not SRS role-targeted, score-banded workflows.

---

## 7. Single Negative Question Rule (SRS §9)

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-028 | Detect any question &lt; 3 even if overall still Positive+/Positive/Neutral | Not implemented (no 6-question model / no this rule). |
| FR-029 | Notify Partner + Team Leader; create resolution task | Not implemented. |

---

## 8. Resolution Management (SRS §10)

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-030 | Assign resolution task to Engagement Partner | Not implemented. |
| FR-031 | Partner records root cause, actions, resolution summary | Not implemented. |
| FR-032 | 24-hour resolution SLA | Not implemented. |
| FR-033 | Partner marks issue resolved | Not implemented. |
| FR-034 | Auto client verification email | Not implemented. |
| FR-035 | Client rejection → notify Partner, Team Leader, copy OMP | Not implemented. |
| FR-036 | Escalated status | Not implemented. |

**Entire resolution module is absent.**

---

## 9. Training Module & Recommendation Engine (SRS §11–12)

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-037 | Consecutive low score: same question ≤ 3 across 5 surveys | Not implemented. |
| FR-038 | Training task assigned to Engagement Team | Not implemented. |
| FR-039 | 15-calendar-day due date | Not implemented. |
| FR-040 | Lessons Learned attachment to OMP | Not implemented. |
| FR-041 | Repeat failure → escalation meeting request (OMP, Partner, Team Leader, Team) | Not implemented. |
| FR-042 | Map low scores to named training courses | Not implemented. |
| FR-043 | Show recommendations in task details | Not implemented. |

**Entire training module is absent.**

---

## 10. Dashboard Requirements (SRS §13)

| ID | Requirement | Current gap |
| --- | --- | --- |
| FR-044 | Executive dashboard: response rate, average score, trends, open issues, escalated issues | **Partial:** response rate, CSAT/CES/NPS averages, trends exist. Open/escalated issues do not. |
| FR-045 | Client dashboard: history, previous surveys, average scores | **Partial (CX only):** `/dashboard/responses` groups by email or name+company. No client-facing portal. |
| FR-046 | Team dashboard: team performance, positive/negative surveys | Not implemented. |
| FR-047 | Resolution dashboard: open/closed tasks, SLA breaches | Not implemented. |
| FR-048 | Training dashboard: pending/completed training, repeat offenders | Not implemented. |

**Extra in current app (not in SRS):** voice survey UI, public PII-free metrics/widgets/reports page, RAG CX assistant, department/partner filters on VOC metrics.

---

## 11. Reporting (SRS §14)

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-049 | Export PDF, Excel, CSV | **Partial:** CSV export of filtered CX responses. No Excel. Overview already has PDF. No scheduled reports. |
| FR-050 | Scheduled weekly / monthly / quarterly reports | Not implemented. |

---

## 12. Audit & Notifications (SRS §15–16)

| ID | Requirement | Gap |
| --- | --- | --- |
| FR-051 | Audit log: survey sent/opened/completed, reminders, emails, tasks, resolution, training | **Partial** invite tracking (sent/open/start/complete, follow-ups). No immutable audit entity covering tasks/resolution/training/emails as specified. |
| FR-052 | Immutable audit history | Not implemented. |
| FR-053 | Email types: survey, reminder, appreciation, resolution, escalation, training | **Partial:** invite, day-3/5 reminders, thank-you, internal completion. Missing appreciation / resolution / escalation / training emails. |
| FR-054 | Store notification delivery history | **Partial:** invite activity events for invite, reminder, thank-you, and failed sends; still no dedicated notification-history table. |

---

## 13. Database Entities (SRS §17)

| SRS entity | Current status |
| --- | --- |
| Users | Present (CX credentials); not multi-role as SRS. |
| Roles | Not present as SRS role model. |
| Clients | Present (name/company/designation); not opportunity/project-linked as SRS. |
| Projects | Missing. |
| Opportunities | Missing. |
| Surveys | Conceptual via invites/responses; not SRS survey lifecycle entity. |
| Survey Questions | Hardcoded CSAT/CES/NPS constants; not SRS weighted question bank. |
| Survey Responses | Present (different schema/metrics). |
| Survey Scores | No weighted overall / category score entity. |
| Notifications | Missing as entity. |
| Resolution Tasks / Updates | Missing. |
| Training Tasks / Courses | Missing. |
| Escalations | Missing. |
| Audit Logs | Missing. |

**Present but outside SRS:** `ResponseInsight`, `ResponseEmbedding`, `CsatSnapshot`, `ThemeRollup`, `SurveyInvite`, `SurveyRateLimit`.

---

## 14. State Machines (SRS §18)

| Machine | Gap |
| --- | --- |
| Survey: Draft → Sent → Opened → Completed → Archived | Invite statuses cover outreach partially; no Draft/Archived SRS survey state machine. |
| Resolution Task states | Entire machine missing. |
| Training Task states | Entire machine missing. |

---

## 15. Non-Functional Requirements (SRS §19)

| ID | Requirement | Gap |
| --- | --- | --- |
| NFR-001 | Role-based access control | Not met per SRS roles; only CX session gate (`cx` / `admin`). |
| NFR-002 | SSO or secure login | Credentials login only; SSO not implemented. |
| NFR-003 | 99.5% uptime target | Not evidenced/enforced as a platform SLA in product; hosting-dependent. |
| NFR-004 | All critical actions logged | Not met (no SRS audit log). |
| NFR-005 | Scalability across service lines / future offices | Partial operational readiness only; no multi-office / service-line product model as specified. |
| NFR-006 | Dashboard &lt; 3 seconds | Not formally validated against this NFR in memory/brief. |
| NFR-007 | Retry failed email delivery | Not documented as a robust retry queue; SMTP send without SRS-style delivery retry system. |

---

## 16. Acceptance Criteria (SRS §20) — Status

| Acceptance criterion | Status |
| --- | --- |
| Survey automation works | **Not met** as SRS defines it (budget/opportunity triggers). Manual/API invites exist. |
| Scoring engine matches weightage | **Not met.** |
| Positive workflows trigger correctly | **Not met.** |
| Neutral workflows trigger correctly | **Not met.** |
| Negative workflows trigger correctly | **Not met.** |
| Single negative question workflow works | **Not met.** |
| Resolution SLA tracking works | **Not met.** |
| Client verification works | **Not met.** |
| Escalation workflows work | **Not met.** |
| Training workflows work | **Not met.** |
| Dashboards display correct metrics | **Partial** for VOC metrics; **not met** for SRS issue/training metrics. |
| Audit logs are retained | **Not met.** |

---

## 17. What the Current App Has That the SRS Does Not Require

These are **scope differences** (extra / alternate product direction), not SRS fulfillment:

- Voice survey via ElevenLabs (English/Arabic UI; voice path)
- Typed survey with CSAT, CES, NPS (different from SRS 6×1–5)
- OpenAI insights, embeddings, RAG assistant
- Public PII-free metrics API, embeddable widgets, public `/reports` page
- Department/partner filters on CX reports
- Integration API for survey invites
- Self-host / Vercel deployment paths documented for this VOC stack

---

## 18. Quick Gap Tally (by SRS FR / NFR)

| Area | Rough status |
| --- | --- |
| FR-001–FR-005 (opportunity / budget / triggers) | Not achieved |
| FR-006–FR-008 (invite / reminder / follow-up) | Partially achieved |
| FR-009–FR-010, FR-013–FR-016 (SRS questions + scoring) | Not achieved |
| FR-011 (comments) | Achieved (for current survey model) |
| FR-012 (anonymous policy) | Different model; SRS toggle not present |
| FR-017–FR-036 (score workflows + resolution) | Not achieved (thank-you / internal notify only partial) |
| FR-037–FR-043 (training) | Not achieved |
| FR-044–FR-048 (SRS dashboards) | Mostly not achieved; executive metrics partial |
| FR-049–FR-050 (exports / schedules) | Not achieved |
| FR-051–FR-054 (audit / notification history) | Mostly not achieved; invite tracking partial |
| Roles §2 + NFR-001/002 | Not achieved as specified |
| Acceptance §20 | Largely not achieved |

---

*Generated for comparison only against `RSM_Client_Survey_SRS_v1.md` and the current platform brief/memory. Does not prescribe remediation.*
