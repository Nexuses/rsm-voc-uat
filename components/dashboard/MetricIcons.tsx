import type { ReactNode } from "react";
import type { MetricKind } from "@/lib/metric-report-content";
import type { SmileyTone } from "@/lib/rating-visuals";
import SmileyIcon from "./SmileyIcon";
import styles from "./dashboard.module.css";

type IconProps = {
  className?: string;
};

function BaseIcon({
  className,
  children,
  viewBox = "0 0 24 24",
}: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      className={className}
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const METRIC_LOGO_SRC: Record<MetricKind, string> = {
  csat: "/metrics/csat.png",
  nps: "/metrics/nps.png",
  ces: "/metrics/ces.png",
};

export function MetricKindIcon({
  kind,
  className,
}: IconProps & { kind: MetricKind }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static brand logos; avoid next/image layout constraints in titles
    <img
      className={className}
      src={METRIC_LOGO_SRC[kind]}
      alt=""
      width={24}
      height={24}
      decoding="async"
      aria-hidden="true"
    />
  );
}

export function SectionIcon({
  section,
  className,
}: IconProps & {
  section: "scale" | "benchmark" | "chart" | "insight" | "improve" | "voices";
}) {
  switch (section) {
    case "scale":
      return (
        <BaseIcon className={className}>
          <path d="M4 20h16" />
          <path d="M7 16V8" />
          <path d="M12 16V5" />
          <path d="M17 16v-6" />
        </BaseIcon>
      );
    case "benchmark":
      return (
        <BaseIcon className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 0 18" />
          <path d="M12 3a14 14 0 0 0 0 18" />
        </BaseIcon>
      );
    case "chart":
      return (
        <BaseIcon className={className}>
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-8" />
          <path d="M22 20v-12" />
        </BaseIcon>
      );
    case "insight":
      return (
        <BaseIcon className={className}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        </BaseIcon>
      );
    case "improve":
      return (
        <BaseIcon className={className}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
        </BaseIcon>
      );
    case "voices":
      return (
        <BaseIcon className={className}>
          <path d="M7 10h.01" />
          <path d="M12 10h.01" />
          <path d="M17 10h.01" />
          <path d="M7 14h10" />
          <path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3V8a2 2 0 0 1 2-2z" />
        </BaseIcon>
      );
  }
}

export function StatusIcon({
  tone,
  className,
}: IconProps & { tone: "hit" | "grow" }) {
  if (tone === "hit") {
    return (
      <BaseIcon className={className}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 5-5.5" />
      </BaseIcon>
    );
  }

  return (
    <BaseIcon className={className}>
      <path d="M4 16l4-5 4 3 5-7" />
      <path d="M15 7h4v4" />
    </BaseIcon>
  );
}

export function InsightAccentIcon({
  kind,
  className,
}: IconProps & { kind: MetricKind }) {
  if (kind === "nps") {
    return <StatusIcon tone="grow" className={className} />;
  }
  if (kind === "ces") {
    return <MetricKindIcon kind="ces" className={className} />;
  }
  return <StatusIcon tone="hit" className={className} />;
}

export function ImprovementAccentIcon({
  kind,
  className,
}: IconProps & { kind: MetricKind }) {
  if (kind === "nps") {
    return (
      <BaseIcon className={className}>
        <path d="M16 19h6" />
        <path d="M16 15h6" />
        <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M2 19h6" />
        <path d="M2 15h6" />
      </BaseIcon>
    );
  }
  if (kind === "ces") {
    return (
      <BaseIcon className={className}>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </BaseIcon>
    );
  }

  return (
    <BaseIcon className={className}>
      <path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18l.9-5.4L4.2 8.7l5.4-.8L12 3z" />
    </BaseIcon>
  );
}

export function ScaleToneIcon({
  tone,
  className,
}: IconProps & { tone: string }) {
  const smileyTone: SmileyTone =
    tone === "positive"
      ? "very-positive"
      : tone === "neutral"
        ? "neutral"
        : "negative";

  return <SmileyIcon tone={smileyTone} className={className} />;
}

export function RatingToneIcon({
  rating,
  className,
}: IconProps & { rating: number }) {
  const tone: SmileyTone =
    rating >= 9 ? "very-positive" : rating >= 6 ? "positive" : "neutral";

  return <SmileyIcon tone={tone} className={className} />;
}

export function MetricTitle({
  kind,
  className,
}: IconProps & { kind: MetricKind }) {
  const labels = { csat: "CSAT", nps: "NPS", ces: "CES" } as const;

  return (
    <span
      className={`${styles.metricTitle} ${className ?? ""}`.trim()}
      data-kind={kind}
    >
      <MetricKindIcon kind={kind} className={styles.metricTitleIcon} />
      <span>{labels[kind]}</span>
    </span>
  );
}

export function ParticipationResponsesIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 18.4 4H5.6a2 2 0 0 0-1.8 1.1z" />
    </BaseIcon>
  );
}

export function ParticipationVoiceIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </BaseIcon>
  );
}

export function ParticipationCompletionIcon({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      <path d="m9 12 2 2 4-4" />
    </BaseIcon>
  );
}
