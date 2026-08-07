# -*- coding: utf-8 -*-
"""Thin adapter between the wire schema (schemas.py) and the real, unmodified
jos3.JOS3 class. This module is intentionally the only place that imports
`jos3` directly -- routers only ever see ScenarioSpec in / JSON-safe dicts
out.
"""
import datetime as dt
import math
import os
import tempfile
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
from jos3 import JOS3
from jos3.matrix import BODY_NAMES

from .schemas import ModelConfig, Segment, ScenarioSpec

BODY_INDEX = {name: i for i, name in enumerate(BODY_NAMES)}


def build_model(config: ModelConfig) -> JOS3:
    model = JOS3(
        height=config.height,
        weight=config.weight,
        fat=config.fat,
        age=config.age,
        sex=config.sex,
        ci=config.ci,
        bmr_equation=config.bmr_equation,
        bsa_equation=config.bsa_equation,
        ex_output=config.ex_output,
    )
    model.model_name = config.model_name
    return model


def _resolve_region_value(model: JOS3, field_name: str, value):
    """Scalars broadcast via the property's own `_to17array` (unchanged JOS3
    behavior). Dicts patch only the named regions on top of the model's
    *current* 17-array for that field, so omitted regions keep whatever
    value they already had (matches the "unset persists" semantics used
    throughout the rest of the scenario)."""
    if isinstance(value, dict):
        base = np.array(getattr(model, field_name), dtype=float).copy()
        for body_name, region_value in value.items():
            base[BODY_INDEX[body_name]] = region_value
        return base
    return value


def apply_segment(model: JOS3, segment: Segment) -> None:
    globals_ = segment.globals.model_dump(exclude_none=True)
    if "PAR" in globals_:
        model.PAR = globals_["PAR"]
    if "posture" in globals_:
        model.posture = globals_["posture"]
    if "options" in globals_:
        # Partial merge -- never replace the dict wholesale, so option keys
        # not mentioned in this segment keep their current value.
        model.options.update(globals_["options"])

    regions = segment.regions.model_dump(exclude_none=True)
    for field_name, value in regions.items():
        setattr(model, field_name, _resolve_region_value(model, field_name, value))


def _safe_scalar(value):
    if isinstance(value, dt.timedelta):
        return value.total_seconds()
    if isinstance(value, np.generic):
        value = value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def to_jsonable(dict_results: Dict[str, list]) -> Dict[str, list]:
    return {key: [_safe_scalar(v) for v in values] for key, values in dict_results.items()}


# This fork's own clothing-extension properties (see README: Icl_waterabs,
# release_tau, max_storage, Icl_airperm, Icl_evap_eff -- the headline
# features of this fork) plus `_water_storage` are all real, live-readable
# per-region state, but NONE of them are ever written into
# `_history`/`dict_results()` (jos3.py's `_run()` detailout dict simply
# never mentions them) -- so to_csv() and dict_results() are silently blind
# to this fork's own extensions. Synthesized here the same way for all of
# them, by snapshotting straight off the model after every single-step
# simulate() call.
EXTRA_TRACKED_PROPERTIES: Dict[str, str] = {
    "WaterStorage": "_water_storage",
    "Icl_airperm": "Icl_airperm",
    "Icl_evap_eff": "Icl_evap_eff",
    "Icl_emissivity": "Icl_emissivity",
    "Icl_waterabs": "Icl_waterabs",
    "release_tau": "release_tau",
    "max_storage": "max_storage",
}


def _snapshot_extra_properties(model: JOS3) -> Dict[str, np.ndarray]:
    return {key: np.array(getattr(model, attr), dtype=float).copy() for key, attr in EXTRA_TRACKED_PROPERTIES.items()}


def run_scenario(spec: ScenarioSpec) -> Tuple[JOS3, Dict[str, list], List[dict]]:
    model = build_model(spec.model)
    segment_bounds: List[dict] = []
    # Index 0 of dict_results() is the pre-simulation steady-state row that
    # JOS3.__init__ always appends before any simulate() call -- segment
    # step ranges start at 1 to line up with that.
    step_cursor = 1
    seconds_cursor = 0.0
    # Step one minute at a time instead of calling simulate(times=N) in one
    # shot, and snapshot the extra properties after every step. This is
    # numerically identical to a single simulate(N) call -- only the
    # granularity of what we *read back* changes.
    extra_series: List[Dict[str, np.ndarray]] = [_snapshot_extra_properties(model)]
    for segment in spec.segments:
        apply_segment(model, segment)
        for _ in range(segment.times):
            model.simulate(times=1, dtime=segment.dtime)
            extra_series.append(_snapshot_extra_properties(model))
        duration_seconds = segment.times * segment.dtime
        segment_bounds.append({
            "id": segment.id,
            "label": segment.label,
            "start_step": step_cursor,
            "end_step": step_cursor + segment.times,
            "start_seconds": seconds_cursor,
            "end_seconds": seconds_cursor + duration_seconds,
        })
        step_cursor += segment.times
        seconds_cursor += duration_seconds

    results = to_jsonable(model.dict_results())
    for key in EXTRA_TRACKED_PROPERTIES:
        for i, body_name in enumerate(BODY_NAMES):
            results[f"{key}{body_name}"] = [float(snap[key][i]) for snap in extra_series]
        results[f"{key}Mean"] = [float(snap[key].mean()) for snap in extra_series]

    _cache_last_run(spec, model)
    return model, results, segment_bounds


def preview_model(config: ModelConfig) -> dict:
    model = build_model(config)
    return {
        "bsa": dict(zip(BODY_NAMES, model.BSA.tolist())),
        "bsa_total": float(model.BSA.sum()),
        "bsa_rate": float(model._bsa_rate),
        "bmr": float(model.BMR),
        "setpt_cr": dict(zip(BODY_NAMES, model.setpt_cr.tolist())),
        "setpt_sk": dict(zip(BODY_NAMES, model.setpt_sk.tolist())),
    }


@dataclass
class _LastRun:
    spec_dict: dict
    model: JOS3


_LAST_RUN: Optional[_LastRun] = None


def _cache_last_run(spec: ScenarioSpec, model: JOS3) -> None:
    global _LAST_RUN
    _LAST_RUN = _LastRun(spec_dict=spec.model_dump(mode="json"), model=model)


def get_model_for_export(spec: ScenarioSpec) -> JOS3:
    """Reuses the model from the most recent /simulate call if the spec is
    byte-for-byte identical (the common case: Run, then Export). Otherwise
    replays the scenario once, purely so CSV export is never more than one
    simulation behind what the user is looking at."""
    spec_dict = spec.model_dump(mode="json")
    if _LAST_RUN is not None and _LAST_RUN.spec_dict == spec_dict:
        return _LAST_RUN.model
    model, _, _ = run_scenario(spec)
    return model


def export_csv(spec: ScenarioSpec) -> Tuple[str, bytes]:
    """Reuses model.to_csv() verbatim (writes to a tempfile, since to_csv
    only knows how to write to disk) so the unit/meaning header rows stay
    byte-for-byte identical to what the library itself produces."""
    model = get_model_for_export(spec)
    filename = f"{model.model_name}.csv"
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = os.path.join(tmpdir, filename)
        model.to_csv(path=tmp_path)
        with open(tmp_path, "rb") as f:
            data = f.read()
    return filename, data
