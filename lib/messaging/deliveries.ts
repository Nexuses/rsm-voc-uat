import { randomUUID } from "node:crypto";
import { writeAuditLog } from "@/lib/audit";
import { checkFatigue } from "@/lib/automation/fatigue";
import { db } from "@/lib/db";
import { getFlagMode } from "@/lib/flags";
import { enqueueJob, type ClaimedJob } from "@/lib/jobs/queue";
import { renderTemplate } from "@/lib/messaging/render";
import { findApprovedTemplate } from "@/lib/messaging/templates";
import { getEmailProvider } from "@/lib/providers";

export const MESSAGE_SEND_JOB_TYPE = "messages.send";

type MessagePayload = {
  templateKey?: string;
  channel?: string;
  responseId?: string | null;
  accountId?: string | null;
};

/** Creates the delivery row for an approved message and queues the send job. */
export async function queueApprovedMessage(approval: {
  id: string;
  payload: unknown;
  correlationId: string | null;
}) {
  const payload = (approval.payload ?? {}) as MessagePayload;
  const response = payload.responseId
    ? await db.response.findUnique({
        where: { id: payload.responseId },
        select: { id: true, accountId: true, client: { select: { email: true } } },
      })
    : null;
  const recipient = response?.client?.email?.trim().toLowerCase() ?? "";

  const delivery = await db.messageDelivery.upsert({
    where: { dedupeKey: `approval:${approval.id}` },
    create: {
      id: randomUUID(),
      dedupeKey: `approval:${approval.id}`,
      channel: payload.channel ?? "email",
      templateKey: payload.templateKey ?? null,
      recipient: recipient || "unknown",
      accountId: response?.accountId ?? payload.accountId ?? null,
      subjectEntityType: response ? "Response" : null,
      subjectEntityId: response?.id ?? null,
      status: recipient ? "queued" : "failed",
      error: recipient ? null : "no_recipient",
      approvalRequestId: approval.id,
      correlationId: approval.correlationId,
    },
    update: {},
  });
  if (delivery.status === "queued") {
    await enqueueJob({
      type: MESSAGE_SEND_JOB_TYPE,
      jobKey: `${MESSAGE_SEND_JOB_TYPE}:${delivery.id}`,
      payload: { deliveryId: delivery.id },
      maxAttempts: 3,
      correlationId: approval.correlationId,
    });
  }
  return delivery;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function rtlHtml(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div dir="rtl" lang="ar" style="text-align:right">${paragraphs}</div>`;
}

async function activePolicy(channel: string) {
  return db.communicationPolicy.findFirst({
    where: { channel, active: true },
    orderBy: { createdAt: "asc" },
  });
}

async function sentAt(where: { recipient?: string; accountId?: string }, since: Date) {
  const rows = await db.messageDelivery.findMany({
    where: { ...where, status: "sent", sentAt: { gte: since } },
    select: { sentAt: true },
  });
  return rows.flatMap((row) => (row.sentAt ? [row.sentAt] : []));
}

export async function handleMessageSend(job: ClaimedJob, now = new Date()) {
  const deliveryId = (job.payload as { deliveryId?: string } | null)?.deliveryId;
  if (!deliveryId) throw new Error("messages.send: missing deliveryId");
  const delivery = await db.messageDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) return;

  if (delivery.status === "sending") {
    // A previous attempt died mid-send; resending could duplicate the email.
    await db.messageDelivery.update({
      where: { id: delivery.id },
      data: { status: "failed", error: "interrupted_send_needs_review" },
    });
    return;
  }
  if (delivery.status !== "queued") return;

  const mode = await getFlagMode("messaging.send");
  if (mode !== "live") {
    await db.messageDelivery.update({
      where: { id: delivery.id },
      data: { status: "held", error: `messaging.send is ${mode}` },
    });
    return;
  }

  const policy = await activePolicy(delivery.channel);
  if (!policy) {
    await db.messageDelivery.update({
      where: { id: delivery.id },
      data: { status: "held", error: "no_active_communication_policy" },
    });
    return;
  }
  const since = new Date(now.getTime() - policy.windowDays * 24 * 60 * 60 * 1000);
  const decision = checkFatigue({
    policy,
    contactSends: await sentAt({ recipient: delivery.recipient }, since),
    accountSends: delivery.accountId ? await sentAt({ accountId: delivery.accountId }, since) : [],
    now,
  });
  if (!decision.allowed) {
    await db.messageDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "suppressed",
        error: `${decision.reason} until ${decision.releaseAt.toISOString()}`,
      },
    });
    await writeAuditLog({
      actorType: "system",
      action: "message.suppressed",
      resourceType: "MessageDelivery",
      resourceId: delivery.id,
      metadata: { reason: decision.reason, policy: policy.key },
      source: "worker",
      correlationId: delivery.correlationId,
    });
    return;
  }

  const client = delivery.subjectEntityId
    ? await db.response.findUnique({
        where: { id: delivery.subjectEntityId },
        select: { language: true, client: { select: { name: true, company: true, locale: true } } },
      })
    : null;
  const locale = client?.language === "ar" || client?.client?.locale === "ar" ? "ar" : "en";
  const template = delivery.templateKey
    ? await findApprovedTemplate(delivery.templateKey, locale)
    : null;
  if (!template) {
    await db.messageDelivery.update({
      where: { id: delivery.id },
      data: { status: "held", error: "template_not_approved" },
    });
    return;
  }

  const claimed = await db.messageDelivery.updateMany({
    where: { id: delivery.id, status: "queued" },
    data: { status: "sending" },
  });
  if (!claimed.count) return;

  const variables = { name: client?.client?.name, company: client?.client?.company };
  const text = renderTemplate(template.body, variables);
  const provider = getEmailProvider();
  try {
    const result = await provider.send({
      to: delivery.recipient,
      subject: renderTemplate(template.subject ?? "", variables),
      text,
      ...(template.locale === "ar" ? { html: rtlHtml(text) } : {}),
    });
    await db.messageDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        provider: provider.name,
        providerMessageId: result.providerMessageId,
        error: null,
      },
    });
    await writeAuditLog({
      actorType: "system",
      action: "message.sent",
      resourceType: "MessageDelivery",
      resourceId: delivery.id,
      metadata: { templateKey: delivery.templateKey, provider: provider.name, locale },
      source: "worker",
      correlationId: delivery.correlationId,
    });
  } catch (error) {
    await db.messageDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "failed",
        provider: provider.name,
        error: error instanceof Error ? error.message.slice(0, 500) : "send failed",
      },
    });
  }
}
