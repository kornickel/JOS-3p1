# -*- coding: utf-8 -*-
def test_preview_returns_derived_stats(client):
    r = client.post("/api/model/preview", json={"height": 1.75, "weight": 72, "sex": "male"})
    assert r.status_code == 200
    data = r.json()
    assert data["bmr"] > 0
    assert data["bsa_total"] > 1.0
    assert set(data["bsa"].keys()) == set(data["setpt_cr"].keys())


def test_preview_rejects_invalid_sex(client):
    r = client.post("/api/model/preview", json={"sex": "unknown"})
    assert r.status_code == 422


def test_preview_rejects_invalid_bsa_equation(client):
    # construction.body_surface_area() has no `else` branch -- an
    # unrecognized equation string causes an UnboundLocalError deep inside
    # JOS3.__init__ if it ever reaches there. Pydantic's Literal must catch
    # this before jos3_bridge.build_model() is called.
    r = client.post("/api/model/preview", json={"bsa_equation": "not-a-real-equation"})
    assert r.status_code == 422


def test_preview_rejects_invalid_bmr_equation(client):
    r = client.post("/api/model/preview", json={"bmr_equation": "not-a-real-equation"})
    assert r.status_code == 422
