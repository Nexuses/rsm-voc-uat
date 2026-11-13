import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const db = new PrismaClient();

function runSeed() {
  const result = spawnSync("npm", ["run", "db:seed"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Seed command exited with status ${result.status}`);
  }
}

try {
  runSeed();
  runSeed();

  const responses = await db.response.findMany({
    where: { conversationId: { startsWith: "seed-" } },
    include: { insight: true, embedding: true },
    orderBy: { conversationId: "asc" },
  });
  const scenarios = responses
    .map((response) => response.rawPayload?.sampleScenario)
    .filter((scenario) => typeof scenario === "string")
    .sort();

  console.log(`Seeded responses: ${responses.length}`);
  console.log(`Seeded scenarios: ${scenarios.join(", ")}`);

  if (responses.length !== 4) {
    throw new Error(`Expected four seeded responses, found ${responses.length}`);
  }
  if (
    scenarios.join(",") !== "go-back,happy,neutral,unhappy" ||
    responses.some((response) => !response.insight || !response.embedding)
  ) {
    throw new Error("Seeded responses are missing a scenario, insight, or embedding");
  }

  const dimensions = await db.$queryRaw`
    SELECT vector_dims(embedding) AS dimensions
    FROM "ResponseEmbedding"
    WHERE "responseId" IN (
      SELECT id FROM "Response" WHERE "conversationId" LIKE 'seed-%'
    )
  `;
  if (
    dimensions.length !== 4 ||
    dimensions.some((row) => Number(row.dimensions) !== 1536)
  ) {
    throw new Error("Seed embeddings do not all have 1536 dimensions");
  }

  console.log("PASS seed is idempotent");
  console.log("PASS four scenarios have insights and 1536-dimension embeddings");
} finally {
  await db.$disconnect();
}
