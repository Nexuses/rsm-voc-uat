import { NextResponse } from "next/server";
import {
  databaseUnavailableResponse,
  isTransientPrismaError,
} from "@/lib/prisma-errors";
import { getPublicReviews } from "@/lib/public-reviews";

export const publicReviewHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
};

export async function GET() {
  try {
    return NextResponse.json(await getPublicReviews(), {
      headers: publicReviewHeaders,
    });
  } catch (error) {
    if (isTransientPrismaError(error)) {
      return databaseUnavailableResponse();
    }
    throw error;
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: publicReviewHeaders,
  });
}
