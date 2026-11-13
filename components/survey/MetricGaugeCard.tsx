import styles from "./survey.module.css";

type MetricGaugeCardProps = {
  value: number;
  min: number;
  max: number;
  selected: boolean;
  name: string;
  /** Short label under the gauge (often the score itself). */
  label: string;
  description?: string;
  onSelect: () => void;
};

/**
 * Exact RSM tokens only — low / neutral / good.
 * Band by position on the scale (not fill length), so CSAT 1–2 stay
 * mid-grey, 3 blue, 4–5 green. Never tint or invent cyan.
 */
function scoreTone(value: number, min: number, max: number): string {
  const position = (value - min) / Math.max(max - min, 1);
  if (position <= 1 / 3) return "var(--mid-grey)"; // #919093
  if (position <= 2 / 3) return "var(--rsm-blue)"; // #009CDE
  return "var(--rsm-green)"; // #3F9C35
}

/** Polar point on a semicircle: 0 = left, 1 = right (clockwise). */
function arcPoint(
  cx: number,
  cy: number,
  radius: number,
  t: number
): { x: number; y: number } {
  const angle = Math.PI - Math.PI * Math.max(0, Math.min(1, t));
  return {
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  };
}

function semicirclePath(cx: number, cy: number, radius: number): string {
  const start = arcPoint(cx, cy, radius, 0);
  const end = arcPoint(cx, cy, radius, 1);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

export default function MetricGaugeCard({
  value,
  min,
  max,
  selected,
  name,
  label,
  description,
  onSelect,
}: MetricGaugeCardProps) {
  // Discrete steps so the lowest score still shows a short fill (1/n … n/n).
  const steps = Math.max(max - min + 1, 1);
  const intensity = (value - min + 1) / steps;
  const tone = scoreTone(value, min, max);

  const cx = 40;
  const cy = 44;
  const outerR = 30;
  const innerR = 20;
  const arcLen = Math.PI * outerR;
  const filled = intensity * arcLen;
  const needleTip = arcPoint(cx, cy, outerR - 3, intensity);
  const leftCap = arcPoint(cx, cy, outerR, 0);
  const rightCap = arcPoint(cx, cy, outerR, 1);

  return (
    <label className={styles.gaugeCard} data-selected={selected}>
      <input
        type="radio"
        name={name}
        value={value}
        aria-label={String(value)}
        checked={selected}
        onChange={onSelect}
      />
      <span className={styles.gaugeGraphic} aria-hidden="true">
        <svg
          className={styles.gaugeMeter}
          viewBox="0 0 80 54"
          width="80"
          height="54"
        >
          {/* Dual-track speedometer */}
          <path
            d={semicirclePath(cx, cy, outerR)}
            className={styles.gaugeOuterTrack}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={semicirclePath(cx, cy, innerR)}
            className={styles.gaugeInnerTrack}
            fill="none"
            strokeLinecap="round"
          />
          <path
            className={styles.gaugeSweep}
            d={semicirclePath(cx, cy, outerR)}
            fill="none"
            stroke={tone}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${arcLen}`}
          />
          {/* End caps */}
          <circle cx={leftCap.x} cy={leftCap.y} r={1.6} fill="var(--border)" />
          <circle cx={rightCap.x} cy={rightCap.y} r={1.6} fill="var(--border)" />
          {/* Needle */}
          <line
            className={styles.gaugeNeedleArm}
            x1={cx}
            y1={cy}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke={tone}
            strokeLinecap="round"
          />
          <circle
            className={styles.gaugeNeedle}
            cx={cx}
            cy={cy}
            r={4.4}
            fill={tone}
          />
          <circle cx={cx} cy={cy} r={1.7} fill="#fff" />
        </svg>
      </span>
      <strong className={styles.gaugeLabel}>{label}</strong>
      {description ? (
        <small className={styles.gaugeDescription}>{description}</small>
      ) : null}
    </label>
  );
}
