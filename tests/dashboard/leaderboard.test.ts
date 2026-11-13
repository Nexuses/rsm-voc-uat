import { describe, expect, it } from "vitest";
import {
  buildLeaderboard,
  filterLeaderboardRows,
  type LeaderboardSourceRow,
} from "@/lib/leaderboard";

function row(
  partial: Partial<LeaderboardSourceRow> & {
    department?: string | null;
    partner?: string | null;
  }
): LeaderboardSourceRow {
  return {
    submittedAt: partial.submittedAt ?? "2026-06-15T10:00:00.000Z",
    csatScore: partial.csatScore ?? 4,
    cesScore: partial.cesScore ?? 5,
    npsScore: partial.npsScore ?? 8,
    department: partial.department ?? null,
    partner: partial.partner ?? null,
    businessManagerName: partial.businessManagerName ?? null,
    jobManagerName: partial.jobManagerName ?? null,
  };
}

describe("buildLeaderboard", () => {
  it("groups by normalized department label and ranks by CSAT", () => {
    const rows: LeaderboardSourceRow[] = [
      row({ department: "Assurance", csatScore: 5 }),
      row({ department: "ASSURANCE", csatScore: 5 }),
      row({ department: "Assurance", csatScore: 4 }),
      row({ department: "Tax", csatScore: 3 }),
      row({ department: "Tax", csatScore: 2 }),
      row({ department: "Tax", csatScore: 3 }),
      row({ department: null, csatScore: 1 }),
    ];

    const result = buildLeaderboard({
      rows,
      dimension: "department",
      metric: "csat",
      minN: 3,
    });

    expect(result.unlabeledCount).toBe(1);
    expect(result.rows).toHaveLength(2);
    expect(result.top?.label.toLowerCase()).toContain("assurance");
    expect(result.lowest?.label.toLowerCase()).toBe("tax");
    expect(result.top?.rank).toBe(1);
    expect(result.lowest?.rank).toBe(2);
    expect(result.average.n).toBe(7);
    expect(result.top?.csatAverage).toBeGreaterThan(
      result.lowest?.csatAverage ?? 0
    );
  });

  it("excludes groups below minN", () => {
    const rows: LeaderboardSourceRow[] = [
      row({ partner: "Alpha", csatScore: 5 }),
      row({ partner: "Alpha", csatScore: 5 }),
      row({ partner: "Beta", csatScore: 2 }),
      row({ partner: "Beta", csatScore: 2 }),
      row({ partner: "Beta", csatScore: 2 }),
    ];

    const result = buildLeaderboard({
      rows,
      dimension: "partner",
      minN: 3,
    });

    expect(result.excludedBelowMinN).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.label).toBe("Beta");
  });

  it("ranks by NPS when selected", () => {
    const rows: LeaderboardSourceRow[] = [
      row({
        businessManagerName: "Sara",
        npsScore: 10,
        csatScore: 3,
      }),
      row({
        businessManagerName: "Sara",
        npsScore: 9,
        csatScore: 3,
      }),
      row({
        businessManagerName: "Sara",
        npsScore: 9,
        csatScore: 3,
      }),
      row({
        businessManagerName: "Omar",
        npsScore: 2,
        csatScore: 5,
      }),
      row({
        businessManagerName: "Omar",
        npsScore: 3,
        csatScore: 5,
      }),
      row({
        businessManagerName: "Omar",
        npsScore: 1,
        csatScore: 5,
      }),
    ];

    const result = buildLeaderboard({
      rows,
      dimension: "businessManager",
      metric: "nps",
      minN: 3,
    });

    expect(result.top?.label).toBe("Sara");
    expect(result.lowest?.label).toBe("Omar");
    expect(result.top?.deltaVsOverall).not.toBeNull();
  });
});

describe("filterLeaderboardRows", () => {
  it("applies window and calendar range", () => {
    const rows = [
      row({ submittedAt: "2026-01-10T00:00:00.000Z", department: "Tax" }),
      row({ submittedAt: "2026-06-10T00:00:00.000Z", department: "Tax" }),
      row({ submittedAt: "2025-06-10T00:00:00.000Z", department: "Tax" }),
    ];

    const filtered = filterLeaderboardRows(rows, "year", "2026-05-01", "2026-12-31");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.submittedAt).toBe("2026-06-10T00:00:00.000Z");
  });
});
