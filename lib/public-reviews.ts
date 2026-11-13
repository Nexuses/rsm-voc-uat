import { db } from "@/lib/db";

export const PUBLIC_REVIEW_MAX_ITEMS = 12;

export async function getPublicReviews() {
  const reviews = await db.publicReviewSnippet.findMany({
    orderBy: { completedAt: "desc" },
    take: PUBLIC_REVIEW_MAX_ITEMS,
    select: {
      completedAt: true,
      comment: true,
      respondentName: true,
      company: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
    },
  });

  return {
    limit: PUBLIC_REVIEW_MAX_ITEMS,
    count: reviews.length,
    reviews: reviews.map((review) => ({
      date: review.completedAt.toISOString(),
      comment: review.comment,
      name: review.respondentName,
      company: review.company,
      csat: review.csatScore,
      ces: review.cesScore,
      nps: review.npsScore,
    })),
  };
}
