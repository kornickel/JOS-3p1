import { useState } from "react";
import { useLocalizedMeta } from "../../lib/useLocalizedMeta";
import { BODY_NAMES, bodyLabel } from "../../lib/bodyNames";
import { useT } from "../../lib/i18n";
import type { BodyName, RegionOverrides, Segment } from "../../lib/jos3-types";
import {
  EDITABLE_REGION_FIELDS,
  getRegionFieldValue,
  isRegionFieldUniformAmong,
  useEffectiveRegionSnapshot,
  withRegionFieldValueForMany,
} from "../../lib/regionValues";
import { useLanguageStore } from "../../store/languageStore";
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
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const { data: meta } = useLocalizedMeta();
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

  const headerLabel = isAllRegions ? t.multiRegionPanel.allBodyParts : t.multiRegionPanel.selectedCount(regions.length);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h4 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {headerLabel}
          <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {t.common.segmentSuffix(segment.label)}
          </span>
        </h4>
        {!isAllRegions && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {regions.map((r) => bodyLabel(r, language)).join(", ")}
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
                  placeholder={t.multiRegionPanel.differentValuesPlaceholder}
                  min={paramMeta.min}
                  max={paramMeta.max}
                  step={paramMeta.step}
                  onChange={(e) => setPending((p) => ({ ...p, [field]: e.target.value }))}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2"
                  style={{ borderColor: "var(--gridline)", background: "var(--surface-1)", color: "var(--text-primary)" }}
                />
                <div className="mt-0.5 text-xs" style={{ color: "var(--series-4)" }}>
                  {t.multiRegionPanel.divergesHint(isAllRegions)}
                </div>
              </div>
              <button
                type="button"
                disabled={!valid}
                onClick={() => setConfirmField(field)}
                className="mb-1.5 shrink-0 rounded border px-2 py-1 text-xs disabled:opacity-40"
                style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
              >
                {t.multiRegionPanel.apply}
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmField !== null}
        title={t.multiRegionPanel.confirmTitle}
        description={
          confirmField && confirmMeta
            ? t.multiRegionPanel.confirmMessage({
                paramLabel: confirmMeta.label,
                segmentLabel: segment.label,
                isAllRegions,
                regionCount: regions.length,
                regionNames: regions.map((r) => bodyLabel(r, language)).join(", "),
                value: confirmValue,
                unit: confirmMeta.unit === "-" ? "" : confirmMeta.unit,
              })
            : ""
        }
        onConfirm={applyConfirmed}
        onCancel={() => setConfirmField(null)}
      />
    </div>
  );
}
