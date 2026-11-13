/**
 * Copy SurveyInvite.email onto Client for voice responses that completed via
 * tracked invite but never asked for email in the conversation.
 *
 *   npx tsx scripts/repair-voice-invite-emails.mts
 *
 * Then optionally:
 *   npx tsx scripts/repair-quarterly-overwrite.mts
 */
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { db } = await import("../lib/db");
const { backfillResponseClientEmailFromInvite } = await import(
  "../lib/survey-invite-tracking"
);

const invites = await db.surveyInvite.findMany({
  where: {
    responseId: { not: null },
  },
  select: {
    email: true,
    responseId: true,
    response: {
      select: {
        id: true,
        conversationId: true,
        client: { select: { email: true } },
      },
    },
  },
});

let updated = 0;
let skipped = 0;

for (const invite of invites) {
  if (!invite.responseId || !invite.response) {
    skipped += 1;
    continue;
  }
  if (invite.response.conversationId.startsWith("typed_")) {
    skipped += 1;
    continue;
  }
  const result = await backfillResponseClientEmailFromInvite(
    invite.responseId,
    invite.email
  );
  if (result.updated) {
    updated += 1;
    console.log(
      `Backfilled ${invite.email} onto response ${invite.responseId}`
    );
  } else {
    skipped += 1;
  }
}

console.log(`Done. Updated ${updated}, skipped ${skipped}.`);
await db.$disconnect();
