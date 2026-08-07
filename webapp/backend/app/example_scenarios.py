# -*- coding: utf-8 -*-
"""The mountain-hike scenario from /test_mountain_hike.py, re-encoded as a
ScenarioSpec-shaped dict. This is the single source of truth for that data:
webapp/backend/tests/test_simulate_mountain_hike_parity.py imports the same
constants (numeric parity with driving the model directly is exactly what
that test verifies), and routers/scenarios.py seeds this as a saved scenario
named "Mountain Hike Example" on startup, so a fresh install always has a
realistic example to look at.

Segment `id`s, structure, and `label`s mirror the script 1:1 -- the webapp's
own frontend translation dictionary (webapp/frontend/src/lib/i18n/) doesn't
cover this seeded scenario, so its segment labels are plain English text
here, matching the original script exactly. Nothing (in this module or in
the parity test) keys off label text, only `id` and position, so that's
safe.
"""

EXAMPLE_SCENARIO_NAME = "Mountain Hike Example"

MODEL_CONFIG = {
    "height": 1.75, "weight": 72, "fat": 17, "age": 34, "sex": "male",
    "ex_output": "all",
}

# dtime stays the default 60s throughout, matching the original script's
# minute-by-minute loop. Segment G is split into G1/G2 in the script only
# because it calls run() twice in a row with no setters in between -- G2
# carries no overrides here for the same reason.
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


def build_mountain_hike_spec() -> dict:
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
