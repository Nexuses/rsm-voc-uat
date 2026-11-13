import { z } from "zod";

/** Thresholds are configured per rule by RSM; nothing here encodes a default policy. */
export const trainingRuleConfigSchema = z.object({
  metric: z.enum(["csat", "ces", "nps"]),
  operator: z.enum(["lte", "gte"]),
  threshold: z.number().finite(),
  minOccurrences: z.number().int().min(1).max(100),
  windowDays: z.number().int().min(1).max(365),
  courseKey: z.string().trim().min(1).max(80),
  role: z.enum(["partner", "manager"]),
});

export type TrainingRuleConfig = z.infer<typeof trainingRuleConfigSchema>;

export type TrainingObservation = {
  responseId: string;
  submittedAt: Date;
  partnerEmployeeId: string | null;
  managerEmployeeId: string | null;
  scores: { csat: number | null; ces: number | null; nps: number | null };
};

export type TrainingMatch = { employeeId: string; responseIds: string[] };

export function windowPeriod(config: Pick<TrainingRuleConfig, "windowDays">, now: Date) {
  return Math.floor(now.getTime() / (config.windowDays * 24 * 60 * 60 * 1000));
}

export function evaluateTrainingRule(
  config: TrainingRuleConfig,
  observations: TrainingObservation[],
  now: Date
): TrainingMatch[] {
  const since = now.getTime() - config.windowDays * 24 * 60 * 60 * 1000;
  const byEmployee = new Map<string, string[]>();
  for (const observation of observations) {
    const at = observation.submittedAt.getTime();
    if (at < since || at > now.getTime()) continue;
    const score = observation.scores[config.metric];
    if (score === null) continue;
    const hit = config.operator === "lte" ? score <= config.threshold : score >= config.threshold;
    if (!hit) continue;
    const employeeId =
      config.role === "partner" ? observation.partnerEmployeeId : observation.managerEmployeeId;
    if (!employeeId) continue;
    const ids = byEmployee.get(employeeId) ?? [];
    ids.push(observation.responseId);
    byEmployee.set(employeeId, ids);
  }
  return [...byEmployee.entries()]
    .filter(([, ids]) => ids.length >= config.minOccurrences)
    .map(([employeeId, responseIds]) => ({ employeeId, responseIds }))
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
}
