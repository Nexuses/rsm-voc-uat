import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  deliveryUpdateFor,
  minimizeEvent,
  providerMessageIdOf,
  verifySendgridSignature,
} from "@/lib/providers/sendgrid-events";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const publicKeyB64 = publicKey.export({ format: "der", type: "spki" }).toString("base64");
const now = new Date("2026-09-28T12:00:00Z");
const timestamp = String(Math.floor(now.getTime() / 1000));
const body = JSON.stringify([{ event: "bounce", sg_message_id: "abc123.filter0001", email: "x@y.z" }]);

function signed(payload: string, ts = timestamp) {
  return sign("sha256", Buffer.from(ts + payload), privateKey).toString("base64");
}

describe("verifySendgridSignature", () => {
  it("accepts a valid signature over timestamp + raw body", () => {
    expect(
      verifySendgridSignature({ publicKey: publicKeyB64, signature: signed(body), timestamp, rawBody: body, now })
    ).toBe(true);
  });

  it("rejects tampered bodies, missing headers, stale timestamps, and bad keys", () => {
    const signature = signed(body);
    expect(
      verifySendgridSignature({ publicKey: publicKeyB64, signature, timestamp, rawBody: `${body} `, now })
    ).toBe(false);
    expect(
      verifySendgridSignature({ publicKey: publicKeyB64, signature: null, timestamp, rawBody: body, now })
    ).toBe(false);
    const old = String(Number(timestamp) - 3600);
    expect(
      verifySendgridSignature({ publicKey: publicKeyB64, signature: signed(body, old), timestamp: old, rawBody: body, now })
    ).toBe(false);
    expect(
      verifySendgridSignature({ publicKey: "not-a-key", signature, timestamp, rawBody: body, now })
    ).toBe(false);
  });
});

describe("event mapping", () => {
  it("maps failures and complaints and drops recipient addresses from the log", () => {
    const event = JSON.parse(body)[0];
    expect(providerMessageIdOf(event)).toBe("abc123");
    expect(deliveryUpdateFor(event)).toEqual({ status: "failed", error: "sendgrid:bounce" });
    expect(deliveryUpdateFor({ event: "spamreport" })).toEqual({ error: "sendgrid:spamreport" });
    expect(deliveryUpdateFor({ event: "delivered" })).toBeNull();
    expect(minimizeEvent(event)).toEqual({ event: "bounce", sg_message_id: "abc123.filter0001", timestamp: null });
  });
});
