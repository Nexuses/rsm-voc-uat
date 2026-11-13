import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAnnualCxReportDataJson,
  metricCxFilename,
  metricHasScores,
} from "@/lib/annual-cx-report-payload";
import { resolvePeriodCxReportPlan } from "@/lib/annual-cx-report-period";
import {
  AnnualCxReportBuildError,
  renderCxReportPdfBuffer,
} from "@/lib/annual-cx-report-runner";
import { loadAnnualCxReportSource } from "@/lib/annual-cx-report-source";
import { routeErrorResponse } from "@/lib/api/errors";
import { requireAnyPermission } from "@/lib/auth";
import { loadAuthzContext } from "@/lib/authz";
import { emptyDashboardOrgFilters } from "@/lib/dashboard-report-filters";

export const runtime = "nodejs";
/** Playwright PDF build can exceed default serverless limits on cold hosts. */
export const maxDuration = 120;

const bodySchema = z.object({
  metric: z.enum(["csat", "nps", "ces"]),
  window: z.enum(["all", "90d", "year"]).default("all"),
  department: z.string().optional().default(""),
  partner: z.string().optional().default(""),
  service: z.string().optional().default(""),
  businessManager: z.string().optional().default(""),
  jobManager: z.string().optional().default(""),
  dateFrom: z.string().optional().default(""),
  dateTo: z.string().optional().default(""),
  company: z.string().optional().default(""),
  respondent: z.string().optional().default(""),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAnyPermission([
      "dashboard.overview",
      "dashboard.reports",
    ]);
    const ctx = await loadAuthzContext(session);

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid metric report request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const org = {
      ...emptyDashboardOrgFilters,
      department: parsed.data.department,
      partner: parsed.data.partner,
      service: parsed.data.service,
      businessManager: parsed.data.businessManager,
      jobManager: parsed.data.jobManager,
      dateFrom: parsed.data.dateFrom,
      dateTo: parsed.data.dateTo,
      company: parsed.data.company,
      respondent: parsed.data.respondent,
    };

    const plan = resolvePeriodCxReportPlan(parsed.data.window, org);
    const source = await loadAnnualCxReportSource(ctx);
    const { data } = buildAnnualCxReportDataJson({
      items: source.items,
      invites: source.invites,
      window: parsed.data.window,
      org,
      quotes: source.quotes,
      narrative: null,
      plan,
    });

    if (!metricHasScores(data, parsed.data.metric)) {
      return NextResponse.json(
        {
          error: `No ${parsed.data.metric.toUpperCase()} scores in the selected reporting period.`,
        },
        { status: 422 }
      );
    }

    const pdf = await renderCxReportPdfBuffer(data, parsed.data.metric);
    const filename = metricCxFilename(parsed.data.metric, plan);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AnnualCxReportBuildError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    try {
      return routeErrorResponse(error);
    } catch {
      console.error("Metric CX PDF failed", error);
      return NextResponse.json(
        { error: "Unable to generate the metric CX report." },
        { status: 500 }
      );
    }
  }
}
