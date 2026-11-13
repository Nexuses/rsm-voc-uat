import type { Metadata } from "next";
import PublicVocReport from "@/components/reports/PublicVocReport";
import { RSM_BRAND_NAME, RSM_LOGO_URL } from "@/lib/brand";

const description = `Public client experience statistics for ${RSM_BRAND_NAME}, including CSAT, CES, NPS, trends, and anonymized themes.`;

export const metadata: Metadata = {
  title: `${RSM_BRAND_NAME} | Client Experience Report`,
  description,
  openGraph: {
    title: `${RSM_BRAND_NAME} | Client Experience Report`,
    description,
    images: [{ url: RSM_LOGO_URL, alt: RSM_BRAND_NAME, width: 132, height: 44 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${RSM_BRAND_NAME} | Client Experience Report`,
    description,
    images: [RSM_LOGO_URL],
  },
};

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-[#f6f6f6] px-3 py-4 sm:px-7 sm:py-7">
      <PublicVocReport />
    </main>
  );
}
