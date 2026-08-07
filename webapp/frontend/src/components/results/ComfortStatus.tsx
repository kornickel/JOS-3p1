import { useT } from "../../lib/i18n";
import type { SimulateResponse } from "../../lib/jos3-types";

function tone(value: number): string {
  if (value <= -2) return "var(--status-critical)";
  if (value < 0) return "var(--status-warning)";
  return "var(--success-text)";
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums" style={{ color }}>
        {value >= 0 ? "+" : ""}
        {value.toFixed(1)}
      </span>
    </span>
  );
}

/** Slim readout of the Zhang whole-body sensation/comfort at the scrubber
 * position, plus the worst comfort over the whole run. Deliberately a strip
 * rather than a card: the per-segment detail is already in the heatmap and
 * the time course in the chart, so this only has to answer "how bad, and how
 * bad did it get". */
export function ComfortStatus({ result, timeIndex }: { result: SimulateResponse; timeIndex: number }) {
  const t = useT();
  const sensation = result.results.SensationOverall as number[] | undefined;
  const comfort = result.results.ComfortOverall as number[] | undefined;
  if (!sensation || !comfort) return null;

  const i = Math.min(Math.max(timeIndex, 0), comfort.length - 1);
  const worst = Math.min(...comfort);

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {t.comfort.now}
      </span>
      <Metric label={t.comfort.sensation} value={sensation[i]} color={tone(-Math.abs(sensation[i]))} />
      <Metric label={t.comfort.comfort} value={comfort[i]} color={tone(comfort[i])} />
      <span className="mx-1" style={{ color: "var(--gridline)" }}>
        |
      </span>
      <Metric label={t.comfort.worstComfort} value={worst} color={tone(worst)} />
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {t.comfort.scaleNote} — {t.comfort.validity}
      </span>
    </div>
  );
}
