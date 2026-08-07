import { useMeta } from "../../lib/api";
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

function ProvenanceHint({ explicit, segmentIndex }: { explicit: boolean; segmentIndex: number | null }) {
  return (
    <span className="text-xs" style={{ color: explicit ? "var(--text-secondary)" : "var(--text-muted)" }}>
      {explicit ? "gesetzt in diesem Segment" : segmentIndex !== null ? `geerbt von Segment ${segmentIndex + 1}` : "geerbt (Modell-Standard)"}
    </span>
  );
}

export function SegmentEditor({ segments, index }: { segments: Segment[]; index: number }) {
  const { data: meta } = useMeta();
  const updateSegmentMeta = useScenarioStore((s) => s.updateSegmentMeta);
  const updateSegmentGlobals = useScenarioStore((s) => s.updateSegmentGlobals);
  const selectSegment = useScenarioStore((s) => s.selectSegment);
  const setActiveTab = useScenarioStore((s) => s.setActiveTab);
  const segment = segments[index];

  if (!meta || !segment) return null;

  const minutes = (segment.times * segment.dtime) / 60;
  const par = computeEffectivePAR(segments, index);
  const posture = computeEffectivePosture(segments, index);
  const options = computeEffectiveOptions(segments, index, meta.options);
  const parExplicit = isGlobalFieldExplicitAt(segment, "PAR");
  const postureExplicit = isGlobalFieldExplicitAt(segment, "posture");

  return (
    <Card title={`Segment bearbeiten: ${segment.label}`}>
      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Bezeichnung
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
          label="Dauer"
          unit="min"
          value={minutes}
          min={1}
          step={1}
          onChange={(mins) => updateSegmentMeta(segment.id, { times: Math.max(1, Math.round(mins * 60 / segment.dtime)) })}
        />
        <NumberField
          label="Zeitschritt (dtime)"
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
                label="Aktivitätsverhältnis (PAR)"
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
                title="Auf vererbten Wert zurücksetzen"
              >
                ↺
              </button>
            )}
          </div>
        </div>
        <div>
          <SelectField
            label="Körperhaltung"
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
                title="Auf vererbten Wert zurücksetzen"
              >
                ↺
              </button>
            )}
          </div>
        </div>
      </div>

      <h4 className="mt-5 mb-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Thermoregulations-Optionen
      </h4>
      <div className="grid grid-cols-2 gap-2">
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
                          ? `geerbt von Segment ${provenance + 1}`
                          : "geerbt (Modell-Standard)";
                      })()
                    }
                  >
                    (geerbt)
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
                  title="Auf vererbten Wert zurücksetzen"
                >
                  ↺
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          selectSegment(segment.id);
          setActiveTab("body");
        }}
        className="mt-4 text-sm font-medium"
        style={{ color: "var(--series-1)" }}
      >
        Kleidung &amp; Wetter für dieses Segment bearbeiten →
      </button>
    </Card>
  );
}
