import nextEnv from "@next/env";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apiKey = process.env.ELEVENLABS_API_KEY;
const agentId = process.env.ELEVENLABS_AGENT_ID;
if (!apiKey || !agentId) {
  throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required");
}

const client = new ElevenLabsClient({ apiKey });
const agent = await client.conversationalAi.agents.get(agentId);
const overrides = agent.platformSettings?.overrides?.conversationConfigOverride;

console.log(
  JSON.stringify(
    {
      agentId,
      versionId: agent.versionId ?? null,
      defaultAgentVoiceId: agent.conversationConfig?.tts?.voiceId ?? null,
      runtimeOverridesEnabled: {
        language: overrides?.agent?.language ?? false,
        voiceId: overrides?.tts?.voiceId ?? false,
      },
      expectedArabicVoiceIds: {
        hana: "kdUY91gH5xyDHapxlthT",
        heba: "QsV9PCczMIklRM6xLPAS",
      },
    },
    null,
    2
  )
);
