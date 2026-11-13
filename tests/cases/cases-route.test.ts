import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  loadAuthzContext: vi.fn(),
  listCases: vi.fn(),
  getCaseDetail: vi.fn(),
  transitionCase: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: mocks.requirePermission,
  isCxAuthError: (error: unknown) =>
    error instanceof Error && error.message === "Unauthorized",
  isCxPermissionError: (error: unknown) =>
    error instanceof Error && error.message.startsWith("Missing permission"),
}));

vi.mock("@/lib/authz", () => ({
  loadAuthzContext: mocks.loadAuthzContext,
}));

vi.mock("@/lib/cases/queries", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cases/queries")>(
    "@/lib/cases/queries"
  );
  return {
    ...actual,
    listCases: mocks.listCases,
    getCaseDetail: mocks.getCaseDetail,
  };
});

vi.mock("@/lib/cases/service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cases/service")>(
    "@/lib/cases/service"
  );
  return {
    ...actual,
    transitionCase: mocks.transitionCase,
  };
});

import { GET } from "@/app/api/cases/route";
import { PATCH } from "@/app/api/cases/[id]/route";

describe("cases API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadAuthzContext.mockResolvedValue({ userId: "cx-1", scopes: [] });
  });

  it("requires cases.read to list the board", async () => {
    mocks.requirePermission.mockRejectedValue(
      new Error("Missing permission: cases.read")
    );
    const response = await GET(
      new NextRequest("http://localhost:3000/api/cases?view=board")
    );
    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith("cases.read");
    expect(mocks.listCases).not.toHaveBeenCalled();
  });

  it("lists board cases for CX", async () => {
    mocks.requirePermission.mockResolvedValue({ user: { id: "cx-1" } });
    mocks.listCases.mockResolvedValue({
      cases: [
        {
          id: "case-1",
          number: 12,
          title: "Low NPS score follow-up",
          status: "new",
          severity: "medium",
          source: "automation",
          slaDueAt: null,
          slaBreached: false,
          createdAt: "2026-10-27T00:00:00.000Z",
          ownerEmail: null,
          clientName: "Client",
          company: "Acme",
          department: "Audit",
          partner: "Partner A",
          csatScore: 2,
          cesScore: 4,
          npsScore: 4,
          triggerMetrics: ["NPS", "CSAT"],
          taskTitle: "Contact the client about their feedback",
          allowedTransitions: ["triaged", "in_progress", "closed"],
        },
      ],
      nextCursor: null,
    });

    const response = await GET(
      new NextRequest("http://localhost:3000/api/cases?view=board&limit=200")
    );
    expect(response.status).toBe(200);
    expect(mocks.listCases).toHaveBeenCalledWith(
      expect.objectContaining({ view: "board", limit: 200 })
    );
    const body = await response.json();
    expect(body.cases[0].partner).toBe("Partner A");
    expect(body.cases[0].department).toBe("Audit");
    expect(body.cases[0].taskTitle).toContain("Contact the client");
  });

  it("requires cases.manage to transition", async () => {
    mocks.requirePermission.mockRejectedValue(
      new Error("Missing permission: cases.manage")
    );
    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/cases/case-1", {
        method: "PATCH",
        body: JSON.stringify({ action: "transition", toStatus: "triaged" }),
      }),
      { params: Promise.resolve({ id: "case-1" }) }
    );
    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith("cases.manage");
    expect(mocks.transitionCase).not.toHaveBeenCalled();
  });

  it("transitions a case and returns detail", async () => {
    mocks.requirePermission.mockResolvedValue({ user: { id: "cx-1" } });
    mocks.getCaseDetail
      .mockResolvedValueOnce({
        id: "case-1",
        status: "new",
        allowedTransitions: ["triaged"],
      })
      .mockResolvedValueOnce({
        id: "case-1",
        status: "triaged",
        allowedTransitions: ["in_progress", "closed"],
        number: 12,
        title: "Low NPS score follow-up",
        severity: "medium",
        priority: "normal",
        source: "automation",
        triggerMetrics: ["NPS"],
        slaDueAt: null,
        slaPolicy: null,
        firstRespondedAt: null,
        resolvedAt: null,
        closedAt: null,
        createdAt: "2026-10-27T00:00:00.000Z",
        owner: null,
        requiresClientConfirmation: false,
        clientConfirmedAt: null,
        clientConfirmationNote: null,
        escalations: [],
        response: null,
        activities: [],
        tasks: [],
      });
    mocks.transitionCase.mockResolvedValue(undefined);

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/cases/case-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transition", toStatus: "triaged" }),
      }),
      { params: Promise.resolve({ id: "case-1" }) }
    );
    expect(response.status).toBe(200);
    expect(mocks.transitionCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: "case-1",
        toStatus: "triaged",
        actorUserId: "cx-1",
      })
    );
    const body = await response.json();
    expect(body.status).toBe("triaged");
  });
});
