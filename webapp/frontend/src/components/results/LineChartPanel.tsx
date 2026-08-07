import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SegmentBound } from "../../lib/jos3-types";
import { Card } from "../common/Card";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

export function LineChartPanel({
  title,
  unit,
  data,
  series,
  segmentBounds,
}: {
  title: string;
  unit?: string;
  data: Array<Record<string, number>>;
  series: SeriesDef[];
  segmentBounds: SegmentBound[];
}) {
  return (
    <Card title={unit ? `${title} [${unit}]` : title}>
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            stroke="var(--baseline)"
            label={{ value: "Zeit [min]", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--text-muted)" }}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--baseline)" width={42} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-1)",
              border: "1px solid var(--gridline)",
              fontSize: 12,
              color: "var(--text-primary)",
            }}
            labelFormatter={(v) => `t = ${v} min`}
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
