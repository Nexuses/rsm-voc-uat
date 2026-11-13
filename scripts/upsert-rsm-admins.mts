/**
 * Upsert the RSM Kuwait admin dashboard accounts.
 *
 * Usage (on a host with production DATABASE_URL):
 *
 *   RSM_ADMIN_BOOTSTRAP_PASSWORD="<temporary-password>" \
 *   npx tsx scripts/upsert-rsm-admins.mts
 *
 * Password is never read from source — only from the env var for this run.
 */
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const RSM_ADMIN_EMAILS = [
  "sooraj.mathew@rsm.com.kw",
  "asanta.mathew@rsm.com.kw",
  "lubna.khalid@rsm.com.kw",
  "noha.abdelsayed@rsm.com.kw",
] as const;

const password = process.env.RSM_ADMIN_BOOTSTRAP_PASSWORD;

if (!password) {
  console.error("Set RSM_ADMIN_BOOTSTRAP_PASSWORD for this run.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("RSM_ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const { db } = await import("../lib/db");
const { hashPassword } = await import("../lib/password");
const { ensureSystemRoles } = await import("../lib/rbac/roles");

const { admin } = await ensureSystemRoles();
const passwordHash = await hashPassword(password);

for (const email of RSM_ADMIN_EMAILS) {
  await db.user.upsert({
    where: { email },
    update: {
      role: "admin",
      roleId: admin.id,
      passwordHash,
    },
    create: {
      email,
      role: "admin",
      roleId: admin.id,
      passwordHash,
    },
  });
  console.log(`Upserted admin user ${email}`);
}

await db.$disconnect();
