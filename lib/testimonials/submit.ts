import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { isTestimonialLocked } from "@/lib/testimonials/review";

const videoUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a video link starting with http:// or https://");

export const testimonialSubmitSchema = z.object({
  action: z.enum(["submit", "decline"]),
  clientText: z.string().trim().max(2000).optional().default(""),
  videoUrl: videoUrlSchema.optional().default(""),
  consentName: z.boolean().optional(),
  consentWebsite: z.boolean().optional().default(false),
  consentSocial: z.boolean().optional().default(false),
  approved: z.boolean().optional().default(false),
});

export type TestimonialSubmitInput = z.infer<typeof testimonialSubmitSchema>;

export type TestimonialSubmitResult =
  | { ok: true; status: "submitted" | "declined" }
  | { ok: false; status: 404 | 409 | 400; error: string };

export async function submitTestimonialReview(
  token: string,
  input: TestimonialSubmitInput
): Promise<TestimonialSubmitResult> {
  const row = await db.testimonial.findUnique({
    where: { token },
    select: { id: true, status: true },
  });
  if (!row) return { ok: false, status: 404, error: "Testimonial not found" };
  if (isTestimonialLocked(row.status)) {
    return { ok: false, status: 409, error: "This testimonial can no longer be changed" };
  }

  if (input.action === "decline") {
    await db.testimonial.update({
      where: { id: row.id },
      data: { status: "declined" },
    });
    await writeAuditLog({
      actorType: "system",
      action: "testimonial.declined",
      resourceType: "Testimonial",
      resourceId: row.id,
      source: "api",
    });
    return { ok: true, status: "declined" };
  }

  if (!input.approved) {
    return { ok: false, status: 400, error: "Approval is required" };
  }
  if (typeof input.consentName !== "boolean") {
    return { ok: false, status: 400, error: "Choose whether your name may be used" };
  }
  const clientText = input.clientText.trim();
  const videoUrl = input.videoUrl.trim();
  if (!clientText && !videoUrl) {
    return { ok: false, status: 400, error: "Add a written testimonial or a video link" };
  }

  const now = new Date();
  await db.testimonial.update({
    where: { id: row.id },
    data: {
      status: "submitted",
      clientText: clientText || null,
      videoUrl: videoUrl || null,
      consentName: input.consentName,
      consentWebsite: input.consentWebsite,
      consentSocial: input.consentSocial,
      consentedAt: now,
      submittedAt: now,
    },
  });
  await writeAuditLog({
    actorType: "system",
    action: "testimonial.submitted",
    resourceType: "Testimonial",
    resourceId: row.id,
    metadata: {
      consentName: input.consentName,
      consentWebsite: input.consentWebsite,
      consentSocial: input.consentSocial,
    },
    source: "api",
  });
  return { ok: true, status: "submitted" };
}
