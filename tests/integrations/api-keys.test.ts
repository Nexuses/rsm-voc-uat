import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    integrationCredential: { findUnique: mocks.findUnique, update: mocks.update },
  },
}));
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn() }));

import {
  generateApiKey,
  hashApiKey,
  isKeyUsable,
  verifyInboundApiKey,
} from "@/lib/integrations/api-keys";
import { decryptSecret, encryptSecret } from "@/lib/integrations/secret-box";

describe("secret box", () => {
  const original = process.env.INTEGRATION_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.INTEGRATION_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });
  afterEach(() => {
    if (original === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
    else process.env.INTEGRATION_ENCRYPTION_KEY = original;
  });

  it("round-trips and uses a fresh IV each time", () => {
    const a = encryptSecret("provider-token");
    const b = encryptSecret("provider-token");
    expect(a).not.toBe(b);
    expect(a).not.toContain("provider-token");
    expect(decryptSecret(a)).toBe("provider-token");
  });

  it("rejects tampered ciphertext", () => {
    const sealed = encryptSecret("provider-token").split(".");
    sealed[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptSecret(sealed.join("."))).toThrow();
  });

  it("refuses to run without a 32-byte key", () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = Buffer.from("short").toString("base64");
    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow(/not configured/);
  });
});

describe("inbound API keys", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.update.mockReset().mockResolvedValue({});
  });

  it("generates prefixed high-entropy keys and hashes deterministically", () => {
    const key = generateApiKey();
    expect(key.startsWith("voc_")).toBe(true);
    expect(key.length).toBeGreaterThan(40);
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(hashApiKey(key)).not.toContain(key);
  });

  it("checks revocation, expiry and scope", () => {
    const now = new Date("2026-09-28T00:00:00Z");
    const base = { revokedAt: null, expiresAt: null, scopes: ["survey_invites.send"] };
    expect(isKeyUsable(base, "survey_invites.send", now)).toBe(true);
    expect(isKeyUsable({ ...base, revokedAt: now }, "survey_invites.send", now)).toBe(false);
    expect(isKeyUsable({ ...base, expiresAt: now }, "survey_invites.send", now)).toBe(false);
    expect(isKeyUsable({ ...base, scopes: [] }, "survey_invites.send", now)).toBe(false);
  });

  it("looks keys up by hash only and records last use", async () => {
    const key = generateApiKey();
    mocks.findUnique.mockResolvedValue({
      id: "cred-1",
      kind: "inbound_api_key",
      revokedAt: null,
      expiresAt: null,
      scopes: ["survey_invites.send"],
    });
    await expect(verifyInboundApiKey(key, "survey_invites.send")).resolves.toBe(true);
    expect(mocks.findUnique.mock.calls[0][0].where).toEqual({ keyHash: hashApiKey(key) });
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it("does not hit the database for non-prefixed tokens", async () => {
    await expect(verifyInboundApiKey("legacy-token", "survey_invites.send")).resolves.toBe(false);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("rejects unknown and revoked keys", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    await expect(verifyInboundApiKey(generateApiKey(), "survey_invites.send")).resolves.toBe(false);
    mocks.findUnique.mockResolvedValueOnce({
      id: "cred-2",
      kind: "inbound_api_key",
      revokedAt: new Date(),
      expiresAt: null,
      scopes: ["survey_invites.send"],
    });
    await expect(verifyInboundApiKey(generateApiKey(), "survey_invites.send")).resolves.toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
