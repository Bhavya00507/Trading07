import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.ai_copilot_service import ai_copilot_service

@pytest.mark.asyncio
async def test_ai_providers_and_switching():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Get Providers
        res = await ac.get("/api/ai/providers")
        assert res.status_code == 200
        data = res.json()
        assert len(data["providers"]) >= 6

        # 2. Switch Provider to Claude
        switch_res = await ac.post("/api/ai/provider/switch", json={"provider_id": "claude"})
        assert switch_res.status_code == 200
        assert "Claude" in switch_res.json()["active_provider"]

        # 3. Switch back to OpenAI
        await ac.post("/api/ai/provider/switch", json={"provider_id": "openai"})

@pytest.mark.asyncio
async def test_specialized_ai_panels_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Market Analyst
        ma_res = await ac.get("/api/ai/market-analyst?symbol=BTCUSDT&price=65000")
        assert ma_res.status_code == 200
        assert ma_res.json()["bias"] in ["BULLISH", "BEARISH", "NEUTRAL"]

        # 2. Trade Assistant
        trade_res = await ac.post("/api/ai/trade-assistant", json={
            "symbol": "BTCUSDT", "side": "buy", "price": 65000.0, "stop_loss": 64000.0, "take_profit": 67500.0
        })
        assert trade_res.status_code == 200
        assert trade_res.json()["risk_reward_ratio"] > 0

        # 3. Portfolio Assistant
        port_res = await ac.get("/api/ai/portfolio-assistant?positions_count=4&total_equity=25000")
        assert port_res.status_code == 200
        assert "risk_exposure" in port_res.json()

        # 4. Journal Assistant
        journal_res = await ac.get("/api/ai/journal-assistant?entries_count=15")
        assert journal_res.status_code == 200
        assert journal_res.json()["win_rate_pct"] > 0

        # 5. Options Assistant
        opt_res = await ac.get("/api/ai/options-assistant?symbol=BTCUSDT&price=65000")
        assert opt_res.status_code == 200
        assert "iv_rank" in opt_res.json()

@pytest.mark.asyncio
async def test_ai_voice_command_directive():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        voice_res = await ac.post("/api/ai/voice-command", json={"voice_input": "Buy 2 lots BTCUSDT"})
        assert voice_res.status_code == 200
        assert voice_res.json()["action_executed"] == "BUY_MARKET"

@pytest.mark.asyncio
async def test_ai_vision_analysis():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        vis_res = await ac.post("/api/ai/vision", json={
            "image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            "prompt": "Analyze footprint imbalance"
        })
        assert vis_res.status_code == 200
        assert vis_res.json()["confidence_pct"] > 80
