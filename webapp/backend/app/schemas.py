# -*- coding: utf-8 -*-
"""Pydantic wire schema for the JOS-3 web GUI backend.

This is the JSON contract between frontend and backend. Field names for
per-region and global overrides intentionally mirror the real JOS3 property
names 1:1 (Ta, Icl_airperm, ...) so `jos3_bridge.apply_segment` can dispatch
with a plain `setattr(model, field, value)` and inherit the library's own
validation/clipping instead of re-implementing it here.
"""
from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, model_validator

from jos3.matrix import BODY_NAMES

# Literal type built from the actual BODY_NAMES list, not hand-copied, so the
# two can never drift apart.
BodyName = Literal[tuple(BODY_NAMES)]

# A region-scoped input is either a single number (broadcast to all 17
# segments, matching JOS3's own `_to17array` scalar behavior) or a mapping
# keyed by BodyName for full per-region control.
RegionValue = Union[float, Dict[BodyName, float]]


class ModelConfig(BaseModel):
    height: float = 1.72
    weight: float = 74.43
    fat: float = 15.0
    age: int = 20
    sex: Literal["male", "female"] = "male"
    ci: float = 2.59
    bmr_equation: Literal[
        "harris-benedict", "harris-benedict_origin", "japanese", "ganpule"
    ] = "harris-benedict"
    bsa_equation: Literal["dubois", "takahira", "fujimoto", "kurazumi"] = "dubois"
    ex_output: Union[Literal["all"], List[str], None] = "all"
    model_name: str = "JOS3"


class RegionOverrides(BaseModel):
    Ta: Optional[RegionValue] = None
    Tr: Optional[RegionValue] = None
    To: Optional[RegionValue] = None
    RH: Optional[RegionValue] = None
    Va: Optional[RegionValue] = None
    Icl: Optional[RegionValue] = None
    Icl_evap_eff: Optional[RegionValue] = None
    Icl_emissivity: Optional[RegionValue] = None
    Icl_airperm: Optional[RegionValue] = None
    Icl_waterabs: Optional[RegionValue] = None
    release_tau: Optional[RegionValue] = None
    max_storage: Optional[RegionValue] = None
    setpt_cr: Optional[RegionValue] = None
    setpt_sk: Optional[RegionValue] = None

    @model_validator(mode="after")
    def _to_exclusive_with_ta_tr(self):
        if self.To is not None and (self.Ta is not None or self.Tr is not None):
            raise ValueError(
                "Segment sets both 'To' and 'Ta'/'Tr'. JOS3's To setter "
                "overwrites Ta and Tr to the same value, which is almost "
                "certainly not what was intended together with an explicit "
                "Ta/Tr override in the same segment. Set either To alone, "
                "or Ta/Tr alone."
            )
        return self


class GlobalOverrides(BaseModel):
    PAR: Optional[float] = None
    posture: Optional[Literal["standing", "sitting", "lying"]] = None
    options: Optional[Dict[str, Union[bool, float]]] = None


class ActivityInput(BaseModel):
    """The walking data the frontend's PAR calculator derived `globals.PAR`
    from (see webapp/frontend/src/lib/parModel.ts).

    Documentation only: `jos3_bridge` never reads this block -- `globals.PAR`
    stays the single value that drives the simulation. Persisting the inputs
    just means reopening a scenario shows how a PAR was arrived at, and
    "4.0 -> 4.5 km/h" is one edit rather than a re-derivation.
    """

    speed_kmh: float = Field(ge=0)
    grade_pct: float = Field(ge=-45, le=45)
    load_kg: float = Field(ge=0)
    terrain: Literal["paved", "dirt_road", "trail", "rough_trail", "scree"]


class Segment(BaseModel):
    id: str
    label: str
    dtime: float = 60.0
    times: int = Field(gt=0)
    globals: GlobalOverrides = Field(default_factory=GlobalOverrides)
    regions: RegionOverrides = Field(default_factory=RegionOverrides)
    activity: Optional[ActivityInput] = None


class ScenarioSpec(BaseModel):
    model: ModelConfig = Field(default_factory=ModelConfig)
    segments: List[Segment] = Field(default_factory=list)


class SegmentBound(BaseModel):
    id: str
    label: str
    start_step: int
    end_step: int
    start_seconds: float
    end_seconds: float


class SimulateResponse(BaseModel):
    results: Dict[str, List[Union[float, int, str, None]]]
    segment_bounds: List[SegmentBound]
    body_names: List[str]


class ModelPreviewResponse(BaseModel):
    bsa: Dict[str, float]
    bsa_total: float
    bsa_rate: float
    bmr: float
    setpt_cr: Dict[str, float]
    setpt_sk: Dict[str, float]
