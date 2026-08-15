# Quantum Terminal — Verified Feature Highlights

## Overview
This document provides a categorized inventory of all verified working features in **Quantum Terminal**.

---

## 1. TRADING & WORKSTATION
- **TradingView Canvas Charting**: High-frequency HTML5 canvas candlestick rendering.
- **Multi-Chart Grid Canvas**: 1x1 to 2x3 chart cell layouts with synchronized crosshairs.
- **Interactive Canvas Order Lines**: Drag-and-drop Stop-Loss and Take-Profit handles directly on the chart canvas.
- **Paper Trading Engine**: Real-time order matching for Market, Limit, Stop, and Stop-Limit orders.
- **Positions & Portfolio Desk**: Balance ($100k paper initial), Equity, Margin Utilization, Free Margin, and Unrealized PnL.
- **Risk Calculator**: Position sizing, Maximum Drawdown risk limits, and Risk/Reward ratio calculation.

---

## 2. ANALYTICS & MARKET DEPTH
- **Technical Indicator Suite**: 14+ client-side mathematical indicators (EMA, SMA, VWAP, Bollinger Bands, RSI, MACD, ATR, ADX, Stochastic, Ichimoku, Supertrend, POC, Pivots).
- **Institutional Options Desk**: Call/Put options chains, Black-Scholes Greeks (Delta, Gamma, Theta, Vega), implied volatility skew, and strategy payoff graphs.
- **Market Replay Studio**: Step-by-step historical tick playback with speed controls (1x to 50x).
- **Order Flow & Footprint DOM**: Level-2 orderbook visual depth, volume profile overlays, Point of Control (POC) tracking, and time-and-sales execution log.

---

## 3. ALGORITHMIC & RESEARCH
- **Script Studio**: Custom mathematical indicator expression editor executing inside isolated Web Worker threads.
- **Visual Strategy Builder**: Rule-based strategy signal generator for backtesting price patterns.
- **Smart Order Router (SOR)**: Algorithmic order splitting demo across simulated liquidity venues (Binance, Coinbase, Kraken, LMAX).
- **AI Analyst & Copilot**: Technical pattern heuristics fallback and OpenAI/Claude API integration for market analysis.

---

## 4. INFRASTRUCTURE & BACKEND
- **FastAPI ASGI Backend**: High-performance Python backend delivering REST endpoints and WebSocket channels.
- **Market Data Gateway**: Async WebSocket streaming (`/ws/market-data`) with automatic synthetic tick fallback.
- **Database & Storage**: SQLAlchemy 2.0 ORM with SQLite out-of-the-box and PostgreSQL / Alembic migrations ready.
- **Broker Interface Pattern**: Clean `IBrokerAdapter.ts` provider interface for adapting external broker APIs.

---

## 5. QUANTUM MOBILE PRO
- **Touch-Native Interface**: Responsive layout optimized for mobile viewports (`390 × 844`).
- **Touch Canvas Panning**: Canvas touch drag handles (`vertTouchDrag`) isolated from page scrolling.
- **Vertical Scale Dragging**: Touch scale scaling (`axisPressedMouseMove`) for adjusting visible price ranges.
- **Economic Event Overlays**: Scheduled news events (`CPI`, `FOMC`, `NFP`) rendered directly on the chart time axis.
