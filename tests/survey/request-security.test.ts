import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { queryRawMock } = vi.hoisted(() => ({
  queryRawMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: queryRawMock,
  },
}));

import {
  clientDigest,
  consumeIntegrationInviteRateLimit,
  consumeSurveyRateLimit,
  validatePublicPost,
} from "@/lib/survey/request-security";

function requestFrom(
  origin: string,
  contentType = "application/json",
  extras?: {
    url?: string;
    host?: string;
    forwardedHost?: string;
    forwardedProto?: string;
    fetchSite?: string;
  }
) {
  const url = extras?.url ?? "https://rsm-voc-platform.vercel.app/api/survey/typed";
  const headers: Record<string, string> = {
    "content-type": contentType,
    origin,
    "sec-fetch-site":
      extras?.fetchSite ??
      (origin === new URL(url).origin ? "same-origin" : "cross-site"),
    "user-agent": "survey-test",
    "x-forwarded-for": "203.0.113.10, 10.0.0.1",
  };
  if (extras?.host) headers.host = extras.host;
  if (extras?.forwardedHost) headers["x-forwarded-host"] = extras.forwardedHost;
  if (extras?.forwardedProto) {
    headers["x-forwarded-proto"] = extras.forwardedProto;
  }

  return new NextRequest(url, {
    method: "POST",
    headers,
    body: "{}",
  });
}

describe("public survey request security", () => {
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;
  const originalSurveyPublicUrl = process.env.SURVEY_PUBLIC_URL;

  beforeEach(() => {
    queryRawMock.mockReset();
    delete process.env.NEXTAUTH_URL;
    delete process.env.SURVEY_PUBLIC_URL;
  });

  afterEach(() => {
    if (originalNextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = originalNextAuthUrl;
    if (originalSurveyPublicUrl === undefined) {
      delete process.env.SURVEY_PUBLIC_URL;
    } else {
      process.env.SURVEY_PUBLIC_URL = originalSurveyPublicUrl;
    }
  });

  it("accepts same-origin JSON posts", () => {
    expect(
      validatePublicPost(
        requestFrom("https://rsm-voc-platform.vercel.app")
      )
    ).toEqual({ ok: true });
  });

  it("rejects cross-origin posts", () => {
    expect(validatePublicPost(requestFrom("https://attacker.example"))).toEqual({
      ok: false,
      status: 403,
      error: "cross-origin request rejected",
    });
  });

  it("accepts public Origin when Next sees an internal URL behind a proxy", () => {
    const request = requestFrom("https://voc.rsmkuwait.example", "application/json", {
      url: "http://127.0.0.1:3000/api/survey/voice-session",
      host: "127.0.0.1:3000",
      forwardedHost: "voc.rsmkuwait.example",
      forwardedProto: "https",
      fetchSite: "same-origin",
    });

    expect(validatePublicPost(request)).toEqual({ ok: true });
  });

  it("accepts Origin matching NEXTAUTH_URL when nextUrl differs", () => {
    process.env.NEXTAUTH_URL = "https://voc.rsmkuwait.example";
    const request = requestFrom("https://voc.rsmkuwait.example", "application/json", {
      url: "http://localhost:3000/api/survey/voice-session",
      host: "localhost:3000",
      fetchSite: "same-origin",
    });

    expect(validatePublicPost(request)).toEqual({ ok: true });
  });

  it("accepts Origin matching SURVEY_PUBLIC_URL", () => {
    process.env.SURVEY_PUBLIC_URL = "https://survey.rsmkuwait.example";
    const request = requestFrom(
      "https://survey.rsmkuwait.example",
      "application/json",
      {
        url: "http://localhost:3000/api/survey/voice-session",
        host: "localhost:3000",
        fetchSite: "same-origin",
      }
    );

    expect(validatePublicPost(request)).toEqual({ ok: true });
  });

  it("still rejects attacker Origin even with forwarded public host", () => {
    const request = requestFrom("https://attacker.example", "application/json", {
      url: "http://127.0.0.1:3000/api/survey/typed",
      host: "127.0.0.1:3000",
      forwardedHost: "voc.rsmkuwait.example",
      forwardedProto: "https",
      fetchSite: "cross-site",
    });

    expect(validatePublicPost(request)).toEqual({
      ok: false,
      status: 403,
      error: "cross-origin request rejected",
    });
  });

  it("rejects non-JSON posts", () => {
    expect(
      validatePublicPost(
        requestFrom(
          "https://rsm-voc-platform.vercel.app",
          "text/plain"
        )
      )
    ).toEqual({
      ok: false,
      status: 415,
      error: "application/json is required",
    });
  });

  it("creates a stable digest without retaining network metadata", () => {
    const request = requestFrom("https://rsm-voc-platform.vercel.app");
    const digest = clientDigest(request, "test-secret");

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).toBe(clientDigest(request, "test-secret"));
    expect(digest).not.toContain("203.0.113.10");
    expect(digest).not.toContain("survey-test");
  });

  it("allows requests at the configured limit", async () => {
    queryRawMock.mockResolvedValue([{ count: 10 }]);

    await expect(
      consumeSurveyRateLimit(
        requestFrom("https://rsm-voc-platform.vercel.app"),
        "voice",
        new Date("2026-06-12T10:07:00.000Z"),
        "test-secret"
      )
    ).resolves.toEqual({
      allowed: true,
      count: 10,
      limit: 10,
      retryAfterSeconds: 180,
    });
  });

  it("blocks requests above each action limit", async () => {
    queryRawMock
      .mockResolvedValueOnce([{ count: 11 }])
      .mockResolvedValueOnce([{ count: 21 }]);
    const request = requestFrom("https://rsm-voc-platform.vercel.app");

    await expect(
      consumeSurveyRateLimit(
        request,
        "voice",
        new Date("2026-06-12T10:07:00.000Z"),
        "test-secret"
      )
    ).resolves.toMatchObject({ allowed: false, limit: 10 });
    await expect(
      consumeSurveyRateLimit(
        request,
        "typed",
        new Date("2026-06-12T10:07:00.000Z"),
        "test-secret"
      )
    ).resolves.toMatchObject({ allowed: false, limit: 20 });
  });

  it("allows integration invite sends within the recipient limit", async () => {
    queryRawMock.mockResolvedValue([{ count: 50 }]);

    await expect(
      consumeIntegrationInviteRateLimit(
        10,
        new Date("2026-06-12T10:07:00.000Z")
      )
    ).resolves.toEqual({
      allowed: true,
      count: 50,
      limit: 100,
      retryAfterSeconds: 180,
    });
  });

  it("blocks integration invite sends above the recipient limit", async () => {
    queryRawMock.mockResolvedValue([{ count: 101 }]);

    await expect(
      consumeIntegrationInviteRateLimit(
        5,
        new Date("2026-06-12T10:07:00.000Z")
      )
    ).resolves.toMatchObject({ allowed: false, limit: 100 });
  });
});
