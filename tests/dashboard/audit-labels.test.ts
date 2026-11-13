import { describe, expect, it } from "vitest";
import {
  formatAuditDetails,
  labelAuditAction,
  labelAuditActorType,
} from "@/lib/audit";

describe("audit labels", () => {
  it("maps known actions to readable text", () => {
    expect(labelAuditAction("auth.login_success")).toBe("Logged in");
    expect(labelAuditAction("user.password_changed")).toBe("Password changed");
    expect(labelAuditAction("survey_invite.sent")).toBe(
      "Survey invitation sent"
    );
  });

  it("labels actor types", () => {
    expect(labelAuditActorType("user")).toBe("Dashboard user");
    expect(labelAuditActorType("integration")).toBe("API integration");
  });

  it("formats metadata into readable details", () => {
    expect(
      formatAuditDetails({
        action: "survey_invite.sent",
        metadata: {
          email: "client@example.com",
          triggerStage: "mid",
          projectId: "PRJ-1",
        },
      })
    ).toBe("client@example.com · stage: mid · project: PRJ-1");

    expect(
      formatAuditDetails({
        action: "auth.login_success",
        metadata: {},
      })
    ).toBe("—");
  });
});
