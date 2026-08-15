import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.institutional_scanner_service import (
    institutional_scanner, SMCEngine, FootprintDOMAnalyticsEngine, MultiTimeframeConfluenceEngine
)

@pytest.mark.asyncio
async def test_smc_pattern_scanner():
    smc = SMCEngine.scan_smc_patterns("BTCUSDT", 65000.0)
    assert "structure" in smc
    assert smc["zone"] in ["PREMIUM", "DISCOUNT"]
    assert "smc_signal" in smc

@pytest.mark.asyncio
async def test_footprint_dom_analytics_engine():
    of = FootprintDOMAnalyticsEngine.analyze_orderflow_and_dom("BTCUSDT", 65000.0)
    assert "cumulative_delta" in of
    assert of["imbalance_ratio"] > 0
    assert "dom_liquidity_wall" in of

@pytest.mark.asyncio
async def test_multi_timeframe_confluence_engine():
    mtf = MultiTimeframeConfluenceEngine.compute_confluence("EURUSD")
    assert mtf["confluence_score_pct"] >= 0
    assert "timeframe_alignment" in mtf

@pytest.mark.asyncio
async def test_institutional_scanner_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Opportunities List
        opp_res = await ac.get("/api/institutional-scanner/opportunities?limit=10")
        assert opp_res.status_code == 200
        assert len(opp_res.json()["opportunities"]) > 0

        # 2. Scan Symbol
        scan_res = await ac.get("/api/institutional-scanner/scan?symbol=BTCUSDT&price=65000")
        assert scan_res.status_code == 200
        assert scan_res.json()["score"] > 0

        # 3. SMC Patterns API
        smc_res = await ac.get("/api/institutional-scanner/smc?symbol=BTCUSDT&price=65000")
        assert smc_res.status_code == 200
        assert "structure" in smc_res.json()

        # 4. Orderflow & DOM API
        of_res = await ac.get("/api/institutional-scanner/orderflow?symbol=BTCUSDT&price=65000")
        assert of_res.status_code == 200
        assert "cumulative_delta" in of_res.json()

        # 5. Liquidity Heatmap API
        hm_res = await ac.get("/api/institutional-scanner/heatmap?symbol=BTCUSDT")
        assert hm_res.status_code == 200
        assert len(hm_res.json()["liquidity_pools"]) >= 2

        # 6. Signal History API
        hist_res = await ac.get("/api/institutional-scanner/history")
        assert hist_res.status_code == 200
        assert isinstance(hist_res.json()["signal_history"], list)
