import { createHash, randomBytes, randomUUID } from "node:crypto";
import { HttpError } from "@/lib/api/http-error";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export const INBOUND_KEY_PREFIX = "voc_";
export const API_KEY_SCOPES = ["survey_invites.send"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey() {
  return `${INBOUND_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

/** The plaintext key is returned once and never stored. */
export async function createInboundApiKey(input: {
  label: string;
  scopes: ApiKeyScope[];
  expiresAt?: Date | null;
  actorUserId: string;
}) {
  const integration = await db.integration.upsert({
    where: { kind_vendor: { kind: "inbound", vendor: "api" } },
    create: { id: randomUUID(), kind: "inbound", vendor: "api", name: "Inbound API keys" },
    update: {},
  });
  const key = generateApiKey();
  const credential = await db.integrationCredential.create({
    data: {
      id: randomUUID(),
      integrationId: integration.id,
      kind: "inbound_api_key",
      label: input.label,
      keyPrefix: key.slice(0, INBOUND_KEY_PREFIX.length + 6),
      keyHash: hashApiKey(key),
      scopes: input.scopes,
      expiresAt: input.expiresAt ?? null,
      createdByUserId: input.actorUserId,
    },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "integration.updated",
    resourceType: "Integration",
    resourceId: credential.id,
    after: { change: "api_key_created", label: input.label, scopes: input.scopes, prefix: credential.keyPrefix },
    source: "api",
  });
  return { id: credential.id, key, keyPrefix: credential.keyPrefix, scopes: credential.scopes };
}

export async function revokeInboundApiKey(id: string, actorUserId: string) {
  const credential = await db.integrationCredential.findUnique({ where: { id } });
  if (!credential || credential.kind !== "inbound_api_key") {
    throw new HttpError("API key not found", 404);
  }
  if (credential.revokedAt) return credential;
  const revoked = await db.integrationCredential.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "integration.updated",
    resourceType: "Integration",
    resourceId: id,
    after: { change: "api_key_revoked", prefix: credential.keyPrefix },
    source: "api",
  });
  return revoked;
}

export function isKeyUsable(
  credential: { revokedAt: Date | null; expiresAt: Date | null; scopes: string[] },
  scope: ApiKeyScope,
  now = new Date()
) {
  if (credential.revokedAt) return false;
  if (credential.expiresAt && credential.expiresAt <= now) return false;
  return credential.scopes.includes(scope);
}

export async function verifyInboundApiKey(key: string, scope: ApiKeyScope) {
  if (!key.startsWith(INBOUND_KEY_PREFIX)) return false;
  const credential = await db.integrationCredential.findUnique({
    where: { keyHash: hashApiKey(key) },
    select: { id: true, kind: true, revokedAt: true, expiresAt: true, scopes: true },
  });
  if (!credential || credential.kind !== "inbound_api_key") return false;
  if (!isKeyUsable(credential, scope)) return false;
  await db.integrationCredential
    .update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
  return true;
}

export async function listInboundApiKeys() {
  return db.integrationCredential.findMany({
    where: { kind: "inbound_api_key" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
}
