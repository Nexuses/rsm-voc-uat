import { randomUUID } from "node:crypto";
import { HttpError } from "@/lib/api/http-error";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { unknownPlaceholders } from "@/lib/messaging/render";

export const templateVersionInputSchema = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9_.-]{1,79}$/),
  name: z.string().trim().min(3).max(120),
  locale: z.enum(["en", "ar"]),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10_000),
});

export class TemplateError extends HttpError {}

export async function listTemplates() {
  return db.messageTemplate.findMany({
    orderBy: { key: "asc" },
    include: {
      versions: {
        orderBy: [{ version: "desc" }, { locale: "asc" }],
        select: {
          id: true,
          version: true,
          locale: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function createTemplateVersion(
  input: z.infer<typeof templateVersionInputSchema>,
  actorUserId: string
) {
  const unknown = unknownPlaceholders(`${input.subject}\n${input.body}`);
  if (unknown.length) {
    throw new TemplateError(`Unknown placeholders: ${unknown.join(", ")}`, 400);
  }
  const template = await db.messageTemplate.upsert({
    where: { key: input.key },
    create: { id: randomUUID(), key: input.key, name: input.name },
    update: {},
  });
  const latest = await db.messageTemplateVersion.findFirst({
    where: { templateId: template.id, locale: input.locale },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = await db.messageTemplateVersion.create({
    data: {
      id: randomUUID(),
      templateId: template.id,
      version: (latest?.version ?? 0) + 1,
      locale: input.locale,
      subject: input.subject,
      body: input.body,
      status: "draft",
    },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "message_template.version_created",
    resourceType: "MessageTemplate",
    resourceId: version.id,
    metadata: { templateKey: input.key, locale: input.locale, version: version.version },
    source: "api",
  });
  return version;
}

/** Approving a version retires the previously approved one for that locale. */
export async function approveTemplateVersion(versionId: string, actorUserId: string) {
  const version = await db.messageTemplateVersion.findUnique({ where: { id: versionId } });
  if (!version) throw new TemplateError("Template version not found", 404);
  if (version.status !== "draft") {
    throw new TemplateError(`A ${version.status} template cannot be approved`, 409);
  }
  const approved = await db.$transaction(async (tx) => {
    await tx.messageTemplateVersion.updateMany({
      where: { templateId: version.templateId, locale: version.locale, status: "approved" },
      data: { status: "retired" },
    });
    return tx.messageTemplateVersion.update({
      where: { id: version.id },
      data: { status: "approved", approvedByUserId: actorUserId },
    });
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "approval.decided",
    resourceType: "MessageTemplate",
    resourceId: version.id,
    metadata: { decision: "approved", kind: "message_template" },
    source: "api",
  });
  return approved;
}

export async function findApprovedTemplate(key: string, locale: string) {
  const versions = await db.messageTemplateVersion.findMany({
    where: { template: { key }, status: "approved", locale: { in: [locale, "en"] } },
    orderBy: { version: "desc" },
  });
  return versions.find((v) => v.locale === locale) ?? versions[0] ?? null;
}
