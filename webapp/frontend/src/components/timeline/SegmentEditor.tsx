import { useMeta } from "../../lib/api";
import type { Segment } from "../../lib/jos3-types";
import { useScenarioStore } from "../../store/scenarioStore";
import { Card } from "../common/Card";
import { NumberField } from "../common/NumberField";
import { SelectField } from "../common/SelectField";
import { Slider } from "../common/Slider";

export function SegmentEditor({ segment }: { segment: Segment }) {
  const { data: meta } = useMeta();
  const updateSegmentMeta = useScenarioStore((s) => s.updateSegmentMeta);
  const updateSegmentGlobals = useScenarioStore((s) => s.updateSegmentGlobals);

  if (!meta) return null;

  const minutes = (segment.times * segment.dtime) / 60;
  const par = segment.globals.PAR ?? 1.25;
  const posture = segment.globals.posture ?? "standing";

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
          <Slider
            label="Aktivitätsverhältnis (PAR)"
            value={par}
            min={meta.input_params.PAR.min}
            max={meta.input_params.PAR.max}
            step={meta.input_params.PAR.step}
            onChange={(PAR) => updateSegmentGlobals(segment.id, { PAR })}
          />
        </div>
        <SelectField
          label="Körperhaltung"
          value={posture}
          options={meta.enums.posture}
          onChange={(value) => updateSegmentGlobals(segment.id, { posture: value as typeof posture })}
        />
      </div>

      <h4 className="mt-5 mb-2 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Thermoregulations-Optionen
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(meta.options).map(([key, optMeta]) => {
          const checked = Boolean(segment.globals.options?.[key] ?? optMeta.default);
          return (
            <label key={key} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
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
            </label>
          );
        })}
      </div>

      <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Wetter- und Bekleidungsparameter pro Körperregion werden im Tab „Körper & Kleidung“ für dieses
        Segment festgelegt.
      </p>
    </Card>
  );
}
