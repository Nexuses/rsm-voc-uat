/**
 * Provision Partner / Job Manager portfolio dashboard users.
 *
 * Creates (or updates) Users with the system `portfolio` role and upserts
 * matching StaffContact emails so future invites auto-fill staff emails.
 *
 * Usage (on the host that owns DATABASE_URL):
 *
 *   PORTFOLIO_SEED_PASSWORD="<strong-shared-temp-password>" \
 *   npx tsx scripts/provision-portfolio-users.mts
 *
 * Optional:
 *   PORTFOLIO_SEED_DRY_RUN=1  — print actions without writing
 *
 * Deliver the temporary password out of band. Do not commit passwords.
 * Users should change password after first login (Settings → Account is not
 * available to portfolio; an admin can reset via Users, or re-run this script).
 */
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const password = process.env.PORTFOLIO_SEED_PASSWORD;
const dryRun = process.env.PORTFOLIO_SEED_DRY_RUN === "1";

/** Client-provided Partners and Job Managers (Team Leaders). */
const PORTFOLIO_PEOPLE: Array<{
  name: string;
  email: string;
  role: "partner" | "job_manager";
}> = [
  { name: "Ahmed Abdelatif", email: "ahmed.abdelatif@rsm.com.kw", role: "partner" },
  { name: "Ahmed Nawar", email: "ahmed.nawar@rsm.com.kw", role: "partner" },
  { name: "Amany Abdelrazek", email: "amany.abdelrazek@rsm.com.kw", role: "job_manager" },
  { name: "Bhaskar Maheshwari", email: "bhaskar.maheshwari@rsm.com.kw", role: "partner" },
  { name: "Firas Georges", email: "firas.georges@rsm.com.kw", role: "partner" },
  { name: "Kareem Abu Eid", email: "kareem.abueid@rsm.com.kw", role: "partner" },
  { name: "Khalid Salah", email: "khalid.salah@rsm.com.kw", role: "partner" },
  { name: "Latif Ozus", email: "latif.ozus@rsm.com.kw", role: "job_manager" },
  { name: "Mahmoud El Sada", email: "mahmoud.elsada@rsm.com.kw", role: "job_manager" },
  { name: "Mai El Shabassy", email: "mai.elshabassy@rsm.com.kw", role: "job_manager" },
  { name: "Mina Ghopres", email: "mina.ghopres@rsm.com.kw", role: "job_manager" },
  { name: "Mohamed Helal", email: "mohamed.helal@rsm.com.kw", role: "job_manager" },
  { name: "Mohamed Osama", email: "mohamed.osama@rsm.com.kw", role: "partner" },
  { name: "Mohamed Shehata", email: "mohamed.shehata@rsm.com.kw", role: "partner" },
  { name: "Mohamed Zaki", email: "mohamed.zaki@rsm.com.kw", role: "job_manager" },
  { name: "Mohammad Shuaib", email: "mohammad.shuaib@rsm.com.kw", role: "partner" },
  { name: "Nayef Al Yaseen", email: "nayef.alyaseen@rsm.com.kw", role: "partner" },
  { name: "Nayer Abdelmeguid", email: "nayer.abdelmeguid@rsm.com.kw", role: "job_manager" },
  { name: "Ravi Kumar", email: "ravi.kumar@rsm.com.kw", role: "partner" },
  { name: "Shrikant Reddy", email: "shrikant.reddy@rsm.com.kw", role: "partner" },
  { name: "Sriram Gopalakrishnan", email: "sriram.gopalakrishnan@rsm.com.kw", role: "partner" },
  { name: "Suvrat Mehta", email: "suvrat.mehta@rsm.com.kw", role: "partner" },
  { name: "Tuhin Chaturvedi", email: "tuhin.chaturvedi@rsm.com.kw", role: "partner" },
  { name: "Walaa El Attar", email: "walaa.elattar@rsm.com.kw", role: "partner" },
  { name: "Walid Ghaly", email: "walid.ghaly@rsm.com.kw", role: "partner" },
];

if (!password && !dryRun) {
  console.error("Set PORTFOLIO_SEED_PASSWORD (min 12 characters).");
  process.exit(1);
}

if (password && password.length < 12) {
  console.error("PORTFOLIO_SEED_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const { db } = await import("../lib/db");
const { hashPassword } = await import("../lib/password");
const { ensureSystemRoles } = await import("../lib/rbac/roles");
const { upsertStaffContact } = await import("../lib/survey-staff-contacts");
const { SYSTEM_ROLE_SLUGS } = await import("../lib/rbac/permissions");

const { portfolio } = await ensureSystemRoles();
const passwordHash = password ? await hashPassword(password) : null;

let created = 0;
let updated = 0;

for (const person of PORTFOLIO_PEOPLE) {
  const email = person.email.trim().toLowerCase();
  console.log(
    `${dryRun ? "[dry-run] " : ""}Upsert portfolio user ${email} (${person.role})`
  );

  if (!dryRun && passwordHash) {
    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    await db.user.upsert({
      where: { email },
      update: {
        role: SYSTEM_ROLE_SLUGS.portfolio,
        roleId: portfolio.id,
        passwordHash,
        disabledAt: null,
      },
      create: {
        email,
        role: SYSTEM_ROLE_SLUGS.portfolio,
        roleId: portfolio.id,
        passwordHash,
      },
    });
    if (existing) updated += 1;
    else created += 1;

    await upsertStaffContact({
      role: person.role,
      name: person.name,
      email,
    });
  }
}

console.log(
  dryRun
    ? `Dry run: would provision ${PORTFOLIO_PEOPLE.length} portfolio users.`
    : `Done. Created ${created}, updated ${updated}, StaffContact upserts for ${PORTFOLIO_PEOPLE.length}.`
);

await db.$disconnect();
