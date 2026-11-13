import { testimonialScopeWhere, type AuthzContext } from "@/lib/authz";
import { db } from "@/lib/db";

export type AnnualCxQuoteMetric = "csat" | "nps" | "ces";

export type AnnualCxQuote = {
  id: string;
  text: string;
  respondentName: string | null;
  company: string | null;
  showAttribution: boolean;
  /** Best-fit survey metric for this quote, used to pick 2 per metric. */
  metric: AnnualCxQuoteMetric | null;
};

const METRIC_ORDER: AnnualCxQuoteMetric[] = ["csat", "nps", "ces"];
const PER_METRIC_LIMIT = 2;

function respondentName(input: {
  customerName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  clientName?: string | null;
}) {
  const named = input.customerName?.trim();
  if (named) return named;
  const parts = [input.firstName?.trim(), input.lastName?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return input.clientName?.trim() || null;
}

type AnswerLike = {
  question_number?: unknown;
  metric?: unknown;
  reason_text?: unknown;
};

function reasonByMetric(answers: unknown): Record<AnnualCxQuoteMetric, string> {
  const reasons: Record<AnnualCxQuoteMetric, string> = { csat: "", nps: "", ces: "" };
  if (!Array.isArray(answers)) return reasons;
  for (const entry of answers as AnswerLike[]) {
    if (!entry || typeof entry !== "object") continue;
    const reason = typeof entry.reason_text === "string" ? entry.reason_text.trim() : "";
    if (!reason) continue;
    const metric =
      entry.metric === "csat" || entry.metric === "nps" || entry.metric === "ces"
        ? entry.metric
        : entry.question_number === 1
          ? "csat"
          : entry.question_number === 2
            ? "ces"
            : entry.question_number === 3
              ? "nps"
              : null;
    if (metric && !reasons[metric]) reasons[metric] = reason;
  }
  return reasons;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Best-fit metric for a published testimonial: the metric whose own survey
 * comment the approved text is based on, provided that metric was scored
 * favourably (CSAT 4–5, CES 5–7, NPS 9–10). Null when no metric qualifies.
 */
export function quoteMetric(input: {
  text: string;
  answers: unknown;
  csatScore?: number | null;
  cesScore?: number | null;
  npsScore?: number | null;
}): AnnualCxQuoteMetric | null {
  const reasons = reasonByMetric(input.answers);
  const favourable: Record<AnnualCxQuoteMetric, boolean> = {
    csat: input.csatScore != null && input.csatScore >= 4,
    ces: input.cesScore != null && input.cesScore >= 5,
    nps: input.npsScore != null && input.npsScore >= 9,
  };
  const text = normalize(input.text);
  let best: AnnualCxQuoteMetric | null = null;
  let bestScore = -1;
  for (const metric of METRIC_ORDER) {
    const reason = reasons[metric];
    if (!reason || !favourable[metric]) continue;
    const overlap =
      text.includes(normalize(reason)) || normalize(reason).includes(text) ? 1000 : 0;
    const score = overlap + reason.length;
    if (score > bestScore) {
      bestScore = score;
      best = metric;
    }
  }
  return best;
}

/** Interleave so the report shows CSAT, NPS, CES, then the second of each. */
export function selectQuotesPerMetric(
  quotes: AnnualCxQuote[],
  limit = 6
): AnnualCxQuote[] {
  const cap = Math.max(1, Math.min(limit, 12));
  const buckets = new Map<AnnualCxQuoteMetric, AnnualCxQuote[]>();
  const unassigned: AnnualCxQuote[] = [];
  for (const quote of quotes) {
    if (quote.metric) {
      const bucket = buckets.get(quote.metric) ?? [];
      if (bucket.length < PER_METRIC_LIMIT) bucket.push(quote);
      buckets.set(quote.metric, bucket);
    } else {
      unassigned.push(quote);
    }
  }

  const selected: AnnualCxQuote[] = [];
  for (let round = 0; round < PER_METRIC_LIMIT; round += 1) {
    for (const metric of METRIC_ORDER) {
      const quote = buckets.get(metric)?.[round];
      if (quote) selected.push(quote);
    }
  }
  for (const quote of unassigned) {
    if (selected.length >= cap) break;
    selected.push(quote);
  }
  return selected.slice(0, cap);
}

export async function listPublishableQuotes(
  limit = 6,
  ctx?: AuthzContext
): Promise<AnnualCxQuote[]> {
  const scopeWhere = ctx ? testimonialScopeWhere(ctx) : {};
  const rows = await db.testimonial.findMany({
    where: { AND: [{ status: "published" }, scopeWhere] },
    orderBy: [{ publishedAt: "desc" }, { submittedAt: "desc" }],
    take: 24,
    include: {
      response: {
        select: {
          csatScore: true,
          cesScore: true,
          npsScore: true,
          answers: true,
          client: { select: { name: true, company: true } },
        },
      },
      surveyInvite: {
        select: {
          customerName: true,
          firstName: true,
          lastName: true,
          company: true,
        },
      },
    },
  });

  const quotes: AnnualCxQuote[] = [];
  for (const row of rows) {
    const text = (row.clientText || row.aiDraft || "").trim();
    if (!text) continue;
    const name = respondentName({
      customerName: row.surveyInvite?.customerName,
      firstName: row.surveyInvite?.firstName,
      lastName: row.surveyInvite?.lastName,
      clientName: row.response.client?.name,
    });
    const company =
      row.surveyInvite?.company?.trim() ||
      row.response.client?.company?.trim() ||
      null;
    quotes.push({
      id: row.id,
      text,
      respondentName: name,
      company,
      showAttribution: Boolean(row.consentName),
      metric: quoteMetric({
        text,
        answers: row.response.answers,
        csatScore: row.response.csatScore,
        cesScore: row.response.cesScore,
        npsScore: row.response.npsScore,
      }),
    });
  }
  return selectQuotesPerMetric(quotes, limit);
}
