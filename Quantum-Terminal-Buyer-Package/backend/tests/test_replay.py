import pytest
from app.services.replay_service import ReplayService

def test_generate_historical_candles():
    candles = ReplayService.generate_historical_candles(symbol="BTCUSDT", timeframe="1m", count=100)
    assert len(candles) == 100
    assert "open" in candles[0]
    assert "high" in candles[0]
    assert "low" in candles[0]
    assert "close" in candles[0]
    assert candles[0]["open"] > 0

def test_get_historical_news():
    news = ReplayService.get_historical_news(symbol="BTCUSDT")
    assert len(news) > 0
    assert news[0]["impact"] == "HIGH"

def test_simulate_account_step():
    positions = [
        {"side": "buy", "quantity": 1.0, "entry_price": 65000.0}
    ]
    current_price = 66000.0
    account_info = ReplayService.simulate_account_step(
        positions=positions,
        current_price=current_price,
        balance=10000.0,
        leverage=10.0
    )
    assert account_info["balance"] == 10000.0
    assert account_info["unrealized_pnl"] == 1000.0
    assert account_info["equity"] == 11000.0

def test_strategy_optimization():
    candles = ReplayService.generate_historical_candles(symbol="BTCUSDT", timeframe="1m", count=200)
    results = ReplayService.run_strategy_optimization(
        candles=candles,
        fast_ema_range=[5, 9],
        slow_ema_range=[21, 26],
        initial_capital=10000.0
    )
    assert len(results) > 0
    assert "fast_ema" in results[0]
    assert "net_profit" in results[0]

def test_ai_evaluate_replay_session():
    trades = [
        {"pnl": 150.0, "side": "buy", "entry_price": 65000.0, "exit_price": 66500.0},
        {"pnl": -50.0, "side": "sell", "entry_price": 66000.0, "exit_price": 66500.0}
    ]
    evaluation = ReplayService.ai_evaluate_replay_session(trades=trades, initial_balance=10000.0)
    assert evaluation["score"] > 0
    assert "grade" in evaluation
    assert len(evaluation["critique"]) > 0
