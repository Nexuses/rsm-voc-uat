import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAnyPermission: vi.fn(),
  responseFindMany: vi.fn(),
  getSessionPermissions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAnyPermission: mocks.requireAnyPermission,
  isCxAuthError: (error: unknown) =>
    error instanceof Error && error.message === "auth",
  isCxPermissionError: (error: unknown) =>
    error instanceof Error && error.message === "permission",
}));

vi.mock("@/lib/authz", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/authz")>();
  return {
    ...actual,
    loadAuthzContext: async () =>
      actual.buildAuthzContext({
        userId: "cx-1",
        permissions: await mocks.getSessionPermissions(),
        scopes: [],
      }),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    response: {
      findMany: mocks.responseFindMany,
    },
  },
}));

import { GET } from "@/app/api/insights/leaderboard/route";

function request(query: string) {
  return new NextRequest(
    `https://rsm-voc-platform.vercel.app/api/insights/leaderboard?${query}`
  );
}

describe("GET /api/insights/leaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAnyPermission.mockResolvedValue({ user: { id: "cx-1" } });
    mocks.getSessionPermissions.mockResolvedValue(["dashboard.leaderboard"]);
    mocks.responseFindMany.mockResolvedValue([
      {
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
        completedAt: new Date("2026-06-01T10:00:00.000Z"),
        createdAt: new Date("2026-06-01T10:00:00.000Z"),
        surveyInvite: {
          department: "Assurance",
          partner: "Partner A",
          businessManagerName: "Sara",
          jobManagerName: "Omar",
        },
      },
      {
        csatScore: 5,
        cesScore: 6,
        npsScore: 9,
        completedAt: new Date("2026-06-02T10:00:00.000Z"),
        createdAt: new Date("2026-06-02T10:00:00.000Z"),
        surveyInvite: {
          department: "Assurance",
          partner: "Partner A",
          businessManagerName: "Sara",
          jobManagerName: "Omar",
        },
      },
      {
        csatScore: 4,
        cesScore: 5,
        npsScore: 8,
        completedAt: new Date("2026-06-03T10:00:00.000Z"),
        createdAt: new Date("2026-06-03T10:00:00.000Z"),
        surveyInvite: {
          department: "Assurance",
          partner: "Partner A",
          businessManagerName: "Sara",
          jobManagerName: "Omar",
        },
      },
    ]);
  });

  it("returns ranked department rows without a 500 take limit on the query", async () => {
    const response = await GET(request("dimension=department&metric=csat&minN=3"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.rows).toHaveLength(1);
    expect(body.top.label).toBe("Assurance");
    expect(body.overall.n).toBe(3);
    expect(mocks.responseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
        select: expect.any(Object),
      })
    );
    const call = mocks.responseFindMany.mock.calls[0]?.[0] as {
      take?: number;
    };
    expect(call.take).toBeUndefined();
  });

  it("rejects invalid dimension", async () => {
    const response = await GET(request("dimension=teamLeader"));
    expect(response.status).toBe(400);
  });

  it("requires overview or reports permission", async () => {
    mocks.requireAnyPermission.mockRejectedValue(new Error("permission"));
    const response = await GET(request("dimension=partner"));
    expect(response.status).toBe(403);
  });
});
