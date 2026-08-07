import { BODY_NAMES } from "./bodyNames";
import type { BodyName, RegionOverrides, RegionValue, Segment } from "./jos3-types";

// Mirrors the JOS3.__init__ defaults for each per-region property
// (src/jos3/jos3.py lines ~215-255) -- shown when a segment has never set
// the field at all.
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

export function getRegionFieldValue(
  segment: Segment,
  field: keyof RegionOverrides,
  bodyName: BodyName
): number {
  const current = segment.regions[field];
  if (current === undefined) return REGION_FIELD_DEFAULTS[field];
  if (typeof current === "number") return current;
  return current[bodyName] ?? REGION_FIELD_DEFAULTS[field];
}

/** True if this field's value differs across regions in this segment (i.e.
 * the segment sets a per-region dict with non-uniform values), used to show
 * a "differs across regions" hint in the RegionPanel. */
export function isRegionFieldUniform(segment: Segment, field: keyof RegionOverrides): boolean {
  const current = segment.regions[field];
  if (current === undefined || typeof current === "number") return true;
  const values = BODY_NAMES.map((bn) => current[bn] ?? REGION_FIELD_DEFAULTS[field]);
  return values.every((v) => v === values[0]);
}

/** True if `bodyName` has a per-region value, on any field, that differs
 * from that field's most common ("modal") value across the body -- the
 * signal for a small "diverges from the rest" indicator on the diagram, so
 * a stray single-region override left over from an earlier edit doesn't go
 * unnoticed. */
export function regionHasDivergentOverride(segment: Segment, bodyName: BodyName): boolean {
  for (const field of Object.keys(REGION_FIELD_DEFAULTS) as (keyof RegionOverrides)[]) {
    const current = segment.regions[field];
    if (current === undefined || typeof current === "number") continue;
    const counts = new Map<number, number>();
    for (const bn of BODY_NAMES) {
      const v = current[bn] ?? REGION_FIELD_DEFAULTS[field];
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    let modalValue = current[BODY_NAMES[0]] ?? REGION_FIELD_DEFAULTS[field];
    let modalCount = 0;
    for (const [v, count] of counts) {
      if (count > modalCount) {
        modalCount = count;
        modalValue = v;
      }
    }
    const value = current[bodyName] ?? REGION_FIELD_DEFAULTS[field];
    if (value !== modalValue) return true;
  }
  return false;
}

/** Sets a single region's value for `field`, converting a scalar into a
 * full per-region dict first if needed (so the other 16 regions keep their
 * previous effective value instead of silently changing). */
export function withRegionFieldValue(
  segment: Segment,
  field: keyof RegionOverrides,
  bodyName: BodyName,
  value: number
): RegionValue {
  const current = segment.regions[field];
  if (current !== undefined && typeof current !== "number") {
    return { ...current, [bodyName]: value };
  }
  const baseline = current ?? REGION_FIELD_DEFAULTS[field];
  const dict: Partial<Record<BodyName, number>> = {};
  for (const bn of BODY_NAMES) dict[bn] = bn === bodyName ? value : baseline;
  return dict as RegionValue;
}
