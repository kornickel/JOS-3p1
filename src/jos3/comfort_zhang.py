# -*- coding: utf-8 -*-
"""Zhang thermal sensation and comfort model, coupled to JOS-3.

Implements the three-part model of

    H. Zhang, E. Arens, C. Huizenga, T. Han, "Thermal sensation and comfort
    models for non-uniform and transient environments",
    Building and Environment 45(2), 2010:
      Part I   -- local sensation of individual body parts   (pp. 380-388)
      Part II  -- local comfort of individual body parts     (pp. 389-398)
      Part III -- whole-body sensation and comfort           (pp. 399-410)

All coefficients below are transcribed from the open-access UC Berkeley
preprints (escholarship.org items 3sw061xh, 1pz9j3j2 and 2tm289vb), Part I
Tables 1 and 2, Part II Table 1, and Part III Table 2.

WHY THIS MODEL. JOS-3 computes physiology but never evaluates it: there is no
comfort output anywhere in the package. `comfmod.pmv()` exists but is only
used to pick an initial operative temperature, and PMV would be the wrong
instrument here anyway -- it is a steady-state, uniform-environment model
validated around 1-4 met. Zhang's model is built for exactly the opposite
case: per-segment, transient, asymmetric. That is what a mountain hike is.

It pairs unusually well with JOS-3 because the local neutral reference it
needs is already there. `JOS3._reset_setpt()` runs a steady-state
equilibration in a PMV=0 environment at construction time and stores the
resulting per-segment skin temperatures in `setpt_sk` (33.9-35.8 C across the
17 segments, not a flat 34). That is precisely Zhang's `Tskin,i,set`, so no
separate set-point table is required.

VALIDITY. Zhang's coefficients come from seated subjects in climate chambers.
Applying them to a loaded ascent at PAR 9 is extrapolation, and callers should
say so in their UI. It is a far better-founded extrapolation than PMV would
be -- transience and non-uniformity, the dominant effects here, are what the
model was built for -- and Part II notes that the warmest chamber tests had
subjects sweating moderately, so the coefficients cover some wet-skin
conditions. But it is extrapolation.

Nothing in this module touches the thermoregulation core; it is pure
post-processing over a finished time series.
"""
from __future__ import annotations

import math
from typing import Dict, List, Optional, Sequence

# ---------------------------------------------------------------------------
# Mapping JOS-3's 17 segments onto Zhang's body parts.
#
# Zhang models 19 parts; the 17 JOS-3 segments map onto 12 of them without any
# ambiguity. Left and right share coefficients (Zhang never distinguishes
# sides). Zhang's "face" and "breath" have no JOS-3 counterpart and are
# dropped -- JOS-3's "Head" covers the whole head.
# ---------------------------------------------------------------------------
JOS3_TO_ZHANG: Dict[str, str] = {
    "Head": "head",
    "Neck": "neck",
    "Chest": "chest",
    "Back": "back",
    "Pelvis": "pelvis",
    "LShoulder": "upper arm", "RShoulder": "upper arm",
    "LArm": "lower arm", "RArm": "lower arm",
    "LHand": "hand", "RHand": "hand",
    "LThigh": "thigh", "RThigh": "thigh",
    "LLeg": "lower leg", "RLeg": "lower leg",
    "LFoot": "foot", "RFoot": "foot",
}

# Parts whose local sensation carries extra weight in the overall model
# (Part III, section 4.2).
DOMINANT_PARTS = ("chest", "back", "pelvis")

# Part I, Table 1 -- static local sensation. (C1, K1) for the cool side
# (Tskin,i - Tskin,i,set < 0) and the warm side (>= 0).
SENSATION_STATIC: Dict[str, Dict[str, float]] = {
    "head":      {"c1_cool": 0.40, "k1_cool": 0.20, "c1_warm": 3.90, "k1_warm": 0.20},
    "neck":      {"c1_cool": 0.40, "k1_cool": 0.15, "c1_warm": 1.25, "k1_warm": 0.15},
    "chest":     {"c1_cool": 0.35, "k1_cool": 0.10, "c1_warm": 1.00, "k1_warm": 0.10},
    "back":      {"c1_cool": 0.30, "k1_cool": 0.10, "c1_warm": 1.00, "k1_warm": 0.10},
    "pelvis":    {"c1_cool": 0.20, "k1_cool": 0.15, "c1_warm": 0.40, "k1_warm": 0.15},
    "upper arm": {"c1_cool": 0.30, "k1_cool": 0.10, "c1_warm": 0.40, "k1_warm": 0.10},
    "lower arm": {"c1_cool": 0.30, "k1_cool": 0.10, "c1_warm": 0.70, "k1_warm": 0.10},
    "hand":      {"c1_cool": 0.20, "k1_cool": 0.15, "c1_warm": 0.45, "k1_warm": 0.15},
    "thigh":     {"c1_cool": 0.20, "k1_cool": 0.10, "c1_warm": 0.30, "k1_warm": 0.10},
    "lower leg": {"c1_cool": 0.30, "k1_cool": 0.10, "c1_warm": 0.40, "k1_warm": 0.10},
    "foot":      {"c1_cool": 0.25, "k1_cool": 0.15, "c1_warm": 0.25, "k1_warm": 0.15},
}

# Part I, Table 2 -- dynamic local sensation.
#   Sensation_dynamic = C21 dTsk/dt(-) + C22 dTsk/dt(+) + C3 dTcr/dt
# Derivatives are in K/s (the coefficients are of order 10^2-10^3 precisely
# because of that unit). C3 is non-zero only for the parts whose cooling
# provokes an immediate core response.
#
# ON THE C3 TERM AND EXERCISE -- see USE_CORE_DERIVATIVE below. Part I is
# explicit that the negative C3 values encode an observation from the chamber
# tests: cooling chest, back, pelvis or face makes core temperature rise
# immediately. The causality there runs skin-cooling -> core-rise, so "core
# rising" is evidence of "being cooled". Under exercise the same signal means
# the opposite, and the term then works backwards.
SENSATION_DYNAMIC: Dict[str, Dict[str, float]] = {
    "head":      {"c21": 543.0, "c22":  90.0, "c3":     0.0},
    "neck":      {"c21": 173.0, "c22": 217.0, "c3":     0.0},
    "chest":     {"c21":  39.0, "c22": 136.0, "c3": -2135.0},
    "back":      {"c21":  88.0, "c22": 192.0, "c3": -4054.0},
    "pelvis":    {"c21":  75.0, "c22": 137.0, "c3": -5053.0},
    "upper arm": {"c21": 156.0, "c22": 167.0, "c3":     0.0},
    "lower arm": {"c21": 144.0, "c22": 125.0, "c3":     0.0},
    "hand":      {"c21":  19.0, "c22":  46.0, "c3":     0.0},
    "thigh":     {"c21": 151.0, "c22": 263.0, "c3":     0.0},
    "lower leg": {"c21": 206.0, "c22": 212.0, "c3":     0.0},
    "foot":      {"c21": 109.0, "c22": 162.0, "c3":     0.0},
}

# Part II, Table 1 -- local comfort. `n` selects the saddle curvature
# (1 linear, 1.5 exponential, 2 quadratic).
COMFORT_LOCAL: Dict[str, Dict[str, float]] = {
    "head":      {"c31": -0.35, "c32": 0.35, "c6": 2.17, "c71": 0.28, "c72": 0.40, "c8":  0.50, "n": 2.0},
    "neck":      {"c31":  0.00, "c32": 0.00, "c6": 1.96, "c71": 0.00, "c72": 0.00, "c8": -0.19, "n": 1.0},
    "back":      {"c31": -0.45, "c32": 0.45, "c6": 2.10, "c71": 0.96, "c72": 0.00, "c8":  0.00, "n": 1.0},
    "chest":     {"c31": -0.66, "c32": 0.66, "c6": 2.10, "c71": 1.39, "c72": 0.90, "c8":  0.00, "n": 2.0},
    "pelvis":    {"c31": -0.59, "c32": 0.00, "c6": 2.06, "c71": 0.50, "c72": 0.00, "c8": -0.51, "n": 1.0},
    "upper arm": {"c31": -0.30, "c32": 0.35, "c6": 2.14, "c71": 0.00, "c72": 0.00, "c8": -0.40, "n": 1.0},
    "lower arm": {"c31": -0.23, "c32": 0.23, "c6": 2.00, "c71": 0.00, "c72": 1.71, "c8": -0.68, "n": 1.0},
    "hand":      {"c31": -0.80, "c32": 0.80, "c6": 1.98, "c71": 0.48, "c72": 0.48, "c8":  0.00, "n": 1.0},
    "thigh":     {"c31":  0.00, "c32": 0.00, "c6": 1.98, "c71": 0.00, "c72": 0.00, "c8":  0.00, "n": 1.0},
    "lower leg": {"c31": -0.20, "c32": 0.61, "c6": 2.00, "c71": 1.67, "c72": 0.00, "c8":  0.00, "n": 1.5},
    "foot":      {"c31": -0.91, "c32": 0.40, "c6": 2.13, "c71": 0.50, "c72": 0.30, "c8":  0.00, "n": 2.0},
}

# Part III, Table 2 -- 'individual force' of an opposite-sensation body part,
# by three-piece regression over delta S_local.
#   individual force = a (delta S_local - c) + b
#
# CORRECTION TO THE PRINTED TABLE ("a_hi", the delta >= 2 / heating column).
# The published Table 2 (Building and Environment 45(2), p.11) disagrees with
# itself: directly beneath that table, Figure 4's regression-line captions for
# chest and hand give a_hi = 0.97 and 0.33, not the 0.40/0.10 printed in the
# table. A second copy of the same table, embedded in the Figure 5 flow chart
# (p.14), matches those captions and gives consistently larger a_hi for most
# rows. Measuring the actual plotted regression lines in Figure 4 pixel-by-
# -pixel (least-squares fit of the line's pixels, calibrated against the
# chart's own axis gridlines) gives slopes of 0.968 (chest) and 0.333 (hand)
# -- matching the caption/flow-chart figures, not the printed table, to within
# measurement error. The values below therefore follow the caption/flow-chart
# figures for every row where they differ from the printed table, EXCEPT
# "foot": there the flow-chart copy also has a different threshold (c = +/-1
# instead of +/-2), which points to a transcription/layout error in that one
# cell rather than a second, valid dataset, so "foot" keeps the printed
# table's values unchanged. "upper arm"/"lower arm" are unchanged too -- the
# two table copies agree there (lower arm exactly; upper arm differs only by
# 0.03, within rounding).
OPPOSITE_FORCE: Dict[str, Dict[str, float]] = {
    #            delta <= -2            -2 < delta < 2        delta >= 2
    "head":      {"a_lo": 0.54, "b_lo": -1.10, "a_mid": 0.50, "a_hi": 0.69, "b_hi": 1.10},
    "neck":      {"a_lo": 0.65, "b_lo": -0.92, "a_mid": 0.46, "a_hi": 0.63, "b_hi": 0.92},
    "chest":     {"a_lo": 0.91, "b_lo": -1.14, "a_mid": 0.57, "a_hi": 0.97, "b_hi": 1.14},
    "back":      {"a_lo": 0.91, "b_lo": -0.92, "a_mid": 0.46, "a_hi": 0.75, "b_hi": 0.92},
    "pelvis":    {"a_lo": 0.94, "b_lo": -0.64, "a_mid": 0.32, "a_hi": 0.75, "b_hi": 0.64},
    "upper arm": {"a_lo": 0.43, "b_lo": -0.56, "a_mid": 0.28, "a_hi": 0.40, "b_hi": 0.56},
    "lower arm": {"a_lo": 0.37, "b_lo": -0.73, "a_mid": 0.38, "a_hi": 0.30, "b_hi": 0.73},
    "hand":      {"a_lo": 0.25, "b_lo":  0.00, "a_mid": 0.00, "a_hi": 0.33, "b_hi": 0.00},
    "thigh":     {"a_lo": 0.81, "b_lo": -0.60, "a_mid": 0.30, "a_hi": 0.82, "b_hi": 0.60},
    "lower leg": {"a_lo": 0.70, "b_lo": -0.59, "a_mid": 0.29, "a_hi": 0.80, "b_hi": 0.59},
    "foot":      {"a_lo": 0.50, "b_lo":  0.00, "a_mid": 0.00, "a_hi": 0.60, "b_hi": 0.00},
}

SENSATION_MIN, SENSATION_MAX = -4.0, 4.0

# Whether `evaluate_series` feeds the core-temperature derivative into the
# dynamic term. Off by default, and that is a deliberate deviation from the
# published model.
#
# Zhang's C3 coefficients were fitted where a rising core temperature was the
# *consequence* of local skin cooling, so a negative C3 correctly reads "core
# rising -> this body part is being cooled -> it feels cooler". During
# exercise the core rises from metabolic heat instead, and the same input then
# drives sensation the wrong way. Measured on the example mountain hike: on
# the forest ascent the core climbs 1.5 K/h = 4.17e-4 K/s, which via
# C3 = -5053 (pelvis) subtracts 2.1 sensation units; the chest goes from a
# static +2.97 ("warm", matching Tsk 36.6 C and 79 % wettedness) down to
# +2.08, and through the torso's dominance in Part III the whole body reads
# "slightly cool" while the hiker is actually overheating.
#
# The skin-temperature derivatives (C21/C22) are unaffected -- their causality
# is direct -- and stay active.
USE_CORE_DERIVATIVE = False


def _clip(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else hi if v > hi else v


# ---------------------------------------------------------------------------
# Part I -- local sensation
# ---------------------------------------------------------------------------
def local_sensation(
    zhang_part: str,
    tsk: float,
    tsk_set: float,
    tsk_mean: float,
    tsk_mean_set: float,
    dtsk_dt: float = 0.0,
    dtcr_dt: float = 0.0,
) -> float:
    """Local thermal sensation on Zhang's -4..+4 scale (Part I, Eq. 5).

    `dtsk_dt` and `dtcr_dt` are in K/s.
    """
    static = SENSATION_STATIC[zhang_part]
    delta = tsk - tsk_set
    delta_mean = tsk_mean - tsk_mean_set
    if delta < 0:
        c1, k1 = static["c1_cool"], static["k1_cool"]
    else:
        c1, k1 = static["c1_warm"], static["k1_warm"]

    exponent = -(c1 * delta + k1 * (delta - delta_mean))
    # exp overflows long before the logistic stops being saturated.
    if exponent > 700:
        logistic = 0.0
    elif exponent < -700:
        logistic = 1.0
    else:
        logistic = 1.0 / (1.0 + math.exp(exponent))
    s_static = 4.0 * (2.0 * logistic - 1.0)

    dyn = SENSATION_DYNAMIC[zhang_part]
    s_dynamic = (
        dyn["c21"] * min(dtsk_dt, 0.0)
        + dyn["c22"] * max(dtsk_dt, 0.0)
        + dyn["c3"] * dtcr_dt
    )
    return _clip(s_static + s_dynamic, SENSATION_MIN, SENSATION_MAX)


# ---------------------------------------------------------------------------
# Part II -- local comfort
# ---------------------------------------------------------------------------
def local_comfort(zhang_part: str, s_local: float, s_overall: float) -> float:
    """Local thermal comfort on the -4..+4 scale (Part II, Eq. 9).

    The published equation writes the saddle term as `(S_l + ...)^n`; it has
    to be read as `|S_l + ...|^n`, consistent with the absolute-value bars in
    its own denominators. Checked against the two anchors the model is built
    around: with a neutral overall sensation the curve peaks at exactly C6 at
    neutral local sensation and reaches exactly -4 at S_local = +/-4. A plain
    signed power satisfies neither for n = 1 or n = 1.5.
    """
    c = COMFORT_LOCAL[zhang_part]
    so_cool = abs(min(s_overall, 0.0))  # |S_o^-|
    so_warm = max(s_overall, 0.0)       # |S_o^+|

    # Maximum attainable comfort, raised as the whole body moves off neutral.
    w = c["c6"] + c["c71"] * so_cool + c["c72"] * so_warm
    # Offset: where along the local-sensation axis that maximum sits.
    x = c["c31"] * so_cool + c["c32"] * so_warm + c["c8"]
    n = c["n"]
    u = s_local + x

    denom_cold = abs(-4.0 + x) ** n
    denom_warm = abs(4.0 + x) ** n
    if denom_cold == 0 or denom_warm == 0:
        return w
    a = (-4.0 - w) / denom_cold
    b = (-4.0 - w) / denom_warm

    # Logistic switch between the cold-side and warm-side branches. The 25x
    # gain makes it effectively a step at u = 0.
    gain = 25.0 * u
    if gain > 700:
        mix = b
    elif gain < -700:
        mix = a
    else:
        mix = (a - b) / (math.exp(gain) + 1.0) + b

    return _clip(mix * abs(u) ** n + w, SENSATION_MIN, SENSATION_MAX)


# ---------------------------------------------------------------------------
# Part III -- overall sensation
# ---------------------------------------------------------------------------
def _dedupe_paired(values: Sequence[float], parts: Sequence[str], warm: bool) -> List[float]:
    """Zhang counts the two hands as one body part and the two feet as one
    when picking extremes (Part III, 4.1.1). Keeps the more extreme of each
    pair."""
    best_paired: Dict[str, float] = {}
    out: List[float] = []
    for v, p in zip(values, parts):
        if p in ("hand", "foot"):
            cur = best_paired.get(p)
            if cur is None or (v > cur if warm else v < cur):
                best_paired[p] = v
        else:
            out.append(v)
    out.extend(best_paired.values())
    return out


def _no_opposite_overall(sensations: Sequence[float], parts: Sequence[str]) -> float:
    """Part III section 4.1: the 'no-opposite-sensation' model."""
    warm_side = sum(sensations) >= 0
    vals = _dedupe_paired(sensations, parts, warm=warm_side)
    if not vals:
        return 0.0
    ranked = sorted(vals, reverse=warm_side)  # most extreme first
    n_parts = len(ranked)

    if n_parts >= 3:
        third = ranked[2]
        if warm_side and third >= 2.0:
            # Eq. (1)
            return 0.5 * ranked[0] + 0.5 * third
        if not warm_side and third <= -2.0:
            # Eq. (2)
            return 0.38 * ranked[0] + 0.62 * third

    # Gradual model (Part III, 4.1.2): as sensations approach neutral, more
    # and more of the less extreme parts are folded into a plain average.
    # The paper states the rule for the cool side as
    #   if S_local,i < -2 + Interval * (i - 2): average parts 0..i
    # with Interval = 2 / (total body parts - 2). The warm side is the mirror
    # image. Implemented as: walk outwards from the third-most extreme and
    # keep including parts while they still sit beyond the sliding line;
    # falls back to the mean of all parts, which is the limit the rule
    # converges to near neutrality.
    if n_parts <= 2:
        return sum(ranked) / len(ranked)
    interval = 2.0 / max(n_parts - 2, 1)
    count = n_parts
    for i in range(2, n_parts):
        line = (2.0 - interval * (i - 2)) if warm_side else (-2.0 + interval * (i - 2))
        beyond = ranked[i] >= line if warm_side else ranked[i] <= line
        if not beyond:
            count = i
            break
    count = max(count, 1)
    return sum(ranked[:count]) / count


def _individual_force(zhang_part: str, delta_s_local: float) -> float:
    """Part III, Eq. (5) with the three-piece coefficients of Table 2."""
    f = OPPOSITE_FORCE[zhang_part]
    if delta_s_local <= -2.0:
        return f["a_lo"] * (delta_s_local - (-2.0)) + f["b_lo"]
    if delta_s_local >= 2.0:
        return f["a_hi"] * (delta_s_local - 2.0) + f["b_hi"]
    return f["a_mid"] * delta_s_local


def overall_sensation(sensations: Sequence[float], parts: Sequence[str]) -> float:
    """Whole-body thermal sensation (Part III, sections 4.1 and 4.2)."""
    if not sensations:
        return 0.0

    n_neg = sum(1 for s in sensations if s < 0)
    n_pos = sum(1 for s in sensations if s > 0)
    # Zeros join the bigger group; on a tie the positive group is the bigger
    # one (Part III, step 1).
    bigger_is_warm = n_pos >= n_neg

    def is_opposite(s: float, p: float) -> bool:
        if bigger_is_warm:
            # A dominant part that is merely slightly cool already counts.
            return s <= -1.0 if p in DOMINANT_PARTS else s < -1.0
        return s > 1.0

    opposites = [(s, p) for s, p in zip(sensations, parts) if is_opposite(s, p)]
    bigger = [(s, p) for s, p in zip(sensations, parts) if (s, p) not in opposites]
    if not bigger:
        bigger = list(zip(sensations, parts))

    s_bigger = _no_opposite_overall([s for s, _ in bigger], [p for _, p in bigger])
    if not opposites:
        return _clip(s_bigger, SENSATION_MIN, SENSATION_MAX)

    # For cooling, a dominant opposite part overrides everything: the overall
    # sensation becomes that part's own sensation (Part III, 4.2.2).
    if bigger_is_warm:
        dominant = [s for s, p in opposites if p in DOMINANT_PARTS]
        if dominant:
            return _clip(min(dominant), SENSATION_MIN, SENSATION_MAX)

    # Otherwise combine the strongest and second strongest individual forces,
    # the second at 10 % weight (Eq. 6), and add to the bigger group (Eq. 7).
    forces = sorted((_individual_force(p, s) for s, p in opposites), key=abs, reverse=True)
    combined = forces[0] + (0.1 * forces[1] if len(forces) > 1 else 0.0)
    return _clip(s_bigger + combined, SENSATION_MIN, SENSATION_MAX)


# ---------------------------------------------------------------------------
# Part III -- overall comfort
# ---------------------------------------------------------------------------
def overall_comfort(
    comforts: Sequence[float],
    parts: Sequence[str],
    transient_or_controlled: bool = True,
) -> float:
    """Whole-body thermal comfort (Part III, Table 6).

    Rule 1 averages the two least comfortable local votes. Rule 2 -- which
    applies when conditions are transient or the person can act on their own
    environment, both true of a hike -- also folds in the most comfortable
    vote. Hence the default.
    """
    if not comforts:
        return 0.0
    ranked = sorted(zip(comforts, parts))  # least comfortable first

    worst = ranked[0]
    second = None
    for cand in ranked[1:]:
        # If both hands (or both feet) occupy the two worst slots, skip the
        # duplicate and take the next part instead (Table 6, note).
        if cand[1] == worst[1] and cand[1] in ("hand", "foot"):
            continue
        second = cand
        break
    if second is None:
        second = worst

    votes = [worst[0], second[0]]
    if transient_or_controlled:
        votes.append(max(comforts))
    return _clip(sum(votes) / len(votes), SENSATION_MIN, SENSATION_MAX)


# ---------------------------------------------------------------------------
# Convenience wrapper over a JOS-3 time series
# ---------------------------------------------------------------------------
def evaluate_series(
    tsk: Sequence[Sequence[float]],
    tsk_set: Sequence[float],
    tcr_mean: Sequence[float],
    body_names: Sequence[str],
    dtimes: Optional[Sequence[float]] = None,
    transient_or_controlled: bool = True,
    use_core_derivative: bool = USE_CORE_DERIVATIVE,
) -> Dict[str, List[float]]:
    """Runs the full model over a simulation.

    Parameters
    ----------
    tsk
        Skin temperature per time step, each a sequence over `body_names`.
    tsk_set
        Per-segment neutral skin set points -- JOS-3's own `setpt_sk`.
    tcr_mean
        A whole-body core temperature per time step; its derivative feeds the
        dynamic term.
    dtimes
        Step lengths in seconds (default 60 s), used for the derivatives.

    Returns a dict of column name -> series, matching the layout the rest of
    the app expects: `SensationLocal<Body>`, `ComfortLocal<Body>`,
    `SensationOverall`, `ComfortOverall`.
    """
    n_steps = len(tsk)
    zhang_parts = [JOS3_TO_ZHANG[b] for b in body_names]
    mean_set = sum(tsk_set) / len(tsk_set)

    out: Dict[str, List[float]] = {}
    for b in body_names:
        out[f"SensationLocal{b}"] = []
        out[f"ComfortLocal{b}"] = []
    out["SensationOverall"] = []
    out["ComfortOverall"] = []

    for i in range(n_steps):
        dt = 60.0
        if dtimes is not None and i < len(dtimes) and dtimes[i]:
            dt = float(dtimes[i])
        prev = max(i - 1, 0)
        # Backward difference; the first step has no history, so it is zero.
        # Suppressed entirely unless the caller opts in -- see
        # USE_CORE_DERIVATIVE for why that is the default under exercise.
        if use_core_derivative and i > 0:
            dtcr = (tcr_mean[i] - tcr_mean[prev]) / dt
        else:
            dtcr = 0.0
        tsk_mean_now = sum(tsk[i]) / len(tsk[i])

        sensations: List[float] = []
        for j, b in enumerate(body_names):
            dtsk = (tsk[i][j] - tsk[prev][j]) / dt if i > 0 else 0.0
            s = local_sensation(
                zhang_parts[j], tsk[i][j], tsk_set[j], tsk_mean_now, mean_set, dtsk, dtcr
            )
            sensations.append(s)
            out[f"SensationLocal{b}"].append(s)

        s_overall = overall_sensation(sensations, zhang_parts)
        comforts = [local_comfort(zhang_parts[j], sensations[j], s_overall) for j in range(len(body_names))]
        for j, b in enumerate(body_names):
            out[f"ComfortLocal{b}"].append(comforts[j])
        out["SensationOverall"].append(s_overall)
        out["ComfortOverall"].append(
            overall_comfort(comforts, zhang_parts, transient_or_controlled)
        )

    return out
