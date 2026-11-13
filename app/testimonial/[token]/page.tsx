import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadTestimonialReview } from "@/lib/testimonials/review";
import TestimonialReviewExperience from "./TestimonialReviewExperience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Testimonial · RSM in Kuwait",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function TestimonialReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token?.trim()) notFound();

  const review = await loadTestimonialReview(token);
  if (!review) notFound();

  return (
    <TestimonialReviewExperience
      token={review.token}
      kind={review.kind}
      status={review.status}
      locked={review.locked}
      language={review.language}
      greetingName={review.greetingName}
      initialText={review.initialText}
      videoUrl={review.videoUrl}
      consentName={review.consentName}
      consentWebsite={review.consentWebsite}
      consentSocial={review.consentSocial}
    />
  );
}
