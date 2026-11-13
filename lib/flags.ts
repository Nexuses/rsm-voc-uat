import { db } from "@/lib/db";

export type FlagMode = "off" | "shadow" | "live";

export const FEATURE_FLAGS = {
  "events.outbox": {
    defaultMode: "live",
    description: "Record platform events and enqueue their jobs",
  },
  "cases.auto_create": {
    defaultMode: "live",
    description:
      "Open a recovery case for needs-attention responses (shadow records the decision only)",
  },
  "jobs.background_work": {
    defaultMode: "off",
    description:
      "Run survey enrichment and follow-up reminders on the job queue instead of in the request process",
  },
  "automation.rules": {
    defaultMode: "off",
    description:
      "Evaluate configured automation rules on every platform event (each rule version also has its own shadow/live mode)",
  },
  "accounts.health": {
    defaultMode: "off",
    description:
      "Refresh account health daily (shadow writes snapshots only; live also emits health-change events)",
  },
  "messaging.send": {
    defaultMode: "off",
    description:
      "Send approved automation messages through the email provider (shadow records what would be sent)",
  },
  "ai.ask_your_data_tools": {
    defaultMode: "off",
    description:
      "Answer Ask Your Data questions with scoped server-side tools and citations instead of the legacy prompt",
  },
  "training.rules": {
    defaultMode: "off",
    description:
      "Evaluate training rules on low scores (shadow records matches; live creates training assignments)",
  },
} as const satisfies Record<string, { defaultMode: FlagMode; description: string }>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

const CACHE_TTL_MS = 30_000;
const cache = new Map<FeatureFlagKey, { mode: FlagMode; expiresAt: number }>();

export function isFlagMode(value: unknown): value is FlagMode {
  return value === "off" || value === "shadow" || value === "live";
}

export function flagEnvName(key: FeatureFlagKey) {
  return `FEATURE_FLAG_${key.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

function envOverride(key: FeatureFlagKey): FlagMode | null {
  const value = process.env[flagEnvName(key)]?.trim().toLowerCase();
  return isFlagMode(value) ? value : null;
}

export async function getFlagMode(key: FeatureFlagKey): Promise<FlagMode> {
  const override = envOverride(key);
  if (override) return override;

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.mode;

  let mode: FlagMode = FEATURE_FLAGS[key].defaultMode;
  try {
    const row = await db.featureFlag.findUnique({ where: { key } });
    if (row && isFlagMode(row.mode)) mode = row.mode;
  } catch (error) {
    console.error("feature flag lookup failed; using default", { key, error });
  }
  cache.set(key, { mode, expiresAt: Date.now() + CACHE_TTL_MS });
  return mode;
}

export function clearFlagCache() {
  cache.clear();
}
