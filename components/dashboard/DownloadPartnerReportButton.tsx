"use client";

import { useEffect, useState } from "react";
import type { DashboardWindow } from "@/lib/dashboard-analytics";
import type { DashboardOrgFilters } from "@/lib/dashboard-report-filters";
import styles from "./dashboard.module.css";

type DownloadPartnerReportButtonProps = {
  window: DashboardWindow;
  org: DashboardOrgFilters;
  partnerName: string;
  disabled?: boolean;
};

export default function DownloadPartnerReportButton({
  window,
  org,
  partnerName,
  disabled = false,
}: DownloadPartnerReportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDisabled = mounted && (disabled || exporting || !partnerName);

  async function handleDownload() {
    if (exporting || disabled || !partnerName) return;
    setExporting(true);
    setError("");
    try {
      const response = await fetch("/api/reports/partner-cx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          window,
          partner: partnerName,
          department: org.department,
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
          body?.error ?? "Unable to generate the partner CX report."
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const matched = /filename="([^"]+)"/i.exec(disposition);
      const filename =
        matched?.[1] ??
        `rsm-partner-report-${new Date().toISOString().slice(0, 10)}.pdf`;

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
    <div className={styles.downloadButtonStack}>
      <button
        type="button"
        className={styles.downloadReportButton}
        onClick={() => void handleDownload()}
        disabled={isDisabled}
        aria-busy={exporting}
        title={
          partnerName
            ? `Download ${partnerName}'s own Voice of Clients report`
            : "Select a single partner to download their report"
        }
      >
        {exporting ? "Preparing PDF…" : "Partner PDF"}
      </button>
      {error ? (
        <p className={styles.downloadReportError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
