"use client";

import { useState } from "react";
import type { TestimonialCopy } from "./testimonial-copy";
import styles from "./review.module.css";

type ReviewFormProps = {
  token: string;
  kind: "draft_approval" | "original_request";
  status: string;
  locked: boolean;
  initialText: string;
  videoUrl: string;
  consentName: boolean | null;
  consentWebsite: boolean;
  consentSocial: boolean;
  copy: TestimonialCopy;
};

export default function TestimonialReviewForm(props: ReviewFormProps) {
  const { copy } = props;
  const [clientText, setClientText] = useState(props.initialText);
  const [videoUrl, setVideoUrl] = useState(props.videoUrl);
  const [consentName, setConsentName] = useState<"yes" | "no" | "">(
    props.consentName === true ? "yes" : props.consentName === false ? "no" : ""
  );
  const [consentWebsite, setConsentWebsite] = useState(props.consentWebsite);
  const [consentSocial, setConsentSocial] = useState(props.consentSocial);
  const [approved, setApproved] = useState(props.status === "submitted");
  const [status, setStatus] = useState(props.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"submit" | "decline" | null>(null);

  async function send(action: "submit" | "decline") {
    setError(null);
    setPending(action);
    try {
      const response = await fetch(`/api/testimonial/${encodeURIComponent(props.token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          clientText,
          videoUrl,
          consentName: consentName === "yes" ? true : consentName === "no" ? false : undefined,
          consentWebsite,
          consentSocial,
          approved: action === "submit" ? approved : false,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; status?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? copy.genericError);
        return;
      }
      setStatus(payload?.status === "declined" ? "declined" : "submitted");
    } catch {
      setError(copy.genericError);
    } finally {
      setPending(null);
    }
  }

  if (props.locked) {
    return (
      <section className={styles.card}>
        <h2>
          {props.status === "published"
            ? copy.lockedPublishedTitle
            : copy.lockedClosedTitle}
        </h2>
        <p className={styles.note}>
          {props.status === "published"
            ? copy.lockedPublishedNote
            : copy.lockedClosedNote}
        </p>
        {props.initialText ? (
          <blockquote className={styles.quote}>{props.initialText}</blockquote>
        ) : null}
      </section>
    );
  }

  return (
    <form
      className={styles.card}
      onSubmit={(event) => {
        event.preventDefault();
        void send("submit");
      }}
    >
      <h2>
        {props.kind === "draft_approval"
          ? copy.draftTitle
          : copy.originalTitle}
      </h2>
      <p className={styles.note}>
        {props.kind === "draft_approval" ? copy.draftNote : copy.originalNote}
      </p>
      {status === "submitted" ? (
        <p className={styles.success} role="status">
          {copy.submittedNote}
        </p>
      ) : null}
      {status === "declined" ? (
        <p className={styles.note} role="status">
          {copy.declinedNote}
        </p>
      ) : null}
      <label className={styles.field}>
        <span>{copy.writtenLabel}</span>
        <textarea
          name="clientText"
          rows={6}
          maxLength={2000}
          value={clientText}
          onChange={(event) => setClientText(event.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>{copy.videoLabel}</span>
        <input
          name="videoUrl"
          type="url"
          inputMode="url"
          className={styles.urlInput}
          dir="ltr"
          maxLength={500}
          placeholder="https://"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
        />
      </label>
      <fieldset className={styles.fieldset}>
        <legend>{copy.consentNameLegend}</legend>
        <label>
          <input
            type="radio"
            name="consentName"
            value="yes"
            checked={consentName === "yes"}
            onChange={() => setConsentName("yes")}
            required
          />
          {copy.consentYes}
        </label>
        <label>
          <input
            type="radio"
            name="consentName"
            value="no"
            checked={consentName === "no"}
            onChange={() => setConsentName("no")}
          />
          {copy.consentNo}
        </label>
      </fieldset>
      <fieldset className={styles.fieldset}>
        <legend>{copy.publishLegend}</legend>
        <label>
          <input
            type="checkbox"
            name="consentWebsite"
            checked={consentWebsite}
            onChange={(event) => setConsentWebsite(event.target.checked)}
          />
          {copy.publishWebsite}
        </label>
        <label>
          <input
            type="checkbox"
            name="consentSocial"
            checked={consentSocial}
            onChange={(event) => setConsentSocial(event.target.checked)}
          />
          {copy.publishSocial}
        </label>
      </fieldset>
      <label className={styles.approve}>
        <input
          type="checkbox"
          name="approved"
          checked={approved}
          onChange={(event) => setApproved(event.target.checked)}
          required
        />
        {copy.approveLabel}
      </label>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={pending !== null}>
          {pending === "submit" ? copy.submitting : copy.submit}
        </button>
        <button
          type="button"
          className={styles.secondary}
          disabled={pending !== null}
          onClick={() => void send("decline")}
        >
          {pending === "decline" ? copy.declining : copy.decline}
        </button>
      </div>
    </form>
  );
}
