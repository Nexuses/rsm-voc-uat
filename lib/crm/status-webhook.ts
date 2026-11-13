import { createHmac, randomUUID } from "node:crypto";
import { getAppBaseUrl, getSurveyUrl } from "@/lib/app-base-url";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type CrmSurveyStatus =
  | "sent"
  | "opened"
  | "filling"
  | "completed";

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isCrmStatusWebhookConfigured() {
  return Boolean(process.env.CRM_STATUS_WEBHOOK_URL?.trim());
}

export function buildResultLinkUrl(resultToken: string) {
  return `${getAppBaseUrl()}/results/${encodeURIComponent(resultToken)}`;
}

function buildSurveyUrlForToken(token: string) {
  return `${getSurveyUrl()}?invite=${encodeURIComponent(token)}`;
}

function signPayload(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export type CrmStatusInviteFields = {
  id: string;
  email: string;
  token: string;
  resultToken: string;
  externalEngagementId: string | null;
  triggerStage: string | null;
  projectId: string | null;
  idempotencyKey: string | null;
};

export function buildCrmStatusPayload(input: {
  status: CrmSurveyStatus;
  invite: CrmStatusInviteFields;
  occurredAt?: Date;
  scores?: Prisma.InputJsonValue;
}) {
  const occurredAt = (input.occurredAt ?? new Date()).toISOString();
  return {
    schemaVersion: "1.0" as const,
    event: "survey.status" as const,
    status: input.status,
    occurredAt,
    inviteId: input.invite.id,
    externalEngagementId: input.invite.externalEngagementId,
    triggerStage: input.invite.triggerStage,
    projectId: input.invite.projectId,
    idempotencyKey: input.invite.idempotencyKey,
    email: input.invite.email,
    surveyUrl: buildSurveyUrlForToken(input.invite.token),
    resultLinkUrl: buildResultLinkUrl(input.invite.resultToken),
    ...(input.scores ? { scores: input.scores } : {}),
  };
}

export async function dispatchCrmStatusWebhook(input: {
  status: CrmSurveyStatus;
  invite: CrmStatusInviteFields;
  occurredAt?: Date;
  scores?: Prisma.InputJsonValue;
}) {
  const url = process.env.CRM_STATUS_WEBHOOK_URL?.trim();
  if (!url) return { delivered: false, reason: "not_configured" as const };

  const payload = buildCrmStatusPayload(input);
  const body = JSON.stringify(payload);
  const secret = process.env.CRM_STATUS_WEBHOOK_SECRET?.trim();

  let lastError: string | null = null;
  let httpStatus: number | null = null;
  let attemptCount = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attemptCount = attempt;
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "RSM-VOC-CRM-Status/1.0",
      };
      if (secret) {
        headers.Authorization = `Bearer ${secret}`;
        headers["X-VOC-Signature"] = signPayload(body, secret);
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });
      httpStatus = response.status;
      if (response.ok) {
        await db.crmWebhookDelivery.create({
          data: {
            id: randomUUID(),
            inviteId: input.invite.id,
            status: input.status,
            payload: payload as Prisma.InputJsonValue,
            success: true,
            httpStatus,
            attemptCount,
          },
        });
        return { delivered: true as const, httpStatus };
      }

      lastError = `HTTP ${response.status}`;
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(RETRY_DELAY_MS * attempt);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "network error";
      if (attempt === MAX_ATTEMPTS) break;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  await db.crmWebhookDelivery.create({
    data: {
      id: randomUUID(),
      inviteId: input.invite.id,
      status: input.status,
      payload: payload as Prisma.InputJsonValue,
      success: false,
      httpStatus,
      error: lastError,
      attemptCount,
    },
  });

  return { delivered: false as const, reason: "failed" as const, error: lastError };
}

/** Fire-and-forget wrapper that never throws to callers. */
export function notifyCrmSurveyStatus(input: {
  status: CrmSurveyStatus;
  invite: CrmStatusInviteFields;
  occurredAt?: Date;
  scores?: Prisma.InputJsonValue;
}) {
  void dispatchCrmStatusWebhook(input).catch((error) => {
    console.error("CRM status webhook failed:", error);
  });
}
