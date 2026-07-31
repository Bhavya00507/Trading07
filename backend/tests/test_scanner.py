import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_get_presets():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/scanner/presets")
    assert res.status_code == 200
    presets = res.json()
    assert isinstance(presets, list)
    assert len(presets) >= 10
    preset_ids = [p["id"] for p in presets]
    assert "day_trading" in preset_ids
    assert "breakout" in preset_ids

@pytest.mark.asyncio
async def test_run_scan():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/scanner/scan", json={
            "assetClass": "ALL",
            "presetId": "day_trading",
            "limit": 50,
            "offset": 0
        })
    assert res.status_code == 200
    data = res.json()
    assert "totalMatched" in data
    assert "universeSize" in data
    assert data["universeSize"] >= 10000
    assert "items" in data

@pytest.mark.asyncio
async def test_validate_builder_conditions():
    valid_payload = [
        {"field": "rsi", "operator": "<=", "value": 30},
        {"field": "price", "operator": ">=", "value": 100}
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/scanner/builder/validate", json=valid_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "valid"

    invalid_payload = [
        {"field": "unknown_field", "operator": "<=", "value": 30}
    ]
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_invalid = await ac.post("/api/scanner/builder/validate", json=invalid_payload)
    assert res_invalid.status_code == 400
