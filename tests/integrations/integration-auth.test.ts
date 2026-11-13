import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import {
  IntegrationAuthError,
  isSurveyInviteApiAuthorized,
  requireSurveyInviteApiKey,
} from "@/lib/integration-auth";

function authorizedRequest(token: string) {
  return new NextRequest(
    "https://rsm-voc-platform.vercel.app/api/integrations/survey-invites",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
    }
  );
}

describe("survey invite integration auth", () => {
  beforeEach(() => {
    process.env.SURVEY_INVITE_API_KEY = "test-integration-key";
  });

  it("authorizes a valid bearer token", () => {
    expect(
      isSurveyInviteApiAuthorized(authorizedRequest("test-integration-key"))
    ).toBe(true);
  });

  it("rejects missing authorization", () => {
    const request = new NextRequest(
      "https://rsm-voc-platform.vercel.app/api/integrations/survey-invites",
      { method: "POST" }
    );

    expect(isSurveyInviteApiAuthorized(request)).toBe(false);
  });

  it("rejects wrong bearer tokens", () => {
    expect(
      isSurveyInviteApiAuthorized(authorizedRequest("wrong-key"))
    ).toBe(false);
  });

  it("rejects tokens with different lengths without throwing", () => {
    expect(
      isSurveyInviteApiAuthorized(authorizedRequest("short"))
    ).toBe(false);
  });

  it("fails closed when the API key is not configured", () => {
    delete process.env.SURVEY_INVITE_API_KEY;

    expect(
      isSurveyInviteApiAuthorized(authorizedRequest("test-integration-key"))
    ).toBe(false);
  });

  it("throws IntegrationAuthError when required auth is missing", () => {
    expect(() =>
      requireSurveyInviteApiKey(
        new NextRequest(
          "https://rsm-voc-platform.vercel.app/api/integrations/survey-invites",
          { method: "POST" }
        )
      )
    ).toThrow(IntegrationAuthError);
  });
});
