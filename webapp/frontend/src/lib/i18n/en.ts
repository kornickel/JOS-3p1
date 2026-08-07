// English dictionary -- the canonical shape. de.ts is typed against
// `typeof en` so the compiler flags any missing/extra key in either file.
export const en = {
  app: {
    loading: "Loading example scenario…",
    title: "JOS-3 Thermophysiology Simulator",
    tabPerson: "Person",
    tabSetup: "Setup",
    tabResults: "Run & Results",
  },
  languageSwitcher: {
    ariaLabel: "Language",
  },
  scenarioBar: {
    defaultName: "my-scenario",
    namePlaceholder: "Scenario name",
    save: "Save",
    loadPlaceholder: "Load saved scenario…",
    delete: "Delete",
    saveToFile: "Save as file",
    loadFile: "Load file…",
    exportFilename: (name: string) => `${name.trim() || "jos3-scenario"}.json`,
  },
  results: {
    run: "Run simulation",
    running: "Simulating…",
    exportCsv: "Export as CSV",
    exportPng: "Export as PNG",
    noSegments: "Create segments first in the Setup tab.",
    errorPrefix: "Error: ",
    exportPngFilename: "jos3-results.png",
  },
  common: {
    segmentSuffix: (label: string) => `— Segment "${label}"`,
  },
  provenance: {
    explicit: "set in this segment",
    inheritedFromIndex: (index: number) => `inherited from segment ${index}`,
    inheritedFromWithLabel: (index: number, label: string) => `inherited from segment ${index} "${label}"`,
    default: "inherited (model default)",
    resetTooltip: "Reset to inherited value",
    inheritedSuffix: "(inherited)",
  },
  bodyDiagramInput: {
    noSegment: "Create a scenario segment first.",
    hintNone: "Click a region to edit it — shift/ctrl-click to select multiple.",
    hintAll: "All body parts selected — changes apply to the whole segment.",
    hintMultiple: (count: number) => `${count} body parts selected — changes apply to the selection.`,
    hintOne: "Click a region to edit it on the right.",
    viewFront: "Front",
    viewBack: "Back",
    selectAll: "All body parts",
    clearSelection: "Clear selection",
    chooseRegion: (segmentLabel: string) =>
      `Select a body region on the left to edit its parameters for segment "${segmentLabel}".`,
  },
  bodyDiagramResult: {
    tskDeviationLabel: "Skin temperature: deviation from setpoint",
    noPerRegionData: "No per-region result values available.",
    cardTitle: "Result on the body (heatmap)",
    quantityLabel: "Quantity",
    play: "Play",
    pause: "Pause",
    tooltip: (label: string, value: string, unit: string) => `${label}: ${value} ${unit}`,
  },
  timeScrubber: {
    label: "Point in time",
  },
  bodyView: {
    front: "Front view",
    back: "Back view",
  },
  multiRegionPanel: {
    allBodyParts: "All body parts",
    selectedCount: (n: number) => `${n} body parts selected`,
    differentValuesPlaceholder: "different values",
    divergesHint: (isAllRegions: boolean) =>
      `differs between body regions — enter a value to apply to ${isAllRegions ? "all regions" : "the selection"}`,
    apply: "Apply",
    confirmTitle: "Apply value?",
    confirmMessage: (params: {
      paramLabel: string;
      segmentLabel: string;
      isAllRegions: boolean;
      regionCount: number;
      regionNames: string;
      value: number;
      unit: string;
    }) =>
      `"${params.paramLabel}" will be set to ${params.value}${params.unit ? ` ${params.unit}` : ""} for segment "${params.segmentLabel}" on ${
        params.isAllRegions
          ? "all 17 body regions"
          : `the ${params.regionCount} selected body regions (${params.regionNames})`
      }. The previous, differing values for this field will be lost.`,
  },
  regionPanel: {
    divergesNote: "· differs between body regions",
    applyToAllTooltip: "Apply this value to all body regions",
    applyToAllButton: "→ all",
  },
  segmentEditor: {
    cardTitle: (label: string) => `Edit segment: ${label}`,
    labelField: "Label",
    duration: "Duration",
    timeStep: "Time step (dtime)",
    activityRatio: "Activity ratio (PAR)",
    posture: "Posture",
    optionsSummary: (count: number) => `Thermoregulation options (${count} active)`,
  },
  segmentList: {
    cardTitle: "Segments (timeline)",
    moveUp: "Move up",
    moveDown: "Move down",
    duplicate: "Duplicate segment",
    delete: "Delete segment",
    addSegment: "+ Add segment",
    totalDuration: (minutes: string) => `Total duration: ${minutes} min`,
  },
  bodyBuildForm: {
    cardTitle: "Body build",
    height: "Height",
    weight: "Weight",
    bodyFat: "Body fat percentage",
    age: "Age",
    years: "years",
    sex: "Sex",
    cardiacIndex: "Cardiac index (CI)",
    bmrFormula: "BMR formula",
    bsaFormula: "BSA formula",
  },
  derivedStatsPanel: {
    cardTitle: "Derived metrics (live)",
    calculating: "Calculating…",
    error: "Error during calculation.",
    bsaTotal: "Body surface area (total)",
    bmr: "Basal metabolic rate (BMR)",
    bsaRate: "BSA rate",
  },
  resultsCharts: {
    weatherTemp: "Weather: Temperature",
    airTemp: "Air temperature",
    radiantTemp: "Radiant temperature",
    weatherHumidity: "Weather: Humidity",
    weatherWind: "Weather: Wind speed",
    activity: "Activity",
    clothingInsulation: "Clothing insulation",
    clothingPhysics: "Clothing physics",
    airPermeability: "Air permeability",
    vaporPermeability: "Vapor permeability",
    sweatAbsorption: "Sweat absorption",
    bodyTemp: "Body temperature",
    coreTempChest: "Core temperature (chest)",
    meanSkinTemp: "Mean skin temperature",
    skinWettedness: "Skin wettedness",
    waterStorageTitle: "Water storage in clothing",
    waterStorage: "Water storage",
  },
  lineChartPanel: {
    timeAxis: "Time [min]",
    tooltipTime: (v: string | number) => `t = ${v} min`,
  },
  confirmDialog: {
    apply: "Apply",
    cancel: "Cancel",
  },
  scenarioStore: {
    defaultSegmentLabel: "Segment 1",
    segmentN: (n: number) => `Segment ${n}`,
    copySuffix: (label: string) => `${label} (Copy)`,
  },
};
