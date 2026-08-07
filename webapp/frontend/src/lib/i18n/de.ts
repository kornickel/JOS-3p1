import type { en } from "./en";

// Typed against `typeof en` -- the compiler flags any missing/extra key.
export const de: typeof en = {
  app: {
    loading: "Lade Beispielszenario…",
    title: "JOS-3 Thermophysiologie-Simulator",
    tabPerson: "Person",
    tabSetup: "Setup",
    tabResults: "Ausführen & Ergebnisse",
  },
  languageSwitcher: {
    ariaLabel: "Sprache",
  },
  scenarioBar: {
    defaultName: "mein-szenario",
    namePlaceholder: "Szenario-Name",
    save: "Speichern",
    loadPlaceholder: "Gespeicherte Szenarien laden…",
    delete: "Löschen",
    saveToFile: "Als Datei sichern",
    loadFile: "Datei laden…",
    exportFilename: (name) => `${name.trim() || "jos3-szenario"}.json`,
  },
  results: {
    run: "Simulation ausführen",
    running: "Simuliere…",
    exportCsv: "Als CSV exportieren",
    exportPng: "Als PNG exportieren",
    noSegments: "Lege zuerst Segmente im Tab „Setup“ an.",
    errorPrefix: "Fehler: ",
    exportPngFilename: "jos3-ergebnisse.png",
  },
  common: {
    segmentSuffix: (label) => `— Segment „${label}“`,
  },
  provenance: {
    explicit: "gesetzt in diesem Segment",
    inheritedFromIndex: (index) => `geerbt von Segment ${index}`,
    inheritedFromWithLabel: (index, label) => `geerbt von Segment ${index} „${label}“`,
    default: "geerbt (Modell-Standard)",
    resetTooltip: "Auf vererbten Wert zurücksetzen",
    inheritedSuffix: "(geerbt)",
  },
  bodyDiagramInput: {
    noSegment: "Lege zuerst ein Szenario-Segment an.",
    hintNone: "Region anklicken, um sie zu bearbeiten — mit Umschalt/Strg-Klick mehrere auswählen.",
    hintAll: "Alle Körperteile ausgewählt — Änderungen wirken auf das ganze Segment.",
    hintMultiple: (count) => `${count} Körperteile ausgewählt — Änderungen wirken auf die Auswahl.`,
    hintOne: "Region anklicken, um sie rechts zu bearbeiten.",
    viewFront: "Vorne",
    viewBack: "Hinten",
    selectAll: "Alle Körperteile",
    clearSelection: "Auswahl aufheben",
    chooseRegion: (segmentLabel) =>
      `Wähle links eine Körperregion aus, um ihre Parameter für das Segment „${segmentLabel}“ zu bearbeiten.`,
  },
  bodyDiagramResult: {
    tskDeviationLabel: "Hauttemperatur: Abweichung vom Sollwert",
    noPerRegionData: "Keine Ergebnisgrößen pro Körperregion verfügbar.",
    cardTitle: "Ergebnis am Körper (Heatmap)",
    quantityLabel: "Größe",
    play: "Abspielen",
    pause: "Pause",
    tooltip: (label, value, unit) => `${label}: ${value} ${unit}`,
  },
  timeScrubber: {
    label: "Zeitpunkt",
  },
  bodyView: {
    front: "Ansicht von vorne",
    back: "Ansicht von hinten",
  },
  multiRegionPanel: {
    allBodyParts: "Alle Körperteile",
    selectedCount: (n) => `${n} Körperteile ausgewählt`,
    differentValuesPlaceholder: "unterschiedliche Werte",
    divergesHint: (isAllRegions) =>
      `weicht zwischen Körperregionen ab — Wert eingeben, um für ${isAllRegions ? "alle Regionen" : "die Auswahl"} zu übernehmen`,
    apply: "Übernehmen",
    confirmTitle: "Wert übernehmen?",
    confirmMessage: (params) =>
      `„${params.paramLabel}“ wird für Segment „${params.segmentLabel}“ auf ${
        params.isAllRegions
          ? "allen 17 Körperregionen"
          : `den ${params.regionCount} ausgewählten Körperregionen (${params.regionNames})`
      } auf ${params.value}${params.unit ? ` ${params.unit}` : ""} gesetzt. Die bisherigen, voneinander abweichenden Werte für dieses Feld gehen dabei verloren.`,
  },
  regionPanel: {
    divergesNote: "· weicht zwischen Körperregionen ab",
    applyToAllTooltip: "Diesen Wert auf alle Körperregionen anwenden",
    applyToAllButton: "→ alle",
  },
  segmentEditor: {
    cardTitle: (label) => `Segment bearbeiten: ${label}`,
    labelField: "Bezeichnung",
    duration: "Dauer",
    timeStep: "Zeitschritt (dtime)",
    activityRatio: "Aktivitätsverhältnis (PAR)",
    posture: "Körperhaltung",
    optionsSummary: (count) => `Thermoregulations-Optionen (${count} aktiv)`,
  },
  segmentList: {
    cardTitle: "Segmente (zeitlicher Ablauf)",
    moveUp: "Nach oben verschieben",
    moveDown: "Nach unten verschieben",
    duplicate: "Segment duplizieren",
    delete: "Segment löschen",
    addSegment: "+ Segment hinzufügen",
    totalDuration: (minutes) => `Gesamtdauer: ${minutes} min`,
  },
  bodyBuildForm: {
    cardTitle: "Körperbau",
    height: "Körpergröße",
    weight: "Körpergewicht",
    bodyFat: "Körperfettanteil",
    age: "Alter",
    years: "Jahre",
    sex: "Geschlecht",
    cardiacIndex: "Herzindex (Cardiac Index)",
    bmrFormula: "BMR-Formel",
    bsaFormula: "BSA-Formel",
  },
  derivedStatsPanel: {
    cardTitle: "Abgeleitete Kennwerte (live)",
    calculating: "Berechne…",
    error: "Fehler bei der Berechnung.",
    bsaTotal: "Körperoberfläche (gesamt)",
    bmr: "Grundumsatz (BMR)",
    bsaRate: "BSA-Rate",
  },
  resultsCharts: {
    weatherTemp: "Wetter: Temperatur",
    airTemp: "Lufttemperatur",
    radiantTemp: "Strahlungstemperatur",
    weatherHumidity: "Wetter: Luftfeuchte",
    weatherWind: "Wetter: Windgeschwindigkeit",
    activity: "Aktivität",
    clothingInsulation: "Bekleidungsisolation",
    clothingPhysics: "Bekleidungsphysik",
    airPermeability: "Luftdurchlässigkeit",
    vaporPermeability: "Dampfdurchlässigkeit",
    sweatAbsorption: "Schweißaufnahme",
    bodyTemp: "Körpertemperatur",
    coreTempChest: "Kerntemperatur (Brust)",
    meanSkinTemp: "Mittlere Hauttemperatur",
    skinWettedness: "Hautfeuchte",
    waterStorageTitle: "Wasserspeicher in der Kleidung",
    waterStorage: "Wasserspeicher",
  },
  lineChartPanel: {
    timeAxis: "Zeit [min]",
    tooltipTime: (v) => `t = ${v} min`,
  },
  confirmDialog: {
    apply: "Übernehmen",
    cancel: "Abbrechen",
  },
  scenarioStore: {
    defaultSegmentLabel: "Segment 1",
    segmentN: (n) => `Segment ${n}`,
    copySuffix: (label) => `${label} (Kopie)`,
  },
};
