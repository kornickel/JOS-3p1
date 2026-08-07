import { buildSeriesData } from "../../lib/chartData";
import { useT } from "../../lib/i18n";
import type { SimulateResponse } from "../../lib/jos3-types";
import { LineChartPanel } from "./LineChartPanel";

export function ResultsCharts({ result }: { result: SimulateResponse }) {
  const t = useT();
  const { results, segment_bounds } = result;

  const panels: { title: string; unit?: string; fields: { key: string; label: string; color: string }[] }[] = [
    {
      title: t.resultsCharts.weatherTemp,
      unit: "°C",
      fields: [
        { key: "TaHead", label: t.resultsCharts.airTemp, color: "var(--series-1)" },
        { key: "TrHead", label: t.resultsCharts.radiantTemp, color: "var(--series-2)" },
      ],
    },
    { title: t.resultsCharts.weatherHumidity, unit: "%", fields: [{ key: "RHHead", label: "RH", color: "var(--series-1)" }] },
    { title: t.resultsCharts.weatherWind, unit: "m/s", fields: [{ key: "VaHead", label: "Va", color: "var(--series-1)" }] },
    { title: t.resultsCharts.activity, unit: "PAR", fields: [{ key: "PAR", label: "PAR", color: "var(--series-1)" }] },
    { title: t.resultsCharts.clothingInsulation, unit: "clo", fields: [{ key: "IclHead", label: "Icl", color: "var(--series-1)" }] },
    {
      title: t.resultsCharts.clothingPhysics,
      fields: [
        { key: "Icl_airpermMean", label: t.resultsCharts.airPermeability, color: "var(--series-1)" },
        { key: "Icl_evap_effMean", label: t.resultsCharts.vaporPermeability, color: "var(--series-2)" },
        { key: "Icl_waterabsMean", label: t.resultsCharts.sweatAbsorption, color: "var(--series-3)" },
      ],
    },
    {
      title: t.resultsCharts.bodyTemp,
      unit: "°C",
      fields: [
        { key: "TcrChest", label: t.resultsCharts.coreTempChest, color: "var(--series-1)" },
        { key: "TskMean", label: t.resultsCharts.meanSkinTemp, color: "var(--series-2)" },
      ],
    },
    { title: t.resultsCharts.skinWettedness, unit: "-", fields: [{ key: "WetMean", label: "Wet", color: "var(--series-1)" }] },
    {
      title: t.resultsCharts.waterStorageTitle,
      unit: "g",
      fields: [{ key: "WaterStorageMean", label: t.resultsCharts.waterStorage, color: "var(--series-1)" }],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {panels.map((panel) => (
        <LineChartPanel
          key={panel.title}
          title={panel.title}
          unit={panel.unit}
          data={buildSeriesData(results, panel.fields.map((f) => f.key))}
          series={panel.fields}
          segmentBounds={segment_bounds}
        />
      ))}
    </div>
  );
}
