const DEFAULT_RESULT_LINK_TTL_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resultLinkTtlDays() {
  const raw = Number(process.env.RESULT_LINK_TTL_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RESULT_LINK_TTL_DAYS;
}

/** A result link is valid until revoked or `RESULT_LINK_TTL_DAYS` after sending. */
export function isResultLinkActive(
  invite: { sentAt: Date | null; createdAt: Date; resultRevokedAt: Date | null },
  now = new Date()
) {
  if (invite.resultRevokedAt) return false;
  const issuedAt = invite.sentAt ?? invite.createdAt;
  return now.getTime() - issuedAt.getTime() <= resultLinkTtlDays() * MS_PER_DAY;
}
