const PLACEHOLDER = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

export const TEMPLATE_VARIABLES = ["name", "company"] as const;
export type TemplateVariables = Partial<Record<(typeof TEMPLATE_VARIABLES)[number], string | null>>;

/** Replaces known {{placeholders}}; unknown or empty ones become blank. */
export function renderTemplate(text: string, variables: TemplateVariables) {
  return text.replace(PLACEHOLDER, (_match, key: string) => {
    const value = (variables as Record<string, string | null | undefined>)[key];
    return typeof value === "string" ? value.trim() : "";
  });
}

export function unknownPlaceholders(text: string) {
  const unknown = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (!(TEMPLATE_VARIABLES as readonly string[]).includes(match[1])) unknown.add(match[1]);
  }
  return [...unknown];
}
