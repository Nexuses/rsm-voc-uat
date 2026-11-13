import type { ComponentProps } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import TestimonialReviewExperience from "@/app/testimonial/[token]/TestimonialReviewExperience";

afterEach(cleanup);

function renderExperience(
  overrides: Partial<ComponentProps<typeof TestimonialReviewExperience>> = {}
) {
  const props = {
    token: "token-123",
    kind: "draft_approval" as const,
    status: "requested",
    locked: false,
    language: "ar" as const,
    greetingName: "Sam",
    initialText: "خدمة ممتازة وفريق متعاون.",
    videoUrl: "",
    consentName: null,
    consentWebsite: false,
    consentSocial: false,
    ...overrides,
  };
  return { ...render(<TestimonialReviewExperience {...props} />), props };
}

describe("testimonial review experience", () => {
  it("renders in Arabic RTL by default for an Arabic respondent", () => {
    const { container } = renderExperience();
    const main = container.querySelector("main");

    expect(main?.getAttribute("dir")).toBe("rtl");
    expect(main?.getAttribute("lang")).toBe("ar");
    expect(
      screen.getByRole("heading", { level: 1, name: "مشاركة شهادة" })
    ).toBeTruthy();
    expect(screen.getByText(/مرحباً Sam،/)).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "الشهادة المكتوبة" })).toHaveValue(
      "خدمة ممتازة وفريق متعاون."
    );
    expect(
      screen.getByRole("radio", { name: "نعم، يمكنكم استخدام اسمي" })
    ).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { name: "موقع RSM الكويت" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "إرسال الشهادة" })
    ).toBeTruthy();
  });

  it("does not fall back to English copy in Arabic", () => {
    renderExperience();
    for (const english of [
      "Share a testimonial",
      "Written testimonial",
      "Submit testimonial",
      "May we use your name?",
      "Where may we publish it?",
    ]) {
      expect(screen.queryByText(english)).toBeNull();
    }
  });

  it("switches language without losing the drafted text", async () => {
    const user = userEvent.setup();
    const { container } = renderExperience({ language: "en" });
    const main = container.querySelector("main");

    expect(main?.getAttribute("dir")).toBe("ltr");
    expect(
      screen.getByRole("heading", { level: 1, name: "Share a testimonial" })
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "العربية" }));

    expect(container.querySelector("main")?.getAttribute("dir")).toBe("rtl");
    expect(
      screen.getByRole("heading", { level: 1, name: "مشاركة شهادة" })
    ).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "الشهادة المكتوبة" })).toHaveValue(
      "خدمة ممتازة وفريق متعاون."
    );
  });

  it("keeps the closed state localized", () => {
    renderExperience({ locked: true, status: "published" });
    expect(
      screen.getByRole("heading", { level: 2, name: "تم نشر الشهادة" })
    ).toBeTruthy();
    expect(
      screen.getByText("تم نشر هذه الشهادة ولم يعد بالإمكان تعديلها.")
    ).toBeTruthy();
  });

  it("does not fetch on load", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderExperience();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
