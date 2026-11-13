import { SURVEY_QUESTIONS } from "@/lib/survey/constants";
import type { AnnualCxComparison } from "@/lib/annual-cx-report-period";
import type { DashboardReport } from "@/lib/dashboard-analytics";
import type { SurveyOutreachStats } from "@/lib/survey-outreach";

export const ANNUAL_CX_TAGLINE = "Listening, Learning, Improving";

export const ANNUAL_CX_COVER_TITLE = "Client Experience Report";
export const ANNUAL_CX_COVER_SUBTITLE = "RSM in Kuwait : Voice of Clients (CX)";

export const HOW_WE_LISTEN_STEPS = [
  {
    title: "Engagement milestone",
    body: "A survey triggers automatically mid-engagement and again at completion.",
  },
  {
    title: "Short survey sent",
    body: "A focused set of questions with optional comments, plus reminder emails.",
  },
  {
    title: "Client responds",
    body: "Ratings on approved scales, feeding CSAT, NPS and CES.",
  },
  {
    title: "Action taken",
    body: "Neutral or low ratings raise an immediate follow-up task.",
  },
] as const;

export const LISTENING_PROGRAMME_PRACTICES = [
  {
    title: "Automated engagement triggers",
    body: "Surveys are automatically sent at key engagement milestones.",
  },
  {
    title: "Simple survey design",
    body: "Focused questions with optional comments improve participation.",
  },
  {
    title: "Reminder system",
    body: "Automated reminders encourage survey completion without adding workload.",
  },
  {
    title: "Immediate action protocol",
    body: "Neutral or low ratings trigger immediate follow-up for resolution.",
  },
  {
    title: "Dedicated follow-up",
    body: "Team members directly connect with clients sharing detailed feedback.",
  },
] as const;

export const IMPROVEMENT_THEMES = [
  {
    title: "Advocacy",
    body: "Support satisfied clients to become active advocates through clearer expectation-setting at the start of each engagement and regular partner check-ins.",
  },
  {
    title: "Visibility",
    body: "Provide clients with clearer visibility of engagement status through real-time progress updates and next-action summaries.",
  },
  {
    title: "Consistency",
    body: "Promote consistent delivery practices across all teams through champion-led coaching and quarterly CX playbook reviews.",
  },
] as const;

export const GOVERNANCE_BLOCKS = [
  {
    title: "Leadership",
    body: "A cross-functional Customer Experience (CX) Committee brings together representatives from across the firm to review feedback and align on priorities.",
  },
  {
    title: "Champions",
    body: "Each service line appoints a CX Champion responsible for implementing actions, coordinating interventions and maintaining ongoing client communication.",
  },
  {
    title: "Operating rhythm",
    body: "Monthly performance reviews, on-demand escalation management and quarterly updates to CX playbooks keep teams aligned and responsive.",
  },
  {
    title: "Governance",
    body: "Establishes targets, monitors CX KPIs, follows up on low ratings and facilitates the sharing of effective practices across teams.",
  },
] as const;

export const FROM_INSIGHT_TO_ACTION =
  "A cross-functional CX Committee defines annual priorities, tracks progress and embeds effective practices from experienced teams. Each service line nominates a CX Champion responsible for monitoring results, coordinating interventions and managing client outreach where required.";

export const LEGAL_NETWORK_TEXT = [
  "RSM Albazie & Co. is a member of the RSM network and trades as RSM. RSM is the trading name used by the members of the RSM network.",
  "Each member of the RSM network is an independent assurance, tax and consulting firm each of which practices in its own right. The RSM network is not itself a separate legal entity of any description in any jurisdiction.",
  "The RSM network is administered by RSM International Limited, a company registered in England and Wales (company number 4040598) whose registered office is at 200 Aldersgate Street, London, EC1A 4HD, United Kingdom.",
  "The brand and trademark RSM and other intellectual property rights used by members of the Network are owned by RSM International Association, an association governed by article 60 et seq of the Civil Code of Switzerland whose seat is in Zug.",
] as const;

export const CONTACT_BLOCK = {
  firm: "RSM in Kuwait",
  addressLines: [
    "Arraya Tower, Floors 41 & 42",
    "Abdulaziz Hamad Alsaqar Street, Sharq",
    "P. O. Box 2115, Safat 13022, State of Kuwait",
  ],
  phone: "T: +965 22961000  F: +965 22412761",
  email: "E: connect@rsm.com.kw",
  web: "W: www.rsm.global/kuwait",
  tagline: "THE POWER OF BEING UNDERSTOOD",
  services: "ASSURANCE | TAX | CONSULTING",
  copyrightYear: 2026,
} as const;

export function surveyQuestionCards() {
  return SURVEY_QUESTIONS.map((question) => ({
    metric: question.metric.toUpperCase(),
    question: question.question,
  }));
}

export function philosophyCopy(periodLabel: string) {
  return [
    "At RSM in Kuwait, our philosophy is built on the power of being understood. Central to this is a genuine understanding of the client experience. Each year, we ask three questions of ourselves: Are our clients satisfied? Is it easy to work with us? Do we continue to earn their trust?",
    `This report brings together feedback from ${periodLabel}. It draws on three performance indicators: client satisfaction, likelihood to recommend and ease of working. The findings reflect both what we are doing well and where we can do better. We value the openness of our clients and remain focused on using this feedback to strengthen our collaboration and their overall experience.`,
  ];
}

export function volumeNarrative(input: {
  surveysSent: number;
  responsesReceived: number;
  priorResponses: number | null;
  responseRate: number | null;
  priorResponseRate: number | null;
}) {
  const prior =
    input.priorResponses !== null && input.priorResponses > 0
      ? ` Response volume moved from ${input.priorResponses} in the prior period to ${input.responsesReceived} in the current period.`
      : "";
  const rate =
    input.responseRate !== null
      ? input.priorResponseRate !== null
        ? ` As outreach continued, the response rate moved from ${input.priorResponseRate}% to ${input.responseRate}%.`
        : ` The response rate for the period is ${input.responseRate}%.`
      : "";
  return `From the reporting period, ${input.surveysSent} surveys were sent and ${input.responsesReceived} responses received.${prior}${rate} We continue to refine reminder timing and survey length to support participation.`;
}

export function csatOutlook(input: {
  favorablePercent: number | null;
  favorableCount: number;
  total: number;
}) {
  if (input.favorablePercent === null || input.total === 0) {
    return "Customer satisfaction results for this period are not yet available in sufficient volume to summarise.";
  }
  return `A CSAT of ${input.favorablePercent}% reflects steady service quality across the period. The result is drawn from ${input.favorableCount} of ${input.total} responses rating the experience as satisfied or very satisfied. In line with ongoing efforts, we remain focused on sustaining this level through consistent delivery and clear communication.`;
}

export function npsOutlook(input: {
  score: number | null;
  promoters: number;
  detractors: number;
  total: number;
}) {
  if (input.score === null || input.total === 0) {
    return "Net Promoter Score results for this period are not yet available in sufficient volume to summarise.";
  }
  return `An NPS of ${input.score} indicates a base of client advocates, with ${input.promoters} promoters compared to ${input.detractors} detractors. This reflects trust built through consistent service across engagements. We continue to focus on supporting satisfied clients to become active advocates through closer engagement and clear communication.`;
}

export function cesOutlook(input: {
  average: number | null;
  favorableCount: number;
  total: number;
}) {
  if (input.average === null || input.total === 0) {
    return "Customer Effort Score results for this period are not yet available in sufficient volume to summarise.";
  }
  return `A CES of ${input.average.toFixed(1)} suggests clients generally find it easy to work with us. The distribution sits toward the easier end of the scale, with ${input.favorableCount} of ${input.total} responses rating the experience favourably. This points to clear communication and responsive client-facing teams. We aim to sustain this during peak periods through greater visibility of engagement status.`;
}

export function summaryOutlookIntro(input: {
  csatPercent: number | null;
  npsScore: number | null;
  cesAverage: number | null;
}) {
  const csat =
    input.csatPercent === null ? "n/a" : `${input.csatPercent}%`;
  const nps = input.npsScore === null ? "n/a" : String(input.npsScore);
  const ces =
    input.cesAverage === null ? "n/a" : `${input.cesAverage.toFixed(1)} out of 7`;
  return `The results for this period reflect steady progress across the three measures tracked. RSM in Kuwait recorded a client satisfaction rate of ${csat}, a Net Promoter Score of ${nps} and a Customer Effort Score of ${ces}. Taken together, the findings indicate a consistent foundation in service quality, client trust and ease of working.`;
}

export function performanceAgainstTargetCopy(input: {
  comparison: AnnualCxComparison;
  targets: { csatPercent: number; npsScore: number; cesAverage: number };
}) {
  const { comparison, targets } = input;
  return {
    csat: targetLine({
      label: "CSAT",
      current: comparison.csatPercent.current,
      prior: comparison.csatPercent.prior,
      target: targets.csatPercent,
      unit: "%",
      focus:
        "The focus is to sustain this through consistent execution and clear communication.",
    }),
    nps: targetLine({
      label: "NPS",
      current: comparison.npsScore.current,
      prior: comparison.npsScore.prior,
      target: targets.npsScore,
      unit: "score",
      focus:
        "The focus is to support satisfied clients in becoming active advocates through closer engagement.",
    }),
    ces: targetLine({
      label: "CES",
      current: comparison.cesAverage.current,
      prior: comparison.cesAverage.prior,
      target: targets.cesAverage,
      unit: "avg",
      focus:
        "The focus is to sustain this during peak periods through clear communication and timely follow-up.",
    }),
  };
}

function targetLine(input: {
  label: string;
  current: number | null;
  prior: number | null;
  target: number;
  unit: "%" | "score" | "avg";
  focus: string;
}) {
  if (input.current === null) {
    return `${input.label} is not yet available for this period.`;
  }
  const meets =
    input.unit === "avg"
      ? input.current >= input.target
      : input.current >= input.target;
  const status = meets ? "Meets or exceeds target." : "Below the period target.";
  const prior =
    input.prior === null
      ? ""
      : input.unit === "%"
        ? ` Prior period: ${input.prior}%.`
        : input.unit === "avg"
          ? ` Prior period: ${input.prior.toFixed(1)}.`
          : ` Prior period: ${input.prior}.`;
  const currentDisplay =
    input.unit === "%"
      ? `${input.current}%`
      : input.unit === "avg"
        ? input.current.toFixed(1)
        : String(input.current);
  return `${status} Current ${input.label} is ${currentDisplay}.${prior} ${input.focus}`;
}

export function conclusionCopy(periodLabel: string) {
  return [
    `The ${periodLabel} results reflect our continued commitment to delivering a quality client experience.`,
    "Building on results across the three measures, we plan to address areas for improvement and continue to earn the trust our clients place in us. With the dedication of our teams, we aim to turn these insights into meaningful action over the period ahead.",
  ];
}

export function quotesSectionIntro() {
  return "The experience behind the numbers, in our clients' own words.";
}

export function methodologyNpsFootnote() {
  return "NPS in this report uses the platform 0–10 scale. A rating of 9–10 is a Promoter, 7–8 is Neutral and 0–6 is a Detractor. NPS = % Promoters − % Detractors.";
}

export function methodologyCesFootnote() {
  return "CES in this report uses a 1–7 scale to measure ease of client interactions. A rating of 1 represents a difficult experience, while a rating of 7 represents an easy experience. Higher scores indicate that clients generally find it easier to work with us.";
}

export const ANNUAL_CX_METRIC_LABELS = {
  csat: "CSAT · Satisfaction with our service",
  nps: "NPS · Recommending RSM to colleagues",
  ces: "CES · Ease of working with RSM",
} as const;

export function headerPeriodLine(periodLabel: string) {
  return `RSM in Kuwait : Voice of Clients (CX) | ${periodLabel}`;
}

/** Footer legal name — the legal entity appears in footers only, never headers. */
export const FOOTER_LEGAL_NAME = "RSM Albazie & Co.";

/** Left-hand footer line on every report page. */
export const FOOTER_LEFT_LINE = "RSM Assurance | THE POWER OF BEING UNDERSTOOD";

export function buildOutlookBodies(input: {
  report: DashboardReport;
  outreach: SurveyOutreachStats;
}) {
  const csatFavorable =
    (input.report.csat.distribution[3] ?? 0) +
    (input.report.csat.distribution[4] ?? 0);
  const cesFavorable = input.report.ces.distribution
    .slice(4)
    .reduce((sum, value) => sum + value, 0);

  return {
    intro: summaryOutlookIntro({
      csatPercent: input.report.csat.count
        ? input.report.csat.favorablePercent
        : null,
      npsScore: input.report.nps.score,
      cesAverage: input.report.ces.average,
    }),
    csat: csatOutlook({
      favorablePercent: input.report.csat.count
        ? input.report.csat.favorablePercent
        : null,
      favorableCount: csatFavorable,
      total: input.report.csat.count,
    }),
    nps: npsOutlook({
      score: input.report.nps.score,
      promoters: input.report.nps.promoters,
      detractors: input.report.nps.detractors,
      total: input.report.nps.count,
    }),
    ces: cesOutlook({
      average: input.report.ces.average,
      favorableCount: cesFavorable,
      total: input.report.ces.count,
    }),
  };
}
