# Komfort, Grenzwerte, Sättigung und PAR-Herleitung

## Context

Aus der Analyse der vier todo.md-Punkte ergaben sich vier Bausteine, die alle auf demselben
Befund aufsetzen: **JOS-3 rechnet Physiologie, aber bewertet sie nicht.** Es gibt keinen
Komfort-Output, keine Grenzwerte, und die Aktivitätseingabe ist unterspezifiziert.

Verifizierte Befunde, die den Plan tragen:

1. **PAR ≠ MET — das Beispielszenario unterschätzt die Wärmeproduktion um ~Faktor 2.**
   `local_mwork()` ([thermoregulation.py:583](src/jos3/thermoregulation.py#L583)) rechnet
   `(par-1) * bmr`, PAR ist also ein Vielfaches des *Grundumsatzes*. 1 MET ist dagegen
   58.15 W/m². Für das Wanderer-Profil gemessen: BMR = 44.53 W/m² = 83.3 W = **0.766 MET**,
   also **PAR ≈ 1.31 × MET**. Die im Szenario gesetzten PAR 4.0–5.5 („zügiger Aufstieg",
   „steiler Gratanstieg") entsprechen real nur 3.1–4.2 MET; Pandolf liefert für dieselben
   Situationen 6.8–8.4 MET → **PAR 8.8–10.9**. Das PAR-Maximum in
   [jos3_meta.py:28](webapp/backend/app/jos3_meta.py#L28) liegt bei 8.0 und ist damit zu
   niedrig für reales Steilgelände.

2. **`Setptsk` ist bereits die segmentweise neutrale Verteilung, nicht flach 34 °C.**
   `_reset_setpt()` ([jos3.py:283](src/jos3/jos3.py#L283)) wird im Konstruktor aufgerufen und
   setzt die Sollwerte auf den eingeschwungenen Zustand in einer PMV=0-Umgebung. Gemessen:
   33.94–35.83 °C über die 17 Segmente. Das ist **exakt die lokale Neutralreferenz, die Zhang
   braucht** — die Zhang-Implementierung benötigt dafür keine eigene Sollwerttabelle und keine
   Modelländerung.

3. **Die Zhang-Koeffizienten sind vollständig beschaffbar.** Aus den Open-Access-Preprints
   der UC Berkeley, per `pypdf` sauber extrahierbar (WebFetch legt die PDF lokal ab):
   - Teil I ([escholarship 3sw061xh](https://escholarship.org/uc/item/3sw061xh)): Tab. 1
     statische Koeffizienten C1/K1 je Körperteil, Tab. 2 dynamische C21/C22/C3, Gl. (5).
   - Teil II ([escholarship 1pz9j3j2](https://escholarship.org/uc/item/1pz9j3j2)): Tab. 1
     lokaler Komfort C31/C32/C6/C71/C72/C8/n, Gl. (9).
   - Teil III ([escholarship 2tm289vb](https://escholarship.org/uc/item/2tm289vb)):
     Aggregationsregeln (Dominanz-Logik, bigger/smaller group, „combined force", Gl. 6/7).

4. **Alle benötigten Rohgrößen liegen bereits vor.** `Wle` [g/s] steht im *default* `dictout`
   ([jos3.py:644](src/jos3/jos3.py#L644)), `Setptsk`/`Setptcr` im `detailout` (die App fährt
   ohnehin `ex_output: "all"`), `WaterStorage`/`max_storage` werden von
   `jos3_bridge.EXTRA_TRACKED_PROPERTIES` je Zeitschritt synthetisiert.

**Klärung zu „Sättigungsindikator" (Rückfrage des Nutzers):** gemeint ist das **Wasser in der
Kleidung**, `WaterStorage / max_storage` — „wie voll ist der Feuchtespeicher des Gewebes".
Das ist etwas anderes als die **Dehydratation** (kumuliertes `Wle` als % Körpermasse). Beides
kommt in die UI, aber getrennt und klar benannt.

Abgestimmte Architekturentscheidungen: Zhang lebt in `src/jos3/`, voller Umfang Teil I+II+III,
die PAR-Rechner-Eingaben werden im Szenario mitgespeichert.

---

## Wo Modellanpassungen nötig sind — und wo ausdrücklich nicht

**Der Thermoregulations-Kern wird nicht angefasst.** Keine Änderung an `_run()`,
`evaporation()`, `shivering()`, `skin_bloodflow()` oder der Wasserspeicher-Logik. Alle vier
Bausteine sind entweder Post-Processing über die Ergebnis-Zeitreihe oder reine Eingabehilfen.

| Änderung | Art | Nötig? |
|---|---|---|
| `src/jos3/comfort_zhang.py` (neu) | **Additiv** — neues Modul neben `comfmod.py`, keine bestehende Funktion verändert | erforderlich für #4 |
| `jos3_meta.py`: PAR-Max 8.0 → 12.0 | UI-Metadaten, kein Modelleingriff (das Modell selbst kennt keine PAR-Grenze) | erforderlich für #1 |
| `schemas.py`: optionaler `activity`-Block im Segment | Wire-Schema, additiv; Backend ignoriert ihn bei der Simulation | erforderlich für #1 |
| Sollwerte für Zhang | **entfällt** — `Setptsk` liefert das bereits (Befund 2) | nicht nötig |
| `Wle`, `WaterStorage`, `max_storage` exponieren | **entfällt** — schon in den Ergebnissen | nicht nötig |

**Sinnvoll, aber bewusst außerhalb dieses Plans** (jeweils mit Begründung im Code als Kommentar
zu vermerken, damit es nicht verloren geht):

- **`local_mwork()`-Verteilung.** Die Arbeitswärme wird fest mit 61 % Beine / 30 % Rumpf /
  9 % Arme verteilt. Für Gehen passt das gut, **Rucksacklast auf den Schultern ist darin nicht
  repräsentiert**. Eine Anpassung würde alle bestehenden Ergebnisse verschieben und den
  Paritätstest neu kalibrieren — separater Schritt, nicht hier.
- **`MET`-Property auf `JOS3`.** Ein Getter `MET = PAR * BMR / 58.15` würde die PAR/MET-
  Verwechslung dauerhaft entschärfen. Kleine, risikoarme Ergänzung; optional mitnehmen.
- **Zhangs Gültigkeitsbereich.** Das Modell ist an *sitzenden* Probanden in Klimakammern
  kalibriert. Auf eine Bergtour bei PAR 9 angewandt ist es eine Extrapolation — schwächer als
  bei PMV (Zhang deckt Transienz und Inhomogenität ab, genau die dominanten Effekte hier),
  aber real. Teil II merkt immerhin an, dass die Probanden bei den wärmsten Tests moderat
  schwitzten, die Koeffizienten also auch feuchte Haut teilweise abdecken. **Muss in der UI
  als Hinweis stehen**, ist aber keine Code-Änderung.

---

## Teil 1 — PAR-Rechner aus Gehdaten

**Neu: `webapp/frontend/src/lib/parModel.ts`.** Reine Algebra, im Frontend, damit die Eingabe
ohne Round-Trip live reagiert; der BMR kommt aus dem bereits vorhandenen
`useModelPreview()` ([api.ts:30](webapp/frontend/src/lib/api.ts#L30)), das die App im
`DerivedStatsPanel` ohnehin schon abfragt.

- **Bergauf und eben: Pandolf** (Pandolf/Givoni/Goldman 1977) —
  `M = 1.5·W + 2.0·(W+L)·(L/W)² + η·(W+L)·(1.5·v² + 0.35·v·G)`, berücksichtigt Traglast `L`
  und Geländefaktor `η` (Asphalt 1.0, Feldweg 1.2, leichtes Gebüsch 1.5, Geröll/Sand ~2.1).
  Liefert Watt direkt → `PAR = M / (BMR_W/m² · BSA)`.
- **Bergab bricht Pandolf zusammen** (verifiziert: −15 % Steigung ergibt −295 W). Erster
  Implementierungsschritt ist daher, die **Santee-Korrektur** oder **Minettis Polynom**
  (validiert −45 %…+45 %) genauso zu beschaffen wie die Zhang-Koeffizienten: Paper holen,
  Werte extrahieren, **nicht aus dem Gedächtnis rekonstruieren**. Falls nicht beschaffbar:
  Rechner auf Steigung ≥ 0 begrenzen und für Abstiege manuelle PAR-Eingabe lassen — lieber
  eine Lücke als eine falsche Formel.

**Schema (additiv):** `activity`-Block in `Segment` —
[schemas.py](webapp/backend/app/schemas.py) (Pydantic, `Optional`) und spiegelbildlich
[jos3-types.ts](webapp/frontend/src/lib/jos3-types.ts). Felder: `speed_kmh`, `grade_pct`,
`load_kg`, `terrain`. **`globals.PAR` bleibt die für die Simulation maßgebliche Größe**;
`activity` ist Dokumentation der Herleitung. Kein Auto-Sync (sonst überschreibt der Rechner
Handkorrekturen), stattdessen ein „↻ neu berechnen"-Button und ein dezenter Hinweis, wenn PAR
und `activity` auseinanderlaufen.

**UI:** in [SegmentEditor.tsx](webapp/frontend/src/components/timeline/SegmentEditor.tsx) unter
dem PAR-Slider ein aufklappbares `<details>` — dasselbe Muster wie die bestehenden
„Thermoregulations-Optionen". Darin die vier Felder plus Live-Vorschau
„→ PAR 8.8 (6.8 MET, 736 W)" und Übernehmen-Button.

**Metadaten:** PAR-Max in `jos3_meta.py` von 8.0 auf 12.0, plus deutsche/englische Labels für
die neuen Felder in [metaLabels.ts](webapp/frontend/src/lib/i18n/metaLabels.ts) bzw.
`en.ts`/`de.ts`.

**Beispielszenario korrigieren** — separater, reviewbarer Commit: die PAR-Werte in
[example_scenarios.py](webapp/backend/app/example_scenarios.py) auf die aus den Gehdaten
hergeleiteten Werte anheben und `activity` mitgeben. ⚠️ **Risiko:** das verdoppelt näherungsweise
die Wärmeproduktion in den Aufstiegsphasen und kann die harten Zusicherungen in
[test_simulate_mountain_hike_parity.py](webapp/backend/tests/test_simulate_mountain_hike_parity.py)
(`36.0 ≤ Tcr ≤ 39.0`) sowie die Plausibilitätsprüfungen in
[test_mountain_hike.py](test_mountain_hike.py) sprengen. Falls das passiert: erst prüfen, ob das
neue Ergebnis physiologisch *richtig* ist (eine so anstrengende Tour *soll* thermisch kritisch
werden), und dann die Schwellen begründet nachziehen — nicht die PAR-Werte zurückdrehen.

---

## Teil 2 — Grenzwert-Overlay

**Neu: `webapp/frontend/src/lib/thresholds.ts`** — dokumentierte Konstanten, je Größe ein
Komfortband, eine Warn- und eine Kritisch-Schwelle, jeweils mit Quellenkommentar. In v1
fest verdrahtet, nicht nutzerkonfigurierbar (hält den Umfang beherrschbar). Abgedeckt:
`TcrChest`, `TskMean`, lokale `Tsk` (Extremitäten separat, engere Grenzen), `WetMean`,
`Mshiv`, Schweißrate und kumulierte Dehydratation.

**Charts:** [LineChartPanel.tsx](webapp/frontend/src/components/results/LineChartPanel.tsx)
bekommt eine optionale `thresholds`-Prop und rendert `ReferenceArea`-Bänder in
`--status-warning` / `--status-critical` (recharts ist bereits im Einsatz, `ReferenceLine` wird
dort schon importiert). Farben ausschließlich aus [tokens.css](webapp/frontend/src/styles/tokens.css).

**Belastungs-Übersicht (der eigentlich nützliche Teil):** eine neue `Card` über den Charts, die
die Zeitreihe gegen `thresholds.ts` prüft und *Verletzungen* auflistet — welche Größe, welches
Segment (über `segment_bounds`), ab welcher Minute, Spitzenwert. Niemand sucht Überschreitungen
in elf Diagrammen zusammen. Sortiert nach Schweregrad, mit Klick auf den Zeitpunkt → Scrubber
springt dorthin.

Drei inhaltliche Punkte, die das Overlay abbilden muss:
- **`w → 1.0` ist die schärfste Grenze**, nicht die Kerntemperatur: bei gesättigter Haut ist die
  Verdunstungsreserve erschöpft und die Wärmebilanz *kann* nicht mehr geschlossen werden. Im
  Beispielszenario wird das erreicht.
- **In Kälte binden die Extremitäten**, nicht der Mittelwert — die Prüfung läuft deshalb pro
  Segment, nicht nur auf `TskMean`.
- **`Mshiv` ist Nachlauf-, `Tsk`-Drift Vorlaufindikator** — beide zeigen, aber unterschiedlich
  gewichten.

---

## Teil 3 — Sättigungs- und Dehydratationsindikator

Zwei getrennte Größen, beide rein im Frontend aus vorhandenen Ergebnissen abgeleitet
(keine Backend-Änderung):

- **Kleidungssättigung** `WaterStorage<Segment> / max_storage<Segment>` ∈ [0,1]. Als
  abgeleiteter Eintrag im „Größe"-Dropdown der Heatmap — genau wie das bestehende
  `TSK_DEVIATION` in
  [BodyDiagramResult.tsx:13](webapp/frontend/src/components/body-diagram/BodyDiagramResult.tsx#L13)
  gemacht ist — plus eine 100 %-Referenzlinie im bestehenden Wasserspeicher-Chart. Fachlich der
  interessanteste Wert dieses Forks: ein gesättigtes Kleidungsstück liefert keine Kühlung mehr
  und wird an der nächsten Rast zur Kältelast; das Modell kann das *vorhersagen*.
- **Dehydratation**: kumuliertes `∫Wle dt`, dargestellt als % der Körpermasse
  (`model.weight`), mit Warnbändern bei 2 % / 4 %. Neues Panel in
  [ResultsCharts.tsx](webapp/frontend/src/components/results/ResultsCharts.tsx).

---

## Teil 4 — Zhang-Komfortmodell

**Neu: `src/jos3/comfort_zhang.py`** (neben `comfmod.py`, kein Eingriff in bestehende Module):

- `ZHANG_COEFFS` — die drei Koeffiziententabellen, **wörtlich aus den Preprints übernommen**,
  mit Quellenangabe je Tabelle im Docstring.
- `local_sensation(tsk, tsk_set, tsk_mean, tsk_mean_set, dtsk_dt, dtcr_dt)` → Gl. (5),
  Logistik auf ±4 plus dynamischer Term.
- `local_comfort(local_sensation, overall_sensation)` → Gl. (9), Sattelform.
- `overall_sensation(local_sensations)` → Teil III: Dominanz-Logik (Brust/Rücken/Becken),
  Gruppenbildung, „combined force".
- `overall_comfort(local_comforts, ...)` → Teil III.

**Segment-Mapping** (Zhang hat 19 Körperteile, JOS-3 hat 17 — die Abbildung ist vollständig
und eindeutig): Shoulder→Upper arm, Arm→Lower arm, Leg→Lower leg, links/rechts teilen sich
dieselben Koeffizienten; Zhangs „Face" und „Breath" entfallen mangels JOS-3-Pendant.

**Zwei Fallstricke:** Die Ableitungen `dTsk/dt` und `dTcr/dt` gehen in **K/s** ein (bei
C21=543 für den Kopf sonst absurde Werte) — Einheitenkonvention beim Übertragen gegen das Paper
prüfen. Und bei `dtime = 60 s` ist die Ableitung grob aufgelöst; der dynamische Term reagiert
entsprechend träge, was bei Kleidungswechseln zwischen Segmenten sichtbar wird.

**Anbindung:** [jos3_bridge.py](webapp/backend/app/jos3_bridge.py) ruft das Modul in
`run_scenario()` **nach** der Simulationsschleife als Post-Processing über die fertige
Zeitreihe auf (die Ableitungen brauchen Nachbarschritte, das passt nicht in den bestehenden
Per-Step-Snapshot-Mechanismus) und hängt die Spalten `SensationLocal<Segment>`,
`ComfortLocal<Segment>`, `SensationOverall`, `ComfortOverall` an `results` an. Metadaten
(Einheit „-", Bedeutung, `suffix: "Body name"`) analog zu
`jos3_meta.EXTRA_OUTPUT_PARAMS`, damit sie automatisch im Heatmap-Dropdown auftauchen.

### UI/UX — sparsam eingebunden

Kein neuer Tab, keine neue View. Drei Berührungspunkte:

1. **Heatmap, null neuer Code.** `SensationLocal` und `ComfortLocal` erscheinen automatisch im
   „Größe"-Dropdown, sobald sie in `output_params` mit `suffix: "Body name"` stehen. Beide sind
   auf −4…+4 skaliert und müssen `diverging: true` bekommen — die divergierende Blau-Rot-Rampe
   existiert bereits für `TSK_DEVIATION`. Damit zeigt die bestehende Körpergrafik pro Segment,
   *wo* es unangenehm ist, und der Zeit-Scrubber zeigt *wann*.
2. **Ein neues Chart-Panel** „Thermischer Komfort" mit `SensationOverall` und `ComfortOverall`
   als zwei Linien auf gemeinsamer −4…+4-Achse, im bestehenden Raster von `ResultsCharts`.
3. **Eine schmale Statusleiste** über der Heatmap: aktueller Gesamtkomfort und -empfindung an
   der Scrubber-Position, plus die Schlechtestwerte der Tour. Dort auch der Gültigkeitshinweis
   („an sitzenden Probanden kalibriert, hier extrapoliert") als dezenter Fußnotentext.

---

## Reihenfolge

Vier getrennt commitbare Phasen, jede für sich lauffähig:

1. **PAR-Rechner** (Teil 1) ohne die Szenario-Korrektur — größter Effekt, kleinster Aufwand,
   und ohne korrekte Lastannahmen sind alle Komfortaussagen auf Sand gebaut.
2. **Szenario-Korrektur** + Test-Rebaselining — bewusst separat, weil es Referenzwerte verschiebt.
3. **Grenzwert-Overlay + Sättigung/Dehydratation** (Teile 2 & 3) — rein additiv im Frontend.
4. **Zhang** (Teil 4) — der aufwendigste Block, profitiert davon, dass 1–3 dann schon stehen.

## Verifikation

- `cd webapp/frontend && npx tsc -b && npm run lint`
- `cd webapp/backend && pytest` — der Paritätstest muss grün bleiben (Phase 2 ggf. mit
  begründet angepassten Schwellen).
- **Neue pytest-Tests für `comfort_zhang.py`**: Neutralfall (alle Tsk auf Setptsk, keine
  Ableitungen) muss Empfinden ≈ 0 und Komfort nahe dem Maximum liefern; monotone Abkühlung muss
  monoton fallendes Empfinden liefern; der dynamische Term muss bei Sprüngen überschwingen.
  Das ist der einzige Baustein mit echter Rechenlogik und gehört abgesichert.
- **Numerische Gegenprobe PAR-Rechner**: die im Context dokumentierten Referenzwerte
  (4 km/h/12 %/8 kg → 736 W → PAR 8.8) als Testfall festhalten.
- **Visuell** wie in den Vorsessions: Backend + Frontend starten, per Playwright das
  Beispielszenario simulieren, Screenshots von Heatmap (neue Größen, divergierende Skala),
  Charts (Grenzwertbänder) und Belastungs-Übersicht; Light- und Dark-Mode sowie beide Sprachen
  gegenprüfen.
