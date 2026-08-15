import pytest
from app.services.portfolio_service import PortfolioService

def test_fx_currency_conversion():
    converted_eur = PortfolioService.convert_currency(100.0, "USD", "EUR")
    assert converted_eur == 92.0

    converted_inr = PortfolioService.convert_currency(100.0, "USD", "INR")
    assert converted_inr == 8350.0

def test_portfolio_kpis_calculation():
    accounts = [
        {"currency": "USD", "equity": 50000.0, "balance": 50000.0, "unrealized_pnl": 2500.0, "realized_pnl": 1000.0, "margin_used": 5000.0, "free_margin": 47500.0},
        {"currency": "INR", "equity": 835000.0, "balance": 835000.0, "unrealized_pnl": 0.0, "realized_pnl": 0.0, "margin_used": 0.0, "free_margin": 835000.0}, # Equivalent to 10k USD
    ]
    positions = [
        {"symbol": "BTCUSDT", "quantity": 0.5, "entry_price": 60000.0},
    ]

    kpis = PortfolioService.calculate_portfolio_kpis(accounts, positions, base_currency="USD")
    assert kpis["total_equity"] == 60000.0
    assert kpis["total_balance"] == 60000.0
    assert kpis["unrealized_pnl"] == 2500.0
    assert kpis["total_exposure"] == 30000.0

def test_asset_allocation():
    positions = [
        {"asset_class": "Crypto", "quantity": 1.0, "entry_price": 60000.0},
        {"asset_class": "Stocks", "quantity": 100.0, "entry_price": 200.0},
    ]
    alloc = PortfolioService.calculate_asset_allocation(positions)
    assert len(alloc) == 2
    assert alloc[0]["category"] == "Crypto"
    assert alloc[0]["percentage"] > 70.0

def test_risk_and_correlation():
    positions = [{"symbol": "BTCUSDT"}, {"symbol": "ETHUSDT"}]
    risk = PortfolioService.calculate_risk_and_correlation(positions)
    assert risk["beta"] > 0
    assert "correlation_matrix" in risk
    assert risk["correlation_matrix"]["BTCUSDT"]["BTCUSDT"] == 1.0

def test_benchmark_comparison():
    bench = PortfolioService.get_benchmark_comparison()
    assert "portfolio" in bench
    assert "sp500" in bench
    assert "bitcoin" in bench

def test_dividends_and_corporate_actions():
    divs = PortfolioService.get_dividends_and_corporate_actions()
    assert len(divs) > 0
    assert divs[0]["symbol"] == "AAPL"
