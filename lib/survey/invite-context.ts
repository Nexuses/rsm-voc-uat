import { combineClientName } from "@/lib/survey/schema";

export type SurveyInviteContext = {
  fullName: string;
  email: string;
  company: string;
  designation: string;
};

export type VoiceInviteContext = {
  fullName: string;
  company: string;
  designation: string;
};

export function emptySurveyInviteContext(): SurveyInviteContext {
  return {
    fullName: "",
    email: "",
    company: "",
    designation: "",
  };
}

export function inviteContextFromInvite(invite: {
  customerName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
  designation?: string | null;
}): SurveyInviteContext {
  const fullName =
    invite.customerName?.trim() ||
    combineClientName(invite.firstName ?? undefined, invite.lastName ?? undefined) ||
    "";

  return {
    fullName,
    email: invite.email?.trim() || "",
    company: invite.company?.trim() || "",
    designation: invite.designation?.trim() || "",
  };
}

export function toVoiceInviteContext(
  context: SurveyInviteContext
): VoiceInviteContext {
  return {
    fullName: context.fullName,
    company: context.company,
    designation: context.designation,
  };
}

export function toVoiceDynamicVariables(context: VoiceInviteContext) {
  const hasContext = Boolean(
    context.fullName || context.company || context.designation
  );
  // Use strings for every value — some ConvAI sessions drop boolean vars.
  return {
    has_invite_context: hasContext ? "true" : "false",
    invite_full_name: context.fullName,
    invite_company: context.company,
    invite_designation: context.designation,
  };
}
