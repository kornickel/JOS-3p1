import { useMemo } from "react";
import { bodyLabel } from "../../lib/bodyNames";
import { useT } from "../../lib/i18n";
import type { BodyName, SimulateResponse } from "../../lib/jos3-types";
import { evaluateThresholds } from "../../lib/thresholds";
import { useLanguageStore } from "../../store/languageStore";
import { useScenarioStore } from "../../store/scenarioStore";
import { Card } from "../common/Card";

/** Lists every physiological limit crossed during the run. Nobody hunts for
 * exceedances across eleven charts, so this is the part that actually gets
 * read -- the bands on the charts only say where it happened. */
export function StrainOverview({
  result,
  onJumpToMinute,
}: {
  result: SimulateResponse;
  onJumpToMinute?: (minute: number) => void;
}) {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const weight = useScenarioStore((s) => s.model.weight);

  const violations = useMemo(() => evaluateThresholds(result, weight), [result, weight]);

  return (
    <Card title={t.thresholds.cardTitle}>
      {violations.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--success-text)" }}>
          {t.thresholds.none}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {violations.map((v) => {
            const color = v.severity === "critical" ? "var(--status-critical)" : "var(--status-warning)";
            const metric = v.bodyName
              ? `${t.thresholds.metrics[v.labelKey as keyof typeof t.thresholds.metrics]} (${bodyLabel(v.bodyName as BodyName, language)})`
              : t.thresholds.metrics[v.labelKey as keyof typeof t.thresholds.metrics];
            return (
              <li
                key={`${v.labelKey}-${v.bodyName ?? ""}`}
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                <span
                  className="rounded px-1.5 py-0.5 text-xs font-medium"
                  style={{ background: color, color: "white" }}
                >
                  {v.severity === "critical" ? t.thresholds.critical : t.thresholds.warning}
                </span>
                <span style={{ color: "var(--text-primary)" }}>
                  {t.thresholds.entry({
                    metric,
                    direction: v.direction === "above" ? t.thresholds.above : t.thresholds.below,
                    limit: v.limit.toFixed(2),
                    peak: v.peak.toFixed(2),
                    // "-" is the dimensionless marker from the metadata; it
                    // reads as a stray dash next to a number.
                    unit: v.unit === "-" ? "" : ` ${v.unit}`,
                    minute: v.peakMinute.toFixed(0),
                  })}
                </span>
                {v.segmentLabel && (
                  <button
                    type="button"
                    onClick={() => onJumpToMinute?.(v.peakMinute)}
                    className="text-xs underline underline-offset-2"
                    style={{ color: "var(--series-1)" }}
                  >
                    {t.thresholds.inSegment(v.segmentLabel)}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
