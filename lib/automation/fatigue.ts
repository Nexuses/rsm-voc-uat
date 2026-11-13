export type FatiguePolicy = {
  maxPerContact: number;
  maxPerAccount?: number | null;
  windowDays: number;
  minIntervalDays: number;
};

export type FatigueDecision =
  | { allowed: true }
  | { allowed: false; reason: "contact_limit" | "account_limit" | "min_interval"; releaseAt: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pure contact-fatigue check. `contactSends` / `accountSends` are send times
 * of messages already delivered (or queued) on the same channel.
 */
export function checkFatigue(input: {
  policy: FatiguePolicy;
  contactSends: Date[];
  accountSends?: Date[];
  now: Date;
}): FatigueDecision {
  const { policy, now } = input;
  const windowStart = now.getTime() - policy.windowDays * DAY_MS;
  const inWindow = (dates: Date[]) =>
    dates.filter((d) => d.getTime() > windowStart).sort((a, b) => a.getTime() - b.getTime());

  const contact = inWindow(input.contactSends);
  const latest = contact[contact.length - 1];
  if (policy.minIntervalDays > 0 && latest) {
    const releaseAt = new Date(latest.getTime() + policy.minIntervalDays * DAY_MS);
    if (releaseAt > now) return { allowed: false, reason: "min_interval", releaseAt };
  }
  if (contact.length >= policy.maxPerContact) {
    const oldest = contact[contact.length - policy.maxPerContact];
    return {
      allowed: false,
      reason: "contact_limit",
      releaseAt: new Date(oldest.getTime() + policy.windowDays * DAY_MS),
    };
  }
  if (policy.maxPerAccount && input.accountSends) {
    const account = inWindow(input.accountSends);
    if (account.length >= policy.maxPerAccount) {
      const oldest = account[account.length - policy.maxPerAccount];
      return {
        allowed: false,
        reason: "account_limit",
        releaseAt: new Date(oldest.getTime() + policy.windowDays * DAY_MS),
      };
    }
  }
  return { allowed: true };
}
