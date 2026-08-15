import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.autonomous_ai_engine_service import (
    autonomous_ai_engine, ExplainableAIEngine, AIStrategyGeneratorEngine, AutonomousExecutionSafetyEngine
)

@pytest.mark.asyncio
async def test_explainable_ai_signal_generation():
    sig = ExplainableAIEngine.generate_explainable_signal("BTCUSDT", 65420.0)
    assert sig["confidence_score_pct"] >= 88.0
    assert "why_generated" in sig
    assert len(sig["supporting_indicators"]) >= 3

@pytest.mark.asyncio
async def test_ai_strategy_generator_and_optimizer():
    gen = AIStrategyGeneratorEngine.generate_strategy_from_prompt("EMA 200 breakout strategy")
    assert gen["backtest_ready"] is True
    assert "def on_tick" in gen["generated_code"]

    opt = AIStrategyGeneratorEngine.optimize_strategy("EMA 200 breakout strategy")
    assert opt["optimized_performance"]["sharpe"] > opt["original_performance"]["sharpe"]

@pytest.mark.asyncio
async def test_autonomous_execution_safety_engine():
    safety = AutonomousExecutionSafetyEngine()
    mode_res = safety.set_automation_mode("FULLY_AUTOMATIC")
    assert mode_res["mode"] == "FULLY_AUTOMATIC"

    kill_res = safety.trigger_emergency_kill_switch()
    assert kill_res["status"] == "EMERGENCY_STOP_ACTIVATED"
    assert safety.mode == "ADVISORY_ONLY"
    assert safety.kill_switch_active is True

@pytest.mark.asyncio
async def test_autonomous_ai_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. AI Dashboard API
        d_res = await ac.get("/api/autonomous-ai/dashboard")
        assert d_res.status_code == 200
        assert "active_mode" in d_res.json()

        # 2. Explainable Signal API
        s_res = await ac.get("/api/autonomous-ai/explainable-signal?symbol=BTCUSDT&price=65420")
        assert s_res.status_code == 200
        assert s_res.json()["confidence_score_pct"] > 0

        # 3. Generate Strategy API
        gen_res = await ac.post("/api/autonomous-ai/generate-strategy", json={"prompt": "London Breakout Strategy"})
        assert gen_res.status_code == 200
        assert "generated_code" in gen_res.json()

        # 4. Mode Switch API
        m_res = await ac.post("/api/autonomous-ai/safety/mode", json={"mode": "SEMI_AUTOMATIC"})
        assert m_res.status_code == 200
        assert m_res.json()["mode"] == "SEMI_AUTOMATIC"

        # 5. Kill Switch API
        ks_res = await ac.post("/api/autonomous-ai/safety/kill-switch")
        assert ks_res.status_code == 200
        assert ks_res.json()["status"] == "EMERGENCY_STOP_ACTIVATED"
