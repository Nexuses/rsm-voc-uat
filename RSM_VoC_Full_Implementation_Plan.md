# RSM Voice of Clients (VoC) — Full Feature & Implementation Plan

**Document type:** Product + Technical Implementation Blueprint  
**Source:** RSM VoC vendor comparison workbook (24 Sep 2026) and its 11 analysis tabs  
**Target:** RSM Kuwait VoC platform  
**Status:** Proposed implementation roadmap  
**Primary use:** Engineering planning, Cursor Plan Mode, client/product planning

---

## 1. Product Goal

Build RSM VoC into a full professional-services Customer Experience / Voice of Clients platform that can:

1. Collect structured and conversational feedback.
2. Trigger surveys automatically from engagement milestones and business events.
3. Calculate configurable CSAT, CES, NPS and RSM-specific weighted scores.
4. Detect sentiment, themes, risks and actionable issues.
5. Automatically create tasks and escalation workflows.
6. Track every issue through resolution and client confirmation.
7. Track client/account health across multiple engagements and stakeholders.
8. Connect feedback to CRM, ERP/practice-management and revenue data.
9. Provide AI-generated summaries, response drafts and recommendations.
10. Support Arabic/English and GCC-specific channels such as WhatsApp.
11. Prevent survey fatigue and protect sensitive client situations.
12. Provide management dashboards, benchmarking and audit-ready reporting.
13. Create a reusable product foundation rather than a one-off survey application.

---

# 2. Feature Scope

## P0 — Core platform capabilities

### 2.1 Survey Builder

- Drag/drop or structured survey builder.
- Question types:
  - 1–5 / 1–7 rating.
  - NPS 0–10.
  - CSAT.
  - CES.
  - Single select.
  - Multi-select.
  - Text/open-ended.
  - Yes/no.
  - Matrix/grid.
  - Conditional questions.
  - File attachment where appropriate.
- Question-level weights.
- Section weights.
- Required/optional questions.
- Question branching.
- Display logic.
- Custom score bands.
- Survey templates.
- Professional-services templates for Audit, Tax, Advisory and Consulting.
- English and Arabic versions.
- Versioning of surveys.
- Preview mode.
- Test-send mode.
- Draft/published/archived states.

### 2.2 Survey Distribution

Channels:

- Email.
- Web link.
- QR code.
- SMS through provider integration.
- WhatsApp Business through approved provider.
- Embedded widget.
- Voice/AI conversation.

Capabilities:

- Branded sender.
- SPF/DKIM/DMARC-compatible sending architecture.
- Partner/relationship-manager sender identity.
- Scheduled sends.
- Event-triggered sends.
- Manual sends.
- Batch sends.
- Expiry dates.
- Response limits.
- Unique secure response tokens.
- Anonymous vs identified response mode.

### 2.3 Engagement/Milestone Trigger Engine

Create a generic event-trigger system rather than hard-coding RSM-specific triggers.

Supported triggers should include:

- Engagement created.
- Engagement started.
- Engagement reaches X% budget consumption.
- Milestone completed.
- Deliverable completed.
- Billing event.
- Invoice issued.
- Invoice paid.
- Engagement completed.
- Engagement closed.
- CRM status changed.
- Client/account status changed.
- Manual event/API webhook.
- Scheduled relationship survey.

Each trigger should support:

- Conditions.
- AND/OR rules.
- Delay.
- Time windows.
- Suppression rules.
- Frequency limits.
- Approval requirements.
- Audience selection.
- Survey selection.

---

# 3. Survey Fatigue & Governance

## P0/P1

Create a centralized contact-level communication policy.

Features:

- Maximum surveys per contact in configurable period.
- Maximum surveys per account.
- Minimum interval between surveys.
- Priority rules when multiple engagements trigger surveys.
- Suppress duplicate campaigns.
- Suppress recently contacted clients.
- Suppress during sensitive engagement states.
- Partner approval before sending.
- Hold/release survey.
- Override with audited reason.

Example:

```text
Contact received survey 5 days ago
        ↓
New engagement trigger fires
        ↓
Frequency policy checks contact/account history
        ↓
If blocked → queue for later
If allowed → send
If approval required → send to partner approval queue
```

---

# 4. Scoring & Metrics Engine

## P0

Implement a reusable scoring engine.

### Standard metrics

- NPS.
- CSAT.
- CES.
- Response rate.
- Completion rate.
- Average rating.
- Question-level score.

### RSM weighted score

Support:

```text
Question Score × Question Weight
Section Score × Section Weight
Overall Weighted Score
```

Weights must be configurable and validated to total 100%.

### Score bands

Configurable examples:

- Positive+.
- Positive.
- Neutral.
- Negative.
- Negative+.

Do not hard-code the original workbook's bands. Store them as configuration.

### Trend analysis

- Engagement trend.
- Client/account trend.
- Partner trend.
- Service-line trend.
- Office/country trend.
- Period-over-period comparison.
- Survey-wave comparison.
.

---

# 5. Account-Level & Multi-Stakeholder Health

## P0/P1 — Major product expansion

Move from survey-level reporting to account-level intelligence.

### Account hierarchy

```text
Client Account
 ├── Contacts
 │    ├── CFO
 │    ├── Audit Committee
 │    └── Finance Director
 ├── Engagements
 │    ├── Audit
 │    ├── Tax
 │    └── Advisory
 ├── Surveys
 ├── Issues
 ├── Revenue
 └── Health history
```

### Capabilities

- Roll multiple contacts into account score.
- Roll multiple engagements into account score.
- Role-weighted responses.
- Relationship score.
- Engagement score.
- Account health score.
- Service-line health.
- Stakeholder sentiment.
- Detractor identification.
- Promoter identification.
- Health history.

### Health states

Configurable example:

- Thriving.
- Stable.
- Watch.
- At Risk.
- Critical.

Health should be calculated from configurable signals rather than hard-coded thresholds.

---

# 6. Revenue & Client Risk Intelligence

## P1

Link feedback to commercial data where permitted.

Features:

- Engagement fee.
- Account annual revenue.
- Revenue-at-risk.
- Negative feedback × revenue weighting.
- High-value detractor flag.
- Cross-service opportunity.
- Renewal risk.
- Relationship deterioration.

Example:

```text
Account revenue: $2.5M
Current health: At Risk
Latest NPS: -20
Two consecutive negative engagement surveys
Open unresolved issue: 1

→ High Revenue-at-Risk alert
→ Partner escalation
```

Do not expose revenue data to users who are not authorized to see it.

---

# 7. Closed-Loop Case Management

## P0

Every actionable negative response can become a case.

### Case lifecycle

```text
New
 ↓
Assigned
 ↓
Acknowledged
 ↓
In Progress
 ↓
Resolution Proposed
 ↓
Client Confirmation Requested
 ↓
Resolved
 ↓
Closed
```

Alternative paths:

```text
Rejected by client
      ↓
Escalated
      ↓
Partner / OMP
      ↓
New resolution
```

### Case capabilities

- Auto-create from rules.
- Manual case creation.
- Assignment.
- SLA.
- Due date.
- Priority.
- Severity.
- Owner.
- Escalation.
- Internal comments.
- Client communication.
- Attachments.
- Activity timeline.
- Resolution notes.
- Client confirmation.
- Reopen.
- Full audit trail.

---

# 8. Automated Communication Engine

## P0

Create reusable templates and rules for:

- Survey invitation.
- Reminder.
- Positive feedback acknowledgement.
- Negative feedback acknowledgement.
- Internal alert.
- Task notification.
- Escalation notification.
- Case update.
- Resolution confirmation.
- Promoter thank-you.
- Referral request.
- Testimonial request.
- Cross-sell follow-up.

Use template variables:

```text
{{client_name}}
{{contact_name}}
{{engagement_name}}
{{partner_name}}
{{survey_link}}
{{score}}
{{case_id}}
{{due_date}}
```

Support:

- English.
- Arabic.
- RTL rendering.
- Versioned templates.
- Approval workflow.
- Preview/test send.

---

# 9. AI Layer

## P0/P1

### Response analysis

For each text/voice response:

- Sentiment.
- Emotion where appropriate.
- Topics.
- Themes.
- Complaint detection.
- Praise detection.
- Risk indicators.
- Service mentions.
- Competitor mentions.
- Urgency.
- Suggested action.

### AI summarization

Generate:

- Survey summary.
- Engagement summary.
- Account summary.
- Weekly management summary.
- Partner briefing.
- Executive summary.
.

### AI response drafting

Generate drafts for:

- Thank-you.
- Acknowledgement.
- Apology/concern response.
- Resolution update.
- Follow-up.

All external AI-generated communication must remain **draft-first** unless an explicit automation rule allows sending.

### Ask Your Data

Natural-language analytics such as:

> "Show me all Audit clients with declining NPS over the last 6 months."

> "Which accounts have negative feedback and more than $500k annual revenue?"

The AI must use authorized structured data/tools and must enforce tenant/user permissions.

---

# 10. Voice of Clients / Voice AI

## P0

Support conversational surveys through the existing voice AI provider.

Features:

- Voice survey session.
- Question flow.
- Dynamic follow-up questions.
- Response transcription.
- Sentiment extraction.
- Structured answer extraction.
- Session recording policy.
- Consent handling.
- Language selection.
- Arabic/English support.
- Webhook processing.
- Failed session recovery.

Store:

- Session metadata.
- Transcript.
- Structured answers.
- Sentiment.
- AI analysis.
- Consent status.
- Provider identifiers.

Do not store raw audio unless required and explicitly permitted by policy.

---

# 11. Promoter Activation & Growth

## P1

For strong positive feedback:

- Thank the client.
- Request referral.
- Request testimonial.
- Request case-study participation.
- Identify cross-sell opportunity.
- Create BD task.
- Record outcome.

For negative feedback:

- Recovery workflow.
- Partner notification.
- Resolution case.
- Follow-up survey.

---

# 12. Training & Continuous Improvement

## P1

RSM's strongest differentiated workflow should become a generic rules engine.

Example:

```text
Employee receives <= 3 score
        ↓
5 consecutive qualifying surveys
        ↓
Training rule fires
        ↓
Determine employee level
        ↓
Map level → training course
        ↓
Create training task
        ↓
Track completion
        ↓
Re-measure feedback
        ↓
If repeated failure → escalation / meeting task
```

Support integrations with LMS providers later.

Data model should allow:

- Employee level.
- Training rule.
- Course.
- Assignment.
- Completion.
- Failure count.
- Escalation rule.

---

# 13. Dashboards

## P0

### Executive dashboard

- Overall VoC score.
- NPS.
- CSAT.
- CES.
- Response rate.
- Account health.
- At-risk revenue.
- Open critical cases.
- Trend.
- Service-line comparison.

### Partner dashboard

- My clients.
- My engagements.
- Latest feedback.
- Detractors.
- Promoters.
- Open cases.
- SLA breaches.
- Client health.
- Recommended actions.

### CX team dashboard

- Survey performance.
- Response rates.
- Trigger performance.
- Case backlog.
- Resolution SLA.
- Escalations.
- Sentiment trends.
- AI themes.

### Account dashboard

- Account profile.
- Stakeholders.
- Engagements.
- Relationship score.
- Engagement scores.
- NPS/CSAT/CES.
- Health timeline.
- Open/closed cases.
- Revenue exposure if authorized.
- AI account summary.

### Survey analytics

- Question analysis.
- Distribution.
- Trends.
- Text themes.
- Sentiment.
- Response rate.
- Channel performance.

---

# 14. Benchmarking

## P1/P2

Support benchmark datasets without mixing external data into internal scores.

- Internal benchmark.
- Office benchmark.
- Service-line benchmark.
- Country benchmark.
- Industry benchmark.
- Professional-services benchmark.
.

Clearly distinguish:

```text
RSM internal benchmark
vs
External market benchmark
```

External benchmark source, date and population must be stored.

---

# 15. GCC / Arabic / Localization

## P1

- Arabic UI.
- Arabic RTL survey.
- Arabic email templates.
- Arabic consent text.
- English/Arabic dual-language surveys.
- Arabic text analytics.
- GCC timezone handling.
- GCC date/number formatting.
- WhatsApp Business integration.
- Local regulatory configuration.

Do not assume that Kuwait data residency is legally mandatory for every use case. The deployment architecture should support configurable residency requirements and be validated with RSM/legal/IT.

---

# 16. Integrations

## P0

### Existing/known integrations

- PostgreSQL + pgvector.
- OpenAI.
- ElevenLabs.
- SendGrid.
- CRM integration.
- Email/webhooks.

### P1

- Microsoft Dynamics / relevant CRM.
- Practice-management/ERP.
- LMS.
- WhatsApp provider.
- SMS provider.
- Calendar.
- Slack/Teams notifications.
.

### Integration architecture

Use a connector abstraction:

```text
IntegrationProvider
 ├── CRMProvider
 ├── EmailProvider
 ├── VoiceProvider
 ├── MessagingProvider
 ├── LMSProvider
 └── AnalyticsProvider
```

Do not couple business logic directly to one vendor SDK.

---

# 17. API Platform

## P0

Recommended REST API domains:

```text
/api/auth
/api/users
/api/roles
/api/accounts
/api/contacts
/api/engagements
/api/surveys
/api/survey-templates
/api/survey-responses
/api/survey-invites
/api/triggers
/api/rules
/api/cases
/api/tasks
/api/escalations
/api/metrics
/api/nps
/api/csat
/api/ces
/api/health
/api/ai
/api/voice
/api/notifications
/api/integrations
/api/webhooks
/api/reports
/api/audit
```

External integration endpoint pattern:

```http
POST /api/integrations/survey-invites
Authorization: Bearer <server-side-api-key>
```

API keys must be:

- Server-side.
- Hashed where possible.
- Rotatable.
- Scoped.
- Revocable.
- Audited.
.

---

# 18. Suggested Data Model

Core entities:

```text
User
Role
Permission
Organization
Office
Account
Contact
ContactRole
Employee
Engagement
ServiceLine
Survey
SurveyVersion
SurveyQuestion
SurveyOption
SurveyResponse
ResponseAnswer
SurveyInvitation
SurveyEvent
Trigger
TriggerCondition
AutomationRule
ScoreDefinition
ScoreResult
SentimentResult
Theme
AIInsight
Case
CaseActivity
Task
Escalation
SLA
Notification
MessageTemplate
MessageDelivery
TrainingRule
TrainingCourse
TrainingAssignment
HealthSnapshot
RevenueSnapshot
Benchmark
Integration
IntegrationCredential
WebhookEvent
AuditLog
```

### Important relationships

```text
Account
 ├── Contacts
 ├── Engagements
 ├── SurveyResponses
 ├── Cases
 ├── HealthSnapshots
 └── RevenueSnapshots

Engagement
 ├── Surveys
 ├── SurveyInvitations
 ├── Responses
 ├── Cases
 └── Tasks

SurveyResponse
 ├── Answers
 ├── ScoreResults
 ├── SentimentResult
 ├── AIInsights
 └── Cases
```

Use immutable/versioned records for survey definitions and score configurations so historical results cannot change when a survey is edited later.

---

# 19. RBAC

Suggested roles:

### Super Admin

Full configuration and administration.

### CX Admin

Survey, analytics, workflows, cases and reports.

### Partner

Own accounts/engagements, feedback, cases and approvals.

### Engagement Manager

Assigned engagements and cases.

### Employee

Assigned feedback/training tasks.

### Executive / OMP

Management-level dashboards and escalations.

### Client

Only their own survey/confirmation interactions.

Every API endpoint must enforce authorization server-side.

---

# 20. Security & Compliance

## P0

- OWASP Top 10 review.
- Input validation.
- Output encoding.
- SQL injection prevention through ORM/parameterization.
- CSRF protection where applicable.
- Secure cookies.
- Rate limiting.
- Authentication throttling.
- MFA-ready architecture.
- Password hashing.
- Secret management.
- Encryption in transit.
- Encryption at rest where applicable.
- Audit logs.
- Tenant isolation.
- RBAC.
- API key rotation.
- Webhook signature verification.
- Signed survey tokens.
- Expiring response links.
- File upload validation.
- Malware scanning for uploaded files.
- PII minimization.
- Data retention rules.
- Data deletion/anonymization workflow.
- Backup and restore procedure.
- Incident logging.

AI-specific controls:

- Never expose unauthorized client data to an LLM.
- Send minimum required context.
- Redact secrets.
- Log AI action metadata without unnecessarily storing sensitive prompts.
- Keep human approval for consequential external communication.

---

# 21. Auditability

Every important business action should create an audit record:

```text
who
what
when
entity
old value
new value
source
IP/session where appropriate
```

Examples:

- Survey published.
- Score rule changed.
- Survey sent.
- Case escalated.
- Client confirmation recorded.
- Revenue visibility granted.
- API key created/revoked.
- AI-generated message approved/sent.

---

# 22. Reporting & Exports

Support:

- CSV.
- Excel.
- PDF.
- Scheduled reports.
- Email reports.
- Executive reports.
- Account reports.
- Partner reports.
.

Reports should preserve filters and authorization.

---

# 23. Search & Filtering

Global search across authorized:

- Clients.
- Contacts.
- Engagements.
- Surveys.
- Responses.
- Cases.
- Tasks.
- Partners.
.

Filters:

- Date.
- Office.
- Service line.
- Partner.
- Engagement.
- Client.
- Score.
- NPS.
- Sentiment.
- Health.
- Case status.
- Severity.
- Revenue band.
.

---

# 24. Recommended Implementation Architecture

The exact stack should be determined from the existing repository rather than imposed blindly.

Likely architecture:

```text
Frontend
React / Next.js / TypeScript
        |
        v
API / Application Layer
        |
        +----------------+
        |                |
        v                v
PostgreSQL          Background Jobs
+ pgvector          / Queue Workers
        |                |
        +--------+-------+
                 |
        Integration Layer
         /      |       \
      CRM     AI       Voice
               |        |
            OpenAI  ElevenLabs
               |
             Email
            SendGrid
```

Use asynchronous workers for:

- AI processing.
- Email delivery.
- Voice webhook processing.
- Scheduled triggers.
- Reminder jobs.
- Health calculations.
- Benchmark calculations.
- Report generation.
.

Do not run long AI or batch tasks synchronously inside normal request handlers.

---

# 25. Event-Driven Automation

Create a normalized internal event model.

Example:

```json
{
  "eventType": "ENGAGEMENT_MILESTONE_REACHED",
  "organizationId": "...",
  "accountId": "...",
  "engagementId": "...",
  "occurredAt": "...",
  "payload": {
    "milestone": "FINAL_BILLING",
    "percentage": 100
  }
}
```

Then evaluate automation rules against events.

This makes future integrations easier.

---

# 26. Background Jobs

Required job categories:

- Trigger evaluation.
- Survey scheduling.
- Reminder dispatch.
- Survey fatigue evaluation.
- Email delivery.
- Voice processing.
- AI response analysis.
- AI summary generation.
- Health recalculation.
- SLA monitoring.
- Escalation processing.
- Training-rule processing.
- Report generation.
- Data retention.
- Benchmark refresh.
.

Every job should support:

- Idempotency.
- Retry.
- Dead-letter handling.
- Structured logs.
- Correlation ID.
- Failure alerting.
.

---

# 27. Observability

Track:

- API latency.
- Error rate.
- Queue depth.
- Failed jobs.
- Email delivery.
- Webhook failures.
- AI latency/cost.
- Voice provider failures.
- Survey response rate.
- Trigger execution rate.
- Case SLA breaches.
.

Use the organization's approved monitoring platform where available.

---

# 28. Testing Strategy

## Unit tests

- Scoring engine.
- NPS/CSAT/CES.
- Weighted scoring.
- Trigger evaluation.
- Fatigue rules.
- Health calculation.
- SLA calculation.
- Permission checks.
.

## Integration tests

- CRM webhook.
- SendGrid.
- ElevenLabs.
- OpenAI.
- Database.
- Background jobs.
.

## E2E tests

### Scenario A — Positive survey

```text
Send survey
→ client responds
→ score calculated
→ positive email generated
→ dashboard updated
```

### Scenario B — Negative survey

```text
Client submits negative feedback
→ sentiment analyzed
→ case created
→ partner assigned
→ SLA starts
→ resolution submitted
→ client confirms
→ case closes
```

### Scenario C — Repeated low score

```text
Employee receives qualifying low scores
→ training rule triggered
→ course assigned
→ completion tracked
→ subsequent feedback evaluated
```

### Scenario D — Survey fatigue

```text
Two engagements trigger surveys
→ contact policy blocks second send
→ survey queued
→ later release
```

### Scenario E — Account risk

```text
Multiple engagements decline
→ account health recalculated
→ revenue-at-risk calculated
→ partner alert
```

---

# 29. Phased Implementation Roadmap

## Phase 0 — Discovery & Architecture

**Goal:** Understand existing implementation before coding.

Deliverables:

- Existing architecture map.
- Existing routes/API inventory.
- Existing DB schema.
- Existing integrations.
- Existing auth/RBAC.
- Existing survey flow.
- Existing dashboard flow.
- Existing voice flow.
- Technical debt list.
- Reuse vs rebuild matrix.
.

**No feature implementation should begin until this audit is complete.**

---

## Phase 1 — Platform Foundation

Build/refactor:

- Organizations.
- Users.
- RBAC.
- Accounts.
- Contacts.
- Engagements.
- Survey versioning.
- Core audit logs.
- API standards.
- Event model.
- Background jobs.
- Notification abstraction.
.

Acceptance:

- Existing functionality remains working.
- Existing users can log in.
- Existing surveys still function.
- No production regression.

---

## Phase 2 — Survey & Trigger Engine

Implement:

- Survey builder improvements.
- Question types.
- Weights.
- Branching.
- Versioning.
- Trigger engine.
- Scheduling.
- Reminder rules.
- Survey fatigue.
- Partner approval.
.

Acceptance:

- Admin can create a survey without code.
- Admin can configure a milestone trigger.
- Trigger can be tested before activation.
- Duplicate/fatigue sends are blocked.

---

## Phase 3 — Scoring & Closed Loop

Implement:

- NPS.
- CSAT.
- CES.
- Weighted score.
- Sentiment bands.
- Cases.
- Tasks.
- SLA.
- Escalation.
- Client confirmation.
.

Acceptance:

- A negative response can automatically become a tracked case.
- Case cannot be closed when client confirmation is required.
- SLA breaches create escalation events.

---

## Phase 4 — Account Health

Implement:

- Account rollups.
- Multi-stakeholder scoring.
- Relationship surveys.
- Health states.
- Health history.
- Service-line rollups.
- Revenue linkage.
- Revenue-at-risk.
.

Acceptance:

- A client with multiple engagements has one account-level health view.
- Authorized users can drill down from health → engagement → response → case.

---

## Phase 5 — AI Intelligence

Implement:

- Text sentiment.
- Themes.
- Topic extraction.
- AI summaries.
- Response drafts.
- Account summaries.
- Ask-your-data.
.

Acceptance:

- AI output is traceable to source records.
- Unauthorized records never enter an AI context.
- External messages require approval by default.

---

## Phase 6 — Voice & GCC Channels

Implement:

- Voice workflows.
- Arabic/English.
- RTL.
- WhatsApp.
- SMS.
- Provider abstraction.
.

Acceptance:

- Voice response produces structured survey data.
- Arabic survey renders correctly RTL.
- Channel-specific delivery is auditable.

---

## Phase 7 — Training & Growth

Implement:

- Training rules.
- Course assignments.
- Employee levels.
- Promoter activation.
- Referral/testimonial workflow.
- Cross-sell opportunity flags.
.

---

## Phase 8 — Benchmarking & Productization

Implement:

- Internal benchmarks.
- External benchmark framework.
- Scheduled reports.
- Product configuration.
- Tenant-aware architecture.
- Feature flags.
- Billing/readiness hooks if commercialization is planned.
.

---

# 30. Priority Matrix

| Feature | Priority | Reason |
|---|---|---|
| Survey builder/versioning | P0 | Core platform |
| Trigger engine | P0 | Major workflow capability |
| Scoring engine | P0 | Core analytics |
| NPS/CSAT/CES | P0 | Standard market metrics |
| Case management | P0 | Closed-loop workflow |
| SLA/escalation | P0 | Operational accountability |
| Survey fatigue | P0 | Enterprise governance |
| Account hierarchy | P0/P1 | Major current gap |
| Account health | P1 | Moves beyond survey reporting |
| Revenue-at-risk | P1 | Executive/commercial value |
| AI sentiment/themes | P0/P1 | Core modern VoC expectation |
| AI summaries | P1 | Productivity |
| Ask-your-data | P1 | Advanced analytics |
| Arabic/RTL | P1 | GCC readiness |
| WhatsApp | P1 | GCC distribution |
| Voice AI | P0 | Existing RSM capability |
| Training automation | P1 | Strong RSM differentiation |
| Promoter activation | P1 | Growth workflow |
| Benchmarking | P1/P2 | Market credibility |
| External awards/ratings | P2 | Marketing/validation |
| Predictive churn | P2 | Requires mature historical data |
| Full productization | P2 | Depends on architecture maturity |

---

# 31. Recommended Product Navigation

```text
Dashboard

Clients
 ├── Accounts
 ├── Contacts
 └── Account Health

Engagements
 ├── All Engagements
 ├── Milestones
 └── Engagement Health

Surveys
 ├── Survey Builder
 ├── Templates
 ├── Invitations
 ├── Responses
 └── Analytics

Cases
 ├── My Cases
 ├── All Cases
 ├── Escalations
 └── SLA Breaches

Automation
 ├── Triggers
 ├── Rules
 ├── Approvals
 └── Suppression / Fatigue

Insights
 ├── Sentiment
 ├── Themes
 ├── AI Summaries
 ├── Account Health
 └── Ask Your Data

Training
 ├── Rules
 ├── Courses
 └── Assignments

Reports
 ├── Executive
 ├── Partner
 ├── Client
 ├── Benchmarking
 └── Scheduled Reports

Integrations
 ├── CRM
 ├── ERP
 ├── Email
 ├── Voice
 ├── WhatsApp
 └── LMS

Administration
 ├── Users
 ├── Roles
 ├── Score Definitions
 ├── Templates
 ├── Audit Logs
 └── System Settings
```

---

# 32. Product Principles

1. **Configuration over hard-coding.**
2. **Generic capability over RSM-specific wording.**
3. **Every automated action must be auditable.**
4. **Historical scores must be immutable.**
5. **Authorization must be enforced server-side.**
6. **AI should assist decisions, not silently make consequential decisions.**
7. **External communication should be human-approved by default.**
8. **Every integration must be replaceable.**
9. **Long-running work belongs in background jobs.**
10. **Build account-level intelligence, not just survey-level analytics.**

---

# 33. Definition of Done for Each Feature

A feature is not complete when the UI exists.

It is complete only when:

- Database changes are implemented.
- API/service layer is implemented.
- Authorization is enforced.
- Validation exists.
- UI is implemented.
- Loading/error/empty states exist.
- Audit logging exists where relevant.
- Tests exist.
- Background processing is idempotent where relevant.
- Observability exists.
- Documentation exists.
- Existing functionality is regression-tested.
- Security implications have been reviewed.
.

---

# 34. Cursor Implementation Strategy

Cursor should **not** immediately start writing code.

First run a repository audit.

The implementation must answer:

- What already exists?
- What can be reused?
- What is incomplete?
- What is incorrectly designed for the new scope?
- Which database tables already exist?
- Which APIs already exist?
- Which integrations already exist?
- Which pages/components already exist?
- Which functionality is production-critical and must not regress?

Then produce a dependency-aware implementation plan.

Only after plan approval should implementation begin.

---

# 35. Cursor Plan Mode Master Prompt

Copy the following prompt into Cursor **Plan Mode** at the root of the existing RSM VoC repository.

```text
You are working on the existing RSM Voice of Clients (VoC) platform.

Your job in this step is NOT to immediately implement features. First inspect the entire repository and create a production-grade implementation plan for the platform expansion described below.

IMPORTANT:
- Do not assume the stack from this prompt.
- Inspect package.json files, source structure, database schema, migrations, environment configuration, API routes, server actions, background jobs, integrations, auth/RBAC, existing survey flows, voice flows, dashboards and deployment configuration.
- Reuse existing architecture where it is sound.
- Do not rewrite working production functionality unnecessarily.
- Identify technical debt before proposing large refactors.
- Never expose or print secrets from .env files. You may inspect variable names and usage, but redact values.
- Do not make changes during this Plan Mode pass.

PRODUCT OBJECTIVE

Evolve the existing RSM VoC platform into a configurable professional-services Voice of Clients / Customer Experience platform.

The platform should support:

1. Survey builder and versioning.
2. Multiple question types and configurable scoring.
3. NPS, CSAT and CES.
4. RSM weighted scoring.
5. Sentiment bands and trends.
6. Milestone/event-triggered surveys.
7. Configurable reminder logic.
8. Survey fatigue prevention.
9. Partner approval before sensitive sends.
10. Automated communication.
11. Closed-loop case management.
12. SLA and escalation workflows.
13. Client-confirmed resolution.
14. Account-level health across multiple engagements.
15. Multi-stakeholder scoring.
16. Relationship surveys.
17. Revenue-at-risk and client health.
18. AI sentiment, themes and summaries.
19. AI response drafting.
20. Ask-your-data analytics with strict authorization.
21. Voice/AI survey integration.
22. English + Arabic + RTL.
23. WhatsApp/SMS-ready channel architecture.
24. Training automation.
25. Promoter/referral/testimonial workflows.
26. Cross-sell opportunity detection.
27. Benchmarking.
28. Executive, partner, CX and account dashboards.
29. Audit logs.
30. Strong RBAC and enterprise security.
31. Background jobs and event-driven automation.
32. Integration abstraction for CRM, email, voice, messaging and LMS providers.

REFERENCE IMPLEMENTATION DOCUMENT

A detailed implementation blueprint exists in:

RSM_VoC_Full_Implementation_Plan.md

Read that document completely before creating the plan.

PHASE 1 — REPOSITORY AUDIT

Inspect:

- Frontend framework and routing.
- Backend framework.
- Database/ORM.
- Existing schema and migrations.
- Authentication.
- RBAC.
- Survey builder.
- Survey taker.
- Survey response storage.
- Dashboard pages.
- Existing scoring logic.
- Existing email integration.
- Existing SendGrid integration.
- Existing ElevenLabs integration.
- Existing OpenAI integration.
- Existing CRM integration.
- Existing webhook handlers.
- Existing cron/background jobs.
- Existing API integration endpoint for survey invites.
- Existing notification system.
- Existing audit/security mechanisms.
- Existing deployment configuration.
- Existing tests.
- Existing monitoring/logging.

Create an architecture map with actual file paths.

PHASE 2 — CURRENT VS TARGET GAP

For every major feature in the implementation document, classify it as:

A. Already implemented and reusable.
B. Partially implemented and needs extension.
C. Implemented but architecturally unsuitable.
D. Not implemented.
E. Unknown and requiring investigation.

Do not infer implementation merely from filenames. Verify the actual code.

PHASE 3 — DATA MODEL PLAN

Design the target schema around:

- Organization
- User
- Role
- Permission
- Account
- Contact
- ContactRole
- Employee
- Engagement
- ServiceLine
- Survey
- SurveyVersion
- SurveyQuestion
- SurveyResponse
- ResponseAnswer
- SurveyInvitation
- SurveyEvent
- Trigger
- TriggerCondition
- AutomationRule
- ScoreDefinition
- ScoreResult
- SentimentResult
- Theme
- AIInsight
- Case
- CaseActivity
- Task
- Escalation
- SLA
- Notification
- MessageTemplate
- MessageDelivery
- TrainingRule
- TrainingCourse
- TrainingAssignment
- HealthSnapshot
- RevenueSnapshot
- Benchmark
- Integration
- IntegrationCredential
- WebhookEvent
- AuditLog

Do NOT create duplicate tables if equivalent existing entities already exist.
Map existing models to the target model.

PHASE 4 — EVENT/WORKFLOW ARCHITECTURE

Plan a normalized event system for events such as:

- ENGAGEMENT_CREATED
- ENGAGEMENT_STARTED
- MILESTONE_REACHED
- BILLING_EVENT
- ENGAGEMENT_COMPLETED
- CRM_STATUS_CHANGED
- SURVEY_RESPONSE_SUBMITTED
- CASE_CREATED
- CASE_SLA_BREACHED
- CASE_RESOLVED
- CLIENT_CONFIRMATION_RECEIVED
- TRAINING_RULE_TRIGGERED

Design automation processing to be:

- idempotent
- retryable
- auditable
- observable
- safe against duplicate sends

PHASE 5 — API PLAN

Inventory existing APIs first.
Then propose target API/service boundaries for:

/accounts
/contacts
/engagements
/surveys
/survey-templates
/survey-responses
/survey-invites
/triggers
/rules
/cases
/tasks
/escalations
/metrics
/nps
/csat
/ces
/health
/ai
/voice
/notifications
/integrations
/webhooks
/reports
/audit

Do not create endpoints that duplicate existing routes.

PHASE 6 — UI PLAN

Map existing screens/components to the target navigation:

Dashboard
Clients
Engagements
Surveys
Cases
Automation
Insights
Training
Reports
Integrations
Administration

Identify which screens should be extended vs newly created.

For each page include:
- route
- existing component(s)
- required backend data
- permissions
- loading state
- empty state
- error state
- actions
- filters
- pagination
- audit requirements

PHASE 7 — AI ARCHITECTURE

Inspect the existing OpenAI integration.
Plan:

- sentiment analysis
- topic/theme extraction
- summarization
- response drafting
- account summaries
- Ask Your Data

The plan must explicitly prevent unauthorized data from entering AI context.
Use tool/service boundaries rather than allowing an LLM to directly query the database.

PHASE 8 — SECURITY REVIEW

Inspect the current application for:

- authentication weaknesses
- authorization gaps
- insecure API endpoints
- IDOR risks
- tenant isolation problems
- secret exposure
- unsafe webhooks
- unsafe file uploads
- rate-limit gaps
- unsafe AI data handling
- audit gaps

Include remediation work in the implementation plan.

PHASE 9 — INTEGRATION ARCHITECTURE

Inspect current integrations and propose provider abstractions for:

- CRM
- Email
- Voice
- WhatsApp
- SMS
- LMS
- AI

Do not hard-code business logic to one vendor SDK.

PHASE 10 — IMPLEMENTATION ORDER

Produce a dependency-aware sequence.
Prefer:

1. Architecture cleanup only where required.
2. Database foundations.
3. RBAC/authorization.
4. Event system.
5. Background jobs.
6. Survey/scoring foundations.
7. Trigger engine.
8. Case management.
9. Account health.
10. AI.
11. Channels/localization.
12. Training/growth.
13. Benchmarking.
14. Productization.

For every phase specify:

- goal
- exact files/modules likely to change
- database changes
- API changes
- frontend changes
- background jobs
- integrations
- tests
- migration risks
- rollback strategy
- acceptance criteria

PHASE 11 — TEST STRATEGY

Create a test matrix covering:

- scoring
- NPS/CSAT/CES
- survey versioning
- triggers
- survey fatigue
- cases
- SLA
- escalation
- account health
- AI permissions
- webhooks
- email delivery
- voice processing
- Arabic/RTL
- RBAC
- audit logs
- regression tests

PHASE 12 — FINAL PLAN

Return a detailed implementation plan with:

A. Current architecture
B. Existing capabilities
C. Gaps
D. Proposed architecture
E. Target database model
F. API plan
G. UI plan
H. Event/automation plan
I. AI plan
J. Security plan
K. Integration plan
L. Testing plan
M. Migration strategy
N. Deployment strategy
O. Phased implementation backlog
P. Risks and mitigations
Q. Acceptance criteria

Use real repository paths and real existing module names wherever possible.

Do not implement anything yet.

At the end, identify the smallest safe first implementation slice that can be built and tested without disrupting the current production VoC workflow.
```

---

# 36. First Implementation Slice Recommended

After Cursor completes the audit, the safest initial coding slice should normally be:

```text
Survey Response
    ↓
Scoring Engine
    ↓
Rule Evaluation
    ↓
Case Creation
    ↓
Task Assignment
    ↓
SLA
    ↓
Audit Log
```

This creates the backbone for most later capabilities without immediately changing the entire product.

Before enabling it in production:

- Feature-flag the workflow.
- Test against existing survey data.
- Run in shadow mode if possible.
- Verify duplicate-event protection.
- Verify RBAC.
- Verify audit logs.
- Verify notification safety.
.

---

# 37. Final Product Vision

The end state should not be positioned internally as simply:

> "A survey dashboard."

The target architecture is:

> **Professional Services Client Experience & Voice of Clients Platform**

with a lifecycle of:

```text
CRM / ERP / Engagement Events
          ↓
   Trigger & Governance Engine
          ↓
 Survey / Voice / WhatsApp / Email
          ↓
      Client Feedback
          ↓
 Score + NPS + CSAT + CES + AI
          ↓
 Account / Engagement Health
          ↓
 Risk / Revenue / Opportunity
          ↓
 Cases + Tasks + Training + Escalation
          ↓
 Client Confirmation
          ↓
 Resolution
          ↓
 Benchmarking + Executive Insights
          ↓
 Continuous Improvement
```

The most important architectural shift is from **survey collection** to an **event-driven client-health and action platform**.
