import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.workspace_service import workspace_service
from app.api.workspace import _WORKSPACES_DB

def test_compression_and_checksum_integrity():
    layout = {
        "charts": [{"symbol": "BTCUSDT", "timeframe": "1m"}],
        "dom": {"depth": 50},
        "indicators": ["EMA", "VWAP", "RSI"],
        "hotkeys": {"buy": "B"}
    }

    compressed = workspace_service.compress_payload(layout)
    checksum = workspace_service.compute_checksum(compressed)

    assert len(compressed) > 10
    assert len(checksum) == 64  # SHA-256 hash string

    decompressed = workspace_service.decompress_payload(compressed)
    assert decompressed["dom"]["depth"] == 50
    assert decompressed["charts"][0]["symbol"] == "BTCUSDT"

@pytest.mark.asyncio
async def test_conflict_resolution_strategies():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Strategy: Keep Mine
        res1 = await ac.post("/api/workspace/conflict-resolve", json={
            "workspace_id": "ws-default-scalping",
            "strategy": "keep_mine",
            "local_layout": {"user_override": True}
        })
        assert res1.status_code == 200
        assert res1.json()["layout"]["user_override"] is True

        # 2. Strategy: Merge
        res2 = await ac.post("/api/workspace/conflict-resolve", json={
            "workspace_id": "ws-default-scalping",
            "strategy": "merge",
            "local_layout": {"merged_key": "val"}
        })
        assert res2.status_code == 200
        assert "merged_key" in res2.json()["layout"]
