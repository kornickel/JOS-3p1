# -*- coding: utf-8 -*-
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..schemas import ScenarioSpec

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

SCENARIOS_DIR = Path(__file__).resolve().parent.parent.parent / "scenarios"
SCENARIOS_DIR.mkdir(parents=True, exist_ok=True)

_NAME_RE = re.compile(r"^[A-Za-z0-9_-]{1,100}$")


def _path_for(name: str) -> Path:
    if not _NAME_RE.match(name):
        raise HTTPException(
            status_code=400,
            detail="Scenario name may only contain letters, digits, '_' and '-'.",
        )
    return SCENARIOS_DIR / f"{name}.json"


@router.get("")
def list_scenarios():
    return [
        {"name": p.stem, "saved_at": p.stat().st_mtime}
        for p in sorted(SCENARIOS_DIR.glob("*.json"))
    ]


@router.get("/{name}", response_model=ScenarioSpec)
def load_scenario(name: str):
    path = _path_for(name)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Scenario '{name}' not found.")
    return json.loads(path.read_text())


@router.post("/{name}")
def save_scenario(name: str, spec: ScenarioSpec):
    path = _path_for(name)
    path.write_text(spec.model_dump_json(indent=2))
    return {"name": name, "saved": True}


@router.delete("/{name}")
def delete_scenario(name: str):
    path = _path_for(name)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Scenario '{name}' not found.")
    path.unlink()
    return {"name": name, "deleted": True}
