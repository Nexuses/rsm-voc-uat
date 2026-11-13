type Level = "info" | "warn" | "error";

/** One JSON object per line so PM2 / log shippers can parse fields. */
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
    ...(fields.error instanceof Error
      ? { error: fields.error.message }
      : {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
