# -*- coding: utf-8 -*-
from fastapi import APIRouter, Response

from .. import jos3_bridge
from ..schemas import ScenarioSpec

router = APIRouter(prefix="/api/export", tags=["export"])


@router.post("/csv")
def export_csv(spec: ScenarioSpec):
    filename, data = jos3_bridge.export_csv(spec)
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
