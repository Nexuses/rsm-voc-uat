import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { getSessionPermissions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Permission } from "@/lib/rbac/permissions";
import { SYSTEM_ROLE_SLUGS } from "@/lib/rbac/permissions";

export const SCOPE_TYPES = [
  "all",
  "serviceLine",
  "account",
  "engagement",
  "staffEmail",
] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export type AuthzContext = {
  userId: string;
  permissions: Permission[];
  /** True when the user has no scope rows or an explicit "all" scope. */
  unrestricted: boolean;
  serviceLineIds: string[];
  accountIds: string[];
  engagementIds: string[];
  /** Normalized emails matched against SurveyInvite partner/BM/JM fields. */
  staffEmails: string[];
};

export function isScopeType(value: string): value is ScopeType {
  return (SCOPE_TYPES as readonly string[]).includes(value);
}

function normalizeStaffEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed || null;
}

function staffEmailsFromScopes(
  scopes: Array<{ scopeType: string; scopeId: string | null }>
): string[] {
  const emails = new Set<string>();
  for (const scope of scopes) {
    if (scope.scopeType !== "staffEmail") continue;
    const email = normalizeStaffEmail(scope.scopeId);
    if (email) emails.add(email);
  }
  return [...emails];
}

export function buildAuthzContext(input: {
  userId: string;
  permissions: Permission[];
  scopes: Array<{ scopeType: string; scopeId: string | null }>;
  /** When set, portfolio (or equivalent) users are always staff-email scoped. */
  roleSlug?: string | null;
  sessionEmail?: string | null;
}): AuthzContext {
  const ids = (type: ScopeType) =>
    input.scopes
      .filter((scope) => scope.scopeType === type && scope.scopeId)
      .map((scope) => scope.scopeId as string);

  const staffEmails = new Set(staffEmailsFromScopes(input.scopes));
  const sessionEmail = normalizeStaffEmail(input.sessionEmail);
  const isPortfolioRole = input.roleSlug === SYSTEM_ROLE_SLUGS.portfolio;

  if (isPortfolioRole && sessionEmail) {
    staffEmails.add(sessionEmail);
  }

  const hasStaffEmailScope = staffEmails.size > 0;
  const hasAllScope = input.scopes.some((scope) => scope.scopeType === "all");
  const hasNoScopeRows = input.scopes.length === 0;

  // Portfolio users are never unrestricted even with empty UserScope rows.
  const unrestricted =
    !isPortfolioRole &&
    !hasStaffEmailScope &&
    (hasNoScopeRows || hasAllScope);

  return {
    userId: input.userId,
    permissions: input.permissions,
    unrestricted,
    serviceLineIds: ids("serviceLine"),
    accountIds: ids("account"),
    engagementIds: ids("engagement"),
    staffEmails: [...staffEmails],
  };
}

export async function loadAuthzContext(session: Session): Promise<AuthzContext> {
  const [permissions, scopes] = await Promise.all([
    getSessionPermissions(session),
    db.userScope.findMany({
      where: { userId: session.user.id },
      select: { scopeType: true, scopeId: true },
    }),
  ]);
  return buildAuthzContext({
    userId: session.user.id,
    permissions,
    scopes,
    roleSlug: session.user.role,
    sessionEmail: session.user.email,
  });
}

export function can(ctx: AuthzContext, permission: Permission) {
  return ctx.permissions.includes(permission);
}

const DENY = { id: { in: [] as string[] } };

function hasOrgScope(ctx: AuthzContext) {
  return (
    ctx.serviceLineIds.length > 0 ||
    ctx.accountIds.length > 0 ||
    ctx.engagementIds.length > 0
  );
}

function hasAnyScope(ctx: AuthzContext) {
  return hasOrgScope(ctx) || ctx.staffEmails.length > 0;
}

/** Prisma filter matching SurveyInvite staff email columns. */
export function inviteStaffEmailWhere(
  emails: string[]
): Prisma.SurveyInviteWhereInput {
  if (emails.length === 0) return DENY;
  return {
    OR: emails.flatMap((email) => [
      { partnerEmail: { equals: email, mode: "insensitive" as const } },
      {
        businessManagerEmail: {
          equals: email,
          mode: "insensitive" as const,
        },
      },
      { jobManagerEmail: { equals: email, mode: "insensitive" as const } },
    ]),
  };
}

export function inviteScopeWhere(ctx: AuthzContext): Prisma.SurveyInviteWhereInput {
  if (ctx.unrestricted) return {};
  if (!hasAnyScope(ctx)) return DENY;

  const clauses: Prisma.SurveyInviteWhereInput[] = [];
  if (ctx.staffEmails.length > 0) {
    clauses.push(inviteStaffEmailWhere(ctx.staffEmails));
  }
  if (hasOrgScope(ctx)) {
    clauses.push({
      OR: [
        { accountId: { in: ctx.accountIds } },
        { engagementId: { in: ctx.engagementIds } },
        { engagement: { accountId: { in: ctx.accountIds } } },
        { engagement: { serviceLineId: { in: ctx.serviceLineIds } } },
      ],
    });
  }
  if (clauses.length === 1) return clauses[0]!;
  return { OR: clauses };
}

export function engagementScopeWhere(ctx: AuthzContext): Prisma.EngagementWhereInput {
  if (ctx.unrestricted) return {};
  if (!hasOrgScope(ctx)) return DENY;
  return {
    OR: [
      { id: { in: ctx.engagementIds } },
      { accountId: { in: ctx.accountIds } },
      { serviceLineId: { in: ctx.serviceLineIds } },
    ],
  };
}

export function accountScopeWhere(ctx: AuthzContext): Prisma.AccountWhereInput {
  if (ctx.unrestricted) return {};
  if (!hasOrgScope(ctx)) return DENY;
  return {
    OR: [
      { id: { in: ctx.accountIds } },
      { engagements: { some: { id: { in: ctx.engagementIds } } } },
      { engagements: { some: { serviceLineId: { in: ctx.serviceLineIds } } } },
    ],
  };
}

/**
 * Responses with no matching invite staff email (for staff-email scope) or no
 * account/engagement link (for org scope) are invisible to scoped users.
 */
export function responseScopeWhere(ctx: AuthzContext): Prisma.ResponseWhereInput {
  if (ctx.unrestricted) return {};
  if (!hasAnyScope(ctx)) return DENY;

  const clauses: Prisma.ResponseWhereInput[] = [];
  if (ctx.staffEmails.length > 0) {
    clauses.push({ surveyInvite: inviteStaffEmailWhere(ctx.staffEmails) });
  }
  if (hasOrgScope(ctx)) {
    clauses.push({
      OR: [
        { accountId: { in: ctx.accountIds } },
        { engagementId: { in: ctx.engagementIds } },
        { engagement: { accountId: { in: ctx.accountIds } } },
        { engagement: { serviceLineId: { in: ctx.serviceLineIds } } },
      ],
    });
  }
  if (clauses.length === 1) return clauses[0]!;
  return { OR: clauses };
}

export function caseScopeWhere(ctx: AuthzContext): Prisma.CaseWhereInput {
  if (ctx.unrestricted) return {};
  return { response: responseScopeWhere(ctx) };
}

export function testimonialScopeWhere(
  ctx: AuthzContext
): Prisma.TestimonialWhereInput {
  if (ctx.unrestricted) return {};
  return {
    OR: [
      { response: responseScopeWhere(ctx) },
      { surveyInvite: inviteScopeWhere(ctx) },
    ],
  };
}

/** True when the invite exists and is visible under the user's data scope. */
export async function inviteInScope(
  ctx: AuthzContext,
  inviteId: string
): Promise<boolean> {
  const row = await db.surveyInvite.findFirst({
    where: { AND: [{ id: inviteId }, inviteScopeWhere(ctx)] },
    select: { id: true },
  });
  return Boolean(row);
}
