import { z } from "zod";

const subscriptionSchema = z.object({
  tier: z.string().optional(),
  status: z.string().optional(),
  character_count: z.number().nonnegative(),
  character_limit: z.number().positive(),
  next_character_count_reset_unix: z.number().optional(),
  can_extend_character_limit: z.boolean().optional(),
});

export type VoiceCreditsLevel = "ok" | "warn" | "critical" | "exhausted";

export type VoiceCreditsStatus = {
  configured: boolean;
  available: boolean;
  tier: string | null;
  status: string | null;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  level: VoiceCreditsLevel;
  resetAt: string | null;
  message: string | null;
};

const WARN_PERCENT = 80;
const CRITICAL_PERCENT = 95;

export function summarizeVoiceCredits(input: {
  characterCount: number;
  characterLimit: number;
  tier?: string | null;
  status?: string | null;
  nextResetUnix?: number | null;
}): VoiceCreditsStatus {
  const used = Math.max(0, Math.floor(input.characterCount));
  const limit = Math.max(1, Math.floor(input.characterLimit));
  const remaining = Math.max(0, limit - used);
  const percentUsed = Math.min(100, Math.round((used / limit) * 100));
  const resetAt =
    input.nextResetUnix && Number.isFinite(input.nextResetUnix)
      ? new Date(input.nextResetUnix * 1000).toISOString()
      : null;

  let level: VoiceCreditsLevel = "ok";
  if (remaining <= 0 || percentUsed >= 100) level = "exhausted";
  else if (percentUsed >= CRITICAL_PERCENT) level = "critical";
  else if (percentUsed >= WARN_PERCENT) level = "warn";

  let message: string | null = null;
  if (level === "exhausted") {
    message =
      "ElevenLabs voice credits are exhausted. Voice surveys cannot start until credits are added or the plan renews.";
  } else if (level === "critical") {
    message = `ElevenLabs voice credits are almost gone (${remaining.toLocaleString()} of ${limit.toLocaleString()} left). Top up soon to keep voice surveys running.`;
  } else if (level === "warn") {
    message = `ElevenLabs voice credits are running low (${remaining.toLocaleString()} of ${limit.toLocaleString()} left).`;
  }

  return {
    configured: true,
    available: true,
    tier: input.tier ?? null,
    status: input.status ?? null,
    used,
    limit,
    remaining,
    percentUsed,
    level,
    resetAt,
    message,
  };
}

export async function getElevenLabsVoiceCredits(): Promise<VoiceCreditsStatus> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return {
      configured: false,
      available: false,
      tier: null,
      status: null,
      used: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
      level: "ok",
      resetAt: null,
      message: null,
    };
  }

  const response = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      configured: true,
      available: false,
      tier: null,
      status: null,
      used: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
      level: "ok",
      resetAt: null,
      message:
        response.status === 401 || response.status === 403
          ? "Could not read ElevenLabs credits (API key unauthorized)."
          : "Could not read ElevenLabs credits right now.",
    };
  }

  const parsed = subscriptionSchema.safeParse(await response.json());
  if (!parsed.success) {
    return {
      configured: true,
      available: false,
      tier: null,
      status: null,
      used: 0,
      limit: 0,
      remaining: 0,
      percentUsed: 0,
      level: "ok",
      resetAt: null,
      message: "Could not parse ElevenLabs subscription usage.",
    };
  }

  return summarizeVoiceCredits({
    characterCount: parsed.data.character_count,
    characterLimit: parsed.data.character_limit,
    tier: parsed.data.tier,
    status: parsed.data.status,
    nextResetUnix: parsed.data.next_character_count_reset_unix,
  });
}
