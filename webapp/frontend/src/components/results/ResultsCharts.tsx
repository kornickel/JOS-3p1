import { buildSeriesData } from "../../lib/chartData";
import type { SimulateResponse } from "../../lib/jos3-types";
import { LineChartPanel } from "./LineChartPanel";

export function ResultsCharts({ result }: { result: SimulateResponse }) {
  const { results, segment_bounds } = result;

  const panels: { title: string; unit?: string; fields: { key: string; label: string; color: string }[] }[] = [
    {
      title: "Wetter: Temperatur",
      unit: "°C",
      fields: [
        { key: "TaHead", label: "Lufttemperatur", color: "var(--series-1)" },
        { key: "TrHead", label: "Strahlungstemperatur", color: "var(--series-2)" },
      ],
    },
    { title: "Wetter: Luftfeuchte", unit: "%", fields: [{ key: "RHHead", label: "RH", color: "var(--series-1)" }] },
    { title: "Wetter: Windgeschwindigkeit", unit: "m/s", fields: [{ key: "VaHead", label: "Va", color: "var(--series-1)" }] },
    { title: "Aktivität", unit: "PAR", fields: [{ key: "PAR", label: "PAR", color: "var(--series-1)" }] },
    { title: "Bekleidungsisolation", unit: "clo", fields: [{ key: "IclHead", label: "Icl", color: "var(--series-1)" }] },
    {
      title: "Bekleidungsphysik",
      fields: [
        { key: "Icl_airpermMean", label: "Luftdurchlässigkeit", color: "var(--series-1)" },
        { key: "Icl_evap_effMean", label: "Dampfdurchlässigkeit", color: "var(--series-2)" },
        { key: "Icl_waterabsMean", label: "Schweißaufnahme", color: "var(--series-3)" },
      ],
    },
    {
      title: "Körpertemperatur",
      unit: "°C",
      fields: [
        { key: "TcrChest", label: "Kerntemperatur (Brust)", color: "var(--series-1)" },
        { key: "TskMean", label: "Mittlere Hauttemperatur", color: "var(--series-2)" },
      ],
    },
    { title: "Hautfeuchte", unit: "-", fields: [{ key: "WetMean", label: "Wet", color: "var(--series-1)" }] },
    {
      title: "Wasserspeicher in der Kleidung",
      unit: "g",
      fields: [{ key: "WaterStorageMean", label: "Wasserspeicher", color: "var(--series-1)" }],
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
