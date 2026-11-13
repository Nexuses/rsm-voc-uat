import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getSessionPermissions: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: {} }));

import {
  accountScopeWhere,
  buildAuthzContext,
  can,
  caseScopeWhere,
  engagementScopeWhere,
  inviteScopeWhere,
  responseScopeWhere,
  testimonialScopeWhere,
} from "@/lib/authz";
import { responseScopeSql } from "@/lib/ai/scope-sql";

const base = { userId: "u1", permissions: ["cases.read" as const] };

describe("authz scope filters", () => {
  it("keeps users without scope rows unrestricted (backward compatible)", () => {
    const ctx = buildAuthzContext({ ...base, scopes: [] });
    expect(ctx.unrestricted).toBe(true);
    expect(ctx.staffEmails).toEqual([]);
    expect(responseScopeWhere(ctx)).toEqual({});
    expect(inviteScopeWhere(ctx)).toEqual({});
    expect(caseScopeWhere(ctx)).toEqual({});
  });

  it("treats an explicit all scope as unrestricted", () => {
    const ctx = buildAuthzContext({
      ...base,
      scopes: [
        { scopeType: "account", scopeId: "a1" },
        { scopeType: "all", scopeId: null },
      ],
    });
    expect(accountScopeWhere(ctx)).toEqual({});
  });

  it("limits responses, accounts, and engagements to the assigned ids", () => {
    const ctx = buildAuthzContext({
      ...base,
      scopes: [
        { scopeType: "account", scopeId: "a1" },
        { scopeType: "serviceLine", scopeId: "s1" },
      ],
    });
    expect(ctx.unrestricted).toBe(false);
    expect(responseScopeWhere(ctx)).toEqual({
      OR: [
        { accountId: { in: ["a1"] } },
        { engagementId: { in: [] } },
        { engagement: { accountId: { in: ["a1"] } } },
        { engagement: { serviceLineId: { in: ["s1"] } } },
      ],
    });
    expect(engagementScopeWhere(ctx)).toEqual({
      OR: [
        { id: { in: [] } },
        { accountId: { in: ["a1"] } },
        { serviceLineId: { in: ["s1"] } },
      ],
    });
    expect(caseScopeWhere(ctx)).toEqual({ response: responseScopeWhere(ctx) });
  });

  it("denies everything when scope rows exist but none resolve to ids", () => {
    const ctx = buildAuthzContext({
      ...base,
      scopes: [{ scopeType: "account", scopeId: null }],
    });
    expect(responseScopeWhere(ctx)).toEqual({ id: { in: [] } });
    expect(accountScopeWhere(ctx)).toEqual({ id: { in: [] } });
    expect(inviteScopeWhere(ctx)).toEqual({ id: { in: [] } });
  });

  it("scopes portfolio users by session email even with empty UserScope rows", () => {
    const ctx = buildAuthzContext({
      ...base,
      scopes: [],
      roleSlug: "portfolio",
      sessionEmail: "Ahmed.Nawar@rsm.com.kw",
    });
    expect(ctx.unrestricted).toBe(false);
    expect(ctx.staffEmails).toEqual(["ahmed.nawar@rsm.com.kw"]);
    expect(responseScopeWhere(ctx)).toEqual({
      surveyInvite: {
        OR: [
          {
            partnerEmail: {
              equals: "ahmed.nawar@rsm.com.kw",
              mode: "insensitive",
            },
          },
          {
            businessManagerEmail: {
              equals: "ahmed.nawar@rsm.com.kw",
              mode: "insensitive",
            },
          },
          {
            jobManagerEmail: {
              equals: "ahmed.nawar@rsm.com.kw",
              mode: "insensitive",
            },
          },
        ],
      },
    });
    expect(inviteScopeWhere(ctx)).toEqual({
      OR: [
        {
          partnerEmail: {
            equals: "ahmed.nawar@rsm.com.kw",
            mode: "insensitive",
          },
        },
        {
          businessManagerEmail: {
            equals: "ahmed.nawar@rsm.com.kw",
            mode: "insensitive",
          },
        },
        {
          jobManagerEmail: {
            equals: "ahmed.nawar@rsm.com.kw",
            mode: "insensitive",
          },
        },
      ],
    });
    expect(testimonialScopeWhere(ctx)).toEqual({
      OR: [
        { response: responseScopeWhere(ctx) },
        { surveyInvite: inviteScopeWhere(ctx) },
      ],
    });
  });

  it("honors explicit staffEmail UserScope rows", () => {
    const ctx = buildAuthzContext({
      ...base,
      scopes: [{ scopeType: "staffEmail", scopeId: "mai.elshabassy@rsm.com.kw" }],
    });
    expect(ctx.unrestricted).toBe(false);
    expect(ctx.staffEmails).toEqual(["mai.elshabassy@rsm.com.kw"]);
  });

  it("builds SQL for staff-email scope", () => {
    const ctx = buildAuthzContext({
      ...base,
      scopes: [],
      roleSlug: "portfolio",
      sessionEmail: "partner@rsm.com.kw",
    });
    const sql = responseScopeSql(ctx, 2);
    expect(sql.clause).toContain("SurveyInvite");
    expect(sql.clause).toContain("partnerEmail");
    expect(sql.params).toEqual([["partner@rsm.com.kw"]]);
  });

  it("checks permissions", () => {
    const ctx = buildAuthzContext({ ...base, scopes: [] });
    expect(can(ctx, "cases.read")).toBe(true);
    expect(can(ctx, "cases.manage")).toBe(false);
  });
});
