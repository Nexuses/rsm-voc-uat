export function publishableQuote(input: {
  clientText?: string | null;
  aiDraft?: string | null;
  consentName?: boolean | null;
  respondentName?: string | null;
  company?: string | null;
}) {
  const text = (input.clientText || input.aiDraft || "").trim();
  if (!text) return "";
  if (!input.consentName) return text;
  const attribution = [input.respondentName?.trim(), input.company?.trim()]
    .filter((value): value is string => Boolean(value))
    .join(", ");
  return attribution ? `${text}\n— ${attribution}` : text;
}
