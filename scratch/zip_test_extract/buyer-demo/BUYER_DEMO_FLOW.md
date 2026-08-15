# Quantum Terminal — Recommended 10-Minute Buyer Demo Flow

## Overview
This document outlines the optimal 10-minute presentation sequence for showcasing Quantum Terminal to prospective acquirers, product leaders, and engineering teams.

---

## 10-Minute Timeline & Demo Sequence

```text
00:00 ──► Product Intro & Dashboard
  │
01:30 ──► Markets & Multi-Asset Watchlist
  │
02:00 ──► Professional Canvas Charting & Indicators
  │
03:00 ──► Interactive Canvas Paper Order Execution
  │
04:00 ──► Portfolio Metrics & Risk Analytics
  │
05:00 ──► Market Replay Studio
  │
06:00 ──► Institutional Options Analytics & Greeks
  │
07:00 ──► Script Studio Engine & Strategy Runtime
  │
08:00 ──► Market Data Gateway & Streaming
  │
09:00 ──► Smart Order Router (SOR) Simulation
  │
09:30 ──► Quantum Mobile Pro Touch Layout
  │
10:00 ──► System Health & Final Product Overview
```

---

## Step-by-Step Demo Flow Breakdown

### `00:00` — Product Introduction & Buyer Dashboard
- **Screen**: Buyer Presentation Dashboard Modal & Desktop Workspace.
- **Talking Points**: Introduce Quantum Terminal as a high-performance multi-asset trading platform foundation. Point out the `● DEMO MODE` badge confirming safe paper trading execution out-of-the-box.
- **Verification Status**: `PASS` (Auto-opens on first launch; displays 12 platform modules).

### `01:30` — Markets & Multi-Asset Watchlist
- **Screen**: Watchlist Panel (Left Sidebar / Floating).
- **Talking Points**: Demonstrate multi-asset support (Crypto, Forex, Indices, Equities). Switch active asset to `BTCUSDT`.
- **Verification Status**: `PASS` (Real-time bid/ask price updates).

### `02:00` — Professional Canvas Charting & Indicators
- **Screen**: Multi-Chart Canvas Workstation (`Chart.tsx`).
- **Talking Points**: Show 1x1 to 2x3 chart cell grid layouts, multi-timeframe synchronization (`1m`, `5m`, `1H`), and technical indicators (EMA, VWAP, RSI, Bollinger Bands).
- **Verification Status**: `PASS` (Powered by TradingView Lightweight Charts v4).

### `03:00` — Interactive Canvas Paper Order Execution
- **Screen**: Order Panel & Chart Canvas Order Lines.
- **Talking Points**: Submit a paper Market/Limit order. Demonstrate dragging Stop-Loss (SL) and Take-Profit (TP) lines directly on the chart canvas.
- **Verification Status**: `PASS` (In-memory tick execution with instant position updates).

### `04:00` — Portfolio Metrics & Risk Analytics
- **Screen**: Bottom Panel — Positions & Risk Desk tabs.
- **Talking Points**: Show Balance ($100k paper initial), Equity, Margin Utilization, Unrealized PnL, and Max Drawdown risk rules.
- **Verification Status**: `PASS` (Real-time account metrics calculation).

### `05:00` — Market Replay Studio
- **Screen**: Replay Studio Tab.
- **Talking Points**: Demonstrate step-by-step historical tick playback for manual trading practice and strategy validation.
- **Verification Status**: `PASS` (Speed controls: 1x, 5x, 10x, 50x).

### `06:00` — Institutional Options Analytics & Greeks
- **Screen**: Options Desk Panel.
- **Talking Points**: View options chains, Black-Scholes Greeks (Delta, Gamma, Theta, Vega), implied volatility skew, and multi-leg option strategy payoff diagrams.
- **Verification Status**: `PASS` (Mathematical Greeks calculation engine).

### `07:00` — Script Studio & Strategy Runtime
- **Screen**: Script Studio Window (`ScriptEditor.tsx`).
- **Talking Points**: Write custom indicator mathematical expressions and execute strategies in isolated Web Worker memory.
- **Verification Status**: `PASS` (Client-side worker runtime).

### `08:00` — Market Data Gateway & Streaming
- **Screen**: Market Data Gateway Tab.
- **Talking Points**: Show WebSocket tick stream management (`/ws/market-data`) with automatic synthetic tick fallback when offline.
- **Verification Status**: `PASS` (Async FastAPI WebSocket handlers).

### `09:00` — Smart Order Router (SOR) Simulation
- **Screen**: Smart Order Router Tab.
- **Talking Points**: Demonstrate algorithmic parent order splitting across simulated liquidity venues (Binance, Coinbase, Kraken, LMAX).
- **Verification Status**: `PASS` (Liquidity pool routing simulation).

### `09:30` — Quantum Mobile Pro Touch Layout
- **Screen**: Quantum Mobile Pro Viewport (390x844).
- **Talking Points**: Toggle mobile layout mode. Show vertical price scale dragging, touch canvas panning (`vertTouchDrag`), economic event overlays (`CPI`, `FOMC`), and sticky bottom navigation.
- **Verification Status**: `PASS` (Touch-native responsive layout).

### `10:00` — System Health & Handoff Overview
- **Screen**: Technical System Health Modal (**⚡ Health** button).
- **Talking Points**: Review real-time diagnostic statuses across Frontend, Backend REST API (Port 8000), WebSockets, and Database ORM. Conclude presentation.
- **Verification Status**: `PASS` (Real-time REST API ping and WebSocket health status).
