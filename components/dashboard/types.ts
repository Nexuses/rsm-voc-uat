export type DashboardSentiment = "positive" | "neutral" | "negative";
export type DashboardMood = "all" | "happy" | "neutral" | "unhappy";
export type DashboardWindow = "all" | "90d" | "year";

export type DashboardInsight = {
  responseId: string;
  conversationId: string;
  source: "voice" | "typed";
  language: string | null;
  submittedAt: string;
  department: string | null;
  partner: string | null;
  serviceName?: string | null;
  businessManagerName?: string | null;
  jobManagerName?: string | null;
  surveyVersion: string;
  client: {
    name?: string | null;
    company?: string | null;
    designation?: string | null;
    email?: string | null;
    tier?: string | null;
  } | null;
  metrics: {
    csat: number | null;
    ces: number | null;
    nps: number | null;
  };
  avgRating: number | null;
  sentiment: DashboardSentiment | null;
  summary: string | null;
  keyDrivers: string[];
  riskSignals: string[];
  suggestedReply: { en?: string; ar?: string };
  nextSteps: string[];
  answers: Array<{
    questionNumber: number;
    question: string;
    metric: "csat" | "ces" | "nps" | null;
    scaleMin: number | null;
    scaleMax: number | null;
    rating: number;
    comments: string | null;
    method: string | null;
  }>;
};
