# QUANTUM TERMINAL — FEATURE CATALOGUE & CLASSIFICATION

Every system feature within Quantum Terminal is classified into exactly one of three status categories:

- **WORKING**: Fully functional implementation ready out-of-the-box.
- **DEMO/SIMULATED**: Fully functional user interface backed by simulated/synthetic data streams or heuristic fallback engines.
- **EXTERNAL INTEGRATION REQUIRED**: Production-ready architecture and handler hooks requiring third-party broker API credentials or exchange adapters.

---

## FEATURE MATRIX TABLE

| Module Area | Feature Name | Classification | Technical Description |
|-------------|--------------|----------------|-----------------------|
| **Trading** | Order Entry Panel | WORKING | Supports Market/Limit orders, Qty selector, Stop Loss (SL), Take Profit (TP), and previews. |
| **Trading** | Order Management | WORKING | Paper matching engine managing order state transitions, pending orders, and execution logs. |
| **Charting** | Multi-Timeframe Charting | WORKING | TradingView Lightweight Charts & canvas rendering engine (1s, 1m, 5m, 15m, 1H, 4H, 1D). |
| **Charting** | Technical Indicators | WORKING | Indicator calculations library (EMA, SMA, RSI, VWAP, MACD, Bollinger Bands, ATR, Stochastic). |
| **Portfolio** | Account Metrics | WORKING | Real-time balance ($10,000 default), equity, margin used, free margin, and unrealized P&L. |
| **Portfolio** | Open Positions Table | WORKING | Tracks open trades, entry price, current price, leverage, unrealized P&L %, and close position controls. |
| **Risk Management** | Margin & Exposure Control | WORKING | Real-time margin level monitoring (817.42%), drawdown risk lab, and max exposure safeguards. |
| **Market Data** | Live Crypto Feed | WORKING | Real-time WebSocket connection to Binance for streaming BTCUSDT, ETHUSDT, and top crypto pairs. |
| **Market Data** | Synthetic Multi-Asset Feed | DEMO/SIMULATED | Heuristic quote generator supplying tick data for FX, Indices, and Metals when paid feed keys are omitted. |
| **Replay** | Market Replay Studio | WORKING | Step-by-step historical candle replay engine with playback speed controls and replay order desk. |
| **Options** | Options Chain Matrix | WORKING | Call/Put option chain grid displaying Strike prices, Delta, Implied Volatility (IV), OI, and Volatility Surface. |
| **Strategy / Algo** | QScript Code Editor | WORKING | Pine-style code editor with line numbers, code snippets, AI assistant prompt, and sandbox compiler. |
| **Strategy / Algo** | Strategy Backtester | WORKING | Backtesting execution runtime evaluating crossovers, RSI thresholds, and historical trade performance. |
| **Smart Order Routing** | Level-2 DOM Ladder | DEMO/SIMULATED | Level-2 Orderbook DOM depth ladder visualization and simulated multi-venue order route matching. |
| **Mobile Terminal** | Quantum Mobile Pro | WORKING | Touch-optimized mobile layout (390x844 resolution) with candle chart, floating toolbars, and bottom nav. |
| **AI Features** | AI Market Analyst & Copilot | DEMO/SIMULATED | Technical heuristic signal generation engine (optional OpenAI API key supported). |
| **Workspace** | Drag & Drop Workstation | WORKING | Multi-pane workstation grid with dockable panels, status bar, and quick command palette (Control+K). |
| **Infrastructure** | System Health Diagnostic | WORKING | Real-time diagnostic modal monitoring REST API, WebSocket Manager, Database, and Execution Engine status. |
| **Developer Platform** | API Key & Webhooks Portal | WORKING | Developer management panel for generating REST API keys and configuring webhook endpoints. |
| **Broker Integration** | Live Execution Adapters | EXTERNAL INTEGRATION REQUIRED | Pluggable broker adapter interface (Binance, IBKR, FIX 4.4). Requires buyer live broker credentials. |
