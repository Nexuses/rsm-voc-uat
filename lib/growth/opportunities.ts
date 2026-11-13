import { db } from "@/lib/db";
import { calculateCsat, calculateNps } from "@/lib/survey/metrics";

export type ServiceLineRef = { id: string; code: string; name: string };

/**
 * Coverage gaps only: service lines the account has no engagement in, plus the
 * account's own feedback signals. No ranking or propensity policy is applied.
 */
export function serviceLineCoverageGaps(input: {
  allServiceLines: ServiceLineRef[];
  engagedServiceLineIds: string[];
}) {
  const engaged = new Set(input.engagedServiceLineIds);
  return {
    covered: input.allServiceLines.filter((line) => engaged.has(line.id)),
    gaps: input.allServiceLines.filter((line) => !engaged.has(line.id)),
  };
}

export function feedbackSignals(responses: Array<{ csatScore: number | null; npsScore: number | null }>) {
  const csat = responses.map((r) => r.csatScore).filter((v): v is number => v !== null);
  const nps = responses.map((r) => r.npsScore).filter((v): v is number => v !== null);
  const npsResult = calculateNps(nps);
  return {
    responseCount: responses.length,
    csatFavorablePercent: csat.length ? calculateCsat(csat).favorablePercent : null,
    npsScore: npsResult.score,
    promoterCount: nps.filter((v) => v >= 9).length,
  };
}

export async function getAccountOpportunities(accountId: string) {
  const account = await db.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      organizationId: true,
      engagements: { select: { serviceLineId: true } },
    },
  });
  if (!account) return null;
  const [serviceLines, responses] = await Promise.all([
    db.serviceLine.findMany({
      where: { organizationId: account.organizationId, active: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.response.findMany({
      where: { accountId, excludedAt: null },
      select: { csatScore: true, npsScore: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return {
    accountId,
    ...serviceLineCoverageGaps({
      allServiceLines: serviceLines,
      engagedServiceLineIds: account.engagements
        .map((e) => e.serviceLineId)
        .filter((v): v is string => Boolean(v)),
    }),
    signals: feedbackSignals(responses),
  };
}
