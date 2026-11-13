# Survey completion payload

**Schema version:** `1.0` (`schemaVersion` field)  
Included as `scores` on the CRM status webhook when `status` is `completed`.

VOC does not call a separate RSM score API. Appreciation / concern / partner tasks are RSM-side.

---

## Types

```ts
type TriggerStage = "mid" | "post";

type MetricScore = {
  scale: { min: number; max: number };
  value: number | null;
  comment: string | null;
};

type CrmSentiment = "Satisfied" | "Neutral" | "Dissatisfied";

type SurveyCompletionPayload = {
  schemaVersion: "1.0";
  inviteId: string;
  responseId: string;
  externalEngagementId: string | null;
  triggerStage: TriggerStage | null;
  projectId: string | null;
  idempotencyKey: string | null;    // same key CRM sent on invite create
  email: string;
  language: string;
  surveyVersion: string;
  completedAt: string;              // ISO-8601
  surveyUrl: string;
  resultLinkUrl: string;
  /**
   * Collective rating from combined CSAT + CES + NPS out of 22
   * (same bands as completion-email Overall result).
   */
  sentiment: CrmSentiment | null;
  scores: {
    csat: MetricScore;              // scale 1–5
    ces: MetricScore;               // scale 1–7
    nps: MetricScore;               // scale 0–10
  };
};
```

Combined total = CSAT + CES + NPS (max 22). All three metrics must be present
and in range; otherwise `sentiment` is `null`.


| Combined % of 22       | Integer total | `sentiment`    | Email overall result |
| ---------------------- | ------------- | -------------- | -------------------- |
| Above 80%              | ≥18           | `Satisfied`    | Positive             |
| 60–80%                 | 14–17         | `Neutral`      | Neutral              |
| Below 60%              | ≤13           | `Dissatisfied` | Negative             |
| missing / out of range | —             | `null`         | —                    |


Use the three metric values independently; do not average them into a single
`totalScore` field on the payload. Prefer this structured `scores` object over a
free-form `surveyResults[]` array of question strings. `sentiment` is the
collective rating (combined score), not a CSAT-only mood and not an AI label.

---



## Example

```json
{
  "schemaVersion": "1.0",
  "inviteId": "8f2c0a1e-…",
  "responseId": "b3a1…",
  "externalEngagementId": "CRM-ENG-123",
  "triggerStage": "post",
  "projectId": "PRJ-2401",
  "idempotencyKey": "CRM-ENG-123-post-client@example.com",
  "email": "client@example.com",
  "language": "en",
  "surveyVersion": "three-metric-v1",
  "completedAt": "2026-08-25T12:05:00.000Z",
  "surveyUrl": "https://…/survey?invite=…",
  "resultLinkUrl": "https://…/results/…",
  "sentiment": "Satisfied",
  "scores": {
    "csat": { "scale": { "min": 1, "max": 5 }, "value": 5, "comment": "Excellent partner availability." },
    "ces": { "scale": { "min": 1, "max": 7 }, "value": 6, "comment": null },
    "nps": { "scale": { "min": 0, "max": 10 }, "value": 9, "comment": "Would recommend to peers." }
  }
}
```
