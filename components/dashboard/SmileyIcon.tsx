import type { SmileyTone } from "@/lib/rating-visuals";

function MiniFace({
  cx,
  mouth,
}: {
  cx: number;
  mouth: "up" | "flat" | "down";
}) {
  const mouthPath =
    mouth === "up"
      ? "M-6 4c3 4 9 4 12 0"
      : mouth === "down"
        ? "M-6 8c3-4 9-4 12 0"
        : "M-6 7h12";

  return (
    <g transform={`translate(${cx} 12)`}>
      <circle cx="0" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="-3.5" cy="-2" r="1.5" fill="currentColor" />
      <circle cx="3.5" cy="-2" r="1.5" fill="currentColor" />
      <path
        d={mouthPath}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

export function AllCsatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 24"
      aria-hidden="true"
      focusable="false"
    >
      <MiniFace cx={12} mouth="up" />
      <MiniFace cx={32} mouth="flat" />
      <MiniFace cx={52} mouth="down" />
    </svg>
  );
}

export function RiskSignalIcon({
  className,
  bold = false,
}: {
  className?: string;
  bold?: boolean;
}) {
  const stroke = bold ? 4.5 : 3;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M32 8 56 52H8L32 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      <path
        d="M32 26v16"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <circle cx="32" cy="48" r={bold ? 3 : 2.5} fill="currentColor" />
    </svg>
  );
}

export default function SmileyIcon({
  tone,
  className,
  bold = false,
}: {
  tone: SmileyTone;
  className?: string;
  bold?: boolean;
}) {
  const stroke = bold ? 4.5 : 3;
  const eyeRadius = bold ? 3.5 : 3;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
      />
      {tone === "very-positive" ? (
        <>
          <path
            d="M20 24c3-4 8-4 12 0M32 24c4-4 9-4 12 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d="M20 42c6 8 18 8 24 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      ) : null}
      {tone === "positive" ? (
        <>
          <circle cx="23" cy="27" r={eyeRadius} fill="currentColor" />
          <circle cx="41" cy="27" r={eyeRadius} fill="currentColor" />
          <path
            d="M22 40c5 6 15 6 20 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      ) : null}
      {tone === "neutral" ? (
        <>
          <circle cx="23" cy="27" r={eyeRadius} fill="currentColor" />
          <circle cx="41" cy="27" r={eyeRadius} fill="currentColor" />
          <path
            d="M22 41h20"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      ) : null}
      {tone === "negative" || tone === "very-negative" ? (
        <>
          <circle cx="23" cy="27" r={eyeRadius} fill="currentColor" />
          <circle cx="41" cy="27" r={eyeRadius} fill="currentColor" />
          <path
            d="M22 44c5-6 15-6 20 0"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </>
      ) : null}
    </svg>
  );
}
