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

PAR values for the walking segments were re-derived (see the `activity`
blocks) after it turned out the original ones conflated PAR with MET. PAR is
a multiple of BASAL metabolic rate, whereas 1 MET = 58.15 W/m2 is seated
rest; for this hiker BMR = 0.766 MET, so PAR = 1.31 x MET. The old values
(ascents at PAR 4.0-5.5) therefore described 3.1-4.2 MET, roughly half the
metabolic heat production a loaded ascent actually generates. The new values
come from webapp/frontend/src/lib/parModel.ts (Minetti 2002 walking cost,
terrain- and load-corrected) applied to walking data chosen to be a pace a
real hiker sustains: the grades and durations integrate to +1036 m / -1041 m
over the six hours, and the hardest segment (F, the ridge) peaks at PAR 9.2
= 7.0 MET.

That ceiling is deliberate. A first attempt kept the original scenario's
implied pace (690 m/h vertical for a full hour) and, with the corrected PAR
arithmetic, drove core temperature to 41.5 C -- heat-stroke territory. The
model was right: at PAR 11.6 behind a windproof softshell (airperm 0.15,
evap_eff 0.35) skin wettedness saturates at 1.0, the evaporative reserve is
gone and the heat balance simply cannot close. But that says the *pace* was
never realistic, not that the arithmetic was wrong -- and a reference
scenario in which the hiker marches into collapse is useless both as a demo
and as a test baseline. JOS-3 has no behavioural thermoregulation; a real
hiker would slow down or open the jacket.

Rest segments keep their hand-set PAR (1.2-1.5) and carry no `activity`
block: the calculator only models walking, and at zero speed it would
collapse all of them onto the same standing value of 1.32, losing the
deliberate distinction between sitting quietly at the summit and standing
around changing clothes.
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
         globals={"PAR": 6.07},
         activity={"speed_kmh": 3.5, "grade_pct": 9, "load_kg": 8, "terrain": "dirt_road"},
         regions={"Ta": 9, "Tr": 9, "RH": 68, "Va": 0.3}),
    dict(id="C", label="Break: softshell removed", times=5,
         globals={"PAR": 1.5, "posture": "standing"},
         regions={"Ta": 9.5, "Tr": 9.5, "RH": 68, "Va": 0.4, "Icl": 0.9,
                  "Icl_airperm": 0.8, "Icl_evap_eff": 0.50, "Icl_waterabs": 0.30,
                  "release_tau": 4500, "max_storage": 70}),
    dict(id="D", label="Ascent toward the tree line", times=55,
         globals={"PAR": 6.91},
         activity={"speed_kmh": 3.2, "grade_pct": 12, "load_kg": 8, "terrain": "trail"},
         regions={"Ta": 10, "Tr": 11, "RH": 65, "Va": 0.5}),
    dict(id="E", label="Water break at the tree line, wind picking up", times=10,
         globals={"PAR": 1.4, "posture": "standing"},
         regions={"Ta": 8, "Tr": 8, "RH": 60, "Va": 2.0}),
    dict(id="F", label="Ridge ascent to the summit, steep, sunny and windy", times=60,
         globals={"PAR": 9.20, "posture": "standing"},
         activity={"speed_kmh": 2.5, "grade_pct": 20, "load_kg": 8, "terrain": "rough_trail"},
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
         globals={"PAR": 2.70, "posture": "standing"},
         activity={"speed_kmh": 3.5, "grade_pct": -18, "load_kg": 8, "terrain": "rough_trail"},
         regions={"Ta": 3, "Tr": 3, "RH": 75, "Va": 3.0, "Icl": 1.1,
                  "Icl_airperm": 0.15, "Icl_evap_eff": 0.35, "Icl_waterabs": 0.35,
                  "release_tau": 3000, "max_storage": 80}),
    dict(id="H2", label="Descent in the rain, rain jacket on", times=35,
         globals={"PAR": 2.52},
         activity={"speed_kmh": 3.2, "grade_pct": -16, "load_kg": 8, "terrain": "rough_trail"},
         regions={"Ta": 6, "Tr": 6, "RH": 95, "Va": 2.5, "Icl": 1.0,
                  "Icl_airperm": 0.05, "Icl_evap_eff": 0.15, "Icl_waterabs": 0.50,
                  "release_tau": 9000, "max_storage": 100}),
    dict(id="I", label="Break: rain jacket off, rain easing", times=15,
         globals={"PAR": 1.4, "posture": "standing"},
         regions={"Ta": 8, "Tr": 8, "RH": 80, "Va": 1.0, "Icl": 0.9,
                  "Icl_airperm": 0.7, "Icl_evap_eff": 0.45, "Icl_waterabs": 0.35,
                  "release_tau": 3600, "max_storage": 80}),
    dict(id="J1", label="Descent on forest trail, conditions milder", times=30,
         globals={"PAR": 2.61},
         activity={"speed_kmh": 4.0, "grade_pct": -12, "load_kg": 8, "terrain": "trail"},
         regions={"Ta": 11, "Tr": 11, "RH": 70, "Va": 0.5}),
    dict(id="J2", label="Descent, fleece removed", times=40,
         globals={"PAR": 3.04},
         activity={"speed_kmh": 4.5, "grade_pct": -8, "load_kg": 8, "terrain": "dirt_road"},
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
                # Rest segments carry no activity block -- see module docstring.
                **({"activity": s["activity"]} if "activity" in s else {}),
            }
            for s in MOUNTAIN_HIKE_SEGMENTS
        ],
    }
