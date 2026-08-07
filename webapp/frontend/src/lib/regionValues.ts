import { useMemo } from "react";
import { BODY_NAMES } from "./bodyNames";
import type { BodyName, RegionOverrides, RegionValue, Segment } from "./jos3-types";

// Mirrors the JOS3.__init__ defaults for each per-region property
// (src/jos3/jos3.py lines ~215-255) -- the value in effect when no segment
// has ever set the field.
export const REGION_FIELD_DEFAULTS: Record<keyof RegionOverrides, number> = {
  Ta: 28.8,
  Tr: 28.8,
  To: 28.8,
  RH: 50,
  Va: 0.1,
  Icl: 0,
  Icl_evap_eff: 0.45,
  Icl_emissivity: 1.0,
  Icl_airperm: 1.0,
  Icl_waterabs: 0,
  release_tau: 3600,
  max_storage: 100,
  setpt_cr: 37,
  setpt_sk: 34,
};

const REGION_FIELDS = Object.keys(REGION_FIELD_DEFAULTS) as (keyof RegionOverrides)[];

/** The effective 17-value array for every field, at a given point in the
 * timeline -- i.e. what the model actually holds for each region once
 * segments[0..uptoIndex] have all been applied in order. */
export type RegionSnapshot = Record<keyof RegionOverrides, Record<BodyName, number>>;

function defaultRegionArray(field: keyof RegionOverrides): Record<BodyName, number> {
  const arr = {} as Record<BodyName, number>;
  for (const bn of BODY_NAMES) arr[bn] = REGION_FIELD_DEFAULTS[field];
  return arr;
}

/** Forward-replays segments[0..uptoIndex] exactly like the backend's
 * jos3_bridge.apply_segment/_resolve_region_value do: a scalar override
 * broadcasts to all 17 regions, a dict override patches only the named
 * regions, and an unset field is a no-op (whatever the previous segment
 * left in place keeps holding). This is the single source of truth for
 * "what is this segment's field actually going to be during simulation",
 * which is not necessarily what that segment's own `regions[field]` says. */
export function computeEffectiveRegionSnapshot(segments: Segment[], uptoIndex: number): RegionSnapshot {
  const snapshot = {} as RegionSnapshot;
  for (const field of REGION_FIELDS) snapshot[field] = defaultRegionArray(field);

  const lastIndex = Math.min(uptoIndex, segments.length - 1);
  for (let i = 0; i <= lastIndex; i++) {
    const regions = segments[i].regions;
    for (const field of REGION_FIELDS) {
      const value = regions[field];
      if (value === undefined) continue;
      if (typeof value === "number") {
        const arr = {} as Record<BodyName, number>;
        for (const bn of BODY_NAMES) arr[bn] = value;
        snapshot[field] = arr;
      } else {
        const arr = { ...snapshot[field] };
        for (const bn of BODY_NAMES) {
          if (value[bn] !== undefined) arr[bn] = value[bn]!;
        }
        snapshot[field] = arr;
      }
    }
  }
  return snapshot;
}

/** React convenience wrapper around computeEffectiveRegionSnapshot. */
export function useEffectiveRegionSnapshot(segments: Segment[], uptoIndex: number): RegionSnapshot {
  return useMemo(() => computeEffectiveRegionSnapshot(segments, uptoIndex), [segments, uptoIndex]);
}

export function getRegionFieldValue(
  snapshot: RegionSnapshot,
  field: keyof RegionOverrides,
  bodyName: BodyName
): number {
  return snapshot[field][bodyName];
}

/** True if this field's effective value is the same across all 17 regions
 * at this point in the timeline. */
export function isRegionFieldUniform(snapshot: RegionSnapshot, field: keyof RegionOverrides): boolean {
  const values = BODY_NAMES.map((bn) => snapshot[field][bn]);
  return values.every((v) => v === values[0]);
}

/** True if `bodyName`'s effective value, on any field, differs from that
 * field's most common ("modal") effective value across the body -- the
 * signal for a small "diverges from the rest" indicator on the diagram. */
export function regionHasDivergentOverride(snapshot: RegionSnapshot, bodyName: BodyName): boolean {
  for (const field of REGION_FIELDS) {
    const arr = snapshot[field];
    const counts = new Map<number, number>();
    for (const bn of BODY_NAMES) counts.set(arr[bn], (counts.get(arr[bn]) ?? 0) + 1);
    let modalValue = arr[BODY_NAMES[0]];
    let modalCount = 0;
    for (const [v, count] of counts) {
      if (count > modalCount) {
        modalCount = count;
        modalValue = v;
      }
    }
    if (arr[bodyName] !== modalValue) return true;
  }
  return false;
}

/** True if THIS segment (not an earlier one) explicitly sets `bodyName`'s
 * value for `field` -- no replay, single segment only. */
export function isRegionFieldExplicitAt(
  segment: Segment,
  field: keyof RegionOverrides,
  bodyName: BodyName
): boolean {
  const value = segment.regions[field];
  if (value === undefined) return false;
  if (typeof value === "number") return true;
  return value[bodyName] !== undefined;
}

/** Which segment (at or before uptoIndex) most recently set `bodyName`'s
 * value for `field` explicitly; null if none ever did (JOS3 default is in
 * effect). Used for the "geerbt von Segment X" provenance hint. */
export function findLastExplicitSegment(
  segments: Segment[],
  uptoIndex: number,
  field: keyof RegionOverrides,
  bodyName: BodyName
): number | null {
  const lastIndex = Math.min(uptoIndex, segments.length - 1);
  for (let i = lastIndex; i >= 0; i--) {
    if (isRegionFieldExplicitAt(segments[i], field, bodyName)) return i;
  }
  return null;
}

/** Sets a single region's value for `field` on THIS segment. If the field
 * was never touched in this segment, writes a minimal single-key patch
 * (not a full 17-key dict against some baseline) so the other 16 regions
 * keep dynamically inheriting from earlier segments instead of being frozen
 * at whatever they looked like at edit time. */
export function withRegionFieldValue(
  segment: Segment,
  field: keyof RegionOverrides,
  bodyName: BodyName,
  value: number
): RegionValue {
  const current = segment.regions[field];
  if (current === undefined) {
    return { [bodyName]: value } as RegionValue;
  }
  if (typeof current === "number") {
    const dict: Partial<Record<BodyName, number>> = {};
    for (const bn of BODY_NAMES) dict[bn] = bn === bodyName ? value : current;
    return dict as RegionValue;
  }
  return { ...current, [bodyName]: value };
}

/** Un-sets `bodyName`'s explicit value for `field` on THIS segment, so it
 * goes back to inheriting from an earlier segment (or the JOS3 default).
 * Returns `undefined` when the field becomes fully unset for this segment
 * as a result (caller should write that back as the new field value). */
export function clearRegionFieldForBody(
  segment: Segment,
  field: keyof RegionOverrides,
  bodyName: BodyName
): RegionValue | undefined {
  const current = segment.regions[field];
  if (current === undefined) return undefined;

  const rest: Partial<Record<BodyName, number>> = {};
  if (typeof current === "number") {
    // A scalar is explicit for all 17 regions in this segment; clearing one
    // region turns it into "still explicit for the other 16, inherited for
    // this one" -- i.e. every region except bodyName keeps the scalar.
    for (const bn of BODY_NAMES) {
      if (bn !== bodyName) rest[bn] = current;
    }
  } else {
    for (const bn of BODY_NAMES) {
      if (bn !== bodyName && current[bn] !== undefined) rest[bn] = current[bn];
    }
  }
  return Object.keys(rest).length > 0 ? (rest as RegionValue) : undefined;
}
