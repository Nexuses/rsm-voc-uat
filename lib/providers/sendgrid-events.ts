import { createHash, createPublicKey, verify } from "node:crypto";
import { z } from "zod";

export const SENDGRID_SIGNATURE_HEADER = "x-twilio-email-event-webhook-signature";
export const SENDGRID_TIMESTAMP_HEADER = "x-twilio-email-event-webhook-timestamp";
export const SENDGRID_MAX_SKEW_SECONDS = 15 * 60;

/**
 * Verifies SendGrid's signed event webhook (ECDSA P-256 over timestamp + raw
 * body). Must run before the body is parsed or trusted.
 */
export function verifySendgridSignature(input: {
  publicKey: string;
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
  now?: Date;
}) {
  if (!input.signature || !input.timestamp || !/^\d+$/.test(input.timestamp)) return false;
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - Number(input.timestamp)) > SENDGRID_MAX_SKEW_SECONDS) return false;
  try {
    const key = createPublicKey({
      key: Buffer.from(input.publicKey.replace(/\s+/g, ""), "base64"),
      format: "der",
      type: "spki",
    });
    return verify(
      "sha256",
      Buffer.from(input.timestamp + input.rawBody, "utf8"),
      key,
      Buffer.from(input.signature, "base64")
    );
  } catch {
    return false;
  }
}

const eventSchema = z
  .object({
    event: z.string().max(40),
    sg_message_id: z.string().max(300).optional(),
    timestamp: z.number().optional(),
  })
  .passthrough();

export const sendgridEventsSchema = z.array(eventSchema).max(1000);
export type SendgridEvent = z.infer<typeof eventSchema>;

/** SendGrid's sg_message_id is "<X-Message-Id>.<filter suffix>". */
export function providerMessageIdOf(event: SendgridEvent) {
  return event.sg_message_id?.split(".")[0] || null;
}

const FAILURE_EVENTS = new Set(["bounce", "dropped", "blocked"]);
const COMPLAINT_EVENTS = new Set(["spamreport", "unsubscribe", "group_unsubscribe"]);

export function deliveryUpdateFor(event: SendgridEvent): { status?: string; error: string } | null {
  if (FAILURE_EVENTS.has(event.event)) return { status: "failed", error: `sendgrid:${event.event}` };
  if (COMPLAINT_EVENTS.has(event.event)) return { error: `sendgrid:${event.event}` };
  return null;
}

export function payloadDigest(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

/** Keeps only delivery metadata; recipient addresses are not stored in the log. */
export function minimizeEvent(event: SendgridEvent) {
  return {
    event: event.event,
    sg_message_id: event.sg_message_id ?? null,
    timestamp: event.timestamp ?? null,
  };
}
