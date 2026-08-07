import type { SimulateResponse } from "./jos3-types";

export function buildSeriesData(
  results: SimulateResponse["results"],
  fields: string[]
): Array<Record<string, number>> {
  const seconds = results.ModTime as number[];
  return seconds.map((sec, i) => {
    const row: Record<string, number> = { t: sec / 60 };
    for (const f of fields) {
      const v = results[f]?.[i];
      row[f] = typeof v === "number" ? v : NaN;
    }
    return row;
  });
}
