import { formatHex, interpolate } from "culori";

// Anchors taken verbatim from the dataviz skill's validated reference
// palette (references/palette.md) -- sequential ramp (100->700, blue,
// light->dark) and the diverging blue<->red pair with neutral midpoint.
const SEQUENTIAL_STOPS = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
  "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
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

export function sequentialGradientCss(steps = 12): string {
  const stops = Array.from({ length: steps }, (_, i) => sequentialColor(i / (steps - 1)));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function divergingGradientCss(steps = 12, dark = isDarkMode()): string {
  const stops = Array.from({ length: steps }, (_, i) => divergingColor((i / (steps - 1)) * 2 - 1, dark));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
