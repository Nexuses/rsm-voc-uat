# Trigger survey email

**Contract version:** `1.0`  
**Endpoint:** `POST /api/integrations/survey-invites`  
**Auth:** `Authorization: Bearer <SURVEY_INVITE_API_KEY>`  
**Content-Type:** `application/json`

Base URL (production): `https://rsm-voc-survey.nexuses.xyz`  
Postman: `docs/postman/RSM_VoC_Trigger_API.postman_collection.json`

Pick **one** mode per request. Do not mix `to` with `csv`.  
Limits: max 500 recipients per bulk call; 100 recipients / 10 minutes.


| Mode               | Field    | Use when                                                    |
| ------------------ | -------- | ----------------------------------------------------------- |
| **A — Single**     | `to`     | One person, one CRM/event trigger (**default for RSM CRM**) |
| **B — Email list** | `emails` | Many addresses, same blast, no per-person details           |
| **C — CSV**        | `csv`    | Many people, each with their own name/company/etc.          |


## Request schema change

Existing calls still work if these fields are left out. Add them on each invite when you have the values. They are free text, not a fixed list. A name that VOC has not seen before is stored on the invite and is suggested the next time.

### New optional JSON fields (Mode A)

| Field | Type | Max length | CSV header |
| --- | --- | --- | --- |
| `serviceName` | string | 120 | `service` |
| `partnerEmail` | email | 200 | `partneremail` |
| `businessManagerName` | string | 120 | `businessmanager` |
| `businessManagerEmail` | email | 200 | `businessmanageremail` |
| `jobManagerName` | string | 120 | `jobmanager` |
| `jobManagerEmail` | email | 200 | `jobmanageremail` |

`partner` and `teamLeader` were already accepted. `teamLeader` is stored and is not copied on the completion email. Partner, business manager, and job manager are copied, using the email on the invite when it is present.

An empty email may be omitted. A non-empty email that is not a valid address returns `400`.

```json
{
  "to": "client@example.com",
  "subject": "RSM in Kuwait — Share your Voice of Clients feedback",
  "firstName": "Ahmed",
  "lastName": "Al-Sabah",
  "company": "Acme Corp",
  "customerName": "Ahmed Al-Sabah",
  "department": "Assurance",
  "serviceName": "Audit",
  "partner": "Mohamed Shehata",
  "partnerEmail": "mohamed.shehata@rsm.com.kw",
  "businessManagerName": "Sara Al-Mutairi",
  "businessManagerEmail": "sara.almutairi@rsm.com.kw",
  "jobManagerName": "Omar Al-Rashid",
  "jobManagerEmail": "omar.alrashid@rsm.com.kw",
  "teamLeader": "Noura Al-Kandari",
  "projectId": "PRJ-2401",
  "surveyOrder": "1",
  "externalEngagementId": "CRM-ENG-123",
  "triggerStage": "mid",
  "idempotencyKey": "CRM-ENG-123-mid-client@example.com"
}
```

### CSV columns to add (Mode C)

Header names are matched without spaces or capital letters. Preferred headers:

`service`, `partneremail`, `businessmanager`, `businessmanageremail`, `jobmanager`, `jobmanageremail`

Also accepted: `servicename`, `partnername`, `businessmanagername`, `jobmanagername`.

---



## Mode A — Single (`to`)



### Scenarios

1. **CRM mid-engagement** — Budget hit ~50%. CRM fires once for that client contact on that engagement. Send with `triggerStage: "mid"` and a unique `idempotencyKey` (e.g. `ENG-123-mid-client@example.com`).
2. **CRM post-engagement** — Budget hit ~100%. Same person/engagement, second send. Use `triggerStage: "post"` and a **different** `idempotencyKey` (e.g. `…-post-…`).
3. **Retry after a network glitch** — Call again with the **same** `idempotencyKey`. VOC returns the existing invite (`reused: true`) and does **not** send a second email.
4. **One-off from your backend** — Website form or internal tool needs to invite exactly one person with name/company filled in.



### What to send

```json
{
  "to": "client@example.com",
  "subject": "RSM in Kuwait — Share your Voice of Clients feedback",
  "firstName": "Ahmed",
  "lastName": "Al-Sabah",
  "company": "Acme Corp",
  "customerName": "Ahmed Al-Sabah",
  "department": "Assurance",
  "serviceName": "Audit",
  "partner": "Mohamed Shehata",
  "partnerEmail": "mohamed.shehata@rsm.com.kw",
  "businessManagerName": "Sara Al-Mutairi",
  "businessManagerEmail": "sara.almutairi@rsm.com.kw",
  "jobManagerName": "Omar Al-Rashid",
  "jobManagerEmail": "omar.alrashid@rsm.com.kw",
  "teamLeader": "Noura Al-Kandari",
  "projectId": "PRJ-2401",
  "surveyOrder": "1",
  "externalEngagementId": "CRM-ENG-123",
  "triggerStage": "mid",
  "idempotencyKey": "CRM-ENG-123-mid-client@example.com"
}
```

Only `to` is required. Every other field is optional. `teamLeader` is stored and is not copied on the completion email. Department, service, partner, and both managers are free text. A new name is stored on the invite, added to the survey directory for the next suggestion list, and shows up as a dashboard filter. Send the email with the name when you have it; that address is CC'd when the client finishes the survey.

### What you get back

```json
{
  "ok": true,
  "inviteId": "uuid",
  "externalEngagementId": "CRM-ENG-123",
  "triggerStage": "mid",
  "surveyUrl": "https://…/survey?invite=…",
  "resultLinkUrl": "https://…/results/…",
  "status": "sent",
  "reused": false,
  "sent": 1,
  "failed": 0,
  "total": 1
}
```

Store `inviteId` / `surveyUrl` / `resultLinkUrl` on the CRM row if you need them later.

---



## Mode B — Email list (`emails`)



### Scenarios

1. **Simple blast** — You already have a list of addresses (newsletter export, partner list) and only need “send the survey invite to these emails.”
2. **No per-person CRM metadata** — You do **not** need different company/partner/project per recipient in this call.
3. **Not the mid/post CRM path** — If each person is tied to a different engagement, use **Mode A** once per person instead.



### What to send

```json
{
  "subject": "RSM in Kuwait — share your feedback",
  "emails": ["a@example.com", "b@example.com"],
  "externalEngagementId": "CRM-CAMPAIGN-42",
  "triggerStage": "post"
}
```

These four are the only fields this mode uses. `externalEngagementId` and `triggerStage` apply to every address in the list (rarely what CRM wants). Per-person fields such as company, partner, or managers are ignored here; use Mode A or Mode C for those.

### What you get back

A bulk response with `results[]` (one entry per email, each with its own `inviteId` / URLs when successful).

---



## Mode C — CSV string (`csv`)



### Scenarios

1. **Mailing list with columns** — Ops has a spreadsheet (email, name, company, department, project…) and wants one API call to invite everyone.
2. **Different metadata per row** — Unlike Mode B, each person can have their own `firstname`, `company`, `projectid`, etc.
3. **Not a file upload** — You paste/serialize the CSV **text** into the JSON `"csv"` field (header row required).



### What to send

```json
{
  "subject": "RSM in Kuwait — share your feedback",
  "csv": "email,firstname,lastname,company,customername,department,service,partner,partneremail,businessmanager,businessmanageremail,jobmanager,jobmanageremail,teamleader,projectid,surveyorder\nclient@example.com,Ahmed,Al-Sabah,Acme Corp,Ahmed Al-Sabah,Assurance,Audit,Mohamed Shehata,mohamed.shehata@rsm.com.kw,Sara Al-Mutairi,sara.almutairi@rsm.com.kw,Omar Al-Rashid,omar.alrashid@rsm.com.kw,Noura Al-Kandari,PRJ-2401,1\nops@company.co,Fahad,Al-Ahmad,Example LLC,Fahad Al-Ahmad,Tax,Tax compliance,Tuhin Chaturvedi,tuhin.chaturvedi@rsm.com.kw,Layla Al-Enezi,layla.alenezi@rsm.com.kw,Yousef Al-Mutawa,yousef.almutawa@rsm.com.kw,,PRJ-2402,2"
}
```

Only `email` is required in each row. Leave a cell empty when you do not have the value, as in the second row's team leader.

Columns: `email`, `firstname`, `lastname`, `company`, `designation` (aliases `position`, `title`, `jobtitle`), `department`, `service`, `partner`, `partneremail`, `businessmanager`, `businessmanageremail`, `jobmanager`, `jobmanageremail`, `teamleader`, `customername`, `projectid`, `surveyorder`.

### What you get back

Same bulk shape as Mode B (`batchId`, `sent` / `failed` / `total`, `results[]`).

---



## Types

```ts
type TriggerStage = "mid" | "post";

type SurveyInviteRequest =
  | { to: string; emails?: never; csv?: never; /* + optional metadata below */ }
  | { emails: string[]; to?: never; csv?: never; subject?: string; /* + optional shared CRM fields */ }
  | { csv: string; to?: never; emails?: never; subject?: string };

type OptionalMetadata = {
  subject?: string;                 // max 200
  firstName?: string;               // max 80
  lastName?: string;                // max 80
  company?: string;                 // max 120
  designation?: string;             // max 120; optional client position for survey prefill
  department?: string;
  serviceName?: string;
  partner?: string;
  partnerEmail?: string;
  businessManagerName?: string;
  businessManagerEmail?: string;
  jobManagerName?: string;
  jobManagerEmail?: string;
  teamLeader?: string;
  customerName?: string;
  projectId?: string;
  surveyOrder?: string;
  externalEngagementId?: string;    // 1–120
  triggerStage?: TriggerStage;
  idempotencyKey?: string;          // 8–120
};

type SurveyInviteSingleResponse = {
  ok: true;
  inviteId: string;
  externalEngagementId: string | null;
  triggerStage: TriggerStage | null;
  surveyUrl: string;
  resultLinkUrl: string;
  status: "sent";
  reused: boolean;
  sent: 1;
  failed: 0;
  total: 1;
};

type SurveyInviteBulkResponse = {
  ok: boolean;
  batchId: string;
  sent: number;
  failed: number;
  total: number;
  results: Array<{
    email: string;
    ok: boolean;
    error?: string;
    inviteId?: string;
    surveyUrl?: string;
    resultLinkUrl?: string;
    reused?: boolean;
  }>;
};
```

---



## Errors


| Status | Meaning                      |
| ------ | ---------------------------- |
| `401`  | Missing / invalid API key    |
| `400`  | Invalid body or recipients   |
| `415`  | Not `application/json`       |
| `429`  | Rate limited (`Retry-After`) |
| `503`  | Email not configured         |
| `500`  | Send failed                  |

---

## Reply to send RSM

Subject: RSM VoC – updated invite fields, completion email, and score bands

Dear team,

The survey invite now accepts the engagement people and the service as free text. You do not need to pick from a list on our side. Please send these optional fields with each invite (JSON or CSV):

- `partner` and `partnerEmail`
- `businessManagerName` and `businessManagerEmail`
- `jobManagerName` and `jobManagerEmail`
- `serviceName` (for example Audit or Tax, so the client is not inferred from the department alone)
- `department`, `company`, and `customerName` stay as they are

`teamLeader` is still accepted and stored. It is not copied on the completion email.

When the client finishes the survey, the internal email CCs the partner, the business manager, and the job manager. We use the email on that invite. If the email is missing, we use the address stored for that name in the survey directory, then `SURVEY_STAFF_DIRECTORY`. Sending an invite adds a new department, service, partner, manager, or team leader to that directory. If the person has no email stored yet, the email on the invite is saved with them. The name on the invite also becomes a dashboard filter.

The completion subject is `{Company} — {Contact name} — Result: Positive|Neutral|Negative`. The same result word is in the body. A negative result also sends an action-required email to the same people. The CRM webhook field `sentiment` uses the **same combined score out of 22**, mapped to CRM vocabulary (`Satisfied` / `Neutral` / `Dissatisfied` ↔ Positive / Neutral / Negative).

The notes from the meeting swapped the live scales. NPS is 0–10, not out of 7. CES is 1–7, not out of 5. CSAT is 1–5. The overall result (email and CRM `sentiment`) uses the combined score out of 22 (CSAT + CES + NPS):

- Below 60% (≤13/22): Negative / Dissatisfied
- 60–80% (14–17/22): Neutral
- Above 80% (≥18/22, e.g. 18/22 = 82%): Positive / Satisfied

Per-metric low-score flagging for the internal needs-attention banner is unchanged (CSAT ≤2, CES ≤3, NPS ≤6).

The survey invitation email shows the invite's `department` and `serviceName` in a "This survey is about the following service:" block (omitted when neither is set), so the client knows which service they are rating.

Thanks and regards,
Nexuses



Call from your server only. Related: `API_CRM_STATUS_WEBHOOK.md`, `API_SURVEY_COMPLETION_PAYLOAD.md`.