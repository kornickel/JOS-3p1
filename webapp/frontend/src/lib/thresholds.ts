// Physiological limits the simulation results are checked against.
//
// Two different things are deliberately kept apart:
//   - comfort thresholds  -- beyond this it is unpleasant
//   - strain thresholds   -- beyond this it is a problem, then a danger
// Only the strain side is encoded here; comfort is the Zhang model's job.
//
// The values are orientation figures from occupational and cold-exposure
// practice (ISO 7933 heat strain, ISO 11079 / cold-exposure guidance for the
// extremities, and the usual dehydration rules of thumb). They are documented
// per entry and hard-wired for now rather than user-configurable -- if they
// ever become adjustable, this file stays the single source of defaults.
//
// Three deliberate modelling choices:
//  1. Skin wettedness is the sharpest limit in this whole table. At w -> 1 the
//     evaporative reserve is gone, so the heat balance CANNOT close and core
//     temperature has to rise. w_max is ~0.85 unacclimatised.
//  2. In the cold the extremities bind, not the mean -- TskMean can look fine
//     while a hand sits at 12 C. Those get their own, tighter limits and are
//     checked per body part.
//  3. Shivering is a lagging indicator (it starts once the skin is already
//     cold); the skin temperatures above are the leading one. Both are shown.

import type { SimulateResponse } from "./jos3-types";

export type Severity = "warning" | "critical";

export interface MetricThreshold {
  /** i18n key under `thresholds.metrics` */
  labelKey: string;
  unit: string;
  warnAbove?: number;
  critAbove?: number;
  warnBelow?: number;
  critBelow?: number;
}

/** Keyed by the results column they apply to. */
export const THRESHOLDS: Record<string, MetricThreshold> = {
  // Sustained-work limit is 38.0 C for unacclimatised people, 38.5 C for
  // acclimatised and medically screened ones (ISO 7933). Downward: 36.0 C is
  // the onset of mild hypothermia, below 35.0 C it is clinical.
  TcrChest: {
    labelKey: "coreTemp",
    unit: "°C",
    warnAbove: 38.0,
    critAbove: 38.5,
    warnBelow: 36.0,
    critBelow: 35.0,
  },
  // Neutral skin sits around 33-35 C. Below 31 C it reads as distinctly cool,
  // by 30 C shivering is typically underway.
  TskMean: {
    labelKey: "meanSkinTemp",
    unit: "°C",
    warnAbove: 35.5,
    critAbove: 37.0,
    warnBelow: 31.0,
    critBelow: 30.0,
  },
  // w > ~0.3 is felt as damp; w_max ~0.85 is where the balance stops closing.
  WetMean: { labelKey: "wettedness", unit: "-", warnAbove: 0.5, critAbove: 0.85 },
};

/** Extremities carry their own, tighter cold limits: below 20 C dexterity
 * degrades, 15 C is painful, 10 C means numbness. Checked per body part. */
export const EXTREMITY_THRESHOLD: MetricThreshold = {
  labelKey: "extremitySkinTemp",
  unit: "°C",
  warnBelow: 20.0,
  critBelow: 15.0,
};
export const EXTREMITY_PARTS = ["LHand", "RHand", "LFoot", "RFoot"] as const;

/** Whole-body shivering power. Any shivering at all means cold strain has
 * begun; sustained >100 W burns through glycogen and accelerates fatigue. */
export const SHIVERING_THRESHOLD: MetricThreshold = {
  labelKey: "shivering",
  unit: "W",
  warnAbove: 0.1,
  critAbove: 100,
};

/** Cumulative sweat loss as a percentage of body mass: >2 % measurably costs
 * performance, >4 % is serious. */
export const DEHYDRATION_THRESHOLD: MetricThreshold = {
  labelKey: "dehydration",
  unit: "%",
  warnAbove: 2.0,
  critAbove: 4.0,
};

/** How full the clothing's moisture store is. A saturated garment stops
 * providing evaporative cooling and turns into a cold load at the next rest. */
export const SATURATION_THRESHOLD: MetricThreshold = {
  labelKey: "clothingSaturation",
  unit: "-",
  warnAbove: 0.7,
  critAbove: 0.95,
};

export interface Violation {
  labelKey: string;
  /** Body part name when the metric is per-region, else undefined */
  bodyName?: string;
  severity: Severity;
  direction: "above" | "below";
  /** Threshold that was crossed */
  limit: number;
  /** Worst value reached */
  peak: number;
  unit: string;
  /** Minute at which the worst value occurred */
  peakMinute: number;
  /** Label of the segment the peak falls into, if any */
  segmentLabel?: string;
}

function severityOf(v: number, t: MetricThreshold): { severity: Severity; direction: "above" | "below"; limit: number } | null {
  if (t.critAbove !== undefined && v > t.critAbove) return { severity: "critical", direction: "above", limit: t.critAbove };
  if (t.critBelow !== undefined && v < t.critBelow) return { severity: "critical", direction: "below", limit: t.critBelow };
  if (t.warnAbove !== undefined && v > t.warnAbove) return { severity: "warning", direction: "above", limit: t.warnAbove };
  if (t.warnBelow !== undefined && v < t.warnBelow) return { severity: "warning", direction: "below", limit: t.warnBelow };
  return null;
}

/** How far past its limit a hit is, in the metric's own units -- always
 * >= 0 for an actual hit. Direction-independent, so an "above" hit and a
 * "below" hit on the same metric (e.g. TskMean running both too hot and too
 * cold over the course of a run) can be compared on equal footing instead of
 * comparing raw values that live on unrelated parts of the scale. */
function marginOf(direction: "above" | "below", limit: number, value: number): number {
  return direction === "above" ? value - limit : limit - value;
}

/** Scans a series and returns the single worst violation in it, if any. */
function worstViolation(
  series: number[],
  minutes: number[],
  t: MetricThreshold,
  bodyName?: string
): Violation | null {
  let worst: Violation | null = null;
  for (let i = 0; i < series.length; i++) {
    const v = series[i];
    if (!Number.isFinite(v)) continue;
    const hit = severityOf(v, t);
    if (!hit) continue;
    const better =
      worst === null ||
      (hit.severity === "critical" && worst.severity === "warning") ||
      (hit.severity === worst.severity &&
        marginOf(hit.direction, hit.limit, v) > marginOf(worst.direction, worst.limit, worst.peak));
    if (better) {
      worst = {
        labelKey: t.labelKey,
        bodyName,
        severity: hit.severity,
        direction: hit.direction,
        limit: hit.limit,
        peak: v,
        unit: t.unit,
        peakMinute: minutes[i],
      };
    }
  }
  return worst;
}

/** Whole-body shivering power per time step, summed over the 17 segments. */
export function shiveringSeries(results: SimulateResponse["results"], bodyNames: string[]): number[] {
  const n = (results.ModTime as number[]).length;
  const out = new Array<number>(n).fill(0);
  for (const bn of bodyNames) {
    const col = results[`Mshiv${bn}`] as number[] | undefined;
    if (!col) continue;
    for (let i = 0; i < n; i++) out[i] += typeof col[i] === "number" ? col[i] : 0;
  }
  return out;
}

/** Cumulative sweat + respiratory water loss as % of body mass. `Wle` is a
 * whole-body rate in g/s and `dt` the step length in seconds, both standard
 * JOS-3 outputs.
 *
 * `Wle` counts sweat as lost the moment it's produced, whether it evaporates
 * immediately or is absorbed into clothing (see src/jos3/jos3.py's water
 * storage model) -- water sitting in `WaterStorageMean` hasn't actually left
 * the body+clothing system yet, so it's netted back out here before turning
 * the total into a body-mass percentage. As stored water is later released
 * and evaporates, it drops out of `WaterStorageMean` and stays counted in
 * the cumulative total, so the net figure catches up. */
export function dehydrationSeries(results: SimulateResponse["results"], bodyMassKg: number): number[] {
  const wle = results.Wle as number[] | undefined;
  const dt = results.dt as number[] | undefined;
  const stored = results.WaterStorageMean as number[] | undefined;
  const n = (results.ModTime as number[]).length;
  const out = new Array<number>(n).fill(0);
  if (!wle || bodyMassKg <= 0) return out;
  let grams = 0;
  for (let i = 0; i < n; i++) {
    const step = typeof dt?.[i] === "number" ? dt[i] : 60;
    if (typeof wle[i] === "number" && Number.isFinite(wle[i])) grams += wle[i] * step;
    const storedNow = typeof stored?.[i] === "number" ? stored[i] : 0;
    const netGrams = Math.max(grams - storedNow, 0);
    out[i] = (netGrams / (bodyMassKg * 1000)) * 100;
  }
  return out;
}

/** Mean fill level of the clothing moisture store across the body, 0..1. */
export function saturationSeries(results: SimulateResponse["results"], bodyNames: string[]): number[] {
  const n = (results.ModTime as number[]).length;
  const out = new Array<number>(n).fill(0);
  let counted = 0;
  for (const bn of bodyNames) {
    const stored = results[`WaterStorage${bn}`] as number[] | undefined;
    const cap = results[`max_storage${bn}`] as number[] | undefined;
    if (!stored || !cap) continue;
    counted++;
    for (let i = 0; i < n; i++) {
      const c = cap[i];
      out[i] += typeof c === "number" && c > 0 ? (stored[i] as number) / c : 0;
    }
  }
  if (counted > 0) for (let i = 0; i < n; i++) out[i] /= counted;
  return out;
}

/** Every limit crossed anywhere in the run, worst first. */
export function evaluateThresholds(
  result: SimulateResponse,
  bodyMassKg: number
): Violation[] {
  const { results, body_names } = result;
  const minutes = (results.ModTime as number[]).map((s) => s / 60);
  const found: Violation[] = [];

  for (const [column, t] of Object.entries(THRESHOLDS)) {
    const series = results[column] as number[] | undefined;
    if (series) {
      const v = worstViolation(series as number[], minutes, t);
      if (v) found.push(v);
    }
  }

  for (const part of EXTREMITY_PARTS) {
    const series = results[`Tsk${part}`] as number[] | undefined;
    if (!series) continue;
    const v = worstViolation(series as number[], minutes, EXTREMITY_THRESHOLD, part);
    if (v) found.push(v);
  }

  const shiv = worstViolation(shiveringSeries(results, body_names), minutes, SHIVERING_THRESHOLD);
  if (shiv) found.push(shiv);

  const dehy = worstViolation(dehydrationSeries(results, bodyMassKg), minutes, DEHYDRATION_THRESHOLD);
  if (dehy) found.push(dehy);

  const sat = worstViolation(saturationSeries(results, body_names), minutes, SATURATION_THRESHOLD);
  if (sat) found.push(sat);

  // Annotate with the segment each peak falls into. The very last sample sits
  // exactly on the final boundary, so it needs the half-open range relaxed.
  const bounds = result.segment_bounds;
  for (const v of found) {
    const seconds = v.peakMinute * 60;
    const seg =
      bounds.find((b) => seconds >= b.start_seconds && seconds < b.end_seconds) ??
      (bounds.length > 0 && seconds >= bounds[bounds.length - 1].end_seconds
        ? bounds[bounds.length - 1]
        : undefined);
    v.segmentLabel = seg?.label;
  }

  return found.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}
