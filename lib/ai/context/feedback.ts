import { responseScopeWhere, type AuthzContext } from "@/lib/authz";
import { responseScopeSql } from "@/lib/ai/scope-sql";
import { db } from "@/lib/db";
import { embedText } from "@/lib/insight";
import { resolveOverallSentiment } from "@/lib/survey/metrics";

export type FeedbackItem = {
  responseId: string;
  company: string | null;
  submittedAt: string;
  csat: number | null;
  ces: number | null;
  nps: number | null;
  sentiment: string | null;
  summary: string | null;
  comments: string[];
};

function comments(answers: unknown): string[] {
  if (!Array.isArray(answers)) return [];
  return answers.flatMap((answer) => {
    const text = (answer as { reason_text?: unknown })?.reason_text;
    return typeof text === "string" && text.trim() ? [text.trim().slice(0, 1000)] : [];
  });
}

/**
 * Semantic search over the caller's in-scope, non-excluded responses. Scope is
 * applied in SQL and again in the Prisma read (defense in depth). Respondent
 * names, emails, and phones are never selected.
 */
export async function searchScopedFeedback(
  ctx: AuthzContext,
  query: string,
  limit: number
): Promise<FeedbackItem[]> {
  const vector = `[${(await embedText(query)).join(",")}]`;
  const scope = responseScopeSql(ctx, 3);
  const rows = await db.$queryRawUnsafe<Array<{ responseId: string }>>(
    `SELECT e."responseId"
       FROM "ResponseEmbedding" e
       JOIN "Response" r ON r.id = e."responseId"
      WHERE r."excludedAt" IS NULL ${scope.clause}
      ORDER BY e.embedding <=> $1::vector ASC
      LIMIT $2`,
    vector,
    limit,
    ...scope.params
  );
  if (!rows.length) return [];

  const responses = await db.response.findMany({
    where: {
      AND: [{ id: { in: rows.map((row) => row.responseId) }, excludedAt: null }, responseScopeWhere(ctx)],
    },
    select: {
      id: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      answers: true,
      completedAt: true,
      createdAt: true,
      client: { select: { company: true } },
      insight: { select: { overallSentiment: true, satisfactionSummary: true } },
    },
  });
  const byId = new Map(responses.map((response) => [response.id, response]));
  return rows.flatMap(({ responseId }) => {
    const response = byId.get(responseId);
    if (!response) return [];
    return [
      {
        responseId,
        company: response.client?.company?.trim() || null,
        submittedAt: (response.completedAt ?? response.createdAt).toISOString(),
        csat: response.csatScore,
        ces: response.cesScore,
        nps: response.npsScore,
        sentiment: resolveOverallSentiment({
          csatScore: response.csatScore,
          cesScore: response.cesScore,
          npsScore: response.npsScore,
          storedSentiment: response.insight?.overallSentiment,
        }),
        summary: response.insight?.satisfactionSummary ?? null,
        comments: comments(response.answers),
      },
    ];
  });
}
