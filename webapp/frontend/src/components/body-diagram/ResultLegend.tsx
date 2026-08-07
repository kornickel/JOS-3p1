import { divergingGradientCss, sequentialGradientCss } from "../../lib/colorScale";

const TICK_COUNT = 7;
const BAR_WIDTH = "1.25rem";
// Reserves room for bar + tick labels as real box width (not just visual
// overflow), so the absolutely positioned tick labels can never intrude into
// the body silhouettes rendered next to this component.
const LEGEND_WIDTH = "4.5rem";

export function ResultLegend({
  min,
  max,
  unit,
  diverging,
}: {
  min: number;
  max: number;
  unit: string;
  diverging: boolean;
}) {
  const gradient = diverging
    ? divergingGradientCss(12, undefined, "to top")
    : sequentialGradientCss(12, "to top");

  // i=0 sits at the top (max/hottest) of the bar, i=TICK_COUNT-1 at the
  // bottom (min/coldest) -- matches the "to top" gradient direction above,
  // whose first color stop lands at 0% (bottom).
  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const t = i / (TICK_COUNT - 1);
    return { topPercent: t * 100, value: max - t * (max - min) };
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {unit}
      </span>
      <div className="relative flex-1" style={{ width: LEGEND_WIDTH }}>
        <div
          className="absolute top-0 left-0 h-full rounded"
          style={{ width: BAR_WIDTH, background: gradient }}
        />
        {ticks.map(({ topPercent, value }, i) => (
          <div
            key={i}
            className="absolute flex items-center gap-1"
            style={{ top: `${topPercent}%`, left: BAR_WIDTH, transform: "translateY(-50%)" }}
          >
            <span className="h-px w-1.5" style={{ background: "var(--text-muted)" }} />
            <span className="text-xs tabular-nums whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              {value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
