import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAnnualCxReportDataJson,
  metricHasScores,
  periodCxFilename,
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
        { error: "Invalid period report request", details: parsed.error.flatten() },
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
      quotes: [],
      narrative: null,
      plan,
    });

    if (data.responses.received === 0) {
      return NextResponse.json(
        { error: "No responses in the selected reporting period." },
        { status: 422 }
      );
    }

    /*
     * The custom-period deck is four pages covering CSAT, NPS and CES, so it
     * needs at least one score for every measure. A narrow period can hold
     * responses but no CES (or CSAT/NPS) ratings, which used to reach the
     * Python builder and die inside its metrics() ratios, surfacing a raw
     * traceback in the dashboard. Say which measure is empty instead.
     */
    const emptyMeasures = (["csat", "nps", "ces"] as const)
      .filter((measure) => !metricHasScores(data, measure))
      .map((measure) => measure.toUpperCase());

    if (emptyMeasures.length) {
      return NextResponse.json(
        {
          error: `No ${emptyMeasures.join(" or ")} scores in the selected reporting period. The CX report covers CSAT, NPS and CES together — adjust the period or filters so all three have responses.`,
        },
        { status: 422 }
      );
    }

    const pdf = await renderCxReportPdfBuffer(data, "cx");
    const filename = periodCxFilename(plan);

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
      console.error("Period CX PDF failed", error);
      return NextResponse.json(
        { error: "Unable to generate the period CX report." },
        { status: 500 }
      );
    }
  }
}
