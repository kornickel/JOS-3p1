import { useEffect, useMemo, useState } from "react";
import { useLocalizedMeta } from "../../lib/useLocalizedMeta";
import { BODY_NAMES, bodyLabel } from "../../lib/bodyNames";
import { divergingColor, sequentialColor } from "../../lib/colorScale";
import { useT } from "../../lib/i18n";
import type { BodyName, SimulateResponse } from "../../lib/jos3-types";
import { useLanguageStore } from "../../store/languageStore";
import { Card } from "../common/Card";
import { SelectField } from "../common/SelectField";
import { BodyBack } from "./BodyBack";
import { BodyFront } from "./BodyFront";
import { ResultLegend } from "./ResultLegend";
import { TimeScrubber } from "./TimeScrubber";

const TSK_DEVIATION = "__tsk_deviation__";

export function BodyDiagramResult({ result }: { result: SimulateResponse }) {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const { data: meta } = useLocalizedMeta();
  const { results } = result;
  const timeSeconds = results.ModTime as number[];

  const candidates = useMemo(() => {
    if (!meta) return [];
    const opts: { value: string; label: string; unit: string; diverging: boolean }[] = [];
    for (const [name, paramMeta] of Object.entries(meta.output_params)) {
      if (paramMeta.suffix !== "Body name") continue;
      if (!(`${name}Head` in results)) continue;
      opts.push({ value: name, label: paramMeta.meaning, unit: paramMeta.unit, diverging: false });
    }
    if ("TskHead" in results && "SetptskHead" in results) {
      opts.push({
        value: TSK_DEVIATION,
        label: t.bodyDiagramResult.tskDeviationLabel,
        unit: "°C",
        diverging: true,
      });
    }
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [meta, results, t]);

  const [selected, setSelected] = useState<string | null>(null);
  const [timeIndex, setTimeIndex] = useState(timeSeconds.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const maxIndex = timeSeconds.length - 1;

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setTimeIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, 120);
    return () => clearInterval(id);
  }, [isPlaying, maxIndex]);

  const activeValue = selected ?? candidates[0]?.value ?? null;
  const active = candidates.find((c) => c.value === activeValue);

  const currentSegmentLabel = useMemo(() => {
    const segment = result.segment_bounds.find(
      (b) => timeIndex >= b.start_step && timeIndex < b.end_step
    );
    return segment?.label ?? null;
  }, [result.segment_bounds, timeIndex]);

  if (!meta || !active) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {t.bodyDiagramResult.noPerRegionData}
      </p>
    );
  }

  const valueAt = (bodyName: BodyName, timeIdx: number): number => {
    if (active.value === TSK_DEVIATION) {
      return (results[`Tsk${bodyName}`][timeIdx] as number) - (results[`Setptsk${bodyName}`][timeIdx] as number);
    }
    return results[`${active.value}${bodyName}`][timeIdx] as number;
  };

  const allValues = BODY_NAMES.flatMap((bn) => timeSeconds.map((_, i) => valueAt(bn, i)));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const absMax = Math.max(Math.abs(min), Math.abs(max)) || 1;

  const getFill = (bodyName: BodyName): string => {
    const v = valueAt(bodyName, timeIndex);
    if (active.diverging) return divergingColor(v / absMax);
    const ratio = max > min ? (v - min) / (max - min) : 0.5;
    return sequentialColor(ratio);
  };

  const minutes = timeSeconds[timeIndex] / 60;

  return (
    <Card title={t.bodyDiagramResult.cardTitle}>
      <div className="mb-4 max-w-sm">
        <SelectField
          label={t.bodyDiagramResult.quantityLabel}
          value={active.value}
          options={candidates.map((c) => ({ value: c.value, label: c.label }))}
          onChange={setSelected}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          disabled={maxIndex === 0}
          aria-label={isPlaying ? t.bodyDiagramResult.pause : t.bodyDiagramResult.play}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm disabled:opacity-30"
          style={{ borderColor: "var(--gridline)", color: "var(--series-1)" }}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <div className="flex-1">
          <TimeScrubber
            index={timeIndex}
            maxIndex={maxIndex}
            timeLabel={`${minutes.toFixed(0)} min`}
            description={currentSegmentLabel}
            onChange={(i) => {
              setIsPlaying(false);
              setTimeIndex(i);
            }}
          />
        </div>
      </div>
      <div className="mt-4 flex items-stretch justify-center gap-8">
        <ResultLegend
          min={active.diverging ? -absMax : min}
          max={active.diverging ? absMax : max}
          unit={active.unit}
          diverging={active.diverging}
        />
        <BodyFront
          selectedRegions={[]}
          showLabels={false}
          getFill={getFill}
          getTooltip={(bn) =>
            t.bodyDiagramResult.tooltip(bodyLabel(bn, language), valueAt(bn, timeIndex).toFixed(2), active.unit)
          }
          onSelectRegion={() => {}}
        />
        <BodyBack
          selectedRegions={[]}
          showLabels={false}
          getFill={getFill}
          getTooltip={(bn) =>
            t.bodyDiagramResult.tooltip(bodyLabel(bn, language), valueAt(bn, timeIndex).toFixed(2), active.unit)
          }
          onSelectRegion={() => {}}
        />
      </div>
    </Card>
  );
}
