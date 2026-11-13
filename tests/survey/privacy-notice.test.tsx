import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import PrivacyNotice, { RSM_PRIVACY_NOTICE_URL } from "@/components/PrivacyNotice";
import SurveyShell from "@/components/survey/SurveyShell";

afterEach(cleanup);

describe("privacy notice", () => {
  it("links to the official RSM Kuwait privacy notice", () => {
    render(<PrivacyNotice />);
    const link = screen.getByRole("link", { name: "Read our Privacy Notice" });
    expect(link.getAttribute("href")).toBe(RSM_PRIVACY_NOTICE_URL);
    expect(RSM_PRIVACY_NOTICE_URL).toBe(
      "https://www.rsm.global/kuwait/privacy-notice"
    );
  });

  it("opens the notice in a new tab without leaking the opener", () => {
    render(<PrivacyNotice />);
    const link = screen.getByRole("link", { name: "Read our Privacy Notice" });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("keeps the confidentiality, processor and audience facts in one line of copy", () => {
    const { container } = render(<PrivacyNotice />);
    const text = container.textContent ?? "";
    expect(text).toContain("Confidential");
    expect(text).toContain("Voice audio goes to our provider");
    expect(text).toContain("Only authorised RSM Kuwait CX team sees your feedback");
    // One statement, not two separate privacy lines.
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("uses one centred statement in Arabic and switches direction", () => {
    const { container } = render(<PrivacyNotice language="ar" />);
    expect(screen.getByRole("link", { name: "اقرأوا إشعار الخصوصية" })).toBeTruthy();
    expect(container.querySelectorAll("aside")).toHaveLength(1);
    const aside = container.querySelector("aside");
    expect(aside?.getAttribute("dir")).toBe("rtl");
    expect(aside?.textContent).toContain("سري");
    expect(aside?.textContent).toContain("RSM الكويت");
  });

  it("is the only privacy statement inside the survey shell", () => {
    const { container } = render(
      <SurveyShell>
        <div>content</div>
      </SurveyShell>
    );
    expect(container.querySelectorAll("aside")).toHaveLength(1);
    expect(
      container.querySelectorAll('a[href="https://www.rsm.global/kuwait/privacy-notice"]')
    ).toHaveLength(1);
  });
});
