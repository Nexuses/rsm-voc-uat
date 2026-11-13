import { randomUUID } from "node:crypto";
import { HttpError } from "@/lib/api/http-error";
import type { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  CURRENT_LIVE_VERSION_KEY,
  currentLiveSurveyDefinition,
  DEFAULT_SURVEY_KEY,
  DEFAULT_SURVEY_NAME,
  surveyDefinitionSchema,
  type SurveyDefinition,
} from "@/lib/surveys/definition";

export class SurveyVersionError extends HttpError {}

/** Published and archived versions never change; edits go to a new draft. */
export function assertEditable(status: string) {
  if (status !== "draft") {
    throw new SurveyVersionError(`A ${status} version cannot be edited`, 409);
  }
}

export function assertPublishable(status: string) {
  if (status !== "draft") {
    throw new SurveyVersionError(`Only drafts can be published (this one is ${status})`, 409);
  }
}

function questionRows(surveyVersionId: string, definition: SurveyDefinition) {
  return definition.questions.map((question, index) => ({
    id: randomUUID(),
    surveyVersionId,
    questionKey: question.key,
    position: index + 1,
    metric: question.metric ?? null,
    kind: question.kind,
    scaleMin: question.scale?.min ?? null,
    scaleMax: question.scale?.max ?? null,
    text: question.text as Prisma.InputJsonValue,
    weight: question.weight ?? null,
  }));
}

/** Seeds the live survey as a published version so history has a root. */
export async function ensureDefaultSurvey() {
  const survey = await db.survey.upsert({
    where: { key: DEFAULT_SURVEY_KEY },
    create: { id: randomUUID(), key: DEFAULT_SURVEY_KEY, name: DEFAULT_SURVEY_NAME },
    update: {},
  });
  const existing = await db.surveyVersion.findUnique({
    where: { versionKey: CURRENT_LIVE_VERSION_KEY },
  });
  if (existing) return { survey, version: existing };

  const definition = currentLiveSurveyDefinition();
  const version = await db.$transaction(async (tx) => {
    const created = await tx.surveyVersion.create({
      data: {
        id: randomUUID(),
        surveyId: survey.id,
        versionKey: CURRENT_LIVE_VERSION_KEY,
        status: "published",
        definition: definition as Prisma.InputJsonValue,
        publishedAt: new Date(),
      },
    });
    await tx.surveyQuestion.createMany({ data: questionRows(created.id, definition) });
    return created;
  });
  return { survey, version };
}

export async function listSurveys() {
  await ensureDefaultSurvey();
  return db.survey.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          versionKey: true,
          status: true,
          publishedAt: true,
          archivedAt: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getSurveyVersion(id: string) {
  return db.surveyVersion.findUnique({
    where: { id },
    include: { survey: { select: { id: true, key: true, name: true } } },
  });
}

export async function createDraftVersion(input: {
  surveyId: string;
  fromVersionId?: string;
  versionKey: string;
  actorUserId: string;
}) {
  const source = input.fromVersionId
    ? await db.surveyVersion.findFirst({
        where: { id: input.fromVersionId, surveyId: input.surveyId },
      })
    : await db.surveyVersion.findFirst({
        where: { surveyId: input.surveyId },
        orderBy: { createdAt: "desc" },
      });
  if (!source) throw new SurveyVersionError("Source version not found", 404);
  if (await db.surveyVersion.findUnique({ where: { versionKey: input.versionKey } })) {
    throw new SurveyVersionError("Version key already exists", 409);
  }

  const draft = await db.surveyVersion.create({
    data: {
      id: randomUUID(),
      surveyId: input.surveyId,
      versionKey: input.versionKey,
      status: "draft",
      definition: source.definition as Prisma.InputJsonValue,
      createdByUserId: input.actorUserId,
    },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "survey.draft_created",
    resourceType: "SurveyVersion",
    resourceId: draft.id,
    metadata: { versionKey: draft.versionKey, fromVersionId: source.id },
    source: "api",
  });
  return draft;
}

export async function updateDraftDefinition(input: {
  versionId: string;
  definition: unknown;
  actorUserId: string;
}) {
  const version = await db.surveyVersion.findUnique({ where: { id: input.versionId } });
  if (!version) throw new SurveyVersionError("Version not found", 404);
  assertEditable(version.status);
  const parsed = surveyDefinitionSchema.safeParse(input.definition);
  if (!parsed.success) {
    throw new SurveyVersionError(
      parsed.error.issues.map((issue) => issue.message).join("; "),
      400
    );
  }
  const updated = await db.surveyVersion.update({
    where: { id: version.id },
    data: { definition: parsed.data as Prisma.InputJsonValue },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "survey.draft_updated",
    resourceType: "SurveyVersion",
    resourceId: version.id,
    before: version.definition as Prisma.InputJsonValue,
    after: parsed.data as Prisma.InputJsonValue,
    source: "api",
  });
  return updated;
}

export async function publishVersion(input: { versionId: string; actorUserId: string }) {
  const version = await db.surveyVersion.findUnique({ where: { id: input.versionId } });
  if (!version) throw new SurveyVersionError("Version not found", 404);
  assertPublishable(version.status);
  const definition = surveyDefinitionSchema.parse(version.definition);

  const published = await db.$transaction(async (tx) => {
    const record = await tx.surveyVersion.update({
      where: { id: version.id },
      data: {
        status: "published",
        publishedAt: new Date(),
        publishedByUserId: input.actorUserId,
      },
    });
    await tx.surveyQuestion.createMany({
      data: questionRows(version.id, definition),
      skipDuplicates: true,
    });
    return record;
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "survey.published",
    resourceType: "SurveyVersion",
    resourceId: version.id,
    metadata: { versionKey: version.versionKey },
    source: "api",
  });
  return published;
}

export async function archiveVersion(input: { versionId: string; actorUserId: string }) {
  const version = await db.surveyVersion.findUnique({ where: { id: input.versionId } });
  if (!version) throw new SurveyVersionError("Version not found", 404);
  if (version.status === "archived") return version;
  if (version.versionKey === CURRENT_LIVE_VERSION_KEY) {
    throw new SurveyVersionError("The live survey version cannot be archived", 409);
  }
  const archived = await db.surveyVersion.update({
    where: { id: version.id },
    data: { status: "archived", archivedAt: new Date() },
  });
  await writeAuditLog({
    actorType: "user",
    actorUserId: input.actorUserId,
    action: "survey.archived",
    resourceType: "SurveyVersion",
    resourceId: version.id,
    before: { status: version.status },
    after: { status: "archived" },
    source: "api",
  });
  return archived;
}
