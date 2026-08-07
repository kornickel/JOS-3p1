# Rechenschritt-Audit JOS-3p1

Dieses Dokument prüft und dokumentiert alle **Rechenschritte, die in diesem Repository gegenüber dem
offiziellen JOS-3-Repository ([TanabeLab/JOS-3](https://github.com/TanabeLab/JOS-3)) neu hinzugekommen
oder verändert worden sind.** Rechenschritte, die unverändert aus dem Original übernommen wurden
(z. B. das gesamte 65-Knoten-Wärmebilanzmodell, die Blutfluss-, Zittern- und Schweißregulationsmodelle in
`thermoregulation.py`, `construction.py`, `params.py`, `matrix.py`), wurden **nicht** erneut geprüft.

## Vorgehen

- **Startpunkt (Baseline):** Commit [`3c74ee2`](https://github.com/TanabeLab/JOS-3/commit/3c74ee2af2f79aa360093cc517e38bf465ec8c5b)
  ("Update README.md"). Dieser Commit ist gleichzeitig der aktuelle `HEAD` von `upstream/master` –
  das offizielle Repository hat sich seit dem Fork nicht weiterentwickelt. Verifiziert mit
  `git merge-base master upstream/master` (Ergebnis: `3c74ee2...`, identisch mit `git rev-parse upstream/master`).
- **Diff-Basis:** `git diff 3c74ee2...HEAD -- src/ webapp/` – alle inhaltlichen Unterschiede wurden Zeile für
  Zeile gelesen und bewertet.
- **Prüfmethode:** Wo die Rechenschritte auf publizierten Formeln/Studien beruhen (Minetti-Gehkosten,
  Pandolf-Lastzuschlag, Zhang-Komfortmodell), wurden die **Primärquellen beschafft und die transkribierten
  Koeffizienten/Formeln Zahl für Zahl gegengeprüft** (siehe jeweilige Abschnitte). Wo eigene Physik/Numerik
  neu implementiert wurde (Wasseraufnahme-Modell), wurde die Massen-/Energiebilanz von Hand nachgerechnet
  und die Grenzfälle (`Icl_waterabs=0` etc.) gegen das Ursprungsverhalten verifiziert.
- Es wurden **keine Code-Änderungen vorgenommen** (Audit-Auftrag). Gefundene Probleme sind ausschließlich im
  Abschnitt ["Gefundene Fehler und offene Punkte"](#gefundene-fehler-und-offene-punkte) am Ende dokumentiert.

Geänderte/neue Dateien seit der Baseline:

| Bereich | Datei | Art der Änderung |
|---|---|---|
| `src/` | `jos3/jos3.py` | erweitert (Kleidungsmodell, Wasseraufnahme) |
| `src/` | `jos3/thermoregulation.py` | nur Löschung (totes Funktions-Fragment) |
| `src/` | `jos3/comfort_zhang.py` | neu (Zhang-Komfortmodell) |
| `src/` | `jos3/jos3_orig.py`, `jos3/thermoregulation_orig.py` | neu, aber unbenutzte 1:1-Kopien des Originals |
| `webapp/backend` | komplett neu | FastAPI-Backend um `jos3.JOS3` |
| `webapp/frontend` | komplett neu | React/TypeScript-Oberfläche |

---

# Teil A – `src/` (Python-Simulationskern)

## A.1 Entfernter toter Code (`thermoregulation.py`)

**Datei:** [`src/jos3/thermoregulation.py`](../src/jos3/thermoregulation.py)

Die einzige Änderung gegenüber dem Original ist das Löschen der Funktion `heat_resistances()`
(vormals Zeilen 223–248 im Original). Die Funktion war ein Wrapper um `fixed_hc`/`fixed_hr`/`operative_temp`/
`clo_area_factor`/`dry_r`/`wet_r` und wird an keiner Stelle im Original-Repo noch im Fork aufgerufen
(verifiziert per `grep -rn "heat_resistances"` über das gesamte Repository – kein Treffer).

**Bewertung:** ✅ Unkritisch. Reine Entfernung von totem Code, keine Verhaltensänderung. Kein weiterer
Rechenschritt betroffen.

## A.2 Unbenutzte Duplikate: `jos3_orig.py`, `thermoregulation_orig.py`

**Dateien:** [`src/jos3/jos3_orig.py`](../src/jos3/jos3_orig.py), [`src/jos3/thermoregulation_orig.py`](../src/jos3/thermoregulation_orig.py)

Beide Dateien sind byte-identische Kopien der jeweiligen Original-Dateien aus dem Baseline-Commit
(verifiziert per `diff jos3_orig.py <(git show 3c74ee2:.../jos3.py)` → keine Differenz). Sie werden von
keinem anderen Modul importiert (`grep -rn "jos3_orig\|thermoregulation_orig"` liefert nur die Dateien
selbst).

**Bewertung:** Kein Rechenschritt, da unbenutzt. Siehe aber [offene Punkte](#gefundene-fehler-und-offene-punkte)
– vermutlich Arbeits-/Vergleichskopien, die vergessen wurden zu entfernen.

## A.3 Kleidungserweiterungen (`jos3.py`)

Das Original-JOS-3-Kleidungsmodell kennt nur zwei Parameter: `Icl` (Isolationswert in `clo`) und intern
`iclo` (Dampfdurchlässigkeit, fix 0.45, nicht öffentlich einstellbar). Dieser Fork führt fünf neue,
segmentweise (17 Körperregionen) einstellbare Kleidungseigenschaften ein:

| Property | Bedeutung | Default | Setter-Clipping |
|---|---|---|---|
| `Icl_emissivity` | Emissionsgrad ε für Strahlung | 1.0 | `[1e-3, 1.0]` |
| `Icl_airperm` | Luftdurchlässigkeit (Windblockade) | 1.0 | `[1e-3, 1.0]` |
| `Icl_evap_eff` | Dampfdurchlässigkeit (= internes `iclo`) | 0.45 | keins |
| `Icl_waterabs` | Schweißaufnahme-Anteil der Kleidung | 0.0 | `[0, 1]` |
| `release_tau` | Trocknungs-Zeitkonstante τ [s] | 3600 | `≥ 1e-3` |
| `max_storage` | max. Wasserspeicher der Kleidung [g] | 100 | `≥ 1e-6` |

Initialisierung: [`jos3.py:227-255`](../src/jos3/jos3.py#L227-L255).

### A.3.1 Emissivität und Luftdurchlässigkeit → hc/hr-Skalierung

**Code:** [`jos3.py:380-391`](../src/jos3/jos3.py#L380-L391) (in `_run`), identisch dupliziert in den
Property-Gettern `To` ([`:916-921`](../src/jos3/jos3.py#L916-L921)), `Rt`
([`:1260-1264`](../src/jos3/jos3.py#L1260-L1264)) und *nicht* in `Ret`
([`:1276-1283`](../src/jos3/jos3.py#L1276-L1283) – bewusst, siehe unten).

```
hc_dry = hc · Icl_airperm
hr'    = hr · Icl_emissivity
To  = (hc_dry·Ta + hr'·Tr) / (hc_dry + hr')      # operative Temperatur
R_t = dry_r(hc_dry, hr', Icl, pt)                 # trockener Wärmewiderstand (unverändert sonst)
R_et = wet_r(hc, Icl, iclo=Icl_evap_eff, pt)       # Verdunstungswiderstand: UNSKALIERTES hc
```

**Physikalische Herleitung:** `hc` (konvektiv) und `hr` (radiativ) sind die beiden Wärmeübergangs-
koeffizienten zwischen Haut/Kleidungsoberfläche und Umgebung. Eine winddichte Kleidung (`Icl_airperm → 0`)
reduziert die konvektive Kopplung (weniger externer Luftaustausch erreicht die Haut), ein niedriger
Emissionsgrad (`Icl_emissivity → 0`, z. B. reflektierende Rettungsdecke) reduziert den Strahlungsaustausch.
Beides sind multiplikative Skalierungen der Originalkoeffizienten – strukturell korrekt, da `hc` und `hr`
in allen Folgeformeln (`operative_temp`, `dry_r`) linear/additiv auftreten.

**Wichtig – warum `Ret` das unskalierte `hc` nutzt:** Dies folgt der in der Bekleidungsphysiologie üblichen
Trennung (vgl. ISO 9920) zwischen der *trockenen* Isolation `Icl` (durch Windpumpeffekte beeinflusst) und dem
*Wasserdampf-Durchlässigkeitsindex* `im`/`iclo` (einer eigenständigen Stoffeigenschaft, hier `Icl_evap_eff`).
Der Kommentar im Code begründet dies explizit ([`jos3.py:376-379`](../src/jos3/jos3.py#L376-L379)). Das ist
eine plausible, in der Fachliteratur gestützte Modellentscheidung – mit der Einschränkung, dass ein *nur*
winddicht (aber dampfdurchlässig, `Icl_evap_eff` auf Standard 0.45 belassen) simuliertes Kleidungsstück im
Modell keinerlei reduzierte Verdunstungskühlung zeigt, obwohl reale winddichte Stoffe die Verdunstung an der
Haut durchaus etwas bremsen. Siehe [offene Punkte](#gefundene-fehler-und-offene-punkte).

**Konsistenzprüfung:** Ich habe alle vier Aufrufstellen (`_run`, `To`, `Rt`, `Ret`) verglichen – die
Skalierung wird überall identisch gehandhabt (`hc·Icl_airperm` nur für den trockenen Pfad, nie für den
Verdunstungspfad). Keine Inkonsistenz gefunden.

**Unterer Grenzwert `_MIN_CLO_COEF = 1e-3`** ([`jos3.py:1472`](../src/jos3/jos3.py#L1472)): verhindert, dass
`Icl_airperm=0` bzw. `Icl_emissivity=0` in `dry_r`s `r_a = 1/(hcc+hr)` zu einer Division durch Null führt.
Plausibel und notwendig, da beide Setter ohne diesen Floor exakt 0 zulassen würden.

**Bewertung:** ✅ Plausibel, in sich konsistent, an vier Stellen identisch angewendet.

### A.3.2 `Icl_evap_eff` → internes `iclo`

**Code:** [`jos3.py:1163-1197`](../src/jos3/jos3.py#L1163-L1197)

Reiner Alias: Getter/Setter leiten direkt auf `self._iclo` durch, denselben Wert, den das Original-JOS-3
intern für `wet_r(..., iclo=...)` verwendet, vorher aber nicht von außen einstellbar war (Default weiterhin
0.45, siehe [`jos3.py:255-256`](../src/jos3/jos3.py) `iclo`-Init, unverändert vom Original). Kein neuer
Rechenschritt, nur ein neu öffentlich gemachter Parameter.

**Bewertung:** ✅ Korrekt, keine Formel geändert.

### A.3.3 Schweißaufnahme & verzögerte Verdunstung (`Icl_waterabs`, `water_storage`, `release_tau`, `max_storage`)

**Code:** [`jos3.py:404-488`](../src/jos3/jos3.py#L404-L488) (Berechnung in `_run`),
[`jos3.py:556`](../src/jos3/jos3.py#L556) (Gewichtsverlust), Properties
[`jos3.py:1071-1161`](../src/jos3/jos3.py#L1071-L1161).

Dies ist der umfangreichste neue Rechenschritt in `src/`. Motivation laut Commit: Modellierung, dass
Schweiß nicht sofort und vollständig verdunstet, sondern teilweise von der Kleidung aufgenommen, dort
gespeichert und zeitversetzt wieder abgegeben wird (wichtig für Regen-/Nässe-Szenarien beim Bergwandern).

**Schritt für Schritt** (alle Größen pro Körperregion, 17-elementige Arrays; `λ = 2418 J/g` latente
Verdampfungswärme von Schweiß, identisch zum bereits im Original verwendeten Wert in
`thermoregulation.py:857-862` `get_lts()`):

1. **Ausgangs-Schweißrate sichern** ([`:422`](../src/jos3/jos3.py#L422)):
   `e_sweat_orig := e_sweat` (Rückgabewert des *unveränderten* `threg.evaporation()`, bereits intern auf
   `e_max` begrenzt).

2. **Produzierte Schweißmasse dieses Zeitschritts** ([`:434-436`](../src/jos3/jos3.py#L434-L436)):
   ```
   ṁ_sweat = e_sweat_orig / λ            [g/s]
   m_sweat = ṁ_sweat · Δt                [g]
   ```
3. **Aufteilung Aufnahme/Sofortverdunstung** ([`:438-442`](../src/jos3/jos3.py#L438-L442)):
   ```
   m_absorbed        = Icl_waterabs · m_sweat
   m_evap_immediate  = (1 − Icl_waterabs) · m_sweat
   ```
4. **Speicher-Update mit Kapazitätsgrenze** ([`:444-450`](../src/jos3/jos3.py#L444-L450)):
   ```
   S ← min(S + m_absorbed, max_storage)
   ```
   Überschüssiges Wasser über `max_storage` hinaus "tropft ab" – ohne Kühleffekt (bewusste Vereinfachung,
   im Kommentar begründet: der Massenverlust ist über `e_sweat_orig`/`wlesk`, siehe Schritt 8, bereits
   erfasst).

5. **Verdunstungsbudget aus `e_max`** ([`:451-460`](../src/jos3/jos3.py#L451-L460)):
   ```
   ṁ_max        = e_max / λ              [g/s]   (identisch zur Definition von e_max in threg.evaporation)
   m_max        = ṁ_max · Δt
   m_remaining  = max(m_max − m_evap_immediate, 0)
   ```
   Dies begrenzt, wie viel gespeichertes Wasser überhaupt noch verdunsten *kann* – physikalisch zentral:
   ohne dieses Budget könnte in gesättigter Luft (`e_max ≈ 0`) gespeichertes Wasser trotzdem "verschwinden",
   ohne dass die entsprechende Kühlwirkung in der Energiebilanz auftaucht (Verletzung der Massen-/Energie-
   konsistenz). Mit dem Budget ist das ausgeschlossen.

6. **Freisetzung nach Zeitkonstante τ** ([`:461-470`](../src/jos3/jos3.py#L461-L470)):
   ```
   m_release = min( S/τ · Δt,  S,  m_remaining )
   S ← S − m_release
   ```
   Exponentieller Abkling-Ansatz (`Rate = S/τ`), per explizitem Euler-Schritt diskretisiert und zusätzlich
   nach oben durch den verfügbaren Speicher *und* das Verdunstungsbudget aus Schritt 5 gekappt.

7. **Neue Hautfeuchte** ([`:471-484`](../src/jos3/jos3.py#L471-L484)):
   ```
   m_evap_total = m_evap_immediate + m_release
   e_evap       = (m_evap_total/Δt) · λ
   wet_new      = clip( 0.06 + 0.94 · e_evap/e_max ,  0, 1 )
   e_sk         = wet_new · e_max
   e_sweat      = (wet_new − 0.06)/0.94 · e_max
   ```
   Dieselbe Formstruktur `wet = 0.06 + 0.94·(...)` wie im Original `threg.evaporation()`
   ([`thermoregulation.py:334`](../src/jos3/thermoregulation.py#L334)) – nur mit `e_evap` (tatsächlich in
   diesem Schritt verdunstete Masse) statt der ursprünglichen Regelgröße `e_sweat`.

8. **Gewichtsverlust bleibt unverändert vom Speichermodell** ([`:556`](../src/jos3/jos3.py#L556)):
   ```
   wlesk = (e_sweat_orig + 0.06·e_max) / λ
   ```
   nutzt bewusst `e_sweat_orig` (Schritt 1), **nicht** die neu berechnete `e_sweat` aus Schritt 7.

**Verifikation der Konsistenz (eigene Nachrechnung):**

- *Rückwärtskompatibilität:* Für `Icl_waterabs = 0` (Standardwert) ist `m_evap_immediate = m_sweat`,
  `S` bleibt 0, also `m_release = 0`, `m_evap_total = m_sweat`, `e_evap = e_sweat_orig`. Damit ist
  `wet_new` **rechnerisch identisch** mit dem `wet` aus dem unveränderten `threg.evaporation()`. Das
  Wasseraufnahme-Feature ist also bei Default-Einstellung exakt ein No-Op – ein starkes Korrektheitsindiz,
  das ich durch Nachvollziehen der Formeln von Hand bestätigt habe.
- *Massenbilanz:* `S` kann nie negativ werden (`m_release ≤ S` erzwungen) und nie `max_storage`
  überschreiten. Energie- und Massenbilanz sind über das `m_remaining`-Budget (Schritt 5) gekoppelt.
- *Plausibilitätstest im Bestandscode:* `webapp/backend/tests/test_simulate_mountain_hike_parity.py`
  bestätigt u. a., dass der Wasserspeicher bei Regen (95 % rF, kaum Verdunstungskapazität) nicht abgebaut
  wird, sondern hält bzw. leicht steigt – konsistent mit obiger Bilanz.

**Bewertung:** ✅ Plausibel und in sich konsistent; Grenzfall `Icl_waterabs=0` beweisbar äquivalent zum
Original. Zwei nicht-triviale Nebenpunkte werden unter
[Gefundene Fehler und offene Punkte](#gefundene-fehler-und-offene-punkte) diskutiert (Diskretisierungsfehler
bei kleinem `release_tau`; Inkonsistenz der `Wet`/`WetMean`-Getter mit diesem Modell; Bilanzfrage bei
`Wle`/Körpergewicht vs. in der Kleidung gespeichertem Wasser).

## A.4 Zhang-Komfortmodell (`comfort_zhang.py`)

**Datei:** [`src/jos3/comfort_zhang.py`](../src/jos3/comfort_zhang.py) (komplett neu, 483 Zeilen)

Implementiert das dreiteilige Modell von Zhang, Arens, Huizenga, Han, *"Thermal sensation and comfort
models for non-uniform and transient environments"*, Building and Environment 45(2), 2010, in den drei
Teilen:

- **Teil I** – lokale thermische Empfindung ("sensation") je Körperregion
- **Teil II** – lokaler thermischer Komfort je Körperregion
- **Teil III** – Ganzkörper-Empfindung und -Komfort

Dies ist reines Post-Processing der bereits von JOS-3 simulierten Hauttemperaturen (`Tsk`, `setpt_sk`) und
greift **nicht** in den Thermoregulationskern ein.

Für die Prüfung wurden die drei Original-Papers direkt von eScholarship (UC Berkeley) beschafft
(`escholarship.org/uc/item/3sw061xh`, `.../1pz9j3j2`, `.../2tm289vb`) und Formeln sowie alle
Koeffiziententabellen Zahl für Zahl mit dem Code abgeglichen.

### A.4.1 Teil I – lokale Empfindung

**Code:** [`comfort_zhang.py:178-215`](../src/jos3/comfort_zhang.py#L178-L215) (`local_sensation`),
Koeffiziententabellen [`:75-113`](../src/jos3/comfort_zhang.py#L75-L113).

**Formel (Paper Eq. 3 & 5):**
```
Δ      = Tsk,i − Tsk,i,set
Δmean  = Tsk,mean − Tsk,mean,set
S_stat = 4·( 2 / (1 + exp[−(C1·Δ + K1·(Δ − Δmean))]) − 1 )     # C1,K1 je nach Δ<0 (cool) oder ≥0 (warm)

S_dyn  = C21·min(dTsk/dt, 0) + C22·max(dTsk/dt, 0) + C3·dTcore/dt

S_local = clip(S_stat + S_dyn, −4, 4)
```

**Prüfergebnis:** Die Koeffiziententabellen `SENSATION_STATIC` (C1/K1, cool/warm) und
`SENSATION_DYNAMIC` (C21/C22/C3) stimmen **exakt** mit Table 1 bzw. Table 2 des Papers
(*Part I*, S. 11 bzw. S. 13) überein – für alle 11 im Code verwendeten Körperteile (head, neck, chest,
back, pelvis, upper/lower arm, hand, thigh, lower leg, foot) auf jede Nachkommastelle geprüft. Die
Zuordnung JOS-3-Segment → Zhang-Körperteil (`JOS3_TO_ZHANG`, [`:55-67`](../src/jos3/comfort_zhang.py#L55-L67))
ist nachvollziehbar (linke/rechte Körperhälften teilen sich Koeffizienten, da Zhang nicht seitenspezifisch
misst; "face"/"breath" ohne JOS-3-Gegenstück werden korrekt weggelassen).

Die im Docstring dokumentierte Design-Entscheidung `USE_CORE_DERIVATIVE = False`
([`:151-168`](../src/jos3/comfort_zhang.py#L151-L168)) ist physiologisch **plausibel begründet**: Zhangs
negative `C3`-Koeffizienten (Torso-Kühlung → Kern steigt) beschreiben eine Kausalität, die sich unter
Belastung umkehrt (Kern steigt durch Muskelwärme, nicht durch Kühlung). Ich habe das Beispiel im Kommentar
(Bergaufgehen, Kernanstieg 1.5 K/h → über `C3=−5053` an der Beckenregion ein Sensations-Abzug von
≈2.1 Einheiten) nachgerechnet: `1.5/3600 · 5053 ≈ 2.1`, stimmt. Der zugehörige Unit-Test
(`test_core_derivative_is_off_by_default_because_exercise_inverts_it`,
[`webapp/backend/tests/test_comfort_zhang.py:75-99`](../webapp/backend/tests/test_comfort_zhang.py#L75-L99))
verifiziert dasselbe Verhalten unabhängig.

**Bewertung:** ✅ Formel und alle Koeffizienten korrekt transkribiert.

### A.4.2 Teil II – lokaler Komfort

**Code:** [`comfort_zhang.py:221-259`](../src/jos3/comfort_zhang.py#L221-L259) (`local_comfort`),
Koeffizienten [`:117-129`](../src/jos3/comfort_zhang.py#L117-L129) (`COMFORT_LOCAL`).

**Formel (Paper Eq. 9), wie im Code umgesetzt:**
```
So⁻ = |min(S_overall,0)| ,  So⁺ = max(S_overall,0)

w  (max. Komfort)     = C6 + C71·So⁻ + C72·So⁺
x  (Offset)           = C31·So⁻ + C32·So⁺ + C8
u                      = S_local + x
a = (−4 − w) / |−4 + x|ⁿ ,  b = (−4 − w) / |4 + x|ⁿ
mix  = (a−b)/(1+exp(25·u)) + b
C_local = clip( mix · |u|ⁿ + w ,  −4, 4 )
```

**Prüfung der Koeffiziententabelle:** `COMFORT_LOCAL` stimmt für alle 11 Körperteile exakt mit *Part II*,
Table 1 (S. 14/15 des Papers) überein (C31, C32, C6, C71, C72, C8, n).

**Prüfung der `|u|ⁿ`-Interpretation:** Der Code-Kommentar behauptet, die im Paper mehrdeutig gedruckte
Formel `(S_local+x)ⁿ` müsse als `|S_local+x|ⁿ` gelesen werden. Das habe ich **numerisch unabhängig
nachgeprüft**, indem ich `local_comfort()` für alle 11 Körperteile bei neutralem `S_overall=0` ausgewertet
habe:

- Maximalkomfort bei `S_local = −C8` muss exakt `C6` ergeben (die im Paper geforderte Eigenschaft, dass das
  Maximum bei neutralem Ganzkörperzustand exakt `C6` beträgt): **für alle 11 Körperteile exakt bestätigt**
  (Abweichung < 1e-9).
- An den Rändern `S_local = ±4` muss der Komfort exakt `−4` ergeben (Paper-Anforderung 5): **für alle 11
  Körperteile exakt bestätigt.**

Diese beiden Ankerbedingungen sind bereits im mitgelieferten Testfile abgesichert
(`test_neutral_sensation_gives_maximum_comfort`,
`test_extreme_local_sensation_gives_minimum_comfort`,
[`test_comfort_zhang.py:33-52`](../webapp/backend/tests/test_comfort_zhang.py#L33-L52)); ich habe sie
zusätzlich eigenständig reproduziert. Die `|u|ⁿ`-Interpretation ist damit sehr überzeugend belegt – eine
vorzeichenbehaftete Potenz würde beide Bedingungen für `n∈{1, 1.5}` nicht gleichzeitig erfüllen.

**Bewertung:** ✅ Formel und Koeffizienten korrekt; die nicht-triviale Lesart der Originalformel ist
nachvollziehbar und durch die eigenen Ankerbedingungen des Papers bestätigt.

### A.4.3 Teil III – Gesamtempfindung

**Code:** [`comfort_zhang.py:265-370`](../src/jos3/comfort_zhang.py#L265-L370)
(`_dedupe_paired`, `_no_opposite_overall`, `_individual_force`, `overall_sensation`).

Ablauf gemäß Paper (*Part III*, Section 4, "Flow-chart of the whole-body sensation model", Fig. 5):

1. **Gruppierung** ([`overall_sensation:338-353`](../src/jos3/comfort_zhang.py#L338-L353)): Körperteile
   nach Vorzeichen in "größere Gruppe" (Mehrheit; bei Gleichstand warm) und potenzielle Gegenteil-Kandidaten
   sortiert. Schwelle `|S_local| > 1`, für die drei "dominanten" Körperteile (`DOMINANT_PARTS = chest, back,
   pelvis`) beim Kühlen bereits `≤ −1`. Stimmt exakt mit Paper Section 4.2/"Step 1" überein.
2. **"No-opposite"-Modell für die größere Gruppe** ([`_no_opposite_overall:282-320`](../src/jos3/comfort_zhang.py#L282-L320)):
   - Bei ≥3 Körperteilen und drittextremstem Wert jenseits ±2: gewichteter Mittelwert aus extremstem und
     drittextremstem Wert (`0.5/0.5` warm, `0.38/0.62` kalt) – exakt Paper Eq. 1/2.
   - Sonst "Gradual Model" mit Intervall `2/(n−2)`, das schrittweise weitere Körperteile in den Mittelwert
     aufnimmt – strukturell Paper Eq. 3/4 nachgebildet.
   - Hand-/Fuß-Paare werden vor der Sortierung dedupliziert (`_dedupe_paired`), wie im Paper gefordert.
3. **Dominanter-Kühlteil-Sonderfall** ([`:361-364`](../src/jos3/comfort_zhang.py#L361-L364)): Ist die größere
   Gruppe warm und mindestens ein dominanter Körperteil (chest/back/pelvis) kühlt gegenteilig, wird die
   Gesamtempfindung direkt gleich der kältesten dieser dominanten Lokalwerte gesetzt – exakt die
   Sonderregel aus *Part III*, Section 4.2.2/Step 3.
4. **Individualkraft-Kombination** (sonst, [`:366-370`](../src/jos3/comfort_zhang.py#L366-L370)):
   stärkste und zweitstärkste `_individual_force` (Tabelle `OPPOSITE_FORCE`, dreiteilige Regression Eq. 5)
   werden mit Gewichten `1.0`/`0.1` kombiniert und zur Gesamtempfindung der größeren Gruppe addiert
   (Paper Eq. 6/7).

**Prüfung der `OPPOSITE_FORCE`-Tabelle:** Für die `delta ≤ −2`- und die mittlere Spalte stimmen alle Werte
exakt mit *Part III*, Table 2 (S. 11) überein. **Für die `delta ≥ +2`-Spalte (`a_hi`) wurde eine substanzielle
Abweichung zwischen zwei Fassungen der Tabelle im Originalpaper selbst gefunden** – siehe
[Gefundene Fehler und offene Punkte](#gefundene-fehler-und-offene-punkte), Punkt 3. Kurzfassung: Die im
Fließtext gedruckte Table 2 enthält für mehrere Körperteile (u. a. genau die drei "dominanten" – chest, back,
pelvis) mutmaßlich fehlerhafte `a_hi`-Werte; die im Code übernommenen Werte folgen dieser (vermutlich
fehlerhaften) gedruckten Tabelle.

**Bewertung:** ⚠️ Struktur und Ablauflogik korrekt und exakt nach Paper umgesetzt; die Koeffiziententabelle
für den Wärme-Ast (`a_hi` bei `delta_S_local ≥ 2`) ist mit hoher Wahrscheinlichkeit fehlerhaft transkribiert
– allerdings ein Fehler, der aus dem Quellpaper selbst stammt (siehe unten), nicht aus fehlerhafter
Übertragung durch die Fork-Autoren.

### A.4.4 Teil III – Gesamtkomfort

**Code:** [`comfort_zhang.py:376-407`](../src/jos3/comfort_zhang.py#L376-L407) (`overall_comfort`).

**Regel (Paper Table 6):**
```
Regel 1: Gesamtkomfort = Mittelwert der zwei unangenehmsten lokalen Komfort-Werte
Regel 2 (bei transienten Bedingungen ODER wenn Personen Kontrolle über ihre Umgebung haben):
         zusätzlich der angenehmste Wert einbezogen → Mittelwert aus 3 Werten
Sonderfall: Sind die zwei unangenehmsten Werte beide Hand oder beide Fuß, wird der zweitunangenehmste
            durch den drittunangenehmsten ersetzt.
```

Code implementiert `transient_or_controlled=True` als Default (sinnvoll für das Zielszenario "Bergwanderung",
bei dem beides zutrifft: veränderliche Bedingungen und Kontrolle über z. B. Kleidung). Die Hand-/Fuß-
Sonderregel ist korrekt umgesetzt ([`:394-400`](../src/jos3/comfort_zhang.py#L394-L400)).

**Bewertung:** ✅ Exakt nach Paper Table 6 umgesetzt.

---

# Teil B – `webapp/backend`

Das Backend (`webapp/backend/app/`) ist komplett neu (existiert im Original-Repo nicht). Es handelt sich
überwiegend um **Verdrahtung** (FastAPI-Routen, Pydantic-Schemas) ohne eigene Rechenschritte – die
eigentliche Physik bleibt vollständig in `jos3.JOS3` (Teil A). Eigene Berechnungen finden sich nur in
`jos3_bridge.py`.

## B.1 `jos3_bridge.py`

**Datei:** [`webapp/backend/app/jos3_bridge.py`](../webapp/backend/app/jos3_bridge.py)

- **`_snapshot_extra_properties` / `EXTRA_TRACKED_PROPERTIES`**
  ([`:92-104`](../webapp/backend/app/jos3_bridge.py#L92-L104)): Da die neuen Kleidungs-Properties
  (`Icl_airperm`, `Icl_evap_eff`, `Icl_emissivity`, `Icl_waterabs`, `release_tau`, `max_storage`) und der
  interne Wasserspeicher `_water_storage` (Teil A.3.3) von `JOS3._run()` nicht in die interne `_history`
  geschrieben werden, snapshotet die Bridge sie nach **jedem einzelnen** `simulate(times=1)`-Aufruf separat
  und baut daraus eigene Zeitreihen-Spalten (`"<Key><BodyName>"`, `"<Key>Mean""`). Reines Ablesen bestehender
  Zustände, keine eigene Berechnung – aber sicherheitsrelevant für Konsistenz, siehe unten.
  - `run_scenario()` ([`:107-146`](../webapp/backend/app/jos3_bridge.py#L107-L146)) ruft daher bewusst
    `simulate(times=1, ...)` in einer Schleife statt `simulate(times=N)` in einem Rutsch auf. Kommentar
    behauptet, dies sei "numerisch identisch". Das stimmt: `JOS3.simulate()` ruft intern für jeden Zeitschritt
    ohnehin `_run()` einzeln auf (kein Zustand wird zwischen mehreren Schritten vorab vektorisiert) – verifiziert
    durch Lesen der (unveränderten) `simulate()`-Methode in `jos3.py`. Kein numerischer Unterschied zur
    Einzelschritt-Schleife.
- **`_comfort_columns()`** ([`:149-184`](../webapp/backend/app/jos3_bridge.py#L149-L184)): ruft
  `comfort_zhang.evaluate_series()` (Teil A.4) *nach* Abschluss der Simulation über die volle Zeitreihe auf
  (nicht pro Schritt, da die Ableitungen `dTsk/dt`/`dTcore/dt` benachbarte Zeitschritte brauchen). Nutzt
  `model.setpt_sk` als lokale Neutraltemperatur-Referenz – korrekt, da `JOS3._reset_setpt()`
  (unverändertes Original) bereits beim Konstruieren des Modells eine PMV=0-Gleichgewichtssimulation
  durchführt und genau die segmentweisen Sollwerte liefert, die Zhangs Modell erwartet
  (33.9–35.8 °C, kein einheitlicher Wert – wie im Docstring von `comfort_zhang.py` korrekt beschrieben, von
  mir gegen `JOS3._reset_setpt()`/`setpt_sk` nachvollzogen).
  - **Kernsignal-Fallback:** `core = results.get("Tcb") or results.get("TcrChest")`
    ([`:173`](../webapp/backend/app/jos3_bridge.py#L173)). Ich habe geprüft, dass `Tcb` nur vorhanden ist,
    wenn `ex_output` aktiviert ist (nur dann landet es im `detailout`-Dict in `jos3.py`s `_run()`), während
    `Tcr` (und damit die entfaltete Spalte `TcrChest`) immer im *Standard*-`dictout` steht
    (`jos3.py`, unverändert: `dictout["Tcr"] = self.Tcr`). Der Fallback greift also in genau den Fällen, in
    denen er greifen soll, und niemals ins Leere. ✅ Korrekt.
  - Da `USE_CORE_DERIVATIVE=False` (Default), wird `core_series` aktuell ohnehin nicht verwendet
    (Ableitung wird verworfen) – der Fallback ist also derzeit folgenlos, aber korrekt vorbereitet für den
    Fall, dass `use_core_derivative=True` gesetzt wird.

**Bewertung:** ✅ Reine, korrekte Verdrahtung; die einzige eigene Logik (Schrittweise-Simulation,
Fallback-Auswahl des Kernsignals) wurde geprüft und ist korrekt.

## B.2 `jos3_meta.py`, `schemas.py`, `routers/*.py`, `example_scenarios.py`

Diese Dateien enthalten **keine eigenen Rechenschritte**:

- [`jos3_meta.py`](../webapp/backend/app/jos3_meta.py): statische Metadaten (Einheiten, Min/Max-Werte für
  UI-Schieberegler, Enum-Beschriftungen). Die Min/Max-Grenzen sind Plausibilitätsannahmen der Autoren
  (z. B. `PAR` bis 15.0, mit Begründung im Kommentar), keine berechneten Werte.
- [`schemas.py`](../webapp/backend/app/schemas.py): reine Pydantic-Datenverträge, keine Arithmetik (bis auf
  Validierungsgrenzen wie `grade_pct ∈ [-45,45]`, die die Gültigkeitsgrenzen von Minetti in Teil C.1
  widerspiegeln).
- [`routers/*.py`](../webapp/backend/app/routers): dünne HTTP-Handler, delegieren vollständig an
  `jos3_bridge`.
- [`example_scenarios.py`](../webapp/backend/app/example_scenarios.py): Szenario-*Daten* (die
  "Bergwanderung"-Beispielsimulation), keine Formeln – die dort dokumentierten PAR-Werte sind Ergebnisse
  des Frontend-Rechenschritts in Teil C.1, nicht neu berechnet.

**Bewertung:** ✅ Kein Prüfbedarf (keine Berechnung).

---

# Teil C – `webapp/frontend`

Auch das Frontend existiert komplett neu. Die meisten Dateien sind reine Darstellungslogik (React-
Komponenten, Diagramme). Echte Rechenschritte mit fachlichem Gehalt finden sich in `src/lib/`.

## C.1 PAR-Schätzung aus Gehdaten (`parModel.ts`)

**Datei:** [`webapp/frontend/src/lib/parModel.ts`](../webapp/frontend/src/lib/parModel.ts)

Berechnet aus Gehgeschwindigkeit, Steigung, Zuladung und Geländetyp einen JOS-3-`PAR`-Wert (physical
activity ratio, Vielfaches des *Grundumsatzes* – wichtig: **nicht** MET, wie im Code ausführlich und korrekt
hergeleitet wird: JOS-3 berechnet `Mwork = (PAR−1)·BMR`, s.
[`thermoregulation.py:566-589`](../src/jos3/thermoregulation.py#L566-L589), unverändertes Original).

**Formel:**
```
Cw(i) = 280.5·i⁵ − 58.7·i⁴ − 76.8·i³ + 51.9·i² + 19.6·i + 2.5        [J/kg/m]   (Minetti 2002, Steigung i als Bruchteil)

Watt   = 1.5·m_Körper                                    (Pandolf-Ruhewert, W)
       + η_Gelände · Cw(i) · (m_Körper+m_Last) · v         (Fortbewegung, W)
       + 2.0·(m_Körper+m_Last)·(m_Last/m_Körper)²          (Pandolf-Lastzuschlag, W)

PAR  = Watt / (BMR_W/m² · BSA_m²)
```
Code: [`parModel.ts:96-137`](../webapp/frontend/src/lib/parModel.ts#L96-L137).

**Prüfung der Minetti-Formel:** Ich habe die Primärquelle (Minetti et al., *"Energy cost of walking and
running at extreme uphill and downhill slopes"*, J Appl Physiol 93:1039–1046, 2002) beschafft und die
Koeffizienten Zahl für Zahl mit dem PDF abgeglichen: **exakt identisch** (S. 1041, Gleichung für `Cw(i)`,
`R²=0.999`). Zusätzlich per Handrechnung verifiziert:
- `Cw(+0.45) = 17.60` (Code-Kommentar) → eigene Nachrechnung ergibt `17.603` ✓, Paper misst `17.33±1.11` (im
  Streubereich).
- `Cw(−0.45)` eigene Nachrechnung: `3.60`, Paper misst `3.46±0.95` (im Streubereich) – bestätigt zusätzlich
  die **Vorzeichen** der einzelnen Terme (ein Vorzeichenfehler an dieser Stelle hätte bei einem
  Polynom 5. Grades zu einer um Größenordnungen falschen Zahl geführt, nicht zu einer Abweichung im
  Streubereich).

**Prüfung des Pandolf-Lastterms:** `2.0·(W+L)·(L/W)²` entspricht exakt dem Lastzuschlagsterm der
Originalgleichung von Pandolf et al. 1977; der `1.5·W`-Ruheterm ebenso (Pandolfs eigener Stehterm, bewusst
*nicht* JOS-3s Grundumsatz, siehe Begründung im Code – schlüssig: Stehen kostet mehr als der reine
Grundumsatz).

**Selbstverifikation im Code nachgerechnet:** Die im Kommentar dokumentierte Referenztabelle
([`parModel.ts:45-58`](../src/../webapp/frontend/src/lib/parModel.ts#L45-L58)) wurde exemplarisch
nachgerechnet, z. B. "standing still": `loadPenalty=2·80·(8/72)²=1.975 W`, `standingWatts=1.5·72=108 W`,
Summe `≈110 W`, `PAR=110/83.33=1.32` – stimmt mit dem dokumentierten Wert überein. "level forest road,
3 km/h" (dirt_road, η=1.1): `locomotion=1.1·2.5·80·0.833=183.3 W`, Summe `≈293 W` – stimmt ebenfalls.

**Bewertung:** ✅ Formel korrekt transkribiert und durch unabhängige Nachrechnung anhand der Primärquelle
bestätigt.

## C.2 Belastungsgrenzwerte (`thresholds.ts`)

**Datei:** [`webapp/frontend/src/lib/thresholds.ts`](../webapp/frontend/src/lib/thresholds.ts)

Definiert feste Grenzwerte (ISO 7933 Hitzebelastung, ISO 11079-nahe Kälteschutz-Richtwerte,
Dehydrations-Faustregeln) und wertet Zeitreihen dagegen aus:

- `dehydrationSeries()` ([`:176-189`](../webapp/frontend/src/lib/thresholds.ts#L176-L189)): kumuliert
  `Wle` (Gewichtsverlustrate, g/s, direkter JOS-3-Output) über die Zeit zu Prozent der Körpermasse:
  `Σ(Wle·Δt) / (m_Körper·1000) · 100`. Korrekt, da `Wle` bereits eine pro-Zeitschritt-diskretisierte Rate
  ist – die Multiplikation mit dem jeweiligen `Δt` entspricht der exakten (nicht approximierten) Aufsummierung
  der vom Simulationskern selbst schon zeitdiskretisierten Werte.
- `saturationSeries()` ([`:192-208`](../webapp/frontend/src/lib/thresholds.ts#L192-L208)): mittlerer
  Füllstand `WaterStorage/max_storage` – direkte, korrekte Nutzung der in Teil A.3.3 geprüften Größen.
- `severityOf()`/`worstViolation()` ([`:119-159`](../webapp/frontend/src/lib/thresholds.ts#L119-L159)):
  ermittelt je Metrik die "schlimmste" Grenzwertüberschreitung über die gesamte Zeitreihe.

**Bewertung:** ⚠️ Die Aggregationslogik in `worstViolation()` enthält einen Vergleichsfehler beim
Zusammentreffen von *oberer* und *unterer* Grenzwertüberschreitung derselben Metrik im selben Lauf – siehe
[Gefundene Fehler und offene Punkte](#gefundene-fehler-und-offene-punkte), Punkt 1. Alle anderen Formeln in
dieser Datei sind korrekt.

## C.3 Zustands-Fortschreibung (`regionValues.ts`, `globalValues.ts`)

**Dateien:** [`webapp/frontend/src/lib/regionValues.ts`](../webapp/frontend/src/lib/regionValues.ts),
[`webapp/frontend/src/lib/globalValues.ts`](../webapp/frontend/src/lib/globalValues.ts)

Kein numerischer Rechenschritt im engeren Sinn, sondern eine **Zustandsreplikation**: Da im Backend
(`jos3_bridge.apply_segment`/`_resolve_region_value`, Teil B.1) jedes Segment nur die *geänderten* Felder an
das (zustandsbehaftete) `JOS3`-Objekt schreibt und alle anderen Felder automatisch ihren vorherigen Wert
behalten (Python-Objektzustand), muss das Frontend dieselbe "Skalar broadcastet auf 17 Regionen, Dict
patched nur benannte Regionen, unveränderte Segmente sind No-Ops"-Semantik eigenständig nachbilden, um in
der Vorschau/Anzeige den *tatsächlich* zur Simulationszeit aktiven Wert korrekt vorherzusagen.

Ich habe die Logik in `computeEffectiveRegionSnapshot()`
([`regionValues.ts:53-77`](../webapp/frontend/src/lib/regionValues.ts#L53-L77)) und
`_resolve_region_value()` ([`jos3_bridge.py:39-50`](../webapp/backend/app/jos3_bridge.py#L39-L50)) Zeile für
Zeile gegenübergestellt: beide behandeln Skalar-Broadcast, Dict-Patch und "unset = No-Op" identisch.

**Bewertung:** ✅ Korrekt und konsistent zur Backend-Semantik nachgebildet.

## C.4 Darstellung (`colorScale.ts`, `BodyDiagramResult.tsx`, `ComfortStatus.tsx`)

Diese Dateien enthalten keine fachliche Berechnung, sondern reine **Visualisierungs-Mathematik**
(Werte→Farbe-Mapping):

- [`colorScale.ts`](../webapp/frontend/src/lib/colorScale.ts): Interpolation in OKLCH-Farbraum zwischen
  festen Farbstützpunkten ("FEA-like" Mehrfarb-Verlauf für die Körper-Heatmap, analog zu ANSYS/ParaView).
  Reine Darstellungsentscheidung, keine physiologische Aussage.
- [`BodyDiagramResult.tsx:94-115`](../webapp/frontend/src/components/body-diagram/BodyDiagramResult.tsx#L94-L115):
  normiert Werte über die *gesamte* Zeitreihe (nicht pro Frame) auf `[0,1]` bzw. `[-1,1]`, damit die
  Farbskala während der Animation stabil bleibt (kein Flackern durch Neu-Skalierung pro Frame) – eine
  bewusste, sinnvolle Darstellungsentscheidung.
- [`ComfortStatus.tsx:43`](../webapp/frontend/src/components/results/ComfortStatus.tsx#L43): färbt die
  Zhang-Sensation nach *Abweichung von neutral* (`tone(-Math.abs(sensation))`) statt nach Rohwert – korrekt,
  da sowohl zu warm als auch zu kalt "schlecht" ist; für Komfort (wo die Skala bereits "negativ=schlecht"
  bedeutet) wird der Rohwert direkt gefärbt. Beide Fälle wurden geprüft und sind stimmig.

**Bewertung:** ✅ Keine fachlichen Fehler; reine Darstellungslogik.

---

# Zusammenfassung der geprüften Rechenschritte

| # | Rechenschritt | Bereich | Datei | Ergebnis |
|---|---|---|---|---|
| 1 | Löschung `heat_resistances()` | src | `thermoregulation.py` | ✅ folgenlos |
| 2 | `jos3_orig.py`/`thermoregulation_orig.py` | src | – | ✅ unbenutzt, folgenlos |
| 3 | Emissivität/Luftdurchlässigkeit → hc/hr | src | `jos3.py` | ✅ plausibel, konsistent |
| 4 | `Icl_evap_eff` (Alias) | src | `jos3.py` | ✅ korrekt |
| 5 | Wasseraufnahme/verzögerte Verdunstung | src | `jos3.py` | ✅ plausibel, bilanzkonsistent |
| 6 | Zhang Teil I (lokale Empfindung) | src | `comfort_zhang.py` | ✅ exakt verifiziert |
| 7 | Zhang Teil II (lokaler Komfort) | src | `comfort_zhang.py` | ✅ exakt verifiziert |
| 8 | Zhang Teil III (Gesamtempfindung) | src | `comfort_zhang.py` | ⚠️ Koeffizienten-Fund, s. u. |
| 9 | Zhang Teil III (Gesamtkomfort) | src | `comfort_zhang.py` | ✅ exakt verifiziert |
| 10 | Snapshot/Bridge-Logik | backend | `jos3_bridge.py` | ✅ korrekt |
| 11 | Kernsignal-Fallback | backend | `jos3_bridge.py` | ✅ korrekt |
| 12 | Metadaten/Schemas/Routen | backend | diverse | ✅ keine Berechnung |
| 13 | PAR-Schätzung (Minetti+Pandolf) | frontend | `parModel.ts` | ✅ verifiziert gegen Primärquelle |
| 14 | Belastungsgrenzwert-Auswertung | frontend | `thresholds.ts` | ⚠️ Logikfehler, s. u. |
| 15 | Zustands-Fortschreibung | frontend | `regionValues.ts`, `globalValues.ts` | ✅ korrekt |
| 16 | Farbskalen/Normierung | frontend | `colorScale.ts`, `BodyDiagramResult.tsx` | ✅ keine fachliche Aussage |

---

# Gefundene Fehler und offene Punkte

Diese Liste fasst **alle** im Rahmen des Audits gefundenen Probleme, Ungereimtheiten und offenen Fragen
zusammen. Es wurden **keine Korrekturen vorgenommen** (Auftrag: nur Audit).

### 1. `worstViolation()` vergleicht Werte unterschiedlicher Richtung inkonsistent — **bestätigter Logikfehler**

**Datei:** [`webapp/frontend/src/lib/thresholds.ts:140-144`](../webapp/frontend/src/lib/thresholds.ts#L140-L144)

```ts
const better =
  worst === null ||
  (hit.severity === "critical" && worst.severity === "warning") ||
  (hit.severity === worst.severity &&
    (hit.direction === "above" ? v > worst.peak : v < worst.peak));
```

Für Metriken mit sowohl `warnAbove`/`critAbove` als auch `warnBelow`/`critBelow` (z. B. `TcrChest`,
`TskMean`) wird bei gleicher Schwere (`severity`), aber unterschiedlicher Richtung (`above` vs. `below`)
der rohe Messwert `v` direkt gegen `worst.peak` verglichen – unabhängig davon, dass die beiden Werte aus
verschiedenen Werteskalen kommen (z. B. Körpertemperatur 38 °C "oben" vs. 30 °C "unten"). Da "above"-Werte
bei Körpertemperaturen strukturell größer sind als "below"-Werte, gilt der Vergleich `v > worst.peak` bzw.
`v < worst.peak` beim Richtungswechsel praktisch **immer** – unabhängig vom tatsächlichen Abstand zum
jeweiligen Grenzwert. Ergebnis: Kommt in einem Lauf sowohl eine (leichte) Übertemperatur als auch eine
(deutliche) Untertemperatur derselben Schweregrad-Kategorie vor, "gewinnt" tendenziell einfach die zeitlich
zuletzt gefundene bzw. die mit dem numerisch höheren Rohwert – nicht die mit dem größeren
Grenzwert-Abstand.

**Konkretes Fehlerszenario:** `TskMean` erreicht bei Minute 10 einen Wert von 30.5 °C (`warnBelow=31.0`
unterschritten um 0.5 °C, severity "warning") und bei Minute 200 einen Wert von 35.6 °C (`warnAbove=35.5`
überschritten um nur 0.1 °C, severity ebenfalls "warning"). Die tatsächlich gravierendere Abweichung
(0.5 °C unter der Kälteschwelle) wird von der `evaluateThresholds()`-Ausgabe verdrängt, weil `35.6 > 30.5`
den späteren "above"-Treffer als "besser/schlimmer" einstuft — der Nutzer sieht in der Warnliste nur die
harmlosere Übertemperatur-Meldung.

**Betroffen:** `TcrChest`, `TskMean` (beide mit Ober- und Untergrenzen definiert). `WetMean` ist nicht
betroffen (nur `warnAbove`/`critAbove`).

### 2. `JOS3.Wet`/`WetMean`-Getter ignorieren das Wasseraufnahme-Modell — **bestätigte Inkonsistenz**

**Datei:** [`src/jos3/jos3.py:1285-1312`](../src/jos3/jos3.py#L1285-L1312)

Die (aus dem Original unverändert übernommenen) Properties `JOS3.Wet` und `JOS3.WetMean` berechnen die
Hautfeuchte bei jedem Zugriff **frisch** über `threg.evaporation()` – ohne jede Kenntnis des in Teil A.3.3
beschriebenen Wasserspeicher-/Verzögerungsmodells, das nur lokal innerhalb von `_run()` existiert
(`wet_new`, siehe [`jos3.py:482`](../src/jos3/jos3.py#L482)) und **nicht** in ein persistentes Attribut
zurückgeschrieben wird.

**Konkrete Auswirkung:** Nach einem `model.simulate(...)`-Aufruf mit `Icl_waterabs > 0` liefert
`model.WetMean` (öffentliche API, dokumentierter Getter) einen **anderen Wert** als
`model._history[-1]["WetMean"]` bzw. die von `model.dict_results()`/`model.to_csv()`/dem Web-Backend
exportierten Werte. Dieses Verhalten ist den Entwicklern bekannt – der Kommentar in
[`webapp/backend/tests/test_simulate_mountain_hike_parity.py:33-40`](../webapp/backend/tests/test_simulate_mountain_hike_parity.py#L33-L40)
beschreibt es explizit ("the getters and the recorded history genuinely disagree") und der Test umgeht das
Problem, indem er bewusst `_history` statt der Getter liest. Eine Korrektur der Getter selbst, ein Hinweis
im Docstring von `Wet`/`WetMean`, oder ein Persistieren von `wet_new` in ein Attribut ist nicht erfolgt.

**Risiko:** Jeder direkte Python-Nutzer von `JOS3` (nicht über das Webapp-Backend, sondern z. B. eigene
Skripte nach dem Vorbild von `example/example.py`), der nach der Simulation `model.WetMean`/`model.Wet`
abfragt, statt die Historie/`dict_results()` zu nutzen, erhält bei aktivierter Wasseraufnahme (`Icl_waterabs
> 0`) einen stillschweigend falschen Wert ohne Fehlermeldung.

### 3. `OPPOSITE_FORCE`-Koeffizienten (`a_hi`) vermutlich aus einem Druckfehler des Zhang-Quellpapers übernommen

**Datei:** [`src/jos3/comfort_zhang.py:134-147`](../src/jos3/comfort_zhang.py#L134-L147)

Beim Abgleich von `OPPOSITE_FORCE` mit *Part III*, Table 2 des Zhang-Papers (S. 11) stimmen alle Werte für
die Spalten `delta S_local ≤ −2` (`a_lo`/`b_lo`) und die mittlere Spalte exakt überein. Für die Spalte
`delta S_local ≥ +2` (`a_hi`) fand sich jedoch ein **Widerspruch innerhalb des Papers selbst**:

- Die im Fließtext gedruckte Table 2 (S. 11) nennt z. B. `a_hi(chest) = 0.4`, `a_hi(hand) = 0.1`.
- Auf derselben Seite, direkt unter der Tabelle, ist als Abbildungsbeschriftung zur zugehörigen
  Beispielregression (Figure 4a, "Chest") explizit die Formel
  `S_overall,modified = 0.97 · delta S_chest (delta S_chest ≥ 2) + 1.14` abgedruckt – mit `a_hi = 0.97`,
  nicht `0.4`.
- Für "Hand" (Figure 4c) zeigt die Beschriftung `S_overall,modified = 0.33 · delta S_hand (delta S_hand ≥ 2)`
  – `a_hi = 0.33`, nicht `0.1` wie in Table 2.
- Eine zweite, in das Flussdiagramm (Figure 5, S. 14) eingebettete Kopie derselben Tabelle enthält für
  `chest` ebenfalls `0.97` und für `hand` `0.33` – stimmt also mit den Abbildungsbeschriftungen überein,
  nicht mit der gedruckten Table 2.

Ich habe die Vektorgrafik der Chest- und Hand-Regressionsgraphen zusätzlich visuell inspiziert: die
eingezeichnete rote Regressionsgerade für `delta S_local ≥ 2` verläuft in beiden Fällen sichtbar steiler,
als es `a_hi=0.4` bzw. `a_hi=0.1` ergäbe, und passt zur steileren `0.97`/`0.33`-Geraden.

Für `head`, `back`, `pelvis`, `thigh`, `lower leg` (und mit Einschränkung `foot`, s. u.) zeigt die zweite
Tabellenkopie ebenfalls andere, durchgehend größere `a_hi`-Werte als die gedruckte Table 2 (z. B. `back`:
0.2 vs. 0.75; `pelvis`: 0.6 vs. 0.75) – für diese Körperteile gibt es aber **keine** Beispielgraphen im
Paper, mit denen sich das zusätzlich visuell bestätigen ließe. Für `face`, `breath`, `neck` und `lower arm`
sind beide Tabellenfassungen **identisch** (kein Widerspruch). `foot` weicht in der zweiten Kopie zusätzlich
im Schwellenwert `c` ab (`±1` statt `±2`), was eher für einen Lese-/Layoutfehler an dieser einen Stelle
spricht als für einen echten zweiten Datensatz.

**Einschätzung:** Es handelt sich mit hoher Wahrscheinlichkeit um einen Druck-/Satzfehler in der
Original-Publikation (die gedruckte Table 2 wurde für die `a_hi`-Spalte offenbar nicht mit den tatsächlichen
Regressionsergebnissen aktualisiert). Da genau die drei "dominanten" Körperteile (chest, back, pelvis)
betroffen sind, die im Gesamtempfindungsmodell (Teil A.4.3) besonderes Gewicht haben, ist der praktische
Effekt nicht vernachlässigbar: Erwärmt sich einer dieser Körperteile deutlich (`ΔS_local ≥ +2`) während der
Rest des Körpers kalt ist – z. B. ein heißer, schwitzender Rumpf bei gleichzeitig kalten Extremitäten unter
Anstrengung, ein im Bergwander-Anwendungsfall durchaus realistisches Szenario – **unterschätzt** die
aktuelle Implementierung (Werte aus der gedruckten Table 2) den wärmenden Einfluss dieses Körperteils auf
die Gesamtempfindung um grob den Faktor 2 gegenüber dem, was die tatsächlichen Regressionsdaten des
Papers (Abbildungsbeschriftungen) nahelegen. Dies betrifft ausschließlich den "Erwärmungs"-Ast der
Individualkraft-Berechnung (`_individual_force`, [`comfort_zhang.py:323-330`](../src/jos3/comfort_zhang.py#L323-L330)),
nicht den bereits separat behandelten "Abkühlungs"-Sonderfall für dominante Körperteile (Teil A.4.3, Punkt 3).

Dies ist **kein** Übertragungsfehler der Fork-Autoren – die Werte wurden korrekt aus der (fehlerhaften)
gedruckten Tabelle übernommen – aber ein Punkt, den die Fork-Autoren mit hoher Wahrscheinlichkeit nicht
bemerkt haben, da keiner der mitgelieferten Tests (`test_comfort_zhang.py`) den Erwärmungs-Ast von
`OPPOSITE_FORCE` gegen die Originaldaten prüft.

### 4. Bilanzfrage: in Kleidung gespeichertes Wasser vs. kumulierter Gewichtsverlust (`Wle`)

**Datei:** [`src/jos3/jos3.py:550-557`](../src/jos3/jos3.py#L550-L557)

Der von JOS-3 ausgegebene kumulierbare Gewichtsverlust `Wle` (`wlesk + wleres`) basiert bewusst auf
`e_sweat_orig`, also der *produzierten* Schweißmenge, unabhängig davon, ob diese sofort verdunstet, in der
Kleidung zwischengespeichert wird oder (bei Überschreiten von `max_storage`) abtropft. Das ist eine
nachvollziehbare Modellentscheidung (im Code-Kommentar begründet), hat aber eine Konsequenz, die nirgends im
Repository explizit dokumentiert ist: Solange Wasser im Kleidungsspeicher `_water_storage` sitzt (bis zu
`max_storage`, Default 100 g pro Segment × 17 Segmente = bis zu 1.7 kg im Extremfall), hat es den
Körper/Kleidungs-Gesamtsystem noch **nicht** wirklich verlassen – ein über die Zeit aufsummiertes `Wle`
überschätzt daher den tatsächlichen, am Ende der Simulation "verdunsteten und weg" zu verstehenden
Gewichtsverlust um den zu diesem Zeitpunkt noch in der Kleidung gebundenen Wasseranteil. Das Backend
exponiert `WaterStorage`/`max_storage` zwar separat (sodass technisch versierte Nutzer den gebundenen Anteil
selbst herausrechnen könnten), das Frontend (`thresholds.ts`, `DEHYDRATION_THRESHOLD`) summiert `Wle` jedoch
direkt zu einer Dehydrations-Prozentzahl auf, ohne den in der Kleidung gespeicherten (und damit noch nicht
tatsächlich verdunsteten) Anteil gegenzurechnen. Für die typischen Parametergrenzen (`max_storage` bis 2000 g
laut `jos3_meta.py`) ist der mögliche Fehler nicht vernachlässigbar groß.

### 5. Kleinere, nicht bestätigte Randpunkte (niedrige Priorität)

- **Forward-Euler-Diskretisierung der Wasserfreisetzung** ([`jos3.py:461-466`](../src/jos3/jos3.py#L461-L466)):
  `m_release = S/τ · Δt` ist eine explizite Euler-Näherung des eigentlich exponentiellen Abklingens
  `S·(1−e^{−Δt/τ})`. Für die UI-zulässige Wertespanne (`release_tau` ab 1 s, Default-`dtime` 60 s,
  s. `jos3_meta.py`) kann `Δt/τ` deutlich über 1 liegen, wodurch die lineare Näherung spürbar von der
  exakten Exponentialfunktion abweicht (wird aber durch die Kappung `min(..., S)` zuverlässig vor
  unphysikalischen Werten wie negativem Speicher bewahrt – kein Bilanzfehler, nur eine ungenauere Dynamik
  bei sehr kurzen `release_tau`-Werten relativ zur Simulations-Schrittweite).
- **`_no_opposite_overall`s interne `warm_side`-Neuberechnung** ([`comfort_zhang.py:284`](../src/jos3/comfort_zhang.py#L284)):
  bestimmt die Richtung über `sum(sensations) >= 0` der bereits vorgefilterten "größeren Gruppe", während
  die aufrufende Funktion `overall_sensation()` die Gruppenzugehörigkeit über die *Anzahl* positiver/
  negativer Werte bestimmt hatte. Beide Kriterien stimmen in der weit überwiegenden Zahl der Fälle überein,
  könnten aber in seltenen Randfällen (viele knapp unterschwellige Gegenwerte in der größeren Gruppe)
  auseinanderlaufen. Nicht als konkretes Fehlerszenario reproduziert, daher nur als theoretischer
  Beobachtungspunkt vermerkt.
- **Winddichte Kleidung ohne reduzierte Verdunstung** (bereits in A.3.1 erwähnt): Wird nur `Icl_airperm`
  gesenkt (winddicht), aber `Icl_evap_eff` auf dem Standardwert belassen, zeigt das Modell keinerlei
  Reduktion der Verdunstungskühlung. Dies folgt zwar gängiger Bekleidungsphysiologie-Praxis (getrennte
  Parameter für Wind-/Dampfdurchlässigkeit), könnte aber von Nutzern, die nur `Icl_airperm` bewusst setzen,
  als fehlendes Verhalten missverstanden werden. Keine Rechenfehler, nur ein Hinweis für die
  Nutzerdokumentation.
- **`jos3_orig.py`/`thermoregulation_orig.py`** (A.2): unbenutzte 1:1-Kopien (2029 Zeilen zusammen) im
  `src/jos3/`-Package. Kein Korrektheitsproblem, aber unklar, ob absichtlich als Referenz belassen oder
  versehentlich nicht entfernt – sollte geklärt werden, da sie beim `pip`-Paket mit ausgeliefert werden
  (`setup.py` paketiert das gesamte `jos3`-Verzeichnis).
