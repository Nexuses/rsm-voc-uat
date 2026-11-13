import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import MetricScaleRating from "@/components/survey/MetricScaleRating";
import SurveyRatingScale from "@/components/survey/SurveyRatingScale";
import { getVoiceLocale } from "@/lib/survey/voice-locale";

afterEach(cleanup);

const copy = getVoiceLocale("en").typed;
const arCopy = getVoiceLocale("ar").typed;

const npsLabels = copy.npsRatingLabels;
const csatLabels = copy.csatRatingLabels;
const cesLabels = copy.cesRatingLabels;

describe("static rating scale", () => {
  it("shows every score as a tile for NPS, CES and CSAT", () => {
    const { unmount } = render(
      <SurveyRatingScale
        metric="nps"
        name="npsRating"
        min={0}
        max={10}
        value={null}
        labels={npsLabels}
        ariaLabel="NPS question"
        copy={copy}
        onSelect={() => {}}
      />
    );
    expect(screen.getAllByRole("radio")).toHaveLength(11);
    expect(screen.getByLabelText("Detractors — 0 / 10")).toBeTruthy();
    expect(screen.getByLabelText("Promoters — 10 / 10")).toBeTruthy();
    unmount();

    const ces = render(
      <SurveyRatingScale
        metric="ces"
        name="cesRating"
        min={1}
        max={7}
        value={null}
        labels={cesLabels}
        ariaLabel="CES question"
        copy={copy}
        onSelect={() => {}}
      />
    );
    expect(screen.getAllByRole("radio")).toHaveLength(7);
    expect(screen.getByLabelText("Very Easy — 6 / 7")).toBeTruthy();
    ces.unmount();

    render(
      <SurveyRatingScale
        metric="csat"
        name="csatRating"
        min={1}
        max={5}
        value={null}
        labels={csatLabels}
        ariaLabel="CSAT question"
        copy={copy}
        onSelect={() => {}}
      />
    );
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByLabelText("Very Satisfied — 5 / 5")).toBeTruthy();
  });

  it("keeps every score in one radio group so only one can be chosen", () => {
    const { container } = render(
      <SurveyRatingScale
        metric="nps"
        name="npsRating"
        min={0}
        max={10}
        value={null}
        labels={npsLabels}
        ariaLabel="NPS question"
        copy={copy}
        onSelect={() => {}}
      />
    );
    const radios = [...container.querySelectorAll<HTMLInputElement>("input")];
    expect(new Set(radios.map((radio) => radio.name))).toEqual(
      new Set(["npsRating"])
    );
    expect(radios.every((radio) => radio.type === "radio")).toBe(true);
  });

  it("reports the chosen score to the form", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SurveyRatingScale
        metric="nps"
        name="npsRating"
        min={0}
        max={10}
        value={null}
        labels={npsLabels}
        ariaLabel="NPS question"
        copy={copy}
        onSelect={onSelect}
      />
    );
    await user.click(screen.getByLabelText("Promoters — 9 / 10"));
    expect(onSelect).toHaveBeenCalledWith(9);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("marks the stored score as checked when revisiting a step", () => {
    render(
      <SurveyRatingScale
        metric="csat"
        name="csatRating"
        min={1}
        max={5}
        value={4}
        labels={csatLabels}
        ariaLabel="CSAT question"
        copy={copy}
        onSelect={() => {}}
      />
    );
    expect(screen.getByLabelText("Satisfied — 4 / 5")).toBeChecked();
    expect(screen.getByLabelText("Very Satisfied — 5 / 5")).not.toBeChecked();
  });

  it("names the band strip and its ranges for each metric", () => {
    const { container } = render(
      <SurveyRatingScale
        metric="nps"
        name="npsRating"
        min={0}
        max={10}
        value={null}
        labels={npsLabels}
        ariaLabel="NPS question"
        copy={copy}
        onSelect={() => {}}
      />
    );
    const regions = [...container.querySelectorAll("[data-band][class*='ratingScaleRegion']")]
      .map((node) => node.textContent?.trim())
      .filter(Boolean);
    expect(regions).toEqual([
      "Detractors (0–6)",
      "Neutral (7–8)",
      "Promoters (9–10)",
    ]);
  });

  it("uses Arabic band labels", () => {
    const { container } = render(
      <SurveyRatingScale
        metric="nps"
        name="npsRating"
        min={0}
        max={10}
        value={null}
        labels={arCopy.npsRatingLabels}
        ariaLabel="سؤال"
        copy={arCopy}
        onSelect={() => {}}
      />
    );
    const text = container.textContent ?? "";
    expect(text).toContain(arCopy.npsDetractors);
    expect(text).toContain(arCopy.npsPromoters);
    expect(
      screen.getByLabelText(`${arCopy.npsRatingLabels[10]} — 10 / 10`)
    ).toBeTruthy();
  });

  it("dims the bands that were not chosen", () => {
    const { container } = render(
      <MetricScaleRating
        metric="nps"
        name="npsRating"
        min={0}
        max={10}
        value={9}
        labels={npsLabels}
        bands={[
          { id: "low", label: "Detractors", range: "0–6", span: 7 },
          { id: "mid", label: "Neutral", range: "7–8", span: 2 },
          { id: "high", label: "Promoters", range: "9–10", span: 2 },
        ]}
        ariaLabel="NPS question"
        onSelect={() => {}}
      />
    );
    const fieldset = container.querySelector("fieldset");
    expect(fieldset?.getAttribute("data-rated")).toBe("true");
    const active = [...container.querySelectorAll("[data-band]")].filter(
      (node) => node.getAttribute("data-active") === "true"
    );
    expect(active).toHaveLength(1);
    expect(active[0].textContent).toContain("Promoters");
  });
});
