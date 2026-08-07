import { divergingGradientCss, sequentialGradientCss } from "../../lib/colorScale";

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
  const gradient = diverging ? divergingGradientCss() : sequentialGradientCss();
  return (
    <div className="flex flex-col gap-1">
      <div className="h-3 w-full rounded" style={{ background: gradient }} />
      <div className="flex justify-between text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
        <span>
          {min.toFixed(2)} {unit}
        </span>
        {diverging && <span>0 {unit}</span>}
        <span>
          {max.toFixed(2)} {unit}
        </span>
      </div>
    </div>
  );
}
