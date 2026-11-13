import type { AuthzContext } from "@/lib/authz";
import { testimonialScopeWhere } from "@/lib/authz";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { publishableQuote } from "@/lib/testimonials/quote";

const STATUSES = ["requested", "submitted", "declined", "published", "archived"] as const;

export type TestimonialAdminStatus = (typeof STATUSES)[number];

export function isTestimonialAdminStatus(value: string): value is TestimonialAdminStatus {
  return (STATUSES as readonly string[]).includes(value);
}

function respondentName(input: {
  customerName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  clientName?: string | null;
}) {
  const named = input.customerName?.trim();
  if (named) return named;
  const parts = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return input.clientName?.trim() || null;
}

export async function listTestimonials(
  status?: TestimonialAdminStatus,
  ctx?: AuthzContext
) {
  const scopeWhere = ctx ? testimonialScopeWhere(ctx) : {};
  const rows = await db.testimonial.findMany({
    where: {
      AND: [status ? { status } : {}, scopeWhere],
    },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: {
      response: {
        select: {
          csatScore: true,
          cesScore: true,
          npsScore: true,
          completedAt: true,
          client: { select: { name: true, company: true, email: true } },
        },
      },
      surveyInvite: {
        select: {
          email: true,
          customerName: true,
          firstName: true,
          lastName: true,
          company: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const name = respondentName({
      customerName: row.surveyInvite?.customerName,
      firstName: row.surveyInvite?.firstName,
      lastName: row.surveyInvite?.lastName,
      clientName: row.response.client?.name,
    });
    const company =
      row.surveyInvite?.company?.trim() || row.response.client?.company?.trim() || null;
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      requestedAt: row.requestedAt?.toISOString() ?? null,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      completedAt: row.response.completedAt?.toISOString() ?? null,
      kind: row.kind,
      status: row.status,
      source: row.source,
      clientText: row.clientText,
      aiDraft: row.aiDraft,
      videoUrl: row.videoUrl,
      consentName: row.consentName,
      consentWebsite: row.consentWebsite,
      consentSocial: row.consentSocial,
      respondentName: name,
      company,
      email: row.surveyInvite?.email?.trim() || row.response.client?.email?.trim() || null,
      csatScore: row.response.csatScore,
      cesScore: row.response.cesScore,
      npsScore: row.response.npsScore,
      reviewPath: `/testimonial/${row.token}`,
      publishableQuote: publishableQuote({
        clientText: row.clientText,
        aiDraft: row.aiDraft,
        consentName: row.consentName,
        respondentName: name,
        company,
      }),
    };
  });
}

export async function setTestimonialAdminStatus(input: {
  id: string;
  action: "publish" | "archive";
  actorUserId: string;
}) {
  const row = await db.testimonial.findUnique({
    where: { id: input.id },
    select: { id: true, status: true, consentedAt: true },
  });
  if (!row) return { ok: false as const, status: 404 as const, error: "Testimonial not found" };

  if (input.action === "archive") {
    if (row.status === "archived") {
      return { ok: true as const, status: "archived" as const };
    }
    await db.testimonial.update({
      where: { id: row.id },
      data: { status: "archived" },
    });
    await writeAuditLog({
      actorType: "user",
      actorUserId: input.actorUserId,
      action: "testimonial.archived",
      resourceType: "Testimonial",
      resourceId: row.id,
      source: "api",
    });
    return { ok: true as const, status: "archived" as const };
  }

  if (row.status !== "submitted" || !row.consentedAt) {
    return {
      ok: false as const,
      status: 409 as const,
      error: "Only a submitted testimonial with consent can be published",
    };
  }

  const now = new Date();
  await db.testimonial.update({
    where: { id: row.id },
    data: {
      status: "published",
      publishedAt: now,
      publishedByUserId: input.actorUserId,
    },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "testimonial.published",
    resourceType: "Testimonial",
    resourceId: row.id,
    source: "api",
  });
  return { ok: true as const, status: "published" as const };
}
