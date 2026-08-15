import pytest
import time
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.replay_service import ReplayService

@pytest.mark.asyncio
async def test_replay_100k_candles_stress():
    """Stress test generating and streaming 100,000 replay candles under 2.5 seconds."""
    t0 = time.time()
    candles = ReplayService.generate_historical_candles(
        symbol="BTCUSDT",
        timeframe="1m",
        count=100000
    )
    elapsed = time.time() - t0

    assert len(candles) == 100000
    assert elapsed < 2.5, f"100,000 candles generation took too long: {elapsed:.2f}s"
    assert "open" in candles[0]
    assert "footprint" in candles[0]
    assert "delta" in candles[0]
    assert "cvd" in candles[0]

@pytest.mark.asyncio
async def test_replay_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Fetch candles
        res = await ac.get("/api/replay/candles?symbol=ETHUSDT&timeframe=5m&count=500")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 500
        assert len(data["candles"]) == 500

        # 2. AI Query
        ai_res = await ac.post("/api/replay/ai-query", json={
            "query": "Why did this trade fail?",
            "trades": [{"pnl": -150.0, "durationSec": 120}],
            "candlesCount": 500
        })
        assert ai_res.status_code == 200
        ai_data = ai_res.json()
        assert "answer" in ai_data

        # 3. Calculate metrics
        metrics_res = await ac.post("/api/replay/metrics", json={
            "trades": [
                {"pnl": 250.0, "durationSec": 180},
                {"pnl": -100.0, "durationSec": 90},
                {"pnl": 350.0, "durationSec": 240}
            ],
            "initial_balance": 10000.0
        })
        assert metrics_res.status_code == 200
        m = metrics_res.json()
        assert m["total_trades"] == 3
        assert m["win_rate"] == 66.67
        assert m["profit_factor"] == 6.0
