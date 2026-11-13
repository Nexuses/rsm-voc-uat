import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Answer } from "@/lib/insight";
import { db } from "@/lib/db";
import { SURVEY_QUESTIONS } from "@/lib/survey/constants";
import {
  buildSurveyTranscriptView,
  type SurveyTranscriptTurn,
} from "@/lib/survey/transcript";
import {
  isCompleteSurveyResponse,
  needsAttentionScores,
  overallSurveyResult,
  type OverallResult,
} from "@/lib/survey/metrics";
import { recordSurveyInviteActivity } from "@/lib/survey-invite-events";
import {
  isSmtpConfigured,
  sendSurveyInviteEmail,
  sendSurveyInviteEmailToRecipients,
} from "@/lib/survey-invite-email";
import { formatRecipientName, type SurveyRecipient } from "@/lib/survey-outreach";
import { resolveCompletionCcEmails } from "@/lib/survey-staff-contacts";
import {
  markTestimonialRequested,
  prepareThankYouTestimonial,
  type ThankYouTestimonialAsk,
} from "@/lib/testimonials/prepare";

export const SURVEY_THANKYOU_SUBJECT =
  "RSM in Kuwait — Thank You for your Voice of Clients Feedback";

export const SURVEY_TEAM_NOTIFY_SUBJECT =
  "RSM in Kuwait — New Voice of Clients Survey Response";

export const SURVEY_TEAM_NOTIFY_ATTENTION_SUBJECT =
  "RSM in Kuwait — Needs attention: Voice of Clients Survey Response";

export const SURVEY_TEAM_ACTION_REQUIRED_SUBJECT =
  "RSM in Kuwait — Action required: negative Voice of Clients feedback";

const METRIC_LABELS: Record<"csat" | "ces" | "nps", string> = {
  csat: "CSAT",
  ces: "CES",
  nps: "NPS",
};

let thankYouTemplateCache: string | null = null;
let teamNotifyTemplateCache: string | null = null;
let teamActionTemplateCache: string | null = null;

function loadThankYouTemplate() {
  if (thankYouTemplateCache) return thankYouTemplateCache;
  thankYouTemplateCache = readFileSync(
    join(process.cwd(), "templates", "email", "voc-thankyou.html"),
    "utf8"
  );
  return thankYouTemplateCache;
}

function loadTeamNotifyTemplate() {
  if (teamNotifyTemplateCache) return teamNotifyTemplateCache;
  teamNotifyTemplateCache = readFileSync(
    join(process.cwd(), "templates", "email", "voc-team-notify.html"),
    "utf8"
  );
  return teamNotifyTemplateCache;
}

function loadTeamActionRequiredTemplate() {
  if (teamActionTemplateCache) return teamActionTemplateCache;
  teamActionTemplateCache = readFileSync(
    join(process.cwd(), "templates", "email", "voc-team-action-required.html"),
    "utf8"
  );
  return teamActionTemplateCache;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCompletedDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuwait",
  }).format(value);
}

function formatSubmittedAt(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kuwait",
  })
    .format(value)
    .replace(/\s(am|pm)$/i, "\u00a0$1")
    .concat(" (Kuwait\u00a0time)");
}

function findAnswer(answers: Answer[], metric: "csat" | "ces" | "nps") {
  const questionNumber = metric === "csat" ? 1 : metric === "ces" ? 2 : 3;
  return answers.find(
    (answer) =>
      answer.metric === metric || answer.question_number === questionNumber
  );
}

function formatScore(
  metric: "csat" | "ces" | "nps",
  score: number | null | undefined,
  answers: Answer[]
) {
  if (score == null) return "—";
  const definition = SURVEY_QUESTIONS.find((item) => item.metric === metric);
  const answer = findAnswer(answers, metric);
  const min = answer?.scale_min ?? definition?.min ?? 0;
  const max = answer?.scale_max ?? definition?.max ?? 10;
  return `${score} / ${max}`;
}

export function getTeamNotifyRecipients(): string[] {
  const raw = process.env.SURVEY_COMPLETION_NOTIFY_TO?.trim() || "";
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

type RespondentContext = {
  name: string | null;
  company: string | null;
  designation: string | null;
  inviteEmail: string | null;
  department: string | null;
  serviceName?: string | null;
  partner: string | null;
  partnerEmail?: string | null;
  businessManagerName?: string | null;
  businessManagerEmail?: string | null;
  jobManagerName?: string | null;
  jobManagerEmail?: string | null;
  teamLeader: string | null;
  projectId: string | null;
  channel: "voice" | "typed";
  language: string | null;
};

type ContextField = { label: string; value: string; email?: string };

function formatDisplayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function personField(
  label: string,
  name: string | null | undefined,
  email: string | null | undefined
): ContextField {
  const displayName = name?.trim();
  const displayEmail = email?.trim();
  if (displayName && displayEmail) {
    return { label, value: displayName, email: displayEmail };
  }
  return { label, value: formatDisplayValue(displayName || displayEmail) };
}

function respondentContextSections(context: RespondentContext, completedAt: Date) {
  const client: ContextField[] = [
    { label: "Company", value: formatDisplayValue(context.company) },
    { label: "Name", value: formatDisplayValue(context.name) },
    { label: "Designation", value: formatDisplayValue(context.designation) },
    { label: "Email", value: formatDisplayValue(context.inviteEmail) },
    { label: "Channel", value: context.channel === "voice" ? "Voice" : "Typed" },
    { label: "Submitted", value: formatSubmittedAt(completedAt) },
  ];
  const team: ContextField[] = [
    { label: "Department", value: formatDisplayValue(context.department) },
    personField("Engagement Partner", context.partner, context.partnerEmail),
    personField(
      "Business Manager",
      context.businessManagerName,
      context.businessManagerEmail
    ),
    personField("Job Manager", context.jobManagerName, context.jobManagerEmail),
    { label: "Project ID", value: formatDisplayValue(context.projectId) },
    { label: "Service", value: formatDisplayValue(context.serviceName) },
  ];
  return [
    { title: "Client information", fields: client },
    { title: "RSM in Kuwait team", fields: team },
  ];
}

function buildRespondentContextHtml(context: RespondentContext, completedAt: Date) {
  const fieldHtml = ({ label, value, email }: ContextField) =>
    `<p style="margin:0 0 5px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#333333;word-break:break-word;"><strong style="color:#00153D;">${escapeHtml(label)}:</strong> ${escapeHtml(value)}${email ? `<br><span style="font-size:12px;color:#63666A;">${escapeHtml(email)}</span>` : ""}</p>`;
  const [client, team] = respondentContextSections(context, completedAt);
  const column = (
    section: { title: string; fields: ContextField[] },
    width: number,
    style: string
  ) =>
    `<td width="${width}%" valign="top" style="width:${width}%;vertical-align:top;${style}"><p style="margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid #C9CED6;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#63666A;">${escapeHtml(section.title)}</p>${section.fields.map(fieldHtml).join("")}</td>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${column(client, 50, "padding:2px 14px 2px 0;")}${column(team, 50, "padding:2px 0 2px 14px;border-left:1px solid #C9CED6;")}</tr></table>`;
}

function buildRespondentContextText(context: RespondentContext, completedAt: Date) {
  return respondentContextSections(context, completedAt)
    .map(({ title, fields }) =>
      [
        `${title}:`,
        ...fields.map(
          ({ label, value, email }) =>
            `${label}: ${email ? `${value} (${email})` : value}`
        ),
      ].join("\n")
    )
    .join("\n\n");
}

export type { OverallResult };

/** Company, contact, and the same result word used in the body. */
export function buildCompletionEmailSubject(input: {
  company?: string | null;
  contactName?: string | null;
  result?: OverallResult | null;
  fallback: string;
}) {
  const who = [input.company?.trim(), input.contactName?.trim()].filter(
    (value): value is string => Boolean(value)
  );
  if (!who.length) {
    return input.result ? `${input.fallback} — Result: ${input.result}` : input.fallback;
  }
  return input.result
    ? `${who.join(" — ")} — Result: ${input.result}`
    : who.join(" — ");
}

function buildOverallResultHtml(result: OverallResult | null | undefined) {
  if (!result) return "";
  return `<span style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#333333;"><strong style="color:#00153D;">Overall result:</strong> ${escapeHtml(result)}</span>`;
}

export function buildSurveyResponseSummaryHtml(input: {
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  answers: Answer[];
}) {
  const rows = (["csat", "ces", "nps"] as const).map((metric) => {
    const definition = SURVEY_QUESTIONS.find((item) => item.metric === metric);
    const answer = findAnswer(input.answers, metric);
    const comment = answer?.reason_text?.trim();
    const score =
      metric === "csat"
        ? input.csatScore
        : metric === "ces"
          ? input.cesScore
          : input.npsScore;

    return `
      <table class="voc-keep-together" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom:1px solid #DDE1E8;background:#ffffff;page-break-inside:avoid;break-inside:avoid;">
        <tr>
          <td style="padding:8px 14px;vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#009CDE;">${METRIC_LABELS[metric]}</td>
                <td align="right" style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#63666A;"><strong style="color:#00153D;">Score:</strong> <span style="font-size:15px;font-weight:700;color:#00153D;">${escapeHtml(formatScore(metric, score, input.answers))}</span></td>
              </tr>
            </table>
            <p style="margin:2px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#333333;">${escapeHtml(definition?.question ?? "")}</p>
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#63666A;"><strong style="color:#00153D;">Comments:</strong> ${comment ? escapeHtml(comment) : "—"}</p>
          </td>
        </tr>
      </table>
    `;
  });

  return rows.join("");
}

function buildVoiceTranscriptHtml(turns: SurveyTranscriptTurn[] | undefined) {
  if (!turns?.length) return "";
  const rows = turns
    .map(
      (turn) =>
        `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:#333333;"><strong style="color:#00153D;">${turn.role === "agent" ? "RSM" : "Client"}:</strong> ${escapeHtml(turn.message)}</p>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:12px;"><tr><td style="padding:8px 14px;font-family:Arial,Helvetica,sans-serif;"><p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#009CDE;">Survey transcript</p>${rows}</td></tr></table>`;
}

function buildVoiceTranscriptText(turns: SurveyTranscriptTurn[] | undefined) {
  if (!turns?.length) return "";
  return [
    "",
    "Survey transcript:",
    "",
    ...turns.map(
      (turn) => `${turn.role === "agent" ? "RSM" : "Client"}: ${turn.message}`
    ),
  ].join("\n");
}

export function buildSurveyResponseSummaryText(input: {
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  answers: Answer[];
}) {
  return (["csat", "ces", "nps"] as const)
    .map((metric) => {
      const definition = SURVEY_QUESTIONS.find((item) => item.metric === metric);
      const answer = findAnswer(input.answers, metric);
      const comment = answer?.reason_text?.trim();
      const score =
        metric === "csat"
          ? input.csatScore
          : metric === "ces"
            ? input.cesScore
            : input.npsScore;

      return [
        `${METRIC_LABELS[metric]}: ${formatScore(metric, score, input.answers)}`,
        definition?.question ?? "",
        comment ? `Comment: ${comment}` : "Comment: —",
      ].join("\n");
    })
    .join("\n\n");
}

export function buildTestimonialAskHtml(ask: ThankYouTestimonialAsk) {
  const withComment = ask.kind === "draft_approval";
  const copy = withComment
    ? "Would you let us share a short testimonial based on your comments? We drafted one from what you wrote. You can approve it, edit it, and choose whether we may use your name and where it may appear."
    : "Would you share a short written testimonial, or a link to a video testimonial? You choose whether we may use your name and where it may appear.";
  const label = withComment ? "Review your testimonial" : "Share a testimonial";
  const href = escapeHtml(ask.url);
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:18px 0 0 0;background:#F3FAF1;border:1px solid #3f9c35;"><tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;"><p style="margin:0 0 8px 0;font-size:12px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:#3f9c35;">Testimonial</p><p style="margin:0 0 14px 0;font-size:14px;line-height:20px;color:#00153D;">${escapeHtml(copy)}</p><a href="${href}" style="display:inline-block;background:#00153D;color:#ffffff;text-decoration:none;padding:10px 16px;font-size:14px;font-weight:bold;">${escapeHtml(label)}</a></td></tr></table>`;
}

export function buildTestimonialAskText(ask: ThankYouTestimonialAsk) {
  const withComment = ask.kind === "draft_approval";
  const copy = withComment
    ? "Would you let us share a short testimonial based on your comments? We drafted one from what you wrote. You can approve it, edit it, and choose whether we may use your name and where it may appear."
    : "Would you share a short written testimonial, or a link to a video testimonial? You choose whether we may use your name and where it may appear.";
  const label = withComment ? "Review your testimonial" : "Share a testimonial";
  return ["Testimonial", copy, `${label}: ${ask.url}`].join("\n");
}

export function renderSurveyThankYouEmail(input: {
  recipient: SurveyRecipient;
  completedAt: Date;
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  answers: Answer[];
  testimonialAsk?: ThankYouTestimonialAsk | null;
}) {
  const clientName = formatRecipientName(input.recipient);
  const responseSummaryHtml = buildSurveyResponseSummaryHtml(input);
  const completedDate = formatCompletedDate(input.completedAt);
  const askHtml = input.testimonialAsk
    ? buildTestimonialAskHtml(input.testimonialAsk)
    : "";
  const askText = input.testimonialAsk
    ? buildTestimonialAskText(input.testimonialAsk)
    : "";

  const html = loadThankYouTemplate()
    .replaceAll("{{client_name}}", escapeHtml(clientName))
    .replaceAll("[Client Name]", escapeHtml(clientName))
    .replaceAll("{{response_summary}}", responseSummaryHtml)
    .replaceAll("{{testimonial_ask}}", askHtml)
    .replaceAll("{{completed_date}}", escapeHtml(completedDate));

  const text = [
    `Dear ${clientName},`,
    "",
    "Thank you for completing the RSM in Kuwait Voice of Clients assessment.",
    "",
    `Summary of your responses on ${completedDate}:`,
    "",
    buildSurveyResponseSummaryText(input),
    "",
    ...(askText ? [askText, ""] : []),
    "Best regards,",
    "RSM in Kuwait",
  ].join("\n");

  return {
    subject: SURVEY_THANKYOU_SUBJECT,
    html,
    text,
  };
}

export function renderSurveyTeamNotifyEmail(input: {
  completedAt: Date;
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  answers: Answer[];
  context: RespondentContext;
  overallResult?: OverallResult | null;
  company?: string | null;
  contactName?: string | null;
  turns?: SurveyTranscriptTurn[];
}) {
  const responseSummaryHtml =
    buildSurveyResponseSummaryHtml(input) + buildVoiceTranscriptHtml(input.turns);
  const completedDate = formatCompletedDate(input.completedAt);
  const respondentContextHtml = buildRespondentContextHtml(input.context, input.completedAt);
  const respondentContextText = buildRespondentContextText(input.context, input.completedAt);
  const attentionMetrics = needsAttentionScores(input);
  const needsAttention = attentionMetrics.length > 0;
  const attentionLabel = attentionMetrics.join(", ");
  const attentionBanner = needsAttention
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 16px 0;background:#F7F9FC;border:1px solid #DDE1E8;"><tr><td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:1.55;color:#00153D;">Needs attention — low score on ${escapeHtml(attentionLabel)}.</td></tr></table>`
    : "";

  const html = loadTeamNotifyTemplate()
    .replaceAll("{{attention_banner}}", attentionBanner)
    .replaceAll("{{overall_result}}", buildOverallResultHtml(input.overallResult))
    .replaceAll("{{response_summary}}", responseSummaryHtml)
    .replaceAll("{{respondent_context}}", respondentContextHtml)
    .replaceAll("{{completed_date}}", escapeHtml(completedDate));

  const text = [
    needsAttention
      ? `Needs attention — low score on ${attentionLabel}.`
      : "New Voice of Clients survey response",
    "",
    `Completed on ${completedDate}.`,
    ...(input.overallResult ? [`Overall result: ${input.overallResult}`] : []),
    "",
    "Respondent details:",
    respondentContextText,
    "",
    "Survey responses:",
    "",
    buildSurveyResponseSummaryText(input),
    buildVoiceTranscriptText(input.turns),
    "",
    "This is an internal notification. Review the full response in the CX dashboard.",
  ].join("\n");

  return {
    subject: buildCompletionEmailSubject({
      company: input.company,
      contactName: input.contactName,
      result: input.overallResult,
      fallback: needsAttention
        ? SURVEY_TEAM_NOTIFY_ATTENTION_SUBJECT
        : SURVEY_TEAM_NOTIFY_SUBJECT,
    }),
    html,
    text,
  };
}

export function renderSurveyTeamActionRequiredEmail(input: {
  completedAt: Date;
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  answers: Answer[];
  context: RespondentContext;
  overallResult?: OverallResult | null;
  company?: string | null;
  contactName?: string | null;
  turns?: SurveyTranscriptTurn[];
}) {
  const responseSummaryHtml =
    buildSurveyResponseSummaryHtml(input) + buildVoiceTranscriptHtml(input.turns);
  const completedDate = formatCompletedDate(input.completedAt);
  const respondentContextHtml = buildRespondentContextHtml(input.context, input.completedAt);
  const respondentContextText = buildRespondentContextText(input.context, input.completedAt);
  const attentionMetrics = needsAttentionScores(input);
  const attentionLabel = attentionMetrics.join(", ");
  const attentionBanner = `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 16px 0;background:#F7F9FC;border:1px solid #DDE1E8;"><tr><td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:1.55;color:#00153D;">Low score on ${escapeHtml(attentionLabel)}. Please review and take action in the CX dashboard.</td></tr></table>`;

  const html = loadTeamActionRequiredTemplate()
    .replaceAll("{{attention_banner}}", attentionBanner)
    .replaceAll("{{overall_result}}", buildOverallResultHtml(input.overallResult))
    .replaceAll("{{response_summary}}", responseSummaryHtml)
    .replaceAll("{{respondent_context}}", respondentContextHtml)
    .replaceAll("{{completed_date}}", escapeHtml(completedDate));

  const text = [
    `ACTION REQUIRED — low score on ${attentionLabel}.`,
    "",
    `Completed on ${completedDate}.`,
    ...(input.overallResult ? [`Overall result: ${input.overallResult}`] : []),
    "",
    "Respondent details:",
    respondentContextText,
    "",
    "Survey responses:",
    "",
    buildSurveyResponseSummaryText(input),
    buildVoiceTranscriptText(input.turns),
    "",
    "Open the CX dashboard responses ledger and follow up promptly.",
  ].join("\n");

  return {
    subject: `Action required — ${buildCompletionEmailSubject({
      company: input.company,
      contactName: input.contactName,
      result: input.overallResult,
      fallback: "Voice of Clients Survey Response",
    })}`,
    html,
    text,
  };
}

type ClientNotifyResult =
  | { sent: true }
  | {
      sent: false;
      reason:
        | "smtp_not_configured"
        | "no_pending_invite"
        | "response_not_found"
        | "response_incomplete";
    };

type TeamNotifyResult =
  | { sent: true; recipients: string[]; cc: string[] }
  | {
      sent: false;
      reason:
        | "smtp_not_configured"
        | "already_sent"
        | "no_recipients"
        | "response_not_found"
        | "response_incomplete";
    };

export type SurveyCompletionNotifyResult = {
  client: ClientNotifyResult;
  team: TeamNotifyResult;
};

async function sendClientThankYouEmail(
  responseId: string
): Promise<ClientNotifyResult> {
  if (!isSmtpConfigured()) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const invite = await db.surveyInvite.findFirst({
    where: {
      responseId,
      thankYouSentAt: null,
      email: { not: "" },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      customerName: true,
    },
  });

  if (!invite) {
    return { sent: false, reason: "no_pending_invite" };
  }

  const response = await db.response.findUnique({
    where: { id: responseId },
    select: {
      csatScore: true,
      cesScore: true,
      npsScore: true,
      answers: true,
      completedAt: true,
      createdAt: true,
    },
  });

  if (!response) {
    return { sent: false, reason: "response_not_found" };
  }

  if (!isCompleteSurveyResponse(response)) {
    return { sent: false, reason: "response_incomplete" };
  }

  const answers = Array.isArray(response.answers)
    ? (response.answers as Answer[])
    : [];

  let testimonialAsk: ThankYouTestimonialAsk | null = null;
  try {
    testimonialAsk = await prepareThankYouTestimonial({
      responseId,
      surveyInviteId: invite.id,
      scores: response,
      answers,
    });
  } catch (error) {
    console.error("testimonial request skipped", error);
  }

  const rendered = renderSurveyThankYouEmail({
    recipient: {
      email: invite.email,
      firstName: invite.firstName ?? undefined,
      lastName: invite.lastName ?? undefined,
      company: invite.company ?? undefined,
      customerName: invite.customerName ?? undefined,
    },
    completedAt: response.completedAt ?? response.createdAt,
    csatScore: response.csatScore,
    cesScore: response.cesScore,
    npsScore: response.npsScore,
    answers,
    testimonialAsk,
  });

  try {
    await sendSurveyInviteEmail({
      to: invite.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo: getTeamNotifyRecipients()[0],
    });
  } catch (error) {
    await recordSurveyInviteActivity({
      inviteId: invite.id,
      type: "failed",
      templateId: "thank-you",
      message: error instanceof Error ? error.message : "send failed",
    });
    throw error;
  }

  await db.surveyInvite.update({
    where: { id: invite.id },
    data: { thankYouSentAt: new Date() },
  });

  if (testimonialAsk) {
    try {
      await markTestimonialRequested(testimonialAsk.id);
    } catch (error) {
      console.error("testimonial requestedAt update failed", error);
    }
  }

  await recordSurveyInviteActivity({
    inviteId: invite.id,
    type: "thank_you",
    templateId: "thank-you",
  });

  return { sent: true };
}

async function sendTeamNotifyEmail(
  responseId: string
): Promise<TeamNotifyResult> {
  if (!isSmtpConfigured()) {
    return { sent: false, reason: "smtp_not_configured" };
  }

  const recipients = getTeamNotifyRecipients();
  if (!recipients.length) {
    return { sent: false, reason: "no_recipients" };
  }

  const response = await db.response.findUnique({
    where: { id: responseId },
    select: {
      conversationId: true,
      csatScore: true,
      cesScore: true,
      npsScore: true,
      answers: true,
      completedAt: true,
      createdAt: true,
      language: true,
      rawPayload: true,
      teamNotifySentAt: true,
      client: {
        select: {
          name: true,
          company: true,
          designation: true,
        },
      },
      surveyInvite: {
        select: {
          email: true,
          customerName: true,
          company: true,
          department: true,
          serviceName: true,
          partner: true,
          partnerEmail: true,
          businessManagerName: true,
          businessManagerEmail: true,
          jobManagerName: true,
          jobManagerEmail: true,
          teamLeader: true,
          projectId: true,
        },
      },
    },
  });

  if (!response) {
    return { sent: false, reason: "response_not_found" };
  }

  if (!isCompleteSurveyResponse(response)) {
    return { sent: false, reason: "response_incomplete" };
  }

  if (response.teamNotifySentAt) {
    return { sent: false, reason: "already_sent" };
  }

  const answers = Array.isArray(response.answers)
    ? (response.answers as Answer[])
    : [];
  const completedAt = response.completedAt ?? response.createdAt;
  const invite = response.surveyInvite;

  const context: RespondentContext = {
    name: invite?.customerName ?? response.client?.name ?? null,
    company: invite?.company ?? response.client?.company ?? null,
    designation: response.client?.designation ?? null,
    inviteEmail: invite?.email ?? null,
    department: invite?.department ?? null,
    serviceName: invite?.serviceName ?? null,
    partner: invite?.partner ?? null,
    partnerEmail: invite?.partnerEmail ?? null,
    businessManagerName: invite?.businessManagerName ?? null,
    businessManagerEmail: invite?.businessManagerEmail ?? null,
    jobManagerName: invite?.jobManagerName ?? null,
    jobManagerEmail: invite?.jobManagerEmail ?? null,
    teamLeader: invite?.teamLeader ?? null,
    projectId: invite?.projectId ?? null,
    channel: response.conversationId.startsWith("typed_") ? "typed" : "voice",
    language: response.language,
  };
  const overallResult = overallSurveyResult(response);
  const company = context.company;
  const contactName = context.name;
  const turns = buildSurveyTranscriptView({
    csatScore: response.csatScore,
    cesScore: response.cesScore,
    npsScore: response.npsScore,
    answers,
    rawPayload: response.rawPayload,
  }).turns;

  const rendered = renderSurveyTeamNotifyEmail({
    completedAt,
    csatScore: response.csatScore,
    cesScore: response.cesScore,
    npsScore: response.npsScore,
    answers,
    context,
    overallResult,
    company,
    contactName,
    turns,
  });
  const staffCc = invite
    ? await resolveCompletionCcEmails(invite)
    : [];
  const recipientKeys = new Set(recipients.map((email) => email.toLowerCase()));
  const cc = staffCc.filter((email) => !recipientKeys.has(email.toLowerCase()));

  await sendSurveyInviteEmailToRecipients({
    to: recipients,
    cc,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });

  if (overallResult === "Negative") {
    const action = renderSurveyTeamActionRequiredEmail({
      completedAt,
      csatScore: response.csatScore,
      cesScore: response.cesScore,
      npsScore: response.npsScore,
      answers,
      context,
      overallResult,
      company,
      contactName,
      turns,
    });
    await sendSurveyInviteEmailToRecipients({
      to: recipients,
      cc,
      subject: action.subject,
      text: action.text,
      html: action.html,
    });
  }

  await db.response.update({
    where: { id: responseId },
    data: { teamNotifySentAt: new Date() },
  });

  return { sent: true, recipients, cc };
}

export async function sendSurveyCompletionNotifications(
  responseId: string
): Promise<SurveyCompletionNotifyResult> {
  const response = await db.response.findUnique({
    where: { id: responseId },
    select: {
      csatScore: true,
      cesScore: true,
      npsScore: true,
    },
  });

  if (!response || !isCompleteSurveyResponse(response)) {
    return {
      client: { sent: false, reason: "response_incomplete" },
      team: { sent: false, reason: "response_incomplete" },
    };
  }

  const client = await sendClientThankYouEmail(responseId);
  const team = await sendTeamNotifyEmail(responseId);

  if (!client.sent) {
    console.info(
      `survey completion client email skipped for ${responseId}: ${client.reason}`
    );
  } else {
    console.info(`survey completion client email sent for ${responseId}`);
  }
  if (!team.sent) {
    console.info(
      `survey completion team email skipped for ${responseId}: ${team.reason}`
    );
  } else {
    console.info(
      `survey completion team email sent for ${responseId} to ${team.recipients.join(", ")}${team.cc.length ? ` cc ${team.cc.join(", ")}` : ""}`
    );
  }

  return { client, team };
}

/** @deprecated Use sendSurveyCompletionNotifications */
export async function maybeSendSurveyThankYouEmail(responseId: string) {
  const result = await sendClientThankYouEmail(responseId);
  if (result.sent) {
    return { sent: true as const };
  }
  return result;
}
