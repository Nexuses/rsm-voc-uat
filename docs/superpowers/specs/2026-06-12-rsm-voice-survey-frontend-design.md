# RSM Voice of Clients Survey Frontend Design

**Date:** 2026-06-12
**Status:** Approved design

## Objective

Add a polished, English-only public survey experience to the existing RSM Voice
of Client platform. Visitors can complete the same approved survey either by
speaking with the existing ElevenLabs agent or by submitting a conventional
typed form.

Both paths must enter the existing private response pipeline so the CX dashboard,
GPT insight, embedding, RAG chatbot, and PII-free public aggregates continue to
operate from one source of truth.

This work does not create a new voice agent or a new survey. It connects the
existing RSM Kuwait ElevenLabs agent to the website and configures that agent to
collect the required identity fields and approved response fields.

## Binding Constraints

- The public widget and every `GET /api/public/*` route may read only
  `CsatSnapshot` and `ThemeRollup`. They must never query `Response`, `Client`, or
  `ResponseInsight`.
- Every ElevenLabs post-call payload must pass signature verification before it
  is parsed or trusted.
- Voice ingest remains idempotent through the unique ElevenLabs
  `conversation_id`.
- Typed ingest is also idempotent through a client-generated submission UUID.
- Store the complete source payload as JSONB alongside parsed fields.
- Do not expose raw comments, names, companies, or other PII through public read
  surfaces.
- Do not invent survey questions or Arabic wording.
- The initial release is English only.
- `SKILL.md`, `reference/`, and `starter/` remain read-only.
- The ElevenLabs API key and all other secrets remain server-side.

## Approved Survey

The approved rating question is:

> How satisfied are you with our overall service?

The answer is an integer from 1 through 5. The agent then uses its existing
approved observations follow-up. The typed form represents that follow-up as an
optional `Additional observations` field without adding another survey question.

## Public Experience

### Routes

- `/survey` is the canonical public survey page.
- `/` redirects to `/survey`.
- `/dashboard` and `/login` retain their current purposes.

### Visual Direction

Use the approved "Calm Voice Focus" direction:

- restrained RSM-inspired red, charcoal, warm white, and pale neutral surfaces;
- a centered circular voice control with a live waveform inside it;
- generous spacing, clear typography, and minimal decorative elements;
- subtle motion that communicates state rather than acting as decoration;
- a responsive single-column mobile layout and balanced desktop layout;
- accessible focus styles, keyboard operation, and reduced-motion support.

The interface may use RSM text branding and the supplied brand assets, but it
must not copy ElevenLabs trademarks or reproduce its interface pixel-for-pixel.
The similarity is limited to the familiar centered voice-agent interaction
pattern.

### Mode Selection

The initial screen introduces the short RSM Kuwait Voice of Clients survey and
offers two equal choices:

- `Take voice survey`
- `Take typed survey`

The visitor can return to this choice before submitting or while no voice
conversation is active.

### Voice Survey States

1. **Ready:** Explain that microphone access is required. The browser asks for
   permission only after the visitor presses the start control.
2. **Connecting:** Obtain a short-lived signed ElevenLabs URL from the server and
   connect the React SDK to the fixed RSM agent.
3. **Listening:** Animate the waveform from microphone input and clearly label
   that the agent is listening.
4. **Speaking:** Animate the waveform from agent output and clearly label that
   the RSM agent is speaking.
5. **Conversation:** Show concise live captions or the latest conversational
   turn, plus mute and end controls. Captions are display-only; the authoritative
   record is the signed ElevenLabs post-call webhook.
6. **Completed:** After the SDK session ends, thank the visitor and state that
   the response is being processed. The browser does not claim that webhook
   enrichment is already complete.

The agent asks for first name, last name, and business/company name by voice,
then delivers the existing RSM Kuwait introduction, purpose, approved rating
question, and approved observations follow-up. There is no identity form before
the voice call.

If microphone access is denied or voice connection fails, retain the current
screen, explain the problem in plain language, offer retry, and keep the typed
survey available.

### Typed Survey States

The typed form contains:

- first name, required;
- last name, required;
- business/company name, required;
- the approved satisfaction question with an accessible 1-5 selector, required;
- additional observations, optional;
- an invisible honeypot field for basic automated-submission filtering.

Validation appears next to the affected field and preserves all entered values.
While submitting, controls are disabled and duplicate requests are prevented.
Success shows the same thank-you treatment as the voice path. A failed request
preserves the form and offers retry using the same submission UUID.

## ElevenLabs Integration

### Existing Agent

Use the existing `RSM Kuwait VCO` agent:

`agent_6401ktv5yqkmf2a95qpd3nh62380`

Store this as the server-only `ELEVENLABS_AGENT_ID` environment variable instead
of embedding it in client code.

Before changing the live agent, export its current configuration. Create and
test an ElevenLabs agent version or branch when that capability is available;
otherwise retain the exported configuration as the rollback source before
applying the update. Modify only the instructions and analysis fields required
for this survey:

- English-only greeting and survey flow for RSM Kuwait;
- collect first name, last name, and company instead of email;
- ask the approved rating question exactly as written;
- preserve the existing approved observations follow-up;
- complete the call courteously after collecting the response.

Configure these post-call data collection fields:

- `client_first_name`
- `client_last_name`
- `client_company`
- `language`
- `q1_rating`
- `q1_reason`

The webhook parser accepts those fields and remains backward-compatible with
the existing `client_name` field. It combines first and last name into
`Client.name`, stores company in `Client.company`, and retains the separate
values in `Response.rawPayload`. The normalized `q1` answer always includes the
approved question text, even though ElevenLabs supplies the rating and reason
as separate data-collection fields.

### Browser Session

Use the official `@elevenlabs/react` SDK. A same-origin server route requests a
temporary signed URL from ElevenLabs using `ELEVENLABS_API_KEY`; the API key is
never returned to or bundled into the browser.

`POST /api/survey/voice-session`:

- is a deliberate public exception to CX session authentication;
- supports only the configured fixed agent ID;
- accepts no caller-supplied agent ID, prompt, voice, or tool override;
- requires a same-origin browser request;
- applies rate limiting before requesting the signed URL;
- returns only the temporary connection credential and its relevant metadata;
- uses `Cache-Control: no-store`.

The browser requests microphone permission first, then requests the signed URL,
so unused credentials are not generated after a permission denial.

## Unified Ingest

### Shared Service

Extract the normalized ingest behavior currently embedded in the webhook route
into a focused server-only service. Its input contains:

- stable source conversation ID;
- source type (`elevenlabs` or `typed`);
- first name, last name, combined name, and company;
- language;
- normalized answers;
- raw JSON payload;
- start and completion timestamps.

The service:

1. upserts the `Response` by `conversationId`;
2. creates or updates its linked `Client` data without creating a second
   response on retry;
3. calculates the average rating;
4. generates one `ResponseInsight` if absent;
5. generates one `ResponseEmbedding` if absent;
6. recomputes PII-free aggregates.

Insight and embedding failures remain non-fatal to response storage, matching
the existing webhook behavior. They are logged server-side and do not expose
provider details to respondents.

The signed webhook route remains responsible for signature verification and
ElevenLabs payload parsing, then passes normalized data to the shared service.
Its accepted payload type and `conversation_id` idempotency do not change.

### Typed Submission

`POST /api/survey/typed` is a deliberate public write-only exception to CX
session authentication. It never provides a corresponding public read endpoint.

The browser creates a UUID when the form is initialized and reuses it for every
retry of that submission. The server maps it to
`typed_<submission UUID>` as the `conversationId`, preventing duplicate rows.

The raw JSONB payload records:

- source `typed`;
- submission UUID;
- separate first and last names;
- company;
- rating and observations;
- server receipt timestamp.

The normalized answer uses question number `1`, the approved question text,
rating, optional observation text, and `reason_method: "typed"`.

The endpoint validates field types, lengths, UUID format, rating bounds, and the
honeypot before calling the shared ingest service. It returns a generic success
response with no private response data.

## Abuse Protection

Both public survey endpoints enforce:

- JSON content type where applicable;
- same-origin `Origin` and Fetch Metadata checks;
- strict Zod schemas and conservative text length limits;
- no-store responses;
- a per-action, per-client rate limit;
- generic errors that do not reveal secrets or provider responses.

Rate-limit identifiers are one-way HMACs of the forwarded client address and
user-agent using `NEXTAUTH_SECRET`. Store only the digest in a
`SurveyRateLimit` table with `action`, `windowStart`, and `count`; do not store
raw IP addresses or user-agent strings. A unique constraint on digest, action,
and window enables an atomic increment across Vercel instances.

Use a ten-minute fixed window with these initial limits:

- 10 voice-session requests per client digest;
- 20 typed submission attempts per client digest.

Expired windows may be deleted opportunistically. The implementation must not
rely only on process memory.

The typed honeypot is an additional signal, not the primary control.

## Authentication Boundaries

The existing default rule remains: APIs require a CX session unless explicitly
public.

The complete unauthenticated exceptions are:

- `GET /api/public/*`, restricted to aggregate tables;
- `POST /api/webhooks/elevenlabs`, protected by ElevenLabs signature;
- `POST /api/survey/voice-session`, protected by fixed-agent scope,
  same-origin checks, validation, and rate limiting;
- `POST /api/survey/typed`, write-only and protected by same-origin checks,
  validation, honeypot, idempotency, and rate limiting.

No survey endpoint returns names, companies, observations, insights, or other
stored response data.

## Error Handling

- Microphone denial: explain how to retry and offer the typed path.
- Signed URL failure: show a retryable connection error without exposing the
  ElevenLabs response.
- Mid-call disconnect: allow a new session; the post-call webhook remains the
  authority for whether the interrupted conversation produced a response.
- Typed validation error: preserve input and focus the first invalid field.
- Duplicate typed retry: return success for the existing idempotent response.
- Database failure: return a generic retryable error and log details server-side.
- OpenAI enrichment failure: preserve the stored survey and return success; log
  the enrichment failure.
- Aggregate failure: preserve the stored survey and return success; log the
  aggregate failure.

## Accessibility and Privacy

- All controls have visible labels and keyboard focus.
- The waveform is not the sole indication of listening or speaking state.
- Status changes use an appropriate live region without announcing every audio
  animation frame.
- Rating controls expose their numeric value and selected state.
- Color contrast meets WCAG AA for normal text and controls.
- Reduced-motion users receive a restrained, non-pulsing state indicator.
- The page explains that voice audio is handled by the configured voice service
  and that submitted feedback is used for service-improvement analysis.
- No analytics or third-party tracking is added as part of this feature.

## Verification

### Automated

- Unit tests for normalized payload construction and first/last-name combining.
- Webhook parser tests for both new split-name fields and legacy `client_name`.
- Signature and duplicate `conversation_id` tests remain passing.
- Typed schema tests cover valid submission, invalid rating, excessive lengths,
  honeypot rejection, and duplicate submission UUID.
- Authentication-boundary tests prove the two survey POST routes are public
  write/session exceptions while private APIs remain gated.
- Query-boundary tests prove `/api/public/*` still reads only
  `CsatSnapshot` and `ThemeRollup`.
- Voice-session tests prove caller-controlled agent IDs and overrides are
  impossible and the API key is never returned.
- Shared-ingest tests prove both source types create `Response`, `Client`,
  `ResponseInsight`, `ResponseEmbedding`, and updated aggregates.
- Component tests cover mode selection, form validation, microphone denial,
  connecting, listening, speaking, disconnected, and completed states.
- `npx tsc --noEmit`, lint, and `npm run build` pass.

### Browser and End-to-End

- Verify desktop and mobile layouts in the in-app browser.
- Complete a typed survey and confirm exactly one database response exists after
  a retry.
- Confirm the typed response appears in the CX dashboard and is retrievable by
  the RAG chatbot.
- Start and complete a real voice survey using the existing agent.
- Confirm the signed webhook creates one response with combined client name,
  company, rating, observations, insight, embedding, and aggregates.
- Confirm microphone denial and connection failure both offer usable recovery.
- Confirm the public CSAT response and widget contain no PII or verbatims.

## Environment and Deployment

Add these server-side production variables:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID=agent_6401ktv5yqkmf2a95qpd3nh62380`

Continue using:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `ELEVENLABS_WEBHOOK_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

Deploy through the existing GitHub-linked Vercel project. Configure the
ElevenLabs agent/webhook only after the application routes are deployed and
verified. The existing webhook URL remains:

`https://rsm-voc-platform.vercel.app/api/webhooks/elevenlabs`

## Out of Scope

- Creating a replacement ElevenLabs agent.
- Arabic survey content or automatic translation.
- Changing the approved survey question set.
- Public response lookup or respondent accounts.
- Email capture, CRM synchronization, exports, or new dashboards.
- Publishing raw comments in the public widget.
- Reworking the CX dashboard beyond confirming that both new submission paths
  appear correctly.
