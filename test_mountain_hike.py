# -*- coding: utf-8 -*-
"""
Realistic 6-hour mountain hiking scenario for JOS-3.

Exercises the interplay of all extensions (Icl_airperm, Icl_evap_eff,
Icl_emissivity, Icl_waterabs, release_tau, max_storage) under the kind of
changing conditions a real mountain hike involves: an ascent with warming
up and sweating, clothing changes, wind exposure above the tree line, a
summit break in the cold/wind, a weather shift with rain during the
descent, and the return to the warmer valley.

Each segment is simulated separately, since weather/activity/clothing
change in between. dtime stays at the default of 60 s; within a segment,
the simulation runs minute by minute (mod.simulate(1) in a loop) so the
result plot gets a time series at 1-minute resolution.

At the end, a PNG figure (mountain_hike_result.png) is generated showing
the most important input and output quantities over time.
"""
import sys
import os
sys.path.append(os.path.dirname(__file__) + "/src")

import numpy as np
import matplotlib
matplotlib.use("Agg")  # headless: no display needed
import matplotlib.pyplot as plt

from jos3 import JOS3

# ---------------------------------------------------------------------------
# Hiker profile: an averagely trained adult
# ---------------------------------------------------------------------------
mod = JOS3(
    height=1.75,
    weight=72,
    fat=17,
    age=34,
    sex="male",
    ex_output="all",  # also records Mshiv, Esk, Emax, etc.
)

elapsed = 0  # minutes since the start of the hike

# Time series at 1-minute resolution for the result plot (input + output
# quantities). Kept separate from `log` (segment end values used for the
# plausibility checks), since the plot needs much finer resolution.
series = []
# Start minute + label of each segment, for vertical marker lines in the
# plot.
segment_bounds = []


def _record(t, label):
    """Reads the current model state and appends it to `series`."""
    h = mod._history[-1]
    series.append(dict(
        t=t, label=label,
        # Weather (input)
        Ta=mod.Ta[0], Tr=mod.Tr[0], RH=mod.RH[0], Va=mod.Va[0],
        # Activity & clothing (input)
        PAR=mod.PAR, Icl=mod.Icl[0],
        Icl_airperm=mod.Icl_airperm[0], Icl_evap_eff=mod.Icl_evap_eff[0],
        Icl_waterabs=mod.Icl_waterabs[0],
        # Body response (output)
        Tcr=h["Tcr"][2], TskMean=h["TskMean"], WetMean=h["WetMean"],
        WaterStorage=mod._water_storage.mean(),
        # Thermoregulatory effector power (output), summed body-wide over
        # all 17 segments [W]
        Esweat_sum=float(np.sum(h["Esweat"])),
        Mshiv_sum=float(np.sum(h.get("Mshiv", 0))),
    ))


def run(minutes, label):
    """Simulates the segment minute by minute and logs the resulting state."""
    global elapsed
    segment_bounds.append((elapsed, label))
    for _ in range(minutes):
        mod.simulate(1)
        elapsed += 1
        _record(elapsed, label)
    h = mod._history[-1]
    tcr_chest = h["Tcr"][2]       # Chest = best proxy for core body temperature
    tsk_mean = h["TskMean"]
    wet_mean = h["WetMean"]
    store = mod._water_storage.mean()
    store_max = mod._water_storage.max()
    mshiv = float(np.sum(h.get("Mshiv", 0)))
    print(
        f"[{elapsed:3d} min] {label:<32s} "
        f"Ta={mod.Ta[0]:5.1f}C Tr={mod.Tr[0]:5.1f}C RH={mod.RH[0]:4.0f}% Va={mod.Va[0]:4.1f}m/s | "
        f"Tcr={tcr_chest:5.2f}C Tsk={tsk_mean:5.2f}C Wet={wet_mean:4.2f} "
        f"H2O(garment)={store:5.1f}g(max {store_max:5.1f}) Mshiv={mshiv:5.1f}W"
    )
    return dict(t=elapsed, tcr=tcr_chest, tsk=tsk_mean, wet=wet_mean,
                store=store, mshiv=mshiv)


log = []

print("=" * 110)
print("Mountain hike, 6h, start 08:00, ascent from ~800 m to ~2200 m and back")
print("=" * 110)

# ---------------------------------------------------------------------------
# A) 0-5 min: Start at the trailhead, cool morning, fully layered up
# ---------------------------------------------------------------------------
# Clothing: merino base layer + fleece mid layer + softshell jacket.
# The softshell is moderately windproof (airperm 0.4) and moderately
# breathable (evap_eff 0.4). Fleece/merino absorb sweat reasonably well
# (waterabs 0.3).
mod.Ta = 8; mod.Tr = 8; mod.RH = 70; mod.Va = 0.3
mod.posture = "standing"; mod.PAR = 1.3
mod.Icl = 1.4
mod.Icl_airperm = 0.4
mod.Icl_evap_eff = 0.40
mod.Icl_waterabs = 0.30
mod.release_tau = 4500      # 75 min, cool/humid, little wind -> dries slowly
mod.max_storage = 90
log.append(run(5, "Start: trailhead, getting dressed"))

# ---------------------------------------------------------------------------
# B) 5-40 min: Ascent through the forest, moderate grade, warming up
# ---------------------------------------------------------------------------
# Forest shade -> Ta/Tr rise only slightly. Effort PAR~4 (brisk uphill
# hiking pace). Clothing still unchanged -> heat build-up/sweating should
# set in.
mod.Ta = 9; mod.Tr = 9; mod.RH = 68; mod.Va = 0.3
mod.PAR = 4.0
log.append(run(35, "Ascent on forest trail, warmly dressed"))

# ---------------------------------------------------------------------------
# C) 40-45 min: Short stop, taking off the softshell (got too warm)
# ---------------------------------------------------------------------------
mod.Ta = 9.5; mod.Tr = 9.5; mod.RH = 68; mod.Va = 0.4
mod.posture = "standing"; mod.PAR = 1.5
mod.Icl = 0.9                # base layer + fleece only now
mod.Icl_airperm = 0.8        # fleece without outer shell: very wind-permeable
mod.Icl_evap_eff = 0.50      # fleece breathes well
mod.Icl_waterabs = 0.30
mod.release_tau = 4500
mod.max_storage = 70
log.append(run(5, "Break: softshell removed"))

# ---------------------------------------------------------------------------
# D) 45-100 min: Continuing uphill, forest thinning out toward the tree line
# ---------------------------------------------------------------------------
mod.Ta = 10; mod.Tr = 11; mod.RH = 65; mod.Va = 0.5
mod.PAR = 4.3
log.append(run(55, "Ascent toward the tree line"))

# ---------------------------------------------------------------------------
# E) 100-110 min: Water break at the tree line, first wind
# ---------------------------------------------------------------------------
# Cooler and windier (exposed terrain), but still the same thin clothing ->
# the windchill effect (Icl_airperm=0.8) should noticeably contribute to
# skin cooling here, since the hiker is standing still instead of moving.
mod.Ta = 8; mod.Tr = 8; mod.RH = 60; mod.Va = 2.0
mod.posture = "standing"; mod.PAR = 1.4
log.append(run(10, "Water break at the tree line, wind picking up"))

# ---------------------------------------------------------------------------
# F) 110-170 min: Exposed ridge ascent to the summit, steep, sun + wind
# ---------------------------------------------------------------------------
# Windbreaker back on (over the fleece): considerably more windproof
# (airperm 0.15), but less breathable than the softshell. Tr > Ta due to
# direct solar radiation on the open ridge despite cold air.
mod.Ta = 5; mod.Tr = 13; mod.RH = 55; mod.Va = 3.5
mod.posture = "standing"; mod.PAR = 5.5
mod.Icl = 1.1
mod.Icl_airperm = 0.15
mod.Icl_evap_eff = 0.35
mod.Icl_waterabs = 0.30
mod.release_tau = 3000      # windy -> dries faster
mod.max_storage = 80
log.append(run(60, "Ridge ascent to the summit, steep, sunny and windy"))

# ---------------------------------------------------------------------------
# G) 170-200 min: Summit break, sitting down, cold and stormy
# ---------------------------------------------------------------------------
# The most critical test case: the hiker arrives sweaty from the steep
# ascent and now stands/sits still for 30 min in cold, strong wind. A
# heavy insulated jacket (down/synthetic) is put on: high insulation, but
# the synthetic fill readily absorbs the moisture already present
# (waterabs 0.45) and breathes poorly (evap_eff 0.20). Expectation:
# TskMean keeps dropping at first (cooling from residual/stored
# evaporation plus wind loss) before the added insulation takes over.
mod.Ta = 1; mod.Tr = 4; mod.RH = 55; mod.Va = 4.5
mod.posture = "sitting"; mod.PAR = 1.2
mod.Icl = 2.4
mod.Icl_airperm = 0.08
mod.Icl_evap_eff = 0.20
mod.Icl_waterabs = 0.45
mod.release_tau = 3600
mod.max_storage = 110
log.append(run(15, "Summit reached: sitting down, putting on jacket"))
log.append(run(15, "Summit break, lunch in the wind"))

# ---------------------------------------------------------------------------
# H1) 200-225 min: Descent begins, weather closing in
# ---------------------------------------------------------------------------
# Insulated jacket off again (moving generates heat again), back to the
# windbreaker. The sun disappears behind clouds -> Tr = Ta.
mod.Ta = 3; mod.Tr = 3; mod.RH = 75; mod.Va = 3.0
mod.posture = "standing"; mod.PAR = 3.8
mod.Icl = 1.1
mod.Icl_airperm = 0.15
mod.Icl_evap_eff = 0.35
mod.Icl_waterabs = 0.35     # already slightly damp from the summit
mod.release_tau = 3000
mod.max_storage = 80
log.append(run(25, "Descent begins, clouds moving in"))

# ---------------------------------------------------------------------------
# H2) 225-260 min: Rain sets in, rain jacket on over everything
# ---------------------------------------------------------------------------
# Rain jacket: nearly windproof/waterproof (airperm 0.05), low vapor
# permeability (evap_eff 0.15 -- even "breathable" membranes perform
# poorly in sustained rain). High waterabs (0.50) and a very long
# release_tau (2.5 h), since at 95% humidity almost nothing can dry.
# Exercises the balance bug fixed earlier (fix 3a): the moisture should
# stay in storage instead of draining away.
mod.Ta = 6; mod.Tr = 6; mod.RH = 95; mod.Va = 2.5
mod.PAR = 3.6
mod.Icl = 1.0
mod.Icl_airperm = 0.05
mod.Icl_evap_eff = 0.15
mod.Icl_waterabs = 0.50
mod.release_tau = 9000
mod.max_storage = 100
log.append(run(35, "Descent in the rain, rain jacket on"))

# ---------------------------------------------------------------------------
# I) 260-275 min: Break at the tree line, rain easing off
# ---------------------------------------------------------------------------
mod.Ta = 8; mod.Tr = 8; mod.RH = 80; mod.Va = 1.0
mod.posture = "standing"; mod.PAR = 1.4
mod.Icl = 0.9
mod.Icl_airperm = 0.7
mod.Icl_evap_eff = 0.45
mod.Icl_waterabs = 0.35
mod.release_tau = 3600
mod.max_storage = 80
log.append(run(15, "Break: rain jacket off, rain easing"))

# ---------------------------------------------------------------------------
# J1) 275-305 min: Descent through the forest, getting warmer
# ---------------------------------------------------------------------------
mod.Ta = 11; mod.Tr = 11; mod.RH = 70; mod.Va = 0.5
mod.PAR = 3.2
log.append(run(30, "Descent on forest trail, conditions milder"))

# ---------------------------------------------------------------------------
# J2) 305-345 min: Fleece off, down to base layer + thin windbreaker
# ---------------------------------------------------------------------------
mod.Ta = 13; mod.Tr = 13; mod.RH = 60; mod.Va = 0.4
mod.PAR = 3.0
mod.Icl = 0.55
mod.Icl_airperm = 0.6
mod.Icl_evap_eff = 0.50
mod.Icl_waterabs = 0.20
mod.release_tau = 2700
mod.max_storage = 50
log.append(run(40, "Descent, fleece removed"))

# ---------------------------------------------------------------------------
# K) 345-360 min: Arrival at the trailhead
# ---------------------------------------------------------------------------
mod.Ta = 14; mod.Tr = 14; mod.RH = 55; mod.Va = 0.3
mod.posture = "standing"; mod.PAR = 1.2
log.append(run(15, "Arrival at the trailhead"))

print("=" * 110)
print(f"Hike finished after {elapsed} min ({elapsed/60:.1f} h)")
print("=" * 110)

# ---------------------------------------------------------------------------
# Plausibility check
# ---------------------------------------------------------------------------
tcr = np.array([e["tcr"] for e in log])
tsk = np.array([e["tsk"] for e in log])
wet = np.array([e["wet"] for e in log])
store = np.array([e["store"] for e in log])
mshiv = np.array([e["mshiv"] for e in log])

print("\nPlausibility check:")
checks = []

checks.append(("No NaN/Inf in core variables",
               np.isfinite(tcr).all() and np.isfinite(tsk).all()
               and np.isfinite(wet).all() and np.isfinite(store).all()))

checks.append(("Core temperature (chest) within the physiologically plausible range 36.0-39.0 C",
               bool(np.all((tcr >= 36.0) & (tcr <= 39.0)))))

checks.append(("Skin temperature within the plausible range 20-38 C",
               bool(np.all((tsk >= 20.0) & (tsk <= 38.0)))))

checks.append(("Skin wettedness (Wet) within the valid range [0,1]",
               bool(np.all((wet >= 0.0) & (wet <= 1.0)))))

checks.append(("Clothing water storage never negative",
               bool(np.all(store >= 0.0))))

# log indices (see the order of the log.append(run(...)) calls above):
# 0=A(5) 1=B(40) 2=C(45) 3=D(100) 4=E(110) 5=F(170) 6=G1(185) 7=G2(200)
# 8=H1(225) 9=H2(260) 10=I(275) 11=J1(305) 12=J2(345) 13=K(360)

# Expectation: after the steep ridge ascent (F, index 5), skin wettedness
# should be clearly higher than during the early resting phase (A, index
# 0).
checks.append(("Skin wettedness increases during the steep ridge ascent (F) vs. start (A)",
               bool(log[5]["wet"] > log[0]["wet"])))

# Expectation: during the summit break (index 6->7), TskMean keeps
# dropping despite the thicker jacket, because sweat stored in the fleece
# from the ridge ascent keeps evaporating (Wet stays high even though PAR
# drops to 1.2 and no new effort supplies heat). This is the actual
# purpose of the water-storage model: cooling from sweat that has already
# been produced but not yet evaporated. 30 minutes at Icl=2.4 is not
# enough to trigger shivering (Mshiv stays 0) -- see the write-up.
checks.append(("Skin wettedness stays strongly elevated at the summit despite PAR=1.2 (residual evaporation)",
               bool(log[7]["wet"] > 0.3)))
checks.append(("Cooling (Tsk drops) during the summit break despite the thicker jacket",
               bool(log[7]["tsk"] < log[6]["tsk"])))

# Expectation: during sustained rain (H2, index 9), clothing water storage
# builds up relative to before (H1, index 8) instead of draining away
# (release_tau very long, high RH -> fix 3a: storage is no longer emptied
# in violation of the mass balance when there is barely any evaporative
# capacity available).
checks.append(("Clothing water storage grows during the rain segment (H2) vs. before (H1)",
               bool(log[9]["store"] >= log[8]["store"])))

# Expectation: by the end of the hike (warm, dry conditions, thin
# clothing), clothing water storage should have dropped again well below
# the rain-segment maximum (H2, index 9).
checks.append(("Clothing water storage decreases again toward the end of the hike",
               bool(log[-1]["store"] < log[9]["store"])))

# Expectation: core temperature overall stays within a fairly tight
# window (no thermal runaway despite strongly varying conditions).
checks.append(("Core temperature variation over the whole hike < 2.0 C (no runaway)",
               bool((tcr.max() - tcr.min()) < 2.0)))

all_ok = True
for desc, ok in checks:
    status = "OK  " if ok else "FAIL"
    print(f"  [{status}] {desc}")
    all_ok = all_ok and ok

print("\nOverall result:", "PLAUSIBLE" if all_ok else "ISSUES FOUND - see above")

# ---------------------------------------------------------------------------
# Result plot: key input and output quantities over time
# ---------------------------------------------------------------------------
def _col(key):
    return np.array([p[key] for p in series])


t_h = _col("t") / 60.0  # time in hours


def _mark_segments(ax):
    """Marks segment boundaries (clothing change/weather shift) in the panel."""
    for start_min, _label in segment_bounds:
        ax.axvline(start_min / 60.0, color="gray", linestyle="--",
                    linewidth=0.6, alpha=0.6)


fig, axes = plt.subplots(7, 1, figsize=(12, 18), sharex=True)

# 1) Weather: temperature
ax = axes[0]
ax.plot(t_h, _col("Ta"), label="Ta (air)", color="tab:blue")
ax.plot(t_h, _col("Tr"), label="Tr (radiant)", color="tab:orange")
ax.set_ylabel("Temperature [°C]")
ax.set_title("Weather: air & radiant temperature")
ax.legend(loc="upper right")
ax.grid(alpha=0.3)
_mark_segments(ax)

# 2) Weather: humidity & wind
ax = axes[1]
l1, = ax.plot(t_h, _col("RH"), label="RH (humidity)", color="tab:green")
ax.set_ylabel("Rel. humidity [%]")
ax.set_title("Weather: humidity & wind speed")
ax2 = ax.twinx()
l2, = ax2.plot(t_h, _col("Va"), label="Va (wind)", color="tab:red")
ax2.set_ylabel("Wind speed [m/s]")
ax.legend(handles=[l1, l2], loc="upper right")
ax.grid(alpha=0.3)
_mark_segments(ax)

# 3) Activity & clothing
ax = axes[2]
l1, = ax.plot(t_h, _col("PAR"), label="PAR (activity)", color="tab:purple",
              drawstyle="steps-post")
ax.set_ylabel("PAR [-]")
ax.set_title("Activity & clothing")
ax2 = ax.twinx()
l2, = ax2.plot(t_h, _col("Icl"), label="Icl (insulation)", color="tab:brown",
               drawstyle="steps-post")
ax2.set_ylabel("Icl [clo]")
ax.legend(handles=[l1, l2], loc="upper right")
ax.grid(alpha=0.3)
_mark_segments(ax)

# 4) Clothing physics (this fork's extensions)
ax = axes[3]
ax.plot(t_h, _col("Icl_airperm"), label="Icl_airperm (air permeability)",
        drawstyle="steps-post")
ax.plot(t_h, _col("Icl_evap_eff"), label="Icl_evap_eff (vapor permeability)",
        drawstyle="steps-post")
ax.plot(t_h, _col("Icl_waterabs"), label="Icl_waterabs (sweat absorption)",
        drawstyle="steps-post")
ax.set_ylabel("[0-1]")
ax.set_title("Clothing physics (extensions)")
ax.set_ylim(-0.05, 1.05)
ax.legend(loc="upper right")
ax.grid(alpha=0.3)
_mark_segments(ax)

# 5) Core/skin temperature (output)
ax = axes[4]
ax.plot(t_h, _col("Tcr"), label="Tcr (chest, core)", color="tab:red")
ax.plot(t_h, _col("TskMean"), label="TskMean (skin)", color="tab:blue")
ax.axhline(37.0, color="tab:red", linestyle=":", linewidth=0.8, alpha=0.6)
ax.axhline(34.0, color="tab:blue", linestyle=":", linewidth=0.8, alpha=0.6)
ax.set_ylabel("Temperature [°C]")
ax.set_title("Core/skin temperature (output) -- dotted: setpoints 37/34 °C")
ax.legend(loc="upper right")
ax.grid(alpha=0.3)
_mark_segments(ax)

# 6) Skin wettedness & clothing water storage (output)
ax = axes[5]
l1, = ax.plot(t_h, _col("WetMean"), label="WetMean (skin wettedness)", color="tab:cyan")
ax.set_ylabel("Wettedness [-]")
ax.set_ylim(-0.05, 1.05)
ax.set_title("Skin wettedness & clothing water storage (output)")
ax2 = ax.twinx()
l2, = ax2.plot(t_h, _col("WaterStorage"), label="H2O in clothing (avg. per segment)",
               color="tab:olive")
ax2.set_ylabel("Water [g]")
ax.legend(handles=[l1, l2], loc="upper right")
ax.grid(alpha=0.3)
_mark_segments(ax)

# 7) Thermoregulatory effector power (output)
ax = axes[6]
l1, = ax.plot(t_h, _col("Esweat_sum"), label="Esweat (sweating power)", color="tab:pink")
ax.set_ylabel("Sweating power [W]")
ax.set_title("Thermoregulatory effector power (output)")
ax2 = ax.twinx()
l2, = ax2.plot(t_h, _col("Mshiv_sum"), label="Mshiv (shivering power)", color="tab:gray")
ax2.set_ylabel("Shivering power [W]")
ax.legend(handles=[l1, l2], loc="upper right")
ax.grid(alpha=0.3)
_mark_segments(ax)

axes[-1].set_xlabel("Time since start [h]")
fig.suptitle("JOS-3 mountain hike, 6h: weather, activity, clothing, and body response",
             fontsize=14)
fig.tight_layout(rect=[0, 0, 1, 0.98])

out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_mountain_hike_result.png")
fig.savefig(out_path, dpi=150, bbox_inches="tight")
plt.close(fig)
print(f"\nPlot saved: {out_path}")
