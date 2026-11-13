import { NextResponse } from "next/server";
import { HttpError } from "@/lib/api/http-error";
import { isCxAuthError, isCxPermissionError } from "@/lib/auth";
import { databaseUnavailableResponse, isTransientPrismaError } from "@/lib/prisma-errors";

export { HttpError };

export function routeErrorResponse(error: unknown) {
  if (isCxAuthError(error)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isCxPermissionError(error)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (isTransientPrismaError(error)) return databaseUnavailableResponse();
  throw error;
}
