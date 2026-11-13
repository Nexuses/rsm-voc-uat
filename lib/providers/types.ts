import type { CrmStatusInviteFields, CrmSurveyStatus } from "@/lib/crm/status-webhook";

export type ProviderSendResult = { providerMessageId: string | null };

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(input: { to: string; subject: string; text: string; html?: string }): Promise<ProviderSendResult>;
}

export interface MessagingProvider {
  readonly name: string;
  readonly channel: "whatsapp" | "sms";
  isConfigured(): boolean;
  send(input: { to: string; text: string }): Promise<ProviderSendResult>;
}

export interface CrmProvider {
  readonly name: string;
  isConfigured(): boolean;
  pushSurveyStatus(input: {
    status: CrmSurveyStatus;
    invite: CrmStatusInviteFields;
  }): Promise<{ delivered: boolean }>;
}

export interface LmsProvider {
  readonly name: string;
  /** Returns an external enrollment id, or null when enrollment is tracked manually. */
  enroll(input: { employeeEmail: string | null; courseKey: string }): Promise<{ externalId: string | null }>;
}

export class ProviderNotConfiguredError extends Error {
  constructor(readonly provider: string) {
    super(`${provider} is not configured`);
  }
}
