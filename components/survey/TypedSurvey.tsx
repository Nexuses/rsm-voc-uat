"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SurveyCompleteResult } from "@/lib/survey/complete-result";
import { typedSurveySchema } from "@/lib/survey/schema";
import type { SurveyInviteContext } from "@/lib/survey/invite-context";
import {
  formatLocaleCopy,
  getVoiceLocale,
  type LocalizedSurveyQuestion,
  type SurveyVoiceLanguage,
} from "@/lib/survey/voice-locale";
import SurveyRatingScale from "./SurveyRatingScale";
import SurveyStepLayout from "./SurveyStepLayout";
import SurveyReviewSummary from "./SurveyReviewSummary";
import styles from "./survey.module.css";

type TypedSurveyProps = {
  language: SurveyVoiceLanguage;
  onBack: () => void;
  onComplete: (result?: SurveyCompleteResult) => void;
  inviteToken?: string | null;
};

type FormValues = {
  fullName: string;
  email: string;
  company: string;
  designation: string;
  csatRating: number;
  csatComment: string;
  cesRating: number;
  cesComment: string;
  npsRating: number;
  npsComment: string;
  website: string;
};

type FieldName = keyof FormValues;
type FieldErrors = Partial<Record<FieldName, string>>;

const initialValues: FormValues = {
  fullName: "",
  email: "",
  company: "",
  designation: "",
  csatRating: 0,
  csatComment: "",
  cesRating: 0,
  cesComment: "",
  npsRating: -1,
  npsComment: "",
  website: "",
};

const metricFields = [
  { rating: "csatRating", comment: "csatComment" },
  { rating: "cesRating", comment: "cesComment" },
  { rating: "npsRating", comment: "npsComment" },
] as const;

const TOTAL_STEPS = 5;

export default function TypedSurvey({
  language,
  onBack,
  onComplete,
  inviteToken = null,
}: TypedSurveyProps) {
  const locale = getVoiceLocale(language);
  const copy = locale.typed;
  const formRef = useRef<HTMLFormElement>(null);
  const [submissionId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/survey/invite-context", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ inviteToken }),
        });
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as {
          inviteContext?: Partial<SurveyInviteContext> | null;
        };
        const context = body.inviteContext;
        if (!context || cancelled) return;

        setValues((current) => ({
          ...current,
          fullName: context.fullName?.trim() || current.fullName,
          email: context.email?.trim() || current.email,
          company: context.company?.trim() || current.company,
          designation: context.designation?.trim() || current.designation,
        }));
      } catch {
        // Prefill is best-effort; blank identity step remains usable.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  function updateValue(name: FieldName, value: string | number) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setSubmitError("");
  }

  function goBack() {
    if (step === 0) onBack();
    else setStep((current) => current - 1);
  }

  function continueSurvey() {
    const nextErrors = validateStep(step, values, copy.questions, copy);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const firstInvalid = Object.keys(nextErrors)[0];
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus();
      return;
    }
    setStep((current) => current + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 4) {
      continueSurvey();
      return;
    }

    const payload = {
      submissionId,
      ...values,
      language,
      ...(inviteToken ? { inviteToken } : {}),
    };
    if (!typedSurveySchema.safeParse(payload).success) {
      setSubmitError(copy.reviewError);
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/survey/typed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("submit failed");
      const body = (await response.json().catch(() => null)) as {
        testimonial?: SurveyCompleteResult["testimonial"];
      } | null;
      const testimonial =
        body?.testimonial &&
        typeof body.testimonial.url === "string" &&
        body.testimonial.url &&
        (body.testimonial.kind === "draft_approval" ||
          body.testimonial.kind === "original_request")
          ? body.testimonial
          : null;
      onComplete({
        conversationId: `typed_${submissionId}`,
        testimonial,
      });
    } catch {
      setSubmitError(copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepLabel = formatLocaleCopy(copy.stepLabel, {
    step: step + 1,
    total: TOTAL_STEPS,
  });
  const progressLabel = formatLocaleCopy(copy.progressLabel, {
    step: step + 1,
    total: TOTAL_STEPS,
  });

  const leftMeta = leftColumnForStep(step, copy);
  const identityPreview =
    step === 0
      ? {
          name: values.fullName.trim(),
          role: values.designation.trim(),
          company: values.company.trim(),
          email: values.email.trim(),
          complete: isIdentityComplete(values),
        }
      : null;

  return (
    <section
      className={styles.surveySplitPanel}
      aria-labelledby="typed-heading"
    >
      <form ref={formRef} className={styles.splitForm} onSubmit={handleSubmit}>
        <SurveyStepLayout
          step={step}
          totalSteps={TOTAL_STEPS}
          progressLabel={progressLabel}
          stepPill={stepLabel}
          durationLabel={locale.modeChooser.typedDuration}
          heading={leftMeta.heading}
          // The review step has no separate question: its title lives in the
          // left panel only, so the two columns must not both render it.
          headingId={step === 4 ? "typed-heading" : undefined}
          subheading={leftMeta.subheading}
          introBody={leftMeta.body}
          brandTitle={locale.shell.brandTitle}
          brandSubtitle={locale.shell.brandSubtitle}
          language={language}
          identityPreview={identityPreview}
        >
          {step === 4 ? null : (
            <h3 id="typed-heading" className={styles.splitQuestion}>
              {leftMeta.question}
            </h3>
          )}
          {step === 0 ? (
            <p className={styles.splitQuestionSub}>
              {copy.identityFormSubtitle}
            </p>
          ) : null}

          {step === 0 ? (
            <div className={styles.stepContent}>
              <Field
                label={copy.fullName}
                name="fullName"
                value={values.fullName}
                error={errors.fullName}
                onChange={(value) => updateValue("fullName", value)}
              />
              <Field
                label={copy.email}
                name="email"
                value={values.email}
                error={errors.email}
                type="email"
                onChange={(value) => updateValue("email", value)}
              />
              <Field
                label={copy.company}
                name="company"
                value={values.company}
                error={errors.company}
                onChange={(value) => updateValue("company", value)}
              />
              <Field
                label={copy.designation}
                name="designation"
                value={values.designation}
                error={errors.designation}
                onChange={(value) => updateValue("designation", value)}
              />
            </div>
          ) : null}

          {step >= 1 && step <= 3 ? (
            <MetricStep
              index={step - 1}
              values={values}
              errors={errors}
              copy={copy}
              updateValue={updateValue}
            />
          ) : null}

          {step === 4 ? <Review values={values} copy={copy} /> : null}

          <label className={styles.honeypot} aria-hidden="true">
            Website
            <input
              type="text"
              name="website"
              value={values.website}
              tabIndex={-1}
              autoComplete="off"
              onChange={(event) => updateValue("website", event.target.value)}
            />
          </label>

          {submitError ? (
            <p className={styles.formError} role="alert">
              {submitError}
            </p>
          ) : null}

          <div className={styles.splitActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={goBack}
              disabled={isSubmitting}
            >
              {copy.back}
            </button>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? copy.submitting
                : step === 3
                  ? copy.review
                  : step === 4
                    ? copy.submit
                    : copy.continue}
            </button>
          </div>
        </SurveyStepLayout>
      </form>
    </section>
  );
}

function leftColumnForStep(
  step: number,
  copy: ReturnType<typeof getVoiceLocale>["typed"]
) {
  if (step === 0) {
    return {
      question: copy.identityFormHeading,
      heading: copy.identityTitle,
      body: copy.identityIntro,
    };
  }
  if (step >= 1 && step <= 3) {
    const definition = copy.questions[step - 1];
    const scaleLabel = formatLocaleCopy(copy.scale, {
      min: definition.min,
      max: definition.max,
    });
    return {
      question: definition.question,
      heading: definition.metric.toUpperCase(),
      subheading: copy.metricFullNames[definition.metric],
      body: scaleLabel,
    };
  }
  return {
    // The review step renders this title once, in the left panel. `question`
    // is intentionally empty so the right column does not repeat it.
    question: "",
    heading: copy.reviewTitle,
    // The review card below already labels the respondent block, so the
    // left panel must not repeat "Respondent" here.
    body: "",
  };
}

function ratingLabelsForMetric(
  metric: LocalizedSurveyQuestion["metric"],
  copy: ReturnType<typeof getVoiceLocale>["typed"]
): Record<number, string> {
  if (metric === "ces") return copy.cesRatingLabels;
  if (metric === "nps") return copy.npsRatingLabels;
  return copy.csatRatingLabels;
}

function MetricStep({
  index,
  values,
  errors,
  copy,
  updateValue,
}: {
  index: number;
  values: FormValues;
  errors: FieldErrors;
  copy: ReturnType<typeof getVoiceLocale>["typed"];
  updateValue: (name: FieldName, value: string | number) => void;
}) {
  const definition = copy.questions[index];
  const fields = metricFields[index];
  const rating = values[fields.rating];
  const error = errors[fields.rating];
  const labels = ratingLabelsForMetric(definition.metric, copy);
  const commentLabel = formatLocaleCopy(copy.commentLabel, {
    metric: definition.metric.toUpperCase(),
  });
  return (
    <div className={styles.stepContent}>
      <SurveyRatingScale
        metric={definition.metric}
        name={fields.rating}
        min={definition.min}
        max={definition.max}
        value={rating}
        labels={labels}
        ariaLabel={definition.question}
        copy={copy}
        onSelect={(score) => updateValue(fields.rating, score)}
      />
      {error ? <p className={styles.fieldError}>{error}</p> : null}

      <label className={styles.field}>
        <span>{commentLabel}</span>
        <textarea
          name={fields.comment}
          value={values[fields.comment]}
          maxLength={2000}
          placeholder={copy.commentPlaceholder}
          onChange={(event) =>
            updateValue(fields.comment, event.target.value)
          }
        />
      </label>
    </div>
  );
}

function Review({
  values,
  copy,
}: {
  values: FormValues;
  copy: ReturnType<typeof getVoiceLocale>["typed"];
}) {
  const metrics = copy.questions.map((definition, index) => {
    const fields = metricFields[index];
    const score = values[fields.rating];
    const rated =
      typeof score === "number" && score >= definition.min && score <= definition.max
        ? score
        : null;
    return {
      metric: definition.metric,
      title: `${copy.metricFullNames[definition.metric]} (${definition.metric.toUpperCase()})`,
      score: rated,
      min: definition.min,
      max: definition.max,
      label:
        rated === null
          ? ""
          : (ratingLabelsForMetric(definition.metric, copy)[rated] ?? String(rated)),
      comment: values[fields.comment].trim(),
    };
  });

  return (
    <SurveyReviewSummary
      respondentLabel={copy.respondent}
      fullName={values.fullName}
      email={values.email}
      company={values.company}
      designation={values.designation}
      noComment={copy.noComment}
      metrics={metrics}
    />
  );
}

function Field({
  label,
  name,
  value,
  error,
  type,
  onChange,
}: {
  label: string;
  name: "fullName" | "email" | "company" | "designation";
  value: string;
  error?: string;
  type?: "text" | "email";
  onChange: (value: string) => void;
}) {
  const errorId = `${name}-error`;
  return (
    <label className={styles.field}>
      <span>
        {label}
        <i className={styles.requiredMark} aria-hidden="true">
          *
        </i>
      </span>
      <input
        type={type ?? "text"}
        name={name}
        value={value}
        maxLength={160}
        aria-required="true"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <small id={errorId} className={styles.fieldError}>
          {error}
        </small>
      ) : null}
    </label>
  );
}

function isIdentityComplete(values: FormValues): boolean {
  return (
    values.fullName.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim()) &&
    values.company.trim().length > 1 &&
    values.designation.trim().length > 1
  );
}

function validateStep(
  step: number,
  values: FormValues,
  questions: LocalizedSurveyQuestion[],
  copy: ReturnType<typeof getVoiceLocale>["typed"]
): FieldErrors {
  if (step === 0) {
    const errors: FieldErrors = {};
    if (!values.fullName.trim()) errors.fullName = copy.fullNameRequired;
    if (!values.email.trim()) {
      errors.email = copy.emailRequired;
    } else if (!typedSurveySchema.shape.email.safeParse(values.email).success) {
      errors.email = copy.emailInvalid;
    }
    if (!values.company.trim()) errors.company = copy.companyRequired;
    if (!values.designation.trim()) {
      errors.designation = copy.designationRequired;
    }
    return errors;
  }

  if (step >= 1 && step <= 3) {
    const field = metricFields[step - 1].rating;
    const definition = questions[step - 1];
    const rating = values[field];
    if (rating < definition.min || rating > definition.max) {
      return { [field]: copy.ratingRequired };
    }
  }

  return {};
}
