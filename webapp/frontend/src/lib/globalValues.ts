import type { GlobalOverrides, Segment } from "./jos3-types";

// Mirrors JOS3.__init__ defaults (src/jos3/jos3.py): self._par = 1.25,
// self._posture = "standing".
export const DEFAULT_PAR = 1.25;
export const DEFAULT_POSTURE: NonNullable<GlobalOverrides["posture"]> = "standing";

function lastIndexOf(segments: Segment[], uptoIndex: number): number {
  return Math.min(uptoIndex, segments.length - 1);
}

/** Effective PAR at this point in the timeline: the most recent segment (at
 * or before uptoIndex) that explicitly set it, else the JOS3 default. */
export function computeEffectivePAR(segments: Segment[], uptoIndex: number): number {
  for (let i = lastIndexOf(segments, uptoIndex); i >= 0; i--) {
    const value = segments[i].globals.PAR;
    if (value !== undefined) return value;
  }
  return DEFAULT_PAR;
}

export function computeEffectivePosture(
  segments: Segment[],
  uptoIndex: number
): NonNullable<GlobalOverrides["posture"]> {
  for (let i = lastIndexOf(segments, uptoIndex); i >= 0; i--) {
    const value = segments[i].globals.posture;
    if (value !== undefined) return value;
  }
  return DEFAULT_POSTURE;
}

/** Effective value of every known option key at this point in the
 * timeline, forward-replayed the same way as region fields (partial
 * dict patches, unset segments are no-ops). */
export function computeEffectiveOptions(
  segments: Segment[],
  uptoIndex: number,
  optionsMeta: Record<string, { label: string; default: boolean }>
): Record<string, boolean | number> {
  const effective: Record<string, boolean | number> = {};
  for (const [key, meta] of Object.entries(optionsMeta)) effective[key] = meta.default;

  const lastIndex = lastIndexOf(segments, uptoIndex);
  for (let i = 0; i <= lastIndex; i++) {
    const opts = segments[i].globals.options;
    if (!opts) continue;
    for (const [key, value] of Object.entries(opts)) {
      if (value !== undefined) effective[key] = value;
    }
  }
  return effective;
}

export function isGlobalFieldExplicitAt(segment: Segment, field: "PAR" | "posture"): boolean {
  return segment.globals[field] !== undefined;
}

export function isOptionExplicitAt(segment: Segment, key: string): boolean {
  return segment.globals.options?.[key] !== undefined;
}

/** Which segment (at or before uptoIndex) most recently set `field`
 * explicitly; null if none ever did. */
export function findLastExplicitGlobalSegment(
  segments: Segment[],
  uptoIndex: number,
  field: "PAR" | "posture"
): number | null {
  for (let i = lastIndexOf(segments, uptoIndex); i >= 0; i--) {
    if (isGlobalFieldExplicitAt(segments[i], field)) return i;
  }
  return null;
}

export function findLastExplicitOptionSegment(
  segments: Segment[],
  uptoIndex: number,
  key: string
): number | null {
  for (let i = lastIndexOf(segments, uptoIndex); i >= 0; i--) {
    if (isOptionExplicitAt(segments[i], key)) return i;
  }
  return null;
}
