import time
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.portfolio_risk_lab_service import (
    portfolio_risk_lab, MonteCarloSimulationEngine, VaREngine, KellyPositionSizingEngine, StressTestingEngine
)

@pytest.mark.asyncio
async def test_monte_carlo_simulation_engine():
    mc = MonteCarloSimulationEngine.run_simulation(initial_equity=25000.0, simulations_count=200, days_horizon=100)
    assert "survival_probability_pct" in mc
    assert mc["median_projected_equity"] > 0
    assert len(mc["sample_equity_curves"]) == 5

@pytest.mark.asyncio
async def test_var_engine_and_cvar():
    var_res = VaREngine.calculate_var(25000.0)
    assert var_res["var_95_daily"] > 0
    assert var_res["cvar_95_expected_shortfall"] > var_res["var_95_daily"]

@pytest.mark.asyncio
async def test_kelly_position_sizing_engine():
    kelly = KellyPositionSizingEngine.calculate_kelly(win_rate_pct=65.0, avg_win_usd=450.0, avg_loss_usd=200.0, account_equity=25000.0)
    assert kelly["half_kelly_recommended_pct"] > 0
    assert kelly["recommended_lot_size"] > 0

@pytest.mark.asyncio
async def test_stress_testing_engine():
    stress = StressTestingEngine.run_stress_test(25000.0)
    assert len(stress) == 4
    assert stress[0]["impact_pct"] == -20.0

@pytest.mark.asyncio
async def test_portfolio_risk_lab_api():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Full Risk Lab Report
        rep_res = await ac.get("/api/portfolio-risk/report?equity=25000")
        assert rep_res.status_code == 200
        assert rep_res.json()["institutional_ratios"]["sharpe_ratio"] > 0

        # 2. Monte Carlo API
        mc_res = await ac.post("/api/portfolio-risk/monte-carlo", json={
            "initial_equity": 25000.0, "simulations_count": 100, "horizon_days": 50
        })
        assert mc_res.status_code == 200
        assert mc_res.json()["survival_probability_pct"] > 0

        # 3. VaR API
        var_res = await ac.get("/api/portfolio-risk/var?portfolio_value=25000")
        assert var_res.status_code == 200
        assert "var_95_daily" in var_res.json()

        # 4. Kelly Position Sizing API
        k_res = await ac.post("/api/portfolio-risk/kelly", json={
            "win_rate_pct": 65.0, "avg_win_usd": 450.0, "avg_loss_usd": 200.0, "account_equity": 25000.0
        })
        assert k_res.status_code == 200
        assert k_res.json()["half_kelly_recommended_pct"] > 0

        # 5. Stress Test API
        st_res = await ac.get("/api/portfolio-risk/stress-test?portfolio_value=25000")
        assert st_res.status_code == 200
        assert len(st_res.json()["scenarios"]) == 4

        # 6. Export PDF Report API
        exp_res = await ac.get("/api/portfolio-risk/export/pdf")
        assert exp_res.status_code == 200
        assert exp_res.json()["status"] == "exported"
