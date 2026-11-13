import type { DashboardInsight } from "@/components/dashboard/types";
import { csvCell } from "@/lib/csv";

export const DASHBOARD_INSIGHTS_EXPORT_LIMIT = 500;

export function clientHistoryKey(item: DashboardInsight) {
  const email = item.client?.email?.trim().toLowerCase();
  if (email) return `email:${email}`;

  const name = item.client?.name?.trim().toLowerCase() || "unknown";
  const company = item.client?.company?.trim().toLowerCase() || "unknown";
  return `name:${name}|company:${company}`;
}

export function clientHistoryLabel(item: DashboardInsight) {
  const email = item.client?.email?.trim();
  const name = item.client?.name?.trim() || "Not provided";
  const company = item.client?.company?.trim();
  if (email && company) return `${name} · ${company} · ${email}`;
  if (email) return `${name} · ${email}`;
  if (company) return `${name} · ${company}`;
  return name;
}

export function emailHistoryKey(item: DashboardInsight) {
  const email = item.client?.email?.trim().toLowerCase();
  return email ? `email:${email}` : "email:none";
}

export function emailHistoryLabel(item: DashboardInsight) {
  const email = item.client?.email?.trim();
  return email || "No email on file";
}

export function groupDashboardInsightsByClient(items: DashboardInsight[]) {
  return groupDashboardInsights(items, clientHistoryKey, clientHistoryLabel);
}

export function groupDashboardInsightsByEmail(items: DashboardInsight[]) {
  return groupDashboardInsights(items, emailHistoryKey, emailHistoryLabel);
}

function groupDashboardInsights(
  items: DashboardInsight[],
  keyFor: (item: DashboardInsight) => string,
  labelFor: (item: DashboardInsight) => string
) {
  const groups = new Map<
    string,
    { key: string; label: string; items: DashboardInsight[] }
  >();

  for (const item of items) {
    const key = keyFor(item);
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    groups.set(key, {
      key,
      label: labelFor(item),
      items: [item],
    });
  }

  return Array.from(groups.values()).map((group) => {
    const latest = group.items[0];
    return {
      ...group,
      latest,
    };
  });
}

export function sortDashboardInsightsByRecency(items: DashboardInsight[]) {
  return [...items].sort(
    (a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)
  );
}

export function matchesDashboardInsightSearch(
  item: DashboardInsight,
  query: string
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const comments = item.answers
    .map((answer) => answer.comments ?? "")
    .join(" ");
  const haystack = [
    item.client?.name,
    item.client?.email,
    item.client?.company,
    item.client?.designation,
    item.source,
    item.sentiment,
    item.department,
    item.partner,
    item.summary,
    comments,
    item.conversationId,
    item.responseId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

const EXPORT_HEADERS = [
  "submittedAt",
  "name",
  "company",
  "designation",
  "email",
  "source",
  "csat",
  "ces",
  "nps",
  "comments",
  "department",
  "partner",
  "sentiment",
] as const;

function insightComments(item: DashboardInsight) {
  return item.answers
    .filter((answer) => answer.comments?.trim())
    .map(
      (answer) =>
        `${(answer.metric ?? `q${answer.questionNumber}`).toUpperCase()}: ${answer.comments}`
    )
    .join(" | ");
}

function insightExportValues(item: DashboardInsight) {
  return [
    item.submittedAt,
    item.client?.name ?? "",
    item.client?.company ?? "",
    item.client?.designation ?? "",
    item.client?.email ?? "",
    item.source,
    item.metrics.csat,
    item.metrics.ces,
    item.metrics.nps,
    insightComments(item),
    item.department ?? "",
    item.partner ?? "",
    item.sentiment ?? "",
  ] as const;
}

export function dashboardInsightsToCsv(items: DashboardInsight[]) {
  const rows = items.map((item) =>
    insightExportValues(item).map(csvCell).join(",")
  );
  return [EXPORT_HEADERS.join(","), ...rows].join("\n");
}

function excelEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function excelCell(value: string | number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${excelEscape(value == null ? "" : String(value))}</Data></Cell>`;
}

export function dashboardInsightsToExcel(items: DashboardInsight[]) {
  const headerRow = `<Row>${EXPORT_HEADERS.map((header) => excelCell(header)).join("")}</Row>`;
  const dataRows = items
    .map((item) => {
      const values = insightExportValues(item);
      return `<Row>${values.map((value) => excelCell(value === "" ? "" : value)).join("")}</Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Responses">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>
`;
}

export function downloadDashboardInsightsCsv(
  items: DashboardInsight[],
  filename: string
) {
  const blob = new Blob([dashboardInsightsToCsv(items)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDashboardInsightsExcel(
  items: DashboardInsight[],
  filename: string
) {
  const blob = new Blob([dashboardInsightsToExcel(items)], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
