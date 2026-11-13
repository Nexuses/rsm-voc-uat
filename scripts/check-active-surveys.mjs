// Pre-deploy safety check: is anyone part-way through a survey right now?
//
// A voice survey runs 20-30 minutes, and the conversation itself lives on
// ElevenLabs rather than on this server. The risk of deploying mid-survey is
// therefore not the call dropping — it is that the browser tab still holds
// assets from the old build, so a lazy-loaded chunk or Server Action can fail
// after the swap and the respondent loses their progress.
//
// Exit codes:
//   0  no survey started inside the window — safe to deploy
//   10 at least one survey is still in progress
//   1  could not determine (missing DATABASE_URL, database unreachable)
//
// Limitation: this only sees surveys reached through a tracked invite link
// (SurveyInvite.startedAt). An anonymous visitor who opened /survey directly is
// not recorded, so this reduces the risk of deploying on top of a live session
// but cannot rule it out.

import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(path) {
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

const windowMinutes = Number(process.env.ACTIVE_SURVEY_WINDOW_MINUTES ?? 45);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — cannot check for active surveys.");
  process.exit(1);
}

const db = new PrismaClient({ log: ["error"] });

try {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const active = await db.surveyInvite.count({
    where: {
      startedAt: { gte: since },
      completedAt: null,
    },
  });

  if (active > 0) {
    console.error(
      `${active} survey(s) started in the last ${windowMinutes} minutes and have not completed.`
    );
    process.exit(10);
  }

  console.log(`No survey started in the last ${windowMinutes} minutes is still open.`);
  process.exit(0);
} catch (error) {
  console.error("Active-survey check failed:", error.message);
  process.exit(1);
} finally {
  await db.$disconnect();
}
