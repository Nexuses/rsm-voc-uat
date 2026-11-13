# RSM Voice of Clients — Survey Invite API

> **Postman:** Import `docs/postman/RSM_VoC_Trigger_API.postman_collection.json` and see
> `docs/API_TRIGGER_SURVEY_EMAIL.md` for setup steps and the full reference.

Server-to-server API for sending branded RSM survey invitation emails with tracked links.

**Base URL (production):** `https://rsm-voc-platform.vercel.app`  
RSM will provide your API key separately. Store it securely on your backend only.

---

## Endpoint

```
POST /api/integrations/survey-invites
```

### Headers

| Header | Value |
|---|---|
| `Authorization` | `Bearer <SURVEY_INVITE_API_KEY>` |
| `Content-Type` | `application/json` |

### Important

- Call this API **from your server**, not from browser JavaScript (the API key must not be exposed to users).
- RSM sends the email; the API does not return survey links or tokens.
- Automatic follow-up reminders are sent every 3 days by default if the survey is not completed (max 5; admin Settings → Reminders). Manual reminder sends count toward the max.

---

## Request body

Send **one** of these recipient modes per request:

| Mode | Fields | Use when |
|---|---|---|
| Single | `to` + optional metadata | One person (e.g. form submit) |
| Bulk emails | `emails` (array) | Simple list of addresses |
| Bulk CSV | `csv` (string) | Mailing list with metadata columns |

`subject` is optional. If omitted, the default RSM invite subject is used.

### Optional metadata (single send or CSV columns)

Already accepted: `firstName`, `lastName`, `company`, `department`, `partner`, `teamLeader`, `customerName`, `projectId`, `surveyOrder`

Added, all optional: `serviceName`, `partnerEmail`, `businessManagerName`, `businessManagerEmail`, `jobManagerName`, `jobManagerEmail`

`teamLeader` is stored and is not copied on the completion email. The partner and both managers are copied when an email is present. See [`API_TRIGGER_SURVEY_EMAIL.md`](API_TRIGGER_SURVEY_EMAIL.md) for the field table and limits.

### Rules

- Do not combine `to` with `csv` in the same request.
- Max **500** addresses per `emails` array.
- Max **500 KB** for `csv` content.
- Rate limit: **100 recipients per 10 minutes** (shared across all API calls).

---

## Examples

### Single recipient

```bash
curl -X POST https://rsm-voc-platform.vercel.app/api/integrations/survey-invites \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "client@example.com",
    "firstName": "Ahmed",
    "company": "Acme Corp",
    "projectId": "PRJ-2401"
  }'
```

### Bulk — email array

```json
{
  "subject": "RSM in Kuwait — share your feedback",
  "emails": ["a@example.com", "b@example.com"]
}
```

### Bulk — CSV string

The `csv` value is the full CSV text (not a file upload). Include a header row.

```json
{
  "csv": "email,department,customername,projectid\nclient@example.com,Audit,Sara Al-Sabah,PRJ-2401\nops@company.co,Tax,Fahad Al-Ahmad,PRJ-2402"
}
```

**Supported CSV columns:** `email`, `department`, `service`, `partner`, `partneremail`, `businessmanager`, `businessmanageremail`, `jobmanager`, `jobmanageremail`, `teamleader`, `customername`, `projectid`, `surveyorder`, `firstname`, `lastname`, `company`

---

## Responses

### Single send — `200 OK`

```json
{
  "ok": true,
  "inviteId": "uuid",
  "sent": 1,
  "failed": 0,
  "total": 1
}
```

### Bulk send — `200 OK`

```json
{
  "ok": true,
  "batchId": "token",
  "sent": 2,
  "failed": 0,
  "total": 2,
  "results": [
    { "email": "a@example.com", "ok": true },
    { "email": "b@example.com", "ok": true }
  ]
}
```

### Errors

| Status | Meaning |
|---|---|
| `401` | Missing or invalid API key |
| `400` | Invalid payload (bad email, empty recipients, `to` + `csv` together) |
| `415` | `Content-Type` must be `application/json` |
| `429` | Rate limit exceeded — retry after `Retry-After` seconds |
| `503` | Email service temporarily unavailable |
| `500` | Send failed — retry or contact RSM |

---

## Typical integration flow

```
Your website / CRM event
        ↓
Your backend server
        ↓
POST /api/integrations/survey-invites
        ↓
RSM sends branded email with unique tracked survey link
        ↓
Recipient completes survey on RSM survey site
```

---

## Support

For API key issuance, environment URLs, or integration questions, contact your RSM in Kuwait project contact.
