# Quantum Terminal — Spoken Presenter Script

> **10-Minute Executive & Technical Presentation Script**

---

## Presenter Guidelines
- **Tone**: Technical, transparent, objective, and professional.
- **Rules**: Avoid marketing hyperbole ("Bloomberg killer", "100% production ready"). Clearly distinguish working prototype features from external integration requirements.

---

## 10-Minute Spoken Script

### `00:00` — Product Overview & Landing Experience
- **Action**: Launch application on `http://localhost:5173`.
- **Spoken Text**:
  > *"Welcome to the technical demonstration of Quantum Terminal. Quantum Terminal is an institutional-grade, multi-asset trading platform foundation engineered for brokerages, prop trading firms, fintech startups, or trading SaaS providers.
  >
  > As you can see, the platform opens with a Buyer Presentation Dashboard highlighting its 12 core functional modules. Notice the gold indicator badge in the header: '● DEMO MODE'. Out of the box, Quantum Terminal operates in a self-contained paper trading mode, allowing your technical and product teams to evaluate every feature safely without requiring live broker credentials."*

### `01:30` — Markets & Multi-Asset Watchlist
- **Action**: Click close on dashboard modal; point to Watchlist sidebar.
- **Spoken Text**:
  > *"The multi-asset watchlist supports Crypto, Forex, Indices, and Equities. Selecting an asset like Bitcoin instantly updates the workspace components, streaming live bid, ask, and last price updates."*

### `02:00` — Professional Canvas Charting & Indicators
- **Action**: Highlight chart grid buttons; open f(x) Indicators modal.
- **Spoken Text**:
  > *"Quantum Terminal utilizes TradingView Lightweight Charts v4 for high-frequency HTML5 canvas rendering. The workstation supports multi-chart grid layouts from 1x1 up to 2x3, multi-timeframe crosshair synchronization, and over 14 client-side technical indicators including EMA, VWAP, Bollinger Bands, and RSI."*

### `03:00` — Interactive Canvas Paper Order Execution
- **Action**: Open Order Panel; submit Limit order; drag SL/TP lines on chart.
- **Spoken Text**:
  > *"For trade execution, Quantum Terminal includes an interactive canvas order line engine. When submitting a paper order, order lines appear directly on the chart canvas. Traders can click and drag the Stop-Loss and Take-Profit handles visually to adjust risk boundaries in real time."*

### `04:00` — Portfolio Metrics & Risk Desk Analytics
- **Action**: Expand bottom workspace panel; click Positions & Risk Desk tabs.
- **Spoken Text**:
  > *"Opening the bottom workspace panel brings up the Portfolio & Risk Lab. Here, traders and risk managers can track real-time Account Balance ($100,000 paper initial), Total Equity, Margin Utilization, Free Margin, and Maximum Drawdown risk limits."*

### `05:00` — Market Replay Studio
- **Action**: Select Replay Studio tab; hit Play button; adjust speed to 5x.
- **Spoken Text**:
  > *"For discretionary practice and strategy validation, Quantum Terminal features a Market Replay Studio. Users can step backward in time and play back historical candle feeds at adjustable speeds from 1x up to 50x."*

### `06:00` — Institutional Options Desk & Greeks
- **Action**: Select Options Desk tab; point to Option Chain and Greeks columns.
- **Spoken Text**:
  > *"For derivatives traders, the Options Desk provides call and put options chains with automated Black-Scholes Greeks calculation—including Delta, Gamma, Theta, and Vega—alongside implied volatility skew charts and strategy payoff diagrams."*

### `07:00` — Script Studio & Quantitative Strategy Engine
- **Action**: Open Script Studio window (`ScriptEditor.tsx`); highlight expression editor.
- **Spoken Text**:
  > *"For quantitative developers, the Script Studio allows users to write custom mathematical indicator expressions. Scripts execute inside isolated client Web Worker threads to prevent UI main-thread blocking."*

### `08:00` — Market Data Gateway Architecture
- **Action**: Select Market Data tab; highlight WebSocket status badge.
- **Spoken Text**:
  > *"Looking at infrastructure, the Market Data Gateway manages real-time WebSocket tick streams (`/ws/market-data`). When live WebSocket connections are offline, the gateway automatically engages a synthetic tick generator to keep testing environments functional."*

### `09:00` — Smart Order Router (SOR) Simulation
- **Action**: Select Smart Order Router tab; show routing allocation table.
- **Spoken Text**:
  > *"To demonstrate algorithmic order routing, the Smart Order Router models parent order splitting across simulated liquidity venues—such as Binance, Coinbase, Kraken, and LMAX—to illustrate price improvement analytics."*

### `09:30` — Quantum Mobile Pro Touch Layout
- **Action**: Open Mobile view or show [`11-mobile-terminal.png`](file:///d:/Trading07/buyer-demo/mobile/11-mobile-terminal.png).
- **Spoken Text**:
  > *"For mobile viewports, Quantum Mobile Pro (`MobileLayout.tsx`) delivers a touch-native interface. Key touch gestures—including vertical price scale dragging (`axisPressedMouseMove`) and touch canvas panning (`vertTouchDrag`)—are isolated from browser page scrolling. It also features economic event overlays directly on the chart time axis."*

### `10:00` — System Health & Handoff Overview
- **Action**: Click '⚡ Health' button in header; review diagnostic modal.
- **Spoken Text**:
  > *"Finally, clicking the '⚡ Health' button opens the System Health Panel, running live diagnostic pings against the REST API (Port 8000), WebSockets, and Database ORM. In summary, Quantum Terminal gives an acquiring buyer a clean, well-tested codebase with 155 passing unit tests and sub-2-second build times. Thank you."*
