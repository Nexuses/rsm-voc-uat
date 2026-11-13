"use client";

import { useEffect } from "react";
import RsmLogo from "@/components/RsmLogo";
import { RSM_BRAND_NAME } from "@/lib/brand";
import type { WidgetMetric } from "@/lib/widget-embed";
import styles from "./public-widget.module.css";

const METRICS_TARGET = "rsm-voc-public-metrics";
const METRICS_LOADER = "rsm-voc-public-metrics-loader";
const REVIEWS_TARGET = "rsm-voc-public-reviews";
const REVIEWS_LOADER = "rsm-voc-public-reviews-loader";

export default function PublicWidgetPageClient({
  variant,
  metric = "all",
}: {
  variant: "metrics" | "reviews";
  metric?: WidgetMetric;
}) {
  useEffect(() => {
    if (variant === "metrics") {
      const mount = document.getElementById(METRICS_TARGET);
      if (!mount) return;
      document.getElementById(METRICS_LOADER)?.remove();
      mount.innerHTML = "";
      const script = document.createElement("script");
      script.id = METRICS_LOADER;
      script.src = "/widget.js";
      script.setAttribute("data-api", "/api/public/metrics");
      script.setAttribute("data-metric", metric);
      script.setAttribute("data-target", METRICS_TARGET);
      document.body.appendChild(script);
      return () => {
        document.getElementById(METRICS_LOADER)?.remove();
      };
    }

    const mount = document.getElementById(REVIEWS_TARGET);
    if (!mount) return;
    document.getElementById(REVIEWS_LOADER)?.remove();
    mount.innerHTML = "";
    const script = document.createElement("script");
    script.id = REVIEWS_LOADER;
    script.src = "/widget-reviews.js";
    script.setAttribute("data-api", "/api/public/reviews");
    script.setAttribute("data-target", REVIEWS_TARGET);
    document.body.appendChild(script);
    return () => {
      document.getElementById(REVIEWS_LOADER)?.remove();
    };
  }, [metric, variant]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <RsmLogo className={styles.logo} />
        <div>
          <p className={styles.eyebrow}>{RSM_BRAND_NAME}</p>
          <h1>
            {variant === "metrics"
              ? "Client experience metrics"
              : "Recent client reviews"}
          </h1>
        </div>
      </header>
      <div className={styles.widgetMount}>
        <div
          id={variant === "metrics" ? METRICS_TARGET : REVIEWS_TARGET}
          aria-live="polite"
        />
      </div>
    </main>
  );
}
