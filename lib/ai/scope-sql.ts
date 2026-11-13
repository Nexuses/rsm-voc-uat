import type { AuthzContext } from "@/lib/authz";

/**
 * SQL twin of `responseScopeWhere` for raw vector queries on alias `r`
 * ("Response"). Parameters start at `firstParam`. Scoped users with no scope
 * rows match nothing.
 */
export function responseScopeSql(ctx: AuthzContext, firstParam: number) {
  if (ctx.unrestricted) return { clause: "", params: [] as unknown[] };

  const hasOrg =
    ctx.accountIds.length + ctx.engagementIds.length + ctx.serviceLineIds.length >
    0;
  const hasStaff = ctx.staffEmails.length > 0;
  if (!hasOrg && !hasStaff) {
    return { clause: "AND FALSE", params: [] as unknown[] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];
  let next = firstParam;

  if (hasOrg) {
    const a = `$${next}::text[]`;
    const e = `$${next + 1}::text[]`;
    const s = `$${next + 2}::text[]`;
    next += 3;
    params.push(ctx.accountIds, ctx.engagementIds, ctx.serviceLineIds);
    parts.push(`(
      r."accountId" = ANY(${a})
      OR r."engagementId" = ANY(${e})
      OR EXISTS (
        SELECT 1 FROM "Engagement" g
        WHERE g.id = r."engagementId"
          AND (g."accountId" = ANY(${a}) OR g."serviceLineId" = ANY(${s}))
      )
    )`);
  }

  if (hasStaff) {
    const emails = `$${next}::text[]`;
    next += 1;
    params.push(ctx.staffEmails.map((email) => email.toLowerCase()));
    parts.push(`EXISTS (
      SELECT 1 FROM "SurveyInvite" si
      WHERE si."responseId" = r.id
        AND (
          LOWER(si."partnerEmail") = ANY(${emails})
          OR LOWER(si."businessManagerEmail") = ANY(${emails})
          OR LOWER(si."jobManagerEmail") = ANY(${emails})
        )
    )`);
  }

  return {
    clause: `AND (${parts.join(" OR ")})`,
    params,
  };
}
