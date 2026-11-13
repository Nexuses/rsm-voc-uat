/**
 * Set the Arabic language-preset TTS voice on the configured ElevenLabs agent.
 *
 * Client `overrides.tts.voiceId` alone is not enough: when `agent.language`
 * switches to `ar`, ConvAI uses the Arabic language preset. If that preset has
 * `tts: null`, ElevenLabs falls back to a default Arabic-capable voice (often
 * male) instead of the allowlisted female host voice.
 *
 * Usage (local or VPS app dir, with ELEVENLABS_API_KEY + ELEVENLABS_AGENT_ID):
 *
 *   npx tsx scripts/set-arabic-host-voice.mts          # dry run
 *   npx tsx scripts/set-arabic-host-voice.mts --apply  # patch live agent
 */
import nextEnv from "@next/env";
import { ARABIC_HOST_VOICE_ID } from "../lib/survey/arabic-voice-options";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
const apply = process.argv.includes("--apply");

if (!apiKey || !agentId) {
  throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required");
}

const agentResponse = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
  { headers: { "xi-api-key": apiKey } }
);
if (!agentResponse.ok) {
  throw new Error(
    `failed to load agent ${agentId}: HTTP ${agentResponse.status}`
  );
}

const agent = (await agentResponse.json()) as {
  name?: string;
  conversation_config?: {
    tts?: { voice_id?: string; model_id?: string };
    language_presets?: Record<
      string,
      {
        overrides?: {
          agent?: { first_message?: string | null };
          tts?: { voice_id?: string | null } | null;
        };
      }
    >;
  };
};

const arabicPreset = agent.conversation_config?.language_presets?.ar;
const currentArabicVoice =
  arabicPreset?.overrides?.tts?.voice_id ?? null;
const arabicFirstMessage =
  arabicPreset?.overrides?.agent?.first_message ?? null;

console.log(`Agent: ${agent.name ?? agentId}`);
console.log(`Agent id: ${agentId}`);
console.log(
  `Default TTS: ${agent.conversation_config?.tts?.voice_id ?? "(none)"} (${agent.conversation_config?.tts?.model_id ?? "unknown model"})`
);
console.log(`Arabic preset voice: ${currentArabicVoice ?? "(null)"}`);
console.log(`Target Arabic voice: ${ARABIC_HOST_VOICE_ID}`);

if (!apply) {
  console.log("DRY RUN: no live changes applied");
  console.log("Run npx tsx scripts/set-arabic-host-voice.mts --apply to patch");
  process.exit(0);
}

const patch = {
  conversation_config: {
    language_presets: {
      ar: {
        overrides: {
          agent: {
            first_message: arabicFirstMessage,
            language: null,
            prompt: null,
          },
          tts: {
            voice_id: ARABIC_HOST_VOICE_ID,
          },
        },
      },
    },
  },
};

const patchResponse = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
  {
    method: "PATCH",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(patch),
  }
);

if (!patchResponse.ok) {
  throw new Error(
    `failed to patch agent: HTTP ${patchResponse.status} ${await patchResponse.text()}`
  );
}

const updated = (await patchResponse.json()) as typeof agent;
console.log(
  `Updated Arabic preset voice: ${
    updated.conversation_config?.language_presets?.ar?.overrides?.tts
      ?.voice_id ?? "(missing)"
  }`
);
console.log("Done. Start a new Arabic voice session to verify (hard refresh).");
