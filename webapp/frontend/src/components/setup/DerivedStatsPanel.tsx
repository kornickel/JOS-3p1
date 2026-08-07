import { useModelPreview } from "../../lib/api";
import { useT } from "../../lib/i18n";
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
  const t = useT();
  const model = useScenarioStore((s) => s.model);
  const { data, isLoading, isError } = useModelPreview(model);

  return (
    <Card title={t.derivedStatsPanel.cardTitle}>
      {isLoading && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t.derivedStatsPanel.calculating}</p>}
      {isError && <p className="text-sm" style={{ color: "var(--status-critical)" }}>{t.derivedStatsPanel.error}</p>}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <StatTile label={t.derivedStatsPanel.bsaTotal} value={data.bsa_total.toFixed(2)} unit="m²" />
          <StatTile label={t.derivedStatsPanel.bmr} value={data.bmr.toFixed(1)} unit="W/m²" />
          <StatTile label={t.derivedStatsPanel.bsaRate} value={data.bsa_rate.toFixed(3)} unit="-" />
        </div>
      )}
    </Card>
  );
}
