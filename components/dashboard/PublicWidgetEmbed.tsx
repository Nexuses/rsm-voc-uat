"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildReviewsWidgetEmbedCode,
  buildReviewsWidgetPublicUrl,
  buildWidgetEmbedCode,
  buildWidgetPublicUrl,
  type WidgetMetric,
} from "@/lib/widget-embed";
import styles from "./dashboard.module.css";

const PREVIEW_TARGET_ID = "rsm-voc-metrics-preview";
const PREVIEW_LOADER_ID = "rsm-voc-widget-loader-preview";
const REVIEWS_PREVIEW_TARGET_ID = "rsm-voc-reviews-preview";
const REVIEWS_PREVIEW_LOADER_ID = "rsm-voc-reviews-loader-preview";

const metricOptions: Array<{ value: WidgetMetric; label: string }> = [
  { value: "all", label: "All metrics" },
  { value: "csat", label: "CSAT only" },
  { value: "ces", label: "CES only" },
  { value: "nps", label: "NPS only" },
];

export default function PublicWidgetEmbed() {
  const [metric, setMetric] = useState<WidgetMetric>("all");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [reviewsCopied, setReviewsCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [reviewsLinkCopied, setReviewsLinkCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const embedCode = useMemo(
    () => (origin ? buildWidgetEmbedCode(origin, metric) : ""),
    [metric, origin]
  );

  const reviewsEmbedCode = useMemo(
    () => (origin ? buildReviewsWidgetEmbedCode(origin) : ""),
    [origin]
  );

  const publicLink = useMemo(
    () => (origin ? buildWidgetPublicUrl(origin, metric) : ""),
    [metric, origin]
  );

  const reviewsPublicLink = useMemo(
    () => (origin ? buildReviewsWidgetPublicUrl(origin) : ""),
    [origin]
  );

  useEffect(() => {
    const mount = document.getElementById(PREVIEW_TARGET_ID);
    if (!mount) return;

    document.getElementById(PREVIEW_LOADER_ID)?.remove();
    mount.innerHTML = "";

    const script = document.createElement("script");
    script.id = PREVIEW_LOADER_ID;
    script.src = "/widget.js";
    script.setAttribute("data-api", "/api/public/metrics");
    script.setAttribute("data-metric", metric);
    script.setAttribute("data-target", PREVIEW_TARGET_ID);
    document.body.appendChild(script);

    return () => {
      document.getElementById(PREVIEW_LOADER_ID)?.remove();
    };
  }, [metric]);

  useEffect(() => {
    const mount = document.getElementById(REVIEWS_PREVIEW_TARGET_ID);
    if (!mount) return;

    document.getElementById(REVIEWS_PREVIEW_LOADER_ID)?.remove();
    mount.innerHTML = "";

    const script = document.createElement("script");
    script.id = REVIEWS_PREVIEW_LOADER_ID;
    script.src = "/widget-reviews.js";
    script.setAttribute("data-api", "/api/public/reviews");
    script.setAttribute("data-target", REVIEWS_PREVIEW_TARGET_ID);
    document.body.appendChild(script);

    return () => {
      document.getElementById(REVIEWS_PREVIEW_LOADER_ID)?.remove();
    };
  }, []);

  async function copyEmbed() {
    if (!embedCode) return;
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function copyReviewsEmbed() {
    if (!reviewsEmbedCode) return;
    await navigator.clipboard.writeText(reviewsEmbedCode);
    setReviewsCopied(true);
    window.setTimeout(() => setReviewsCopied(false), 2000);
  }

  async function copyPublicLink() {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2000);
  }

  async function copyReviewsPublicLink() {
    if (!reviewsPublicLink) return;
    await navigator.clipboard.writeText(reviewsPublicLink);
    setReviewsLinkCopied(true);
    window.setTimeout(() => setReviewsLinkCopied(false), 2000);
  }

  return (
    <>
      <section className={styles.widgetSection} aria-label="Public metrics widget">
        <p className={styles.widgetIntro}>
          Embed aggregate CSAT, CES, and NPS on any website, or share the public
          widget page link. The widget reads only the public metrics API and
          never exposes client contact details.
        </p>

        <label className={styles.widgetMetricPicker}>
          <span>Preview metric</span>
          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value as WidgetMetric)}
          >
            {metricOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.widgetPreview}>
          <div id={PREVIEW_TARGET_ID} />
        </div>

        <div className={styles.embedCodeBlock}>
          <div className={styles.embedCodeHeader}>
            <strong>Public page link</strong>
            <button type="button" onClick={copyPublicLink} disabled={!publicLink}>
              {linkCopied ? "Copied" : "Copy link"}
            </button>
          </div>
          <pre>
            <code>{publicLink || "Loading public link..."}</code>
          </pre>
        </div>

        <div className={styles.embedCodeBlock}>
          <div className={styles.embedCodeHeader}>
            <strong>Embed code</strong>
            <button type="button" onClick={copyEmbed} disabled={!embedCode}>
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          <pre>
            <code>{embedCode || "Loading embed snippet..."}</code>
          </pre>
        </div>
      </section>

      <section
        className={styles.widgetSection}
        aria-label="Public recent reviews widget"
      >
        <p className={styles.widgetIntro}>
          Embed a showcase of recent client comments (newest first, up to 12),
          with respondent name and company when available, plus CSAT, CES, and
          NPS scores. Email and phone are never included. Share the dedicated
          reviews page link or the embed snippet.
        </p>

        <div className={styles.widgetPreview}>
          <div id={REVIEWS_PREVIEW_TARGET_ID} />
        </div>

        <div className={styles.embedCodeBlock}>
          <div className={styles.embedCodeHeader}>
            <strong>Reviews public page link</strong>
            <button
              type="button"
              onClick={copyReviewsPublicLink}
              disabled={!reviewsPublicLink}
            >
              {reviewsLinkCopied ? "Copied" : "Copy link"}
            </button>
          </div>
          <pre>
            <code>{reviewsPublicLink || "Loading public link..."}</code>
          </pre>
        </div>

        <div className={styles.embedCodeBlock}>
          <div className={styles.embedCodeHeader}>
            <strong>Reviews embed code</strong>
            <button
              type="button"
              onClick={copyReviewsEmbed}
              disabled={!reviewsEmbedCode}
            >
              {reviewsCopied ? "Copied" : "Copy code"}
            </button>
          </div>
          <pre>
            <code>{reviewsEmbedCode || "Loading embed snippet..."}</code>
          </pre>
        </div>
      </section>
    </>
  );
}
