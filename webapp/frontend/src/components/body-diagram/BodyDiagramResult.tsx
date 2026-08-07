import { useEffect, useMemo, useState } from "react";
import { useLocalizedMeta } from "../../lib/useLocalizedMeta";
import { BODY_NAMES, bodyLabel } from "../../lib/bodyNames";
import { divergingColor, sequentialColor } from "../../lib/colorScale";
import { useT } from "../../lib/i18n";
import type { BodyName, SimulateResponse } from "../../lib/jos3-types";
import { useLanguageStore } from "../../store/languageStore";
import { Card } from "../common/Card";
import { ComfortStatus } from "../results/ComfortStatus";
import { SelectField } from "../common/SelectField";
import { BodyBack } from "./BodyBack";
import { BodyFront } from "./BodyFront";
import { ResultLegend } from "./ResultLegend";
import { TimeScrubber } from "./TimeScrubber";

// Derived per-region quantities: not columns in the API response, computed
// on the fly from ones that are.
const TSK_DEVIATION = "__tsk_deviation__";
const CLOTHING_SATURATION = "__clothing_saturation__";

export function BodyDiagramResult({ result }: { result: SimulateResponse }) {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const { data: meta } = useLocalizedMeta();
  const { results } = result;
  const timeSeconds = results.ModTime as number[];

  const candidates = useMemo(() => {
    if (!meta) return [];
    const opts: { value: string; label: string; unit: string; diverging: boolean; invert?: boolean }[] = [];
    for (const [name, paramMeta] of Object.entries(meta.output_params)) {
      if (paramMeta.suffix !== "Body name") continue;
      if (!(`${name}Head` in results)) continue;
      // Zhang's scales are signed around a meaningful zero (neutral sensation
      // / the comfort saddle), so they belong on the diverging ramp -- the
      // same one the skin-temperature deviation already uses.
      const diverging = name === "SensationLocal" || name === "ComfortLocal";
      // Comfort is inverted so that DIScomfort gets the alarm colour: on the
      // raw scale +4 is pleasant, which would otherwise come out red.
      const invert = name === "ComfortLocal";
      opts.push({ value: name, label: paramMeta.meaning, unit: paramMeta.unit, diverging, invert });
    }
    if ("TskHead" in results && "SetptskHead" in results) {
      opts.push({
        value: TSK_DEVIATION,
        label: t.bodyDiagramResult.tskDeviationLabel,
        unit: "°C",
        diverging: true,
      });
    }
    if ("WaterStorageHead" in results && "max_storageHead" in results) {
      opts.push({
        value: CLOTHING_SATURATION,
        label: t.bodyDiagramResult.saturationLabel,
        unit: "-",
        diverging: false,
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
    if (active.value === CLOTHING_SATURATION) {
      const cap = results[`max_storage${bodyName}`][timeIdx] as number;
      return cap > 0 ? (results[`WaterStorage${bodyName}`][timeIdx] as number) / cap : 0;
    }
    return results[`${active.value}${bodyName}`][timeIdx] as number;
  };

  const allValues = BODY_NAMES.flatMap((bn) => timeSeconds.map((_, i) => valueAt(bn, i)));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const absMax = Math.max(Math.abs(min), Math.abs(max)) || 1;

  const getFill = (bodyName: BodyName): string => {
    const v = valueAt(bodyName, timeIndex);
    if (active.diverging) return divergingColor((active.invert ? -v : v) / absMax);
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
      <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--gridline)" }}>
        <ComfortStatus result={result} timeIndex={timeIndex} />
      </div>
      <div className="mt-4 flex items-stretch justify-center gap-8">
        {/* When the ramp is inverted the tick labels have to run the other
            way too, so the red end stays the one labelled "uncomfortable". */}
        <ResultLegend
          min={active.diverging ? (active.invert ? absMax : -absMax) : min}
          max={active.diverging ? (active.invert ? -absMax : absMax) : max}
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
