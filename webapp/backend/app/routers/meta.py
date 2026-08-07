# -*- coding: utf-8 -*-
from fastapi import APIRouter
from jos3.matrix import BODY_NAMES
from jos3.params import ALL_OUT_PARAMS

from .. import jos3_meta

router = APIRouter(prefix="/api/meta", tags=["meta"])

# jos3.params.ALL_OUT_PARAMS spells the degree-Celsius unit as the ASCII
# "oC" throughout -- normalized here for display, without touching the
# upstream library.
_UNIT_DISPLAY_FIXES = {"oC": "°C"}


def _normalize_units(params: dict) -> dict:
    return {
        name: {**meta, "unit": _UNIT_DISPLAY_FIXES.get(meta["unit"], meta["unit"])}
        for name, meta in params.items()
    }


@router.get("")
def get_meta():
    return {
        "body_names": BODY_NAMES,
        "output_params": _normalize_units({**ALL_OUT_PARAMS, **jos3_meta.EXTRA_OUTPUT_PARAMS}),
        "input_params": jos3_meta.INPUT_PARAMS,
        "enums": jos3_meta.ENUMS,
        "options": jos3_meta.OPTIONS,
    }
