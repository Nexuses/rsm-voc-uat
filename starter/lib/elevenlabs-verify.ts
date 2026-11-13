// lib/elevenlabs-verify.ts
// Verify the HMAC signature ElevenLabs sends on post-call webhooks before trusting the body.
// ElevenLabs signs with the webhook secret; header format is "t=<timestamp>,v0=<hmac>".
// Adjust header/format if ElevenLabs' current docs differ — check the post-call-webhooks page.

import crypto from "crypto";

export function verifyElevenLabsSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false;

  // header like: "t=1718000000,v0=abcdef..."
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k.trim(), (v ?? "").trim()];
    })
  );

  const timestamp = parts["t"];
  const provided = parts["v0"];
  if (!timestamp || !provided) return false;

  // Reject very old timestamps (replay protection) — 5 min window
  const ageSec = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(ageSec) || ageSec > 300) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  // constant-time compare
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
