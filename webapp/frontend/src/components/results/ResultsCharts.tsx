import { useMemo } from "react";
import { buildSeriesData } from "../../lib/chartData";
import { useT } from "../../lib/i18n";
import type { SimulateResponse } from "../../lib/jos3-types";
import {
  DEHYDRATION_THRESHOLD,
  SATURATION_THRESHOLD,
  THRESHOLDS,
  dehydrationSeries,
  saturationSeries,
  type MetricThreshold,
} from "../../lib/thresholds";
import { useScenarioStore } from "../../store/scenarioStore";
import { LineChartPanel } from "./LineChartPanel";

// Column names for the two series that are derived in the frontend rather
// than returned by /api/simulate.
const SATURATION_KEY = "__saturation__";
const DEHYDRATION_KEY = "__dehydration__";

export function ResultsCharts({ result }: { result: SimulateResponse }) {
  const t = useT();
  const weight = useScenarioStore((s) => s.model.weight);
  const { results, segment_bounds, body_names } = result;

  // Clothing saturation and dehydration are computed from existing outputs
  // (WaterStorage/max_storage and the Wle rate), so they are merged into the
  // results map before charting rather than round-tripping to the backend.
  const derived = useMemo(() => {
    const withDerived: SimulateResponse["results"] = { ...results };
    withDerived[SATURATION_KEY] = saturationSeries(results, body_names);
    withDerived[DEHYDRATION_KEY] = dehydrationSeries(results, weight);
    return withDerived;
  }, [results, body_names, weight]);

  const panels: {
    title: string;
    unit?: string;
    threshold?: MetricThreshold;
    yDomain?: [number, number];
    fields: { key: string; label: string; color: string }[];
  }[] = [
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
      title: t.resultsCharts.coreTempTitle,
      unit: "°C",
      threshold: THRESHOLDS.TcrChest,
      fields: [{ key: "TcrChest", label: t.resultsCharts.coreTempChest, color: "var(--series-1)" }],
    },
    {
      title: t.resultsCharts.skinTempTitle,
      unit: "°C",
      threshold: THRESHOLDS.TskMean,
      fields: [{ key: "TskMean", label: t.resultsCharts.meanSkinTemp, color: "var(--series-2)" }],
    },
    {
      title: t.resultsCharts.skinWettedness,
      unit: "-",
      threshold: THRESHOLDS.WetMean,
      yDomain: [0, 1],
      fields: [{ key: "WetMean", label: "Wet", color: "var(--series-1)" }],
    },
    {
      title: t.resultsCharts.waterStorageTitle,
      unit: "g",
      fields: [{ key: "WaterStorageMean", label: t.resultsCharts.waterStorage, color: "var(--series-1)" }],
    },
    {
      title: t.resultsCharts.saturationTitle,
      unit: "-",
      threshold: SATURATION_THRESHOLD,
      yDomain: [0, 1],
      fields: [{ key: SATURATION_KEY, label: t.resultsCharts.saturation, color: "var(--series-3)" }],
    },
    {
      // Zhang sensation and comfort share the -4..+4 axis, so unlike core vs
      // skin temperature they genuinely belong in one panel.
      title: t.resultsCharts.comfortTitle,
      unit: "-",
      yDomain: [-4, 4],
      fields: [
        { key: "SensationOverall", label: t.resultsCharts.sensationOverall, color: "var(--series-8)" },
        { key: "ComfortOverall", label: t.resultsCharts.comfortOverall, color: "var(--series-3)" },
      ],
    },
    {
      title: t.resultsCharts.dehydrationTitle,
      unit: "%",
      threshold: DEHYDRATION_THRESHOLD,
      fields: [{ key: DEHYDRATION_KEY, label: t.resultsCharts.dehydration, color: "var(--series-2)" }],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {panels.map((panel) => (
        <LineChartPanel
          key={panel.title}
          title={panel.title}
          unit={panel.unit}
          threshold={panel.threshold}
          yDomain={panel.yDomain}
          data={buildSeriesData(derived, panel.fields.map((f) => f.key))}
          series={panel.fields}
          segmentBounds={segment_bounds}
        />
      ))}
    </div>
  );
}
