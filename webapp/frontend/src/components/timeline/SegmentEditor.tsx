import { useLocalizedMeta } from "../../lib/useLocalizedMeta";
import { useT } from "../../lib/i18n";
import {
  computeEffectiveOptions,
  computeEffectivePAR,
  computeEffectivePosture,
  findLastExplicitGlobalSegment,
  findLastExplicitOptionSegment,
  isGlobalFieldExplicitAt,
  isOptionExplicitAt,
} from "../../lib/globalValues";
import type { Segment } from "../../lib/jos3-types";
import { useScenarioStore } from "../../store/scenarioStore";
import { Card } from "../common/Card";
import { NumberField } from "../common/NumberField";
import { SelectField } from "../common/SelectField";
import { Slider } from "../common/Slider";
import { ParCalculator } from "./ParCalculator";

function ProvenanceHint({ explicit, segmentIndex }: { explicit: boolean; segmentIndex: number | null }) {
  const t = useT();
  return (
    <span className="text-xs" style={{ color: explicit ? "var(--text-secondary)" : "var(--text-muted)" }}>
      {explicit
        ? t.provenance.explicit
        : segmentIndex !== null
          ? t.provenance.inheritedFromIndex(segmentIndex + 1)
          : t.provenance.default}
    </span>
  );
}

export function SegmentEditor({ segments, index }: { segments: Segment[]; index: number }) {
  const t = useT();
  const { data: meta } = useLocalizedMeta();
  const updateSegmentMeta = useScenarioStore((s) => s.updateSegmentMeta);
  const updateSegmentGlobals = useScenarioStore((s) => s.updateSegmentGlobals);
  const segment = segments[index];

  if (!meta || !segment) return null;

  const minutes = (segment.times * segment.dtime) / 60;
  const par = computeEffectivePAR(segments, index);
  const posture = computeEffectivePosture(segments, index);
  const options = computeEffectiveOptions(segments, index, meta.options);
  const parExplicit = isGlobalFieldExplicitAt(segment, "PAR");
  const postureExplicit = isGlobalFieldExplicitAt(segment, "posture");
  const activeOptionsCount = Object.values(options).filter(Boolean).length;

  return (
    <Card title={t.segmentEditor.cardTitle(segment.label)}>
      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t.segmentEditor.labelField}
          </span>
          <input
            type="text"
            value={segment.label}
            onChange={(e) => updateSegmentMeta(segment.id, { label: e.target.value })}
            className="rounded border px-2 py-1.5 text-sm outline-none"
            style={{ borderColor: "var(--gridline)", background: "var(--surface-1)", color: "var(--text-primary)" }}
          />
        </label>
        <NumberField
          label={t.segmentEditor.duration}
          unit="min"
          value={minutes}
          min={1}
          step={1}
          onChange={(mins) => updateSegmentMeta(segment.id, { times: Math.max(1, Math.round(mins * 60 / segment.dtime)) })}
        />
        <NumberField
          label={t.segmentEditor.timeStep}
          unit="s"
          value={segment.dtime}
          min={1}
          step={1}
          onChange={(dtime) => updateSegmentMeta(segment.id, { dtime, times: Math.max(1, Math.round(minutes * 60 / dtime)) })}
        />
        <div className="col-span-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Slider
                label={t.segmentEditor.activityRatio}
                value={par}
                min={meta.input_params.PAR.min}
                max={meta.input_params.PAR.max}
                step={meta.input_params.PAR.step}
                onChange={(PAR) => updateSegmentGlobals(segment.id, { PAR })}
              />
              <ProvenanceHint
                explicit={parExplicit}
                segmentIndex={findLastExplicitGlobalSegment(segments, index, "PAR")}
              />
            </div>
            {parExplicit && (
              <button
                type="button"
                onClick={() => updateSegmentGlobals(segment.id, { PAR: undefined })}
                className="mb-1.5 shrink-0 rounded border px-2 py-1 text-xs"
                style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
                title={t.provenance.resetTooltip}
              >
                ↺
              </button>
            )}
          </div>
          <ParCalculator segment={segment} effectivePar={par} />
        </div>
        <div>
          <SelectField
            label={t.segmentEditor.posture}
            value={posture}
            options={meta.enums.posture}
            onChange={(value) => updateSegmentGlobals(segment.id, { posture: value as typeof posture })}
          />
          <div className="mt-1 flex items-center gap-2">
            <ProvenanceHint
              explicit={postureExplicit}
              segmentIndex={findLastExplicitGlobalSegment(segments, index, "posture")}
            />
            {postureExplicit && (
              <button
                type="button"
                onClick={() => updateSegmentGlobals(segment.id, { posture: undefined })}
                className="rounded border px-1.5 py-0.5 text-xs"
                style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
                title={t.provenance.resetTooltip}
              >
                ↺
              </button>
            )}
          </div>
        </div>
      </div>

      <details className="mt-5">
        <summary
          className="cursor-pointer text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {t.segmentEditor.optionsSummary(activeOptionsCount)}
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
        {Object.entries(meta.options).map(([key, optMeta]) => {
          const checked = Boolean(options[key]);
          const explicit = isOptionExplicitAt(segment, key);
          return (
            <div key={key} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-primary)" }}>
              <label className="flex flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    updateSegmentGlobals(segment.id, {
                      options: { ...segment.globals.options, [key]: e.target.checked },
                    })
                  }
                />
                {optMeta.label}
                {!explicit && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                    title={
                      (() => {
                        const provenance = findLastExplicitOptionSegment(segments, index, key);
                        return provenance !== null
                          ? t.provenance.inheritedFromIndex(provenance + 1)
                          : t.provenance.default;
                      })()
                    }
                  >
                    {t.provenance.inheritedSuffix}
                  </span>
                )}
              </label>
              {explicit && (
                <button
                  type="button"
                  onClick={() =>
                    updateSegmentGlobals(segment.id, { options: { ...segment.globals.options, [key]: undefined } })
                  }
                  className="rounded border px-1.5 py-0.5 text-xs"
                  style={{ borderColor: "var(--gridline)", color: "var(--text-secondary)" }}
                  title={t.provenance.resetTooltip}
                >
                  ↺
                </button>
              )}
            </div>
          );
        })}
        </div>
      </details>
    </Card>
  );
}
