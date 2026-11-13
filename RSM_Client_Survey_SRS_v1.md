# RSM Kuwait Client Satisfaction Survey Platform
# Software Requirements Specification (SRS) v1.0

## 1. Introduction

### 1.1 Purpose
This document defines the complete software requirements for the RSM Kuwait Client Satisfaction Survey Platform.

### 1.2 Goals
- Measure client satisfaction throughout project lifecycle.
- Identify service issues early.
- Automate issue resolution.
- Improve client experience.
- Track team performance.
- Generate training actions from recurring low scores.

---

# 2. User Roles & Permissions

| Role | Permissions |
|--------|--------|
| System Admin | Full access |
| Office Managing Partner (OMP) | View all surveys, escalations, training |
| Engagement Partner | Manage assigned clients, resolve issues |
| Team Leader | View team surveys and issues |
| Engagement Team | View assigned surveys and training tasks |
| Dedicated Follow-up Personnel | Follow-up and reminder management |
| Client | Complete surveys and verify issue resolution |

---

# 3. Functional Requirements

## FR-001 Client Contact Capture
When an opportunity is won:
- Client Name required
- Client Email required
- Opportunity cannot enter survey workflow without these fields

## FR-002 Survey Eligibility Engine
System shall determine whether a project qualifies for survey distribution.

Criteria must be configurable by management.

## FR-003 Budget Monitoring
System shall continuously monitor project budget consumption.

## FR-004 First Survey Trigger
Send first survey when:
- Budget consumption >= 50%

## FR-005 Second Survey Trigger
Send second survey when:
- Budget consumption >= 100%
OR
- Final billing issued

## FR-006 Survey Invitation Email
System shall email survey link to client.

## FR-007 Reminder Engine
Every 3 days:
- Check unanswered surveys
- Send reminder

## FR-008 Follow-up Tracking
System shall record manual follow-up activities.

---

# 4. Survey Module

## FR-009 Survey Questions

Question 1
- Quality of Services Provided
- Weight 20%

Question 2
- Adding Value
- Weight 5%

Question 3
- Helpful, Courteous and Active Communicator
- Weight 25%

Question 4
- Competent
- Weight 10%

Question 5
- Would you recommend RSM Kuwait to others
- Weight 20%

Question 6
- Position against alternative service providers
- Weight 20%

## FR-010 Survey Rating Scale

Allowed Values:
- 1
- 2
- 3
- 4
- 5

## FR-011 Survey Comments
System shall allow optional written comments.

## FR-012 Anonymous Responses
Not supported unless explicitly enabled.

---

# 5. Scoring Engine

## FR-013 Weighted Score Calculation

Weighted Score =
Question Score × Weight

## FR-014 Total Score Calculation

Overall Score =
Sum of all weighted scores

## FR-015 Historical Average

Average Score =
Total Survey Scores / Number of Surveys

## FR-016 Category Classification

Positive+
- 5.00–4.75

Positive
- 4.74–4.00

Neutral
- 3.99–3.00

Negative
- 2.99–2.00

Negative+
- 1.99–0.00

---

# 6. Positive Workflow

## FR-017 Positive Trigger
When overall score >= 4.00

## FR-018 Appreciation Email
Send appreciation email to:
- Engagement Partner
- Team Leader
- Engagement Team

## FR-019 Email Template Randomization
System shall randomly select from 5 appreciation templates.

## FR-020 Client Thank You Email
System shall send thank-you email to client.

---

# 7. Neutral Workflow

## FR-021 Neutral Trigger
When score between 3.00 and 3.99

## FR-022 Internal Notification
Notify:
- Engagement Partner
- Team Leader

## FR-023 Client Thank You Email
Send neutral acknowledgement email.

---

# 8. Negative Workflow

## FR-024 Negative Trigger
When score < 3.00

## FR-025 Internal Notification
Notify:
- Engagement Partner
- Team Leader

## FR-026 Client Acknowledgement
Send apology and acknowledgement email.

## FR-027 Auto Resolution Task
Create Issue Resolution Task.

---

# 9. Single Negative Question Rule

## FR-028 Detection
If any individual question score < 3

AND

Overall survey may still be:
- Positive+
- Positive
- Neutral

## FR-029 Special Handling
System shall:
- Notify Engagement Partner
- Notify Team Leader
- Create resolution task

---

# 10. Resolution Management

## FR-030 Resolution Assignment
Assign task to Engagement Partner.

## FR-031 Resolution Notes
Partner must record:
- Root cause
- Actions taken
- Resolution summary

## FR-032 Resolution SLA
Resolution required within:
- 24 hours

## FR-033 Completion Workflow
Partner marks issue resolved.

## FR-034 Client Verification Email
Automatically request client confirmation.

## FR-035 Client Rejection
If client rejects resolution:

Notify:
- Engagement Partner
- Team Leader

Copy:
- Office Managing Partner

## FR-036 Escalation Status
Mark issue as Escalated.

---

# 11. Training Module

## FR-037 Consecutive Low Score Detection

Trigger when:
- Same question
- Score <= 3
- Across 5 consecutive surveys

## FR-038 Training Task Creation

Create task assigned to:
- Engagement Team

## FR-039 Due Date

Training completion due:
- 15 calendar days

## FR-040 Lessons Learned Submission

Required attachment:
- Lessons Learned document

Recipient:
- OMP

## FR-041 Repeat Failure

Create escalation meeting request involving:
- OMP
- Engagement Partner
- Team Leader
- Engagement Team

---

# 12. Training Recommendation Engine

## FR-042 Course Mapping

Low-scoring questions may map to:

- Customer Experience Training
- Customer Communication Training
- Service Quality Training

## FR-043 Recommendation Display
Show recommendations inside task details.

---

# 13. Dashboard Requirements

## FR-044 Executive Dashboard

Display:
- Response rate
- Average score
- Score trends
- Open issues
- Escalated issues

## FR-045 Client Dashboard

Display:
- Client history
- Previous surveys
- Average scores

## FR-046 Team Dashboard

Display:
- Team performance
- Positive surveys
- Negative surveys

## FR-047 Resolution Dashboard

Display:
- Open tasks
- Closed tasks
- SLA breaches

## FR-048 Training Dashboard

Display:
- Pending training
- Completed training
- Repeat offenders

---

# 14. Reporting Requirements

## FR-049 Export Reports

Formats:
- PDF
- Excel
- CSV

## FR-050 Scheduled Reports

Support:
- Weekly
- Monthly
- Quarterly

---

# 15. Audit Requirements

## FR-051 Audit Logging

Track:
- Survey sent
- Survey opened
- Survey completed
- Reminder sent
- Emails generated
- Tasks created
- Resolution actions
- Training actions

## FR-052 Immutable History

Audit logs cannot be edited.

---

# 16. Notification Requirements

## FR-053 Email Delivery

System must support:
- Survey emails
- Reminder emails
- Appreciation emails
- Resolution emails
- Escalation emails
- Training emails

## FR-054 Notification History

Store delivery history.

---

# 17. Database Entities

Core Entities:

- Users
- Roles
- Clients
- Projects
- Opportunities
- Surveys
- Survey Questions
- Survey Responses
- Survey Scores
- Notifications
- Resolution Tasks
- Resolution Updates
- Training Tasks
- Training Courses
- Escalations
- Audit Logs

---

# 18. State Machines

Survey Status:
Draft
→ Sent
→ Opened
→ Completed
→ Archived

Resolution Task:
Open
→ In Progress
→ Awaiting Client Confirmation
→ Resolved
→ Escalated
→ Closed

Training Task:
Created
→ Assigned
→ In Progress
→ Submitted
→ Approved
→ Closed

---

# 19. Non-Functional Requirements

## NFR-001 Security
Role-based access control.

## NFR-002 Authentication
SSO or secure login support.

## NFR-003 Availability
99.5% uptime target.

## NFR-004 Auditability
All critical actions logged.

## NFR-005 Scalability
Support multiple service lines and future offices.

## NFR-006 Performance
Dashboard loads under 3 seconds.

## NFR-007 Email Reliability
Retry failed email delivery.

---

# 20. Acceptance Criteria

Platform is considered complete when:

- Survey automation works.
- Scoring engine matches weightage.
- Positive workflows trigger correctly.
- Neutral workflows trigger correctly.
- Negative workflows trigger correctly.
- Single negative question workflow works.
- Resolution SLA tracking works.
- Client verification works.
- Escalation workflows work.
- Training workflows work.
- Dashboards display correct metrics.
- Audit logs are retained.
