import { useMeta } from "../../lib/api";
import { bodyLabel } from "../../lib/bodyNames";
import type { BodyName, RegionOverrides, Segment } from "../../lib/jos3-types";
import {
  clearRegionFieldForBody,
  EDITABLE_REGION_FIELDS,
  findLastExplicitSegment,
  getRegionFieldValue,
  isRegionFieldExplicitAt,
  isRegionFieldUniform,
  useEffectiveRegionSnapshot,
  withRegionFieldValue,
} from "../../lib/regionValues";
import { useScenarioStore } from "../../store/scenarioStore";
import { Slider } from "../common/Slider";

export function RegionPanel({
  segments,
  index,
  region,
}: {
  segments: Segment[];
  index: number;
  region: BodyName;
}) {
  const { data: meta } = useMeta();
  const updateSegmentRegions = useScenarioStore((s) => s.updateSegmentRegions);
  const snapshot = useEffectiveRegionSnapshot(segments, index);
  const segment = segments[index];

  if (!meta || !segment) return null;

  const setField = (field: keyof RegionOverrides, value: number) => {
    updateSegmentRegions(segment.id, { [field]: withRegionFieldValue(segment, field, region, value) });
  };

  const applyToAll = (field: keyof RegionOverrides) => {
    const value = getRegionFieldValue(snapshot, field, region);
    updateSegmentRegions(segment.id, { [field]: value });
  };

  const resetToInherited = (field: keyof RegionOverrides) => {
    updateSegmentRegions(segment.id, { [field]: clearRegionFieldForBody(segment, field, region) });
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
        {EDITABLE_REGION_FIELDS.map((field) => {
          const paramMeta = meta.input_params[field];
          if (!paramMeta) return null;
          const value = getRegionFieldValue(snapshot, field, region);
          const uniform = isRegionFieldUniform(snapshot, field);
          const explicitHere = isRegionFieldExplicitAt(segment, field, region);
          const provenanceIndex = findLastExplicitSegment(segments, index, field, region);
          const provenanceLabel = explicitHere
            ? "gesetzt in diesem Segment"
            : provenanceIndex !== null
              ? `geerbt von Segment ${provenanceIndex + 1} „${segments[provenanceIndex].label}“`
              : "geerbt (Modell-Standard)";
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
                <div className="mt-0.5 flex items-center gap-2 text-xs">
                  <span style={{ color: explicitHere ? "var(--text-secondary)" : "var(--text-muted)" }}>
                    {provenanceLabel}
                  </span>
                  {!uniform && <span style={{ color: "var(--series-4)" }}>· weicht zwischen Körperregionen ab</span>}
                </div>
              </div>
              {explicitHere && (
                <button
                  type="button"
                  onClick={() => resetToInherited(field)}
                  className="mb-1.5 shrink-0 rounded border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
                  title="Auf vererbten Wert zurücksetzen"
                >
                  ↺
                </button>
              )}
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
