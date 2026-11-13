# API 2 — Survey Success Webhook (Voice Completion)

ElevenLabs calls this endpoint when a **voice survey call ends**. The platform verifies the HMAC signature, stores the response, generates insights, and updates dashboard metrics.

Typed (web form) surveys do **not** use this webhook — they submit directly to `POST /api/survey/typed` from the browser.

---

## Webhook URL

### Production

```text
https://rsm-voc-platform.vercel.app/api/webhooks/elevenlabs
```

### Local development

```text
http://localhost:3000/api/webhooks/elevenlabs
```

Replace the host with your own domain when self-hosting (see `docs/VPS_HOSTING_HANDOVER.md`).

---

## Quick reference

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/api/webhooks/elevenlabs` |
| Called by | ElevenLabs (post-call transcription webhook) |
| Auth | HMAC signature — **not** a bearer token or session |
| Signature header | `elevenlabs-signature` |
| Event type | `post_call_transcription` |
| Idempotency | Upsert by `conversation_id` — retries are safe |

---

## ElevenLabs configuration

Configure this in the **ElevenLabs workspace** (agent or workspace webhook settings):

1. Create or edit a **post-call webhook** with **HMAC authentication**.
2. Set the webhook URL to:

   ```text
   https://rsm-voc-platform.vercel.app/api/webhooks/elevenlabs
   ```

3. Copy the webhook **signing secret** into the RSM platform environment variable `ELEVENLABS_WEBHOOK_SECRET`.
4. Attach the webhook to the Voice of Clients agent so it fires on call completion.
5. Ensure the agent **data collection** fields match the approved survey contract (see below).

The repository can also push agent settings via:

```bash
npm run elevenlabs:configure          # dry run
npm run elevenlabs:configure -- --apply # apply to ElevenLabs
```

After changing domains, update the webhook URL in ElevenLabs or in the configure script before applying.

---

## Authentication (HMAC)

ElevenLabs signs the **raw request body**. The platform rejects requests without a valid signature.

| Header | Format |
| --- | --- |
| `elevenlabs-signature` | `t=<unix_timestamp>,v0=<hex_hmac_sha256>` |

Verification steps (implemented in `lib/elevenlabs-verify.ts`):

1. Parse `t` (timestamp) and `v0` (signature) from the header.
2. Reject if the timestamp is older than **5 minutes** (replay protection).
3. Compute `HMAC-SHA256( secret, "<timestamp>.<raw_body>" )` as hex.
4. Compare with `v0` using a constant-time check.

**Secret:** `ELEVENLABS_WEBHOOK_SECRET` (from ElevenLabs webhook settings). RSM stores this server-side only.

There is no `Authorization: Bearer` header on this route.

---

## Request

| Header | Required | Notes |
| --- | --- | --- |
| `Content-Type` | Yes | `application/json` |
| `elevenlabs-signature` | Yes | HMAC from ElevenLabs |

### Payload shape

Event type must be `post_call_transcription`:

```json
{
  "type": "post_call_transcription",
  "data": {
    "conversation_id": "conv_abc123",
    "agent_id": "agent_xyz",
    "metadata": {
      "start_time": "2026-06-11T09:00:00Z",
      "end_time": "2026-06-11T09:06:00Z"
    },
    "transcript": [],
    "analysis": {
      "data_collection_results": {
        "client_name": { "value": "Ahmed Al-Sabah" },
        "client_company": { "value": "Acme Corp" },
        "client_designation": { "value": "CFO" },
        "language": { "value": "en" },
        "q1_rating": { "value": "5" },
        "q1_reason": { "value": "Responsive team" },
        "q2_rating": { "value": "6" },
        "q2_reason": { "value": "Easy to reach support" },
        "q3_rating": { "value": "9" },
        "q3_reason": { "value": "Would recommend" }
      }
    }
  }
}
```

### Data collection fields (agent must collect)

| Field | Type | Survey metric |
| --- | --- | --- |
| `client_name` | string | Respondent full name |
| `client_company` | string | Company |
| `client_designation` | string | Job title |
| `language` | string | `en` or `ar` |
| `q1_rating` | number | CSAT (1–5) |
| `q1_reason` | string | CSAT comment (optional) |
| `q2_rating` | number | CES (1–7) |
| `q2_reason` | string | CES comment (optional) |
| `q3_rating` | number | NPS (0–10) |
| `q3_reason` | string | NPS comment (optional) |

Partial responses are accepted — missing metrics are excluded from their own calculations.

Values may be wrapped as `{ "value": "..." }` or sent as plain scalars.

---

## Responses

### Success — `200 OK`

```json
{
  "ok": true,
  "responseId": "uuid"
}
```

The response is stored (or updated if `conversation_id` already exists). AI insight and embedding generation run asynchronously; failures there do not fail the webhook.

### Error responses

| Status | Body | Meaning |
| --- | --- | --- |
| `401` | `{ "error": "invalid signature" }` | Missing or wrong HMAC |
| `400` | `{ "error": "invalid JSON" }` | Body is not valid JSON |
| `400` | `{ "error": "invalid webhook payload" }` | Wrong event type or missing required fields |
| `500` | `{ "error": "webhook secret is not configured" }` | `ELEVENLABS_WEBHOOK_SECRET` not set |
| `503` | `{ "error": "webhook ingest failed" }` | Database or ingest error — **ElevenLabs should retry** |

---

## Idempotency and retries

ElevenLabs may retry failed deliveries. The platform **upserts** on `conversation_id`, so duplicate webhooks do not create duplicate survey rows.

Return `503` only when ingest cannot complete; return `200` once the response is safely stored.

---

## End-to-end flow

```
Visitor completes voice survey on /survey
        ↓
ElevenLabs agent ends call
        ↓
ElevenLabs POST → /api/webhooks/elevenlabs
  (header: elevenlabs-signature)
        ↓
Verify HMAC → parse payload → normalize answers
        ↓
Upsert Response + Client in PostgreSQL
        ↓
Generate GPT insight + embedding (best effort)
        ↓
Recompute public CSAT/CES/NPS aggregates
        ↓
If linked to SurveyInvite → mark complete, send thank-you email
        ↓
200 { "ok": true, "responseId": "..." }
```

---

## Local testing

Post a signed sample fixture against a running dev server:

```bash
npm run dev
npm run webhook:sample
```

Target production (use only with test payloads):

```bash
BASE_URL="https://rsm-voc-platform.vercel.app" npm run webhook:sample
```

---

## Related environment variables

| Variable | Purpose |
| --- | --- |
| `ELEVENLABS_WEBHOOK_SECRET` | HMAC verification (from ElevenLabs webhook settings) |
| `ELEVENLABS_API_KEY` | Voice session signing (separate from webhook secret) |
| `ELEVENLABS_AGENT_ID` | Voice agent identifier |

---

## Support

For webhook URL changes, ElevenLabs agent access, or delivery troubleshooting, contact your RSM in Kuwait project contact.
