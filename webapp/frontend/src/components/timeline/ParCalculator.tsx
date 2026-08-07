import { useModelPreview } from "../../lib/api";
import { useT } from "../../lib/i18n";
import type { ActivityInput, Segment } from "../../lib/jos3-types";
import { estimatePar, MAX_GRADE_PCT, MIN_GRADE_PCT, TERRAIN_ORDER, type Terrain } from "../../lib/parModel";
import { useScenarioStore } from "../../store/scenarioStore";
import { NumberField } from "../common/NumberField";
import { SelectField } from "../common/SelectField";

const DEFAULT_ACTIVITY: ActivityInput = {
  speed_kmh: 4,
  grade_pct: 0,
  load_kg: 8,
  terrain: "trail",
};

/** Derives PAR from speed/grade/load/terrain. Deliberately *not* auto-syncing:
 * `globals.PAR` stays the value that drives the simulation and a hand
 * correction must never be silently overwritten, so applying is an explicit
 * click and a mismatch is only flagged. */
export function ParCalculator({ segment, effectivePar }: { segment: Segment; effectivePar: number }) {
  const t = useT();
  const model = useScenarioStore((s) => s.model);
  const updateSegmentActivity = useScenarioStore((s) => s.updateSegmentActivity);
  const updateSegmentGlobals = useScenarioStore((s) => s.updateSegmentGlobals);
  const { data: preview } = useModelPreview(model);

  const activity = segment.activity ?? DEFAULT_ACTIVITY;
  const patch = (p: Partial<ActivityInput>) => updateSegmentActivity(segment.id, { ...activity, ...p });

  const estimate = preview
    ? estimatePar(activity, model.weight, preview.bmr, preview.bsa_total)
    : null;
  // Only meaningful once the user has actually stored inputs for this segment.
  const outOfSync =
    segment.activity != null && estimate != null && Math.abs(estimate.par - effectivePar) > 0.05;

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {t.parCalculator.summary}
      </summary>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <NumberField
          label={t.parCalculator.speed}
          unit="km/h"
          value={activity.speed_kmh}
          min={0}
          max={12}
          step={0.1}
          onChange={(speed_kmh) => patch({ speed_kmh })}
        />
        <NumberField
          label={t.parCalculator.grade}
          unit="%"
          value={activity.grade_pct}
          min={MIN_GRADE_PCT}
          max={MAX_GRADE_PCT}
          step={1}
          onChange={(grade_pct) => patch({ grade_pct })}
        />
        <NumberField
          label={t.parCalculator.load}
          unit="kg"
          value={activity.load_kg}
          min={0}
          max={60}
          step={0.5}
          onChange={(load_kg) => patch({ load_kg })}
        />
        <SelectField
          label={t.parCalculator.terrain}
          value={activity.terrain}
          options={TERRAIN_ORDER.map((value) => ({
            value,
            label: t.parCalculator.terrainOptions[value],
          }))}
          onChange={(terrain) => patch({ terrain: terrain as Terrain })}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
          {estimate
            ? t.parCalculator.preview(
                estimate.par.toFixed(2),
                estimate.met.toFixed(1),
                estimate.watts.toFixed(0)
              )
            : t.parCalculator.needsModel}
        </span>
        <button
          type="button"
          disabled={!estimate}
          onClick={() => {
            if (!estimate) return;
            updateSegmentActivity(segment.id, activity);
            updateSegmentGlobals(segment.id, { PAR: Number(estimate.par.toFixed(2)) });
          }}
          className="rounded border px-2 py-1 text-xs disabled:opacity-40"
          style={{ borderColor: "var(--gridline)", color: "var(--series-1)" }}
        >
          {t.parCalculator.apply}
        </button>
      </div>

      {outOfSync && (
        <p className="mt-1 text-xs" style={{ color: "var(--series-4)" }}>
          {t.parCalculator.outOfSync(estimate.par.toFixed(2), effectivePar.toFixed(2))}
        </p>
      )}
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        {t.parCalculator.note}
      </p>
    </details>
  );
}
