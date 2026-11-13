import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  isSmtpConfigured: vi.fn(),
  listSurveyInviteTrackerRows: vi.fn(),
  sendSurveyInviteFollowup: vi.fn(),
  addSurveyInviteNote: vi.fn(),
  deleteSurveyInvite: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requirePermission: mocks.requirePermission,
  isCxAuthError: (error: unknown) =>
    error instanceof Error && error.message === "Unauthorized",
  isCxPermissionError: (error: unknown) =>
    error instanceof Error && error.message.startsWith("Missing permission"),
}));

vi.mock("@/lib/survey-invite-email", () => ({
  isSmtpConfigured: mocks.isSmtpConfigured,
}));

vi.mock("@/lib/survey-invite-tracking", () => ({
  listSurveyInviteTrackerRows: mocks.listSurveyInviteTrackerRows,
  sendSurveyInviteFollowup: mocks.sendSurveyInviteFollowup,
  addSurveyInviteNote: mocks.addSurveyInviteNote,
  deleteSurveyInvite: mocks.deleteSurveyInvite,
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/survey/invites/route";
import { POST } from "@/app/api/survey/invites/[id]/followup/route";
import { POST as POST_NOTE } from "@/app/api/survey/invites/[id]/notes/route";
import { DELETE } from "@/app/api/survey/invites/[id]/route";

function deleteRequest() {
  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/survey/invites/invite-1",
    { method: "DELETE" }
  );
}

describe("survey invite tracker routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({ user: { id: "user-1" } });
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.listSurveyInviteTrackerRows.mockResolvedValue([
      {
        id: "invite-1",
        email: "client@example.com",
        name: "Sara Al-Sabah",
        company: "Acme Holdings",
        sentAt: "2026-06-01T10:00:00.000Z",
        nextFollowUpAt: "2026-06-04T10:00:00.000Z",
        status: "sent",
        statusLabel: "Invitation sent",
        followup1SentAt: null,
        followup2SentAt: null,
        canSendFollowUp: true,
      },
    ]);
    mocks.sendSurveyInviteFollowup.mockResolvedValue({ sent: true });
  });

  it("returns tracker rows for authenticated CX users", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invites).toHaveLength(1);
    expect(body.invites[0].email).toBe("client@example.com");
  });

  it("sends the first follow-up immediately when requested", async () => {
    const response = await POST(
      new NextRequest(
        "https://rsm-voc-platform.vercel.app/api/survey/invites/invite-1/followup",
        { method: "POST" }
      ),
      { params: Promise.resolve({ id: "invite-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.sendSurveyInviteFollowup).toHaveBeenCalledWith({
      inviteId: "invite-1",
      mode: "manual",
      actorUserId: "user-1",
    });
  });

  it("rejects manual follow-up sends for completed invites", async () => {
    mocks.sendSurveyInviteFollowup.mockResolvedValue({
      sent: false,
      reason: "completed",
    });

    const response = await POST(
      new NextRequest(
        "https://rsm-voc-platform.vercel.app/api/survey/invites/invite-1/followup",
        { method: "POST" }
      ),
      { params: Promise.resolve({ id: "invite-1" }) }
    );

    expect(response.status).toBe(409);
  });

  it("saves a follow-up note for an invitation", async () => {
    mocks.addSurveyInviteNote.mockResolvedValue({
      id: "event-1",
      type: "note",
      templateId: null,
      message: "Called the client.",
      actorUserId: "user-1",
      createdAt: "2026-06-02T10:00:00.000Z",
    });

    const response = await POST_NOTE(
      new NextRequest(
        "https://rsm-voc-platform.vercel.app/api/survey/invites/invite-1/notes",
        {
          method: "POST",
          body: JSON.stringify({ message: "Called the client." }),
          headers: { "Content-Type": "application/json" },
        }
      ),
      { params: Promise.resolve({ id: "invite-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mocks.addSurveyInviteNote).toHaveBeenCalledWith({
      inviteId: "invite-1",
      message: "Called the client.",
      actorUserId: "user-1",
    });
  });

  it("deletes an invitation for users with responses.manage", async () => {
    mocks.deleteSurveyInvite.mockResolvedValue({ ok: true });

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ id: "invite-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("responses.manage");
    expect(mocks.deleteSurveyInvite).toHaveBeenCalledWith({
      inviteId: "invite-1",
      actorUserId: "user-1",
    });
  });

  it("returns 404 when deleting an unknown invitation", async () => {
    mocks.deleteSurveyInvite.mockResolvedValue({ ok: false });

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ id: "invite-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("forbids invitation delete without responses.manage", async () => {
    mocks.requirePermission.mockRejectedValue(
      new Error("Missing permission: responses.manage")
    );

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({ id: "invite-1" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.deleteSurveyInvite).not.toHaveBeenCalled();
  });
});
