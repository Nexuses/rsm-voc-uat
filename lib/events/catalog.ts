import { z } from "zod";

const id = z.string().min(1);

// Event types, their payload contract, and the jobs each one enqueues.
// Types with no jobs are still recorded so rules and audits can use them.
export const EVENT_CATALOG = {
  ENGAGEMENT_CREATED: {
    aggregateType: "Engagement",
    payload: z.object({ engagementId: id, externalEngagementId: z.string().nullable() }),
    jobs: [],
  },
  ENGAGEMENT_STARTED: {
    aggregateType: "Engagement",
    payload: z.object({ engagementId: id }),
    jobs: [],
  },
  MILESTONE_REACHED: {
    aggregateType: "Engagement",
    payload: z.object({ engagementId: id, milestoneId: id, name: z.string() }),
    jobs: [],
  },
  BILLING_EVENT: {
    aggregateType: "Engagement",
    payload: z.object({ engagementId: id, kind: z.string().min(1) }),
    jobs: [],
  },
  ENGAGEMENT_COMPLETED: {
    aggregateType: "Engagement",
    payload: z.object({ engagementId: id }),
    jobs: [],
  },
  CRM_STATUS_CHANGED: {
    aggregateType: "SurveyInvite",
    payload: z.object({
      inviteId: id,
      status: z.string().min(1),
      source: z.string().min(1),
    }),
    jobs: [],
  },
  SURVEY_INVITE_SENT: {
    aggregateType: "SurveyInvite",
    payload: z.object({ inviteId: id, channel: z.enum(["email", "whatsapp", "sms"]) }),
    jobs: [],
  },
  SURVEY_RESPONSE_SUBMITTED: {
    aggregateType: "Response",
    payload: z.object({
      responseId: id,
      surveyVersion: z.string().min(1),
      source: z.enum(["voice", "typed"]),
    }),
    jobs: ["response.score_and_evaluate"],
  },
  CASE_CREATED: {
    aggregateType: "Case",
    payload: z.object({ caseId: id, responseId: z.string().nullable(), severity: z.string() }),
    jobs: [],
  },
  CASE_SLA_BREACHED: {
    aggregateType: "Case",
    payload: z.object({ caseId: id, slaDueAt: z.string() }),
    jobs: [],
  },
  CASE_RESOLVED: {
    aggregateType: "Case",
    payload: z.object({ caseId: id }),
    jobs: [],
  },
  CLIENT_CONFIRMATION_RECEIVED: {
    aggregateType: "Case",
    payload: z.object({ caseId: id, confirmed: z.boolean() }),
    jobs: [],
  },
  TRAINING_RULE_TRIGGERED: {
    aggregateType: "Employee",
    payload: z.object({ employeeId: id, ruleKey: z.string().min(1) }),
    jobs: [],
  },
  HEALTH_STATE_CHANGED: {
    aggregateType: "Account",
    payload: z.object({
      accountId: id,
      fromState: z.string().nullable(),
      toState: z.string(),
    }),
    jobs: [],
  },
} as const satisfies Record<
  string,
  { aggregateType: string; payload: z.ZodType; jobs: readonly string[] }
>;

export type DomainEventType = keyof typeof EVENT_CATALOG;

export type DomainEventPayload<T extends DomainEventType> = z.infer<
  (typeof EVENT_CATALOG)[T]["payload"]
>;

export function isDomainEventType(value: string): value is DomainEventType {
  return Object.prototype.hasOwnProperty.call(EVENT_CATALOG, value);
}
