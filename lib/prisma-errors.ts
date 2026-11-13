import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/** Neon / pooler connectivity errors that are safe to retry. */
const TRANSIENT_PRISMA_ERROR_CODES = new Set(["P1001", "P1017"]);

export const DATABASE_UNAVAILABLE_MESSAGE =
  "Database connection was lost. Please try again.";

export function isTransientPrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    TRANSIENT_PRISMA_ERROR_CODES.has(error.code)
  );
}

export function databaseUnavailableResponse() {
  return NextResponse.json(
    { error: DATABASE_UNAVAILABLE_MESSAGE },
    { status: 503 }
  );
}
