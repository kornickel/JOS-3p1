import { useState } from "react";
import { useMeta } from "../../lib/api";
import { BODY_NAMES, bodyLabel } from "../../lib/bodyNames";
import type { BodyName, RegionOverrides, Segment } from "../../lib/jos3-types";
import {
  EDITABLE_REGION_FIELDS,
  getRegionFieldValue,
  isRegionFieldUniformAmong,
  useEffectiveRegionSnapshot,
  withRegionFieldValueForMany,
} from "../../lib/regionValues";
import { useScenarioStore } from "../../store/scenarioStore";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { Slider } from "../common/Slider";

export function MultiRegionPanel({
  segments,
  index,
  regions,
}: {
  segments: Segment[];
  index: number;
  regions: BodyName[];
}) {
  const { data: meta } = useMeta();
  const updateSegmentRegions = useScenarioStore((s) => s.updateSegmentRegions);
  const snapshot = useEffectiveRegionSnapshot(segments, index);
  const segment = segments[index];

  const [pending, setPending] = useState<Partial<Record<keyof RegionOverrides, string>>>({});
  const [confirmField, setConfirmField] = useState<keyof RegionOverrides | null>(null);

  if (!meta || !segment) return null;

  const isAllRegions = regions.length === BODY_NAMES.length;

  const applyValue = (field: keyof RegionOverrides, value: number) => {
    if (isAllRegions) {
      updateSegmentRegions(segment.id, { [field]: value });
    } else {
      updateSegmentRegions(segment.id, { [field]: withRegionFieldValueForMany(segment, field, regions, value) });
    }
  };

  const confirmMeta = confirmField ? meta.input_params[confirmField] : null;
  const confirmValue = confirmField ? Number(pending[confirmField]) : NaN;

  const applyConfirmed = () => {
    if (!confirmField || Number.isNaN(confirmValue)) return;
    applyValue(confirmField, confirmValue);
    setPending((p) => ({ ...p, [confirmField]: undefined }));
    setConfirmField(null);
  };

  const headerLabel = isAllRegions ? "Alle Körperteile" : `${regions.length} Körperteile ausgewählt`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {headerLabel}
          <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
            — Segment „{segment.label}“
          </span>
        </h4>
        {!isAllRegions && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {regions.map(bodyLabel).join(", ")}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {EDITABLE_REGION_FIELDS.map((field) => {
          const paramMeta = meta.input_params[field];
          if (!paramMeta) return null;
          const uniform = isRegionFieldUniformAmong(snapshot, field, regions);

          if (uniform) {
            const value = getRegionFieldValue(snapshot, field, regions[0]);
            return (
              <div key={field}>
                <Slider
                  label={paramMeta.label}
                  unit={paramMeta.unit === "-" ? undefined : paramMeta.unit}
                  value={value}
                  min={paramMeta.min}
                  max={paramMeta.max}
                  step={paramMeta.step}
                  onChange={(v) => applyValue(field, v)}
                />
              </div>
            );
          }

          const raw = pending[field] ?? "";
          const parsed = raw === "" ? NaN : Number(raw);
          const valid = !Number.isNaN(parsed) && parsed >= paramMeta.min && parsed <= paramMeta.max;

          return (
            <div key={field} className="flex items-end gap-2">
              <div className="flex-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{paramMeta.label}</span>
                </div>
                <input
                  type="number"
                  value={raw}
                  placeholder="unterschiedliche Werte"
                  min={paramMeta.min}
                  max={paramMeta.max}
                  step={paramMeta.step}
                  onChange={(e) => setPending((p) => ({ ...p, [field]: e.target.value }))}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2"
                  style={{ borderColor: "var(--gridline)", background: "var(--surface-1)", color: "var(--text-primary)" }}
                />
                <div className="mt-0.5 text-xs" style={{ color: "var(--series-4)" }}>
                  weicht zwischen Körperregionen ab — Wert eingeben, um für {isAllRegions ? "alle Regionen" : "die Auswahl"} zu übernehmen
                </div>
              </div>
              <button
                type="button"
                disabled={!valid}
                onClick={() => setConfirmField(field)}
                className="mb-1.5 shrink-0 rounded border px-2 py-1 text-xs disabled:opacity-40"
                style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
              >
                Übernehmen
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmField !== null}
        title="Wert übernehmen?"
        description={
          confirmField && confirmMeta
            ? `„${confirmMeta.label}“ wird für Segment „${segment.label}“ auf ${
                isAllRegions
                  ? "allen 17 Körperregionen"
                  : `den ${regions.length} ausgewählten Körperregionen (${regions.map(bodyLabel).join(", ")})`
              } auf ${confirmValue}${confirmMeta.unit === "-" ? "" : ` ${confirmMeta.unit}`} gesetzt. Die bisherigen, voneinander abweichenden Werte für dieses Feld gehen dabei verloren.`
            : ""
        }
        onConfirm={applyConfirmed}
        onCancel={() => setConfirmField(null)}
      />
    </div>
  );
}
