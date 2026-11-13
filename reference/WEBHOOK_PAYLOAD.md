# Reference — ElevenLabs Post-Call Webhook Payload

> ⚠️ Field paths change. Before relying on this, confirm against ElevenLabs' current
> "Post-call webhooks" and "Data Collection" documentation, and adjust `parsePayload`
> in `app/api/webhooks/elevenlabs/route.ts` to match.

## How it arrives

ElevenLabs POSTs to your webhook URL when a conversation ends, with an
`elevenlabs-signature` header (HMAC, format `t=<ts>,v0=<hmac>`). Verify it before
parsing (see `lib/elevenlabs-verify.ts`).

## Approximate shape

```jsonc
{
  "type": "post_call_transcription",
  "data": {
    "conversation_id": "conv_abc123",
    "agent_id": "agent_xyz",
    "metadata": {
      "start_time": "2026-06-11T09:00:00Z",
      "end_time":   "2026-06-11T09:06:00Z"
    },
    "transcript": [ /* turns */ ],
    "analysis": {
      "data_collection_results": {
        "client_name":   { "value": "Acme LLC contact", "rationale": "..." },
        "client_company":{ "value": "Acme LLC" },
        "language":      { "value": "en" },
        "q1_rating":     { "value": "5" },
        "q1_reason":     { "value": "Team was very responsive" },
        "q2_rating":     { "value": "3" },
        "q2_reason":     { "value": "Filing took longer than expected" }
        // ... q3..qN
      }
    }
  }
}
```

## Data-collection fields to configure on the AGENT

These are set in the agent's **Analysis → Data collection** tab (see the v2 agent guide §6).
The parser reads exactly these keys:

| Field | Type | Notes |
|-------|------|-------|
| `client_name` | string | Captured live by the agent. |
| `client_company` | string | Captured live. |
| `language` | string | `en` or `ar`. |
| `q{n}_rating` | number | 1–5. Keep digits clean via the `elevenlabs` text normalizer. |
| `q{n}_reason` | string | The client's spoken/typed reason. |

The parser loops `q1..q20`; only present ratings are stored, so the same agent works
for any question count.

## Whisper fallback

If `data.transcript` is empty/poor, fetch the call audio with ElevenLabs'
get-conversation-audio API (needs `ELEVENLABS_API_KEY`) and send to OpenAI Whisper to
rebuild text. Only then — never in the live path.
