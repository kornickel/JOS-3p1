// Derives JOS-3's PAR from walking data (speed, grade, pack load, terrain).
//
// WHY THIS EXISTS: PAR is *not* MET. `local_mwork()` in
// src/jos3/thermoregulation.py computes `(par - 1) * bmr`, so PAR is a
// multiple of the person's BASAL metabolic rate, whereas 1 MET is defined as
// 58.15 W/m2 (seated rest, which is higher than basal). For a 1.75 m / 72 kg
// / 34 y male the model reports BMR = 44.53 W/m2 = 0.766 MET, so
// PAR ~= 1.31 x MET. Entering an ACSM/compendium MET value straight into the
// PAR field therefore understates the metabolic heat production by ~30 %.
// This module converts properly, via absolute watts.
//
// MODEL CHOICE: Minetti's fifth-order polynomial for the energy cost of
// walking, verified against the primary source (Minetti et al., "Energy cost
// of walking and running at extreme uphill and downhill slopes", J Appl
// Physiol 93:1039-1046, 2002, Eq. on p. 1041):
//
//     Cw(i) = 280.5 i^5 - 58.7 i^4 - 76.8 i^3 + 51.9 i^2 + 19.6 i + 2.5
//
// (R^2 = 0.999, i = gradient as a fraction). Cross-check against the paper's
// own reported values: Cw(0) = 2.5 J/kg/m (level walking) and
// Cw(+0.45) = 17.60 vs. the reported 17.33 +/- 1.11 J/kg/m.
//
// Minetti was chosen over the Pandolf equation -- the military load-carriage
// standard -- because Pandolf's grade term is *linear* (0.35 V G) and breaks
// down downhill: for 72 kg + 8 kg at 4.5 km/h and -15 % it returns -295 W,
// which is physically meaningless. The usual remedy is the Santee correction,
// but the two sources found for it disagree (a full correction-factor
// expression vs. a simple floor at 1.5 W), and neither could be confirmed
// against the primary USARIEM report -- so it is deliberately not used here.
// Minetti is validated continuously from -45 % to +45 %, needs no seam
// between an uphill and a downhill branch, and its coefficients were read
// straight out of the paper.
//
// What Minetti does not cover is load carriage, so Pandolf's load-penalty
// term `2.0 (W+L) (L/W)^2` is kept (it is small for hiking loads -- ~2 W for
// an 8 kg pack on 72 kg -- but it is the recognised correction), and the load
// is otherwise treated as transported mass.
//
// KNOWN LIMITATION: Minetti's data are treadmill walking, unloaded, at
// freely-chosen speed. Real trail descents cost more than the treadmill
// equivalent because of braking, foot placement and stabilisation. The
// terrain factor is the lever for that; for technical descents pick a rougher
// terrain class than the ground alone would suggest.
//
// VERIFIED REFERENCE VALUES for the example hiker (72 kg, BMR 44.53 W/m2,
// BSA 1.871 m2, 8 kg pack). Recompute these if the formula is ever touched:
//
//   standing still                    110 W   1.01 MET   PAR  1.32
//   level forest road, 3 km/h         293 W   2.70 MET   PAR  3.52
//   forest trail 3.5 km/h, 6 %        469 W   4.31 MET   PAR  5.63
//   brisk ascent 4 km/h, 12 %         693 W   6.37 MET   PAR  8.31
//   steep ridge 3 km/h, 25 %         1059 W   9.73 MET   PAR 12.71
//   descent 4.5 km/h, -15 %           222 W   2.04 MET   PAR  2.67
//
// Cross-checks: standing lands on PAR 1.32 against JOS-3's own PAR 1.25
// default for quiet rest; the 12 % ascent gives 6.37 MET against 7.0 MET from
// the ACSM walking equation and 736 W from Pandolf -- all inside ~10 %, which
// is well within these models' own scatter.

/** Terrain factors after Soule & Goldman, as used by the Pandolf equation. */
export const TERRAIN_FACTORS = {
  paved: 1.0,
  dirt_road: 1.1,
  trail: 1.2,
  rough_trail: 1.5,
  scree: 2.1,
} as const;

export type Terrain = keyof typeof TERRAIN_FACTORS;

export const TERRAIN_ORDER: Terrain[] = ["paved", "dirt_road", "trail", "rough_trail", "scree"];

/** Gradient range Minetti's polynomial was fitted over. */
export const MIN_GRADE_PCT = -45;
export const MAX_GRADE_PCT = 45;

export interface ActivityInput {
  speed_kmh: number;
  grade_pct: number;
  load_kg: number;
  terrain: Terrain;
}

export interface ParEstimate {
  /** Total metabolic rate [W] */
  watts: number;
  /** Metabolic rate expressed in MET (1 MET = 58.15 W/m2) */
  met: number;
  /** JOS-3 PAR, i.e. the multiple of basal metabolic rate */
  par: number;
}

/** Minetti's energy cost of walking [J/kg/m]. `gradeFraction` is rise/run,
 * positive uphill. Outside +/-0.45 the polynomial is extrapolation, so the
 * caller should clamp -- see MIN_GRADE_PCT/MAX_GRADE_PCT. */
export function walkingCost(gradeFraction: number): number {
  const i = gradeFraction;
  return 280.5 * i ** 5 - 58.7 * i ** 4 - 76.8 * i ** 3 + 51.9 * i ** 2 + 19.6 * i + 2.5;
}

/**
 * Total metabolic rate and the resulting PAR.
 *
 * `bmrWattsPerM2` and `bsaM2` come straight from /api/model/preview, so the
 * PAR is expressed against the very same basal rate the simulation will use.
 */
export function estimatePar(
  input: ActivityInput,
  bodyMassKg: number,
  bmrWattsPerM2: number,
  bsaM2: number
): ParEstimate {
  const bmrWatts = bmrWattsPerM2 * bsaM2; // PAR is defined against this
  const v = input.speed_kmh / 3.6; // [m/s]
  const grade = Math.max(MIN_GRADE_PCT, Math.min(MAX_GRADE_PCT, input.grade_pct)) / 100;
  const eta = TERRAIN_FACTORS[input.terrain];
  const totalMass = bodyMassKg + input.load_kg;

  // Locomotion: cost per kg per metre x transported mass x distance per second.
  const locomotion = eta * walkingCost(grade) * totalMass * v;
  // Pandolf's load penalty -- carrying is costlier than the added mass alone.
  const loadPenalty = bodyMassKg > 0 ? 2.0 * totalMass * (input.load_kg / bodyMassKg) ** 2 : 0;
  // Resting baseline. Minetti's Cw is a *net* cost above rest, so a baseline
  // has to be added back. Pandolf's standing term 1.5 W is used rather than
  // the basal rate, because standing costs more than lying basal: for 72 kg
  // it gives 108 W against a BMR of 83 W, i.e. PAR 1.3 at standstill, which
  // lines up with JOS-3's own default of PAR 1.25 for quiet rest. (Sitting is
  // marginally cheaper than standing; that difference is not modelled.)
  const standingWatts = 1.5 * bodyMassKg;
  const watts = standingWatts + locomotion + loadPenalty;

  return {
    watts,
    met: watts / (58.15 * bsaM2),
    par: watts / bmrWatts,
  };
}
