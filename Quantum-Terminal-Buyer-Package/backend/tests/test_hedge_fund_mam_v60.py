import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.hedge_fund_mam_service import (
    hedge_fund_service, MAMEngine, PAMMEngine, CopyTradingNetworkEngine
)

@pytest.mark.asyncio
async def test_mam_engine_bulk_order():
    mam = MAMEngine()
    accs = mam.get_all_accounts()
    assert len(accs) == 4

    bulk = mam.bulk_place_order(group_name="High Leverage", symbol="BTCUSDT", side="BUY", total_volume=10.0)
    assert bulk["status"] == "BULK_EXECUTION_SUCCESS"
    assert bulk["account_count"] == 2
    assert len(bulk["executions"]) == 2

@pytest.mark.asyncio
async def test_pamm_engine_dashboard():
    pamm = PAMMEngine()
    dash = pamm.get_pamm_dashboard()
    assert dash["total_aum_usd"] > 2000000.0
    assert dash["performance_fee_pct"] == 20.0
    assert len(dash["investors"]) == 3

@pytest.mark.asyncio
async def test_copy_trading_network_engine():
    copy_engine = CopyTradingNetworkEngine()
    sub = copy_engine.subscribe_provider("sp-quant-alpha", 1.5)
    assert sub["status"] == "ACTIVE"
    assert sub["risk_multiplier"] == 1.5

@pytest.mark.asyncio
async def test_hedge_fund_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Global Monitoring Dashboard API
        d_res = await ac.get("/api/hedge-fund/dashboard")
        assert d_res.status_code == 200
        assert d_res.json()["total_aum"] > 0

        # 2. MAM Accounts List API
        acc_res = await ac.get("/api/hedge-fund/mam/accounts")
        assert acc_res.status_code == 200
        assert len(acc_res.json()["accounts"]) >= 4

        # 3. MAM Bulk Order API
        b_res = await ac.post("/api/hedge-fund/mam/bulk-order", json={
            "group_name": "ALL", "symbol": "BTCUSDT", "side": "BUY", "total_volume": 12.0
        })
        assert b_res.status_code == 200
        assert b_res.json()["status"] == "BULK_EXECUTION_SUCCESS"

        # 4. PAMM Dashboard API
        p_res = await ac.get("/api/hedge-fund/pamm")
        assert p_res.status_code == 200
        assert p_res.json()["performance_fee_pct"] == 20.0

        # 5. Copy Trading Leaderboard API
        l_res = await ac.get("/api/hedge-fund/copy-trading/leaderboard")
        assert l_res.status_code == 200
        assert len(l_res.json()["providers"]) >= 3

        # 6. Subscribe API
        s_res = await ac.post("/api/hedge-fund/copy-trading/subscribe", json={
            "provider_id": "sp-quant-alpha", "risk_multiplier": 1.0
        })
        assert s_res.status_code == 200
        assert s_res.json()["status"] == "ACTIVE"

        # 7. Compliance Audit API
        a_res = await ac.get("/api/hedge-fund/compliance/audit")
        assert a_res.status_code == 200
        assert len(a_res.json()["audit_logs"]) >= 1
