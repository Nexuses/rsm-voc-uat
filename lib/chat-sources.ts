import type { DashboardAnalyticsItem } from "@/lib/dashboard-analytics";

export type ChatSource = {
  responseId: string;
  company: string | null;
  clientName: string | null;
  submittedAt: string;
  label: string;
};

type SourceClient = {
  name?: string | null;
  company?: string | null;
} | null;

type SourceResponse = {
  id: string;
  completedAt?: Date | null;
  createdAt: Date;
  client?: SourceClient;
};

export function formatRespondentLabel(client: SourceClient): string {
  const company = client?.company?.trim();
  if (company) return company;
  const name = client?.name?.trim();
  if (name) return name;
  return "Unknown respondent";
}

export function toChatSource(response: SourceResponse): ChatSource {
  const label = formatRespondentLabel(response.client ?? null);
  return {
    responseId: response.id,
    company: response.client?.company?.trim() || null,
    clientName: response.client?.name?.trim() || null,
    submittedAt: (response.completedAt ?? response.createdAt).toISOString(),
    label,
  };
}

export function buildThemeAttribution(
  items: DashboardAnalyticsItem[]
): Map<string, string[]> {
  const attribution = new Map<string, string[]>();

  for (const item of items) {
    const label =
      item.company?.trim() ||
      item.clientName?.trim() ||
      "Unknown respondent";

    for (const driver of item.keyDrivers) {
      const theme = driver.trim();
      if (!theme) continue;
      const companies = attribution.get(theme) ?? [];
      if (!companies.includes(label)) companies.push(label);
      attribution.set(theme, companies);
    }
  }

  return attribution;
}

export function formatThemeAttributionContext(
  attribution: Map<string, string[]>
): string {
  if (attribution.size === 0) return "";

  const lines = [...attribution.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([theme, companies]) => `- ${theme}: ${companies.join(", ")}`);

  return `Theme attribution (companies per theme):\n${lines.join("\n")}`;
}

const responseCitationPattern = /\[response:\s*([^\]]+)\]/gi;
const sourceCitationPattern = /\[source:\s*([^\]]+)\]/gi;

export function replaceResponseCitations(
  answer: string,
  sourcesById: Map<string, ChatSource>
): string {
  const withResponseIds = answer.replace(
    responseCitationPattern,
    (match, id: string) => {
      const source = sourcesById.get(id.trim());
      return source ? source.label : match;
    }
  );

  return withResponseIds.replace(
    sourceCitationPattern,
    (_match, label: string) => label.trim()
  );
}

export function extractCitedResponseIds(answer: string): string[] {
  const ids = new Set<string>();
  for (const match of answer.matchAll(responseCitationPattern)) {
    ids.add(match[1].trim());
  }
  return [...ids];
}

export function stripTrailingSourcesLine(answer: string): string {
  return answer.replace(/\n\nSources:\s*[\s\S]+$/, "").trim();
}

export function buildSourcesFooter(sources: ChatSource[]): string {
  const labels = [...new Set(sources.map((source) => source.label))];
  if (!labels.length) return "";
  return `Sources: ${labels.join(", ")}`;
}

export function finalizeChatAnswer(
  rawAnswer: string,
  sourcesById: Map<string, ChatSource>,
  appendSources: ChatSource[]
): { answer: string; footerSources: ChatSource[] } {
  const body = replaceResponseCitations(
    stripTrailingSourcesLine(rawAnswer),
    sourcesById
  );
  const citedIds = extractCitedResponseIds(rawAnswer);
  const citedSources = citedIds.flatMap((id) => {
    const source = sourcesById.get(id);
    return source ? [source] : [];
  });
  const footerSources = uniqueSources([...citedSources, ...appendSources]);
  return { answer: body, footerSources };
}

function uniqueSources(sources: ChatSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.responseId)) return false;
    seen.add(source.responseId);
    return true;
  });
}

export function sourcesForMentionedThemes(
  answer: string,
  themeAttribution: Map<string, string[]>,
  analyticsItems: DashboardAnalyticsItem[]
): ChatSource[] {
  const labelToItem = new Map<string, DashboardAnalyticsItem>();
  for (const item of analyticsItems) {
    const label =
      item.company?.trim() ||
      item.clientName?.trim() ||
      "Unknown respondent";
    if (!labelToItem.has(label)) labelToItem.set(label, item);
  }

  const selectedLabels = new Set<string>();
  const normalizedAnswer = answer.toLowerCase();
  for (const [theme, companies] of themeAttribution) {
    if (normalizedAnswer.includes(theme.toLowerCase())) {
      for (const company of companies) selectedLabels.add(company);
    }
  }

  if (!selectedLabels.size) {
    for (const companies of themeAttribution.values()) {
      for (const company of companies) selectedLabels.add(company);
    }
  }

  return uniqueSources(
    [...selectedLabels].flatMap((label) => {
      const item = labelToItem.get(label);
      if (!item) return [];
      return [
        {
          responseId: item.responseId,
          company: item.company,
          clientName: item.clientName,
          submittedAt: item.submittedAt,
          label,
        },
      ];
    })
  );
}
