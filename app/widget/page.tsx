import type { Metadata } from "next";
import PublicWidgetPageClient from "@/components/public/PublicWidgetPageClient";
import { RSM_BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${RSM_BRAND_NAME} — Public metrics widget`,
  description: "Public CSAT, CES, and NPS metrics for RSM in Kuwait.",
};

type PageProps = {
  searchParams?: Promise<{ metric?: string }>;
};

export default async function PublicMetricsWidgetPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const metric =
    params.metric === "csat" ||
    params.metric === "ces" ||
    params.metric === "nps"
      ? params.metric
      : "all";

  return <PublicWidgetPageClient variant="metrics" metric={metric} />;
}
