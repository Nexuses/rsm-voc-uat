import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryTable } from "../helpers/memory-db";

const state = vi.hoisted(() => ({
  mode: "live" as "off" | "shadow" | "live",
  tables: {} as Record<string, ReturnType<typeof import("../helpers/memory-db").createMemoryTable>>,
  send: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return state.tables;
  },
}));
vi.mock("@/lib/flags", () => ({ getFlagMode: vi.fn(async () => state.mode) }));
vi.mock("@/lib/audit", () => ({ writeAuditLog: state.audit }));
vi.mock("@/lib/jobs/queue", () => ({ enqueueJob: vi.fn() }));
vi.mock("@/lib/providers", () => ({
  getEmailProvider: () => ({ name: "test-mail", isConfigured: () => true, send: state.send }),
}));
vi.mock("@/lib/messaging/templates", () => ({
  findApprovedTemplate: vi.fn(async () => ({
    subject: "Following up, {{name}}",
    body: "Dear {{name}} at {{company}}, thank you.",
  })),
}));

import { handleMessageSend } from "@/lib/messaging/deliveries";
import type { ClaimedJob } from "@/lib/jobs/queue";

const now = new Date("2026-09-28T12:00:00Z");
const job: ClaimedJob = {
  id: "job-1",
  type: "messages.send",
  jobKey: "messages.send:d-1",
  payload: { deliveryId: "d-1" },
  attempts: 1,
  maxAttempts: 3,
  correlationId: null,
};

function delivery() {
  return state.tables.messageDelivery.rows.find((row) => row.id === "d-1")!;
}

beforeEach(() => {
  state.mode = "live";
  state.send.mockReset();
  state.send.mockResolvedValue({ providerMessageId: "pm-1" });
  state.audit.mockReset();
  state.tables = {
    messageDelivery: createMemoryTable([["dedupeKey"]]),
    communicationPolicy: createMemoryTable(),
    response: createMemoryTable(),
  };
  state.tables.messageDelivery.rows.push({
    id: "d-1",
    dedupeKey: "approval:a-1",
    channel: "email",
    templateKey: "detractor-apology",
    recipient: "client@example.com",
    accountId: null,
    subjectEntityId: "response-1",
    status: "queued",
    correlationId: null,
  });
  state.tables.communicationPolicy.rows.push({
    id: "p-1",
    key: "email-default",
    channel: "email",
    active: true,
    maxPerContact: 3,
    maxPerAccount: null,
    windowDays: 30,
    minIntervalDays: 0,
  });
  state.tables.response.rows.push({
    id: "response-1",
    language: "en",
    client: { name: "Sara", company: "Acme", locale: "en" },
  });
});

describe("messages.send", () => {
  it("holds messages while the messaging flag is not live", async () => {
    state.mode = "shadow";
    await handleMessageSend(job, now);
    expect(delivery()).toMatchObject({ status: "held", error: "messaging.send is shadow" });
    expect(state.send).not.toHaveBeenCalled();
  });

  it("holds messages when no communication policy is configured", async () => {
    state.tables.communicationPolicy.rows.length = 0;
    await handleMessageSend(job, now);
    expect(delivery()).toMatchObject({ status: "held", error: "no_active_communication_policy" });
  });

  it("sends once with rendered text and records the provider", async () => {
    await handleMessageSend(job, now);
    await handleMessageSend(job, now);
    expect(state.send).toHaveBeenCalledOnce();
    expect(state.send).toHaveBeenCalledWith({
      to: "client@example.com",
      subject: "Following up, Sara",
      text: "Dear Sara at Acme, thank you.",
    });
    expect(delivery()).toMatchObject({ status: "sent", provider: "test-mail", providerMessageId: "pm-1" });
  });

  it("escapes and wraps Arabic bodies right-to-left", async () => {
    const { rtlHtml } = await import("@/lib/messaging/deliveries");
    expect(rtlHtml("Line one <b>\nwrapped\n\nLine two")).toBe(
      '<div dir="rtl" lang="ar" style="text-align:right"><p>Line one &lt;b&gt;<br>wrapped</p><p>Line two</p></div>'
    );
  });

  it("never resends after an interrupted attempt", async () => {
    delivery().status = "sending";
    await handleMessageSend(job, now);
    expect(state.send).not.toHaveBeenCalled();
    expect(delivery()).toMatchObject({ status: "failed", error: "interrupted_send_needs_review" });
  });
});
