import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/survey/ingest", () => ({ runEnrichmentJob: vi.fn() }));
vi.mock("@/lib/survey-invite-tracking", () => ({ processDueSurveyFollowups: vi.fn() }));

import { EVENT_CATALOG } from "@/lib/events/catalog";
import { JOB_HANDLERS } from "@/lib/jobs/handlers";

describe("event catalogue", () => {
  it("only subscribes events to job types that have a registered handler", () => {
    for (const [type, definition] of Object.entries(EVENT_CATALOG)) {
      for (const job of definition.jobs) {
        expect(JOB_HANDLERS[job], `${type} -> ${job}`).toBeTypeOf("function");
      }
    }
  });

  it("covers the planned engagement, survey, case, training, and health events", () => {
    expect(Object.keys(EVENT_CATALOG).sort()).toEqual(
      [
        "BILLING_EVENT",
        "CASE_CREATED",
        "CASE_RESOLVED",
        "CASE_SLA_BREACHED",
        "CLIENT_CONFIRMATION_RECEIVED",
        "CRM_STATUS_CHANGED",
        "ENGAGEMENT_COMPLETED",
        "ENGAGEMENT_CREATED",
        "ENGAGEMENT_STARTED",
        "HEALTH_STATE_CHANGED",
        "MILESTONE_REACHED",
        "SURVEY_INVITE_SENT",
        "SURVEY_RESPONSE_SUBMITTED",
        "TRAINING_RULE_TRIGGERED",
      ].sort()
    );
  });
});
