import { Suspense } from "react";
import SurveyExperienceLoader from "@/components/survey/SurveyExperienceLoader";

export default function SurveyPage() {
  return (
    <Suspense fallback={null}>
      <SurveyExperienceLoader />
    </Suspense>
  );
}
