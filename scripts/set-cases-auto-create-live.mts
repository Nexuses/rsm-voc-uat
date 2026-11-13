import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { db } = await import("../lib/db");

const row = await db.featureFlag.upsert({
  where: { key: "cases.auto_create" },
  create: {
    key: "cases.auto_create",
    mode: "live",
    description: "Open recovery cases for needs-attention responses",
  },
  update: { mode: "live" },
});

console.log(JSON.stringify(row));
await db.$disconnect();
