# -*- coding: utf-8 -*-
from fastapi import APIRouter

from .. import jos3_bridge
from ..schemas import ModelConfig, ModelPreviewResponse

router = APIRouter(prefix="/api/model", tags=["model"])


@router.post("/preview", response_model=ModelPreviewResponse)
def preview(config: ModelConfig):
    return jos3_bridge.preview_model(config)
