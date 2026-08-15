# Quantum Terminal — Technical Due Diligence & Stack Audit

## Overview
This document provides a technical due-diligence audit of the **Quantum Terminal** codebase for acquisition software architects, engineering managers, and technical auditors.

---

## 1. Frontend Architecture Audit (`/src`)

- **Framework**: React 18 (`react^18.2.0`, `react-dom^18.2.0`)
- **Language**: TypeScript 5 (`typescript^5.2.2`) with strict type checking enabled (`tsconfig.json`).
- **Build Tooling**: Vite 5 (`vite^5.0.0`) delivering sub-2-second HMR dev server and production asset bundling.
- **State Management**: Zustand 4 (`zustand^4.4.0`) delivering decoupled client stores:
  - `appStore.ts`: Global settings, workspace tabs, notifications, account leverage.
  - `marketStore.ts`: Active symbol selection, global timeframe, instrument watchlist.
  - `marketPriceStore.ts`: High-frequency bid/ask/last price dictionary.
  - `journalStore.ts`: Trade journal entries, equity curve metrics.
  - `alertStore.ts`: Price alerts and indicator trigger notifications.
- **Canvas Charting Engine**: TradingView Lightweight Charts v4 (`lightweight-charts^4.0.0`) handling candlestick rendering, order lines, and canvas drawing layers.

---

## 2. Backend Architecture Audit (`/backend`)

- **Language & Runtime**: Python 3.11+ ASGI execution environment.
- **Framework**: FastAPI (`fastapi`) with Uvicorn ASGI server (`uvicorn[standard]`).
- **Database & ORM**: SQLAlchemy 2.0 ORM (`sqlalchemy[asyncio]`) with SQLite (`test.db`) out-of-the-box and PostgreSQL driver (`psycopg[binary]`, `asyncpg`) for production database scaling.
- **Database Migrations**: Alembic (`alembic`) migration scripts located in `/backend/alembic`.
- **WebSocket Gateway**: High-frequency async WebSocket handlers (`backend/app/websocket/`) streaming ticker prices, candle bar aggregations, and orderbook depth.
- **Authentication**: JWT token authentication (`pyjwt`, `bcrypt`) with RBAC role enforcement and API key verification.

---

## 3. Infrastructure & Deployment Audit

- **Environment Isolation**: Configured via `.env` files using `python-dotenv`.
- **Containerization**: Multi-stage `Dockerfile` and `docker-compose.yml` defining API backend service and static frontend web server.
- **Desktop Executable Packaging**: PyInstaller specification (`backend/main.spec`) and Electron desktop launcher scripts (`main.js`).

---

## 4. Automated Testing Infrastructure (`/backend/tests`)

- **Framework**: Pytest (`pytest`, `pytest-asyncio`).
- **Test Suite Scale**: **155 unit & integration tests** covering:
  - API Health & Authentication (`test_health.py`, `test_auth_rbac_api_keys.py`)
  - Order Matching & Execution (`test_trading_engine.py`, `test_chart_orders.py`)
  - Portfolio Metrics & Risk Lab (`test_portfolio.py`, `test_portfolio_risk_lab_v34.py`)
  - Workspace Sync & Persistence (`test_workspace_api.py`, `test_workspace_sync.py`)
  - Replay Studio & Strategy Tester (`test_replay.py`, `test_strategy_builder.py`)
- **Execution Metric**: All 155 tests execute cleanly with a 100% pass rate in ~13.5 seconds.
