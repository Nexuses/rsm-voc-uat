export const SURVEY_VERSION = "three-metric-v2";
export const LEGACY_SURVEY_VERSION = "legacy-v1";

export const SURVEY_QUESTIONS = [
  {
    questionNumber: 1,
    metric: "csat",
    question:
      "How satisfied are you with the overall quality of services provided by RSM in Kuwait?",
    min: 1,
    max: 5,
  },
  {
    questionNumber: 2,
    metric: "ces",
    question:
      "To what extent do you agree: RSM in Kuwait made it easy for me to get the service and support I needed?",
    min: 1,
    max: 7,
  },
  {
    questionNumber: 3,
    metric: "nps",
    question:
      "On a scale from 0 to 10, how likely are you to recommend RSM in Kuwait to a colleague or business associate?",
    min: 0,
    max: 10,
  },
] as const;

export const SURVEY_LANGUAGE = "en";
export const TYPED_CONVERSATION_PREFIX = "typed_";
export const APPROVED_SURVEY_QUESTION = SURVEY_QUESTIONS[0].question;

export type SurveyMetric = (typeof SURVEY_QUESTIONS)[number]["metric"];

export function getSurveyQuestion(questionNumber: number) {
  return SURVEY_QUESTIONS.find(
    (definition) => definition.questionNumber === questionNumber
  );
}
