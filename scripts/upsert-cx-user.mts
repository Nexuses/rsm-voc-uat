/**
 * Upsert a single CX / admin dashboard user. Does not seed sample survey rows.
 *
 * Usage (on the host that owns production DATABASE_URL):
 *
 *   CX_SEED_EMAIL="cx.admin@rsm-voc.app" \
 *   CX_SEED_PASSWORD="<strong-password>" \
 *   CX_SEED_ROLE="admin" \
 *   npx tsx scripts/upsert-cx-user.mts
 *
 * CX_SEED_ROLE: "admin" (default) or "cx"
 */
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const email = process.env.CX_SEED_EMAIL?.trim().toLowerCase();
const password = process.env.CX_SEED_PASSWORD;
const roleSlug =
  process.env.CX_SEED_ROLE?.trim().toLowerCase() === "cx" ? "cx" : "admin";

if (!email || !password) {
  console.error("Set both CX_SEED_EMAIL and CX_SEED_PASSWORD.");
  process.exit(1);
}

if (password.length < 12) {
  console.error("CX_SEED_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const { db } = await import("../lib/db");
const { hashPassword } = await import("../lib/password");
const { ensureSystemRoles } = await import("../lib/rbac/roles");

const { admin, cx } = await ensureSystemRoles();
const roleRef = roleSlug === "admin" ? admin : cx;

await db.user.upsert({
  where: { email },
  update: {
    role: roleSlug,
    roleId: roleRef.id,
    passwordHash: await hashPassword(password),
  },
  create: {
    email,
    role: roleSlug,
    roleId: roleRef.id,
    passwordHash: await hashPassword(password),
  },
});

console.log(`Upserted ${roleSlug} user ${email}`);
await db.$disconnect();
