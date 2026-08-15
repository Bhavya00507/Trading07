# QUANTUM TERMINAL — BUYER DUE DILIGENCE RESPONSE SHEET

---

### Q1: Is full source code included in the acquisition?
**Yes.** The buyer receives 100% full unencumbered source code ownership for both the React 18 TypeScript frontend (`src/`) and the FastAPI Python backend (`backend/`).

### Q2: Is the buyer allowed to modify or extend the source code?
**Yes.** The codebase is clean, modular, and unencumbered, allowing your engineering team to modify, extend, refactor, or add custom proprietary components.

### Q3: Can the buyer white-label and rebrand the application?
**Yes.** The platform features a zero-code white-label configuration engine (`public/branding.json`) allowing instant customization of app name, logos, brand accent colors, support links, and copyright text without recompiling React code.

### Q4: Can the buyer integrate their own live broker execution APIs?
**Yes.** The backend includes extensible broker adapter interfaces (Binance, IBKR, FIX 4.4). The buyer can connect live brokerage APIs for live order routing.

### Q5: Can the buyer replace or connect third-party paid market data providers?
**Yes.** The Market Data Gateway is designed to integrate paid streaming data providers (Finnhub, TwelveData, Refinitiv) by supplying API keys in `backend/.env`.

### Q6: Is trading live or paper trading out-of-the-box?
Out-of-the-box, trading operates in **DEMO MODE** using an internal paper execution matching engine to ensure safe platform exploration and client onboarding without financial risk.

### Q7: What backend framework and language does the platform use?
The backend is built with **Python 3.11+** and **FastAPI**, utilizing `asyncio`, Uvicorn, and WebSockets for real-time streaming.

### Q8: What frontend framework and language does the platform use?
The frontend is built with **React 18** and **TypeScript 5**, bundled with **Vite 5**, utilizing **Zustand** for state management and **TradingView Lightweight Charts** for canvas rendering.

### Q9: What database engine is used?
Out-of-the-box, the backend uses **SQLite** (`test.db`) via **SQLAlchemy 2.0**. It is fully compatible with **PostgreSQL** or AWS RDS by updating the `DATABASE_URL` environment variable.

### Q10: What API endpoints and WebSockets exist?
- REST API: `/api/v1/auth`, `/api/v1/orders`, `/api/v1/market-data`, `/api/v1/system-health`
- WebSocket Gateway: `/ws/market-data` for real-time tick streaming and order updates.

### Q11: What automated tests have been executed and passed?
The Pytest automated backend test suite has passed **155/155 tests** cleanly in 10.97 seconds (`pytest backend/tests`).

### Q12: What remains to be completed for commercial production launch?
Commercial deployment requires the buyer to:
1. Connect live broker REST/FIX APIs (e.g. IBKR TWS, Binance Live, FIX Gateways).
2. Subscribe to commercial market data feeds (Finnhub, TwelveData, Refinitiv, OPRA).
3. Configure a production PostgreSQL / AWS RDS database instance via `DATABASE_URL`.
4. Obtain required financial regulatory licenses (SEC, FINRA, FCA, ESMA) and AML/KYC vendor integrations.
5. Deploy to cloud infrastructure (AWS/GCP Kubernetes) with SSL/TLS termination.

### Q13: Are any real API keys included in the package?
**No.** All real API keys, access tokens, passwords, and secrets have been purged. Only template configurations (`.env.example`) are provided.

### Q14: Are any private credentials or JWT secrets included?
**No.** Security audit verified 0 secrets or real credentials exposed.

### Q15: What open-source or third-party libraries are used?
Standard open-source libraries under permissive licenses (MIT/Apache 2.0): React, TypeScript, FastAPI, SQLAlchemy, Zustand, TradingView Lightweight Charts, Pytest, Pillow, OpenCV.

### Q16: What does the buyer need to install to run the platform locally?
- Node.js v18.0+ & npm v9.0+
- Python v3.10+ & pip

### Q17: How long does local setup take?
Setup takes approximately **5 to 10 minutes**:
1. Frontend: `npm install` && `npm run dev`
2. Backend: `pip install -r backend/requirements.txt` && `python -m backend.main`

### Q18: Is comprehensive technical documentation included?
**Yes.** Includes setup manuals, architecture blueprints, API specifications, and handoff guides (`Quantum-Terminal-Buyer-Package/BUYER_HANDOFF.md`).

### Q19: Is the verified demo video included in the package?
**Yes.** The 1080p HD H.264 + AAC demo video (`sales-package/Quantum-Terminal-Buyer-Demo.mp4`, 19.92 MB) is included in the sales assets.
