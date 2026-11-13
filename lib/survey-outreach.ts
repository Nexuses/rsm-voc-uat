import type { DashboardWindow } from "@/lib/dashboard-analytics";
import { withinDashboardWindow } from "@/lib/dashboard-analytics";
import { getSurveyUrl } from "@/lib/app-base-url";

export const SURVEY_LINK_PLACEHOLDER = "{{survey_link}}";
export const CLIENT_NAME_PLACEHOLDER = "{{client_name}}";

export const CSV_RECIPIENT_COLUMNS = [
  "email",
  "department",
  "service",
  "partner",
  "partneremail",
  "businessmanager",
  "businessmanageremail",
  "jobmanager",
  "jobmanageremail",
  "teamleader",
  "customername",
  "company",
  "designation",
  "projectid",
  "surveyorder",
] as const;

export const SAMPLE_INVITE_CSV = [
  CSV_RECIPIENT_COLUMNS.join(","),
  "client@example.com,Assurance,Audit,Sriram Gopalakrishnan,sriram@example.com,Sara Al-Mutairi,sara@example.com,Omar Al-Rashid,omar@example.com,,Sara Al-Sabah,Acme Holdings,CFO,PRJ-2401,1",
  "ops@company.co,Tax,Tax compliance,Tuhin Chaturvedi,tuhin@example.com,Fahad Al-Ahmad,fahad@example.com,,,,Fahad Al-Ahmad,Ops Co,Director,PRJ-2402,2",
].join("\n");

export const INVITE_RECIPIENT_FIELD_LABELS = {
  department: "Department",
  serviceName: "Service",
  partner: "Partner",
  partnerEmail: "Partner email",
  businessManagerName: "Business manager",
  businessManagerEmail: "Business manager email",
  jobManagerName: "Job manager",
  jobManagerEmail: "Job manager email",
  teamLeader: "Team Leader",
  customerName: "Customer Name",
  company: "Company",
  designation: "Designation",
  projectId: "Project ID",
  surveyOrder: "Survey Order",
} as const;

export type SurveyRecipient = {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  designation?: string;
  department?: string;
  serviceName?: string;
  partner?: string;
  partnerEmail?: string;
  businessManagerName?: string;
  businessManagerEmail?: string;
  jobManagerName?: string;
  jobManagerEmail?: string;
  teamLeader?: string;
  customerName?: string;
  projectId?: string;
  surveyOrder?: string;
  externalEngagementId?: string;
  triggerStage?: "mid" | "post";
  idempotencyKey?: string;
};

export type SurveyInviteRecord = {
  sentAt: string | null;
  openedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  department: string | null;
  partner: string | null;
  company?: string | null;
  customerName?: string | null;
  serviceName?: string | null;
  businessManagerName?: string | null;
  jobManagerName?: string | null;
};

export type SurveyOutreachStats = {
  surveysSent: number;
  responsesReceived: number;
  responseRate: number;
  opensTracked: number;
  startsTracked: number;
};

const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function splitCsvLine(line: string) {
  return line
    .split(/[,;\t]/)
    .map((cell) => cell.trim().replace(/^["']|["']$/g, ""));
}

function readRecipientField(
  row: Record<string, string>,
  aliases: string[]
): string | undefined {
  for (const alias of aliases) {
    const value = row[alias]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function formatRecipientName(recipient: SurveyRecipient): string {
  if (recipient.customerName?.trim()) {
    return recipient.customerName.trim();
  }

  const parts = [recipient.firstName?.trim(), recipient.lastName?.trim()].filter(
    Boolean
  );
  if (parts.length) return parts.join(" ");
  return "Valued Client";
}

function recipientMetadataFromRow(row: Record<string, string>) {
  return {
    department: readRecipientField(row, ["department", "dept"]),
    serviceName: readRecipientField(row, ["service", "servicename", "serviceline"]),
    partner: readRecipientField(row, ["partner", "partnername"]),
    partnerEmail: readRecipientField(row, ["partneremail"]),
    businessManagerName: readRecipientField(row, [
      "businessmanager",
      "businessmanagername",
    ]),
    businessManagerEmail: readRecipientField(row, ["businessmanageremail"]),
    jobManagerName: readRecipientField(row, ["jobmanager", "jobmanagername"]),
    jobManagerEmail: readRecipientField(row, ["jobmanageremail"]),
    teamLeader: readRecipientField(row, ["teamleader", "leader", "teamlead"]),
    customerName: readRecipientField(row, [
      "customername",
      "customer",
      "clientname",
      "name",
    ]),
    projectId: readRecipientField(row, ["projectid", "project", "projectcode"]),
    surveyOrder: readRecipientField(row, ["surveyorder", "order", "sequence"]),
    firstName: readRecipientField(row, ["firstname", "first", "givenname"]),
    lastName: readRecipientField(row, ["lastname", "last", "surname", "familyname"]),
    company: readRecipientField(row, ["company", "organisation", "organization", "org"]),
    designation: readRecipientField(row, [
      "designation",
      "position",
      "title",
      "jobtitle",
      "job",
    ]),
  };
}

export function parseRecipientsFromCsv(csvText: string): SurveyRecipient[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const headerCells = splitCsvLine(lines[0]);
  const headerMap = headerCells.map(normalizeHeader);
  const emailHeaderIndex = headerMap.findIndex((header) =>
    ["email", "emailaddress", "mail"].includes(header)
  );
  const hasHeader = emailHeaderIndex >= 0;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const seen = new Set<string>();
  const recipients: SurveyRecipient[] = [];

  for (const line of dataLines) {
    const cells = splitCsvLine(line);
    if (!cells.length) continue;

    let email: string | undefined;
    let metadata: Partial<ReturnType<typeof recipientMetadataFromRow>> = {};

    if (hasHeader) {
      const row: Record<string, string> = {};
      headerMap.forEach((header, index) => {
        row[header] = cells[index] ?? "";
      });

      email = readRecipientField(row, ["email", "emailaddress", "mail"]);
      metadata = recipientMetadataFromRow(row);
    } else {
      for (const cell of cells) {
        const match = cell.match(emailPattern);
        if (match) {
          email = match[0].toLowerCase();
          break;
        }
      }
    }

    if (!email) continue;
    const normalized = email.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    recipients.push({
      email: normalized,
      ...metadata,
    });
  }

  return recipients;
}

export function parseEmailsFromCsv(csvText: string): string[] {
  return parseRecipientsFromCsv(csvText).map((recipient) => recipient.email);
}

export function dedupeEmails(emails: string[]) {
  const seen = new Set<string>();
  return emails
    .map((email) => email.trim().toLowerCase())
    .filter((email) => {
      if (!email || seen.has(email)) return false;
      seen.add(email);
      return true;
    });
}

export function personalizeInviteBody(
  body: string,
  surveyLink: string,
  recipient?: SurveyRecipient
) {
  let personalized = body;
  if (recipient) {
    const clientName = formatRecipientName(recipient);
    personalized = personalized
      .split(CLIENT_NAME_PLACEHOLDER)
      .join(clientName)
      .split("[Client Name]")
      .join(clientName);
  }

  const genericUrl = getSurveyUrl();
  if (personalized.includes(SURVEY_LINK_PLACEHOLDER)) {
    return personalized.split(SURVEY_LINK_PLACEHOLDER).join(surveyLink);
  }
  if (personalized.includes(genericUrl)) {
    return personalized.split(genericUrl).join(surveyLink);
  }
  return `${personalized.trim()}\n\n${surveyLink}`;
}

export function buildSurveyOutreachStats(
  invites: SurveyInviteRecord[],
  window: DashboardWindow
): SurveyOutreachStats {
  const sentInWindow = invites.filter(
    (invite) => invite.sentAt && withinDashboardWindow(invite.sentAt, window)
  );
  const surveysSent = sentInWindow.length;
  const responsesReceived = sentInWindow.filter((invite) => invite.completedAt).length;
  const opensTracked = sentInWindow.filter((invite) => invite.openedAt).length;
  const startsTracked = sentInWindow.filter((invite) => invite.startedAt).length;

  return {
    surveysSent,
    responsesReceived,
    responseRate: surveysSent
      ? Math.round((responsesReceived / surveysSent) * 100)
      : 0,
    opensTracked,
    startsTracked,
  };
}
