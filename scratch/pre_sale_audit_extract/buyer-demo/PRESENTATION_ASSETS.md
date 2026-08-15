# Quantum Terminal — Presentation Assets Specification

## Overview
This document specifies the exact 12 presentation screenshots to capture for buyer decks, marketing materials, and technical due-diligence reports.

---

## Screenshot Specifications Matrix

### 01 — Main Presentation Dashboard
- **Screen**: Buyer Presentation Dashboard Modal.
- **Purpose**: Show complete module inventory and landing experience.
- **Visible Elements**: 12 module cards, status badges (`PAPER EXECUTION`, `SIMULATED DATA`, `INTEGRATION REQUIRED`), **🚀 Tour** launcher, header `● DEMO MODE` badge.
- **Hidden Elements**: Unrelated browser toolbars, developer tools console.
- **Recommended Viewport**: `1920 × 1080` (Desktop).
- **Recommended State**: Clean initial state on app launch.

---

### 02 — Professional Multi-Chart Workstation
- **Screen**: Desktop Multi-Chart Canvas (2x2 Grid).
- **Purpose**: Showcase high-frequency charting, multi-asset synchronization, and technical indicators.
- **Visible Elements**: 4 synced candlestick chart cells (`BTCUSDT`, `ETHUSDT`, `EURUSD`, `XAUUSD`), EMA/VWAP indicators, drawing tools toolbar, header bar.
- **Hidden Elements**: Order panel drawers, debug consoles.
- **Recommended Viewport**: `1920 × 1080`.
- **Recommended Timeframe**: `15m` / `1H`.

---

### 03 — Interactive Canvas Paper Order Execution
- **Screen**: Chart Canvas with Active Order Lines.
- **Purpose**: Demonstrate canvas order line dragging (SL/TP handles) and paper order execution.
- **Visible Elements**: Candlestick chart, active Buy order line ($65,000.00), Stop-Loss handle ($64,200.00), Take-Profit handle ($67,500.00), Order Panel ticket.
- **Hidden Elements**: Unnecessary modal popups.
- **Recommended Viewport**: `1920 × 1080`.
- **Recommended Symbol**: `BTCUSDT`.

---

### 04 — Portfolio Analytics & Risk Lab
- **Screen**: Bottom Panel — Positions & Risk Desk tabs.
- **Purpose**: Showcase real-time risk limits, leverage tracking, equity curve, and portfolio distribution.
- **Visible Elements**: Active positions table, Balance ($100k), Equity, Free Margin, Drawdown risk meter, Win Rate metric.
- **Hidden Elements**: Empty order logs.
- **Recommended Viewport**: `1920 × 1080`.

---

### 05 — Market Replay Studio
- **Screen**: Replay Studio Tab.
- **Purpose**: Demonstrate historical tick playback and manual strategy backtesting.
- **Visible Elements**: Playback control toolbar (Play/Pause, Speed 1x–50x, Step Forward), historical candle chart, replay execution log.
- **Hidden Elements**: Live WebSocket feeds.
- **Recommended Viewport**: `1920 × 1080`.

---

### 06 — Options Analytics & Greeks
- **Screen**: Options Desk Panel.
- **Purpose**: Showcase institutional options chains, Black-Scholes Greeks, and strategy payoff diagrams.
- **Visible Elements**: Call/Put option chain, Delta/Gamma/Theta/Vega columns, IV skew curve, multi-leg strategy payoff graph.
- **Hidden Elements**: Non-options panels.
- **Recommended Viewport**: `1920 × 1080`.

---

### 07 — Script Studio & Strategy Engine
- **Screen**: Script Studio Window (`ScriptEditor.tsx`).
- **Purpose**: Demonstrate quantitative indicator scripting and isolated strategy runtime.
- **Visible Elements**: Script editor window, mathematical expression syntax, runtime execution log, indicator output preview.
- **Hidden Elements**: Underlying file paths.
- **Recommended Viewport**: `1920 × 1080`.

---

### 08 — Level-2 Order Flow & DOM Depth
- **Screen**: DOM & Footprint Chart Panel.
- **Purpose**: Showcase Level-2 orderbook visual depth, footprint volume profiles, and time-and-sales log.
- **Visible Elements**: Bid/Ask volume bars, delta profile overlay, Point of Control (POC) level, live trades feed.
- **Hidden Elements**: Standard line charts.
- **Recommended Viewport**: `1920 × 1080`.

---

### 09 — Market Data Gateway
- **Screen**: Market Data Gateway Tab.
- **Purpose**: Demonstrate WebSocket streaming feed control and synthetic ticker fallback.
- **Visible Elements**: Connection status badge (`CONNECTED`), WebSocket endpoint (`/ws/market-data`), tick rate gauge, channel subscription list.
- **Hidden Elements**: Private API keys.
- **Recommended Viewport**: `1920 × 1080`.

---

### 10 — Smart Order Router (SOR) Simulation
- **Screen**: Smart Order Router Tab.
- **Purpose**: Showcase algorithmic order splitting across simulated liquidity venues.
- **Visible Elements**: Parent order ticket, liquidity venue routing table (Binance, Coinbase, Kraken, LMAX), execution fill summary, price improvement metric.
- **Hidden Elements**: Real broker credentials.
- **Recommended Viewport**: `1920 × 1080`.

---

### 11 — Quantum Mobile Pro Touch Layout
- **Screen**: Quantum Mobile Pro Viewport.
- **Purpose**: Demonstrate mobile touch canvas panning, vertical scale dragging, economic event overlays, and bottom navigation.
- **Visible Elements**: Mobile chart canvas, `CPI`/`FOMC` event badges on time axis, slide-up order ticket, sticky bottom navigation bar, header logo.
- **Hidden Elements**: Desktop sidebars or desktop workspace bars.
- **Recommended Viewport**: `390 × 844` (Mobile).

---

### 12 — System Health & Technical Status Panel
- **Screen**: Technical System Health Modal (**⚡ Health** button).
- **Purpose**: Showcase real-time system diagnostics and technical architecture readiness.
- **Visible Elements**: Diagnostic rows (Frontend `READY`, REST API `READY PORT 8000`, WebSockets `CONNECTED`, DB ORM `READY`), latency meters, technical stack metadata.
- **Hidden Elements**: Developer console.
- **Recommended Viewport**: `1920 × 1080`.
