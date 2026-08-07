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

MODEL_CONFIG = {
    "height": 1.75, "weight": 72, "fat": 17, "age": 34, "sex": "male",
    "ex_output": "all",
}

# Mirrors test_mountain_hike.py segments A..K 1:1 (dtime stays the default
# 60s throughout, matching the original script's minute-by-minute loop).
# Segment G is split into G1/G2 in the script only because it calls run()
# twice in a row with no setters in between -- G2 carries no overrides here
# for the same reason.
MOUNTAIN_HIKE_SEGMENTS = [
    dict(id="A", label="Start: trailhead, getting dressed", times=5,
         globals={"PAR": 1.3, "posture": "standing"},
         regions={"Ta": 8, "Tr": 8, "RH": 70, "Va": 0.3, "Icl": 1.4,
                  "Icl_airperm": 0.4, "Icl_evap_eff": 0.40, "Icl_waterabs": 0.30,
                  "release_tau": 4500, "max_storage": 90}),
    dict(id="B", label="Ascent on forest trail, warmly dressed", times=35,
         globals={"PAR": 4.0},
         regions={"Ta": 9, "Tr": 9, "RH": 68, "Va": 0.3}),
    dict(id="C", label="Break: softshell removed", times=5,
         globals={"PAR": 1.5, "posture": "standing"},
         regions={"Ta": 9.5, "Tr": 9.5, "RH": 68, "Va": 0.4, "Icl": 0.9,
                  "Icl_airperm": 0.8, "Icl_evap_eff": 0.50, "Icl_waterabs": 0.30,
                  "release_tau": 4500, "max_storage": 70}),
    dict(id="D", label="Ascent toward the tree line", times=55,
         globals={"PAR": 4.3},
         regions={"Ta": 10, "Tr": 11, "RH": 65, "Va": 0.5}),
    dict(id="E", label="Water break at the tree line, wind picking up", times=10,
         globals={"PAR": 1.4, "posture": "standing"},
         regions={"Ta": 8, "Tr": 8, "RH": 60, "Va": 2.0}),
    dict(id="F", label="Ridge ascent to the summit, steep, sunny and windy", times=60,
         globals={"PAR": 5.5, "posture": "standing"},
         regions={"Ta": 5, "Tr": 13, "RH": 55, "Va": 3.5, "Icl": 1.1,
                  "Icl_airperm": 0.15, "Icl_evap_eff": 0.35, "Icl_waterabs": 0.30,
                  "release_tau": 3000, "max_storage": 80}),
    dict(id="G1", label="Summit reached: sitting down, putting on jacket", times=15,
         globals={"PAR": 1.2, "posture": "sitting"},
         regions={"Ta": 1, "Tr": 4, "RH": 55, "Va": 4.5, "Icl": 2.4,
                  "Icl_airperm": 0.08, "Icl_evap_eff": 0.20, "Icl_waterabs": 0.45,
                  "release_tau": 3600, "max_storage": 110}),
    dict(id="G2", label="Summit break, lunch in the wind", times=15,
         globals={}, regions={}),
    dict(id="H1", label="Descent begins, clouds moving in", times=25,
         globals={"PAR": 3.8, "posture": "standing"},
         regions={"Ta": 3, "Tr": 3, "RH": 75, "Va": 3.0, "Icl": 1.1,
                  "Icl_airperm": 0.15, "Icl_evap_eff": 0.35, "Icl_waterabs": 0.35,
                  "release_tau": 3000, "max_storage": 80}),
    dict(id="H2", label="Descent in the rain, rain jacket on", times=35,
         globals={"PAR": 3.6},
         regions={"Ta": 6, "Tr": 6, "RH": 95, "Va": 2.5, "Icl": 1.0,
                  "Icl_airperm": 0.05, "Icl_evap_eff": 0.15, "Icl_waterabs": 0.50,
                  "release_tau": 9000, "max_storage": 100}),
    dict(id="I", label="Break: rain jacket off, rain easing", times=15,
         globals={"PAR": 1.4, "posture": "standing"},
         regions={"Ta": 8, "Tr": 8, "RH": 80, "Va": 1.0, "Icl": 0.9,
                  "Icl_airperm": 0.7, "Icl_evap_eff": 0.45, "Icl_waterabs": 0.35,
                  "release_tau": 3600, "max_storage": 80}),
    dict(id="J1", label="Descent on forest trail, conditions milder", times=30,
         globals={"PAR": 3.2},
         regions={"Ta": 11, "Tr": 11, "RH": 70, "Va": 0.5}),
    dict(id="J2", label="Descent, fleece removed", times=40,
         globals={"PAR": 3.0},
         regions={"Ta": 13, "Tr": 13, "RH": 60, "Va": 0.4, "Icl": 0.55,
                  "Icl_airperm": 0.6, "Icl_evap_eff": 0.50, "Icl_waterabs": 0.20,
                  "release_tau": 2700, "max_storage": 50}),
    dict(id="K", label="Arrival at the trailhead", times=15,
         globals={"PAR": 1.2, "posture": "standing"},
         regions={"Ta": 14, "Tr": 14, "RH": 55, "Va": 0.3}),
]


def _to_scenario_spec_json():
    return {
        "model": MODEL_CONFIG,
        "segments": [
            {
                "id": s["id"], "label": s["label"], "dtime": 60, "times": s["times"],
                "globals": s["globals"], "regions": s["regions"],
            }
            for s in MOUNTAIN_HIKE_SEGMENTS
        ],
    }


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
    r = client.post("/api/simulate", json=_to_scenario_spec_json())
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
    r = client.post("/api/simulate", json=_to_scenario_spec_json())
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
