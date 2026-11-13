import type { Metadata } from "next";
import PublicWidgetPageClient from "@/components/public/PublicWidgetPageClient";
import { RSM_BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${RSM_BRAND_NAME} — Public reviews widget`,
  description: "Recent Voice of Clients review snippets for RSM in Kuwait.",
};

export default function PublicReviewsWidgetPage() {
  return <PublicWidgetPageClient variant="reviews" />;
}
