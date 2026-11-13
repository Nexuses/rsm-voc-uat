import { handleAutomationEvaluate, handleDelayedRuleVersion } from "@/lib/automation/engine";
import type { ClaimedJob } from "@/lib/jobs/queue";
import { handleMessageSend } from "@/lib/messaging/deliveries";
import { handleScoreAndEvaluate } from "@/lib/jobs/score-and-evaluate";
import { handleSlaMonitor } from "@/lib/cases/sla";
import { refreshAccountHealth } from "@/lib/health/refresh";
import { runEnrichmentJob } from "@/lib/survey/ingest";
import { processDueSurveyFollowups } from "@/lib/survey-invite-tracking";
import { refreshInternalBenchmarks } from "@/lib/benchmarks/service";
import { runTrainingRules } from "@/lib/training/service";

export type JobHandler = (job: ClaimedJob) => Promise<void>;

export const JOB_HANDLERS: Record<string, JobHandler> = {
  "response.score_and_evaluate": handleScoreAndEvaluate,
  "response.enrich": (job) => runEnrichmentJob(job.payload),
  "invites.followups": async () => {
    await processDueSurveyFollowups();
  },
  "cases.sla_monitor": async () => {
    await handleSlaMonitor();
  },
  "automation.evaluate": handleAutomationEvaluate,
  "automation.evaluate_version": handleDelayedRuleVersion,
  "messages.send": (job) => handleMessageSend(job),
  "accounts.health_refresh": async () => {
    await refreshAccountHealth();
  },
  "training.evaluate": async () => {
    await runTrainingRules();
  },
  "benchmarks.refresh": async () => {
    await refreshInternalBenchmarks();
  },
};
