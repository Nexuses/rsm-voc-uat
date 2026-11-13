import { randomUUID } from "node:crypto";
import { z } from "zod";
import { HttpError } from "@/lib/api/http-error";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { emitEventSafely } from "@/lib/events/emit";
import { getFlagMode } from "@/lib/flags";
import { getLmsProvider } from "@/lib/providers";
import {
  evaluateTrainingRule,
  trainingRuleConfigSchema,
  windowPeriod,
  type TrainingObservation,
} from "@/lib/training/rules";

export class TrainingError extends HttpError {}

export const courseInputSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9][a-z0-9_.-]{1,79}$/),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional(),
  externalUrl: z.string().trim().url().max(500).optional(),
});

export const ruleInputSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9][a-z0-9_.-]{1,79}$/),
  name: z.string().trim().min(3).max(160),
  config: trainingRuleConfigSchema,
  mode: z.enum(["shadow", "live"]).default("shadow"),
  active: z.boolean().default(false),
});

export async function listTraining() {
  const [courses, rules, assignments] = await Promise.all([
    db.trainingCourse.findMany({ orderBy: { createdAt: "desc" } }),
    db.trainingRule.findMany({ orderBy: { createdAt: "desc" } }),
    db.trainingAssignment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        employee: { select: { id: true, name: true } },
        course: { select: { key: true, title: true } },
        rule: { select: { key: true } },
      },
    }),
  ]);
  return { courses, rules, assignments };
}

export async function createCourse(input: z.infer<typeof courseInputSchema>, actorUserId: string) {
  const existing = await db.trainingCourse.findUnique({ where: { key: input.key } });
  if (existing) throw new TrainingError("A course with this key already exists", 409);
  const course = await db.trainingCourse.create({ data: { id: randomUUID(), ...input } });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "training.course_created",
    resourceType: "TrainingCourse",
    resourceId: course.id,
    after: { key: course.key, title: course.title },
    source: "api",
  });
  return course;
}

export async function upsertRule(input: z.infer<typeof ruleInputSchema>, actorUserId: string) {
  const course = await db.trainingCourse.findUnique({ where: { key: input.config.courseKey } });
  if (!course) throw new TrainingError("Unknown course key", 400);
  const before = await db.trainingRule.findUnique({ where: { key: input.key } });
  const rule = await db.trainingRule.upsert({
    where: { key: input.key },
    create: { id: randomUUID(), ...input },
    update: { name: input.name, config: input.config, mode: input.mode, active: input.active },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "training.rule_saved",
    resourceType: "TrainingRule",
    resourceId: rule.id,
    before: before
      ? { mode: before.mode, active: before.active, config: before.config as object }
      : undefined,
    after: { key: rule.key, mode: rule.mode, active: rule.active, config: input.config },
    source: "api",
  });
  return rule;
}

async function loadObservations(windowDays: number, now: Date): Promise<TrainingObservation[]> {
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const rows = await db.response.findMany({
    where: { excludedAt: null, engagementId: { not: null }, createdAt: { gte: since, lte: now } },
    select: {
      id: true,
      createdAt: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      engagement: { select: { partnerEmployeeId: true, managerEmployeeId: true } },
    },
  });
  return rows.map((row) => ({
    responseId: row.id,
    submittedAt: row.createdAt,
    partnerEmployeeId: row.engagement?.partnerEmployeeId ?? null,
    managerEmployeeId: row.engagement?.managerEmployeeId ?? null,
    scores: { csat: row.csatScore, ces: row.cesScore, nps: row.npsScore },
  }));
}

/**
 * Shadow (flag or rule) writes "proposed" assignments for review only.
 * Live requires both the flag and the rule to be live, then enrolls and emits.
 */
export async function runTrainingRules(now = new Date()) {
  const flag = await getFlagMode("training.rules");
  if (flag === "off") return { rules: 0, proposed: 0, assigned: 0 };

  const rules = await db.trainingRule.findMany({ where: { active: true } });
  let proposed = 0;
  let assigned = 0;
  for (const rule of rules) {
    const parsed = trainingRuleConfigSchema.safeParse(rule.config);
    if (!parsed.success) {
      console.error("training rule has invalid config; skipped", { key: rule.key });
      continue;
    }
    const config = parsed.data;
    const course = await db.trainingCourse.findUnique({ where: { key: config.courseKey } });
    if (!course || !course.active) continue;

    const live = flag === "live" && rule.mode === "live";
    const matches = evaluateTrainingRule(config, await loadObservations(config.windowDays, now), now);
    const period = windowPeriod(config, now);

    for (const match of matches) {
      const dedupeKey = `training:${rule.key}:${match.employeeId}:${period}`;
      const reason = `${config.metric} ${config.operator} ${config.threshold} on ${match.responseIds.length} response(s) within ${config.windowDays} days (${config.role})`;
      const existing = await db.trainingAssignment.findUnique({ where: { dedupeKey } });
      if (!existing) {
        await db.trainingAssignment.create({
          data: {
            id: randomUUID(),
            dedupeKey,
            employeeId: match.employeeId,
            courseId: course.id,
            ruleId: rule.id,
            reason,
            status: "proposed",
            sourceResponseIds: match.responseIds,
          },
        });
        proposed += 1;
      }
      if (!live) continue;

      const claimed = await db.trainingAssignment.updateMany({
        where: { dedupeKey, status: "proposed" },
        data: { status: "assigned" },
      });
      if (claimed.count === 0) continue;

      const employee = await db.employee.findUnique({
        where: { id: match.employeeId },
        select: { email: true },
      });
      const enrollment = await getLmsProvider()
        .enroll({ employeeEmail: employee?.email ?? null, courseKey: course.key })
        .catch((error) => {
          console.error("LMS enrollment failed; assignment kept for manual follow-up", {
            dedupeKey,
            error,
          });
          return { externalId: null };
        });
      const assignment = await db.trainingAssignment.update({
        where: { dedupeKey },
        data: { externalId: enrollment.externalId },
      });
      await emitEventSafely({
        type: "TRAINING_RULE_TRIGGERED",
        idempotencyKey: dedupeKey,
        aggregateId: match.employeeId,
        payload: { employeeId: match.employeeId, ruleKey: rule.key },
      });
      await writeAuditLog({
        actorType: "system",
        action: "training.assigned",
        resourceType: "TrainingAssignment",
        resourceId: assignment.id,
        after: { ruleKey: rule.key, courseKey: course.key, responses: match.responseIds.length },
        source: "worker",
      });
      assigned += 1;
    }
  }
  return { rules: rules.length, proposed, assigned };
}
