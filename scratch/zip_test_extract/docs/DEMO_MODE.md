# Quantum Terminal — Demo Mode & Simulation Specification

## Overview
Quantum Terminal includes a complete, out-of-the-box **Demo Mode** designed to allow buyers, developers, and prospective clients to run and evaluate the application immediately without requiring live exchange accounts or third-party API credentials.

---

## 1. Paper Trading Execution Engine

When operating in Demo Mode:
- **Order Creation**: Orders placed through the Order Panel, DOM, Quick Trade Buttons, or Chart Line Dragging are processed by the simulated trading engine (`trading_engine.py`).
- **Order Types**:
  - **Market Orders**: Filled instantly at current bid/ask price with simulated slippage.
  - **Limit Orders**: Queued in simulated orderbook and filled when price crosses limit threshold.
  - **Stop / Stop-Limit Orders**: Triggered automatically when tick price breaches stop price.
- **Position & PnL Tracking**:
  - Unrealized PnL updates on every tick (`(currentPrice - openPrice) * quantity`).
  - Realized PnL is credited to Equity upon position close.
  - Margin utilization, Free Margin, and Drawdown are updated in real time.

---

## 2. Market Data Tick Generator

When live exchange WebSocket feeds are disconnected or offline:
- The market data stream automatically initializes a high-frequency tick generator (`marketWebSocket.ts`, `candleEngine.ts`).
- **Realistic Price Action**: Generates realistic tick price movements, volume spikes, spread fluctuations, and bid/ask depth for major pairs (`BTCUSDT`, `ETHUSDT`, `EURUSD`, `XAUUSD`, `NAS100`).
- **Candle Aggregation**: Ticks are aggregated into standard timeframes (`1m`, `3m`, `5m`, `15m`, `1H`, `4H`, `1D`, `1W`) in memory.

---

## 3. Heuristic AI Analysis Fallback

- When `OPENAI_API_KEY` is omitted, the AI Market Analyst and Copilot panels use technical heuristic models.
- Generates structured market sentiment analysis, technical pattern detection, and risk assessment metrics derived from live candlestick indicators.
