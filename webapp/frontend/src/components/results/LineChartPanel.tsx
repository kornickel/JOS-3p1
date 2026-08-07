import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useT } from "../../lib/i18n";
import type { SegmentBound } from "../../lib/jos3-types";
import type { MetricThreshold } from "../../lib/thresholds";
import { Card } from "../common/Card";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

/** Turns a threshold into the y-bands to shade. Bands are drawn outward from
 * the limit to +/-Infinity so they always cover whatever range the axis ends
 * up showing. */
function thresholdBands(t: MetricThreshold) {
  const bands: { y1: number; y2: number; color: string }[] = [];
  const warn = "var(--status-warning)";
  const crit = "var(--status-critical)";
  // Warning bands stop where the critical band starts, so they don't overlap.
  if (t.warnAbove !== undefined) bands.push({ y1: t.warnAbove, y2: t.critAbove ?? Infinity, color: warn });
  if (t.critAbove !== undefined) bands.push({ y1: t.critAbove, y2: Infinity, color: crit });
  if (t.warnBelow !== undefined) bands.push({ y1: t.critBelow ?? -Infinity, y2: t.warnBelow, color: warn });
  if (t.critBelow !== undefined) bands.push({ y1: -Infinity, y2: t.critBelow, color: crit });
  return bands;
}

export function LineChartPanel({
  title,
  unit,
  data,
  series,
  segmentBounds,
  threshold,
  yDomain,
}: {
  title: string;
  unit?: string;
  data: Array<Record<string, number>>;
  series: SeriesDef[];
  segmentBounds: SegmentBound[];
  threshold?: MetricThreshold;
  /** Fixed y-range. Use for normalised quantities where the full 0..1 span is
   * the meaningful context -- auto-scaling a fraction that happens to peak at
   * 0.1 makes it look like it is near its limit when it is not. */
  yDomain?: [number, number];
}) {
  const t = useT();
  return (
    <Card title={unit ? `${title} [${unit}]` : title}>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          {threshold &&
            thresholdBands(threshold).map((b, i) => (
              <ReferenceArea
                key={`band-${i}`}
                y1={b.y1}
                y2={b.y2}
                fill={b.color}
                fillOpacity={0.12}
                stroke="none"
                ifOverflow="hidden"
              />
            ))}
          <XAxis
            dataKey="t"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            stroke="var(--baseline)"
            label={{ value: t.lineChartPanel.timeAxis, position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--text-muted)" }}
          />
          {/* Auto domain rather than recharts' default of anchoring at zero:
              on a 0-40 axis a 38-40 threshold band collapses into an
              invisible sliver, which defeats the point of drawing it. */}
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            stroke="var(--baseline)"
            width={42}
            domain={yDomain ?? ["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--gridline)",
              fontSize: 12,
              color: "var(--text-primary)",
            }}
            labelFormatter={(v) => t.lineChartPanel.tooltipTime(String(v))}
          />
          {segmentBounds.map((b) => (
            <ReferenceLine key={b.id} x={b.start_seconds / 60} stroke="var(--baseline)" strokeWidth={1} />
          ))}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {series.length >= 2 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
