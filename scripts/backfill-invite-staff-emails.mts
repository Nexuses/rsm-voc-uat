/**
 * Backfill missing SurveyInvite staff emails from StaffContact / name map.
 *
 * Fills partnerEmail / businessManagerEmail / jobManagerEmail when the name
 * is set but the email is null, using directory contacts (and the known
 * portfolio list as a fallback).
 *
 * Usage:
 *   npx tsx scripts/backfill-invite-staff-emails.mts
 *   BACKFILL_INVITE_EMAILS_DRY_RUN=1 npx tsx scripts/backfill-invite-staff-emails.mts
 */
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const dryRun = process.env.BACKFILL_INVITE_EMAILS_DRY_RUN === "1";

const FALLBACK: Array<{ name: string; email: string }> = [
  { name: "Ahmed Abdelatif", email: "ahmed.abdelatif@rsm.com.kw" },
  { name: "Ahmed Nawar", email: "ahmed.nawar@rsm.com.kw" },
  { name: "Amany Abdelrazek", email: "amany.abdelrazek@rsm.com.kw" },
  { name: "Bhaskar Maheshwari", email: "bhaskar.maheshwari@rsm.com.kw" },
  { name: "Firas Georges", email: "firas.georges@rsm.com.kw" },
  { name: "Kareem Abu Eid", email: "kareem.abueid@rsm.com.kw" },
  { name: "Khalid Salah", email: "khalid.salah@rsm.com.kw" },
  { name: "Latif Ozus", email: "latif.ozus@rsm.com.kw" },
  { name: "Mahmoud El Sada", email: "mahmoud.elsada@rsm.com.kw" },
  { name: "Mai El Shabassy", email: "mai.elshabassy@rsm.com.kw" },
  { name: "Mina Ghopres", email: "mina.ghopres@rsm.com.kw" },
  { name: "Mohamed Helal", email: "mohamed.helal@rsm.com.kw" },
  { name: "Mohamed Osama", email: "mohamed.osama@rsm.com.kw" },
  { name: "Mohamed Shehata", email: "mohamed.shehata@rsm.com.kw" },
  { name: "Mohamed Zaki", email: "mohamed.zaki@rsm.com.kw" },
  { name: "Mohammad Shuaib", email: "mohammad.shuaib@rsm.com.kw" },
  { name: "Nayef Al Yaseen", email: "nayef.alyaseen@rsm.com.kw" },
  { name: "Nayer Abdelmeguid", email: "nayer.abdelmeguid@rsm.com.kw" },
  { name: "Ravi Kumar", email: "ravi.kumar@rsm.com.kw" },
  { name: "Shrikant Reddy", email: "shrikant.reddy@rsm.com.kw" },
  { name: "Sriram Gopalakrishnan", email: "sriram.gopalakrishnan@rsm.com.kw" },
  { name: "Suvrat Mehta", email: "suvrat.mehta@rsm.com.kw" },
  { name: "Tuhin Chaturvedi", email: "tuhin.chaturvedi@rsm.com.kw" },
  { name: "Walaa El Attar", email: "walaa.elattar@rsm.com.kw" },
  { name: "Walid Ghaly", email: "walid.ghaly@rsm.com.kw" },
];

const { db } = await import("../lib/db");
const { normalizeStaffName } = await import("../lib/survey-staff-directory");

const emailByName = new Map<string, string>();
for (const person of FALLBACK) {
  emailByName.set(normalizeStaffName(person.name), person.email.toLowerCase());
}

const contacts = await db.staffContact.findMany({
  where: {
    role: { in: ["partner", "business_manager", "job_manager"] },
    email: { not: null },
  },
  select: { nameKey: true, email: true },
});
for (const contact of contacts) {
  const email = contact.email?.trim().toLowerCase();
  if (email) emailByName.set(contact.nameKey, email);
}

function lookup(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  return emailByName.get(normalizeStaffName(name)) ?? null;
}

const invites = await db.surveyInvite.findMany({
  where: {
    OR: [
      { AND: [{ partner: { not: null } }, { partnerEmail: null }] },
      {
        AND: [
          { businessManagerName: { not: null } },
          { businessManagerEmail: null },
        ],
      },
      { AND: [{ jobManagerName: { not: null } }, { jobManagerEmail: null }] },
    ],
  },
  select: {
    id: true,
    partner: true,
    partnerEmail: true,
    businessManagerName: true,
    businessManagerEmail: true,
    jobManagerName: true,
    jobManagerEmail: true,
  },
});

let updated = 0;
let skipped = 0;

for (const invite of invites) {
  const partnerEmail =
    invite.partnerEmail?.trim() || lookup(invite.partner) || null;
  const businessManagerEmail =
    invite.businessManagerEmail?.trim() ||
    lookup(invite.businessManagerName) ||
    null;
  const jobManagerEmail =
    invite.jobManagerEmail?.trim() || lookup(invite.jobManagerName) || null;

  const data: {
    partnerEmail?: string;
    businessManagerEmail?: string;
    jobManagerEmail?: string;
  } = {};
  if (!invite.partnerEmail && partnerEmail) data.partnerEmail = partnerEmail;
  if (!invite.businessManagerEmail && businessManagerEmail) {
    data.businessManagerEmail = businessManagerEmail;
  }
  if (!invite.jobManagerEmail && jobManagerEmail) {
    data.jobManagerEmail = jobManagerEmail;
  }

  if (Object.keys(data).length === 0) {
    skipped += 1;
    continue;
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Backfill invite ${invite.id}: ${JSON.stringify(data)}`
  );
  if (!dryRun) {
    await db.surveyInvite.update({ where: { id: invite.id }, data });
  }
  updated += 1;
}

console.log(
  `${dryRun ? "Dry run: would update" : "Updated"} ${updated} invites; ${skipped} had no directory match.`
);
await db.$disconnect();
