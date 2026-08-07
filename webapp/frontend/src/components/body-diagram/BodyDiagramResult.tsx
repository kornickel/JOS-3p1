import { useEffect, useMemo, useState } from "react";
import { useMeta } from "../../lib/api";
import { BODY_NAMES, bodyLabel } from "../../lib/bodyNames";
import { divergingColor, sequentialColor } from "../../lib/colorScale";
import type { BodyName, SimulateResponse } from "../../lib/jos3-types";
import { Card } from "../common/Card";
import { SelectField } from "../common/SelectField";
import { BodyBack } from "./BodyBack";
import { BodyFront } from "./BodyFront";
import { ResultLegend } from "./ResultLegend";
import { TimeScrubber } from "./TimeScrubber";

const TSK_DEVIATION = "__tsk_deviation__";

export function BodyDiagramResult({ result }: { result: SimulateResponse }) {
  const { data: meta } = useMeta();
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
        label: "Hauttemperatur: Abweichung vom Sollwert",
        unit: "°C",
        diverging: true,
      });
    }
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [meta, results]);

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

  if (!meta || !active) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Keine Ergebnisgrößen pro Körperregion verfügbar.
      </p>
    );
  }

  const valueAt = (bodyName: BodyName, t: number): number => {
    if (active.value === TSK_DEVIATION) {
      return (results[`Tsk${bodyName}`][t] as number) - (results[`Setptsk${bodyName}`][t] as number);
    }
    return results[`${active.value}${bodyName}`][t] as number;
  };

  const allValues = BODY_NAMES.flatMap((bn) => timeSeconds.map((_, t) => valueAt(bn, t)));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const absMax = Math.max(Math.abs(min), Math.abs(max)) || 1;

  const getFill = (bodyName: BodyName): string => {
    const v = valueAt(bodyName, timeIndex);
    if (active.diverging) return divergingColor(v / absMax);
    const t = max > min ? (v - min) / (max - min) : 0.5;
    return sequentialColor(t);
  };

  const minutes = timeSeconds[timeIndex] / 60;

  return (
    <Card title="Ergebnis am Körper (Heatmap)">
      <div className="mb-4 grid grid-cols-2 gap-4">
        <SelectField
          label="Größe"
          value={active.value}
          options={candidates.map((c) => ({ value: c.value, label: c.label }))}
          onChange={setSelected}
        />
        <div className="flex flex-col justify-end">
          <ResultLegend min={active.diverging ? -absMax : min} max={active.diverging ? absMax : max} unit={active.unit} diverging={active.diverging} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          disabled={maxIndex === 0}
          aria-label={isPlaying ? "Pause" : "Abspielen"}
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
            onChange={(i) => {
              setIsPlaying(false);
              setTimeIndex(i);
            }}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-8">
        <BodyFront
          selectedRegion={null}
          showLabels={false}
          getFill={getFill}
          getTooltip={(bn) => `${bodyLabel(bn)}: ${valueAt(bn, timeIndex).toFixed(2)} ${active.unit}`}
          onSelectRegion={() => {}}
        />
        <BodyBack
          selectedRegion={null}
          showLabels={false}
          getFill={getFill}
          getTooltip={(bn) => `${bodyLabel(bn)}: ${valueAt(bn, timeIndex).toFixed(2)} ${active.unit}`}
          onSelectRegion={() => {}}
        />
      </div>
    </Card>
  );
}
