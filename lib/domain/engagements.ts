import { engagementScopeWhere, type AuthzContext } from "@/lib/authz";
import { db } from "@/lib/db";

export type EngagementListRow = {
  id: string;
  name: string | null;
  externalEngagementId: string | null;
  status: string;
  accountName: string | null;
  serviceLine: string | null;
  partner: string | null;
  inviteCount: number;
  responseCount: number;
};

export async function listEngagements(
  ctx: AuthzContext,
  input?: { limit?: number; cursor?: string | null; accountId?: string }
) {
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
  const rows = await db.engagement.findMany({
    where: {
      AND: [
        engagementScopeWhere(ctx),
        input?.accountId ? { accountId: input.accountId } : {},
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      externalEngagementId: true,
      status: true,
      account: { select: { name: true } },
      serviceLine: { select: { name: true } },
      partnerEmployee: { select: { name: true } },
      _count: {
        select: { invites: true, responses: { where: { excludedAt: null } } },
      },
    },
  });
  const page = rows.slice(0, limit);
  return {
    engagements: page.map(
      (row): EngagementListRow => ({
        id: row.id,
        name: row.name,
        externalEngagementId: row.externalEngagementId,
        status: row.status,
        accountName: row.account?.name ?? null,
        serviceLine: row.serviceLine?.name ?? null,
        partner: row.partnerEmployee?.name ?? null,
        inviteCount: row._count.invites,
        responseCount: row._count.responses,
      })
    ),
    nextCursor: rows.length > limit ? page[page.length - 1]?.id ?? null : null,
  };
}
