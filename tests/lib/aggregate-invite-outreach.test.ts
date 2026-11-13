import { describe, expect, it } from "vitest";
import { rollupInvitesByPeriod } from "@/lib/aggregate";

describe("rollupInvitesByPeriod", () => {
  it("counts sent invites and completed invite responses by sent month", () => {
    const rollup = rollupInvitesByPeriod([
      {
        sentAt: new Date("2026-06-24T10:00:00.000Z"),
        completedAt: new Date("2026-06-24T11:00:00.000Z"),
      },
      {
        sentAt: new Date("2026-06-24T12:00:00.000Z"),
        completedAt: null,
      },
      {
        sentAt: new Date("2026-05-01T12:00:00.000Z"),
        completedAt: new Date("2026-05-02T12:00:00.000Z"),
      },
    ]);

    expect(rollup.get("2026-06")).toEqual({
      invitesSentCount: 2,
      inviteResponsesCount: 1,
    });
    expect(rollup.get("2026-05")).toEqual({
      invitesSentCount: 1,
      inviteResponsesCount: 1,
    });
  });
});
