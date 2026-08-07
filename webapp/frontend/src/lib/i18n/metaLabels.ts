// Translations for text that /api/meta supplies as data (input_params.label,
// enums.*.label, options.label, output_params.meaning). Keyed by the stable
// backend key -- NOT by the backend-supplied text -- so this stays correct
// regardless of what the backend currently returns.
//
// input_params/enums/options are this fork's own hand-authored metadata
// (jos3_meta.py) and ship only in German from the backend, so both
// languages are written out here in full. output_params.meaning covers the
// upstream jos3 library's own English parameter descriptions (src/jos3/
// params.py::ALL_OUT_PARAMS) plus this fork's extensions -- English is
// already correct as delivered by the backend, so only German translations
// are provided here; useLocalizedMeta falls back to the backend's own
// (English) text for the "en" language and for any key not listed below.
import type { Language } from "./index";

type LabelMap = Record<string, string>;

export const inputParamLabels: Record<Language, LabelMap> = {
  en: {
    height: "Height",
    weight: "Weight",
    fat: "Body fat percentage",
    age: "Age",
    ci: "Cardiac index (CI)",
    Ta: "Air temperature",
    Tr: "Radiant temperature",
    To: "Operative temperature",
    RH: "Relative humidity",
    Va: "Air velocity",
    Icl: "Clothing insulation",
    Icl_evap_eff: "Vapor permeability of the clothing",
    Icl_emissivity: "Emissivity of the clothing",
    Icl_airperm: "Air permeability of the clothing",
    Icl_waterabs: "Sweat absorption of the clothing",
    release_tau: "Drying time constant",
    max_storage: "Maximum water storage capacity",
    PAR: "Activity ratio (PAR)",
    setpt_cr: "Core temperature setpoint",
    setpt_sk: "Skin temperature setpoint",
  },
  de: {
    height: "Körpergröße",
    weight: "Körpergewicht",
    fat: "Körperfettanteil",
    age: "Alter",
    ci: "Herzindex (Cardiac Index)",
    Ta: "Lufttemperatur",
    Tr: "Strahlungstemperatur",
    To: "Operative Temperatur",
    RH: "Relative Luftfeuchte",
    Va: "Luftgeschwindigkeit",
    Icl: "Bekleidungsisolation",
    Icl_evap_eff: "Dampfdurchlässigkeit der Kleidung",
    Icl_emissivity: "Emissivität der Kleidung",
    Icl_airperm: "Luftdurchlässigkeit der Kleidung",
    Icl_waterabs: "Schweißaufnahme der Kleidung",
    release_tau: "Trocknungszeitkonstante",
    max_storage: "Maximale Wasserspeicherkapazität",
    PAR: "Aktivitätsverhältnis (PAR)",
    setpt_cr: "Sollwert Körperkerntemperatur",
    setpt_sk: "Sollwert Hauttemperatur",
  },
};

export const enumLabels: Record<Language, Record<string, LabelMap>> = {
  en: {
    sex: { male: "Male", female: "Female" },
    bmr_equation: {
      "harris-benedict": "Harris-Benedict",
      "harris-benedict_origin": "Harris-Benedict (Original)",
      japanese: "Japanese (Ganpule et al.)",
      ganpule: "Ganpule et al.",
    },
    bsa_equation: { dubois: "DuBois", takahira: "Takahira", fujimoto: "Fujimoto", kurazumi: "Kurazumi" },
    posture: { standing: "Standing", sitting: "Sitting", lying: "Lying" },
  },
  de: {
    sex: { male: "Männlich", female: "Weiblich" },
    bmr_equation: {
      "harris-benedict": "Harris-Benedict",
      "harris-benedict_origin": "Harris-Benedict (Original)",
      japanese: "Japanisch (Ganpule et al.)",
      ganpule: "Ganpule et al.",
    },
    bsa_equation: { dubois: "DuBois", takahira: "Takahira", fujimoto: "Fujimoto", kurazumi: "Kurazumi" },
    posture: { standing: "Stehend", sitting: "Sitzend", lying: "Liegend" },
  },
};

export const optionLabels: Record<Language, LabelMap> = {
  en: {
    nonshivering_thermogenesis: "Include non-shivering thermogenesis (NST)",
    cold_acclimated: "Cold-acclimated",
    shivering_threshold: "Shivering threshold model",
    "limit_dshiv/dt": "Limit shivering rate of increase (dShiv/dt)",
    bat_positive: "Brown adipose tissue active",
    ava_zero: "Disable AVA blood flow",
    shivering: "Include shivering",
  },
  de: {
    nonshivering_thermogenesis: "Zitterfreie Thermogenese (NST) berücksichtigen",
    cold_acclimated: "Kälteakklimatisiert",
    shivering_threshold: "Zitter-Schwellenwert-Modell",
    "limit_dshiv/dt": "Zitteranstieg begrenzen (dShiv/dt)",
    bat_positive: "Braunes Fettgewebe aktiv",
    ava_zero: "AVA-Durchblutung deaktivieren",
    shivering: "Kältezittern berücksichtigen",
  },
};

// German translations of the 49 "suffix: Body name" output-param meanings
// actually surfaced in the UI (BodyDiagramResult.tsx's quantity dropdown).
// Non-body-name params (Age, BSA totals, CO, Weight, Sex, ...) are never
// displayed, so they're intentionally not translated here.
export const outputParamMeaningsDe: LabelMap = {
  BFcr: "Kerndurchblutung des Körperteils",
  BFfat: "Fettgewebe-Durchblutung des Körperteils",
  BFms: "Muskeldurchblutung des Körperteils",
  BFsk: "Hautdurchblutung des Körperteils",
  BSA: "Körperoberfläche des Körperteils",
  Emax: "Maximaler Verdunstungswärmeverlust an der Haut des Körperteils",
  Esk: "Verdunstungswärmeverlust an der Haut des Körperteils",
  Esweat: "Verdunstungswärmeverlust an der Haut durch Schwitzen des Körperteils",
  Icl: "Bekleidungsisolation des Körperteils",
  LHLsk: "Latenter Wärmeverlust an der Haut des Körperteils",
  Mbasecr: "Kern-Wärmeproduktion durch Grundumsatz des Körperteils",
  Mbasefat: "Fettgewebe-Wärmeproduktion durch Grundumsatz des Körperteils",
  Mbasems: "Muskel-Wärmeproduktion durch Grundumsatz des Körperteils",
  Mbasesk: "Haut-Wärmeproduktion durch Grundumsatz des Körperteils",
  Mnst: "Kern-Wärmeproduktion durch zitterfreie Thermogenese des Körperteils",
  Mshiv: "Kern- oder Muskel-Wärmeproduktion durch Kältezittern des Körperteils",
  Mwork: "Kern- oder Muskel-Wärmeproduktion durch Arbeit des Körperteils",
  Qcr: "Gesamte Kern-Wärmeproduktion des Körperteils",
  Qfat: "Gesamte Fettgewebe-Wärmeproduktion des Körperteils",
  Qms: "Gesamte Muskel-Wärmeproduktion des Körperteils",
  Qsk: "Gesamte Haut-Wärmeproduktion des Körperteils",
  RESlh: "Latenter Wärmeverlust durch Atmung des Körperteils",
  RESsh: "Sensibler Wärmeverlust durch Atmung des Körperteils",
  RH: "Relative Luftfeuchte am Körperteil",
  Ret: "Gesamter Verdunstungswärmewiderstand des Körperteils",
  Rt: "Gesamter Wärmewiderstand des Körperteils",
  SHLsk: "Sensibler Wärmeverlust an der Haut des Körperteils",
  // Mirrors upstream's own swapped wording verbatim (ALL_OUT_PARAMS labels
  // Setptcr's meaning "skin" and Setptsk's "core", the reverse of the key
  // names) -- not fixed here, so English and German stay in parity.
  Setptcr: "Sollwert-Hauttemperatur des Körperteils",
  Setptsk: "Sollwert-Kerntemperatur des Körperteils",
  THLsk: "Wärmeverlust von der Haut des Körperteils",
  Ta: "Lufttemperatur am Körperteil",
  Tar: "Arterielle Temperatur des Körperteils",
  Tcr: "Kerntemperatur des Körperteils",
  Tfat: "Fettgewebetemperatur des Körperteils",
  Tms: "Muskeltemperatur des Körperteils",
  To: "Operative Temperatur des Körperteils",
  Tr: "Mittlere Strahlungstemperatur des Körperteils",
  Tsk: "Hauttemperatur des Körperteils",
  Tsve: "Temperatur der oberflächlichen Vene des Körperteils",
  Tve: "Venentemperatur des Körperteils",
  Va: "Luftgeschwindigkeit am Körperteil",
  Wet: "Lokale Hautfeuchte des Körperteils",
  WaterStorage: "In der Kleidung gespeichertes Wasser des Körperteils",
  Icl_airperm: "Luftdurchlässigkeit der Kleidung des Körperteils",
  Icl_evap_eff: "Dampfdurchlässigkeit der Kleidung des Körperteils",
  Icl_emissivity: "Emissivität der Kleidung des Körperteils",
  Icl_waterabs: "Anteil des von der Kleidung aufgenommenen Schweißes des Körperteils",
  release_tau: "Trocknungszeitkonstante der Kleidung des Körperteils",
  max_storage: "Maximale Wasserspeicherkapazität der Kleidung des Körperteils",
};
