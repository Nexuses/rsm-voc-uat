<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RSM Voice of Clients Project Memory

These instructions are mandatory for every task in this repository.

## Before Any Task

1. Read `PROJECT_BRIEF.md` in full.
2. Read `MEMORY.md` in full.
3. Read the files named by the brief that are relevant to the task.
4. Check `git status` and preserve user changes.
5. Treat `SKILL.md`, `reference/`, and `starter/` as read-only.

Do not start implementation, database work, deployment, or recommendations
before the project brief and memory have been loaded.

## After Context Reset Or Handoff

If the conversation is compacted, restarted, resumed later, or handed to
another agent:

1. Re-read `PROJECT_BRIEF.md` and `MEMORY.md`.
2. Re-check `git status`, the current branch, and the active diff.
3. Resume from the latest task-history entry and verified repository state, not
   from conversational memory alone.

## Binding Product Rules

- Public UI and every `/api/public/*` route may read only `CsatSnapshot`,
  `ThemeRollup`, and `PublicReviewSnippet`. Never query or expose `Response`,
  `Client`, or `ResponseInsight` on a public route. `PublicReviewSnippet` may
  include respondent name and company for showcase attribution; never email,
  phone, or other contact fields. Comment text must still be sanitized.
- Verify the ElevenLabs webhook signature before parsing or trusting the body.
- Upsert responses by `conversationId`; webhook retries must not duplicate data.
- Store the complete raw webhook payload and the normalized response.
- Do not invent survey questions, Arabic text, client facts, or RSM policy.
- Never commit secrets, passwords, connection strings, API-key values, or
  private client data to documentation or source control.

## After Every Task

Before declaring the task complete:

1. Update `MEMORY.md` with the date, task summary, files or systems changed,
   verification performed, deployment/database effects, and any follow-up.
2. Update `PROJECT_BRIEF.md` when stable architecture, routes, schema,
   integrations, setup, security rules, or operational procedures changed.
3. Run `npm run memory:check`.
4. Include the documentation updates in the same commit as the task whenever a
   commit is requested or appropriate.

Even documentation-only, investigation, configuration, database, and deployment
tasks must receive a `MEMORY.md` entry. If a task made no project change, record
that explicitly and summarize what was verified or decided.

## Memory Hygiene

- `PROJECT_BRIEF.md` is the stable source of truth. Keep it concise and current.
- `MEMORY.md` is the operational handoff and append-only task history. Update the
  current-state sections when facts change; do not rewrite older history.
- Record environment variable names, purpose, source, and storage location, but
  never their values.
- Record database counts only as dated snapshots; they are not durable facts.
- Resolve contradictions by checking current code, migrations, deployed
  configuration, and tests. Note the resolution in memory.
