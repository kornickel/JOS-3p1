import { useT } from "../../lib/i18n";
import { useScenarioStore } from "../../store/scenarioStore";
import { Card } from "../common/Card";

export function SegmentList() {
  const t = useT();
  const segments = useScenarioStore((s) => s.segments);
  const selectedSegmentId = useScenarioStore((s) => s.selectedSegmentId);
  const selectSegment = useScenarioStore((s) => s.selectSegment);
  const addSegment = useScenarioStore((s) => s.addSegment);
  const duplicateSegment = useScenarioStore((s) => s.duplicateSegment);
  const removeSegment = useScenarioStore((s) => s.removeSegment);
  const moveSegment = useScenarioStore((s) => s.moveSegment);

  return (
    <Card title={t.segmentList.cardTitle}>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => {
          const minutes = (seg.times * seg.dtime) / 60;
          const selected = seg.id === selectedSegmentId;
          return (
            <div
              key={seg.id}
              className="flex items-center gap-2 rounded border px-2 py-1.5"
              style={{
                borderColor: selected ? "var(--series-1)" : "var(--gridline)",
                background: selected ? "color-mix(in srgb, var(--series-1) 8%, var(--surface-1))" : "transparent",
              }}
            >
              <button
                type="button"
                onClick={() => selectSegment(seg.id)}
                className="flex-1 text-left text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {i + 1}.
                </span>{" "}
                {seg.label}{" "}
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  ({minutes.toFixed(0)} min)
                </span>
              </button>
              <button
                type="button"
                onClick={() => moveSegment(seg.id, "up")}
                disabled={i === 0}
                className="px-1 text-xs disabled:opacity-30"
                style={{ color: "var(--text-secondary)" }}
                aria-label={t.segmentList.moveUp}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveSegment(seg.id, "down")}
                disabled={i === segments.length - 1}
                className="px-1 text-xs disabled:opacity-30"
                style={{ color: "var(--text-secondary)" }}
                aria-label={t.segmentList.moveDown}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => duplicateSegment(seg.id)}
                className="px-1 text-xs"
                style={{ color: "var(--text-secondary)" }}
                aria-label={t.segmentList.duplicate}
                title={t.segmentList.duplicate}
              >
                ⧉
              </button>
              <button
                type="button"
                onClick={() => removeSegment(seg.id)}
                className="px-1 text-xs"
                style={{ color: "var(--status-critical)" }}
                aria-label={t.segmentList.delete}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addSegment}
        className="mt-3 w-full rounded border px-3 py-1.5 text-sm"
        style={{ borderColor: "var(--gridline)", color: "var(--series-1)" }}
      >
        {t.segmentList.addSegment}
      </button>
      {segments.length > 0 && (
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {t.segmentList.totalDuration((segments.reduce((sum, s) => sum + s.times * s.dtime, 0) / 60).toFixed(0))}
        </p>
      )}
    </Card>
  );
}
