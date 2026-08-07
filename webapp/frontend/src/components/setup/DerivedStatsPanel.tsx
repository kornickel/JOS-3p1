import { useModelPreview } from "../../lib/api";
import { useScenarioStore } from "../../store/scenarioStore";
import { Card } from "../common/Card";

function StatTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-2xl tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value} <span className="text-sm" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </div>
    </div>
  );
}

export function DerivedStatsPanel() {
  const model = useScenarioStore((s) => s.model);
  const { data, isLoading, isError } = useModelPreview(model);

  return (
    <Card title="Abgeleitete Kennwerte (live)">
      {isLoading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Berechne…</p>}
      {isError && <p className="text-sm" style={{ color: "var(--status-critical)" }}>Fehler bei der Berechnung.</p>}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <StatTile label="Körperoberfläche (gesamt)" value={data.bsa_total.toFixed(2)} unit="m²" />
          <StatTile label="Grundumsatz (BMR)" value={data.bmr.toFixed(1)} unit="W/m²" />
          <StatTile label="BSA-Rate" value={data.bsa_rate.toFixed(3)} unit="-" />
        </div>
      )}
    </Card>
  );
}
