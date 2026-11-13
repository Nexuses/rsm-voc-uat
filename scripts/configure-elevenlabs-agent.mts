import fs from "node:fs/promises";
import path from "node:path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import nextEnv from "@next/env";
import { buildAgentUpdate } from "../lib/elevenlabs/agent-config";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
if (!apiKey || !agentId) {
  throw new Error(
    "ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required"
  );
}

const client = new ElevenLabsClient({ apiKey });
const apply = process.argv.includes("--apply");
const webhookUrl = resolveWebhookUrl();
const webhookList = await client.webhooks.list();
const webhook = webhookList.webhooks.find(
  (candidate) =>
    candidate.webhookUrl === webhookUrl &&
    candidate.authType === "hmac" &&
    !candidate.isDisabled &&
    !candidate.isAutoDisabled
);
if (!webhook) {
  const known = webhookList.webhooks
    .map((candidate) => {
      const flags = [
        candidate.authType,
        candidate.isDisabled ? "disabled" : "enabled",
        candidate.isAutoDisabled ? "auto-disabled" : null,
      ]
        .filter(Boolean)
        .join(", ");
      return `  - ${candidate.webhookUrl} (${flags})`;
    })
    .join("\n");
  throw new Error(
    [
      `No enabled HMAC workspace webhook found for ${webhookUrl}`,
      "Create an HMAC webhook in the ElevenLabs workspace for that URL,",
      "copy its signing secret into ELEVENLABS_WEBHOOK_SECRET, then re-run.",
      "Set ELEVENLABS_WEBHOOK_URL (or NEXTAUTH_URL) if the target host differs.",
      known ? `Workspace webhooks currently:\n${known}` : "No workspace webhooks returned.",
    ].join("\n")
  );
}

const before = await client.conversationalAi.agents.get(agentId);
const update = buildAgentUpdate(webhook.webhookId);
const requiredKeys = [
  "client_name",
  "client_company",
  "client_designation",
  "language",
  "q1_rating",
  "q1_reason",
  "q2_rating",
  "q2_reason",
  "q3_rating",
  "q3_reason",
];

verifyConfiguration(update, webhook.webhookId, requiredKeys);
if (!apply) {
  console.log(`Agent: ${agentId}`);
  console.log(`Current version: ${before.versionId ?? "unversioned"}`);
  console.log(`Data collection: ${requiredKeys.join(", ")}`);
  console.log(`Post-call webhook: ${webhook.webhookId}`);
  console.log("DRY RUN: configuration validated; no live changes applied");
  console.log("Run npm run elevenlabs:configure -- --apply to update the live agent");
  process.exit(0);
}

const backupDirectory = path.join(
  process.cwd(),
  "backups",
  "elevenlabs"
);
await fs.mkdir(backupDirectory, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(
  backupDirectory,
  `${agentId}-${timestamp}.json`
);
await fs.writeFile(
  backupPath,
  `${JSON.stringify(before, null, 2)}\n`,
  "utf8"
);

await client.conversationalAi.agents.update(agentId, {
  ...update,
  branchId: before.branchId,
});

const after = await client.conversationalAi.agents.get(agentId);
const actualKeys = Object.keys(
  after.platformSettings?.dataCollection ?? {}
).sort();

for (const key of requiredKeys) {
  if (!actualKeys.includes(key)) {
    throw new Error(`Agent data collection is missing ${key}`);
  }
}
if (
  after.conversationConfig.agent?.firstMessage !==
    update.conversationConfig?.agent?.firstMessage ||
  after.conversationConfig.agent?.prompt?.prompt !==
    update.conversationConfig?.agent?.prompt?.prompt ||
  after.conversationConfig.agent?.language !== "en" ||
  after.platformSettings?.auth?.enableAuth !== true ||
  after.platformSettings?.workspaceOverrides?.webhooks
    ?.postCallWebhookId !== webhook.webhookId
) {
  throw new Error("Agent configuration verification failed");
}
verifyConfiguration(after, webhook.webhookId, requiredKeys);

console.log(`Agent: ${agentId}`);
console.log(`Previous version: ${before.versionId ?? "unversioned"}`);
console.log(`Updated version: ${after.versionId ?? "unversioned"}`);
console.log(`Backup: ${path.relative(process.cwd(), backupPath)}`);
console.log(`Data collection: ${actualKeys.join(", ")}`);
console.log(`Post-call webhook: ${webhook.webhookId}`);
console.log("PASS ElevenLabs agent configuration verified");

function verifyConfiguration(
  configuration: {
    conversationConfig?: {
      agent?: {
        language?: string;
        prompt?: {
          builtInTools?: {
            endCall?: {
              name?: string;
              params?: { systemToolType?: string };
            };
          };
        };
      };
      turn?: { silenceEndCallTimeout?: number };
    };
    platformSettings?: {
      dataCollection?: Record<string, unknown>;
      auth?: {
        enableAuth?: boolean;
        requireOriginHeader?: boolean;
        allowlist?: Array<{ hostname?: string }>;
      };
      workspaceOverrides?: {
        webhooks?: { postCallWebhookId?: string };
      };
    };
  },
  expectedWebhookId: string,
  expectedKeys: string[]
) {
  const keys = Object.keys(
    configuration.platformSettings?.dataCollection ?? {}
  );
  for (const key of expectedKeys) {
    if (!keys.includes(key)) {
      throw new Error(`Agent data collection is missing ${key}`);
    }
  }

  const endCall =
    configuration.conversationConfig?.agent?.prompt?.builtInTools?.endCall;
  if (
    endCall?.name !== "end_call" ||
    endCall.params?.systemToolType !== "end_call"
  ) {
    throw new Error("Agent end-call built-in tool is missing or misconfigured");
  }

  if (
    configuration.conversationConfig?.turn?.silenceEndCallTimeout !== 45
  ) {
    throw new Error("Agent silence end-call timeout must be 45 seconds");
  }

  const auth = configuration.platformSettings?.auth;
  const allowlist = auth?.allowlist?.map((item) => item.hostname) ?? [];
  if (
    configuration.conversationConfig?.agent?.language !== "en" ||
    auth?.enableAuth !== true ||
    auth.requireOriginHeader !== true ||
    !allowlist.includes("rsm-voc-platform.vercel.app") ||
    !allowlist.includes("rsm-voc-survey.nexuses.xyz") ||
    !allowlist.includes("localhost") ||
    configuration.platformSettings?.workspaceOverrides?.webhooks
      ?.postCallWebhookId !== expectedWebhookId
  ) {
    throw new Error(
      "Agent language, origin allowlist, authentication, or webhook configuration is invalid"
    );
  }
}

function resolveWebhookUrl(): string {
  const explicit = process.env.ELEVENLABS_WEBHOOK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const base =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.SURVEY_PUBLIC_URL?.trim() ||
    "https://rsm-voc-platform.vercel.app";
  const origin = base.replace(/\/$/, "").replace(/\/survey$/, "");
  return `${origin}/api/webhooks/elevenlabs`;
}
