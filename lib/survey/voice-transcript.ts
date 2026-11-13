// ElevenLabs v3 audio tags (e.g. [happy], [sad]) are for TTS delivery only.
const VOICE_AUDIO_TAG_PATTERN = /\[(?:[a-z][a-z0-9_\- ]{0,30})\]/gi;

export function stripVoiceAudioTags(text: string): string {
  return text
    .replace(VOICE_AUDIO_TAG_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatVoiceTranscriptMessage(text: string): string {
  return stripVoiceAudioTags(text);
}

/** Split cleaned agent text into caption lines (sentence-ish chunks). */
export function splitCaptionLines(text: string): string[] {
  const cleaned = stripVoiceAudioTags(text);
  if (!cleaned) return [];

  const parts = cleaned
    .split(/(?<=[.!?…。؟])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 0) return parts;

  // Very long single clause: soft-wrap near ~90 chars on word boundaries.
  if (cleaned.length <= 96) return [cleaned];
  const soft: string[] = [];
  let remaining = cleaned;
  while (remaining.length > 96) {
    const slice = remaining.slice(0, 96);
    const breakAt = slice.lastIndexOf(" ");
    const cut = breakAt > 40 ? breakAt : 96;
    soft.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) soft.push(remaining);
  return soft;
}

/**
 * Estimate how long to show a caption line before advancing.
 * Rough speech pace (~13–15 chars/sec), clamped for short/long lines.
 */
export function captionAdvanceMs(
  line: string,
  options: { isSpeaking?: boolean } = {}
): number {
  const chars = Math.max(line.trim().length, 12);
  const speakingMs = Math.round((chars / 14) * 1000);
  const clamped = Math.min(4500, Math.max(1500, speakingMs));
  return options.isSpeaking === false
    ? Math.min(5200, Math.round(clamped * 1.2))
    : clamped;
}
