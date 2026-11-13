import { existsSync, readFileSync } from "node:fs";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

async function main() {
  const { db } = await import("@/lib/db");
  const { isCompleteSurveyResponse } = await import("@/lib/survey/metrics");
  const { sendSurveyCompletionNotifications } = await import(
    "@/lib/survey-thankyou-email"
  );

  const responses = await db.response.findMany({
    where: {
      csatScore: { not: null },
      cesScore: { not: null },
      npsScore: { not: null },
      OR: [
        { teamNotifySentAt: null },
        {
          surveyInvite: {
            is: {
              thankYouSentAt: null,
              email: { not: "" },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      conversationId: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      completedAt: true,
      teamNotifySentAt: true,
      surveyInvite: {
        select: {
          email: true,
          thankYouSentAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = responses.filter((response) =>
    isCompleteSurveyResponse(response)
  );

  if (!pending.length) {
    console.log("No pending completion notifications.");
    return;
  }

  console.log(
    `Resending completion notifications for ${pending.length} response(s)...`
  );

  for (const response of pending) {
    const result = await sendSurveyCompletionNotifications(response.id);
    console.log(
      JSON.stringify({
        responseId: response.id,
        conversationId: response.conversationId,
        client: result.client,
        team: result.team,
      })
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
