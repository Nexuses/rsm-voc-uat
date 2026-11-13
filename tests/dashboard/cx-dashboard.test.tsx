import type { ReactElement } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import DashboardResponses from "@/components/dashboard/DashboardResponses";
import { DashboardInsightsProvider } from "@/components/dashboard/DashboardInsightsProvider";
import PublicWidgetEmbed from "@/components/dashboard/PublicWidgetEmbed";
import { SURVEY_QUESTIONS, SURVEY_VERSION } from "@/lib/survey/constants";

const mockInsights = [
  {
    responseId: "response-1",
    conversationId: "typed_123",
    source: "typed",
    language: "en",
    submittedAt: "2026-06-12T10:05:00.000Z",
    client: {
      name: "Noor Al-Sabah",
      company: "Example Co",
      designation: "Finance Director",
      tier: null,
    },
    surveyVersion: SURVEY_VERSION,
    metrics: { csat: 5, ces: 6, nps: 10 },
    avgRating: 4,
    sentiment: null,
    summary: null,
    keyDrivers: [],
    riskSignals: [],
    suggestedReply: {},
    nextSteps: [],
    answers: [
      {
        questionNumber: 1,
        question: SURVEY_QUESTIONS[0].question,
        metric: "csat",
        scaleMin: 1,
        scaleMax: 5,
        rating: 5,
        comments: "Clear communication.",
        method: "typed",
      },
      {
        questionNumber: 2,
        question: SURVEY_QUESTIONS[1].question,
        metric: "ces",
        scaleMin: 1,
        scaleMax: 7,
        rating: 6,
        comments: "Easy to work with.",
        method: "typed",
      },
      {
        questionNumber: 3,
        question: SURVEY_QUESTIONS[2].question,
        metric: "nps",
        scaleMin: 0,
        scaleMax: 10,
        rating: 10,
        comments: "Would recommend.",
        method: "typed",
      },
    ],
    department: "ASSURANCE",
    partner: "Sriram Gopalakrishnan",
  },
  {
    responseId: "response-2",
    conversationId: "voice_456",
    source: "voice",
    language: "en",
    submittedAt: "2026-06-12T11:05:00.000Z",
    client: {
      name: "Fahad Al-Ahmad",
      company: "Kuwait Trading",
      designation: "COO",
      tier: null,
    },
    surveyVersion: SURVEY_VERSION,
    metrics: { csat: 1, ces: 3, nps: 6 },
    avgRating: 1,
    sentiment: "negative",
    summary: "The client experienced a delayed follow-up.",
    keyDrivers: ["Follow-up"],
    riskSignals: ["Retention risk"],
    suggestedReply: {},
    nextSteps: ["Contact the client"],
    answers: [
      {
        questionNumber: 1,
        question: SURVEY_QUESTIONS[0].question,
        metric: "csat",
        scaleMin: 1,
        scaleMax: 5,
        rating: 1,
        comments: "Follow-up was delayed.",
        method: "voice",
      },
      {
        questionNumber: 2,
        question: SURVEY_QUESTIONS[1].question,
        metric: "ces",
        scaleMin: 1,
        scaleMax: 7,
        rating: 3,
        comments: "Several handoffs.",
        method: "voice",
      },
      {
        questionNumber: 3,
        question: SURVEY_QUESTIONS[2].question,
        metric: "nps",
        scaleMin: 0,
        scaleMax: 10,
        rating: 6,
        comments: "Not yet.",
        method: "voice",
      },
    ],
    department: "TAX",
    partner: "Tuhin Chaturvedi",
  },
];

function renderDashboard(ui: ReactElement) {
  return render(<DashboardInsightsProvider>{ui}</DashboardInsightsProvider>);
}

function mockDashboardFetch(insights = mockInsights) {
  return vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/survey/invite-stats")) {
      return Promise.resolve(
        new Response(JSON.stringify({ invites: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(insights), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  });
}

describe("CX dashboard", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.stubGlobal("fetch", mockDashboardFetch());
  });

  it("fetches insights once for the shared dashboard cache", async () => {
    const fetchMock = mockDashboardFetch();
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderDashboard(<DashboardOverview />);
    await screen.findByLabelText("CX metrics");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    rerender(
      <DashboardInsightsProvider>
        <DashboardResponses />
      </DashboardInsightsProvider>
    );
    await screen.findByText("Noor Al-Sabah");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows compact KPI panels on the overview page", async () => {
    renderDashboard(<DashboardOverview />);

    const metrics = await screen.findByLabelText("CX metrics");
    expect(
      screen.getByRole("heading", { name: /performance indicators/i })
    ).toBeVisible();
    expect(within(metrics).getByText("Surveys sent")).toBeVisible();
    expect(within(metrics).getByText("Invitation emails in period")).toBeVisible();
    expect(within(metrics).getByText("Responses received")).toBeVisible();
    expect(within(metrics).getByText("Response rate")).toBeVisible();
    expect(within(metrics).getByText("0 opened · 0 started")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: /response breakdown/i })
    ).toBeVisible();
    expect(
      within(metrics).getByLabelText(/CSAT response breakdown by rating group/i)
    ).toBeVisible();
    expect(
      within(metrics).getByLabelText(/NPS response breakdown by rating group/i)
    ).toBeVisible();
    expect(
      within(metrics).getByLabelText(/CES response breakdown by rating group/i)
    ).toBeVisible();
    expect(within(metrics).getByLabelText("CSAT 50% favorable")).toBeVisible();
    expect(within(metrics).getByLabelText("NPS score 0")).toBeVisible();
    expect(within(metrics).getByText("NPS score")).toBeVisible();
    expect(
      within(metrics).getByText("50% promoters · 50% detractors · 2 ratings")
    ).toBeVisible();
    expect(
      within(metrics).getByLabelText("CES average 4.5 out of 7")
    ).toBeVisible();
    expect(within(metrics).getByText("4.5/7")).toBeVisible();
    expect(within(metrics).getByText("Avg ease score")).toBeVisible();
    const reportLinks = within(metrics).getAllByRole("link", {
      name: /see full report/i,
    });
    expect(reportLinks).toHaveLength(3);
    expect(reportLinks[0]).toHaveAttribute("href", "/dashboard/reports/csat");
    expect(reportLinks[1]).toHaveAttribute("href", "/dashboard/reports/nps");
    expect(reportLinks[2]).toHaveAttribute("href", "/dashboard/reports/ces");
    expect(screen.getByText("All time")).toBeVisible();
  });

  it("filters overview metrics by department", async () => {
    const user = userEvent.setup();
    renderDashboard(<DashboardOverview />);

    const metrics = await screen.findByLabelText("CX metrics");
    expect(within(metrics).getByLabelText("CSAT 50% favorable")).toBeVisible();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /department/i }),
      "ASSURANCE"
    );

    expect(
      within(metrics).queryByLabelText("CSAT 50% favorable")
    ).not.toBeInTheDocument();
    expect(within(metrics).getByLabelText("CSAT 100% favorable")).toBeVisible();
  });

  it("shows identity and all three metric values in the response ledger", async () => {
    const user = userEvent.setup();
    renderDashboard(<DashboardResponses />);

    expect((await screen.findAllByText("Noor Al-Sabah"))[0]).toBeVisible();
    expect(screen.getAllByText("Example Co")[0]).toBeVisible();
    expect(screen.getByText("Finance Director")).toBeVisible();
    expect(screen.queryByText("Clear communication.")).not.toBeInTheDocument();

    const table = screen.getByRole("table", {
      name: /survey responses for noor/i,
    });
    const noorRow = within(table).getByRole("row", { name: /noor al-sabah/i });
    const commentTrigger = within(noorRow).getByRole("button", {
      name: /3 comments\. hover or click to read survey comments/i,
    });
    await user.click(commentTrigger);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Clear communication."
    );

    expect(within(table).getByText("5/5")).toBeVisible();
    expect(within(table).getByText("6/7")).toBeVisible();
    expect(within(table).getByText("10/10")).toBeVisible();
    expect(table).toBeVisible();
  });

  it("filters responses by CSAT mood on the responses page", async () => {
    const user = userEvent.setup();
    renderDashboard(<DashboardResponses />);

    await screen.findAllByText("Noor Al-Sabah");

    await user.click(
      screen.getByRole("button", { name: /show dissatisfied responses/i })
    );

    const table = screen.getByRole("table", {
      name: /survey responses for fahad/i,
    });
    expect(within(table).getByText("Fahad Al-Ahmad")).toBeVisible();
    expect(within(table).queryByText("Noor Al-Sabah")).not.toBeInTheDocument();
  });

  it("can list responses in recency order instead of client groups", async () => {
    const user = userEvent.setup();
    renderDashboard(<DashboardResponses />);

    await screen.findAllByText("Noor Al-Sabah");
    expect(
      screen.getByRole("table", { name: /survey responses for noor/i })
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: /by recency/i }));

    const table = screen.getByRole("table", {
      name: /survey responses by recency/i,
    });
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Fahad Al-Ahmad");
    expect(rows[2]).toHaveTextContent("Noor Al-Sabah");
    expect(
      screen.queryByRole("table", { name: /survey responses for noor/i })
    ).not.toBeInTheDocument();
  });

  it("shows the public widget preview section with copyable embed code", async () => {
    render(
      <>
        <header>
          <h1>Website widget</h1>
        </header>
        <PublicWidgetEmbed />
      </>
    );

    expect(await screen.findByRole("region", { name: /public metrics widget/i }))
      .toBeVisible();
    expect(screen.getByRole("heading", { name: /website widget/i })).toBeVisible();
    expect(screen.getByText(/widget\.js/)).toBeVisible();
    expect(screen.getByRole("button", { name: /copy code/i })).toBeVisible();
  });

  it("shows long comments in a hover popup instead of inline", async () => {
    const longComment = `${"Very supportive team. ".repeat(12)}End.`;
    vi.stubGlobal(
      "fetch",
      mockDashboardFetch([
        {
          responseId: "response-long",
          conversationId: "typed_long",
          source: "typed",
          language: "en",
          submittedAt: "2026-06-12T10:05:00.000Z",
          department: "ASSURANCE",
          partner: "Sriram Gopalakrishnan",
          client: {
            name: "Long Comment User",
            company: "Example Co",
            designation: "Director",
            tier: null,
          },
          surveyVersion: SURVEY_VERSION,
          metrics: { csat: 5, ces: 6, nps: 10 },
          avgRating: 5,
          sentiment: null,
          summary: null,
          keyDrivers: [],
          riskSignals: [],
          suggestedReply: {},
          nextSteps: [],
          answers: [
            {
              questionNumber: 1,
              question: SURVEY_QUESTIONS[0].question,
              metric: "csat",
              scaleMin: 1,
              scaleMax: 5,
              rating: 5,
              comments: longComment,
              method: "typed",
            },
          ],
        },
      ])
    );

    const user = userEvent.setup();
    renderDashboard(<DashboardResponses />);

    expect((await screen.findAllByText("Long Comment User"))[0]).toBeVisible();
    expect(screen.queryByText(longComment)).not.toBeInTheDocument();

    const commentTrigger = screen.getByRole("button", {
      name: /1 comment\. hover or click to read survey comments/i,
    });
    expect(commentTrigger).toBeVisible();

    await user.click(commentTrigger);

    expect(await screen.findByRole("tooltip")).toHaveTextContent(longComment);
  });
});
