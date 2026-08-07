# -*- coding: utf-8 -*-
"""Hand-authored metadata for fields that `jos3.params.ALL_OUT_PARAMS` does not
cover, because it only documents *output* columns produced by
`dict_results()`. Input parameters (Ta, Icl_airperm, ...) and the enum
choices for constructor/global fields have no metadata dict anywhere in the
jos3 package, so the frontend needs this hand-maintained table to avoid
hardcoding units/labels/enum options itself.
"""

INPUT_PARAMS = {
    "height": {"unit": "m", "label": "Körpergröße", "min": 1.0, "max": 2.2, "step": 0.01},
    "weight": {"unit": "kg", "label": "Körpergewicht", "min": 20.0, "max": 200.0, "step": 0.1},
    "fat": {"unit": "%", "label": "Körperfettanteil", "min": 3.0, "max": 60.0, "step": 0.5},
    "age": {"unit": "years", "label": "Alter", "min": 1, "max": 120, "step": 1},
    "ci": {"unit": "L/min/m2", "label": "Herzindex (Cardiac Index)", "min": 1.0, "max": 5.0, "step": 0.01},
    "Ta": {"unit": "°C", "label": "Lufttemperatur", "min": -30.0, "max": 60.0, "step": 0.1},
    "Tr": {"unit": "°C", "label": "Strahlungstemperatur", "min": -30.0, "max": 60.0, "step": 0.1},
    "To": {"unit": "°C", "label": "Operative Temperatur", "min": -30.0, "max": 60.0, "step": 0.1},
    "RH": {"unit": "%", "label": "Relative Luftfeuchte", "min": 0.0, "max": 100.0, "step": 1.0},
    "Va": {"unit": "m/s", "label": "Luftgeschwindigkeit", "min": 0.0, "max": 20.0, "step": 0.05},
    "Icl": {"unit": "clo", "label": "Bekleidungsisolation", "min": 0.0, "max": 4.0, "step": 0.05},
    "Icl_evap_eff": {"unit": "-", "label": "Dampfdurchlässigkeit der Kleidung", "min": 0.0, "max": 1.0, "step": 0.01},
    "Icl_emissivity": {"unit": "-", "label": "Emissivität der Kleidung", "min": 0.001, "max": 1.0, "step": 0.01},
    "Icl_airperm": {"unit": "-", "label": "Luftdurchlässigkeit der Kleidung", "min": 0.001, "max": 1.0, "step": 0.01},
    "Icl_waterabs": {"unit": "-", "label": "Schweißaufnahme der Kleidung", "min": 0.0, "max": 1.0, "step": 0.01},
    "release_tau": {"unit": "s", "label": "Trocknungszeitkonstante", "min": 1.0, "max": 36000.0, "step": 10.0},
    "max_storage": {"unit": "g", "label": "Maximale Wasserspeicherkapazität", "min": 0.001, "max": 2000.0, "step": 1.0},
    "PAR": {"unit": "-", "label": "Aktivitätsverhältnis (PAR)", "min": 0.8, "max": 8.0, "step": 0.05},
    "setpt_cr": {"unit": "°C", "label": "Sollwert Körperkerntemperatur", "min": 30.0, "max": 42.0, "step": 0.1},
    "setpt_sk": {"unit": "°C", "label": "Sollwert Hauttemperatur", "min": 20.0, "max": 40.0, "step": 0.1},
}

ENUMS = {
    "sex": [
        {"value": "male", "label": "Männlich"},
        {"value": "female", "label": "Weiblich"},
    ],
    "bmr_equation": [
        {"value": "harris-benedict", "label": "Harris-Benedict"},
        {"value": "harris-benedict_origin", "label": "Harris-Benedict (Original)"},
        {"value": "japanese", "label": "Japanisch (Ganpule et al.)"},
        {"value": "ganpule", "label": "Ganpule et al."},
    ],
    "bsa_equation": [
        {"value": "dubois", "label": "DuBois"},
        {"value": "takahira", "label": "Takahira"},
        {"value": "fujimoto", "label": "Fujimoto"},
        {"value": "kurazumi", "label": "Kurazumi"},
    ],
    "posture": [
        {"value": "standing", "label": "Stehend"},
        {"value": "sitting", "label": "Sitzend"},
        {"value": "lying", "label": "Liegend"},
    ],
}

# None of this fork's own clothing-extension properties (or `_water_storage`)
# have an entry in jos3.params.ALL_OUT_PARAMS -- that dict only documents
# columns the *upstream* dict_results() ever produced, and detailout in
# jos3.py's _run() never mentions any of them either. jos3_bridge.run_scenario
# synthesizes a "<Key><BodyName>"/"<Key>Mean" time series for each anyway (see
# EXTRA_TRACKED_PROPERTIES), so the frontend needs matching hand-authored
# metadata to treat them identically to a real output param.
EXTRA_OUTPUT_PARAMS = {
    "WaterStorage": {
        "ex_output": True,
        "meaning": "Water stored in the clothing of the body part",
        "suffix": "Body name",
        "unit": "g",
    },
    "WaterStorageMean": {
        "ex_output": True,
        "meaning": "Mean water stored in the clothing across the whole body",
        "suffix": None,
        "unit": "g",
    },
    "Icl_airperm": {
        "ex_output": True,
        "meaning": "Air permeability of the clothing of the body part",
        "suffix": "Body name",
        "unit": "-",
    },
    "Icl_airpermMean": {
        "ex_output": True,
        "meaning": "Mean air permeability of the clothing across the whole body",
        "suffix": None,
        "unit": "-",
    },
    "Icl_evap_eff": {
        "ex_output": True,
        "meaning": "Vapor permeation efficiency of the clothing of the body part",
        "suffix": "Body name",
        "unit": "-",
    },
    "Icl_evap_effMean": {
        "ex_output": True,
        "meaning": "Mean vapor permeation efficiency of the clothing across the whole body",
        "suffix": None,
        "unit": "-",
    },
    "Icl_emissivity": {
        "ex_output": True,
        "meaning": "Emissivity of the clothing of the body part",
        "suffix": "Body name",
        "unit": "-",
    },
    "Icl_emissivityMean": {
        "ex_output": True,
        "meaning": "Mean emissivity of the clothing across the whole body",
        "suffix": None,
        "unit": "-",
    },
    "Icl_waterabs": {
        "ex_output": True,
        "meaning": "Fraction of sweat absorbed by the clothing of the body part",
        "suffix": "Body name",
        "unit": "-",
    },
    "Icl_waterabsMean": {
        "ex_output": True,
        "meaning": "Mean fraction of sweat absorbed by the clothing across the whole body",
        "suffix": None,
        "unit": "-",
    },
    "release_tau": {
        "ex_output": True,
        "meaning": "Water release time constant of the clothing of the body part",
        "suffix": "Body name",
        "unit": "s",
    },
    "release_tauMean": {
        "ex_output": True,
        "meaning": "Mean water release time constant of the clothing across the whole body",
        "suffix": None,
        "unit": "s",
    },
    "max_storage": {
        "ex_output": True,
        "meaning": "Maximum water storage capacity of the clothing of the body part",
        "suffix": "Body name",
        "unit": "g",
    },
    "max_storageMean": {
        "ex_output": True,
        "meaning": "Mean maximum water storage capacity of the clothing across the whole body",
        "suffix": None,
        "unit": "g",
    },
}

# JOS3.options dict keys, incl. the literal "limit_dshiv/dt" key (note the
# slash -- must be preserved exactly on the wire).
OPTIONS = {
    "nonshivering_thermogenesis": {
        "label": "Zitterfreie Thermogenese (NST) berücksichtigen",
        "default": True,
    },
    "cold_acclimated": {"label": "Kälteakklimatisiert", "default": False},
    "shivering_threshold": {"label": "Zitter-Schwellenwert-Modell", "default": False},
    "limit_dshiv/dt": {"label": "Zitteranstieg begrenzen (dShiv/dt)", "default": False},
    "bat_positive": {"label": "Braunes Fettgewebe aktiv", "default": False},
    "ava_zero": {"label": "AVA-Durchblutung deaktivieren", "default": False},
    "shivering": {"label": "Kältezittern berücksichtigen", "default": False},
}
