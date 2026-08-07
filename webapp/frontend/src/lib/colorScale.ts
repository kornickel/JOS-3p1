import { formatHex, interpolate } from "culori";

// Deliberate departure from the dataviz skill's "sequential = one hue"
// default: this ramp colors a continuous spatial scalar field over an
// anatomy silhouette (temperature, wetness, ...), the exact case FEM/CFD
// tools (ANSYS, ParaView, COMSOL, Fluent) use a multi-hue ramp for, to get
// more perceptual resolution across a small per-region fill area. Anchors
// sweep blue -> cyan -> green -> yellow -> orange -> red, interpolated in
// OKLCH (below) to avoid the muddy-lightness-dip artifacts of classic
// sRGB-interpolated "jet" ramps. Scope stays local to this file's sequential
// path -- the diverging blue<->red pair and the 8-hue categorical palette
// (charts, series) are untouched and still follow the skill's default.
const SEQUENTIAL_STOPS = [
  "#1a3a8f", "#1f5fd6", "#1c8fd6", "#17b6c4", "#23b483",
  "#4fb83a", "#a8c92c", "#f0d514", "#f2941e", "#e3572c", "#b81f2b",
];

const DIVERGING_COLD = "#2a78d6";
const DIVERGING_HOT = "#e34948";
const DIVERGING_MID_LIGHT = "#f0efec";
const DIVERGING_MID_DARK = "#383835";

const sequentialInterpolator = interpolate(SEQUENTIAL_STOPS, "oklch");
const divergingColdInterpolator = interpolate([DIVERGING_COLD, DIVERGING_MID_LIGHT], "oklch");
const divergingHotInterpolator = interpolate([DIVERGING_MID_LIGHT, DIVERGING_HOT], "oklch");
const divergingColdInterpolatorDark = interpolate([DIVERGING_COLD, DIVERGING_MID_DARK], "oklch");
const divergingHotInterpolatorDark = interpolate([DIVERGING_MID_DARK, DIVERGING_HOT], "oklch");

export function isDarkMode(): boolean {
  const stamped = document.documentElement.getAttribute("data-theme");
  if (stamped === "dark") return true;
  if (stamped === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

/** Sequential single-hue ramp for absolute-magnitude values. `t` in [0,1]. */
export function sequentialColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  return formatHex(sequentialInterpolator(clamped)) ?? "#888888";
}

/** Diverging blue<->red ramp for signed deviation values. `t` in [-1,1],
 * 0 = neutral midpoint. */
export function divergingColor(t: number, dark = isDarkMode()): string {
  const clamped = Math.max(-1, Math.min(1, t));
  if (clamped <= 0) {
    const fn = dark ? divergingColdInterpolatorDark : divergingColdInterpolator;
    return formatHex(fn(clamped + 1)) ?? "#888888";
  }
  const fn = dark ? divergingHotInterpolatorDark : divergingHotInterpolator;
  return formatHex(fn(clamped)) ?? "#888888";
}

export function sequentialGradientCss(steps = 12, direction = "to right"): string {
  const stops = Array.from({ length: steps }, (_, i) => sequentialColor(i / (steps - 1)));
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}

export function divergingGradientCss(steps = 12, dark = isDarkMode(), direction = "to right"): string {
  const stops = Array.from({ length: steps }, (_, i) => divergingColor((i / (steps - 1)) * 2 - 1, dark));
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}
