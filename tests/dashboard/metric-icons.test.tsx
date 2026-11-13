import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricTitle } from "@/components/dashboard/MetricIcons";
import { metricLabel } from "@/lib/metric-labels";

describe("metric icons", () => {
  it("renders metric titles with brand logo images and plain labels", () => {
    const { container } = render(<MetricTitle kind="csat" />);

    expect(metricLabel("csat")).toBe("CSAT");
    const logo = container.querySelector('img[src="/metrics/csat.png"]');
    expect(logo).toBeTruthy();
    expect(container.querySelector('[data-kind="csat"]')).toBeTruthy();
    expect(container.textContent).toBe("CSAT");
  });

  it("maps each metric kind to its logo asset", () => {
    for (const kind of ["csat", "nps", "ces"] as const) {
      const { container } = render(<MetricTitle kind={kind} />);
      expect(
        container.querySelector(`img[src="/metrics/${kind}.png"]`)
      ).toBeTruthy();
    }
  });
});
