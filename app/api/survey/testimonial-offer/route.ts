import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  consumeSurveyRateLimit,
  validatePublicPost,
} from "@/lib/survey/request-security";
import { resolveTestimonialOfferByConversationId } from "@/lib/testimonials/offer";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

const bodySchema = z.object({
  conversationId: z.string().trim().min(8).max(200),
});

/**
 * Public poll endpoint for the survey thank-you panel. Voice completions land
 * asynchronously via the ElevenLabs webhook; the browser polls until the
 * response exists and eligibility is known. Response body never includes
 * respondent identity — only pending / ineligible / ready + testimonial URL.
 */
export async function POST(request: NextRequest) {
  const security = validatePublicPost(request);
  if (!security.ok) {
    return NextResponse.json(
      { error: security.error },
      { status: security.status, headers: noStoreHeaders }
    );
  }

  let unknownPayload: unknown;
  try {
    unknownPayload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const parsed = bodySchema.safeParse(unknownPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request" },
      { status: 400, headers: noStoreHeaders }
    );
  }

  const rateLimit = await consumeSurveyRateLimit(request, "testimonial");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "too many attempts" },
      {
        status: 429,
        headers: {
          ...noStoreHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const result = await resolveTestimonialOfferByConversationId(
      parsed.data.conversationId
    );
    if (result.status === "ready") {
      return NextResponse.json(
        {
          status: "ready",
          kind: result.ask.kind,
          url: result.ask.url,
        },
        { headers: noStoreHeaders }
      );
    }
    return NextResponse.json(
      { status: result.status },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    console.error("testimonial offer lookup failed:", error);
    return NextResponse.json(
      { status: "ineligible" },
      { status: 200, headers: noStoreHeaders }
    );
  }
}
