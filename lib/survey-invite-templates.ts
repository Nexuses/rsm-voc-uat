import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SurveyRecipient } from "@/lib/survey-outreach";
import { formatRecipientName } from "@/lib/survey-outreach";

export type SurveyInviteTemplateId = "invite" | "followup-day3" | "followup-day5";

const TEMPLATE_FILES: Record<SurveyInviteTemplateId, string> = {
  invite: "voc-invite.html",
  "followup-day3": "voc-followup-day3.html",
  "followup-day5": "voc-followup-day5.html",
};

const DEFAULT_SUBJECTS: Record<SurveyInviteTemplateId, string> = {
  invite: "RSM in Kuwait — Share your Voice of Clients feedback",
  "followup-day3": "RSM in Kuwait — Reminder: Voice of Clients feedback",
  "followup-day5": "RSM in Kuwait — Final Reminder: Voice of Clients survey",
};

/**
 * Reminder subjects must clearly say "Reminder" (NEX-919). Prefer the branded
 * reminder subject; if the original invite subject is useful, prefix Reminder.
 */
export function buildFollowupSubject(originalSubject?: string | null) {
  const fallback = DEFAULT_SUBJECTS["followup-day3"];
  const cleaned = (originalSubject ?? "")
    .trim()
    .replace(/^(Re:\s*)+/i, "")
    .replace(/^(RSM in Kuwait\s*[—–-]\s*)?(Final\s+)?Reminder:\s*/i, "")
    .trim();
  if (!cleaned || /voice of client/i.test(cleaned)) return fallback;
  return `RSM in Kuwait — Reminder: ${cleaned}`.slice(0, 200);
}

const EMAIL_CTA_BUTTON_LABEL = "Share Your Feedback";

function buildEmailCtaButton(surveyLink: string): string {
  const href = escapeHtml(surveyLink);
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:12px auto;">
  <tr>
    <td align="center" bgcolor="#009CDE" style="border-radius:4px; background-color:#009CDE;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="8%" stroke="f" fillcolor="#009CDE">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">${EMAIL_CTA_BUTTON_LABEL}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF !important;text-decoration:none;border-radius:4px;line-height:1.2;">${EMAIL_CTA_BUTTON_LABEL}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

/**
 * "Which service am I rating?" context for invite/reminder emails. Renders
 * only the fields the invite actually carries, so recipients without
 * department/service metadata see no empty labels.
 */
export function buildDepartmentServiceBlock(recipient: SurveyRecipient): string {
  const rows: Array<[string, string]> = [];
  const department = recipient.department?.trim();
  const service = recipient.serviceName?.trim();
  if (department) rows.push(["Department", department]);
  if (service) rows.push(["Service", service]);
  if (!rows.length) return "";

  const lines = rows
    .map(
      ([label, value]) =>
        `<p style="margin:0 0 4px 0;"><strong>${label}:</strong> ${escapeHtml(value)}</p>`
    )
    .join("\n");
  return `<div style="margin:0 0 12px 0; padding:12px 14px; background:#F7F9FC; border:1px solid #DDE1E8; color:#333333;">
<p style="margin:0 0 6px 0;">This survey is about the following service:</p>
${lines}
</div>`;
}

const templateCache = new Map<SurveyInviteTemplateId, string>();

function loadTemplate(id: SurveyInviteTemplateId): string {
  const cached = templateCache.get(id);
  if (cached) return cached;

  const filePath = join(process.cwd(), "templates", "email", TEMPLATE_FILES[id]);
  const html = readFileSync(filePath, "utf8");
  templateCache.set(id, html);
  return html;
}

export function getSurveyInviteTemplateSubject(id: SurveyInviteTemplateId): string {
  return DEFAULT_SUBJECTS[id];
}

export function renderSurveyInviteTemplate(
  id: SurveyInviteTemplateId,
  input: { recipient: SurveyRecipient; surveyLink: string }
): { subject: string; html: string; text: string } {
  const clientName = formatRecipientName(input.recipient);
  const html = loadTemplate(id)
    .replaceAll("{{department_service}}", buildDepartmentServiceBlock(input.recipient))
    .replaceAll("{{client_name}}", escapeHtml(clientName))
    .replaceAll("[Client Name]", escapeHtml(clientName))
    .replaceAll("{{survey_link}}", escapeHtml(input.surveyLink))
    .replaceAll("{{cta_button}}", buildEmailCtaButton(input.surveyLink))
    .replaceAll('href="#"', `href="${escapeHtml(input.surveyLink)}"`);

  const text = htmlToPlainText(html, input.surveyLink);

  return {
    subject: DEFAULT_SUBJECTS[id],
    html,
    text,
  };
}

export function renderSurveyFollowupEmail(input: {
  recipient: SurveyRecipient;
  surveyLink: string;
  originalSubject?: string | null;
  templateId?: Extract<SurveyInviteTemplateId, "followup-day3" | "followup-day5">;
}): { subject: string; html: string; text: string } {
  const templateId = input.templateId ?? "followup-day3";
  const rendered = renderSurveyInviteTemplate(templateId, {
    recipient: input.recipient,
    surveyLink: input.surveyLink,
  });
  return {
    ...rendered,
    subject: buildFollowupSubject(input.originalSubject),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlToPlainText(html: string, surveyLink: string): string {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]+>/g, "");
  const decoded = stripped
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const normalized = decoded
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");

  if (!normalized.includes(surveyLink)) {
    return `${normalized}\n\n${surveyLink}`;
  }

  return normalized;
}
