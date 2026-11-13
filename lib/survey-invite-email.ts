import { z } from "zod";
import { getAppBaseUrl, getSurveyUrl } from "@/lib/app-base-url";
import { getSurveyInviteTemplateSubject } from "@/lib/survey-invite-templates";
import { CSV_RECIPIENT_COLUMNS } from "@/lib/survey-outreach";

export { getAppBaseUrl, getSurveyUrl };

const SENDGRID_MAIL_SEND_URL = "https://api.sendgrid.com/v3/mail/send";

export const surveyInviteSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(20_000),
  html: z.string().trim().min(1).max(200_000).optional(),
});

export type SurveyInviteInput = z.infer<typeof surveyInviteSchema>;

export const SURVEY_INVITE_SENDER_NAME = "RSM in Kuwait";

export function formatSurveyInviteFromAddress(email: string) {
  return `"${SURVEY_INVITE_SENDER_NAME}" <${email.trim()}>`;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY?.trim() && process.env.FROM_EMAIL?.trim());
}

/** @deprecated Use isMailConfigured */
export const isSmtpConfigured = isMailConfigured;

export function getSurveyInviteDefaults() {
  const surveyUrl = getSurveyUrl();
  const defaultTo = process.env.SURVEY_INVITE_DEFAULT_TO?.trim() || "";

  return {
    to: defaultTo,
    subject: getSurveyInviteTemplateSubject("invite"),
    surveyUrl,
    smtpConfigured: isMailConfigured(),
    /** Sync defaults; live cadence comes from SurveyReminderConfig / getSurveyReminderSettings. */
    followupScheduleDays: [3, 6, 9, 12, 15] as const,
    csvColumns: CSV_RECIPIENT_COLUMNS,
  };
}

export type MailAttachment = {
  filename: string;
  type: string;
  content: string;
};

export const MAIL_SEND_MAX_ATTEMPTS = 3;

export function mailSendRetryDelayMs() {
  const raw = process.env.MAIL_SEND_RETRY_DELAY_MS?.trim();
  if (raw === undefined || raw === "") return 400;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 400;
}

function isRetryableMailStatus(status: number) {
  return status === 429 || status >= 500;
}

async function waitForMailRetry(attempt: number) {
  const delay = mailSendRetryDelayMs() * attempt;
  if (delay <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function sendViaSendGrid(input: {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  fromEmail: string;
  apiKey: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}) {
  const content: Array<{ type: string; value: string }> = [
    { type: "text/plain", value: input.text },
  ];
  if (input.html) {
    content.push({ type: "text/html", value: input.html });
  }

  const payload: Record<string, unknown> = {
    personalizations: [
      {
        to: input.to.map((email) => ({ email })),
        ...(input.cc?.length ? { cc: input.cc.map((email) => ({ email })) } : {}),
      },
    ],
    from: {
      email: input.fromEmail,
      name: SURVEY_INVITE_SENDER_NAME,
    },
    subject: input.subject,
    content,
    // Keep links on voc.rsm.com.kw / rsm.com.kw — do not rewrite through SendGrid.
    // Rewritten tracking URLs look untrusted in Outlook and worsen “external” warnings.
    tracking_settings: {
      click_tracking: { enable: false, enable_text: false },
      open_tracking: { enable: false },
      subscription_tracking: { enable: false },
      ganalytics: { enable: false },
    },
    mail_settings: {
      sandbox_mode: { enable: false },
    },
  };

  if (input.replyTo) {
    payload.reply_to = { email: input.replyTo, name: SURVEY_INVITE_SENDER_NAME };
  }

  if (input.attachments?.length) {
    payload.attachments = input.attachments.map((attachment) => ({
      content: attachment.content,
      filename: attachment.filename,
      type: attachment.type,
      disposition: "attachment",
    }));
  }

  for (let attempt = 1; attempt <= MAIL_SEND_MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(SENDGRID_MAIL_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (attempt === MAIL_SEND_MAX_ATTEMPTS) throw error;
      await waitForMailRetry(attempt);
      continue;
    }

    if (response.ok) return response.headers?.get("x-message-id") ?? null;

    const detail = await response.text().catch(() => "");
    const error = new Error(
      `SendGrid mail send failed (${response.status}): ${detail.slice(0, 500)}`
    );
    if (!isRetryableMailStatus(response.status) || attempt === MAIL_SEND_MAX_ATTEMPTS) {
      throw error;
    }
    await waitForMailRetry(attempt);
  }
  return null;
}

export async function sendSurveyInviteEmail(
  input: SurveyInviteInput & { replyTo?: string; cc?: string[] },
): Promise<void> {
  await sendSurveyInviteEmailToRecipients({
    to: [input.to],
    cc: input.cc,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
  });
}

export async function sendSurveyInviteEmailToRecipients(input: {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}): Promise<{ messageId: string | null }> {
  const recipients = input.to.map((email) => email.trim()).filter(Boolean);
  if (!recipients.length) {
    throw new Error("At least one recipient is required");
  }

  // SendGrid rejects a personalization that repeats an address across to/cc.
  const seen = new Set(recipients.map((email) => email.toLowerCase()));
  const cc: string[] = [];
  for (const raw of input.cc ?? []) {
    const email = raw.trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    cc.push(email);
  }

  for (const email of [...recipients, ...cc]) {
    z.string().email().parse(email);
  }

  const subject = z.string().trim().min(1).max(200).parse(input.subject);
  const text = z.string().trim().min(1).max(20_000).parse(input.text);
  const html = input.html
    ? z.string().trim().min(1).max(200_000).parse(input.html)
    : undefined;

  const fromEmail = process.env.FROM_EMAIL?.trim();
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!isMailConfigured() || !fromEmail || !apiKey) {
    throw new Error("Email sending is not configured");
  }

  const messageId = await sendViaSendGrid({
    to: recipients,
    cc,
    subject,
    text,
    html,
    fromEmail,
    apiKey,
    replyTo: input.replyTo,
    attachments: input.attachments,
  });
  return { messageId };
}

/** @deprecated Use sendSurveyInviteEmail */
export const sendSurveyInvite = sendSurveyInviteEmail;
