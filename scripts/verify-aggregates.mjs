import crypto from "node:crypto";
import fs from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;

if (!secret) {
  throw new Error("ELEVENLABS_WEBHOOK_SECRET is required");
}

const fixtureUrl = new URL(
  "../__fixtures__/elevenlabs-post-call-transcription.json",
  import.meta.url
);
const rawBody = await fs.readFile(fixtureUrl, "utf8");
const payload = JSON.parse(rawBody);
const conversationId = payload.data.conversation_id;
const period = "2026-06";
const timestamp = Math.floor(Date.now() / 1000).toString();
const digest = crypto
  .createHmac("sha256", secret)
  .update(`${timestamp}.${rawBody}`)
  .digest("hex");
const db = new PrismaClient();

try {
  await db.response.deleteMany({ where: { conversationId } });
  await db.csatSnapshot.deleteMany({ where: { period } });
  await db.themeRollup.deleteMany({ where: { period } });

  const webhookResponse = await fetch(
    `${baseUrl}/api/webhooks/elevenlabs`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "elevenlabs-signature": `t=${timestamp},v0=${digest}`,
      },
      body: rawBody,
    }
  );
  console.log(`POST fixture: ${webhookResponse.status}`);
  if (webhookResponse.status !== 200) {
    throw new Error(`Webhook failed with status ${webhookResponse.status}`);
  }

  const manualRows = await db.$queryRawUnsafe(
    `SELECT
       COUNT("csatScore")::int AS csat_count,
       AVG("csatScore")::float8 AS csat_average,
       COUNT("cesScore")::int AS ces_count,
       AVG("cesScore")::float8 AS ces_average,
       COUNT("npsScore")::int AS nps_count
     FROM "Response"
     WHERE COALESCE("completedAt", "createdAt") >= $1::timestamptz
       AND COALESCE("completedAt", "createdAt") < $2::timestamptz`,
    "2026-06-01T00:00:00.000Z",
    "2026-07-01T00:00:00.000Z"
  );
  const manual = manualRows[0];
  const snapshot = await db.csatSnapshot.findUnique({ where: { period } });
  const themes = await db.themeRollup.findMany({ where: { period } });

  console.log(
    `Manual SQL: CSAT ${manual.csat_count}/${manual.csat_average}, CES ${manual.ces_count}/${manual.ces_average}, NPS count ${manual.nps_count}`
  );
  console.log(
    `Snapshot: count=${snapshot?.responseCount ?? 0}, average=${snapshot?.avgRating ?? 0}`
  );
  console.log(`Theme rows: ${themes.length}`);

  if (
    !snapshot ||
    snapshot.responseCount !== manual.csat_count ||
    snapshot.avgRating !== manual.csat_average ||
    snapshot.cesResponseCount !== manual.ces_count ||
    snapshot.cesAverage !== manual.ces_average ||
    snapshot.npsResponseCount !== manual.nps_count
  ) {
    throw new Error("Metrics snapshot does not match manual SQL");
  }
  if (themes.length === 0) {
    throw new Error("Expected at least one PII-free theme rollup");
  }

  const publicThemeText = JSON.stringify(themes).toLowerCase();
  if (
    publicThemeText.includes("fixture contact") ||
    publicThemeText.includes("fixture company")
  ) {
    throw new Error("Theme rollup contains fixture identity");
  }

  console.log("PASS csat_snapshot matches CSAT, CES, and NPS SQL aggregates");
  console.log("PASS theme_rollup contains no fixture identity");
} finally {
  await db.$disconnect();
}
