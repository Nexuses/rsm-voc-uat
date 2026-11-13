# RSM Voice of Clients Survey Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy an English-only public RSM Kuwait survey with an existing ElevenLabs voice agent and an equivalent typed form, both feeding the current insight, embedding, aggregate, dashboard, and RAG pipeline.

**Architecture:** The public UI lives at `/survey`, with `/` redirecting there. Voice sessions receive a short-lived signed ElevenLabs URL from a fixed-agent server route, while typed submissions pass through a write-only server route; both sources normalize into a shared server-only ingest service. Database-backed rate limiting and strict same-origin checks protect the two public POST routes without weakening the snapshot-only public read API.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma/Postgres/pgvector, Zod, ElevenLabs React SDK, Vitest, Testing Library, Vercel.

---

## File Map

**Create**

- `lib/survey/constants.ts` - approved English question and source constants.
- `lib/survey/schema.ts` - typed submission and normalized ingest schemas/types.
- `lib/survey/request-security.ts` - content type, same-origin, client digest, and rate-limit helpers.
- `lib/survey/ingest.ts` - shared response upsert, enrichment, embedding, and aggregate orchestration.
- `lib/elevenlabs/payload.ts` - signed webhook payload schema and normalization.
- `lib/elevenlabs/client.ts` - server-only signed URL request.
- `app/api/survey/typed/route.ts` - public write-only typed survey endpoint.
- `app/api/survey/voice-session/route.ts` - fixed-agent signed URL endpoint.
- `app/survey/page.tsx` - survey route.
- `components/survey/SurveyExperience.tsx` - mode and completion state coordinator.
- `components/survey/ModeChooser.tsx` - voice/typed selection.
- `components/survey/VoiceSurvey.tsx` - ElevenLabs SDK state and controls.
- `components/survey/VoiceOrb.tsx` - accessible animated waveform control.
- `components/survey/TypedSurvey.tsx` - validated typed survey form.
- `components/survey/SurveyShell.tsx` - shared branded page frame.
- `components/survey/survey.module.css` - approved visual system and responsive animation.
- `scripts/configure-elevenlabs-agent.mts` - backup and minimal agent prompt/data-collection update.
- `scripts/verify-survey-e2e.mts` - typed ingest, idempotency, private pipeline, and public PII verification.
- `vitest.config.ts`, `vitest.setup.ts` - unit/component test environment.
- `tests/survey/*.test.ts(x)` - focused schema, parser, security, API, and UI tests.
- `prisma/migrations/20260612090000_add_survey_rate_limit/migration.sql` - distributed rate-limit table.

**Modify**

- `package.json` - ElevenLabs SDK and test dependencies/scripts.
- `prisma/schema.prisma` - `SurveyRateLimit` model.
- `app/api/webhooks/elevenlabs/route.ts` - retain signature verification and delegate normalized ingest.
- `app/page.tsx` - redirect to `/survey`.
- `app/layout.tsx` - RSM metadata.
- `app/globals.css` - neutral global base without changing dashboard behavior.
- `.env.example` - add `ELEVENLABS_AGENT_ID`.
- `.gitignore` - ignore `.superpowers/` visual-companion scratch files and agent backups.
- `README.md` - survey setup, agent configuration, and verification commands.

## Task 1: Test Harness and Survey Contracts

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `lib/survey/constants.ts`
- Create: `lib/survey/schema.ts`
- Test: `tests/survey/schema.test.ts`

- [ ] **Step 1: Add test and ElevenLabs packages**

Run:

```bash
npm install @elevenlabs/react
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Add scripts:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Expected: install exits `0` without peer dependency errors.

- [ ] **Step 2: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Write failing schema tests**

Cover:

```ts
expect(APPROVED_SURVEY_QUESTION).toBe(
  "How satisfied are you with our overall service?"
);
expect(typedSurveySchema.parse(validPayload).rating).toBe(5);
expect(() => typedSurveySchema.parse({ ...validPayload, rating: 6 })).toThrow();
expect(() =>
  typedSurveySchema.parse({ ...validPayload, website: "spam" })
).toThrow();
expect(combineClientName("  Noor ", " Al-Sabah ")).toBe("Noor Al-Sabah");
```

- [ ] **Step 4: Run the schema test and confirm failure**

Run:

```bash
npm test -- tests/survey/schema.test.ts
```

Expected: fail because `lib/survey/constants.ts` and `lib/survey/schema.ts` do not exist.

- [ ] **Step 5: Implement constants and schemas**

Define:

```ts
export const APPROVED_SURVEY_QUESTION =
  "How satisfied are you with our overall service?";
export const SURVEY_LANGUAGE = "en";
export const TYPED_CONVERSATION_PREFIX = "typed_";
```

Define `typedSurveySchema` with:

```ts
{
  submissionId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  company: z.string().trim().min(1).max(160),
  rating: z.coerce.number().int().min(1).max(5),
  observations: z.string().trim().max(2000).default(""),
  website: z.literal("").default("")
}
```

Export `combineClientName(firstName, lastName)` and normalized ingest types with
`source`, `conversationId`, identity fields, language, answers, raw payload, and
timestamps.

- [ ] **Step 6: Run the schema test**

Run:

```bash
npm test -- tests/survey/schema.test.ts
```

Expected: all schema tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts lib/survey tests/survey/schema.test.ts
git commit -m "test: add survey contracts and harness"
```

## Task 2: Database-Backed Public Request Protection

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260612090000_add_survey_rate_limit/migration.sql`
- Create: `lib/survey/request-security.ts`
- Test: `tests/survey/request-security.test.ts`

- [ ] **Step 1: Write failing security tests**

Test these exact cases:

```ts
expect(validatePublicPost(requestFrom("https://rsm-voc-platform.vercel.app"))).toEqual({
  ok: true,
});
expect(validatePublicPost(requestFrom("https://attacker.example")).ok).toBe(false);
expect(validatePublicPost(requestWithoutJson()).ok).toBe(false);
expect(clientDigest(request, "secret")).toMatch(/^[a-f0-9]{64}$/);
expect(clientDigest(request, "secret")).not.toContain("203.0.113.10");
```

Mock the Prisma increment helper and verify the 11th voice request and 21st typed
request in the same ten-minute window return `allowed: false`.

- [ ] **Step 2: Run security tests and confirm failure**

Run:

```bash
npm test -- tests/survey/request-security.test.ts
```

Expected: fail because the request-security module does not exist.

- [ ] **Step 3: Add the Prisma model and SQL migration**

Add:

```prisma
model SurveyRateLimit {
  id          String   @id @default(uuid())
  digest      String
  action      String
  windowStart DateTime
  count       Int      @default(1)
  updatedAt   DateTime @updatedAt

  @@unique([digest, action, windowStart])
  @@index([windowStart])
}
```

Create SQL matching the Prisma table, unique index, and window index. Run:

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected: migration applies and Prisma client generation exits `0`.

- [ ] **Step 4: Implement request validation and atomic rate limiting**

`validatePublicPost` must:

- require `application/json`;
- reject `Sec-Fetch-Site: cross-site`;
- require `Origin` to equal `new URL(request.url).origin`;
- return `{ ok: false, status: 403 | 415, error: string }` on failure.

`clientDigest` must HMAC-SHA256 the first forwarded address plus user-agent with
`NEXTAUTH_SECRET`.

`consumeSurveyRateLimit` must round the current time down to a ten-minute window,
atomically upsert/increment `SurveyRateLimit`, and enforce:

```ts
const LIMITS = { voice: 10, typed: 20 } as const;
```

- [ ] **Step 5: Run security tests**

Run:

```bash
npm test -- tests/survey/request-security.test.ts
```

Expected: all request-security tests pass.

- [ ] **Step 6: Commit**

```bash
git add prisma lib/survey/request-security.ts tests/survey/request-security.test.ts
git commit -m "feat: protect public survey writes"
```

## Task 3: Shared Ingest and Backward-Compatible Webhook Parsing

**Files:**
- Create: `lib/survey/ingest.ts`
- Create: `lib/elevenlabs/payload.ts`
- Modify: `app/api/webhooks/elevenlabs/route.ts`
- Modify: `__fixtures__/elevenlabs-post-call-transcription.json`
- Test: `tests/survey/elevenlabs-payload.test.ts`
- Test: `tests/survey/ingest.test.ts`

- [ ] **Step 1: Write failing parser tests**

Test split fields:

```ts
expect(normalizeElevenLabsPayload(splitNameFixture)).toMatchObject({
  source: "elevenlabs",
  firstName: "Noor",
  lastName: "Al-Sabah",
  clientName: "Noor Al-Sabah",
  company: "Example Co",
  answers: [{
    question_number: 1,
    question_text: APPROVED_SURVEY_QUESTION,
    rating: 4,
    reason_text: "Responsive team",
    reason_method: "spoken",
  }],
});
```

Also prove legacy `client_name` remains accepted, invalid ratings are rejected,
and timestamps retain the existing fallback behavior.

- [ ] **Step 2: Run parser tests and confirm failure**

Run:

```bash
npm test -- tests/survey/elevenlabs-payload.test.ts
```

Expected: fail because `lib/elevenlabs/payload.ts` does not exist.

- [ ] **Step 3: Extract the parser**

Move only validation/normalization from the webhook into
`lib/elevenlabs/payload.ts`. Keep support for `q1` through `q20`, but attach the
approved question text only to `q1`; preserve unknown later question text as
undefined rather than inventing it.

Name resolution order:

1. combine `client_first_name` and `client_last_name`;
2. fall back to legacy `client_name`;
3. leave name undefined if neither exists.

- [ ] **Step 4: Write failing ingest service tests**

Mock `db`, insight generation, embedding, and aggregate recomputation. Verify:

- first ingest creates one response/client and calls enrichment;
- retry with the same conversation ID updates response/client without a second
  response;
- existing insight and embedding are reused;
- OpenAI or aggregate errors do not reject stored ingest.

- [ ] **Step 5: Run ingest tests and confirm failure**

Run:

```bash
npm test -- tests/survey/ingest.test.ts
```

Expected: fail because `lib/survey/ingest.ts` does not exist.

- [ ] **Step 6: Extract shared ingest**

Move `ensureInsightAndEmbedding` from the webhook into `lib/survey/ingest.ts`.
Implement `ingestSurveyResponse(input)` so a retry updates the existing linked
client through nested relation update when present and creates one when absent.
Return `{ responseId, created }`.

Catch enrichment and aggregate failures separately after the response upsert.
Do not catch the database upsert failure.

- [ ] **Step 7: Reduce webhook route to security plus delegation**

The route order remains:

1. read raw body;
2. verify `elevenlabs-signature`;
3. JSON parse;
4. normalize payload;
5. call `ingestSurveyResponse`;
6. return `{ ok: true, responseId }`.

Update the fixture to use `client_first_name` and `client_last_name`, while
retaining parser tests for a synthesized legacy payload.

- [ ] **Step 8: Run focused and legacy verification**

Run:

```bash
npm test -- tests/survey/elevenlabs-payload.test.ts tests/survey/ingest.test.ts
npx tsc --noEmit
```

Then, with the dev server running:

```bash
node scripts/verify-webhook-ingest.mjs
node scripts/verify-insight-on-ingest.mjs
```

Expected: tests and typecheck pass; both scripts print their existing `PASS`
lines and only one fixture response row exists.

- [ ] **Step 9: Commit**

```bash
git add lib/elevenlabs lib/survey/ingest.ts app/api/webhooks __fixtures__ tests/survey
git commit -m "refactor: share survey ingest pipeline"
```

## Task 4: Typed Survey API

**Files:**
- Create: `app/api/survey/typed/route.ts`
- Test: `tests/survey/typed-route.test.ts`
- Create: `scripts/verify-survey-e2e.mts`
- Modify: `package.json`

- [ ] **Step 1: Write failing route tests**

Mock request security, rate limiting, and ingest. Verify:

- cross-origin request returns `403`;
- non-JSON request returns `415`;
- invalid rating returns `400`;
- populated honeypot returns `400`;
- rate-limit denial returns `429`;
- valid payload maps to `typed_` plus the submitted UUID, combines the name, uses the approved
  question, sets `reason_method: "typed"`, and returns only `{ ok: true }`;
- retrying the same UUID passes the same conversation ID.

- [ ] **Step 2: Run route tests and confirm failure**

Run:

```bash
npm test -- tests/survey/typed-route.test.ts
```

Expected: fail because the typed route does not exist.

- [ ] **Step 3: Implement the typed POST route**

The handler must:

```ts
const security = validatePublicPost(request);
const parsed = typedSurveySchema.safeParse(await request.json());
const allowed = await consumeSurveyRateLimit(request, "typed");
await ingestSurveyResponse({
  source: "typed",
  conversationId: `typed_${parsed.data.submissionId}`,
  firstName: parsed.data.firstName,
  lastName: parsed.data.lastName,
  clientName: combineClientName(parsed.data.firstName, parsed.data.lastName),
  company: parsed.data.company,
  language: "en",
  answers: [{
    question_number: 1,
    question_text: APPROVED_SURVEY_QUESTION,
    rating: parsed.data.rating,
    reason_text: parsed.data.observations || undefined,
    reason_method: "typed",
  }],
  rawPayload: { source: "typed", ...parsed.data, receivedAt: now.toISOString() },
  startedAt: now,
  completedAt: now,
});
```

Strip `website` from `rawPayload`. Every response uses `Cache-Control:
no-store`. Return generic JSON errors without Prisma/OpenAI details.

- [ ] **Step 4: Run route tests**

Run:

```bash
npm test -- tests/survey/typed-route.test.ts
```

Expected: all typed route tests pass.

- [ ] **Step 5: Add the typed E2E verifier**

The script must:

- generate one submission UUID;
- POST the same valid payload twice with localhost origin/fetch headers;
- assert both responses are `200`;
- query Prisma for exactly one response whose ID is `typed_` plus the generated UUID;
- assert client name/company, rating, insight, and 1536-dimension embedding;
- assert the response appears through authenticated `/api/insights`;
- assert `/api/public/csat` contains no submitted PII or observation;
- delete the test response/client/rate-limit rows and recompute aggregates.

Add:

```json
"verify:survey": "tsx scripts/verify-survey-e2e.mts"
```

- [ ] **Step 6: Commit**

```bash
git add app/api/survey/typed tests/survey/typed-route.test.ts scripts/verify-survey-e2e.mts package.json
git commit -m "feat: ingest typed survey submissions"
```

## Task 5: Secure ElevenLabs Voice Session and Agent Configuration

**Files:**
- Create: `lib/elevenlabs/client.ts`
- Create: `app/api/survey/voice-session/route.ts`
- Create: `scripts/configure-elevenlabs-agent.mts`
- Test: `tests/survey/voice-session-route.test.ts`
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Write failing signed URL tests**

Mock `fetch` and verify `getElevenLabsSignedUrl()`:

- reads `ELEVENLABS_AGENT_ID` and `ELEVENLABS_API_KEY`;
- requests
  `GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=agent_6401ktv5yqkmf2a95qpd3nh62380&include_conversation_id=true`;
- sends the key only as `xi-api-key`;
- returns `signed_url` and optional `conversation_id`;
- throws a generic server error for non-200 or malformed provider responses.

Route tests prove request bodies cannot supply an agent ID, prompt, voice, or
override, and the JSON response contains no API key.

- [ ] **Step 2: Run voice route tests and confirm failure**

Run:

```bash
npm test -- tests/survey/voice-session-route.test.ts
```

Expected: fail because the client and route do not exist.

- [ ] **Step 3: Implement the ElevenLabs client and public route**

The route uses `validatePublicPost`, consumes the `voice` limit, ignores all
request fields by requiring an empty object, calls the fixed-agent helper, and
returns:

```ts
{
  signedUrl: result.signed_url,
  conversationId: result.conversation_id ?? null
}
```

Use `Cache-Control: no-store`.

- [ ] **Step 4: Run voice route tests**

Run:

```bash
npm test -- tests/survey/voice-session-route.test.ts
```

Expected: all voice-session tests pass.

- [ ] **Step 5: Add environment and ignore rules**

Add:

```dotenv
ELEVENLABS_AGENT_ID=agent_6401ktv5yqkmf2a95qpd3nh62380
```

Ignore:

```gitignore
/.superpowers/
/backups/elevenlabs/
```

- [ ] **Step 6: Build the idempotent agent configuration script**

The script must:

1. load `.env.local`;
2. GET the configured agent;
3. write a timestamped JSON backup under `backups/elevenlabs/`;
4. preserve voice, ASR, turn, LLM, tools, and unrelated platform settings;
5. replace only `conversation_config.agent.first_message`,
   `conversation_config.agent.prompt.prompt`, language, and
   `platform_settings.data_collection`;
6. PATCH `/v1/convai/agents/{agentId}`;
7. GET the agent again and assert all six required data-collection keys exist.

The prompt must use this approved sequence:

```text
You are the RSM Kuwait Voice of Clients survey agent.
Speak in English.
Introduce yourself as an RSM Kuwait agent and explain that this short survey
helps RSM improve its service.
Ask for the client's first name, then last name, then business or company name.
Ask exactly: "How satisfied are you with our overall service?"
Accept a whole-number rating from 1 to 5 and confirm it when unclear.
Then ask for any additional observations about the service.
Thank the client and end the survey.
Do not ask for email, phone number, or any additional survey question.
```

Configure string extraction for identity/reason/language and number extraction
for `q1_rating`, using descriptions that repeat only the approved fields.

Add:

```json
"elevenlabs:configure": "tsx scripts/configure-elevenlabs-agent.mts"
```

- [ ] **Step 7: Run the script and inspect the diff**

Run:

```bash
npm run elevenlabs:configure
```

Expected output includes the agent ID, backup path, HTTP success, and the six
verified data-collection keys. Do not print the API key or full prompt payload.

- [ ] **Step 8: Commit**

```bash
git add lib/elevenlabs/client.ts app/api/survey/voice-session scripts/configure-elevenlabs-agent.mts tests/survey/voice-session-route.test.ts .env.example .gitignore package.json
git commit -m "feat: issue secure ElevenLabs voice sessions"
```

## Task 6: Approved Survey Frontend

**Files:**
- Create: `app/survey/page.tsx`
- Create: `components/survey/SurveyShell.tsx`
- Create: `components/survey/ModeChooser.tsx`
- Create: `components/survey/VoiceOrb.tsx`
- Create: `components/survey/VoiceSurvey.tsx`
- Create: `components/survey/TypedSurvey.tsx`
- Create: `components/survey/SurveyExperience.tsx`
- Create: `components/survey/survey.module.css`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Test: `tests/survey/survey-experience.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Mock `@elevenlabs/react` and `fetch`. Verify:

- initial screen shows both survey choices;
- typed selection shows all required identity/rating fields and exact approved
  question;
- invalid typed submit displays field errors and does not fetch;
- valid typed submit posts one UUID-backed payload and shows thank-you;
- voice start calls `getUserMedia` before requesting the signed URL;
- microphone denial shows retry and typed fallback;
- SDK status/mode maps to visible `Connecting`, `Listening`, and `Speaking`;
- end button calls `endSession`;
- reduced-motion styling does not remove textual state.

- [ ] **Step 2: Run UI tests and confirm failure**

Run:

```bash
npm test -- tests/survey/survey-experience.test.tsx
```

Expected: fail because survey components do not exist.

- [ ] **Step 3: Implement the shared shell and mode chooser**

`SurveyShell` renders:

- RSM Kuwait wordmark treatment;
- `Voice of Clients` heading;
- short privacy/service-improvement copy;
- content card;
- footer link to CX team login.

`ModeChooser` uses semantic buttons and concise descriptions for voice and
typed modes.

- [ ] **Step 4: Implement typed interaction**

Use controlled form values and `typedSurveySchema` client-side for immediate
feedback, while treating server validation as authoritative. Create the
submission UUID once with `crypto.randomUUID()` and retain it across retries.
Use a `fieldset`/radio group for 1-5 ratings, focus the first invalid field, and
preserve input after network errors.

- [ ] **Step 5: Implement voice interaction**

Use `useConversation` from `@elevenlabs/react`. Start flow:

```ts
await navigator.mediaDevices.getUserMedia({ audio: true });
const response = await fetch("/api/survey/voice-session", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
const { signedUrl } = await response.json();
await conversation.startSession({ signedUrl });
```

Map SDK `status`, `isSpeaking`, and messages to visible state. Provide mute,
unmute, end, retry, and typed fallback controls. Do not send collected identity
or survey answers from the browser; the post-call webhook remains authoritative.

- [ ] **Step 6: Implement the orb and responsive visual system**

The orb contains five CSS waveform bars and has variants for ready, connecting,
listening, speaking, muted, error, and complete. CSS must include:

- RSM red `#e31b23`, charcoal, warm-white, and pale-neutral variables;
- responsive card width and spacing;
- 44px minimum interactive targets;
- visible `:focus-visible` rings;
- `prefers-reduced-motion: reduce` rules disabling pulse/bar animation;
- mobile layout at `max-width: 640px`;
- status text independent from waveform color/motion.

- [ ] **Step 7: Wire routes and metadata**

`app/survey/page.tsx` renders `SurveyExperience`. `app/page.tsx` uses:

```ts
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/survey");
}
```

Set metadata title to `RSM Kuwait | Voice of Clients` and description to a short
service-improvement survey description.

- [ ] **Step 8: Run UI and static verification**

Run:

```bash
npm test -- tests/survey/survey-experience.test.tsx
npx tsc --noEmit
npm run lint
```

Expected: all tests pass and both static checks exit `0`.

- [ ] **Step 9: Verify visually in the in-app browser**

Run the app, open `/survey`, and inspect:

- desktop at 1440x900;
- mobile at 390x844;
- mode selection;
- typed validation and success;
- voice permission/connecting/listening/speaking/error states;
- keyboard navigation and visible focus;
- no horizontal scrolling.

Fix only issues found in these states, rerun the UI tests, then commit:

```bash
git add app components/survey tests/survey/survey-experience.test.tsx
git commit -m "feat: add RSM public voice survey experience"
```

## Task 7: Full Verification, Documentation, and Production Deployment

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Modify: any files required by verified defects only

- [ ] **Step 1: Document operation**

Document:

- `/survey`, typed and voice modes;
- `ELEVENLABS_AGENT_ID`;
- `npm run elevenlabs:configure`;
- webhook URL;
- `npm run verify:survey`;
- voice responses arrive asynchronously through signed post-call webhook;
- public PII boundary and English-only scope.

- [ ] **Step 2: Run the complete local suite**

With the local server running:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run verify:survey
node scripts/verify-webhook-ingest.mjs
node scripts/verify-public-csat.mjs
```

Expected: every command exits `0`; verification scripts print their `PASS`
lines; public output contains no test identity or observation.

- [ ] **Step 3: Inspect the final diff and secrets**

Run:

```bash
git diff --check
git status --short
git diff --exit-code -- SKILL.md reference starter
git grep -nE 'sk-[A-Za-z0-9_-]{20,}|xi-api-key[\"'\"']?\\s*[:=]\\s*[\"'\"'][^$]' -- ':!package-lock.json'
```

Expected: no whitespace errors, only intended files changed, `SKILL.md`,
`reference/`, and `starter/` remain unchanged, and there are no secret matches.

- [ ] **Step 4: Commit documentation and verified fixes**

```bash
git add README.md package.json package-lock.json
git commit -m "docs: document survey deployment and verification"
```

Stage any verified defect fixes by their exact paths before this commit.

- [ ] **Step 5: Configure Vercel environment**

Confirm these production variables exist without printing their values:

```text
DATABASE_URL
OPENAI_API_KEY
ELEVENLABS_WEBHOOK_SECRET
ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID
NEXTAUTH_SECRET
NEXTAUTH_URL
```

Add `ELEVENLABS_AGENT_ID` if absent and synchronize the existing
`ELEVENLABS_API_KEY` from local secure environment if production lacks it.

- [ ] **Step 6: Push and deploy**

```bash
git push origin main
vercel --prod
```

Expected: GitHub push succeeds and Vercel reports a ready production deployment
for `https://rsm-voc-platform.vercel.app`.

- [ ] **Step 7: Verify production**

Check:

```bash
curl -I https://rsm-voc-platform.vercel.app/
curl -I https://rsm-voc-platform.vercel.app/survey
curl -sS https://rsm-voc-platform.vercel.app/api/public/csat
```

Expected: `/` redirects to `/survey`, `/survey` returns `200`, and public CSAT
contains aggregate keys only.

Use the in-app browser to submit one production typed test and start one voice
session. Confirm the typed row reaches the dashboard and that the voice agent
uses the approved English identity and survey sequence. Delete only the
production test response after verification, recompute aggregates, and leave
the configured agent active.

- [ ] **Step 8: Final status**

Report:

- Git commit hashes;
- local test/build output summary;
- production URL and webhook URL;
- ElevenLabs agent ID and confirmed data-collection fields;
- any verification that requires a human voice interaction and its result.
