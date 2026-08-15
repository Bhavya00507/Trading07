# Quantum Terminal — Buyer FAQ

> **Frequently Asked Questions for Acquisition & Due-Diligence Teams**

---

### Q1: What exactly is being sold?
**A**: The complete, unencumbered source code repository for Quantum Terminal, including the React 18 / TypeScript frontend, Python FastAPI backend, database ORM models, Pytest test suite (155 passing tests), build specifications, and technical due-diligence documentation.

### Q2: Is full source code included?
**A**: Yes. Upon completion of acquisition agreements, 100% of the repository source code and intellectual property rights transfer to the buyer.

### Q3: Can the buyer rebrand the application?
**A**: Yes. All branding, logos, color tokens, app titles, and metadata are centralized in `src/services/brandingService.ts` and `index.css`, enabling white-label rebranding.

### Q4: Can the buyer modify the architecture?
**A**: Yes. The codebase is decoupled into modular React components, Zustand state stores, and FastAPI ASGI routers, allowing easy architectural customization.

### Q5: Can the buyer connect their own broker or exchange?
**A**: Yes. Quantum Terminal includes a provider interface pattern (`BrokerAdapter.ts`). Implementing adapter methods for your target venue (Binance, IBKR, MT5, FIX) enables live execution.

### Q6: Can the buyer connect their own market data provider?
**A**: Yes. The Market Data Gateway (`market_data.py`, `marketWebSocket.ts`) supports live WebSocket streaming feeds from commercial providers like Finnhub, TwelveData, or Polygon.io.

### Q7: Which features are currently simulated vs. production-ready?
**A**: Paper trading order matching, synthetic market tick feeds, and Smart Order Router venue splitting operate in simulated demo mode out-of-the-box. The frontend charting, indicator math, options Greeks, backend APIs, and database ORM are production-like implementations.

### Q8: What remains to be completed before live commercial launch?
**A**: Live broker API connections, commercial market data feed licensing, PostgreSQL production database migration (`alembic upgrade head`), and enterprise OAuth2 SSO integration.

### Q9: What technology stack is used?
**A**: Frontend: React 18, TypeScript 5, Vite 5, Zustand, TradingView Lightweight Charts v4. Backend: Python 3.11+, FastAPI, Uvicorn, SQLAlchemy 2.0 ORM, Alembic, Pytest.

### Q10: How difficult is deployment?
**A**: Highly straightforward. Out-of-the-box, it includes multi-stage Docker containerization (`docker-compose.yml`), Nginx reverse proxy configs, PyInstaller build specs, and standalone Uvicorn execution scripts.

### Q11: How is the mobile terminal implemented?
**A**: **Quantum Mobile Pro** (`MobileLayout.tsx`) is built using responsive CSS Modules and React components, providing gesture-isolated canvas touch panning (`vertTouchDrag`), vertical scale dragging, economic event overlays, and bottom navigation.

### Q12: How does the charting engine work?
**A**: Charting is powered by TradingView Lightweight Charts v4, rendering high-frequency OHLCV candles, drawing tools, canvas order lines, and footprint volume profiles on HTML5 canvas.

### Q13: How is the trading engine structured?
**A**: The backend paper trading engine (`trading_engine.py`) maintains an in-memory orderbook and tick matching loop that evaluates margin requirements, models slippage, and executes Stop-Loss/Take-Profit triggers.

### Q14: What external credentials are required to run the demo?
**A**: Zero. Out-of-the-box, Quantum Terminal operates in a self-contained paper trading mode with synthetic tick fallback without requiring external API keys.

### Q15: What are the known limitations?
**A**: Refer to [`docs/KNOWN_LIMITATIONS.md`](../docs/KNOWN_LIMITATIONS.md) and [`FEATURE_MATRIX.md`](./FEATURE_MATRIX.md) for transparent disclosures of prototype scope.
