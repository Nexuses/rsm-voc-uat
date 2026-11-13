import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeStaffName } from "@/lib/survey-staff-directory";

export const DIRECTORY_ROLES = [
  "department",
  "service",
  "partner",
  "business_manager",
  "job_manager",
  "team_leader",
] as const;

export type DirectoryRole = (typeof DIRECTORY_ROLES)[number];

const EMAIL_ROLES = new Set<DirectoryRole>([
  "partner",
  "business_manager",
  "job_manager",
]);

const emailSchema = z.string().email();

export class DirectoryRequestError extends Error {
  status: 400 | 404 | 409;

  constructor(status: 400 | 404 | 409, message: string) {
    super(message);
    this.status = status;
  }
}

export function isDirectoryRole(value: string): value is DirectoryRole {
  return (DIRECTORY_ROLES as readonly string[]).includes(value);
}

export function directoryRoleUsesEmail(role: DirectoryRole) {
  return EMAIL_ROLES.has(role);
}

function cleanName(value: unknown) {
  if (typeof value !== "string") {
    throw new DirectoryRequestError(400, "Enter a name.");
  }
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 200) {
    throw new DirectoryRequestError(400, "Enter a name.");
  }
  return name;
}

function cleanEmail(role: DirectoryRole, value: unknown) {
  if (!directoryRoleUsesEmail(role)) {
    if (typeof value === "string" && value.trim()) {
      throw new DirectoryRequestError(400, "This list does not store an email.");
    }
    return null;
  }
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new DirectoryRequestError(400, "Enter a valid email.");
  }
  const email = value.trim();
  if (!email) return null;
  if (!emailSchema.safeParse(email).success) {
    throw new DirectoryRequestError(400, "Enter a valid email.");
  }
  return email;
}

async function assertUniqueName(role: DirectoryRole, nameKey: string, exceptId?: string) {
  const existing = await db.staffContact.findUnique({
    where: { role_nameKey: { role, nameKey } },
    select: { id: true },
  });
  if (existing && existing.id !== exceptId) {
    throw new DirectoryRequestError(409, "That name is already in this list.");
  }
}

function rethrowDuplicate(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new DirectoryRequestError(409, "That name is already in this list.");
  }
  throw error;
}

export async function listDirectoryEntries() {
  return db.staffContact.findMany({
    where: { role: { in: [...DIRECTORY_ROLES] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, role: true, name: true, email: true },
  });
}

export async function createDirectoryEntry(input: {
  role: string;
  name: unknown;
  email?: unknown;
}) {
  if (!isDirectoryRole(input.role)) {
    throw new DirectoryRequestError(400, "Choose a list.");
  }
  const name = cleanName(input.name);
  const email = cleanEmail(input.role, input.email);
  const nameKey = normalizeStaffName(name);
  await assertUniqueName(input.role, nameKey);

  try {
    return await db.staffContact.create({
      data: {
        id: randomUUID(),
        role: input.role,
        name,
        nameKey,
        email,
      },
      select: { id: true, role: true, name: true, email: true },
    });
  } catch (error) {
    rethrowDuplicate(error);
  }
}

export async function updateDirectoryEntry(
  id: string,
  input: { name: unknown; email?: unknown }
) {
  const current = await db.staffContact.findUnique({
    where: { id },
    select: { id: true, role: true, name: true, email: true },
  });
  if (!current || !isDirectoryRole(current.role)) {
    throw new DirectoryRequestError(404, "That entry was not found.");
  }

  const name = cleanName(input.name);
  const email = cleanEmail(current.role, input.email);
  const nameKey = normalizeStaffName(name);
  await assertUniqueName(current.role, nameKey, current.id);

  try {
    const entry = await db.staffContact.update({
      where: { id },
      data: { name, nameKey, email },
      select: { id: true, role: true, name: true, email: true },
    });
    return { previous: current, entry };
  } catch (error) {
    rethrowDuplicate(error);
  }
}

export async function deleteDirectoryEntry(id: string) {
  const current = await db.staffContact.findUnique({
    where: { id },
    select: { id: true, role: true, name: true, email: true },
  });
  if (!current || !isDirectoryRole(current.role)) {
    throw new DirectoryRequestError(404, "That entry was not found.");
  }
  await db.staffContact.delete({ where: { id } });
  return current;
}
