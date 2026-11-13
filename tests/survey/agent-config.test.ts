import { describe, expect, it } from "vitest";
import {
  AGENT_FIRST_MESSAGE,
  AGENT_PROMPT,
  buildAgentUpdate,
} from "@/lib/elevenlabs/agent-config";

describe("RSM ElevenLabs agent update", () => {
  it("uses the approved RSM Kuwait VOC prompt", () => {
    expect(AGENT_FIRST_MESSAGE).toContain("RSM Kuwait");
    expect(AGENT_FIRST_MESSAGE).toContain("{{invite_opening}}");
    expect(AGENT_PROMPT).toContain("RSM In Kuwait - VOC");
    expect(AGENT_PROMPT).toContain("CSAT — Client Satisfaction Score");
    expect(AGENT_PROMPT).toContain("closeSurveyEnglish");
    expect(AGENT_PROMPT).toContain("closeSurveyArabic");
    expect(AGENT_PROMPT).toContain("How satisfied are you with the overall quality of services provided by RSM Kuwait?");
    expect(AGENT_PROMPT).toContain("full name");
    expect(AGENT_PROMPT).toContain("company name");
    expect(AGENT_PROMPT).toContain("position");
    expect(AGENT_PROMPT).toContain("confirmInviteIdentityEnglish");
    expect(AGENT_PROMPT).toContain("confirmInviteIdentityArabic");
    expect(AGENT_PROMPT).toContain("{{invite_full_name}}");
    expect(AGENT_PROMPT).toContain("{{invite_company}}");
    expect(AGENT_PROMPT).toContain("{{invite_designation}}");
    expect(AGENT_PROMPT).toContain("{{has_invite_context}}");
    expect(AGENT_PROMPT).toContain(
      "Never ask for email address, phone number"
    );
    expect(AGENT_PROMPT.toLowerCase()).not.toContain("first name");
    expect(AGENT_PROMPT.toLowerCase()).not.toContain("last name");
  });

  it("configures the fixed analysis fields with correct data types", () => {
    const update = buildAgentUpdate("webhook-test-id");
    const dataCollection = update.platformSettings?.dataCollection;

    expect(Object.keys(dataCollection ?? {}).sort()).toEqual([
      "client_company",
      "client_designation",
      "client_name",
      "language",
      "q1_rating",
      "q1_reason",
      "q2_rating",
      "q2_reason",
      "q3_rating",
      "q3_reason",
    ]);
    expect(dataCollection?.client_name.type).toBe("string");
    expect(dataCollection?.client_company.type).toBe("string");
    expect(dataCollection?.client_designation.type).toBe("string");
    expect(dataCollection?.language).toMatchObject({
      type: "string",
      enum: ["en", "ar"],
    });
    expect(dataCollection?.q1_rating.type).toBe("integer");
    expect(dataCollection?.q1_reason.type).toBe("string");
    expect(dataCollection?.q2_rating.type).toBe("integer");
    expect(dataCollection?.q2_reason.type).toBe("string");
    expect(dataCollection?.q3_rating.type).toBe("integer");
    expect(dataCollection?.q3_reason.type).toBe("string");
  });

  it("enables signed-session authentication for approved web origins", () => {
    const update = buildAgentUpdate("webhook-test-id");

    expect(update.platformSettings?.auth).toEqual({
      enableAuth: true,
      allowlist: [
        { hostname: "rsm-voc-platform.vercel.app" },
        { hostname: "rsm-voc-survey.nexuses.xyz" },
        { hostname: "voc.rsm.com.kw" },
        { hostname: "localhost" },
      ],
      requireOriginHeader: true,
    });
  });

  it("registers empty invite dynamic variable placeholders", () => {
    const update = buildAgentUpdate("webhook-test-id");

    expect(
      update.conversationConfig?.agent?.dynamicVariables
        ?.dynamicVariablePlaceholders
    ).toEqual({
      has_invite_context: "false",
      invite_full_name: "",
      invite_company: "",
      invite_designation: "",
      invite_opening: "May I have your full name, please?",
    });
  });

  it("uses invite_opening in first messages and does not enable firstMessage override", () => {
    const update = buildAgentUpdate("webhook-test-id");

    expect(
      update.platformSettings?.overrides?.conversationConfigOverride?.agent
    ).toMatchObject({
      language: true,
    });
    expect(
      update.platformSettings?.overrides?.conversationConfigOverride?.agent
        ?.firstMessage
    ).toBeFalsy();
    expect(update.conversationConfig?.agent?.firstMessage).toContain(
      "{{invite_opening}}"
    );
    expect(
      update.conversationConfig?.languagePresets?.ar?.overrides?.agent
        ?.firstMessage
    ).toContain("{{invite_opening}}");
  });

  it("attaches the workspace post-call transcript webhook", () => {
    const update = buildAgentUpdate("webhook-test-id");

    expect(update.platformSettings?.workspaceOverrides?.webhooks).toEqual({
      postCallWebhookId: "webhook-test-id",
      events: ["transcript"],
      transcriptFormat: "json",
      sendAudio: false,
    });
  });

  it("enables the end-call built-in tool and silence timeout", () => {
    const update = buildAgentUpdate("webhook-test-id");

    expect(
      update.conversationConfig?.agent?.prompt?.builtInTools?.endCall
    ).toEqual({
      name: "end_call",
      description:
        "End the call immediately after delivering the final thank-you and goodbye through closeSurveyEnglish or closeSurveyArabic, once all three ratings and observations are confirmed and the client does not want to revise anything.",
      params: { systemToolType: "end_call" },
    });
    expect(update.conversationConfig?.turn?.silenceEndCallTimeout).toBe(45);
    expect(AGENT_PROMPT).toContain("invoke the end-call tool");
  });
});
