# Quantum Terminal — Buyer Presentation Demo Script & Workflow

## Overview
This document provides a step-by-step presentation script for conducting a 10–15 minute buyer demonstration of Quantum Terminal.

---

## Presentation Sequence & Talking Points

### Minute 0:00 – 2:00: Buyer Presentation Dashboard & Overview
- Launch Quantum Terminal. Note the automatic display of the **Buyer Presentation Dashboard**.
- Point out the `● DEMO MODE` gold badge in the header, confirming the platform operates safely in paper trading mode out-of-the-box.
- Highlight the 12 core functional modules listed on the compact dashboard cards.

### Minute 2:00 – 5:00: Multi-Chart Canvas & TradingView Integration
- Close the dashboard and point out the high-frequency candlestick canvas powered by TradingView Lightweight Charts v4.
- Demonstrate multi-chart grid cell layouts (1x1, 1x2, 2x2, 2x3).
- Switch symbols (`BTCUSDT`, `EURUSD`, `XAUUSD`) and timeframes (`1m`, `5m`, `1H`, `1D`).
- Open the **f(x) Indicators** selector and enable EMA, VWAP, and RSI.

### Minute 5:00 – 7:30: Interactive Canvas Order Dragging & Paper Matching
- Open the **Order Panel** or right-click the chart canvas to submit a Market or Limit paper order.
- Demonstrate **Canvas Order Line Dragging**: click and drag the Stop-Loss or Take-Profit lines directly on the chart canvas.
- Show instant execution updates in the **Positions Panel** and real-time PnL calculation.

### Minute 7:30 – 10:00: Order Flow DOM & Advanced Analytics
- Switch to the **DOM / Order Flow** tab in the bottom workspace. Show Level-2 bid/ask depth visualization, footprint charts, and volume profile overlays.
- Open **Options Desk** to view Black-Scholes Greeks (Delta, Gamma, Theta, Vega) and strategy payoff charts.
- Open **Smart Order Router (SOR)** to demonstrate algorithmic order splitting across simulated liquidity venues.

### Minute 10:00 – 12:30: System Health & Mobile Pro
- Click **⚡ Health** in the header bar. Review real-time status across Frontend UI, Backend REST API (Port 8000), WebSocket stream (`/ws/market-data`), and Database ORM.
- Demonstrate **Quantum Mobile Pro**: toggle mobile layout mode or resize screen. Point out touch canvas panning (`vertTouchDrag`), vertical scale dragging, economic event overlays (`CPI`, `FOMC`), and drawer navigation.

### Minute 12:30 – 15:00: Demo Reset & Acquisition Package
- Click **🔄 Reset** in the header. Show the confirmation dialog and confirm safe environment reset returning balance to $100,000.00.
- Conclude by referencing the complete software acquisition documentation package inside the `/acquisition/` directory.
