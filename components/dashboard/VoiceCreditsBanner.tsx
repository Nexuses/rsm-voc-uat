"use client";

import { useEffect, useState } from "react";
import type { VoiceCreditsStatus } from "@/lib/elevenlabs/subscription";
import styles from "./dashboard.module.css";

export default function VoiceCreditsBanner() {
  const [credits, setCredits] = useState<VoiceCreditsStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/dashboard/voice-credits", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const body = (await response.json()) as VoiceCreditsStatus;
        if (!cancelled) setCredits(body);
      } catch {
        // Banner is advisory; ignore fetch failures.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!credits?.message) return null;
  if (credits.level === "ok" && credits.available) return null;

  const tone =
    credits.level === "exhausted" || !credits.available
      ? "error"
      : credits.level === "critical"
        ? "critical"
        : "warn";

  const resetLabel = credits.resetAt
    ? ` Resets ${new Date(credits.resetAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}.`
    : "";

  return (
    <div
      className={styles.voiceCreditsBanner}
      data-tone={tone}
      role="status"
    >
      <strong>Voice credits</strong>
      <span>
        {credits.message}
        {credits.available && credits.limit > 0
          ? ` Used ${credits.used.toLocaleString()} / ${credits.limit.toLocaleString()} (${credits.percentUsed}%).`
          : ""}
        {resetLabel}
      </span>
    </div>
  );
}
