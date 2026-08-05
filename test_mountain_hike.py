# -*- coding: utf-8 -*-
"""
Realistisches 6-Stunden-Bergwander-Szenario fuer JOS-3.

Testet das Zusammenspiel aller Erweiterungen (Icl_airperm, Icl_evap_eff,
Icl_emissivity, Icl_waterabs, release_tau, max_storage) unter wechselnden
Bedingungen, wie sie bei einer echten Bergtour vorkommen: Aufstieg mit
Erwaermung/Schwitzen, Kleidungswechsel, Windexposition oberhalb der
Baumgrenze, Gipfelpause im Kalten/Wind, Wetterumschwung mit Regen beim
Abstieg, und Rueckkehr ins waermere Tal.

Jeder Abschnitt wird einzeln simuliert (mod.simulate(minuten)), da sich
Wetter/Aktivitaet/Kleidung dazwischen aendern. dtime bleibt beim Default
von 60 s, d.h. simulate(n) entspricht n Minuten.
"""
import sys
import os
sys.path.append(os.path.dirname(__file__) + "/src")

import numpy as np
from jos3 import JOS3

# ---------------------------------------------------------------------------
# Wanderer-Profil: durchschnittlich trainierter Erwachsener
# ---------------------------------------------------------------------------
mod = JOS3(
    height=1.75,
    weight=72,
    fat=17,
    age=34,
    sex="male",
    ex_output="all",  # damit u.a. Mshiv, Esk, Emax mitgeschrieben werden
)

elapsed = 0  # Minuten seit Tourstart


def run(minutes, label):
    """Simuliert den Abschnitt und protokolliert den Zustand danach."""
    global elapsed
    mod.simulate(minutes)
    elapsed += minutes
    h = mod._history[-1]
    tcr_chest = h["Tcr"][2]       # Chest = bester Proxy fuer Körperkerntemperatur
    tsk_mean = h["TskMean"]
    wet_mean = h["WetMean"]
    store = mod._water_storage.mean()
    store_max = mod._water_storage.max()
    mshiv = float(np.sum(h.get("Mshiv", 0)))
    print(
        f"[{elapsed:3d} min] {label:<32s} "
        f"Ta={mod.Ta[0]:5.1f}C Tr={mod.Tr[0]:5.1f}C RH={mod.RH[0]:4.0f}% Va={mod.Va[0]:4.1f}m/s | "
        f"Tcr={tcr_chest:5.2f}C Tsk={tsk_mean:5.2f}C Wet={wet_mean:4.2f} "
        f"H2O(Kleid)={store:5.1f}g(max {store_max:5.1f}) Mshiv={mshiv:5.1f}W"
    )
    return dict(t=elapsed, tcr=tcr_chest, tsk=tsk_mean, wet=wet_mean,
                store=store, mshiv=mshiv)


log = []

print("=" * 110)
print("Bergwanderung, 6h, Start 08:00 Uhr, Aufstieg von ca. 800 m auf ca. 2200 m und zurueck")
print("=" * 110)

# ---------------------------------------------------------------------------
# A) 0-5 min: Start am Parkplatz, kuehler Morgen, komplette Schichtung
# ---------------------------------------------------------------------------
# Kleidung: Merino-Baselayer + Fleece-Midlayer + Softshell-Jacke.
# Softshell ist maessig winddicht (airperm 0.4) und maessig atmungsaktiv
# (evap_eff 0.4). Fleece/Merino nehmen Schweiss recht gut auf (waterabs 0.3).
mod.Ta = 8; mod.Tr = 8; mod.RH = 70; mod.Va = 0.3
mod.posture = "standing"; mod.PAR = 1.3
mod.Icl = 1.4
mod.Icl_airperm = 0.4
mod.Icl_evap_eff = 0.40
mod.Icl_waterabs = 0.30
mod.release_tau = 4500      # 75 min, kuehl/feucht, kaum Wind -> trocknet langsam
mod.max_storage = 90
log.append(run(5, "Start: Parkplatz, anziehen"))

# ---------------------------------------------------------------------------
# B) 5-40 min: Aufstieg im Wald, maessige Steigung, Erwaermung
# ---------------------------------------------------------------------------
# Waldschatten -> Ta/Tr steigen nur leicht. Anstrengung PAR~4 (zuegiger
# Bergaufgeh-Tempo). Kleidung noch unveraendert -> Waermestau/Schwitzen
# sollte einsetzen.
mod.Ta = 9; mod.Tr = 9; mod.RH = 68; mod.Va = 0.3
mod.PAR = 4.0
log.append(run(35, "Aufstieg Waldweg, warm angezogen"))

# ---------------------------------------------------------------------------
# C) 40-45 min: Kurzer Stopp, Softshell ausziehen (zu warm geworden)
# ---------------------------------------------------------------------------
mod.Ta = 9.5; mod.Tr = 9.5; mod.RH = 68; mod.Va = 0.4
mod.posture = "standing"; mod.PAR = 1.5
mod.Icl = 0.9                # nur noch Baselayer + Fleece
mod.Icl_airperm = 0.8        # Fleece ohne Aussenschicht: sehr winddurchlaessig
mod.Icl_evap_eff = 0.50      # Fleece atmet gut
mod.Icl_waterabs = 0.30
mod.release_tau = 4500
mod.max_storage = 70
log.append(run(5, "Pause: Softshell ausgezogen"))

# ---------------------------------------------------------------------------
# D) 45-100 min: Weiter aufwaerts, Wald lichtet sich Richtung Baumgrenze
# ---------------------------------------------------------------------------
mod.Ta = 10; mod.Tr = 11; mod.RH = 65; mod.Va = 0.5
mod.PAR = 4.3
log.append(run(55, "Aufstieg Richtung Baumgrenze"))

# ---------------------------------------------------------------------------
# E) 100-110 min: Trinkpause an der Baumgrenze, erster Wind
# ---------------------------------------------------------------------------
# Kuehler und windiger (exponiert), aber noch dieselbe duenne Kleidung ->
# hier sollte der Windchill-Effekt (Icl_airperm=0.8) spuerbar zur Abkuehlung
# der Haut beitragen, da man steht statt sich zu bewegen.
mod.Ta = 8; mod.Tr = 8; mod.RH = 60; mod.Va = 2.0
mod.posture = "standing"; mod.PAR = 1.4
log.append(run(10, "Trinkpause an der Baumgrenze, Wind zieht auf"))

# ---------------------------------------------------------------------------
# F) 110-170 min: Exponierter Gratanstieg zum Gipfel, steil, Sonne+Wind
# ---------------------------------------------------------------------------
# Windjacke wieder an (ueber dem Fleece): deutlich winddichter (airperm
# 0.15), aber weniger atmungsaktiv als Softshell. Tr > Ta durch direkte
# Sonneneinstrahlung auf freiem Grat trotz kalter Luft.
mod.Ta = 5; mod.Tr = 13; mod.RH = 55; mod.Va = 3.5
mod.posture = "standing"; mod.PAR = 5.5
mod.Icl = 1.1
mod.Icl_airperm = 0.15
mod.Icl_evap_eff = 0.35
mod.Icl_waterabs = 0.30
mod.release_tau = 3000      # windig -> trocknet schneller
mod.max_storage = 80
log.append(run(60, "Gratanstieg zum Gipfel, steil, sonnig+windig"))

# ---------------------------------------------------------------------------
# G) 170-200 min: Gipfelpause, Sitzen, kalt und stuermisch
# ---------------------------------------------------------------------------
# Kritischster Testfall: Wanderer kommt verschwitzt vom steilen Anstieg,
# bleibt nun 30 min stehen/sitzen bei Kaelte und starkem Wind. Dicke
# Isolationsjacke (Daune/Kunstfaser) wird uebergezogen: hohe Isolation,
# aber synthetische Fuellung nimmt anhaftende Feuchtigkeit gut auf
# (waterabs 0.45) und atmet schlecht (evap_eff 0.20). Erwartung: TskMean
# faellt zunaechst weiter (Auskuehlung durch gespeicherte/restliche
# Verdunstung + Windverlust), bevor die zusaetzliche Isolation greift.
mod.Ta = 1; mod.Tr = 4; mod.RH = 55; mod.Va = 4.5
mod.posture = "sitting"; mod.PAR = 1.2
mod.Icl = 2.4
mod.Icl_airperm = 0.08
mod.Icl_evap_eff = 0.20
mod.Icl_waterabs = 0.45
mod.release_tau = 3600
mod.max_storage = 110
log.append(run(15, "Gipfel erreicht: hinsetzen, Jacke ueberziehen"))
log.append(run(15, "Gipfelpause, Mittagessen im Wind"))

# ---------------------------------------------------------------------------
# H1) 200-225 min: Abstieg beginnt, Wetter zieht zu
# ---------------------------------------------------------------------------
# Isolationsjacke wieder aus (Bewegung erzeugt wieder Waerme), zurueck zur
# Windjacke. Sonne verschwindet hinter Wolken -> Tr = Ta.
mod.Ta = 3; mod.Tr = 3; mod.RH = 75; mod.Va = 3.0
mod.posture = "standing"; mod.PAR = 3.8
mod.Icl = 1.1
mod.Icl_airperm = 0.15
mod.Icl_evap_eff = 0.35
mod.Icl_waterabs = 0.35     # vom Gipfel her schon leicht durchfeuchtet
mod.release_tau = 3000
mod.max_storage = 80
log.append(run(25, "Abstieg, Wolken ziehen auf"))

# ---------------------------------------------------------------------------
# H2) 225-260 min: Regen setzt ein, Regenjacke drueber
# ---------------------------------------------------------------------------
# Regenjacke: nahezu winddicht/wasserdicht (airperm 0.05), Dampfdurchlaessig-
# keit gering (evap_eff 0.15, auch "atmungsaktive" Membranen leisten im
# Dauerregen wenig). waterabs hoch (0.50) und release_tau sehr lang (2.5h),
# da bei 95% Luftfeuchte praktisch nichts trocknen kann. Testet den in
# Fix 3a behobenen Bilanzfehler: die Feuchte sollte im Speicher bleiben.
mod.Ta = 6; mod.Tr = 6; mod.RH = 95; mod.Va = 2.5
mod.PAR = 3.6
mod.Icl = 1.0
mod.Icl_airperm = 0.05
mod.Icl_evap_eff = 0.15
mod.Icl_waterabs = 0.50
mod.release_tau = 9000
mod.max_storage = 100
log.append(run(35, "Abstieg im Regen, Regenjacke an"))

# ---------------------------------------------------------------------------
# I) 260-275 min: Pause an der Baumgrenze, Regen laesst nach
# ---------------------------------------------------------------------------
mod.Ta = 8; mod.Tr = 8; mod.RH = 80; mod.Va = 1.0
mod.posture = "standing"; mod.PAR = 1.4
mod.Icl = 0.9
mod.Icl_airperm = 0.7
mod.Icl_evap_eff = 0.45
mod.Icl_waterabs = 0.35
mod.release_tau = 3600
mod.max_storage = 80
log.append(run(15, "Pause: Regenjacke aus, Regen laesst nach"))

# ---------------------------------------------------------------------------
# J1) 275-305 min: Abstieg durch den Wald, wird waermer
# ---------------------------------------------------------------------------
mod.Ta = 11; mod.Tr = 11; mod.RH = 70; mod.Va = 0.5
mod.PAR = 3.2
log.append(run(30, "Abstieg Waldweg, wird milder"))

# ---------------------------------------------------------------------------
# J2) 305-345 min: Fleece aus, nur noch Baselayer + duenne Windjacke
# ---------------------------------------------------------------------------
mod.Ta = 13; mod.Tr = 13; mod.RH = 60; mod.Va = 0.4
mod.PAR = 3.0
mod.Icl = 0.55
mod.Icl_airperm = 0.6
mod.Icl_evap_eff = 0.50
mod.Icl_waterabs = 0.20
mod.release_tau = 2700
mod.max_storage = 50
log.append(run(40, "Abstieg, Fleece ausgezogen"))

# ---------------------------------------------------------------------------
# K) 345-360 min: Ankunft am Parkplatz
# ---------------------------------------------------------------------------
mod.Ta = 14; mod.Tr = 14; mod.RH = 55; mod.Va = 0.3
mod.posture = "standing"; mod.PAR = 1.2
log.append(run(15, "Ankunft Parkplatz"))

print("=" * 110)
print(f"Tour beendet nach {elapsed} min ({elapsed/60:.1f} h)")
print("=" * 110)

# ---------------------------------------------------------------------------
# Plausibilitaetspruefung
# ---------------------------------------------------------------------------
tcr = np.array([e["tcr"] for e in log])
tsk = np.array([e["tsk"] for e in log])
wet = np.array([e["wet"] for e in log])
store = np.array([e["store"] for e in log])
mshiv = np.array([e["mshiv"] for e in log])

print("\nPlausibilitaetscheck:")
checks = []

checks.append(("Keine NaN/Inf in Kernvariablen",
               np.isfinite(tcr).all() and np.isfinite(tsk).all()
               and np.isfinite(wet).all() and np.isfinite(store).all()))

checks.append(("Kerntemperatur (Chest) im physiologisch plausiblen Bereich 36.0-39.0 C",
               bool(np.all((tcr >= 36.0) & (tcr <= 39.0)))))

checks.append(("Hauttemperatur im plausiblen Bereich 20-38 C",
               bool(np.all((tsk >= 20.0) & (tsk <= 38.0)))))

checks.append(("Hautfeuchte (Wet) im gueltigen Bereich [0,1]",
               bool(np.all((wet >= 0.0) & (wet <= 1.0)))))

checks.append(("Wasserspeicher in Kleidung nie negativ",
               bool(np.all(store >= 0.0))))

# log-Indizes (siehe Reihenfolge der log.append(run(...))-Aufrufe oben):
# 0=A(5) 1=B(40) 2=C(45) 3=D(100) 4=E(110) 5=F(170) 6=G1(185) 7=G2(200)
# 8=H1(225) 9=H2(260) 10=I(275) 11=J1(305) 12=J2(345) 13=K(360)

# Erwartung: durch den steilen Gratanstieg (F, Index 5) sollte die
# Hautfeuchte gegenueber der fruehen Ruhephase (A, Index 0) deutlich
# gestiegen sein.
checks.append(("Hautfeuchte steigt beim steilen Gratanstieg (F) ggue. Start (A)",
               bool(log[5]["wet"] > log[0]["wet"])))

# Erwartung: waehrend der Gipfelpause (Index 6->7) sinkt TskMean trotz
# dickerer Jacke weiter, weil im Fleece gespeicherter Schweiss vom
# Gratanstieg nachverdunstet (Wet bleibt hoch, obwohl PAR auf 1.2 faellt
# und keine neue Anstrengung mehr Waerme liefert). Das ist der eigentliche
# Zweck des Wasserspeichermodells: Auskuehlung durch bereits produzierten,
# aber noch nicht verdunsteten Schweiss. 30 Minuten bei Icl=2.4 reichen
# dabei noch nicht fuer Kaeltezittern (Mshiv bleibt 0) - siehe Bericht.
checks.append(("Hautfeuchte bleibt am Gipfel trotz PAR=1.2 stark erhoeht (Nachverdunstung)",
               bool(log[7]["wet"] > 0.3)))
checks.append(("Auskuehlung (Tsk sinkt) waehrend der Gipfelpause trotz dickerer Jacke",
               bool(log[7]["tsk"] < log[6]["tsk"])))

# Erwartung: im Dauerregen (H2, Index 9) baut sich der Wasserspeicher in
# der Kleidung gegenueber davor (H1, Index 8) auf statt zu entladen
# (release_tau sehr lang, hohe RH -> Fix 3a: Speicher wird nicht mehr
# bilanzwidrig entleert, wenn kaum Verdunstungskapazitaet vorhanden ist).
checks.append(("Wasserspeicher waechst im Regenabschnitt (H2) ggue. davor (H1)",
               bool(log[9]["store"] >= log[8]["store"])))

# Erwartung: am Ende der Tour (warme, trockene Bedingungen, duenne
# Kleidung) sollte der Wasserspeicher gegenueber dem Regen-Maximum (H2,
# Index 9) wieder deutlich abgebaut sein.
checks.append(("Wasserspeicher baut sich zum Tourende hin wieder ab",
               bool(log[-1]["store"] < log[9]["store"])))

# Erwartung: Kerntemperatur bleibt insgesamt in einem enger gefassten
# Fenster (kein thermischer Runaway trotz stark wechselnder Bedingungen).
checks.append(("Kerntemperatur-Schwankung ueber die Tour < 2.0 C (kein Runaway)",
               bool((tcr.max() - tcr.min()) < 2.0)))

all_ok = True
for desc, ok in checks:
    status = "OK " if ok else "FEHLT"
    print(f"  [{status}] {desc}")
    all_ok = all_ok and ok

print("\nGesamtergebnis:", "PLAUSIBEL" if all_ok else "AUFFAELLIGKEITEN GEFUNDEN - siehe oben")
