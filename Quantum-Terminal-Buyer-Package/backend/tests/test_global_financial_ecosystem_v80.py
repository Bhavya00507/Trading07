import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.global_financial_ecosystem_service import (
    global_ecosystem_service, UnifiedNetWorthBankingEngine, DigitalWalletEngine, LendingBorrowingEngine, TaxCenterWealthEngine
)

@pytest.mark.asyncio
async def test_unified_net_worth_telemetry():
    nw = UnifiedNetWorthBankingEngine.get_consolidated_net_worth()
    assert nw["total_net_worth_usd"] > 2000000.0
    assert "trading_investments" in nw["assets_breakdown"]
    assert nw["linked_banks_count"] == 3

@pytest.mark.asyncio
async def test_digital_wallet_engine_transfers():
    wallet = DigitalWalletEngine()
    tx = wallet.process_wallet_transfer("USD", "EUR", 1000.0)
    assert tx["status"] == "SUCCESS"
    assert len(wallet.transaction_history) >= 3

@pytest.mark.asyncio
async def test_portfolio_lending_engine():
    lending = LendingBorrowingEngine()
    bp = lending.calculate_borrowing_power(1584000.0)
    assert bp["max_borrowing_power_usd"] == 792000.0
    assert bp["interest_rate_apr"] == 6.5

@pytest.mark.asyncio
async def test_tax_center_and_ai_wealth_insights():
    tax = TaxCenterWealthEngine.generate_tax_report(2026)
    assert tax["tax_year"] == 2026
    assert tax["short_term_capital_gains_usd"] > 0

    ai_ins = TaxCenterWealthEngine.get_ai_wealth_insights()
    assert ai_ins["wealth_health_score"] >= 90
    assert len(ai_ins["insights"]) >= 3

@pytest.mark.asyncio
async def test_global_financial_ecosystem_api_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Dashboard API
        d_res = await ac.get("/api/ecosystem/dashboard")
        assert d_res.status_code == 200
        assert d_res.json()["net_worth"]["total_net_worth_usd"] > 0

        # 2. Net Worth API
        nw_res = await ac.get("/api/ecosystem/net-worth")
        assert nw_res.status_code == 200
        assert nw_res.json()["linked_banks_count"] == 3

        # 3. Wallet Balances API
        w_res = await ac.get("/api/ecosystem/wallet/balances")
        assert w_res.status_code == 200
        assert "balances" in w_res.json()

        # 4. Wallet Transfer API
        t_res = await ac.post("/api/ecosystem/wallet/transfer", json={"from_curr": "USD", "to_curr": "EUR", "amount": 1000.0})
        assert t_res.status_code == 200
        assert t_res.json()["status"] == "SUCCESS"

        # 5. Lending Borrowing Power API
        l_res = await ac.get("/api/ecosystem/lending/borrowing-power?portfolio_value=1584000")
        assert l_res.status_code == 200
        assert l_res.json()["max_borrowing_power_usd"] == 792000.0

        # 6. Tax Report API
        tax_res = await ac.get("/api/ecosystem/tax/report?year=2026")
        assert tax_res.status_code == 200
        assert tax_res.json()["tax_year"] == 2026

        # 7. AI Wealth Insights API
        ai_res = await ac.get("/api/ecosystem/ai-wealth-insights")
        assert ai_res.status_code == 200
        assert len(ai_res.json()["insights"]) >= 3
