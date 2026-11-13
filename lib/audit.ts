import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditActorType = "user" | "system" | "integration";
export type AuditSource = "api" | "ui" | "cron" | "worker" | "webhook" | "script";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "auth.login_success": "Logged in",
  "auth.login_failed": "Login failed",
  "auth.mfa_success": "MFA verified",
  "auth.mfa_failed": "MFA failed",
  "survey_invite.sent": "Survey invitation sent",
  "response.excluded": "Survey response excluded",
  "response.deleted": "Survey response deleted",
  "user.created": "User created",
  "user.disabled": "User disabled",
  "user.enabled": "User re-enabled",
  "user.role_assigned": "User role changed",
  "user.password_changed": "Password changed",
  "user.password_change_failed": "Password change failed",
  "role.created": "Role created",
  "role.updated": "Role updated",
  "role.deleted": "Role deleted",
  "directory.created": "Directory entry added",
  "directory.updated": "Directory entry updated",
  "directory.deleted": "Directory entry deleted",
  "auth.login_throttled": "Login throttled",
  "auth.otp_issued": "Login code issued",
  "response.auto_excluded": "Response superseded by newer quarterly submission",
  "response.public_approve": "Response approved for public showcase",
  "response.public_hide": "Response hidden from public showcase",
  "response.public_reset": "Response public visibility reset",
  "survey_invite.note_added": "Invite note added",
  "survey_invite.followup_sent": "Invite follow-up sent",
  "survey_invite.reminders_stopped": "Invite reminders stopped",
  "survey_invite.reminders_reenabled": "Invite reminders re-enabled",
  "survey_invite.contact_reminders_stopped": "Contact reminders stopped",
  "survey_invite.contact_reminders_reenabled": "Contact reminders re-enabled",
  "settings.reminders_updated": "Reminder settings updated",
  "survey_invite.result_viewed": "Result link viewed",
  "testimonial.submitted": "Testimonial submitted",
  "testimonial.declined": "Testimonial declined",
  "testimonial.published": "Testimonial marked published",
  "testimonial.archived": "Testimonial archived",
  "security.cron_auth_failed": "Cron authentication failed",
  "security.integration_auth_failed": "Integration authentication failed",
  "cron.survey_followups": "Scheduled follow-ups run",
  "report.scheduled_sent": "Scheduled report sent",
  "ai.chat_query": "Ask Your Data question",
  "case.created": "Recovery case opened",
  "case.status_changed": "Case status changed",
  "case.assigned": "Case assigned",
  "case.sla_breached": "Case SLA breached",
  "feature_flag.updated": "Feature flag changed",
  "user.scopes_updated": "User data scope changed",
  "case.client_confirmed": "Client confirmed case resolution",
  "survey.draft_created": "Survey draft created",
  "survey.draft_updated": "Survey draft edited",
  "survey.published": "Survey version published",
  "survey.archived": "Survey version archived",
  "automation.rule_created": "Automation rule created",
  "automation.rule_version_created": "Automation rule version created",
  "automation.rule_activated": "Automation rule activated",
  "automation.rule_deactivated": "Automation rule deactivated",
  "approval.decided": "Approval decided",
  "message_template.version_created": "Message template version drafted",
  "message.sent": "Message sent",
  "message.suppressed": "Message suppressed by fatigue policy",
  "revenue.recorded": "Account revenue recorded",
  "job.replayed": "Dead job replayed",
  "integration.updated": "Integration settings changed",
  "training.assigned": "Training assigned",
  "training.course_created": "Training course created",
  "training.rule_saved": "Training rule saved",
  "benchmark.updated": "Benchmark updated",
};

export const AUDIT_ACTOR_TYPE_LABELS: Record<AuditActorType, string> = {
  user: "Dashboard user",
  system: "System",
  integration: "API integration",
};

export const AUDIT_RESOURCE_TYPE_LABELS: Record<string, string> = {
  User: "User",
  Role: "Role",
  StaffContact: "Survey directory",
  SurveyInvite: "Survey invite",
  Response: "Survey response",
  Case: "Recovery case",
  FeatureFlag: "Feature flag",
  SurveyVersion: "Survey version",
  AutomationRule: "Automation rule",
  ApprovalRequest: "Approval request",
  MessageDelivery: "Message",
  MessageTemplate: "Message template",
  AiArtifact: "AI draft",
  Testimonial: "Testimonial",
  Account: "Client account",
  Job: "Background job",
  Integration: "Integration",
  TrainingAssignment: "Training assignment",
  TrainingCourse: "Training course",
  TrainingRule: "Training rule",
  Benchmark: "Benchmark",
};

export function labelAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action.replaceAll(".", " · ").replaceAll("_", " ");
}

export function labelAuditActorType(actorType: string) {
  return (
    AUDIT_ACTOR_TYPE_LABELS[actorType as AuditActorType] ??
    actorType.charAt(0).toUpperCase() + actorType.slice(1)
  );
}

export function labelAuditResourceType(resourceType: string | null | undefined) {
  if (!resourceType) return null;
  return AUDIT_RESOURCE_TYPE_LABELS[resourceType] ?? resourceType;
}

export function formatAuditDetails(input: {
  action: string;
  metadata: unknown;
}): string {
  const meta =
    input.metadata &&
    typeof input.metadata === "object" &&
    !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : null;

  if (!meta) return "—";

  const parts: string[] = [];
  if (typeof meta.email === "string" && meta.email.trim()) {
    parts.push(meta.email.trim());
  }
  if (typeof meta.role === "string" && meta.role.trim()) {
    parts.push(`role: ${meta.role.trim()}`);
  }
  if (typeof meta.slug === "string" && meta.slug.trim()) {
    parts.push(`slug: ${meta.slug.trim()}`);
  }
  if (typeof meta.triggerStage === "string" && meta.triggerStage.trim()) {
    parts.push(`stage: ${meta.triggerStage.trim()}`);
  }
  if (
    typeof meta.externalEngagementId === "string" &&
    meta.externalEngagementId.trim()
  ) {
    parts.push(`engagement: ${meta.externalEngagementId.trim()}`);
  }
  if (typeof meta.projectId === "string" && meta.projectId.trim()) {
    parts.push(`project: ${meta.projectId.trim()}`);
  }
  if (typeof meta.reason === "string" && meta.reason.trim()) {
    parts.push(`reason: ${meta.reason.trim()}`);
  }

  if (parts.length) return parts.join(" · ");

  const entries = Object.entries(meta).filter(
    ([, value]) => value != null && value !== ""
  );
  if (!entries.length) return "—";

  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

export async function writeAuditLog(input: {
  actorType: AuditActorType;
  actorUserId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipDigest?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  source?: AuditSource;
  correlationId?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        id: randomUUID(),
        actorType: input.actorType,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        metadata: input.metadata ?? undefined,
        ipDigest: input.ipDigest ?? null,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
        source: input.source ?? null,
        correlationId: input.correlationId ?? null,
      },
    });
  } catch (error) {
    console.error("audit log write failed:", error);
  }
}
