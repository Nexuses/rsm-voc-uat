import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { HttpError } from "@/lib/api/http-error";
import { logAiInteraction } from "@/lib/ai/log";
import { ContactAliaser, quoteUntrusted } from "@/lib/ai/minimize";
import { getAiProvider, type AiProvider } from "@/lib/ai/provider";
import {
  buildDashboardReport,
  type DashboardAnalyticsItem,
} from "@/lib/dashboard-analytics";
import type { DashboardOrgFilters } from "@/lib/dashboard-report-filters";
import { db } from "@/lib/db";

export const CX_REPORT_NARRATIVE_PROMPT_VERSION = "cx-report-narrative@1";

export const cxReportNarrativeSchema = z.object({
  executiveSummary: z.string().trim().min(1).max(2500),
  csatNarrative: z.string().trim().min(1).max(1500),
  cesNarrative: z.string().trim().min(1).max(1500),
  npsNarrative: z.string().trim().min(1).max(1500),
  voiceOfClientThemes: z.string().trim().min(1).max(2000),
  outlook: z.string().trim().min(1).max(1500),
});

export type CxReportNarrative = z.infer<typeof cxReportNarrativeSchema>;

export type CxReportNarrativeStats = {
  periodLabel: string;
  responseCount: number;
  csatAverage: number | null;
  csatFavorablePercent: number;
  cesAverage: number | null;
  cesFavorablePercent: number;
  npsScore: number | null;
  promoterPercent: number;
  detractorPercent: number;
  themes: Array<{ theme: string; count: number }>;
  commentSampleCount: number;
};

const PROMPTS_DIR = join(process.cwd(), "lib/ai/prompts");

function loadPromptFile(name: string) {
  return readFileSync(join(PROMPTS_DIR, name), "utf8");
}

export function loadCxNarrativeGuidelines() {
  return loadPromptFile("rsm-cx-narrative-guidelines.md");
}

export function loadCxNarrativeFewshot() {
  return loadPromptFile("rsm-cx-narrative-fewshot.md");
}

/** Light post-checks aligned with RSM golden rules. */
export function enforceRsmNarrativeHouseStyle(text: string) {
  return text
    .replace(/\bRSM Kuwait\b/gi, "RSM in Kuwait")
    .replace(/\bRSM-Kuwait\b/gi, "RSM in Kuwait")
    .replace(/\bRSM KW\b/gi, "RSM in Kuwait")
    .replace(/,\s+and\b/g, " and");
}

export function applyHouseStyleToNarrative(
  narrative: CxReportNarrative
): CxReportNarrative {
  return {
    executiveSummary: enforceRsmNarrativeHouseStyle(narrative.executiveSummary),
    csatNarrative: enforceRsmNarrativeHouseStyle(narrative.csatNarrative),
    cesNarrative: enforceRsmNarrativeHouseStyle(narrative.cesNarrative),
    npsNarrative: enforceRsmNarrativeHouseStyle(narrative.npsNarrative),
    voiceOfClientThemes: enforceRsmNarrativeHouseStyle(
      narrative.voiceOfClientThemes
    ),
    outlook: enforceRsmNarrativeHouseStyle(narrative.outlook),
  };
}

function extractCommentTexts(answers: unknown): string[] {
  if (!Array.isArray(answers)) return [];
  return answers
    .map((answer) => {
      if (!answer || typeof answer !== "object") return "";
      const reason = (answer as { reason_text?: unknown }).reason_text;
      return typeof reason === "string" ? reason.trim() : "";
    })
    .filter(Boolean);
}

export function buildNarrativeStatsBundle(input: {
  periodLabel: string;
  items: DashboardAnalyticsItem[];
  commentSample: string[];
}): CxReportNarrativeStats {
  const report = buildDashboardReport(input.items);
  return {
    periodLabel: input.periodLabel,
    responseCount: input.items.length,
    csatAverage: report.csat.average,
    csatFavorablePercent: report.csat.favorablePercent,
    cesAverage: report.ces.average,
    cesFavorablePercent: report.ces.favorablePercent,
    npsScore: report.nps.score,
    promoterPercent: report.nps.promoterPercent,
    detractorPercent: report.nps.detractorPercent,
    themes: report.themes.map(([theme, count]) => ({ theme, count })),
    commentSampleCount: input.commentSample.length,
  };
}

export function assembleCxNarrativeUserPrompt(input: {
  stats: CxReportNarrativeStats;
  commentSample: string[];
  priorNarratives: CxReportNarrative[];
  aliaser: ContactAliaser;
}) {
  const statsLines = [
    `Period: ${input.stats.periodLabel}`,
    `Responses in scope: ${input.stats.responseCount}`,
    `CSAT average: ${input.stats.csatAverage ?? "n/a"} (favorable ${input.stats.csatFavorablePercent}%)`,
    `CES average: ${input.stats.cesAverage ?? "n/a"} (favorable ${input.stats.cesFavorablePercent}%)`,
    `NPS score: ${input.stats.npsScore ?? "n/a"} (promoters ${input.stats.promoterPercent}%, detractors ${input.stats.detractorPercent}%)`,
    input.stats.themes.length
      ? `Leading themes: ${input.stats.themes
          .map((row) => `${row.theme} (${row.count})`)
          .join("; ")}`
      : "Leading themes: none",
  ].join("\n");

  const commentsBlock = input.commentSample.length
    ? input.commentSample
        .map((comment, index) =>
          quoteUntrusted(`comment-${index + 1}`, input.aliaser.redact(comment))
        )
        .join("\n\n")
    : "No client comments were available for this period.";

  const priorBlock = input.priorNarratives.length
    ? input.priorNarratives
        .map(
          (narrative, index) =>
            `PRIOR NARRATIVE ${index + 1}:\n${JSON.stringify(narrative)}`
        )
        .join("\n\n")
    : "No prior stored narratives.";

  return [
    "Draft a Client Experience Report narrative for the period below.",
    "Use only the statistics and comments provided. Do not invent figures or quotes.",
    "",
    "STATISTICS:",
    statsLines,
    "",
    "CLIENT COMMENTS (sample):",
    commentsBlock,
    "",
    "PRIOR NARRATIVES (style reference only):",
    priorBlock,
    "",
    "Reply with JSON only:",
    JSON.stringify({
      executiveSummary: "string",
      csatNarrative: "string",
      cesNarrative: "string",
      npsNarrative: "string",
      voiceOfClientThemes: "string",
      outlook: "string",
    }),
  ].join("\n");
}

export function buildCxNarrativeSystemPrompt() {
  return [
    "You are the Communications Director for RSM in Kuwait drafting the narrative sections of a Voice of Clients experience report.",
    "Follow the guidelines and few-shot tone excerpts exactly.",
    "",
    loadCxNarrativeGuidelines(),
    "",
    loadCxNarrativeFewshot(),
  ].join("\n");
}

const MAX_COMMENTS = 40;
const MAX_PRIOR = 3;

export async function generateCxReportNarrative(input: {
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  filters: DashboardOrgFilters & { window: string };
  items: DashboardAnalyticsItem[];
  answersByResponseId: Map<string, unknown>;
  createdById: string | null;
  provider?: AiProvider;
}) {
  if (!input.items.length) {
    throw new HttpError(
      "No survey responses in this period to summarise.",
      409
    );
  }

  const commentSample: string[] = [];
  for (const item of input.items) {
    if (commentSample.length >= MAX_COMMENTS) break;
    const answers = input.answersByResponseId.get(item.responseId);
    for (const comment of extractCommentTexts(answers)) {
      if (commentSample.length >= MAX_COMMENTS) break;
      commentSample.push(comment.slice(0, 500));
    }
  }

  const stats = buildNarrativeStatsBundle({
    periodLabel: input.periodLabel,
    items: input.items,
    commentSample,
  });

  const priorRows = await db.aiReportNarrative.findMany({
    orderBy: { createdAt: "desc" },
    take: MAX_PRIOR,
    select: { narrativeJson: true },
  });
  const priorNarratives = priorRows.flatMap((row) => {
    const parsed = cxReportNarrativeSchema.safeParse(row.narrativeJson);
    return parsed.success ? [parsed.data] : [];
  });

  const aliaser = new ContactAliaser();
  const provider = input.provider ?? getAiProvider();
  const started = Date.now();
  const sourceIds = input.items.map((item) => item.responseId).slice(0, 200);

  try {
    const result = await provider.chat({
      json: true,
      messages: [
        { role: "system", content: buildCxNarrativeSystemPrompt() },
        {
          role: "user",
          content: assembleCxNarrativeUserPrompt({
            stats,
            commentSample,
            priorNarratives,
            aliaser,
          }),
        },
      ],
    });

    const parsed = cxReportNarrativeSchema.parse(
      JSON.parse(result.content ?? "")
    );
    const narrative = applyHouseStyleToNarrative(parsed);

    const row = await db.aiReportNarrative.create({
      data: {
        id: randomUUID(),
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        filtersJson: input.filters as unknown as Prisma.InputJsonValue,
        statsJson: stats as unknown as Prisma.InputJsonValue,
        narrativeJson: narrative as unknown as Prisma.InputJsonValue,
        model: provider.model,
        promptVersion: CX_REPORT_NARRATIVE_PROMPT_VERSION,
        createdById: input.createdById,
      },
    });

    await logAiInteraction({
      purpose: "cx_report_narrative",
      provider: provider.name,
      model: provider.model,
      promptVersion: CX_REPORT_NARRATIVE_PROMPT_VERSION,
      actorUserId: input.createdById,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: Date.now() - started,
      status: "ok",
      sourceIds,
    });

    return {
      id: row.id,
      narrative,
      stats,
      model: provider.model,
      promptVersion: CX_REPORT_NARRATIVE_PROMPT_VERSION,
      createdAt: row.createdAt.toISOString(),
    };
  } catch (error) {
    await logAiInteraction({
      purpose: "cx_report_narrative",
      provider: provider.name,
      model: provider.model,
      promptVersion: CX_REPORT_NARRATIVE_PROMPT_VERSION,
      actorUserId: input.createdById,
      latencyMs: Date.now() - started,
      status: "error",
      error: error instanceof Error ? error.message : "failed",
      sourceIds,
    });
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      throw new HttpError(
        "The AI returned an unreadable narrative. Try again.",
        502
      );
    }
    throw error;
  }
}
