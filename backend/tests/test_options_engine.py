import pytest
import time
from app.services.options_service import OptionsDeskService, OptionsGreeksEngine

def test_black_scholes_greeks_calculation():
    # Call Option Test
    call = OptionsGreeksEngine.calculate_bs_greeks(
        S=100.0, K=100.0, T=30/365.0, r=0.05, sigma=0.25, option_type="call"
    )
    assert call["price"] > 0
    assert 0.45 <= call["delta"] <= 0.65
    assert call["gamma"] > 0
    assert call["theta"] < 0
    assert call["vega"] > 0
    assert "charm" in call
    assert "vomma" in call
    assert "vanna" in call

    # Put Option Test
    put = OptionsGreeksEngine.calculate_bs_greeks(
        S=100.0, K=100.0, T=30/365.0, r=0.05, sigma=0.25, option_type="put"
    )
    assert put["price"] > 0
    assert -0.60 <= put["delta"] <= -0.40

def test_generate_options_chain():
    chain_data = OptionsDeskService.generate_options_chain(
        symbol="BTCUSDT", underlying_price=65000.0, expiry_days=30, strike_count=20
    )
    assert chain_data["symbol"] == "BTCUSDT"
    assert len(chain_data["chain"]) > 10
    assert "expirations" in chain_data

def test_strategy_payoff_calculator():
    legs = [
        {"strike": 100.0, "type": "call", "action": "buy", "quantity": 1, "premium": 5.0},
        {"strike": 110.0, "type": "call", "action": "sell", "quantity": 1, "premium": 2.0}
    ]
    res = OptionsDeskService.calculate_strategy_payoff(legs, underlying_price=100.0)
    assert "payoff_curve" in res
    assert res["max_profit"] == 700.0  # (10 - (5 - 2)) * 100
    assert res["max_loss"] == -300.0   # -(5 - 2) * 100
    assert 0 <= res["probability_of_profit_pct"] <= 100

def test_volatility_surface():
    surf = OptionsDeskService.generate_volatility_surface("ETHUSDT", price=3500.0)
    assert surf["symbol"] == "ETHUSDT"
    assert len(surf["surface_matrix"]) == 7
    assert len(surf["term_structure"]) == 7

def test_options_scanner():
    scans = OptionsDeskService.run_options_scanner("unusual_volume")
    assert len(scans) > 0
    assert "iv_rank" in scans[0]

def test_ai_options_query():
    res = OptionsDeskService.ai_options_query("Find safest bullish spread")
    assert "query" in res
    assert len(res["recommendation"]) > 10

def test_options_stress_100k_contracts():
    """Stress test: Calculate Black-Scholes Greeks for 100,000 contracts under 2.5s."""
    t0 = time.time()
    for i in range(100000):
        strike = 100.0 + (i % 50)
        OptionsGreeksEngine.calculate_bs_greeks(
            S=100.0, K=strike, T=30/365.0, r=0.05, sigma=0.25, option_type="call" if i % 2 == 0 else "put"
        )
    elapsed = time.time() - t0
    assert elapsed < 2.5, f"Options 100k stress test took too long: {elapsed:.2f}s"
