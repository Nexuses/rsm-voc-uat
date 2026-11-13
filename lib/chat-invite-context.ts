import type { Prisma } from "@prisma/client";
import { deriveInviteTrackerStatus } from "@/lib/survey-invite-tracking";
import { db } from "@/lib/db";
import { resolveOverallSentiment } from "@/lib/survey/metrics";

const INVITE_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  started: "Survey started",
  opened: "Opened",
  reminder_sent: "Reminder sent",
  sent: "Invitation sent",
};

const AGGREGATE_INVITE_QUESTION =
  /\b(how many|how much|total|overall|all (?:the )?invites?|response rate|outreach|non[- ]?openers?|non[- ]?responders?|summary|status overview|invites? sent|were sent|have been sent)\b/i;

const inviteSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  company: true,
  customerName: true,
  department: true,
  partner: true,
  teamLeader: true,
  projectId: true,
  surveyOrder: true,
  sentAt: true,
  openedAt: true,
  startedAt: true,
  completedAt: true,
  responseId: true,
  followupCount: true,
  followup1SentAt: true,
  followup2SentAt: true,
  response: {
    select: {
      id: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      answers: true,
      excludedAt: true,
      client: {
        select: {
          name: true,
          company: true,
          email: true,
          designation: true,
        },
      },
      insight: {
        select: {
          overallSentiment: true,
          satisfactionSummary: true,
          keyDrivers: true,
          riskSignals: true,
        },
      },
    },
  },
} satisfies Prisma.SurveyInviteSelect;

type InviteRow = Prisma.SurveyInviteGetPayload<{ select: typeof inviteSelect }>;

/**
 * Load invite-tracker summary plus optional rows matching the chat question
 * (email, company, or customer name), including linked survey feedback.
 */
export async function loadInviteTrackerContextForQuestion(question: string) {
  const summary = await buildInviteOutreachSummary();
  const tokens = extractLookupTokens(question);
  const aggregateQuestion = isAggregateInviteQuestion(question);

  if (!tokens.length || (aggregateQuestion && !hasSpecificLookup(tokens, question))) {
    const recent = await db.surveyInvite.findMany({
      where: { sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      take: 15,
      select: inviteSelect,
    });
    const recentBlock = formatInviteContext(
      recent,
      "Recent invites (latest 15, for illustration — use summary counts above for totals)"
    );
    return `${summary}\n\n${recentBlock}`;
  }

  const orFilters = tokens.flatMap((token) => [
    { email: { contains: token, mode: "insensitive" as const } },
    { company: { contains: token, mode: "insensitive" as const } },
    { customerName: { contains: token, mode: "insensitive" as const } },
    { firstName: { contains: token, mode: "insensitive" as const } },
    { lastName: { contains: token, mode: "insensitive" as const } },
  ]);

  const invites = await db.surveyInvite.findMany({
    where: {
      sentAt: { not: null },
      OR: orFilters,
    },
    orderBy: { sentAt: "desc" },
    take: 40,
    select: inviteSelect,
  });

  const matchedEmails = [
    ...new Set([
      ...extractEmails(question).map((email) => email.toLowerCase()),
      ...invites.map((invite) => invite.email.toLowerCase()),
    ]),
  ];

  const orphanFeedback =
    matchedEmails.length > 0
      ? await loadFeedbackForEmails(
          matchedEmails,
          new Set(
            invites
              .map((invite) => invite.responseId)
              .filter((id): id is string => Boolean(id))
          )
        )
      : "";

  const matchBlock = formatInviteContext(
    invites,
    `Invite tracker matches for: ${tokens.join(", ")}`
  );

  return [summary, matchBlock, orphanFeedback].filter(Boolean).join("\n\n");
}

export function isAggregateInviteQuestion(question: string) {
  return AGGREGATE_INVITE_QUESTION.test(question);
}

export function extractLookupTokens(question: string): string[] {
  const emailMatches = extractEmails(question);
  const quoted =
    question.match(/"([^"]{2,80})"/g)?.map((value) => value.slice(1, -1)) ?? [];

  // Aggregate questions without an email/quoted name should not invent weak tokens.
  if (
    isAggregateInviteQuestion(question) &&
    emailMatches.length === 0 &&
    quoted.length === 0
  ) {
    return [];
  }

  const stop = new Set([
    "what",
    "whats",
    "what's",
    "status",
    "invite",
    "invites",
    "invitation",
    "invitations",
    "survey",
    "surveys",
    "for",
    "the",
    "a",
    "an",
    "of",
    "to",
    "is",
    "are",
    "was",
    "were",
    "has",
    "have",
    "had",
    "did",
    "does",
    "about",
    "client",
    "clients",
    "customer",
    "customers",
    "tracker",
    "outreach",
    "follow",
    "up",
    "opened",
    "sent",
    "completed",
    "response",
    "responses",
    "feedback",
    "please",
    "tell",
    "me",
    "show",
    "how",
    "many",
    "much",
    "number",
    "count",
    "total",
    "overall",
    "all",
    "their",
    "them",
    "they",
    "give",
    "gave",
    "given",
    "which",
    "who",
    "when",
    "where",
    "why",
    "can",
    "could",
    "would",
    "should",
    "rate",
    "summary",
    "overview",
    "list",
    "full",
    "whole",
    "entire",
  ]);

  const words = question
    .split(/[^A-Za-z0-9@.+\-]+/)
    .map((word) => word.trim())
    .filter(
      (word) =>
        word.length >= 3 &&
        !stop.has(word.toLowerCase()) &&
        !/^\d+$/.test(word)
    );

  return [...new Set([...emailMatches, ...quoted, ...words])]
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function buildInviteOutreachSummary() {
  const invites = await db.surveyInvite.findMany({
    where: { sentAt: { not: null } },
    select: {
      sentAt: true,
      openedAt: true,
      startedAt: true,
      completedAt: true,
      responseId: true,
      followupCount: true,
      followup1SentAt: true,
      followup2SentAt: true,
    },
  });

  const statusCounts: Record<string, number> = {
    sent: 0,
    reminder_sent: 0,
    opened: 0,
    started: 0,
    completed: 0,
  };

  let opened = 0;
  let started = 0;
  let completed = 0;

  for (const invite of invites) {
    const status = deriveInviteTrackerStatus(invite);
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    if (invite.openedAt) opened += 1;
    if (invite.startedAt) started += 1;
    if (invite.completedAt || invite.responseId) completed += 1;
  }

  const total = invites.length;
  const responseRate =
    total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
  const nonOpeners = total - opened;
  const nonResponders = total - completed;

  return [
    "Invite tracker outreach summary (all sent invitations):",
    `Total invites sent: ${total}`,
    `Opened: ${opened}`,
    `Started: ${started}`,
    `Completed / responses received: ${completed}`,
    `Response rate: ${responseRate}%`,
    `Non-openers: ${nonOpeners}`,
    `Non-responders: ${nonResponders}`,
    `By status — Invitation sent: ${statusCounts.sent}; Reminder sent: ${statusCounts.reminder_sent}; Opened: ${statusCounts.opened}; Survey started: ${statusCounts.started}; Completed: ${statusCounts.completed}`,
  ].join("\n");
}

async function loadFeedbackForEmails(
  emails: string[],
  alreadyLinkedResponseIds: Set<string>
) {
  const normalized = emails.map((email) => email.toLowerCase());
  const responses = await db.response.findMany({
    where: {
      excludedAt: null,
      client: {
        email: { in: normalized },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      answers: true,
      createdAt: true,
      client: {
        select: {
          name: true,
          company: true,
          email: true,
          designation: true,
        },
      },
      insight: {
        select: {
          overallSentiment: true,
          satisfactionSummary: true,
          keyDrivers: true,
          riskSignals: true,
        },
      },
    },
  });

  const extras = responses.filter(
    (response) => !alreadyLinkedResponseIds.has(response.id)
  );
  if (!extras.length) return "";

  const blocks = extras.map((response) =>
    formatFeedbackBlock({
      responseId: response.id,
      email: response.client?.email ?? "—",
      name: response.client?.name ?? "—",
      company: response.client?.company ?? "—",
      designation: response.client?.designation ?? null,
      csatScore: response.csatScore,
      cesScore: response.cesScore,
      npsScore: response.npsScore,
      answers: response.answers,
      insight: response.insight,
      submittedAt: response.createdAt,
    })
  );

  return `Additional survey feedback for matched emails (not already linked above):\n\n${blocks.join("\n\n")}`;
}

function formatInviteContext(invites: InviteRow[], heading: string) {
  if (!invites.length) {
    return `${heading}\nNo matching invite tracker rows.`;
  }

  const lines = invites.map((invite) => {
    const status = deriveInviteTrackerStatus(invite);
    const name = [invite.firstName, invite.lastName].filter(Boolean).join(" ");
    const base = [
      `INVITE ${invite.id}`,
      `Email: ${invite.email}`,
      `Name: ${name || invite.customerName || "—"}`,
      `Company: ${invite.company || "—"}`,
      `Status: ${INVITE_STATUS_LABELS[status] ?? status}`,
      `Department: ${invite.department || "—"}`,
      `Partner: ${invite.partner || "—"}`,
      `Team leader: ${invite.teamLeader || "—"}`,
      `Project: ${invite.projectId || "—"}`,
      `Survey order: ${invite.surveyOrder || "—"}`,
      `Sent: ${invite.sentAt?.toISOString() ?? "—"}`,
      `Opened: ${invite.openedAt?.toISOString() ?? "—"}`,
      `Started: ${invite.startedAt?.toISOString() ?? "—"}`,
      `Completed: ${invite.completedAt?.toISOString() ?? "—"}`,
      `Follow-ups sent: ${invite.followupCount}`,
    ];

    if (invite.response && !invite.response.excludedAt) {
      base.push(
        formatFeedbackBlock({
          responseId: invite.response.id,
          email: invite.response.client?.email ?? invite.email,
          name:
            invite.response.client?.name ??
            (name || invite.customerName || "—"),
          company: invite.response.client?.company ?? invite.company ?? "—",
          designation: invite.response.client?.designation ?? null,
          csatScore: invite.response.csatScore,
          cesScore: invite.response.cesScore,
          npsScore: invite.response.npsScore,
          answers: invite.response.answers,
          insight: invite.response.insight,
          submittedAt: null,
        })
      );
    } else if (status === "completed") {
      base.push("Feedback: completed but linked response details are unavailable.");
    } else {
      base.push("Feedback: not completed yet.");
    }

    return base.join("\n");
  });

  return `${heading}\n\n${lines.join("\n\n")}`;
}

function formatFeedbackBlock(input: {
  responseId: string;
  email: string;
  name: string;
  company: string;
  designation: string | null;
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  answers: unknown;
  insight: {
    overallSentiment: string;
    satisfactionSummary: string;
    keyDrivers: unknown;
    riskSignals: unknown;
  } | null;
  submittedAt: Date | null;
}) {
  const drivers = stringList(input.insight?.keyDrivers);
  const risks = stringList(input.insight?.riskSignals);
  const comments = extractAnswerComments(input.answers);

  return [
    `FEEDBACK for ${input.email} (response ${input.responseId})`,
    `Respondent: ${input.name}${input.designation ? ` [${input.designation}]` : ""}`,
    `Company: ${input.company}`,
    input.submittedAt
      ? `Submitted: ${input.submittedAt.toISOString()}`
      : null,
    `CSAT: ${formatScore(input.csatScore, 5)}`,
    `CES: ${formatScore(input.cesScore, 7)}`,
    `NPS: ${formatScore(input.npsScore, 10)}`,
    `Sentiment: ${
      resolveOverallSentiment({
        csatScore: input.csatScore,
        cesScore: input.cesScore,
        npsScore: input.npsScore,
        storedSentiment: input.insight?.overallSentiment,
      }) ?? "—"
    }`,
    `Summary: ${input.insight?.satisfactionSummary ?? "—"}`,
    `Drivers: ${drivers.join(", ") || "none"}`,
    `Risks: ${risks.join(", ") || "none"}`,
    comments.length ? `Comments: ${comments.join(" | ")}` : "Comments: none",
  ]
    .filter(Boolean)
    .join("\n");
}

function extractAnswerComments(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((answer) => {
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
      return [];
    }
    const record = answer as Record<string, unknown>;
    const comment =
      typeof record.reason_text === "string" ? record.reason_text.trim() : "";
    if (!comment) return [];
    const metric =
      typeof record.metric === "string"
        ? record.metric.toUpperCase()
        : `Q${record.question_number ?? "?"}`;
    return [`${metric}: ${comment}`];
  });
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function formatScore(value: number | null, max: number) {
  return value === null ? "missing" : `${value}/${max}`;
}

function extractEmails(question: string) {
  return question.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
}

function hasSpecificLookup(tokens: string[], question: string) {
  return (
    extractEmails(question).length > 0 ||
    /"[^"]{2,80}"/.test(question) ||
    tokens.some((token) => token.includes("@") || token.length >= 4)
  );
}
