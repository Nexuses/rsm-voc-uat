import { z } from "zod";
import { buildResultLinkUrl } from "@/lib/crm/status-webhook";
import { getSurveyInviteTemplateSubject } from "@/lib/survey-invite-templates";
import {
  buildTrackedSurveyUrl,
  createAndSendSurveyInvite,
  createAndSendSurveyInvites,
  parseRecipientsFromCsv,
  type SurveyRecipient,
} from "@/lib/survey-invite-tracking";

export const MAX_INVITE_RECIPIENTS_PER_REQUEST = 500;

const optionalRecipientField = z.string().trim().max(120).optional();
const optionalEmailField = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.string().email().optional());

const inviteRecipientFields = {
  to: z.string().email().optional(),
  emails: z.array(z.string().email()).max(500).optional(),
  csv: z.string().max(500_000).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  company: optionalRecipientField,
  designation: optionalRecipientField,
  department: optionalRecipientField,
  serviceName: optionalRecipientField,
  partner: optionalRecipientField,
  partnerEmail: optionalEmailField,
  businessManagerName: optionalRecipientField,
  businessManagerEmail: optionalEmailField,
  jobManagerName: optionalRecipientField,
  jobManagerEmail: optionalEmailField,
  teamLeader: optionalRecipientField,
  customerName: optionalRecipientField,
  projectId: optionalRecipientField,
  surveyOrder: optionalRecipientField,
  externalEngagementId: z.string().trim().min(1).max(120).optional(),
  triggerStage: z.enum(["mid", "post"]).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
};

export const dashboardInviteBodySchema = z.object({
  subject: z.string().trim().min(1).max(200),
  ...inviteRecipientFields,
});

export const integrationInviteBodySchema = z.object({
  subject: z.string().trim().min(1).max(200).optional(),
  ...inviteRecipientFields,
});

export type DashboardInviteBody = z.infer<typeof dashboardInviteBodySchema>;
export type IntegrationInviteBody = z.infer<typeof integrationInviteBodySchema>;
export type InviteBody = DashboardInviteBody | IntegrationInviteBody;

function buildManualRecipient(input: InviteBody): SurveyRecipient | null {
  if (!input.to) return null;

  return {
    email: input.to.toLowerCase(),
    firstName: input.firstName,
    lastName: input.lastName,
    company: input.company,
    designation: input.designation,
    department: input.department,
    serviceName: input.serviceName,
    partner: input.partner,
    partnerEmail: input.partnerEmail,
    businessManagerName: input.businessManagerName,
    businessManagerEmail: input.businessManagerEmail,
    jobManagerName: input.jobManagerName,
    jobManagerEmail: input.jobManagerEmail,
    teamLeader: input.teamLeader,
    customerName: input.customerName,
    projectId: input.projectId,
    surveyOrder: input.surveyOrder,
    externalEngagementId: input.externalEngagementId,
    triggerStage: input.triggerStage,
    idempotencyKey: input.idempotencyKey,
  };
}

export function resolveInviteRecipients(input: InviteBody): SurveyRecipient[] {
  const hasCsv = Boolean(input.csv?.trim());
  const manualRecipient = buildManualRecipient(input);

  if (hasCsv) {
    return parseRecipientsFromCsv(input.csv!);
  }

  const manualRecipients: SurveyRecipient[] = [];
  if (manualRecipient) {
    manualRecipients.push(manualRecipient);
  }

  for (const email of input.emails ?? []) {
    manualRecipients.push({
      email: email.toLowerCase(),
      externalEngagementId: input.externalEngagementId,
      triggerStage: input.triggerStage,
    });
  }

  const seen = new Set<string>();
  return manualRecipients.filter((recipient) => {
    const normalized = recipient.email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    recipient.email = normalized;
    return true;
  });
}

export function hasConflictingInviteRecipients(input: InviteBody): boolean {
  return Boolean(input.csv?.trim()) && Boolean(input.to?.trim());
}

export function resolveInviteSubject(input: InviteBody): string {
  const subject = input.subject?.trim();
  if (subject) return subject;
  return getSurveyInviteTemplateSubject("invite");
}

export type SurveyInviteSendResult =
  | {
      ok: true;
      inviteId: string;
      externalEngagementId: string | null;
      triggerStage: string | null;
      surveyUrl: string;
      resultLinkUrl: string;
      status: "sent";
      reused: boolean;
      sent: 1;
      failed: 0;
      total: 1;
    }
  | {
      ok: boolean;
      batchId: string;
      sent: number;
      failed: number;
      total: number;
      results: Array<{
        email: string;
        ok: boolean;
        error?: string;
        inviteId?: string;
        surveyUrl?: string;
        resultLinkUrl?: string;
        reused?: boolean;
      }>;
    };

export async function sendSurveyInvites(input: {
  recipients: SurveyRecipient[];
  subject: string;
  actorUserId?: string | null;
  actorType?: "user" | "integration" | "system";
}): Promise<SurveyInviteSendResult> {
  const { recipients, subject } = input;

  if (recipients.length === 1) {
    const { invite, reused } = await createAndSendSurveyInvite({
      email: recipients[0].email,
      subject,
      recipient: recipients[0],
      actorUserId: input.actorUserId,
      actorType: input.actorType,
    });
    return {
      ok: true,
      inviteId: invite.id,
      externalEngagementId: invite.externalEngagementId,
      triggerStage: invite.triggerStage,
      surveyUrl: buildTrackedSurveyUrl(invite.token),
      resultLinkUrl: buildResultLinkUrl(invite.resultToken),
      status: "sent",
      reused,
      sent: 1,
      failed: 0,
      total: 1,
    };
  }

  const batch = await createAndSendSurveyInvites({
    recipients,
    subject,
    actorUserId: input.actorUserId,
    actorType: input.actorType,
  });

  return {
    ok: batch.sent > 0,
    batchId: batch.batchId,
    sent: batch.sent,
    failed: batch.results.length - batch.sent,
    total: batch.results.length,
    results: batch.results,
  };
}
