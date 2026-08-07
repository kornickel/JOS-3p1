# -*- coding: utf-8 -*-
"""Centerpiece verification test (see implementation plan, §Verifikation).

Re-encodes the exact 14-segment, 6-hour mountain-hike scenario from
/test_mountain_hike.py as a ScenarioSpec, runs it through the HTTP API, and
checks two independent things:

1. Numeric parity: driving the *same* model directly through JOS3's own
   property setters (exactly like the original script does) must produce
   identical TskMean/WetMean/Tcr(chest)/WaterStorage values at every segment
   boundary. This proves jos3_bridge introduces zero drift relative to
   direct Python usage.
2. The same physiological plausibility checks the original script asserts
   (core/skin temp ranges, wettedness behavior at the summit, water-storage
   buildup in the rain, etc.) still hold when driven through the API.
"""
import math

from jos3 import JOS3

from app.example_scenarios import MODEL_CONFIG, MOUNTAIN_HIKE_SEGMENTS, build_mountain_hike_spec


def _run_direct():
    """Drives a fresh JOS3 model directly through its own property setters,
    exactly like test_mountain_hike.py does (one simulate() call per segment
    is numerically identical to that script's per-minute simulate(1) loop,
    since no parameter changes within a segment).

    Reads results back from `_history` (like `_record()` in the original
    script does: `h = mod._history[-1]; h["WetMean"]`), NOT from the live
    `model.Wet`/`WetMean` property getters. Those getters recompute
    wettedness straight from `threg.evaporation()` and do not know about
    this fork's clothing-water-storage adjustment (`_run()` computes an
    absorption/release-adjusted `wet_new` locally and only ever writes it
    into `_history`/`dict_results()`, never back into a persistent
    attribute) -- so the getters and the recorded history genuinely
    disagree once any water absorption is in play. `_history` is the
    correct ground truth here since it's what to_csv()/dict_results() (and
    therefore this backend's /api/simulate) actually expose.
    """
    model = JOS3(**MODEL_CONFIG)
    log = []
    for seg in MOUNTAIN_HIKE_SEGMENTS:
        for field, value in seg["regions"].items():
            setattr(model, field, value)
        if "PAR" in seg["globals"]:
            model.PAR = seg["globals"]["PAR"]
        if "posture" in seg["globals"]:
            model.posture = seg["globals"]["posture"]
        model.simulate(times=seg["times"], dtime=60)
        h = model._history[-1]
        log.append(dict(
            tcr=h["Tcr"][2], tsk=h["TskMean"], wet=h["WetMean"],
            store=model._water_storage.mean(),
            airperm=model.Icl_airperm.mean(), waterabs=model.Icl_waterabs.mean(),
        ))
    return log


def test_mountain_hike_matches_direct_model_driving(client):
    r = client.post("/api/simulate", json=build_mountain_hike_spec())
    assert r.status_code == 200
    results = r.json()["results"]
    bounds = r.json()["segment_bounds"]

    direct_log = _run_direct()
    assert len(direct_log) == len(bounds) == 14

    for i, bound in enumerate(bounds):
        last_index = bound["end_step"] - 1
        api_tcr = results["TcrChest"][last_index]
        api_tsk = results["TskMean"][last_index]
        api_wet = results["WetMean"][last_index]
        api_store = results["WaterStorageMean"][last_index]
        api_airperm = results["Icl_airpermMean"][last_index]
        api_waterabs = results["Icl_waterabsMean"][last_index]
        direct = direct_log[i]
        assert math.isclose(api_tcr, direct["tcr"], rel_tol=1e-9, abs_tol=1e-9), bound["id"]
        assert math.isclose(api_tsk, direct["tsk"], rel_tol=1e-9, abs_tol=1e-9), bound["id"]
        assert math.isclose(api_wet, direct["wet"], rel_tol=1e-9, abs_tol=1e-9), bound["id"]
        assert math.isclose(api_store, direct["store"], rel_tol=1e-9, abs_tol=1e-9), bound["id"]
        assert math.isclose(api_airperm, direct["airperm"], rel_tol=1e-9, abs_tol=1e-9), bound["id"]
        assert math.isclose(api_waterabs, direct["waterabs"], rel_tol=1e-9, abs_tol=1e-9), bound["id"]


def test_mountain_hike_plausibility(client):
    """Same checks as test_mountain_hike.py's own plausibility section,
    lines ~290-345, re-run against the API response."""
    r = client.post("/api/simulate", json=build_mountain_hike_spec())
    results = r.json()["results"]
    bounds = r.json()["segment_bounds"]

    def at_segment_end(column, segment_index):
        return results[column][bounds[segment_index]["end_step"] - 1]

    tcr = [at_segment_end("TcrChest", i) for i in range(14)]
    tsk = [at_segment_end("TskMean", i) for i in range(14)]
    wet = [at_segment_end("WetMean", i) for i in range(14)]
    store = [at_segment_end("WaterStorageMean", i) for i in range(14)]

    assert all(math.isfinite(v) for v in tcr + tsk + wet + store)
    assert all(36.0 <= v <= 39.0 for v in tcr)
    assert all(20.0 <= v <= 38.0 for v in tsk)
    assert all(0.0 <= v <= 1.0 for v in wet)
    assert all(v >= 0.0 for v in store)

    # indices: 0=A 1=B 2=C 3=D 4=E 5=F 6=G1 7=G2 8=H1 9=H2 10=I 11=J1 12=J2 13=K
    assert wet[5] > wet[0], "wettedness should rise during the steep ridge ascent (F) vs. start (A)"
    assert wet[7] > 0.3, "wettedness should stay elevated at the summit break (G2)"
    assert tsk[7] < tsk[6], "TskMean should keep dropping during the summit break despite the thicker jacket"
    assert store[9] >= store[8], "clothing water storage should grow during the rain (H2) vs. before (H1)"
    assert store[13] < store[9], "clothing water storage should drop again by the end of the hike vs. the rain peak (H2)"
