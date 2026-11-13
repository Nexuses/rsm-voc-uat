import { csvCell } from "@/lib/csv";
import type { SurveyInviteTrackerRow } from "@/lib/survey-invite-tracking";

const EXPORT_HEADERS = [
  "email",
  "name",
  "company",
  "department",
  "partner",
  "serviceName",
  "businessManagerName",
  "jobManagerName",
  "teamLeader",
  "customerName",
  "projectId",
  "surveyOrder",
  "status",
  "statusLabel",
  "reminderStatus",
  "remindersSent",
  "sentAt",
  "lastReminderSentAt",
  "nextFollowUpAt",
  "remindersStoppedAt",
  "remindersStoppedByUserId",
  "remindersStopReason",
  "followupCount",
  "followup1SentAt",
  "followup2SentAt",
  "nonOpener",
  "nonResponder",
] as const;

function inviteExportValues(invite: SurveyInviteTrackerRow) {
  const nonOpener =
    invite.status === "sent" || invite.status === "reminder_sent";
  const nonResponder = invite.status !== "completed";
  return [
    invite.email,
    invite.name,
    invite.company ?? "",
    invite.department ?? "",
    invite.partner ?? "",
    invite.serviceName ?? "",
    invite.businessManagerName ?? "",
    invite.jobManagerName ?? "",
    invite.teamLeader ?? "",
    invite.customerName ?? "",
    invite.projectId ?? "",
    invite.surveyOrder ?? "",
    invite.status,
    invite.statusLabel,
    invite.reminderStatus,
    `${invite.followupCount} of ${invite.followupMaxCount}`,
    invite.sentAt ?? "",
    invite.lastReminderSentAt ?? "",
    invite.nextFollowUpAt ?? "",
    invite.remindersStoppedAt ?? "",
    invite.remindersStoppedByUserId ?? "",
    invite.remindersStopReason ?? "",
    invite.followupCount,
    invite.followup1SentAt ?? "",
    invite.followup2SentAt ?? "",
    nonOpener ? "yes" : "no",
    nonResponder ? "yes" : "no",
  ] as const;
}

export function inviteTrackerToCsv(invites: SurveyInviteTrackerRow[]) {
  const rows = invites.map((invite) =>
    inviteExportValues(invite).map(csvCell).join(",")
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

export function inviteTrackerToExcel(invites: SurveyInviteTrackerRow[]) {
  const headerRow = `<Row>${EXPORT_HEADERS.map((header) => excelCell(header)).join("")}</Row>`;
  const dataRows = invites
    .map((invite) => {
      const values = inviteExportValues(invite);
      return `<Row>${values.map((value) => excelCell(value === "" ? "" : value)).join("")}</Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Invite tracker">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>
`;
}

export function downloadInviteTrackerCsv(
  invites: SurveyInviteTrackerRow[],
  filename: string
) {
  const blob = new Blob([inviteTrackerToCsv(invites)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadInviteTrackerExcel(
  invites: SurveyInviteTrackerRow[],
  filename: string
) {
  const blob = new Blob([inviteTrackerToExcel(invites)], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
