// lib/aggregate.ts — recompute PII-FREE public metrics. Reads private source tables,
// but writes only csat_snapshot, theme_rollup, and public_review_snippet for the public API.
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import OpenAI from "openai";
import { z } from "zod";
import { db } from "@/lib/db";
import { INSIGHT_MODEL } from "@/lib/insight";
import {
  PUBLIC_REVIEW_MAX_ITEMS,
} from "@/lib/public-reviews";
import { buildPeriodMetrics } from "@/lib/survey/metrics";

const themeResultSchema = z.object({
  themes: z
    .array(
      z.object({
        themeLabel: z.string().min(1),
        sentiment: z.enum(["positive", "negative"]),
        mentionCount: z.number().int().positive(),
        publicSummary: z.string().min(1),
      })
    )
    .max(8),
});

let openai: OpenAI | undefined;

function periodOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function rollupInvitesByPeriod(
  invites: Array<{ sentAt: Date | null; completedAt: Date | null }>
) {
  const invitesByPeriod = new Map<
    string,
    { invitesSentCount: number; inviteResponsesCount: number }
  >();

  for (const invite of invites) {
    if (!invite.sentAt) continue;
    const period = periodOf(invite.sentAt);
    const entry = invitesByPeriod.get(period) ?? {
      invitesSentCount: 0,
      inviteResponsesCount: 0,
    };
    entry.invitesSentCount += 1;
    if (invite.completedAt) entry.inviteResponsesCount += 1;
    invitesByPeriod.set(period, entry);
  }

  return invitesByPeriod;
}

export async function recomputeInviteOutreachSnapshots(): Promise<void> {
  const invites = await db.surveyInvite.findMany({
    where: { sentAt: { not: null } },
    select: { sentAt: true, completedAt: true },
  });
  const invitesByPeriod = rollupInvitesByPeriod(invites);
  const snapshots = await db.csatSnapshot.findMany({
    select: { period: true },
  });
  const periods = new Set([
    ...invitesByPeriod.keys(),
    ...snapshots.map((snapshot) => snapshot.period),
  ]);

  for (const period of periods) {
    const counts = invitesByPeriod.get(period) ?? {
      invitesSentCount: 0,
      inviteResponsesCount: 0,
    };
    const existing = await db.csatSnapshot.findUnique({ where: { period } });

    if (existing) {
      await db.csatSnapshot.update({
        where: { period },
        data: {
          invitesSentCount: counts.invitesSentCount,
          inviteResponsesCount: counts.inviteResponsesCount,
          computedAt: new Date(),
        },
      });
      continue;
    }

    if (counts.invitesSentCount > 0) {
      await db.csatSnapshot.create({
        data: {
          period,
          avgRating: 0,
          responseCount: 0,
          distribution: {},
          invitesSentCount: counts.invitesSentCount,
          inviteResponsesCount: counts.inviteResponsesCount,
        },
      });
    }
  }
}

export async function recomputeAggregates(): Promise<void> {
  const [responses, invites] = await Promise.all([
    db.response.findMany({
      where: { excludedAt: null },
      select: {
        conversationId: true,
        csatScore: true,
        cesScore: true,
        npsScore: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    db.surveyInvite.findMany({
      where: { sentAt: { not: null } },
      select: { sentAt: true, completedAt: true },
    }),
  ]);

  const responsesByPeriod = new Map<
    string,
    Array<{
      conversationId: string;
      csatScore: number | null;
      cesScore: number | null;
      npsScore: number | null;
    }>
  >();
  for (const response of responses) {
    const period = periodOf(response.completedAt ?? response.createdAt);
    const periodResponses = responsesByPeriod.get(period) ?? [];
    periodResponses.push({
      conversationId: response.conversationId,
      csatScore: response.csatScore,
      cesScore: response.cesScore,
      npsScore: response.npsScore,
    });
    responsesByPeriod.set(period, periodResponses);
  }

  const invitesByPeriod = rollupInvitesByPeriod(invites);

  const activePeriods = [
    ...new Set([...responsesByPeriod.keys(), ...invitesByPeriod.keys()]),
  ];
  await db.csatSnapshot.deleteMany({
    where: activePeriods.length ? { period: { notIn: activePeriods } } : {},
  });

  for (const period of activePeriods) {
    const periodResponses = responsesByPeriod.get(period) ?? [];
    const inviteCounts = invitesByPeriod.get(period) ?? {
      invitesSentCount: 0,
      inviteResponsesCount: 0,
    };
    const metrics = buildPeriodMetrics(periodResponses);
    const data = {
      avgRating: metrics.csat.average ?? 0,
      responseCount: metrics.csat.responseCount,
      distribution: metrics.csat.distribution,
      csatFavorablePercent: metrics.csat.favorablePercent,
      cesAverage: metrics.ces.average,
      cesFavorablePercent: metrics.ces.favorablePercent,
      cesResponseCount: metrics.ces.responseCount,
      cesDistribution: metrics.ces.distribution,
      npsScore: metrics.nps.score,
      npsResponseCount: metrics.nps.responseCount,
      npsDistribution: metrics.nps.distribution,
      promoterPercent: metrics.nps.promoterPercent,
      passivePercent: metrics.nps.passivePercent,
      detractorPercent: metrics.nps.detractorPercent,
      totalResponseCount: metrics.totalResponseCount,
      completeResponseCount: metrics.completeResponseCount,
      voiceResponseCount: metrics.voiceResponseCount,
      invitesSentCount: inviteCounts.invitesSentCount,
      inviteResponsesCount: inviteCounts.inviteResponsesCount,
    };

    await db.csatSnapshot.upsert({
      where: { period },
      update: {
        ...data,
        computedAt: new Date(),
      },
      create: {
        period,
        ...data,
      },
    });
  }

  await recomputeThemeRollups(activePeriods);
  await recomputePublicReviewSnippets();
}

async function recomputeThemeRollups(activePeriods: string[]) {
  await db.themeRollup.deleteMany({
    where: activePeriods.length ? { period: { notIn: activePeriods } } : {},
  });

  const insights = await db.responseInsight.findMany({
    where: { response: { excludedAt: null } },
    include: {
      response: {
        select: {
          completedAt: true,
          createdAt: true,
          client: { select: { name: true, company: true } },
        },
      },
    },
  });
  const inputsByPeriod = new Map<
    string,
    { drivers: string[]; identities: string[] }
  >();

  for (const insight of insights) {
    const period = periodOf(
      insight.response.completedAt ?? insight.response.createdAt
    );
    const input = inputsByPeriod.get(period) ?? {
      drivers: [],
      identities: [],
    };
    const client = insight.response.client;

    if (client?.name) input.identities.push(client.name);
    if (client?.company) input.identities.push(client.company);

    if (Array.isArray(insight.keyDrivers)) {
      for (const driver of insight.keyDrivers) {
        if (typeof driver === "string" && driver.trim()) {
          input.drivers.push(
            stripLikelyPii(driver.trim(), input.identities)
          );
        }
      }
    }
    inputsByPeriod.set(period, input);
  }

  for (const period of activePeriods) {
    const input = inputsByPeriod.get(period);
    if (!input?.drivers.length) {
      await db.themeRollup.deleteMany({ where: { period } });
      continue;
    }

    const completion = await getOpenAI().chat.completions.create({
      model: INSIGHT_MODEL,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "public_theme_rollups",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              themes: {
                type: "array",
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    themeLabel: { type: "string" },
                    sentiment: {
                      type: "string",
                      enum: ["positive", "negative"],
                    },
                    mentionCount: { type: "integer", minimum: 1 },
                    publicSummary: { type: "string" },
                  },
                  required: [
                    "themeLabel",
                    "sentiment",
                    "mentionCount",
                    "publicSummary",
                  ],
                },
              },
            },
            required: ["themes"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Group the supplied client-feedback drivers into concise public themes.
Return only JSON shaped as {"themes":[{"themeLabel":string,"sentiment":"positive"|"negative","mentionCount":number,"publicSummary":string}]}.
Use aggregate language only. Never include names, companies, contact details, quotations,
or details that could identify a respondent. Produce at least one theme when drivers exist.`,
        },
        {
          role: "user",
          content: JSON.stringify({ period, drivers: input.drivers }),
        },
      ],
    });
    const content = completion.choices[0]?.message?.content ?? "{}";
    const result = themeResultSchema.parse(JSON.parse(content));
    const themes = result.themes.map((theme) => ({
      period,
      themeLabel: stripLikelyPii(theme.themeLabel, input.identities),
      sentiment: theme.sentiment,
      mentionCount: Math.min(theme.mentionCount, input.drivers.length),
      publicSummary: stripLikelyPii(
        theme.publicSummary,
        input.identities
      ),
    }));

    await db.$transaction([
      db.themeRollup.deleteMany({ where: { period } }),
      db.themeRollup.createMany({ data: themes }),
    ]);
  }
}

/**
 * Anonymous typed submissions (no invite) can be forged by anyone, so they
 * reach the public showcase only after an admin approves them. Invite-linked
 * and voice responses are eligible unless an admin hid them.
 */
export function publicSnippetEligibilityWhere() {
  return {
    excludedAt: null,
    publicHiddenAt: null,
    OR: [
      { publicApprovedAt: { not: null } },
      { surveyInvite: { isNot: null } },
      { NOT: { conversationId: { startsWith: "typed_" } } },
    ],
  } satisfies Prisma.ResponseWhereInput;
}

export async function recomputePublicReviewSnippets() {
  // Most recent commented responses overall (not a calendar window).
  // Cap after sanitization so empty/redacted comments do not waste slots.
  const responses = await db.response.findMany({
    where: publicSnippetEligibilityWhere(),
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    take: PUBLIC_REVIEW_MAX_ITEMS * 5,
    select: {
      id: true,
      answers: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      completedAt: true,
      createdAt: true,
      client: {
        select: {
          name: true,
          company: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  const snippets: Array<{
    sourceKey: string;
    completedAt: Date;
    comment: string;
    respondentName: string | null;
    company: string | null;
    csatScore: number | null;
    cesScore: number | null;
    npsScore: number | null;
  }> = [];

  for (const response of responses) {
    if (snippets.length >= PUBLIC_REVIEW_MAX_ITEMS) break;

    const comment = pickDisplayComment(response.answers);
    if (!comment) continue;

    const respondentName = response.client?.name?.trim() || null;
    const company = response.client?.company?.trim() || null;
    const identities = [
      respondentName,
      company,
      response.client?.email,
      response.client?.phone,
    ].filter((value): value is string => Boolean(value?.trim()));

    const sanitized = stripLikelyPii(comment, identities);
    if (!sanitized || sanitized === "[redacted]") continue;

    snippets.push({
      sourceKey: hashResponseId(response.id),
      completedAt: response.completedAt ?? response.createdAt,
      comment: sanitized,
      respondentName,
      company,
      csatScore: response.csatScore,
      cesScore: response.cesScore,
      npsScore: response.npsScore,
    });
  }

  await db.$transaction([
    db.publicReviewSnippet.deleteMany({}),
    ...(snippets.length
      ? [db.publicReviewSnippet.createMany({ data: snippets })]
      : []),
  ]);
}

export function pickDisplayComment(answers: unknown): string | null {
  if (!Array.isArray(answers)) return null;

  let longest: string | null = null;
  for (const entry of answers) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const reason = (entry as { reason_text?: unknown }).reason_text;
    if (typeof reason !== "string") continue;
    const trimmed = reason.trim();
    if (!trimmed) continue;
    if (!longest || trimmed.length > longest.length) {
      longest = trimmed;
    }
  }
  return longest;
}

function hashResponseId(responseId: string) {
  return createHash("sha256").update(responseId).digest("hex").slice(0, 32);
}

export function stripLikelyPii(value: string, identities: string[]) {
  let sanitized = value;
  for (const identity of identities) {
    if (!identity.trim()) continue;
    sanitized = sanitized.replace(
      new RegExp(escapeRegExp(identity.trim()), "gi"),
      "the client"
    );
  }

  return sanitized
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted]")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  // Bounded so a stalled theme-summary call cannot hold aggregate recompute
  // open for the SDK's 10-minute default.
  openai ??= new OpenAI({ apiKey, timeout: 30_000, maxRetries: 2 });
  return openai;
}
