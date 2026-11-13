import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isAuthorizedCron, safeSecretEqual } from "@/lib/cron-auth";

const URL_BASE = "https://example.test/api/cron/survey-followups";

describe("isAuthorizedCron", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("accepts the bearer header", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    const request = new NextRequest(URL_BASE, {
      headers: { authorization: "Bearer cron-secret-value" },
    });
    expect(isAuthorizedCron(request)).toBe(true);
  });

  it("rejects the query-string secret", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    expect(
      isAuthorizedCron(new NextRequest(`${URL_BASE}?secret=cron-secret-value`))
    ).toBe(false);
  });

  it("rejects a wrong or missing secret", () => {
    process.env.CRON_SECRET = "cron-secret-value";
    expect(
      isAuthorizedCron(
        new NextRequest(URL_BASE, { headers: { authorization: "Bearer nope" } })
      )
    ).toBe(false);
    expect(isAuthorizedCron(new NextRequest(URL_BASE))).toBe(false);
  });

  it("fails closed when CRON_SECRET is unset", () => {
    expect(
      isAuthorizedCron(
        new NextRequest(URL_BASE, { headers: { authorization: "Bearer " } })
      )
    ).toBe(false);
  });

  it("compares secrets of different length without throwing", () => {
    expect(safeSecretEqual("a", "abc")).toBe(false);
    expect(safeSecretEqual("abc", "abc")).toBe(true);
  });
});
