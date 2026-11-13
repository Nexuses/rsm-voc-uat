import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { recomputeInviteOutreachSnapshots } from "@/lib/aggregate";
import { getSurveyUrl } from "@/lib/app-base-url";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { buildSurveyCompletionPayload } from "@/lib/crm/completion-payload";
import {
  buildResultLinkUrl,
  notifyCrmSurveyStatus,
  type CrmStatusInviteFields,
} from "@/lib/crm/status-webhook";
import { upsertStaffContactsFromRecipient } from "@/lib/survey-staff-contacts";
import { sendSurveyInviteEmail } from "@/lib/survey-invite-email";
import { isCompleteSurveyResponse } from "@/lib/survey/metrics";
import { normalizeRespondentEmail } from "@/lib/survey/quarterly-overwrite";
import {
  getTeamNotifyRecipients,
  sendSurveyCompletionNotifications,
} from "@/lib/survey-thankyou-email";
import {
  recordSurveyInviteActivity,
  toSurveyInviteActivityEvent,
  type SurveyInviteActivityEvent,
} from "@/lib/survey-invite-events";
import {
  deriveNextFollowUpDate,
  deriveReminderLifecycleStatus,
  followupCountFromLegacyTimestamps,
  isAutoFollowupDue,
  isKuwaitReminderWeekday,
  SURVEY_FOLLOWUP_INTERVAL_DAYS,
  SURVEY_FOLLOWUP_MAX_COUNT,
  type ReminderLifecycleStatus,
} from "@/lib/survey-followup-cadence";
import { getSurveyReminderSettings } from "@/lib/survey-reminder-config";
import {
  renderSurveyFollowupEmail,
  renderSurveyInviteTemplate,
} from "@/lib/survey-invite-templates";
import {
  dedupeEmails,
  formatRecipientName,
  personalizeInviteBody,
  type SurveyInviteRecord,
  type SurveyRecipient,
} from "@/lib/survey-outreach";

export type { SurveyInviteRecord, SurveyOutreachStats, SurveyRecipient } from "@/lib/survey-outreach";
export {
  buildSurveyOutreachStats,
  CSV_RECIPIENT_COLUMNS,
  dedupeEmails,
  formatRecipientName,
  parseEmailsFromCsv,
  parseRecipientsFromCsv,
  personalizeInviteBody,
  SURVEY_LINK_PLACEHOLDER,
} from "@/lib/survey-outreach";

export type SurveyInviteOpenStartEvent = "open" | "start";
/** @deprecated Use SurveyInviteOpenStartEvent */
export type SurveyInviteEvent = SurveyInviteOpenStartEvent;

export {
  deriveNextFollowUpDate,
  SURVEY_FOLLOWUP_INTERVAL_DAYS,
  SURVEY_FOLLOWUP_MAX_COUNT,
  SURVEY_FOLLOWUP_SCHEDULE_DAYS,
} from "@/lib/survey-followup-cadence";
export const SURVEY_FOLLOWUP_DAY3 = 3;

export function generateInviteToken() {
  return randomBytes(24).toString("base64url");
}

export function buildTrackedSurveyUrl(token: string) {
  return `${getSurveyUrl()}?invite=${encodeURIComponent(token)}`;
}

/**
 * Voice agent never collects email. When a tracked invite completes, copy the
 * invite recipient email onto the response Client so Responses / overwrite work.
 */
export async function backfillResponseClientEmailFromInvite(
  responseId: string,
  inviteEmail: string
) {
  const email = normalizeRespondentEmail(inviteEmail);
  if (!email) return { updated: false as const };

  const response = await db.response.findUnique({
    where: { id: responseId },
    select: {
      clientId: true,
      client: { select: { id: true, email: true } },
    },
  });
  if (!response) return { updated: false as const };

  if (response.clientId && response.client) {
    const existing = normalizeRespondentEmail(response.client.email);
    if (existing) return { updated: false as const };
    await db.client.update({
      where: { id: response.client.id },
      data: { email },
    });
    return { updated: true as const };
  }

  await db.response.update({
    where: { id: responseId },
    data: {
      client: {
        create: {
          name: null,
          email,
        },
      },
    },
  });
  return { updated: true as const };
}

export { buildResultLinkUrl };

function toCrmInviteFields(invite: {
  id: string;
  email: string;
  token: string;
  resultToken: string;
  externalEngagementId: string | null;
  triggerStage: string | null;
  projectId: string | null;
  idempotencyKey: string | null;
}): CrmStatusInviteFields {
  return {
    id: invite.id,
    email: invite.email,
    token: invite.token,
    resultToken: invite.resultToken,
    externalEngagementId: invite.externalEngagementId,
    triggerStage: invite.triggerStage,
    projectId: invite.projectId,
    idempotencyKey: invite.idempotencyKey,
  };
}

function recipientFromInvite(invite: {
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  designation?: string | null;
  customerName: string | null;
  department?: string | null;
  serviceName?: string | null;
}): SurveyRecipient {
  return {
    email: invite.email,
    firstName: invite.firstName ?? undefined,
    lastName: invite.lastName ?? undefined,
    company: invite.company ?? undefined,
    designation: invite.designation ?? undefined,
    customerName: invite.customerName ?? undefined,
    department: invite.department ?? undefined,
    serviceName: invite.serviceName ?? undefined,
  };
}

function recipientToInviteDbFields(recipient: SurveyRecipient) {
  return {
    firstName: recipient.firstName,
    lastName: recipient.lastName,
    company: recipient.company,
    designation: recipient.designation,
    department: recipient.department,
    serviceName: recipient.serviceName,
    partner: recipient.partner,
    partnerEmail: recipient.partnerEmail,
    businessManagerName: recipient.businessManagerName,
    businessManagerEmail: recipient.businessManagerEmail,
    jobManagerName: recipient.jobManagerName,
    jobManagerEmail: recipient.jobManagerEmail,
    teamLeader: recipient.teamLeader,
    customerName: recipient.customerName,
    projectId: recipient.projectId,
    surveyOrder: recipient.surveyOrder,
    externalEngagementId: recipient.externalEngagementId,
    triggerStage: recipient.triggerStage,
    idempotencyKey: recipient.idempotencyKey,
  };
}

export async function createAndSendSurveyInvite(input: {
  email: string;
  subject: string;
  recipient?: SurveyRecipient;
  batchId?: string;
  actorUserId?: string | null;
  actorType?: "user" | "integration" | "system";
}) {
  const recipient: SurveyRecipient = input.recipient ?? { email: input.email };
  const email = input.email.toLowerCase();

  if (recipient.idempotencyKey) {
    const existing = await db.surveyInvite.findUnique({
      where: { idempotencyKey: recipient.idempotencyKey },
    });
    if (existing) {
      return { invite: existing, reused: true as const };
    }
  }

  const token = generateInviteToken();
  const resultToken = generateInviteToken();
  const surveyLink = buildTrackedSurveyUrl(token);
  const rendered = renderSurveyInviteTemplate("invite", {
    recipient,
    surveyLink,
  });
  const now = new Date();

  const invite = await db.surveyInvite.create({
    data: {
      batchId: input.batchId,
      email,
      ...recipientToInviteDbFields(recipient),
      token,
      resultToken,
      subject: input.subject || rendered.subject,
      sentAt: now,
    },
  });

  try {
    await sendSurveyInviteEmail({
      to: input.email,
      subject: input.subject || rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo: getTeamNotifyRecipients()[0],
    });
  } catch (error) {
    await recordSurveyInviteActivity({
      inviteId: invite.id,
      type: "failed",
      templateId: "invite",
      message: error instanceof Error ? error.message : "send failed",
    });
    throw error;
  }

  try {
    await upsertStaffContactsFromRecipient(recipient);
  } catch (error) {
    console.error("survey directory update failed:", error);
  }

  await recordSurveyInviteActivity({
    inviteId: invite.id,
    type: "invite_sent",
    templateId: "invite",
    createdAt: now,
    actorUserId: input.actorUserId ?? undefined,
  });

  await writeAuditLog({
    actorType: input.actorType ?? "system",
    actorUserId: input.actorUserId ?? null,
    action: "survey_invite.sent",
    resourceType: "SurveyInvite",
    resourceId: invite.id,
    metadata: {
      email: invite.email,
      triggerStage: invite.triggerStage,
      externalEngagementId: invite.externalEngagementId,
      projectId: invite.projectId,
    },
  });

  if (!input.batchId) {
    try {
      await recomputeInviteOutreachSnapshots();
    } catch (error) {
      console.error("invite outreach snapshot recompute failed:", error);
    }
  }

  return { invite, reused: false as const };
}

export async function createAndSendSurveyInvites(input: {
  recipients: SurveyRecipient[];
  subject: string;
  actorUserId?: string | null;
  actorType?: "user" | "integration" | "system";
}) {
  const batchId = generateInviteToken();
  const results: Array<{
    email: string;
    ok: boolean;
    error?: string;
    inviteId?: string;
    surveyUrl?: string;
    resultLinkUrl?: string;
    reused?: boolean;
  }> = [];

  for (const recipient of input.recipients) {
    try {
      const { invite, reused } = await createAndSendSurveyInvite({
        email: recipient.email,
        subject: input.subject,
        recipient,
        batchId,
        actorUserId: input.actorUserId,
        actorType: input.actorType,
      });
      results.push({
        email: recipient.email,
        ok: true,
        inviteId: invite.id,
        surveyUrl: buildTrackedSurveyUrl(invite.token),
        resultLinkUrl: buildResultLinkUrl(invite.resultToken),
        reused,
      });
    } catch (error) {
      results.push({
        email: recipient.email,
        ok: false,
        error: error instanceof Error ? error.message : "send failed",
      });
    }
  }

  if (results.some((result) => result.ok)) {
    try {
      await recomputeInviteOutreachSnapshots();
    } catch (error) {
      console.error("invite outreach snapshot recompute failed:", error);
    }
  }

  return { batchId, results, sent: results.filter((r) => r.ok).length };
}

export type SurveyInviteTrackerStatus =
  | "completed"
  | "started"
  | "opened"
  | "reminder_sent"
  | "sent";

export type SurveyInviteTrackerRow = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  department: string | null;
  serviceName: string | null;
  partner: string | null;
  partnerEmail: string | null;
  businessManagerName: string | null;
  businessManagerEmail: string | null;
  jobManagerName: string | null;
  jobManagerEmail: string | null;
  teamLeader: string | null;
  customerName: string | null;
  projectId: string | null;
  surveyOrder: string | null;
  sentAt: string | null;
  nextFollowUpAt: string | null;
  status: SurveyInviteTrackerStatus;
  statusLabel: string;
  followupCount: number;
  followupMaxCount: number;
  reminderStatus: ReminderLifecycleStatus;
  lastReminderSentAt: string | null;
  remindersStoppedAt: string | null;
  remindersStoppedByUserId: string | null;
  remindersStopReason: string | null;
  contactRemindersStopped: boolean;
  followup1SentAt: string | null;
  followup2SentAt: string | null;
  canSendFollowUp: boolean;
  canStopReminders: boolean;
  canReenableReminders: boolean;
  events: SurveyInviteActivityEvent[];
};

const REMINDER_STATUS_LABELS: Record<ReminderLifecycleStatus, string> = {
  active: "Active",
  stopped: "Stopped",
  exhausted: "Exhausted",
  completed: "Completed",
};

const INVITE_TRACKER_STATUS_LABELS: Record<SurveyInviteTrackerStatus, string> = {
  completed: "Completed",
  started: "Survey started",
  opened: "Opened",
  reminder_sent: "Reminder sent",
  sent: "Invitation sent",
};

type InviteTrackerSource = {
  completedAt: Date | null;
  responseId: string | null;
  startedAt: Date | null;
  openedAt: Date | null;
  followupCount?: number | null;
  followup1SentAt?: Date | null;
  followup2SentAt?: Date | null;
  sentAt: Date | null;
};

export function deriveInviteTrackerStatus(
  invite: InviteTrackerSource
): SurveyInviteTrackerStatus {
  if (invite.completedAt || invite.responseId) return "completed";
  if (invite.startedAt) return "started";
  if (invite.openedAt) return "opened";
  if (followupCountFromLegacyTimestamps(invite) > 0) return "reminder_sent";
  return "sent";
}

function trackerStatusLabel(
  status: SurveyInviteTrackerStatus,
  followupCount: number
) {
  if (status === "reminder_sent" && followupCount > 1) {
    return `Reminder sent (${followupCount})`;
  }
  return INVITE_TRACKER_STATUS_LABELS[status];
}

export function buildSurveyInviteTrackerRow(
  invite: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    designation?: string | null;
    department: string | null;
    serviceName: string | null;
    partner: string | null;
    partnerEmail: string | null;
    businessManagerName: string | null;
    businessManagerEmail: string | null;
    jobManagerName: string | null;
    jobManagerEmail: string | null;
    teamLeader: string | null;
    customerName: string | null;
    projectId: string | null;
    surveyOrder: string | null;
    sentAt: Date | null;
    openedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    responseId: string | null;
    followupCount?: number | null;
    followup1SentAt: Date | null;
    followup2SentAt: Date | null;
    lastReminderSentAt?: Date | null;
    reminderCycleStartedAt?: Date | null;
    remindersStoppedAt?: Date | null;
    remindersStoppedByUserId?: string | null;
    remindersStopReason?: string | null;
    contactRemindersStopped?: boolean;
    events?: SurveyInviteActivityEvent[];
  },
  options: { intervalDays?: number; maxCount?: number } = {}
): SurveyInviteTrackerRow {
  const followupCount = followupCountFromLegacyTimestamps(invite);
  const maxCount = options.maxCount ?? SURVEY_FOLLOWUP_MAX_COUNT;
  const intervalDays = options.intervalDays ?? SURVEY_FOLLOWUP_INTERVAL_DAYS;
  const contactStopped = Boolean(invite.contactRemindersStopped);
  const status = deriveInviteTrackerStatus({ ...invite, followupCount });
  const reminderStatus = deriveReminderLifecycleStatus(
    {
      ...invite,
      followupCount,
      contactStopped,
    },
    { maxCount }
  );
  const nextFollowUpAt = deriveNextFollowUpDate(
    {
      sentAt: invite.sentAt,
      reminderCycleStartedAt: invite.reminderCycleStartedAt,
      completedAt: invite.completedAt,
      responseId: invite.responseId,
      followupCount,
      remindersStoppedAt: invite.remindersStoppedAt,
    },
    { intervalDays, maxCount }
  );
  const recipient = recipientFromInvite(invite);
  const incomplete = !invite.completedAt && !invite.responseId;
  const inviteStopped = Boolean(invite.remindersStoppedAt) || contactStopped;

  return {
    id: invite.id,
    email: invite.email,
    name: formatRecipientName(recipient),
    company: invite.company,
    department: invite.department,
    serviceName: invite.serviceName,
    partner: invite.partner,
    partnerEmail: invite.partnerEmail,
    businessManagerName: invite.businessManagerName,
    businessManagerEmail: invite.businessManagerEmail,
    jobManagerName: invite.jobManagerName,
    jobManagerEmail: invite.jobManagerEmail,
    teamLeader: invite.teamLeader,
    customerName: invite.customerName,
    projectId: invite.projectId,
    surveyOrder: invite.surveyOrder,
    sentAt: invite.sentAt?.toISOString() ?? null,
    nextFollowUpAt: nextFollowUpAt?.toISOString() ?? null,
    status,
    statusLabel:
      reminderStatus === "stopped"
        ? REMINDER_STATUS_LABELS.stopped
        : reminderStatus === "exhausted"
          ? REMINDER_STATUS_LABELS.exhausted
          : trackerStatusLabel(status, followupCount),
    followupCount,
    followupMaxCount: maxCount,
    reminderStatus,
    lastReminderSentAt: invite.lastReminderSentAt?.toISOString() ?? null,
    remindersStoppedAt: invite.remindersStoppedAt?.toISOString() ?? null,
    remindersStoppedByUserId: invite.remindersStoppedByUserId ?? null,
    remindersStopReason: invite.remindersStopReason ?? null,
    contactRemindersStopped: contactStopped,
    followup1SentAt: invite.followup1SentAt?.toISOString() ?? null,
    followup2SentAt: invite.followup2SentAt?.toISOString() ?? null,
    canSendFollowUp:
      incomplete && !inviteStopped && followupCount < maxCount,
    canStopReminders: incomplete && !inviteStopped,
    canReenableReminders:
      incomplete &&
      (inviteStopped || followupCount >= maxCount),
    events: invite.events ?? [],
  };
}

export async function listSurveyInviteTrackerRows(
  scopeWhere: Prisma.SurveyInviteWhereInput = {}
): Promise<SurveyInviteTrackerRow[]> {
  await syncUncompletedInvitesWithResponses();

  const settings = await getSurveyReminderSettings();

  const invites = await db.surveyInvite.findMany({
    where: { AND: [{ sentAt: { not: null } }, scopeWhere] },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      designation: true,
      department: true,
      serviceName: true,
      partner: true,
      partnerEmail: true,
      businessManagerName: true,
      businessManagerEmail: true,
      jobManagerName: true,
      jobManagerEmail: true,
      teamLeader: true,
      customerName: true,
      projectId: true,
      surveyOrder: true,
      sentAt: true,
      openedAt: true,
      startedAt: true,
      completedAt: true,
      responseId: true,
      followupCount: true,
      followup1SentAt: true,
      followup2SentAt: true,
      lastReminderSentAt: true,
      reminderCycleStartedAt: true,
      remindersStoppedAt: true,
      remindersStoppedByUserId: true,
      remindersStopReason: true,
      events: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          type: true,
          templateId: true,
          message: true,
          actorUserId: true,
          createdAt: true,
        },
      },
    },
    orderBy: { sentAt: "desc" },
  });

  const emails = [
    ...new Set(
      invites
        .map((invite) => normalizeRespondentEmail(invite.email))
        .filter((email): email is string => Boolean(email))
    ),
  ];
  const contactStops = emails.length
    ? await db.surveyReminderContactStop.findMany({
        where: {
          emailNormalized: { in: emails },
          clearedAt: null,
        },
        select: { emailNormalized: true },
      })
    : [];
  const stoppedEmails = new Set(contactStops.map((row) => row.emailNormalized));

  return invites.map((invite) => {
    const normalizedEmail = normalizeRespondentEmail(invite.email);
    return buildSurveyInviteTrackerRow(
      {
        ...invite,
        contactRemindersStopped: Boolean(
          normalizedEmail && stoppedEmails.has(normalizedEmail)
        ),
        events: invite.events.map(toSurveyInviteActivityEvent),
      },
      { intervalDays: settings.intervalDays, maxCount: settings.maxCount }
    );
  });
}

export async function addSurveyInviteNote(input: {
  inviteId: string;
  message: string;
  actorUserId?: string | null;
}) {
  const invite = await db.surveyInvite.findUnique({
    where: { id: input.inviteId },
    select: { id: true },
  });
  if (!invite) return null;

  return recordSurveyInviteActivity({
    inviteId: invite.id,
    type: "note",
    message: input.message.trim(),
    actorUserId: input.actorUserId ?? null,
  });
}

/**
 * Permanently removes an invitation and its activity timeline. A linked survey
 * response is kept; only the invite link to it disappears.
 */
export async function deleteSurveyInvite(input: {
  inviteId: string;
  actorUserId: string;
}) {
  const invite = await db.surveyInvite.findUnique({
    where: { id: input.inviteId },
    select: { id: true, sentAt: true, completedAt: true, responseId: true },
  });
  if (!invite) return { ok: false as const };

  await db.surveyInvite.delete({ where: { id: invite.id } });

  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "survey_invite.deleted",
    resourceType: "SurveyInvite",
    resourceId: invite.id,
    metadata: {
      wasSent: Boolean(invite.sentAt),
      wasCompleted: Boolean(invite.completedAt),
      hadResponse: Boolean(invite.responseId),
    },
    source: "api",
  });

  try {
    await recomputeInviteOutreachSnapshots();
  } catch (error) {
    console.error("invite outreach snapshot recompute failed:", error);
  }

  return { ok: true as const };
}

async function isContactRemindersStopped(email: string) {
  const normalized = normalizeRespondentEmail(email);
  if (!normalized) return false;
  const row = await db.surveyReminderContactStop.findFirst({
    where: { emailNormalized: normalized, clearedAt: null },
    select: { id: true },
  });
  return Boolean(row);
}

export async function sendSurveyInviteFollowup(input: {
  inviteId: string;
  mode?: "auto" | "manual";
  actorUserId?: string;
  now?: Date;
}) {
  const mode = input.mode ?? "auto";
  const settings = await getSurveyReminderSettings();
  const invite = await db.surveyInvite.findUnique({
    where: { id: input.inviteId },
    select: {
      id: true,
      email: true,
      token: true,
      firstName: true,
      lastName: true,
      company: true,
      designation: true,
      customerName: true,
      department: true,
      serviceName: true,
      completedAt: true,
      responseId: true,
      sentAt: true,
      followupCount: true,
      followup1SentAt: true,
      followup2SentAt: true,
      lastReminderSentAt: true,
      reminderCycleStartedAt: true,
      remindersStoppedAt: true,
      subject: true,
    },
  });

  if (!invite || invite.completedAt || invite.responseId) {
    return { sent: false, reason: "completed" as const };
  }

  if (invite.remindersStoppedAt || (await isContactRemindersStopped(invite.email))) {
    return { sent: false, reason: "stopped" as const };
  }

  const now = input.now ?? new Date();
  const followupCount = followupCountFromLegacyTimestamps(invite);
  const cadence = {
    intervalDays: settings.intervalDays,
    maxCount: settings.maxCount,
  };

  if (followupCount >= settings.maxCount) {
    return { sent: false, reason: "exhausted" as const };
  }

  if (mode === "auto") {
    if (
      !isAutoFollowupDue(
        {
          sentAt: invite.sentAt,
          reminderCycleStartedAt: invite.reminderCycleStartedAt,
          lastReminderSentAt: invite.lastReminderSentAt,
          completedAt: invite.completedAt,
          responseId: invite.responseId,
          followupCount,
          remindersStoppedAt: invite.remindersStoppedAt,
        },
        now,
        cadence
      )
    ) {
      return { sent: false, reason: "not_due" as const };
    }
  }

  const recipient = recipientFromInvite(invite);
  const surveyLink = buildTrackedSurveyUrl(invite.token);
  const rendered = renderSurveyFollowupEmail({
    recipient,
    surveyLink,
    originalSubject: invite.subject,
  });

  try {
    await sendSurveyInviteEmail({
      to: invite.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo: getTeamNotifyRecipients()[0],
      cc: settings.ccEmails,
    });
  } catch (error) {
    await recordSurveyInviteActivity({
      inviteId: invite.id,
      type: "failed",
      templateId: "followup-day3",
      message: error instanceof Error ? error.message : "send failed",
      actorUserId: input.actorUserId ?? null,
    });
    throw error;
  }

  const nextCount = followupCount + 1;
  await db.surveyInvite.update({
    where: { id: invite.id },
    data: {
      followupCount: nextCount,
      lastReminderSentAt: now,
      followup1SentAt: invite.followup1SentAt ?? now,
      followup2SentAt:
        nextCount >= 2 ? (invite.followup2SentAt ?? now) : invite.followup2SentAt,
    },
  });

  await recordSurveyInviteActivity({
    inviteId: invite.id,
    type: mode === "auto" ? "followup_auto" : "followup_manual",
    templateId: "followup-day3",
    actorUserId: input.actorUserId ?? null,
    createdAt: now,
  });

  return { sent: true as const };
}

export async function stopInviteReminders(input: {
  inviteId: string;
  actorUserId?: string | null;
  reason?: string | null;
}) {
  const invite = await db.surveyInvite.findUnique({
    where: { id: input.inviteId },
    select: {
      id: true,
      completedAt: true,
      responseId: true,
      remindersStoppedAt: true,
    },
  });
  if (!invite) return { ok: false as const, reason: "not_found" as const };
  if (invite.completedAt || invite.responseId) {
    return { ok: false as const, reason: "completed" as const };
  }
  if (invite.remindersStoppedAt) {
    return { ok: true as const, already: true as const };
  }

  const now = new Date();
  const reason = input.reason?.trim() || null;
  await db.surveyInvite.update({
    where: { id: invite.id },
    data: {
      remindersStoppedAt: now,
      remindersStoppedByUserId: input.actorUserId ?? null,
      remindersStopReason: reason,
    },
  });
  await recordSurveyInviteActivity({
    inviteId: invite.id,
    type: "reminders_stopped",
    message: reason,
    actorUserId: input.actorUserId ?? null,
    createdAt: now,
  });
  return { ok: true as const, already: false as const };
}

export async function reenableInviteReminders(input: {
  inviteId: string;
  actorUserId?: string | null;
}) {
  const invite = await db.surveyInvite.findUnique({
    where: { id: input.inviteId },
    select: {
      id: true,
      email: true,
      completedAt: true,
      responseId: true,
      remindersStoppedAt: true,
      followupCount: true,
    },
  });
  if (!invite) return { ok: false as const, reason: "not_found" as const };
  if (invite.completedAt || invite.responseId) {
    return { ok: false as const, reason: "completed" as const };
  }

  const settings = await getSurveyReminderSettings();
  const now = new Date();
  await db.surveyInvite.update({
    where: { id: invite.id },
    data: {
      remindersStoppedAt: null,
      remindersStoppedByUserId: null,
      remindersStopReason: null,
      followupCount: 0,
      reminderCycleStartedAt: now,
      followup1SentAt: null,
      followup2SentAt: null,
      lastReminderSentAt: null,
    },
  });

  // Clearing invite stop does not clear a contact-level stop; re-enable contact separately.
  await recordSurveyInviteActivity({
    inviteId: invite.id,
    type: "reminders_reenabled",
    message: `Fresh cycle (max ${settings.maxCount}, every ${settings.intervalDays}d)`,
    actorUserId: input.actorUserId ?? null,
    createdAt: now,
  });
  return { ok: true as const };
}

export async function stopContactReminders(input: {
  email: string;
  actorUserId?: string | null;
  reason?: string | null;
}) {
  const emailNormalized = normalizeRespondentEmail(input.email);
  if (!emailNormalized) {
    return { ok: false as const, reason: "invalid_email" as const };
  }
  const now = new Date();
  const reason = input.reason?.trim() || null;
  await db.surveyReminderContactStop.upsert({
    where: { emailNormalized },
    create: {
      emailNormalized,
      stoppedAt: now,
      stoppedByUserId: input.actorUserId ?? null,
      stopReason: reason,
      clearedAt: null,
      clearedByUserId: null,
    },
    update: {
      stoppedAt: now,
      stoppedByUserId: input.actorUserId ?? null,
      stopReason: reason,
      clearedAt: null,
      clearedByUserId: null,
    },
  });

  const invites = await db.surveyInvite.findMany({
    where: {
      email: { equals: input.email, mode: "insensitive" },
      completedAt: null,
      responseId: null,
      remindersStoppedAt: null,
    },
    select: { id: true },
  });
  for (const invite of invites) {
    await db.surveyInvite.update({
      where: { id: invite.id },
      data: {
        remindersStoppedAt: now,
        remindersStoppedByUserId: input.actorUserId ?? null,
        remindersStopReason: reason ?? "Stopped for contact",
      },
    });
    await recordSurveyInviteActivity({
      inviteId: invite.id,
      type: "reminders_stopped",
      message: reason ?? "Stopped for contact",
      actorUserId: input.actorUserId ?? null,
      createdAt: now,
    });
  }
  return { ok: true as const, inviteCount: invites.length };
}

export async function reenableContactReminders(input: {
  email: string;
  actorUserId?: string | null;
}) {
  const emailNormalized = normalizeRespondentEmail(input.email);
  if (!emailNormalized) {
    return { ok: false as const, reason: "invalid_email" as const };
  }
  const now = new Date();
  await db.surveyReminderContactStop.upsert({
    where: { emailNormalized },
    create: {
      emailNormalized,
      stoppedAt: now,
      stoppedByUserId: input.actorUserId ?? null,
      clearedAt: now,
      clearedByUserId: input.actorUserId ?? null,
    },
    update: {
      clearedAt: now,
      clearedByUserId: input.actorUserId ?? null,
    },
  });

  const settings = await getSurveyReminderSettings();
  const invites = await db.surveyInvite.findMany({
    where: {
      email: { equals: input.email, mode: "insensitive" },
      completedAt: null,
      responseId: null,
    },
    select: { id: true },
  });
  for (const invite of invites) {
    await db.surveyInvite.update({
      where: { id: invite.id },
      data: {
        remindersStoppedAt: null,
        remindersStoppedByUserId: null,
        remindersStopReason: null,
        followupCount: 0,
        reminderCycleStartedAt: now,
        followup1SentAt: null,
        followup2SentAt: null,
        lastReminderSentAt: null,
      },
    });
    await recordSurveyInviteActivity({
      inviteId: invite.id,
      type: "reminders_reenabled",
      message: `Contact re-enabled (max ${settings.maxCount}, every ${settings.intervalDays}d)`,
      actorUserId: input.actorUserId ?? null,
      createdAt: now,
    });
  }
  return { ok: true as const, inviteCount: invites.length };
}

export async function processDueSurveyFollowups(now = new Date()) {
  // Kuwait weekend is Fri–Sat — never auto-send on those days.
  if (!isKuwaitReminderWeekday(now)) {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      checked: 0,
      maxPerRun: 0,
      skippedWeekend: true as const,
    };
  }

  const settings = await getSurveyReminderSettings();
  const msPerDay = 24 * 60 * 60 * 1000;
  const maxCount = settings.maxCount;
  const intervalDays = settings.intervalDays;
  /** Must wait a full interval after the last send (backlog catch-up guard). */
  const lastSendBefore = new Date(now.getTime() - intervalDays * msPerDay);

  const dueByCount = Array.from({ length: maxCount }, (_, count) => {
    const dueBefore = new Date(
      now.getTime() - intervalDays * (count + 1) * msPerDay
    );
    return {
      AND: [
        { followupCount: count },
        { remindersStoppedAt: null },
        {
          OR: [
            { lastReminderSentAt: null },
            { lastReminderSentAt: { lte: lastSendBefore } },
          ],
        },
        {
          OR: [
            {
              reminderCycleStartedAt: { not: null, lte: dueBefore },
            },
            {
              reminderCycleStartedAt: null,
              sentAt: { lte: dueBefore },
            },
          ],
        },
      ],
    };
  });

  const pending = await db.surveyInvite.findMany({
    where: {
      sentAt: { not: null },
      completedAt: null,
      responseId: null,
      remindersStoppedAt: null,
      OR: dueByCount,
    },
    select: {
      id: true,
      email: true,
      sentAt: true,
      followupCount: true,
      reminderCycleStartedAt: true,
      lastReminderSentAt: true,
    },
    // Prefer never-reminded invites so a deep backlog clears horizontally first.
    orderBy: [{ followupCount: "asc" }, { sentAt: "asc" }],
    take: Math.max(settings.maxAutoSendsPerRun * 3, settings.maxAutoSendsPerRun),
  });

  const emails = [
    ...new Set(
      pending
        .map((invite) => normalizeRespondentEmail(invite.email))
        .filter((email): email is string => Boolean(email))
    ),
  ];
  const contactStops = emails.length
    ? await db.surveyReminderContactStop.findMany({
        where: { emailNormalized: { in: emails }, clearedAt: null },
        select: { emailNormalized: true },
      })
    : [];
  const stoppedEmails = new Set(contactStops.map((row) => row.emailNormalized));

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let checked = 0;

  for (const invite of pending) {
    if (sent >= settings.maxAutoSendsPerRun) break;
    checked += 1;
    const normalizedEmail = normalizeRespondentEmail(invite.email);
    if (normalizedEmail && stoppedEmails.has(normalizedEmail)) {
      skipped += 1;
      continue;
    }
    try {
      const result = await sendSurveyInviteFollowup({
        inviteId: invite.id,
        mode: "auto",
        now,
      });
      if (result.sent) sent += 1;
      else skipped += 1;
    } catch (error) {
      failed += 1;
      console.error("survey follow-up send failed", invite.id, error);
    }
  }

  return {
    sent,
    skipped,
    failed,
    checked,
    maxPerRun: settings.maxAutoSendsPerRun,
  };
}

export async function recordSurveyInviteEvent(
  token: string,
  event: SurveyInviteEvent
) {
  const invite = await db.surveyInvite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      token: true,
      resultToken: true,
      externalEngagementId: true,
      triggerStage: true,
      projectId: true,
      idempotencyKey: true,
      openedAt: true,
      startedAt: true,
    },
  });
  if (!invite) return false;

  const now = new Date();
  if (event === "open" && !invite.openedAt) {
    await db.surveyInvite.update({
      where: { id: invite.id },
      data: { openedAt: now },
    });
    await recordSurveyInviteActivity({
      inviteId: invite.id,
      type: "opened",
      createdAt: now,
    });
    return true;
  }

  if (event === "start" && !invite.startedAt) {
    await db.surveyInvite.update({
      where: { id: invite.id },
      data: {
        startedAt: now,
        openedAt: invite.openedAt ?? now,
      },
    });
    if (!invite.openedAt) {
      await recordSurveyInviteActivity({
        inviteId: invite.id,
        type: "opened",
        createdAt: now,
      });
    }
    await recordSurveyInviteActivity({
      inviteId: invite.id,
      type: "started",
      createdAt: now,
    });
    return true;
  }

  return true;
}

export async function linkSurveyInviteToConversation(
  token: string,
  conversationId: string
) {
  // Typed submissions link through inviteToken at ingest, never through here.
  if (conversationId.startsWith("typed_")) return false;

  const invite = await db.surveyInvite.findUnique({
    where: { token },
    select: {
      id: true,
      startedAt: true,
      openedAt: true,
      responseId: true,
      sentAt: true,
      createdAt: true,
    },
  });
  if (!invite || invite.responseId) return false;

  const alreadyBound = await db.surveyInvite.findUnique({
    where: { conversationId },
    select: { id: true },
  });
  if (alreadyBound && alreadyBound.id !== invite.id) return false;

  // A conversation that finished before this invite existed belongs to
  // someone else; binding it would forward their scores to this engagement.
  const existingResponse = await db.response.findUnique({
    where: { conversationId },
    select: { createdAt: true },
  });
  if (
    existingResponse &&
    existingResponse.createdAt < (invite.sentAt ?? invite.createdAt)
  ) {
    return false;
  }

  const now = new Date();
  await db.surveyInvite.update({
    where: { id: invite.id },
    data: {
      conversationId,
      startedAt: invite.startedAt ?? now,
      openedAt: invite.openedAt ?? now,
    },
  });

  await tryCompleteInviteForConversation(conversationId);
  return true;
}

export async function tryCompleteInviteForConversation(
  conversationId: string
): Promise<boolean> {
  const response = await db.response.findUnique({
    where: { conversationId },
    select: {
      id: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      completedAt: true,
      createdAt: true,
    },
  });
  if (!response || !isCompleteSurveyResponse(response)) return false;

  return completeSurveyInviteForResponse(
    response.id,
    { conversationId },
    response.completedAt ?? response.createdAt
  );
}

export async function syncUncompletedInvitesWithResponses() {
  const pending = await db.surveyInvite.findMany({
    where: {
      conversationId: { not: null },
      completedAt: null,
      responseId: null,
    },
    select: { conversationId: true },
  });

  let synced = 0;
  for (const invite of pending) {
    if (!invite.conversationId) continue;
    const completed = await tryCompleteInviteForConversation(invite.conversationId);
    if (completed) synced += 1;
  }
  return synced;
}

export async function completeSurveyInviteForResponse(
  responseId: string,
  lookup: { inviteToken?: string; conversationId?: string },
  completedAt = new Date()
): Promise<boolean> {
  const response = await db.response.findUnique({
    where: { id: responseId },
    select: {
      csatScore: true,
      cesScore: true,
      npsScore: true,
      completedAt: true,
    },
  });
  if (!response || !isCompleteSurveyResponse(response)) return false;

  const resolvedCompletedAt = response.completedAt ?? completedAt;

  const invite = lookup.inviteToken
    ? await db.surveyInvite.findUnique({ where: { token: lookup.inviteToken } })
    : lookup.conversationId
      ? await db.surveyInvite.findUnique({
          where: { conversationId: lookup.conversationId },
        })
      : null;

  if (!invite || invite.responseId) return false;

  await db.surveyInvite.update({
    where: { id: invite.id },
    data: {
      responseId,
      completedAt: resolvedCompletedAt,
      conversationId: invite.conversationId ?? lookup.conversationId,
      startedAt: invite.startedAt ?? resolvedCompletedAt,
      openedAt: invite.openedAt ?? resolvedCompletedAt,
    },
  });

  await backfillResponseClientEmailFromInvite(responseId, invite.email);

  await recordSurveyInviteActivity({
    inviteId: invite.id,
    type: "completed",
    createdAt: resolvedCompletedAt,
  });

  try {
    const scoresPayload = await buildSurveyCompletionPayload(invite.id);
    if (!scoresPayload) {
      console.error("CRM completed webhook skipped: scores unavailable", invite.id);
    } else {
      notifyCrmSurveyStatus({
        status: "completed",
        invite: toCrmInviteFields(invite),
        occurredAt: resolvedCompletedAt,
        scores: scoresPayload,
      });
    }
  } catch (error) {
    console.error("CRM completed webhook payload failed:", error);
  }

  try {
    await recomputeInviteOutreachSnapshots();
  } catch (error) {
    console.error("invite outreach snapshot recompute failed:", error);
  }

  try {
    await sendSurveyCompletionNotifications(responseId);
  } catch (error) {
    console.error("survey completion notifications failed:", error);
  }

  return true;
}

export async function reconcileVoiceInviteCompletion(input: {
  responseId: string;
  conversationId: string;
  completedAt?: Date;
}): Promise<boolean> {
  const response = await db.response.findUnique({
    where: { id: input.responseId },
    select: {
      id: true,
      conversationId: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      completedAt: true,
      createdAt: true,
    },
  });
  if (
    !response ||
    response.conversationId.startsWith("typed_") ||
    !isCompleteSurveyResponse(response)
  ) {
    return false;
  }

  const completedAt =
    input.completedAt ?? response.completedAt ?? response.createdAt;

  const linked = await completeSurveyInviteForResponse(
    input.responseId,
    { conversationId: input.conversationId },
    completedAt
  );
  if (linked) return true;

  const candidate = await db.surveyInvite.findFirst({
    where: {
      conversationId: null,
      startedAt: { not: null, lte: completedAt },
      completedAt: null,
      responseId: null,
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      openedAt: true,
    },
  });
  if (!candidate?.startedAt) return false;

  const competingResponses = await db.response.count({
    where: {
      conversationId: { not: { startsWith: "typed_" } },
      createdAt: { gte: candidate.startedAt, lte: completedAt },
      NOT: { id: input.responseId },
    },
  });
  if (competingResponses > 0) return false;

  const newerStartedInvite = await db.surveyInvite.findFirst({
    where: {
      startedAt: { gt: candidate.startedAt },
      completedAt: null,
      id: { not: candidate.id },
    },
    select: { id: true },
  });
  if (newerStartedInvite) return false;

  await db.surveyInvite.update({
    where: { id: candidate.id },
    data: {
      conversationId: input.conversationId,
      responseId: input.responseId,
      completedAt,
      startedAt: candidate.startedAt,
      openedAt: candidate.openedAt ?? candidate.startedAt,
    },
  });

  await recordSurveyInviteActivity({
    inviteId: candidate.id,
    type: "completed",
    createdAt: completedAt,
  });

  try {
    await recomputeInviteOutreachSnapshots();
  } catch (error) {
    console.error("invite outreach snapshot recompute failed:", error);
  }

  return true;
}

export async function listSurveyInviteRecords(
  scopeWhere: Prisma.SurveyInviteWhereInput = {}
): Promise<SurveyInviteRecord[]> {
  await syncUncompletedInvitesWithResponses();

  const invites = await db.surveyInvite.findMany({
    where: { AND: [{ sentAt: { not: null } }, scopeWhere] },
    select: {
      sentAt: true,
      openedAt: true,
      startedAt: true,
      completedAt: true,
      department: true,
      company: true,
      customerName: true,
      serviceName: true,
      partner: true,
      businessManagerName: true,
      jobManagerName: true,
    },
    orderBy: { sentAt: "desc" },
  });

  return invites.map((invite) => ({
    sentAt: invite.sentAt?.toISOString() ?? null,
    openedAt: invite.openedAt?.toISOString() ?? null,
    startedAt: invite.startedAt?.toISOString() ?? null,
    completedAt: invite.completedAt?.toISOString() ?? null,
    department: invite.department?.trim() || null,
    company: invite.company?.trim() || null,
    customerName: invite.customerName?.trim() || null,
    partner: invite.partner?.trim() || null,
    serviceName: invite.serviceName?.trim() || null,
    businessManagerName: invite.businessManagerName?.trim() || null,
    jobManagerName: invite.jobManagerName?.trim() || null,
  }));
}
