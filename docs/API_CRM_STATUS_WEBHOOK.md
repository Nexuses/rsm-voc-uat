# CRM survey status webhook (VOC → RSM)

**Contract / schema version:** `1.0`  
**Direction:** VOC `POST` → `CRM_STATUS_WEBHOOK_URL`  
**Auth (optional):** `Authorization: Bearer <CRM_STATUS_WEBHOOK_SECRET>`  
**Signature (when secret set):** `X-VOC-Signature` = HMAC-SHA256 hex of raw body

Skipped when `CRM_STATUS_WEBHOOK_URL` is unset. Expect **2xx**; VOC retries up to 3× on network / `429` / `5xx`.

---

## Types

```ts
type CrmSurveyStatus = "completed";
type TriggerStage = "mid" | "post";

/** Scores only on status === "completed" — see API_SURVEY_COMPLETION_PAYLOAD.md */
type SurveyCompletionPayload = { /* schemaVersion "1.0" */ };

type CrmStatusWebhookPayload = {
  schemaVersion: "1.0";
  event: "survey.status";
  status: CrmSurveyStatus;
  occurredAt: string;                 // ISO-8601
  inviteId: string;
  externalEngagementId: string | null;
  triggerStage: TriggerStage | null;
  projectId: string | null;
  idempotencyKey: string | null;      // echoed from invite create when set
  email: string;
  surveyUrl: string;
  resultLinkUrl: string;
  scores?: SurveyCompletionPayload;
};
```

| `status` | When |
| --- | --- |
| `completed` | Survey finished with CSAT, CES, and NPS (`scores` present) |

VOC no longer posts `sent`, `opened`, or `filling`. An invite email, a tracked
open, or a started survey is not a response. If the completion payload cannot
be built, VOC logs the failure and does not post `completed` without scores.

Scores stay as structured CSAT / CES / NPS (see completion payload). On
`completed`, `scores.sentiment` is the collective rating from the combined
score out of 22 — same bands as the completion-email Overall result, mapped to
`Satisfied` / `Neutral` / `Dissatisfied`. VOC does **not** send a weighted
`totalScore` or a free-form `surveyResults[]` question array.

---

## Example (`completed`)

```json
{
  "schemaVersion": "1.0",
  "event": "survey.status",
  "status": "completed",
  "occurredAt": "2026-08-25T12:00:00.000Z",
  "inviteId": "uuid",
  "externalEngagementId": "CRM-ENG-123",
  "triggerStage": "mid",
  "projectId": "PRJ-2401",
  "idempotencyKey": "CRM-ENG-123-mid-client@example.com",
  "email": "client@example.com",
  "surveyUrl": "https://…/survey?invite=…",
  "resultLinkUrl": "https://…/results/…"
}
```

The live `completed` body also includes `scores` (`scores.csat`, `scores.ces`,
`scores.nps`, and `scores.sentiment`). See
`docs/API_SURVEY_COMPLETION_PAYLOAD.md`.

Headers: `Content-Type: application/json`, `User-Agent: RSM-VOC-CRM-Status/1.0`.
