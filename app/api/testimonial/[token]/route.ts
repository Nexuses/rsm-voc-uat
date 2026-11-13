import { NextRequest, NextResponse } from "next/server";
import {
  consumeSurveyRateLimit,
  validatePublicPost,
} from "@/lib/survey/request-security";
import {
  submitTestimonialReview,
  testimonialSubmitSchema,
} from "@/lib/testimonials/submit";

export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store" };

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const security = validatePublicPost(request);
  if (!security.ok) {
    return NextResponse.json(
      { error: security.error },
      { status: security.status, headers: noStoreHeaders }
    );
  }

  const rateLimit = await consumeSurveyRateLimit(request, "testimonial");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "too many requests" },
      {
        status: 429,
        headers: {
          ...noStoreHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const { token } = await context.params;
  if (!token || token.length < 16 || token.length > 128) {
    return NextResponse.json(
      { error: "Testimonial not found" },
      { status: 404, headers: noStoreHeaders }
    );
  }

  const parsed = testimonialSubmitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const videoIssue = parsed.error.issues.find((issue) => issue.path[0] === "videoUrl");
    return NextResponse.json(
      { error: videoIssue?.message ?? "Check the testimonial form and try again" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const result = await submitTestimonialReview(token, parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: noStoreHeaders }
    );
  }
  return NextResponse.json({ ok: true, status: result.status }, { headers: noStoreHeaders });
}
