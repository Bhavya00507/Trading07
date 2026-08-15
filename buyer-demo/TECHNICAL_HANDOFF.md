# Quantum Terminal — Technical Handoff Guide

## Overview
This document provides software engineers, system architects, and technical due-diligence auditors with an in-depth technical handoff of **Quantum Terminal**.

---

## 1. System Architecture & Component Mapping

### Frontend Architecture (`/src`)
- **Framework**: React 18 (`react^18.2.0`, `react-dom^18.2.0`)
- **Language**: TypeScript 5 (`typescript^5.2.2`) with strict type safety enabled.
- **Build Tooling**: Vite 5 (`vite^5.0.0`) delivering sub-2-second HMR dev server and production bundling.
- **State Stores (Zustand)**:
  - `appStore.ts`: Global settings, workspace tabs, notifications, account leverage.
  - `marketStore.ts`: Active symbol selection, global timeframe, instrument watchlist.
  - `marketPriceStore.ts`: High-frequency bid/ask/last price dictionary.
  - `journalStore.ts`: Trade journal entries, equity curve metrics.
  - `alertStore.ts`: Price alerts and indicator trigger notifications.
- **Canvas Charting Engine**: TradingView Lightweight Charts v4 (`lightweight-charts^4.0.0`) rendering candlestick layers, canvas order lines, and drawing overlays.

### Backend Architecture (`/backend`)
- **Language & Runtime**: Python 3.11+ ASGI execution environment.
- **Framework**: FastAPI (`fastapi`) with Uvicorn ASGI server (`uvicorn[standard]`).
- **Database & ORM**: SQLAlchemy 2.0 ORM (`sqlalchemy[asyncio]`) with SQLite (`test.db`) out-of-the-box and PostgreSQL driver (`psycopg[binary]`, `asyncpg`) ready for production cluster deployment.
- **Database Migrations**: Alembic (`alembic`) scripts in `/backend/alembic`.
- **WebSocket Gateway**: High-frequency async WebSocket handlers (`backend/app/websocket/`) streaming ticker prices, candle bar aggregations, and orderbook depth.

---

## 2. Core Data Flow Pipelines

### Flow 1: Client Request Pipeline
```text
React Component ──► Zustand Store ──► Fetch / React Query ──► FastAPI Router ──► SQLAlchemy ORM ──► SQLite/Postgres DB
```
- **Example**: User submits trade entry -> `OrderPanel.tsx` dispatches REST POST to `/api/orders` -> FastAPI router validates schema -> SQLAlchemy ORM persists order record in database.

### Flow 2: Market Data Streaming Pipeline
```text
Market Data Feed / Synthetic Tick ──► FastAPI WebSocket (/ws/market-data) ──► marketWebSocket.ts ──► marketPriceStore ──► Chart Canvas
```
- **Example**: New tick generated -> FastAPI streams JSON tick frame over WebSocket -> client `marketWebSocket.ts` receives payload -> updates Zustand `marketPriceStore` -> triggers canvas tick update in `Chart.tsx`.

### Flow 3: Order Execution & Risk Pipeline
```text
Order Ticket ──► Margin Check Service ──► Trading Engine Tick Matcher ──► SL/TP Execution ──► Portfolio Metrics Update
```
- **Example**: Paper order placed -> `trading_engine.py` verifies required margin against account leverage -> matches tick -> updates position PnL -> recalculates Account Balance, Equity, and Free Margin.

---

## 3. Automated Test Suite (`/backend/tests`)

- **Framework**: Pytest (`pytest`, `pytest-asyncio`).
- **Execution Metric**: **155 passing unit and integration tests (100% pass rate)** executing cleanly in ~11.5 seconds.
