"use client";

import { useEffect, useState } from "react";
import type { DashboardWindow } from "@/lib/dashboard-analytics";
import type { DashboardOrgFilters } from "@/lib/dashboard-report-filters";
import type { MetricKind } from "@/lib/metric-report-content";
import styles from "./dashboard.module.css";

type DownloadMetricReportButtonProps = {
  metric: MetricKind;
  window: DashboardWindow;
  org: DashboardOrgFilters;
  disabled?: boolean;
};

export default function DownloadMetricReportButton({
  metric,
  window,
  org,
  disabled = false,
}: DownloadMetricReportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDisabled = mounted && (disabled || exporting);

  async function handleDownload() {
    if (exporting || disabled) return;
    setExporting(true);
    setError("");
    try {
      const response = await fetch("/api/reports/metric-cx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          metric,
          window,
          department: org.department,
          partner: org.partner,
          service: org.service,
          businessManager: org.businessManager,
          jobManager: org.jobManager,
          dateFrom: org.dateFrom,
          dateTo: org.dateTo,
          company: org.company,
          respondent: org.respondent,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? `Unable to generate the ${metric.toUpperCase()} report.`
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const matched = /filename="([^"]+)"/i.exec(disposition);
      const filename =
        matched?.[1] ??
        `rsm-${metric}-report-${new Date().toISOString().slice(0, 10)}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Unable to generate the PDF report."
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={styles.metricReportPdfActions}>
      <button
        type="button"
        className={styles.downloadReportButton}
        onClick={() => void handleDownload()}
        disabled={isDisabled}
        aria-busy={exporting}
      >
        {exporting ? "Preparing PDF…" : "PDF Download"}
      </button>
      {error ? (
        <p className={styles.downloadReportError} role="alert">
          {error}
        </p>
      ) : (
        <p className={styles.metricReportPdfHint}>
          Branded one-page {metric.toUpperCase()} report from the selected filters.
        </p>
      )}
    </div>
  );
}
