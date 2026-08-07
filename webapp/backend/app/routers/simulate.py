# -*- coding: utf-8 -*-
from fastapi import APIRouter
from jos3.matrix import BODY_NAMES

from .. import jos3_bridge
from ..schemas import ScenarioSpec, SimulateResponse

router = APIRouter(prefix="/api/simulate", tags=["simulate"])


@router.post("", response_model=SimulateResponse)
def simulate(spec: ScenarioSpec):
    _model, results, segment_bounds = jos3_bridge.run_scenario(spec)
    return SimulateResponse(
        results=results,
        segment_bounds=segment_bounds,
        body_names=BODY_NAMES,
    )
