import { dispatchCrmStatusWebhook, isCrmStatusWebhookConfigured } from "@/lib/crm/status-webhook";
import {
  isMailConfigured,
  sendSurveyInviteEmailToRecipients,
} from "@/lib/survey-invite-email";
import {
  ProviderNotConfiguredError,
  type CrmProvider,
  type EmailProvider,
  type LmsProvider,
  type MessagingProvider,
} from "@/lib/providers/types";

export * from "@/lib/providers/types";

export const sendgridEmailProvider: EmailProvider = {
  name: "sendgrid",
  isConfigured: isMailConfigured,
  async send(input) {
    if (!isMailConfigured()) throw new ProviderNotConfiguredError("sendgrid");
    const result = await sendSurveyInviteEmailToRecipients({
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { providerMessageId: result?.messageId ?? null };
  },
};

function noopMessaging(channel: "whatsapp" | "sms"): MessagingProvider {
  return {
    name: `${channel}-unconfigured`,
    channel,
    isConfigured: () => false,
    async send() {
      throw new ProviderNotConfiguredError(`${channel} provider`);
    },
  };
}

export const webhookCrmProvider: CrmProvider = {
  name: "crm-status-webhook",
  isConfigured: isCrmStatusWebhookConfigured,
  async pushSurveyStatus(input) {
    const result = await dispatchCrmStatusWebhook(input);
    return { delivered: result.delivered };
  },
};

export const manualLmsProvider: LmsProvider = {
  name: "manual",
  async enroll() {
    return { externalId: null };
  },
};

let emailOverride: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  return emailOverride ?? sendgridEmailProvider;
}

/** Test seam; production code never calls this. */
export function setEmailProviderForTests(provider: EmailProvider | null) {
  emailOverride = provider;
}

export function getMessagingProvider(channel: "whatsapp" | "sms"): MessagingProvider {
  return noopMessaging(channel);
}

export function getCrmProvider(): CrmProvider {
  return webhookCrmProvider;
}

export function getLmsProvider(): LmsProvider {
  return manualLmsProvider;
}
