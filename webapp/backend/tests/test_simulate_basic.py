# -*- coding: utf-8 -*-
def _spec(**segment_overrides):
    segment = {
        "id": "seg1",
        "label": "test segment",
        "dtime": 60,
        "times": 5,
        "globals": {"PAR": 1.3, "posture": "sitting"},
        "regions": {"Ta": 25, "RH": 50, "Va": 0.1, "Icl": 0.6},
    }
    segment.update(segment_overrides)
    return {"model": {"height": 1.75, "weight": 72, "sex": "male"}, "segments": [segment]}


def test_simulate_basic_shape(client):
    r = client.post("/api/simulate", json=_spec())
    assert r.status_code == 200
    data = r.json()
    assert data["body_names"][0] == "Head"
    # baseline row (index 0) + 5 simulated steps
    assert len(data["results"]["CycleTime"]) == 6
    assert len(data["segment_bounds"]) == 1
    bound = data["segment_bounds"][0]
    assert bound["start_step"] == 1
    assert bound["end_step"] == 6
    assert bound["end_seconds"] == 300.0


def test_simulate_exposes_per_region_columns(client):
    r = client.post("/api/simulate", json=_spec())
    data = r.json()
    assert "TskHead" in data["results"]
    assert "TcrChest" in data["results"]
    # synthesized clothing-extension series (see jos3_bridge.run_scenario /
    # EXTRA_TRACKED_PROPERTIES) -- none of these are in the upstream
    # dict_results() output, only added by this backend.
    for key in ["WaterStorage", "Icl_airperm", "Icl_evap_eff", "Icl_emissivity", "Icl_waterabs", "release_tau", "max_storage"]:
        assert f"{key}Head" in data["results"], key
        assert f"{key}Mean" in data["results"], key
        assert len(data["results"][f"{key}Mean"]) == 6


def test_simulate_region_dict_overrides_only_named_region(client):
    spec = _spec(regions={"Ta": 5, "Icl": {"LHand": 2.0}})
    r = client.post("/api/simulate", json=spec)
    data = r.json()["results"]
    assert data["IclLHand"][-1] == 2.0
    # unset regions fall back to the current (default, 0) Icl, not the LHand value
    assert data["IclRHand"][-1] == 0.0


def test_simulate_rejects_to_together_with_ta(client):
    spec = _spec(regions={"To": 20, "Ta": 20})
    r = client.post("/api/simulate", json=spec)
    assert r.status_code == 422


def test_simulate_rejects_invalid_sex(client):
    spec = _spec()
    spec["model"]["sex"] = "unknown"
    r = client.post("/api/simulate", json=spec)
    assert r.status_code == 422


def test_simulate_state_persists_across_segments(client):
    spec = _spec()
    spec["segments"].append({
        "id": "seg2",
        "label": "only Ta changes",
        "dtime": 60,
        "times": 3,
        "globals": {},
        "regions": {"Ta": 5},
    })
    r = client.post("/api/simulate", json=spec)
    data = r.json()["results"]
    # Icl was never re-set in seg2 -- it must still be 0.6 from seg1.
    assert data["IclHead"][-1] == 0.6
