import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { lookupStaffEmails, normalizeStaffName } from "@/lib/survey-staff-directory";
import {
  directoryRoleUsesEmail,
  type DirectoryRole,
} from "@/lib/survey-directory";
import type { SurveyRecipient } from "@/lib/survey-outreach";

export type StaffRole = "partner" | "business_manager" | "job_manager";

const emailSchema = z.string().email();

function cleanName(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  return trimmed || null;
}

function cleanEmail(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !emailSchema.safeParse(trimmed).success) return null;
  return trimmed;
}

export async function upsertStaffContact(input: {
  role: DirectoryRole;
  name: string | null | undefined;
  email?: string | null;
}) {
  const name = cleanName(input.name);
  if (!name) return;
  const nameKey = normalizeStaffName(name);
  const email = directoryRoleUsesEmail(input.role) ? cleanEmail(input.email) : null;

  const existing = await db.staffContact.findUnique({
    where: { role_nameKey: { role: input.role, nameKey } },
  });

  if (!existing) {
    await db.staffContact.create({
      data: {
        id: randomUUID(),
        role: input.role,
        name,
        nameKey,
        email,
      },
    });
    return;
  }

  if (!existing.email && email) {
    await db.staffContact.update({
      where: { id: existing.id },
      data: { email },
    });
  }
}

export async function upsertStaffContactsFromRecipient(recipient: SurveyRecipient) {
  await Promise.all([
    upsertStaffContact({ role: "department", name: recipient.department }),
    upsertStaffContact({ role: "service", name: recipient.serviceName }),
    upsertStaffContact({
      role: "partner",
      name: recipient.partner,
      email: recipient.partnerEmail,
    }),
    upsertStaffContact({
      role: "business_manager",
      name: recipient.businessManagerName,
      email: recipient.businessManagerEmail,
    }),
    upsertStaffContact({
      role: "job_manager",
      name: recipient.jobManagerName,
      email: recipient.jobManagerEmail,
    }),
    upsertStaffContact({ role: "team_leader", name: recipient.teamLeader }),
  ]);
}

export async function lookupStaffContactEmail(
  role: StaffRole,
  name: string | null | undefined
) {
  const cleaned = cleanName(name);
  if (!cleaned) return null;
  const row = await db.staffContact.findUnique({
    where: { role_nameKey: { role, nameKey: normalizeStaffName(cleaned) } },
    select: { email: true },
  });
  return cleanEmail(row?.email);
}

type CcSlot = {
  role: StaffRole;
  name: string | null;
  email: string | null;
};

/** Invite email, then the staff master, then SURVEY_STAFF_DIRECTORY. */
export async function resolveCompletionCcEmails(invite: {
  partner: string | null;
  partnerEmail: string | null;
  businessManagerName: string | null;
  businessManagerEmail: string | null;
  jobManagerName: string | null;
  jobManagerEmail: string | null;
}) {
  const slots: CcSlot[] = [
    { role: "partner", name: invite.partner, email: invite.partnerEmail },
    {
      role: "business_manager",
      name: invite.businessManagerName,
      email: invite.businessManagerEmail,
    },
    {
      role: "job_manager",
      name: invite.jobManagerName,
      email: invite.jobManagerEmail,
    },
  ];

  const emails: string[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    const direct = cleanEmail(slot.email);
    const fromMaster = direct
      ? null
      : await lookupStaffContactEmail(slot.role, slot.name);
    const fromDirectory =
      direct || fromMaster ? null : lookupStaffEmails([slot.name])[0] ?? null;
    const chosen = direct ?? fromMaster ?? fromDirectory;
    if (!chosen || seen.has(chosen.toLowerCase())) continue;
    seen.add(chosen.toLowerCase());
    emails.push(chosen);
  }
  return emails;
}

export type InviteFieldSuggestions = {
  departments: string[];
  services: string[];
  partners: string[];
  partnerEmails: string[];
  partnerEmailByName: Record<string, string>;
  businessManagers: string[];
  businessManagerEmails: string[];
  businessManagerEmailByName: Record<string, string>;
  jobManagers: string[];
  jobManagerEmails: string[];
  jobManagerEmailByName: Record<string, string>;
  teamLeaders: string[];
};

type DirectorySuggestionRow = {
  role: string;
  name: string;
  email: string | null;
};

function namesForRole(rows: DirectorySuggestionRow[], role: string) {
  return uniqueSorted(
    rows.filter((row) => row.role === role).map((row) => row.name)
  );
}

function emailsForRole(rows: DirectorySuggestionRow[], role: string) {
  return uniqueSorted(
    rows.filter((row) => row.role === role).map((row) => cleanEmail(row.email))
  );
}

function emailByName(rows: DirectorySuggestionRow[], role: string) {
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row.role !== role) continue;
    const email = cleanEmail(row.email);
    const name = cleanName(row.name);
    if (!email || !name) continue;
    map[normalizeStaffName(name)] = email;
  }
  return map;
}

export function suggestionsFromDirectory(
  rows: DirectorySuggestionRow[]
): InviteFieldSuggestions {
  return {
    departments: namesForRole(rows, "department"),
    services: namesForRole(rows, "service"),
    partners: namesForRole(rows, "partner"),
    partnerEmails: emailsForRole(rows, "partner"),
    partnerEmailByName: emailByName(rows, "partner"),
    businessManagers: namesForRole(rows, "business_manager"),
    businessManagerEmails: emailsForRole(rows, "business_manager"),
    businessManagerEmailByName: emailByName(rows, "business_manager"),
    jobManagers: namesForRole(rows, "job_manager"),
    jobManagerEmails: emailsForRole(rows, "job_manager"),
    jobManagerEmailByName: emailByName(rows, "job_manager"),
    teamLeaders: namesForRole(rows, "team_leader"),
  };
}

function uniqueSorted(values: Array<string | null | undefined>) {
  const seen = new Map<string, string>();
  for (const value of values) {
    const cleaned = cleanName(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key)) seen.set(key, cleaned);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export async function listInviteFieldSuggestions(): Promise<InviteFieldSuggestions> {
  const rows = await db.staffContact.findMany({
    select: { role: true, name: true, email: true },
  });
  return suggestionsFromDirectory(rows);
}
