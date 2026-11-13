import { getCrmProvider, getEmailProvider, getLmsProvider, getMessagingProvider } from "@/lib/providers";

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

/** Configuration status only — never returns secret values. */
export function providerStatus() {
  return [
    { kind: "email", provider: getEmailProvider().name, configured: getEmailProvider().isConfigured() },
    {
      kind: "email_events",
      provider: "sendgrid-signed-webhook",
      configured: present("SENDGRID_WEBHOOK_PUBLIC_KEY"),
    },
    { kind: "crm", provider: getCrmProvider().name, configured: getCrmProvider().isConfigured() },
    { kind: "voice", provider: "elevenlabs", configured: present("ELEVENLABS_API_KEY") },
    { kind: "ai", provider: "openai", configured: present("OPENAI_API_KEY") },
    {
      kind: "whatsapp",
      provider: getMessagingProvider("whatsapp").name,
      configured: getMessagingProvider("whatsapp").isConfigured(),
    },
    { kind: "sms", provider: getMessagingProvider("sms").name, configured: getMessagingProvider("sms").isConfigured() },
    { kind: "lms", provider: getLmsProvider().name, configured: true },
    {
      kind: "secret_storage",
      provider: "aes-256-gcm",
      configured: present("INTEGRATION_ENCRYPTION_KEY"),
    },
  ];
}
