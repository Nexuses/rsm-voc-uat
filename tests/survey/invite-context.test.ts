import { describe, expect, it } from "vitest";
import {
  emptySurveyInviteContext,
  inviteContextFromInvite,
  toVoiceDynamicVariables,
  toVoiceInviteContext,
} from "@/lib/survey/invite-context";

describe("invite context helpers", () => {
  it("prefers customerName over first/last for full name", () => {
    expect(
      inviteContextFromInvite({
        customerName: " Sara Al-Sabah ",
        firstName: "Sara",
        lastName: "Ignored",
        email: " sara@example.com ",
        company: " Acme ",
        designation: " CFO ",
      })
    ).toEqual({
      fullName: "Sara Al-Sabah",
      email: "sara@example.com",
      company: "Acme",
      designation: "CFO",
    });
  });

  it("falls back to first and last name when customerName is empty", () => {
    expect(
      inviteContextFromInvite({
        firstName: "Ahmed",
        lastName: "Ali",
        email: "ahmed@example.com",
        company: null,
        designation: undefined,
      })
    ).toEqual({
      fullName: "Ahmed Ali",
      email: "ahmed@example.com",
      company: "",
      designation: "",
    });
  });

  it("returns empty strings for a missing invite", () => {
    expect(emptySurveyInviteContext()).toEqual({
      fullName: "",
      email: "",
      company: "",
      designation: "",
    });
  });

  it("builds voice dynamic variables including empty designation", () => {
    expect(
      toVoiceDynamicVariables(
        toVoiceInviteContext({
          fullName: "Sara Al-Sabah",
          email: "sara@example.com",
          company: "Acme",
          designation: "",
        })
      )
    ).toEqual({
      has_invite_context: "true",
      invite_full_name: "Sara Al-Sabah",
      invite_company: "Acme",
      invite_designation: "",
    });

    expect(
      toVoiceDynamicVariables(toVoiceInviteContext(emptySurveyInviteContext()))
    ).toEqual({
      has_invite_context: "false",
      invite_full_name: "",
      invite_company: "",
      invite_designation: "",
    });
  });
});

