import {
  accountScopeWhere,
  engagementScopeWhere,
  responseScopeWhere,
  type AuthzContext,
} from "@/lib/authz";
import { db } from "@/lib/db";

export function normalizeAccountName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[,'"`()&-]/g, " ")
    .replace(/\b(co|company|llc|wll|kscc|ksc|kscp|ltd|limited|inc|plc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type AccountListRow = {
  id: string;
  name: string;
  industry: string | null;
  tier: string | null;
  ownerName: string | null;
  engagementCount: number;
  responseCount: number;
  contactCount: number;
};

export async function listAccounts(ctx: AuthzContext, input?: { limit?: number; cursor?: string | null; q?: string }) {
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
  const q = input?.q?.trim();
  const rows = await db.account.findMany({
    where: {
      AND: [
        accountScopeWhere(ctx),
        q ? { name: { contains: q, mode: "insensitive" } } : {},
      ],
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      industry: true,
      tier: true,
      ownerEmployee: { select: { name: true } },
      _count: {
        select: {
          engagements: true,
          contacts: true,
          responses: { where: { excludedAt: null } },
        },
      },
    },
  });
  const page = rows.slice(0, limit);
  return {
    accounts: page.map(
      (row): AccountListRow => ({
        id: row.id,
        name: row.name,
        industry: row.industry,
        tier: row.tier,
        ownerName: row.ownerEmployee?.name ?? null,
        engagementCount: row._count.engagements,
        responseCount: row._count.responses,
        contactCount: row._count.contacts,
      })
    ),
    nextCursor: rows.length > limit ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function getAccountDetail(ctx: AuthzContext, id: string) {
  const account = await db.account.findFirst({
    where: { AND: [{ id }, accountScopeWhere(ctx)] },
    select: {
      id: true,
      name: true,
      industry: true,
      tier: true,
      externalCrmId: true,
      ownerEmployee: { select: { name: true } },
    },
  });
  if (!account) return null;

  const [engagements, responses] = await Promise.all([
    db.engagement.findMany({
      where: { AND: [{ accountId: id }, engagementScopeWhere(ctx)] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        externalEngagementId: true,
        status: true,
        serviceLine: { select: { name: true } },
        partnerEmployee: { select: { name: true } },
      },
    }),
    db.response.findMany({
      where: { AND: [{ accountId: id, excludedAt: null }, responseScopeWhere(ctx)] },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        csatScore: true,
        cesScore: true,
        npsScore: true,
        completedAt: true,
        client: { select: { name: true, designation: true } },
      },
    }),
  ]);

  return {
    ...account,
    ownerName: account.ownerEmployee?.name ?? null,
    engagements: engagements.map((engagement) => ({
      id: engagement.id,
      name: engagement.name,
      externalEngagementId: engagement.externalEngagementId,
      status: engagement.status,
      serviceLine: engagement.serviceLine?.name ?? null,
      partner: engagement.partnerEmployee?.name ?? null,
    })),
    responses: responses.map((response) => ({
      id: response.id,
      csatScore: response.csatScore,
      cesScore: response.cesScore,
      npsScore: response.npsScore,
      completedAt: response.completedAt?.toISOString() ?? null,
      contactName: response.client?.name ?? null,
      designation: response.client?.designation ?? null,
    })),
  };
}
