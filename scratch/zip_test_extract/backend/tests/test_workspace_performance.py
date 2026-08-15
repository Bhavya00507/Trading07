import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.workspace_service import workspace_service

@pytest.mark.asyncio
async def test_workspace_performance_save_under_100ms_load_under_200ms():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        layout = {
            "theme": "dark",
            "charts": [{"symbol": "BTCUSDT", "timeframe": "1m"} for _ in range(20)],
            "dom": {"depth": 50, "mbo": True},
            "footprint": {"enabled": True},
            "replay": {"active": False},
            "scanner": {"filters": ["HIGH_IV", "VOLUME"]},
            "options": {"chain_strikes": 50}
        }

        # 1. Benchmark Payload Compression
        t0 = time.time()
        compressed = workspace_service.compress_payload(layout)
        comp_time = (time.time() - t0) * 1000.0
        assert comp_time < 50.0, f"Compression took too long: {comp_time:.2f}ms"

        # 2. Benchmark Save API (< 100ms)
        t0 = time.time()
        res_save = await ac.post("/api/workspace", json={
            "name": "Perf Test WS",
            "layout_data": layout
        })
        save_time = (time.time() - t0) * 1000.0
        assert res_save.status_code == 200
        assert save_time < 100.0, f"Workspace save took too long: {save_time:.2f}ms"

        ws_id = res_save.json()["id"]

        # 3. Benchmark Load API (< 200ms)
        t0 = time.time()
        res_load = await ac.get("/api/workspace")
        load_time = (time.time() - t0) * 1000.0
        assert res_load.status_code == 200
        assert load_time < 200.0, f"Workspace load took too long: {load_time:.2f}ms"
