/**
 * Calendar-quarter helpers for per-email response overwrite.
 * Quarters are UTC: Q1=Jan–Mar, Q2=Apr–Jun, Q3=Jul–Sep, Q4=Oct–Dec.
 */

export function calendarQuarterKey(date: Date): string {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

export function calendarQuarterRange(date: Date): { start: Date; end: Date } {
  const year = date.getUTCFullYear();
  const quarterIndex = Math.floor(date.getUTCMonth() / 3);
  const start = new Date(Date.UTC(year, quarterIndex * 3, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, quarterIndex * 3 + 3, 1, 0, 0, 0, 0));
  return { start, end };
}

export function normalizeRespondentEmail(
  email: string | null | undefined
): string | null {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return null;
  return trimmed;
}
