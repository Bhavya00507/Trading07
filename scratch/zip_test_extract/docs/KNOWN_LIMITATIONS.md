# Quantum Terminal — Known Limitations & Technical Disclosure

## Overview
To ensure complete transparency during technical due diligence, this document outlines the boundary conditions, simulated features, and recommended future roadmap items for Quantum Terminal.

---

## 1. Simulated vs Production Features

1. **Broker Execution**:
   - Out-of-the-box execution is performed by an in-memory paper trading engine (`trading_engine.py`).
   - Live order execution on real exchanges (e.g. Binance, IBKR, MT5) requires configuring third-party broker API keys and connecting a custom `BrokerAdapter`.
2. **Smart Order Router (SOR)**:
   - The SOR module (`smart_order_router.py`) demonstrates multi-venue algorithmic order routing across simulated liquidity pools. It is not connected to live FIX protocol dark pools.
3. **AI Copilot & Market Analyst**:
   - Features structured AI assistant UI with technical heuristic fallbacks when `OPENAI_API_KEY` is not provided.
4. **Market Data Feed**:
   - The platform streams live tick data via WebSocket when connected; if offline, it falls back to a synthetic ticker generator.

---

## 2. Recommended Future Enhancements for Buyer

1. **Institutional FIX Protocol Gateway**: Integrate a native QuickFIX engine for low-latency DMA (Direct Market Access) broker routing.
2. **OAuth2 / SSO Authentication**: Replace standard JWT login with enterprise OAuth2 / SAML single-sign-on.
3. **PostgreSQL Migration**: Switch default database connection string from SQLite (`test.db`) to PostgreSQL in production environments.
