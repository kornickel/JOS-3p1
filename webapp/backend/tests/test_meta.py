# -*- coding: utf-8 -*-
from jos3.matrix import BODY_NAMES


def test_meta_shape(client):
    r = client.get("/api/meta")
    assert r.status_code == 200
    data = r.json()
    assert data["body_names"] == BODY_NAMES
    assert "Icl" in data["input_params"]
    assert "sex" in data["enums"]
    assert {"value": "male", "label": "Männlich"} in data["enums"]["sex"]
    assert "limit_dshiv/dt" in data["options"]
    # WaterStorage is backend-synthesized (see jos3_bridge.run_scenario),
    # not present in jos3.params.ALL_OUT_PARAMS -- must still show up here.
    assert "WaterStorage" in data["output_params"]
