import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  deliveryUpdateFor,
  minimizeEvent,
  payloadDigest,
  providerMessageIdOf,
  SENDGRID_SIGNATURE_HEADER,
  SENDGRID_TIMESTAMP_HEADER,
  sendgridEventsSchema,
  verifySendgridSignature,
} from "@/lib/providers/sendgrid-events";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_000_000;

export async function POST(request: NextRequest) {
  const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const valid = verifySendgridSignature({
    publicKey,
    signature: request.headers.get(SENDGRID_SIGNATURE_HEADER),
    timestamp: request.headers.get(SENDGRID_TIMESTAMP_HEADER),
    rawBody,
  });
  if (!valid) {
    await writeAuditLog({
      actorType: "integration",
      action: "security.integration_auth_failed",
      metadata: { integration: "sendgrid_events" },
      source: "webhook",
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = sendgridEventsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event batch" }, { status: 400 });
  }

  const dedupeKey = `sendgrid:${payloadDigest(rawBody)}`;
  const stored = await db.webhookEvent.createMany({
    data: [
      {
        id: randomUUID(),
        source: "sendgrid",
        eventType: "event_batch",
        dedupeKey,
        signatureValid: true,
        payload: parsed.data.map(minimizeEvent),
      },
    ],
    skipDuplicates: true,
  });
  if (!stored.count) return NextResponse.json({ ok: true, duplicate: true });

  let updated = 0;
  for (const event of parsed.data) {
    const messageId = providerMessageIdOf(event);
    const change = deliveryUpdateFor(event);
    if (!messageId || !change) continue;
    const result = await db.messageDelivery.updateMany({
      where: { providerMessageId: messageId },
      data: change,
    });
    updated += result.count;
  }
  await db.webhookEvent.update({
    where: { dedupeKey },
    data: { processedAt: new Date() },
  });
  return NextResponse.json({ ok: true, events: parsed.data.length, updated });
}
