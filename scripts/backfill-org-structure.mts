/**
 * Build Organization / ServiceLine / Employee / Account / Engagement rows from
 * existing data and link Client, SurveyInvite, and Response to them. Idempotent:
 * only fills null links and upserts by natural keys.
 *
 *   npx tsx scripts/backfill-org-structure.mts           # dry run (read-only)
 *   npx tsx scripts/backfill-org-structure.mts --apply   # write
 */
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apply = process.argv.includes("--apply");

const { db } = await import("../lib/db");
const { normalizeAccountName } = await import("../lib/domain/accounts");
const {
  DEFAULT_ORGANIZATION_ID,
  normalizePersonName,
  planAccounts,
  plannedEmployees,
  plannedServiceLines,
  serviceLineCodeFor,
} = await import("../lib/domain/org-backfill");

const organizationId = DEFAULT_ORGANIZATION_ID;
const summary: Record<string, number> = {};
const bump = (key: string, by = 1) => (summary[key] = (summary[key] ?? 0) + by);

if (apply) {
  await db.organization.upsert({
    where: { slug: "default" },
    create: { id: organizationId, slug: "default", name: "RSM in Kuwait" },
    update: {},
  });
}

// Service lines and partners
const serviceLineIds = new Map<string, string>();
for (const line of plannedServiceLines()) {
  bump("serviceLines");
  if (!apply) continue;
  const row = await db.serviceLine.upsert({
    where: { organizationId_code: { organizationId, code: line.code } },
    create: { id: randomUUID(), organizationId, ...line },
    update: {},
  });
  serviceLineIds.set(line.code, row.id);
}

const employeeIds = new Map<string, string>();
for (const employee of plannedEmployees()) {
  bump("employees");
  if (!apply) continue;
  const row = await db.employee.upsert({
    where: {
      organizationId_normalizedName: {
        organizationId,
        normalizedName: employee.normalizedName,
      },
    },
    create: {
      id: randomUUID(),
      organizationId,
      name: employee.name,
      normalizedName: employee.normalizedName,
      level: employee.level,
      serviceLineId: serviceLineIds.get(employee.serviceLineCode) ?? null,
    },
    update: {},
  });
  employeeIds.set(employee.normalizedName, row.id);
}

// Accounts from company names
const [clients, invites] = await Promise.all([
  db.client.findMany({ select: { id: true, company: true, accountId: true } }),
  db.surveyInvite.findMany({
    select: {
      id: true,
      company: true,
      accountId: true,
      engagementId: true,
      externalEngagementId: true,
      department: true,
      partner: true,
      responseId: true,
    },
  }),
]);
const plannedAccounts = planAccounts([
  ...clients.map((c) => c.company),
  ...invites.map((i) => i.company),
]);
bump("accounts", plannedAccounts.length);

const accountIds = new Map<string, string>();
if (apply) {
  for (const account of plannedAccounts) {
    const row = await db.account.upsert({
      where: {
        organizationId_normalizedName: {
          organizationId,
          normalizedName: account.normalizedName,
        },
      },
      create: { id: randomUUID(), organizationId, ...account },
      update: {},
    });
    accountIds.set(account.normalizedName, row.id);
  }
}

for (const client of clients) {
  if (client.accountId || !client.company) continue;
  bump("clientLinks");
  const accountId = accountIds.get(normalizeAccountName(client.company));
  if (apply && accountId) {
    await db.client.update({ where: { id: client.id }, data: { accountId } });
  }
}

// Engagements from CRM engagement IDs, then invite links
for (const invite of invites) {
  const accountId = invite.company
    ? accountIds.get(normalizeAccountName(invite.company)) ?? null
    : null;
  let engagementId = invite.engagementId;

  if (!engagementId && invite.externalEngagementId) {
    bump("engagementLinks");
    if (apply) {
      const code = serviceLineCodeFor(invite.department);
      const engagement = await db.engagement.upsert({
        where: { externalEngagementId: invite.externalEngagementId },
        create: {
          id: randomUUID(),
          organizationId,
          externalEngagementId: invite.externalEngagementId,
          accountId,
          serviceLineId: code ? serviceLineIds.get(code) ?? null : null,
          partnerEmployeeId: employeeIds.get(normalizePersonName(invite.partner)) ?? null,
        },
        update: {},
      });
      engagementId = engagement.id;
    }
  }

  if (!invite.accountId && accountId) bump("inviteAccountLinks");
  if (apply && ((!invite.accountId && accountId) || engagementId !== invite.engagementId)) {
    await db.surveyInvite.update({
      where: { id: invite.id },
      data: {
        accountId: invite.accountId ?? accountId,
        engagementId,
      },
    });
  }
}

// Responses inherit from their invite first, then their client.
const responses = await db.response.findMany({
  where: { OR: [{ accountId: null }, { engagementId: null }] },
  select: {
    id: true,
    accountId: true,
    engagementId: true,
    client: { select: { accountId: true } },
    surveyInvite: { select: { accountId: true, engagementId: true } },
  },
});
for (const response of responses) {
  const accountId =
    response.accountId ??
    response.surveyInvite?.accountId ??
    response.client?.accountId ??
    null;
  const engagementId = response.engagementId ?? response.surveyInvite?.engagementId ?? null;
  if (accountId === response.accountId && engagementId === response.engagementId) continue;
  bump("responseLinks");
  if (apply) {
    await db.response.update({
      where: { id: response.id },
      data: { accountId, engagementId },
    });
  }
}

console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...summary }, null, 2));
await db.$disconnect();
