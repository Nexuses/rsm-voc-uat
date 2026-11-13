import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    crmWebhookDelivery: {
      create: mocks.create,
    },
  },
}));

import {
  buildCrmStatusPayload,
  buildResultLinkUrl,
  dispatchCrmStatusWebhook,
} from "@/lib/crm/status-webhook";

describe("CRM status webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_URL = "https://voc.example.com";
    process.env.CRM_STATUS_WEBHOOK_URL = "https://crm.example.com/hook";
    process.env.CRM_STATUS_WEBHOOK_SECRET = "secret-value";
    mocks.create.mockResolvedValue({});
  });

  it("builds status payload with survey and result URLs", () => {
    const payload = buildCrmStatusPayload({
      status: "opened",
      invite: {
        id: "invite-1",
        email: "client@example.com",
        token: "invite-token",
        resultToken: "result-token",
        externalEngagementId: "ENG-1",
        triggerStage: "mid",
        projectId: "PRJ-1",
        idempotencyKey: "ENG-1-mid-client@example.com",
      },
      occurredAt: new Date("2026-08-25T12:00:00.000Z"),
    });

    expect(payload).toMatchObject({
      schemaVersion: "1.0",
      event: "survey.status",
      status: "opened",
      inviteId: "invite-1",
      externalEngagementId: "ENG-1",
      triggerStage: "mid",
      idempotencyKey: "ENG-1-mid-client@example.com",
      surveyUrl: expect.stringContaining("invite=invite-token"),
      resultLinkUrl: buildResultLinkUrl("result-token"),
    });
  });

  it("posts signed payload and records delivery", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await dispatchCrmStatusWebhook({
      status: "sent",
      invite: {
        id: "invite-1",
        email: "client@example.com",
        token: "invite-token",
        resultToken: "result-token",
        externalEngagementId: null,
        triggerStage: "post",
        projectId: null,
        idempotencyKey: null,
      },
    });

    expect(result.delivered).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = String(init.body);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-value");
    expect(headers["X-VOC-Signature"]).toBe(
      createHmac("sha256", "secret-value").update(body).digest("hex")
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: true, status: "sent" }),
      })
    );

    vi.unstubAllGlobals();
  });
});
