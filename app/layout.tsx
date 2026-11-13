import type { Metadata } from "next";
import { RSM_BRAND_NAME, RSM_LOGO_URL } from "@/lib/brand";
import "./prelo.css";
import "./globals.css";

const surveyTitle = "Post-Engagement Satisfaction Survey | Voice of Clients";
const surveyDescription =
  "We would value your views on your recent experience with RSM in Kuwait.";
const surveyThumbnail = RSM_LOGO_URL;

export const metadata: Metadata = {
  title: surveyTitle,
  description: surveyDescription,
  icons: {
    icon: [{ url: RSM_LOGO_URL, type: "image/png" }],
    apple: [{ url: RSM_LOGO_URL, type: "image/png" }],
  },
  openGraph: {
    title: surveyTitle,
    description: surveyDescription,
    images: [{ url: surveyThumbnail, alt: surveyTitle }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: surveyTitle,
    description: surveyDescription,
    images: [surveyThumbnail],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
