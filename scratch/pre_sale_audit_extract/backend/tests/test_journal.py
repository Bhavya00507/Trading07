import pytest
from app.services.journal_service import JournalService

def test_journal_metrics_calculation():
    sample_entries = [
        {"pnl": 150.0, "commission": 2.0, "swap": 0.0, "symbol": "BTCUSDT", "session": "London", "emotion": "Confident", "risk_pct": 1.0},
        {"pnl": -50.0, "commission": 1.0, "swap": 0.0, "symbol": "BTCUSDT", "session": "London", "emotion": "Fear", "risk_pct": 1.5},
        {"pnl": 200.0, "commission": 2.0, "swap": 0.0, "symbol": "ETHUSDT", "session": "New York", "emotion": "Neutral", "risk_pct": 1.0},
        {"pnl": -80.0, "commission": 1.0, "swap": 0.0, "symbol": "ETHUSDT", "session": "New York", "emotion": "Revenge", "risk_pct": 3.5},
    ]

    metrics = JournalService.calculate_metrics(sample_entries)
    assert metrics["total_trades"] == 4
    assert metrics["win_count"] == 2
    assert metrics["loss_count"] == 2
    assert metrics["win_rate"] == 50.0
    assert metrics["gross_profit"] == 350.0
    assert metrics["gross_loss"] == 130.0
    assert metrics["net_profit"] == 350.0 - 130.0 - 6.0 # 214.0
    assert metrics["profit_factor"] == round(350.0 / 130.0, 2)
    assert metrics["largest_win"] == 200.0
    assert metrics["largest_loss"] == -80.0

def test_session_analytics():
    sample_entries = [
        {"pnl": 100.0, "session": "London", "symbol": "BTCUSDT"},
        {"pnl": -20.0, "session": "London", "symbol": "BTCUSDT"},
        {"pnl": 300.0, "session": "New York", "symbol": "ETHUSDT"},
    ]
    res = JournalService.analyze_sessions(sample_entries)
    assert res["London"]["count"] == 2
    assert res["London"]["pnl"] == 80.0
    assert res["New York"]["count"] == 1
    assert res["best_session"] == "New York"

def test_symbol_analytics():
    sample_entries = [
        {"pnl": 100.0, "symbol": "BTCUSDT"},
        {"pnl": -20.0, "symbol": "BTCUSDT"},
        {"pnl": 300.0, "symbol": "ETHUSDT"},
    ]
    symbols = JournalService.analyze_symbols(sample_entries)
    assert len(symbols) == 2
    assert symbols[0]["symbol"] == "ETHUSDT"
    assert symbols[0]["net_profit"] == 300.0

def test_psychology_and_leak_detection():
    sample_entries = [
        {"pnl": -100.0, "emotion": "Fear", "risk_pct": 1.0},
        {"pnl": -100.0, "emotion": "Revenge", "risk_pct": 4.0},
        {"pnl": -100.0, "emotion": "Greed", "risk_pct": 1.0},
    ]
    psych = JournalService.analyze_psychology_and_risks(sample_entries)
    assert psych["revenge_trading_count"] >= 1
    assert psych["risk_violations_count"] == 1
    assert len(psych["suggestions"]) > 0

def test_statement_parser():
    csv_sample = """Symbol,Side,Entry_Price,Exit_Price,Qty,PnL,Commission
BTCUSDT,BUY,65000,66000,0.1,100,1.5
ETHUSDT,SELL,3500,3400,1.0,100,2.0
"""
    trades = JournalService.parse_mt5_or_csv_statement(csv_sample)
    assert len(trades) == 2
    assert trades[0]["symbol"] == "BTCUSDT"
    assert trades[0]["side"] == "buy"
    assert trades[0]["direction"] == "long"
    assert trades[0]["pnl"] == 100.0
    assert trades[0]["net_pnl"] == 98.5
