/** Allowlisted ElevenLabs TTS voice for Arabic host sessions. */
export const ARABIC_HOST_VOICE_ID = "v7UCHHCrHj1KBa4E41gb";

export const VOICE_HOST_OPTIONS = [
  {
    key: "english",
    language: "en",
  },
  {
    key: "arabic",
    language: "ar",
    voiceId: ARABIC_HOST_VOICE_ID,
  },
] as const;

export type VoiceHostSelection = (typeof VOICE_HOST_OPTIONS)[number]["key"];

export function isArabicVoiceSelection(
  selection: VoiceHostSelection | null
): selection is "arabic" {
  return selection === "arabic";
}

export function voiceHostToSessionLanguage(
  selection: VoiceHostSelection | null
): "en" | "ar" {
  return selection === "arabic" ? "ar" : "en";
}

/** TTS voice override for Arabic only; English keeps the agent default voice. */
export function getHostVoiceId(
  selection: VoiceHostSelection | null
): string | undefined {
  if (!isArabicVoiceSelection(selection)) return undefined;
  return ARABIC_HOST_VOICE_ID;
}

export function getHostVoiceIdForLanguage(
  language: "en" | "ar"
): string | undefined {
  return language === "ar" ? ARABIC_HOST_VOICE_ID : undefined;
}
