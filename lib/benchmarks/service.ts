import { randomUUID } from "node:crypto";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import {
  BENCHMARK_METRICS,
  compareBenchmarks,
  computeInternalBenchmarks,
  quarterRange,
} from "@/lib/benchmarks/compute";
import { db } from "@/lib/db";

export const INTERNAL_BENCHMARK_SOURCE = "internal:voc-responses";
const INTERNAL_LOOKBACK_QUARTERS = 4;

export const externalBenchmarkSchema = z.object({
  dimension: z.enum(["overall", "service_line", "industry"]),
  dimensionKey: z.string().trim().max(120).default(""),
  metric: z.enum(BENCHMARK_METRICS),
  value: z.number().finite(),
  sampleSize: z.number().int().positive().optional(),
  population: z.string().trim().max(200).optional(),
  source: z.string().trim().min(3).max(200),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
}).refine((row) => row.periodEnd >= row.periodStart, {
  message: "periodEnd must not be before periodStart",
  path: ["periodEnd"],
});

export const externalBenchmarkImportSchema = z.object({
  rows: z.array(externalBenchmarkSchema).min(1).max(500),
});

export async function refreshInternalBenchmarks(now = new Date()) {
  const current = quarterRange(now);
  const since = new Date(
    Date.UTC(current.start.getUTCFullYear(), current.start.getUTCMonth() - 3 * (INTERNAL_LOOKBACK_QUARTERS - 1), 1)
  );
  const responses = await db.response.findMany({
    where: { excludedAt: null, createdAt: { gte: since, lte: now } },
    select: {
      createdAt: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      engagement: { select: { serviceLine: { select: { code: true } } } },
    },
  });
  const computed = computeInternalBenchmarks(
    responses.map((row) => ({
      submittedAt: row.createdAt,
      serviceLineCode: row.engagement?.serviceLine?.code ?? null,
      csat: row.csatScore,
      ces: row.cesScore,
      nps: row.npsScore,
    }))
  );
  for (const row of computed) {
    const where = {
      scope_dimension_dimensionKey_metric_periodStart_periodEnd_source: {
        scope: "internal",
        dimension: row.dimension,
        dimensionKey: row.dimensionKey,
        metric: row.metric,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        source: INTERNAL_BENCHMARK_SOURCE,
      },
    };
    await db.benchmark.upsert({
      where,
      create: { id: randomUUID(), scope: "internal", source: INTERNAL_BENCHMARK_SOURCE, ...row },
      update: { value: row.value, sampleSize: row.sampleSize },
    });
  }
  return { rows: computed.length };
}

export async function importExternalBenchmarks(
  input: z.infer<typeof externalBenchmarkImportSchema>,
  actorUserId: string
) {
  for (const row of input.rows) {
    await db.benchmark.upsert({
      where: {
        scope_dimension_dimensionKey_metric_periodStart_periodEnd_source: {
          scope: "external",
          dimension: row.dimension,
          dimensionKey: row.dimensionKey,
          metric: row.metric,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          source: row.source,
        },
      },
      create: { id: randomUUID(), scope: "external", ...row },
      update: { value: row.value, sampleSize: row.sampleSize ?? null, population: row.population ?? null },
    });
  }
  await writeAuditLog({
    actorType: "user",
    actorUserId,
    action: "benchmark.updated",
    resourceType: "Benchmark",
    after: {
      imported: input.rows.length,
      sources: [...new Set(input.rows.map((row) => row.source))],
    },
    source: "api",
  });
  return { imported: input.rows.length };
}

export async function getBenchmarkComparison(filter: { dimension?: string; dimensionKey?: string }) {
  const rows = await db.benchmark.findMany({
    where: {
      dimension: filter.dimension ?? "overall",
      ...(filter.dimensionKey !== undefined ? { dimensionKey: filter.dimensionKey } : {}),
    },
    orderBy: [{ periodEnd: "desc" }, { scope: "asc" }],
    take: 500,
  });
  return compareBenchmarks(rows);
}
