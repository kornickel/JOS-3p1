import { useMeta } from "../../lib/api";
import { bodyLabel } from "../../lib/bodyNames";
import type { BodyName, RegionOverrides, Segment } from "../../lib/jos3-types";
import { getRegionFieldValue, isRegionFieldUniform, withRegionFieldValue } from "../../lib/regionValues";
import { useScenarioStore } from "../../store/scenarioStore";
import { Slider } from "../common/Slider";

const EDITABLE_FIELDS: (keyof RegionOverrides)[] = [
  "Ta", "Tr", "RH", "Va", "Icl",
  "Icl_evap_eff", "Icl_emissivity", "Icl_airperm", "Icl_waterabs",
  "release_tau", "max_storage",
];

export function RegionPanel({ segment, region }: { segment: Segment; region: BodyName }) {
  const { data: meta } = useMeta();
  const updateSegmentRegions = useScenarioStore((s) => s.updateSegmentRegions);

  if (!meta) return null;

  const setField = (field: keyof RegionOverrides, value: number) => {
    updateSegmentRegions(segment.id, { [field]: withRegionFieldValue(segment, field, region, value) });
  };

  const applyToAll = (field: keyof RegionOverrides) => {
    const value = getRegionFieldValue(segment, field, region);
    updateSegmentRegions(segment.id, { [field]: value });
  };

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {bodyLabel(region)}
        <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
          — Segment „{segment.label}“
        </span>
      </h4>
      <div className="flex flex-col gap-3">
        {EDITABLE_FIELDS.map((field) => {
          const paramMeta = meta.input_params[field];
          if (!paramMeta) return null;
          const value = getRegionFieldValue(segment, field, region);
          const uniform = isRegionFieldUniform(segment, field);
          return (
            <div key={field} className="flex items-end gap-2">
              <div className="flex-1">
                <Slider
                  label={paramMeta.label}
                  unit={paramMeta.unit === "-" ? undefined : paramMeta.unit}
                  value={value}
                  min={paramMeta.min}
                  max={paramMeta.max}
                  step={paramMeta.step}
                  onChange={(v) => setField(field, v)}
                />
                {!uniform && (
                  <span className="text-xs" style={{ color: "var(--series-4)" }}>
                    weicht zwischen Körperregionen ab
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => applyToAll(field)}
                className="mb-1.5 shrink-0 rounded border px-2 py-1 text-xs"
                style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
                title="Diesen Wert auf alle Körperregionen anwenden"
              >
                → alle
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
