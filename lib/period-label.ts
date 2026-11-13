/** Formats a `YYYY-MM` period as a month label, e.g. `Jun 2026`. */
export function formatPeriodLabel(period: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00.000Z`));
}
