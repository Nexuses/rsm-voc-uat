import { describe, expect, it } from "vitest";
import {
  buildReviewsWidgetEmbedCode,
  buildReviewsWidgetPublicUrl,
  buildWidgetEmbedCode,
  buildWidgetPublicUrl,
} from "@/lib/widget-embed";

describe("widget embed snippet", () => {
  it("builds the public script tag for each metric mode", () => {
    const snippet = buildWidgetEmbedCode(
      "https://rsm-voc-platform.vercel.app",
      "all"
    );

    expect(snippet).toContain('<div id="rsm-voc-metrics"></div>');
    expect(snippet).toContain(
      'src="https://rsm-voc-platform.vercel.app/widget.js"'
    );
    expect(snippet).toContain(
      'data-api="https://rsm-voc-platform.vercel.app/api/public/metrics"'
    );
    expect(snippet).toContain('data-metric="all"');
    expect(snippet).toContain('data-target="rsm-voc-metrics"');
  });

  it("supports single-metric embeds", () => {
    expect(buildWidgetEmbedCode("https://example.test", "nps")).toContain(
      'data-metric="nps"'
    );
  });

  it("builds public page links for metrics and reviews widgets", () => {
    expect(buildWidgetPublicUrl("https://example.test")).toBe(
      "https://example.test/widget"
    );
    expect(buildWidgetPublicUrl("https://example.test", "csat")).toBe(
      "https://example.test/widget?metric=csat"
    );
    expect(buildReviewsWidgetPublicUrl("https://example.test/")).toBe(
      "https://example.test/widget/reviews"
    );
  });

  it("builds the recent reviews showcase embed", () => {
    const snippet = buildReviewsWidgetEmbedCode(
      "https://rsm-voc-platform.vercel.app"
    );

    expect(snippet).toContain('<div id="rsm-voc-reviews"></div>');
    expect(snippet).toContain(
      'src="https://rsm-voc-platform.vercel.app/widget-reviews.js"'
    );
    expect(snippet).toContain(
      'data-api="https://rsm-voc-platform.vercel.app/api/public/reviews"'
    );
    expect(snippet).toContain('data-target="rsm-voc-reviews"');
  });
});
