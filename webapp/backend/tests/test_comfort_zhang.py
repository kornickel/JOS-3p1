# -*- coding: utf-8 -*-
"""Tests for the Zhang sensation/comfort model (src/jos3/comfort_zhang.py).

This is the only piece of genuinely new arithmetic in the comfort work, so it
gets checked against the anchors the published model is built around rather
than against golden numbers of my own making.
"""
import math

import pytest
from jos3 import comfort_zhang as cz
from jos3.matrix import BODY_NAMES

PARTS = [cz.JOS3_TO_ZHANG[b] for b in BODY_NAMES]


def test_every_jos3_segment_maps_to_a_coefficient_set():
    for body in BODY_NAMES:
        part = cz.JOS3_TO_ZHANG[body]
        assert part in cz.SENSATION_STATIC
        assert part in cz.SENSATION_DYNAMIC
        assert part in cz.COMFORT_LOCAL
        assert part in cz.OPPOSITE_FORCE


def test_neutral_state_is_neutral_sensation():
    """Skin exactly on its set point, nothing moving -> sensation 0."""
    for part in cz.SENSATION_STATIC:
        s = cz.local_sensation(part, tsk=34.0, tsk_set=34.0, tsk_mean=34.0, tsk_mean_set=34.0)
        assert s == pytest.approx(0.0, abs=1e-9)


def test_neutral_sensation_gives_maximum_comfort():
    """With a neutral whole body, local comfort peaks at exactly C6 and the
    peak sits at the offset C8 -- the two anchors of Eq. (9)'s saddle."""
    for part, c in cz.COMFORT_LOCAL.items():
        peak = cz.local_comfort(part, s_local=-c["c8"], s_overall=0.0)
        assert peak == pytest.approx(c["c6"], abs=1e-9), part


@pytest.mark.parametrize("extreme", [-4.0, 4.0])
def test_extreme_local_sensation_gives_minimum_comfort(extreme):
    """At S_local = +/-4 the saddle must bottom out at exactly -4. This is
    what pins down the |u|^n reading of Eq. (9): a signed power misses it for
    n = 1 and n = 1.5.

    Note the anchor is S_local = +/-4 itself, not the offset-shifted value --
    at those points |S_local + X| is exactly the |+/-4 + X| appearing in the
    equation's own denominators, so the two cancel and leave -4 + C6 - C6."""
    for part in cz.COMFORT_LOCAL:
        value = cz.local_comfort(part, s_local=extreme, s_overall=0.0)
        assert value == pytest.approx(-4.0, abs=1e-9), part


def test_sensation_is_monotonic_in_skin_temperature():
    """Warmer skin must never feel cooler."""
    for part in cz.SENSATION_STATIC:
        prev = -math.inf
        for tsk in [30.0, 31.0, 32.0, 33.0, 34.0, 35.0, 36.0, 37.0, 38.0]:
            s = cz.local_sensation(part, tsk, 34.0, tsk, 34.0)
            assert s >= prev - 1e-12, part
            prev = s


def test_dynamic_term_overshoots_on_cooling_and_warming():
    """A falling skin temperature must read cooler than the same temperature
    held steady, and a rising one warmer -- that is the whole point of the
    dynamic term."""
    steady = cz.local_sensation("chest", 33.0, 34.0, 33.0, 34.0, dtsk_dt=0.0, dtcr_dt=0.0)
    cooling = cz.local_sensation("chest", 33.0, 34.0, 33.0, 34.0, dtsk_dt=-0.002, dtcr_dt=0.0)
    warming = cz.local_sensation("chest", 33.0, 34.0, 33.0, 34.0, dtsk_dt=+0.002, dtcr_dt=0.0)
    assert cooling < steady < warming


def test_core_derivative_is_off_by_default_because_exercise_inverts_it():
    """Zhang's C3 coefficients assume a rising core means the part is being
    cooled (that is the causality in the chamber tests). Under exercise the
    core rises from metabolic heat, so feeding the derivative in makes hot
    exertion read as cool. Pin the default down.
    """
    assert cz.USE_CORE_DERIVATIVE is False

    # A hot, sweating torso with the core climbing at a realistic ascent rate.
    dtcr = 1.5 / 3600.0  # 1.5 K/h, measured on the example hike's ascent
    warm_static = cz.local_sensation("pelvis", 36.6, 34.7, 36.0, 34.5, 0.0, 0.0)
    with_core = cz.local_sensation("pelvis", 36.6, 34.7, 36.0, 34.5, 0.0, dtcr)
    # The pelvis has weak static coefficients (C1_warm 0.40) but the largest
    # C3 (-5053), which is exactly what makes the imbalance visible.
    assert warm_static > 1.4, "static term should already read warm"
    assert with_core < warm_static - 1.5, "the C3 term drags it far cooler"
    assert with_core < 0, "warm exertion would even flip to 'cool'"

    # evaluate_series must not apply it unless asked.
    steps = 4
    tsk = [[36.6] * 17 for _ in range(steps)]
    tcr = [37.0 + 0.025 * i for i in range(steps)]  # rising core
    default = cz.evaluate_series(tsk, [34.7] * 17, tcr, BODY_NAMES)
    opted_in = cz.evaluate_series(tsk, [34.7] * 17, tcr, BODY_NAMES, use_core_derivative=True)
    assert default["SensationOverall"][-1] > opted_in["SensationOverall"][-1]


def test_sensation_and_comfort_stay_on_scale():
    for part in cz.SENSATION_STATIC:
        for tsk in (10.0, 25.0, 34.0, 42.0, 50.0):
            s = cz.local_sensation(part, tsk, 34.0, tsk, 34.0, dtsk_dt=-0.05, dtcr_dt=-0.01)
            assert -4.0 <= s <= 4.0
            for so in (-4.0, -2.0, 0.0, 2.0, 4.0):
                assert -4.0 <= cz.local_comfort(part, s, so) <= 4.0


def test_uniform_overall_sensation_tracks_the_local_one():
    """If every part feels the same, the whole body feels that too."""
    for level in (-3.0, -1.0, 0.0, 1.0, 3.0):
        s = cz.overall_sensation([level] * len(PARTS), PARTS)
        assert s == pytest.approx(level, abs=0.35)


def test_one_cold_part_pulls_a_warm_body_down():
    """A single strongly cold dominant part must drag overall sensation
    towards cold (Part III's opposite-sensation branch)."""
    warm = [2.0] * len(PARTS)
    with_cold_chest = list(warm)
    with_cold_chest[BODY_NAMES.index("Chest")] = -3.0
    assert cz.overall_sensation(with_cold_chest, PARTS) < cz.overall_sensation(warm, PARTS)


def test_opposite_force_heating_branch_matches_corrected_paper_coefficients():
    """The printed Table 2 in Zhang Part III disagrees with the paper's own
    Figure 4 regression-line captions for a_hi (the delta_S_local >= 2 /
    heating branch); OPPOSITE_FORCE follows the captions, not the printed
    table (see the comment above OPPOSITE_FORCE for how this was verified
    by pixel-measuring the actual plotted regression lines). Pin the
    corrected values down for chest and hand, the two body parts with a
    citable, independently measured regression line.
    """
    # Chest: Figure 4a's caption is "0.97 * delta_S_chest
    # (delta_S_chest >= 2) + 1.14"; OPPOSITE_FORCE stores this as
    # a*(delta-2)+b, so at delta=6.2 (the figure's rightmost data point)
    # this must land near that value, not the printed table's
    # 0.4*(6.2-2)+1.14=2.82.
    chest = cz._individual_force("chest", 6.2)
    assert chest == pytest.approx(0.97 * (6.2 - 2.0) + 1.14, abs=1e-9)
    assert chest > 5.0  # printed-table value (a_hi=0.4) would have been 2.82

    # Hand: caption "0.33 * delta_S_hand (delta_S_hand >= 2)", b_hi=0.
    hand = cz._individual_force("hand", 6.6)
    assert hand == pytest.approx(0.33 * (6.6 - 2.0), abs=1e-9)
    assert hand > 1.4  # printed-table value (a_hi=0.1) would have been 0.46

    # Continuity: every branch must still agree with its own b_hi at the
    # delta=2 seam (a_hi*(2-2)+b_hi = b_hi), regardless of which a_hi is used.
    for part, c in cz.OPPOSITE_FORCE.items():
        assert cz._individual_force(part, 2.0) == pytest.approx(c["b_hi"], abs=1e-9), part


def test_overall_comfort_is_driven_by_the_worst_parts():
    """One very uncomfortable part must dominate a body of comfortable ones."""
    good = [2.0] * len(PARTS)
    one_bad = list(good)
    one_bad[BODY_NAMES.index("LFoot")] = -4.0
    assert cz.overall_comfort(one_bad, PARTS) < cz.overall_comfort(good, PARTS)


def test_paired_hands_do_not_both_count_as_worst():
    """Two cold hands are one complaint, not two (Table 6 note): the second
    vote must come from a different body part."""
    comforts = [2.0] * len(PARTS)
    comforts[BODY_NAMES.index("LHand")] = -4.0
    comforts[BODY_NAMES.index("RHand")] = -4.0
    both_hands = cz.overall_comfort(comforts, PARTS, transient_or_controlled=False)
    one_hand = list(comforts)
    one_hand[BODY_NAMES.index("RHand")] = 2.0
    assert both_hands == pytest.approx(cz.overall_comfort(one_hand, PARTS, transient_or_controlled=False))


def test_evaluate_series_shapes_and_neutrality():
    tsk_set = [34.0] * 17
    steps = 5
    tsk = [[34.0] * 17 for _ in range(steps)]
    tcr = [37.0] * steps
    out = cz.evaluate_series(tsk, tsk_set, tcr, BODY_NAMES)

    assert len(out["SensationOverall"]) == steps
    assert len(out["ComfortOverall"]) == steps
    for body in BODY_NAMES:
        assert len(out[f"SensationLocal{body}"]) == steps
        assert len(out[f"ComfortLocal{body}"]) == steps
        assert out[f"SensationLocal{body}"][0] == pytest.approx(0.0, abs=1e-9)
    # A perfectly neutral body should sit at essentially neutral sensation and
    # be comfortable.
    assert out["SensationOverall"][0] == pytest.approx(0.0, abs=0.35)
    assert out["ComfortOverall"][0] > 1.0
