# -*- coding: utf-8 -*-
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..schemas import ScenarioSpec

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

SCENARIOS_DIR = Path(__file__).resolve().parent.parent.parent / "scenarios"
SCENARIOS_DIR.mkdir(parents=True, exist_ok=True)

# Spaces are allowed (e.g. "Mountain Hike Example") -- '.'/'/' stay excluded
# from the character class, so path traversal is still impossible.
_NAME_RE = re.compile(r"^[A-Za-z0-9 _-]{1,100}$")


def _path_for(name: str) -> Path:
    if not _NAME_RE.match(name) or name != name.strip():
        raise HTTPException(
            status_code=400,
            detail="Scenario name may only contain letters, digits, spaces, '_' and '-'.",
        )
    return SCENARIOS_DIR / f"{name}.json"


@router.get("")
def list_scenarios():
    return [
        {"name": p.stem, "saved_at": p.stat().st_mtime}
        for p in sorted(SCENARIOS_DIR.glob("*.json"))
    ]


@router.get("/{name}", response_model=ScenarioSpec, response_model_exclude_none=True)
def load_scenario(name: str):
    path = _path_for(name)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Scenario '{name}' not found.")
    return json.loads(path.read_text())


@router.post("/{name}")
def save_scenario(name: str, spec: ScenarioSpec):
    # exclude_none: unset RegionOverrides/GlobalOverrides fields must be
    # *absent*, not `null` -- the frontend's inheritance logic treats an
    # absent key as "unset, inherit from an earlier segment" but has no
    # reason to expect an explicit `null` (which Pydantic would otherwise
    # write for every Optional field the frontend never touched) and
    # crashes trying to broadcast/patch a null value.
    path = _path_for(name)
    path.write_text(spec.model_dump_json(indent=2, exclude_none=True))
    return {"name": name, "saved": True}


@router.delete("/{name}")
def delete_scenario(name: str):
    path = _path_for(name)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Scenario '{name}' not found.")
    path.unlink()
    return {"name": name, "deleted": True}


def seed_example_scenarios() -> None:
    """Writes the built-in example scenario(s) to disk on startup, if they
    don't already exist, so a fresh checkout always has something realistic
    to look at. Re-runs harmlessly on every `--reload` restart in dev (only
    ever writes when the file is missing)."""
    from ..example_scenarios import EXAMPLE_SCENARIO_NAME, build_mountain_hike_spec

    path = _path_for(EXAMPLE_SCENARIO_NAME)
    if not path.exists():
        spec = ScenarioSpec.model_validate(build_mountain_hike_spec())
        save_scenario(EXAMPLE_SCENARIO_NAME, spec)
