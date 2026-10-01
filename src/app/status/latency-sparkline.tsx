/** Points rendered per sparkline; keeps the strip legible inside narrow cards. */
export const SPARKLINE_POINTS = 30;

/**
 * Latency trend strip for one status component, server-rendered SVG.
 *
 * @param props.points - Daily average latencies, oldest first; null means no data that day.
 * @param props.strokeClass - Text-color utility driving the stroke via `currentColor`.
 * @param props.label - Accessible name for the figure.
 * @returns SVG polyline broken at data gaps, or null when every point is empty.
 */
export function LatencySparkline({
  points,
  strokeClass,
  label,
}: {
  readonly points: readonly (number | null)[];
  readonly strokeClass: string;
  readonly label: string;
}) {
  const windowed = points.slice(-SPARKLINE_POINTS);
  const known = windowed.filter((point): point is number => point !== null);
  if (known.length < 2) return null;
  const max = Math.max(...known, 1);
  const step = 90 / Math.max(windowed.length - 1, 1);
  const dot = (value: number, index: number): string => {
    const x = (index * step).toFixed(1);
    const y = (26 - (value / max) * 24).toFixed(1);
    return `${x},${y}`;
  };
  const segments: string[] = [];
  let current: string[] = [];
  windowed.forEach((point, index) => {
    if (point === null) {
      if (current.length > 1) segments.push(current.join(' '));
      current = [];
      return;
    }
    current.push(dot(point, index));
  });
  if (current.length > 1) segments.push(current.join(' '));
  if (segments.length === 0) return null;
  return (
    <svg
      viewBox="0 0 90 28"
      preserveAspectRatio="none"
      className={`mt-1.5 h-7 w-full ${strokeClass}`}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {segments.map((segment) => (
        <polyline
          key={segment}
          points={segment}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
