import { z } from "zod";

/**
 * Name → email lookup for Engagement Partners and Team Leaders, used to CC them
 * on internal completion emails. Configured server-side as JSON in
 * `SURVEY_STAFF_DIRECTORY`, e.g. `{"Full Name":"name@rsm.com.kw"}`, because
 * invites store these people by display name only.
 */

export function normalizeStaffName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getStaffDirectory(): Map<string, string> {
  const directory = new Map<string, string>();
  const raw = process.env.SURVEY_STAFF_DIRECTORY?.trim();
  if (!raw) return directory;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("SURVEY_STAFF_DIRECTORY is not valid JSON; staff CC disabled.");
    return directory;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    console.warn("SURVEY_STAFF_DIRECTORY must be a JSON object; staff CC disabled.");
    return directory;
  }

  for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
    const email = typeof value === "string" ? value.trim() : "";
    const key = normalizeStaffName(name);
    if (!key || !z.string().email().safeParse(email).success) {
      console.warn(`SURVEY_STAFF_DIRECTORY entry skipped (invalid email) for "${name}".`);
      continue;
    }
    directory.set(key, email);
  }
  return directory;
}

/** Emails for the given staff names, de-duplicated; unknown names are skipped. */
export function lookupStaffEmails(names: Array<string | null | undefined>): string[] {
  const directory = getStaffDirectory();
  if (!directory.size) return [];

  const emails: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (!name?.trim()) continue;
    const email = directory.get(normalizeStaffName(name));
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    emails.push(email);
  }
  return emails;
}
