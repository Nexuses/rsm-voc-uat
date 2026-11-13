"use client";

import { useEffect, useState } from "react";
import type { DashboardWindow } from "@/lib/dashboard-analytics";
import type { DashboardOrgFilters } from "@/lib/dashboard-report-filters";
import type { CxReportNarrative } from "@/lib/ai/cx-report-narrative";
import styles from "./dashboard.module.css";

type DownloadAnnualReportButtonProps = {
  window: DashboardWindow;
  org: DashboardOrgFilters;
  disabled?: boolean;
  onNarrativeChange?: (narrative: CxReportNarrative | null) => void;
};

type NarrativeApiResponse = {
  id: string;
  narrative: CxReportNarrative;
  model: string;
};

export default function DownloadAnnualReportButton({
  window,
  org,
  disabled = false,
  onNarrativeChange,
}: DownloadAnnualReportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [phase, setPhase] = useState<"idle" | "narrative" | "pdf">("idle");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDisabled = mounted && (disabled || exporting);

  function filterBody() {
    return {
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
    };
  }

  async function fetchNarrative(): Promise<CxReportNarrative> {
    const response = await fetch("/api/reports/narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(filterBody()),
    });
    const body = (await response.json().catch(() => null)) as
      | (NarrativeApiResponse & { error?: string })
      | null;
    if (!response.ok) {
      throw new Error(body?.error ?? "Unable to generate AI narrative.");
    }
    if (!body?.narrative) {
      throw new Error("Narrative response was empty.");
    }
    return body.narrative;
  }

  async function handleDownload() {
    if (exporting || disabled) return;
    setExporting(true);
    setError("");
    setPhase("narrative");
    try {
      const draft = await fetchNarrative();
      onNarrativeChange?.(draft);

      setPhase("pdf");
      const response = await fetch("/api/reports/annual-cx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          ...filterBody(),
          narrative: draft,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? "Unable to generate the annual CX report."
        );
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const matched = /filename="([^"]+)"/i.exec(disposition);
      const filename =
        matched?.[1] ??
        `rsm-cx-annual-report-${new Date().toISOString().slice(0, 10)}.pdf`;

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
      setPhase("idle");
    }
  }

  const buttonLabel =
    phase === "narrative"
      ? "Drafting narrative…"
      : phase === "pdf"
        ? "Preparing PDF…"
        : "Annual PDF";

  return (
    <div className={styles.downloadButtonStack}>
      <button
        type="button"
        className={styles.downloadReportButtonSecondary}
        onClick={() => void handleDownload()}
        disabled={isDisabled}
        aria-busy={exporting}
        title="Download the full annual CX report with AI narrative"
      >
        {buttonLabel}
      </button>
      {error ? (
        <p className={styles.downloadReportError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
