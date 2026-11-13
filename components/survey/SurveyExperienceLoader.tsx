"use client";

import { useSearchParams } from "next/navigation";
import SurveyExperience from "./SurveyExperience";

export default function SurveyExperienceLoader() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite")?.trim() || null;

  return <SurveyExperience inviteToken={inviteToken} />;
}
