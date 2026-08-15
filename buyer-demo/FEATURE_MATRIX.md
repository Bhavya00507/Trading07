# Quantum Terminal — Technical Feature Matrix

## Overview
This feature matrix classifies all 15 major subsystems of Quantum Terminal into four technical maturity categories:
- **`A. Working Prototype`**: Fully functional, tested client/server implementation.
- **`B. Demo / Simulated`**: Complete simulated feature operating in sandbox/paper mode.
- **`C. External Integration Required`**: Interface provided; requires third-party API credentials.
- **`D. Production Hardening Required`**: Architectural hardening required for high-concurrency production launch.

---

## Subsystem Maturity Classification Matrix

| Subsystem | Category | Current Implementation | Buyer Integration / Hardening Required |
|---|---|---|---|
| **Desktop Terminal** | `A. Working Prototype` | React 18 / Vite desktop workstation with workspace grid switcher. | Branding configuration (`brandingService.ts`). |
| **Quantum Mobile Pro** | `A. Working Prototype` | Responsive touch layout with vertical scale dragging and event overlays. | Mobile PWA manifest / React Native wrapper. |
| **Canvas Charting** | `A. Working Prototype` | TradingView Lightweight Charts v4 canvas rendering engine. | Custom indicator styling / theme tuning. |
| **Technical Indicators** | `A. Working Prototype` | 14+ client-side mathematical indicators (`indicatorCalcs.ts`). | Custom proprietary indicator extensions. |
| **Paper Trading Engine** | `B. Demo / Simulated` | In-memory tick order matching engine (`trading_engine.py`) with SL/TP triggers. | Live execution engine connection. |
| **Risk Management Desk** | `A. Working Prototype` | Position sizing, leverage tracking, equity curve, Max Drawdown risk rules. | Regulatory risk rule policy engine. |
| **Market Replay Studio** | `B. Demo / Simulated` | Historical candle playback studio with 1x to 50x speed controls. | Historical tick database store (TimescaleDB). |
| **Options Analytics** | `A. Working Prototype` | Call/Put option chain, Black-Scholes Greeks calculation, IV skew payoff graph. | Live options pricing feed. |
| **Script Studio Engine** | `A. Working Prototype` | Custom indicator math expression evaluator executing in Web Workers. | Sandboxed WASM / Python execution engine. |
| **Market Data Gateway** | `B. Demo / Simulated` | Async WebSocket tick stream (`/ws/market-data`) with synthetic tick fallback. | Paid commercial market data license (Finnhub, Polygon). |
| **Smart Order Router** | `B. Demo / Simulated` | Algorithmic parent order splitting simulation across simulated pools. | Live exchange FIX gateway routers. |
| **Autonomous AI Analyst** | `B. Demo / Simulated` | Technical pattern heuristics fallback + OpenAI/Claude API integration. | Production LLM API keys & prompt engineering. |
| **Cloud Workspace Sync** | `A. Working Prototype` | REST API workspace layout saving and local/cloud persistence. | Multi-region cloud storage sync. |
| **Authentication & RBAC**| `D. Production Hardening` | JWT tokens, bcrypt password hashing, API key verification. | Enterprise OAuth2 / SAML SSO integration. |
| **Broker Integration** | `C. External Integration` | `IBrokerAdapter.ts` interface template and mock adapter. | Live exchange API keys (Binance, IBKR, MT5, FIX). |
