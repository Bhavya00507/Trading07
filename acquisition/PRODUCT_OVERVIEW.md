# Quantum Terminal — Product Overview

## 1. Product Summary
**Quantum Terminal** is an extensible, high-performance financial trading platform prototype engineered for desktop workstations and mobile devices. It provides institutional multi-chart grid layouts, technical indicators, level-2 orderbook DOMs, market replay studio, risk analytics, paper trading simulation, and automated AI analysis.

This codebase is structured for software engineering teams, prop trading firms, fintech startups, or retail brokerages looking to acquire, customize, rebrand, and integrate a modern trading terminal with their own execution venues and market data feeds.

---

## 2. Target Audience & Customer Use Cases

1. **Fintech Companies & Brokerages**: Launch a proprietary web or desktop trading workstation for retail or institutional clients.
2. **Proprietary Trading Firms**: Deploy a custom trading terminal with built-in risk controls, orderflow depth, and strategy backtesting.
3. **Quantitative Developers**: Utilize the Python FastAPI backend and React frontend as a foundation for custom algorithmic execution tools.
4. **Educational & Research Platforms**: Provide interactive paper trading, market replay, and technical indicator tools.

---

## 3. Core Subsystem Capabilities

### A. Desktop Workstation & Multi-Chart Canvas
- Configurable 1x1 to 2x3 grid canvas with multi-timeframe synchronization.
- High-frequency candlestick, area, bar, and footprint chart rendering powered by TradingView Lightweight Charts v4.
- Drag-and-drop canvas order lines for Stop-Loss and Take-Profit adjustments.
- Custom drawing tools (Trendline, Horizontal Level, Fibonacci Retracement, Measurement Tool).

### B. Quantum Mobile Pro Interface
- Responsive mobile layout optimized for touch-screen viewports (320px–414px+).
- Touch canvas panning (`vertTouchDrag: true`, `horzTouchDrag: true`) with gesture isolation from page scrolling.
- Slide-out Quantum Menu drawer, slide-up order ticket, and sticky bottom navigation bar.

### C. Paper Trading & Order Management Engine
- Real-time simulated matching for Market, Limit, Stop, and Stop-Limit orders.
- In-memory tick matching with margin check, leverage utilization, unrealized/realized PnL calculation, and automatic SL/TP execution.

### D. Technical Indicator Suite (14+)
- Client-side mathematical indicators: EMA, SMA, VWAP, Bollinger Bands, RSI, MACD, ATR, ADX, Stochastic, Ichimoku, Supertrend, POC (Point of Control), and Pivot Points.

### E. Order Flow & Level-2 DOM Depth
- Level-2 orderbook DOM panel with visual bid/ask volume depth, delta panels, volume profile overlays, and time-and-sales execution log.

### F. Market Replay Studio & Strategy Tester
- Historical candle playback studio with speed controls for strategy backtesting and manual replay practice.
- Visual strategy builder engine for designing rule-based entry/exit signals.

### G. Institutional Options Desk
- Options chain analytics, Black-Scholes Greeks (Delta, Gamma, Theta, Vega), implied volatility skew, and multi-leg option strategy payoff diagrams.

### H. Smart Order Router (SOR) Simulation
- Algorithmic routing demo showcasing multi-venue order splitting and price improvement across simulated liquidity pools (Binance, Coinbase, Kraken, LMAX).

### I. Autonomous AI Analyst & Copilot
- AI assistant panels featuring technical pattern heuristics fallback and OpenAI/Claude API integration for market commentary and trade signal generation.

### J. Workspace & Cloud Sync System
- 5 preset workspace layouts (Executive Dashboard, Global Markets, Hero Chart, Order Ticket, Open Positions), custom layout persistence, and cloud workspace sync endpoints.
