"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./dashboard.module.css";

type TestimonialRow = {
  id: string;
  createdAt: string;
  submittedAt: string | null;
  kind: string;
  status: string;
  clientText: string | null;
  aiDraft: string | null;
  videoUrl: string | null;
  consentName: boolean | null;
  consentWebsite: boolean | null;
  consentSocial: boolean | null;
  respondentName: string | null;
  company: string | null;
  email: string | null;
  csatScore: number | null;
  cesScore: number | null;
  npsScore: number | null;
  reviewPath: string;
  publishableQuote: string;
};

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "requested", label: "Requested" },
  { value: "submitted", label: "Submitted" },
  { value: "declined", label: "Declined" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

function formatWhen(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuwait",
  }).format(new Date(value));
}

function kindLabel(kind: string) {
  return kind === "original_request" ? "Original request" : "Draft review";
}

export default function DashboardTestimonials() {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = nextStatus ? `?status=${encodeURIComponent(nextStatus)}` : "";
      const response = await fetch(`/api/testimonials${query}`);
      const payload = (await response.json().catch(() => null)) as
        | { testimonials?: TestimonialRow[]; error?: string }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Could not load testimonials");
        setRows([]);
        return;
      }
      setRows(payload?.testimonials ?? []);
    } catch {
      setError("Could not load testimonials");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(status);
  }, [load, status]);

  async function updateStatus(id: string, action: "publish" | "archive") {
    setBusyId(id);
    setNotice(null);
    setError(null);
    try {
      const response = await fetch(`/api/testimonials/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Update failed");
        return;
      }
      setNotice(action === "publish" ? "Marked published." : "Archived.");
      await load(status);
    } catch {
      setError("Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function copyQuote(quote: string) {
    setNotice(null);
    try {
      await navigator.clipboard.writeText(quote);
      setNotice("Publishable quote copied.");
    } catch {
      setError("Could not copy the quote.");
    }
  }

  return (
    <section className={styles.responseSection}>
      <div className={styles.sectionTitle}>
        <div>
          <h2>Testimonials</h2>
          <p>
            Client-approved quotes from Positive surveys. Marking one published records it for use.
            It does not post to the public reviews widget or to social.
          </p>
        </div>
        {!loading && rows.length > 0 ? (
          <strong>
            {rows.length} {rows.length === 1 ? "testimonial" : "testimonials"}
          </strong>
        ) : null}
      </div>

      <div className={styles.testimonialTabs} role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            className={styles.testimonialTab}
            data-active={status === tab.value}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {notice ? <p className={styles.inviteSuccess}>{notice}</p> : null}
      {error ? (
        <p role="alert" className={styles.inviteSuccess}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className={styles.testimonialEmptyState}>Loading testimonials…</div>
      ) : rows.length === 0 ? (
        <div className={styles.testimonialEmptyState}>
          No testimonials in this view yet. Positive surveys with a tracked invite will appear here
          once the thank-you email goes out.
        </div>
      ) : (
        <div className={styles.testimonialList}>
          {rows.map((row) => {
            const clientText = (row.clientText || "").trim();
            const draftText = (row.aiDraft || "").trim();
            const quoteText = clientText || draftText;
            const isDraftOnly = !clientText && Boolean(draftText);
            const canCopy =
              Boolean(row.publishableQuote) &&
              (row.status === "submitted" || row.status === "published");
            const channels = [
              row.consentWebsite ? "Website" : null,
              row.consentSocial ? "Social" : null,
            ].filter((value): value is string => Boolean(value));

            return (
              <article key={row.id} className={styles.testimonialCard}>
                <header className={styles.testimonialCardHead}>
                  <div className={styles.testimonialClient}>
                    <span className={styles.testimonialClientName}>
                      {row.respondentName ?? "Unknown client"}
                    </span>
                    <span className={styles.testimonialClientMeta}>
                      {[row.company, row.email].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                  <div className={styles.testimonialHeadSide}>
                    <span className={styles.testimonialStatus} data-status={row.status}>
                      {row.status}
                    </span>
                    <span className={styles.testimonialDate}>
                      {formatWhen(row.submittedAt ?? row.createdAt)}
                    </span>
                  </div>
                </header>

                {quoteText ? (
                  <figure className={styles.testimonialQuote}>
                    <blockquote>{quoteText}</blockquote>
                    <figcaption>
                      {isDraftOnly
                        ? "AI draft from the client's comments — not yet approved"
                        : "Approved by the client"}
                    </figcaption>
                  </figure>
                ) : (
                  <p className={styles.testimonialEmpty}>
                    {row.status === "declined"
                      ? "The client declined this request."
                      : row.status === "archived"
                        ? "Archived without a submitted testimonial."
                        : "Waiting for the client to write or record a testimonial."}
                  </p>
                )}

                {row.videoUrl ? (
                  <p className={styles.testimonialVideo}>
                    Video:{" "}
                    <a href={row.videoUrl} target="_blank" rel="noreferrer">
                      {row.videoUrl}
                    </a>
                  </p>
                ) : null}

                <div className={styles.testimonialChips}>
                  <span className={styles.testimonialChip}>CSAT {row.csatScore ?? "—"} / 5</span>
                  <span className={styles.testimonialChip}>CES {row.cesScore ?? "—"} / 7</span>
                  <span className={styles.testimonialChip}>NPS {row.npsScore ?? "—"} / 10</span>
                  <span className={styles.testimonialChip}>{kindLabel(row.kind)}</span>
                  <span className={styles.testimonialChip}>
                    {row.consentName == null
                      ? "Name: no answer yet"
                      : row.consentName
                        ? "Name: yes"
                        : "Name: no"}
                  </span>
                  <span className={styles.testimonialChip}>
                    {channels.length ? `Publish to: ${channels.join(", ")}` : "Publish to: —"}
                  </span>
                </div>

                <footer className={styles.testimonialActionsRow}>
                  <button
                    type="button"
                    className={styles.inviteSecondaryButton}
                    disabled={!canCopy}
                    title={canCopy ? undefined : "Available once the client submits with consent"}
                    onClick={() => void copyQuote(row.publishableQuote)}
                  >
                    Copy quote
                  </button>
                  <a className={styles.inviteSecondaryButton} href={row.reviewPath}>
                    Open review
                  </a>
                  {row.status !== "archived" ? (
                    <button
                      type="button"
                      className={styles.inviteSecondaryButton}
                      disabled={busyId === row.id}
                      onClick={() => void updateStatus(row.id, "archive")}
                    >
                      Archive
                    </button>
                  ) : null}
                  {row.status === "submitted" ? (
                    <button
                      type="button"
                      className={styles.invitePrimaryButton}
                      disabled={busyId === row.id}
                      onClick={() => void updateStatus(row.id, "publish")}
                    >
                      Publish
                    </button>
                  ) : row.status === "published" ? (
                    <span className={styles.testimonialPublishedNote}>Published</span>
                  ) : null}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
