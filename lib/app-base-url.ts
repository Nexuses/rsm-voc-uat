export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/** Public survey host for invite links (may differ from the CX dashboard origin). */
export function getSurveyPublicOrigin(): string {
  const explicit = process.env.SURVEY_PUBLIC_URL?.trim();
  if (!explicit) return getAppBaseUrl();

  const normalized = explicit.replace(/\/$/, "");
  if (normalized.endsWith("/survey")) {
    return normalized.slice(0, -"/survey".length);
  }
  return normalized;
}

export function getSurveyUrl(): string {
  return `${getSurveyPublicOrigin()}/survey`;
}

/** Dashboard origin used for private per-invite result links. */
export function getResultLinkBaseUrl(): string {
  return getAppBaseUrl();
}
