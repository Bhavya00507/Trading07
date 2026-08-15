# Quantum Terminal — System Architecture

## Overview
Quantum Terminal is built on a decoupled, modular architecture separating the high-performance client rendering layer from the Python FastAPI backend engine.

---

## 1. High-Level Data Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (BROWSER)                     │
│                                                                 │
│  React 18 UI ──► Zustand Stores ──► Lightweight Charts Canvas   │
│       │               ▲                        ▲                │
│       │ REST API      │ WebSocket Ticks        │ Ticks          │
│       ▼               │                        │                │
└───────┼───────────────┼────────────────────────┼────────────────┘
        │               │                        │
┌───────┼───────────────┼────────────────────────┼────────────────┐
│       ▼               │                        │                │
│  FastAPI Routers ──► WS Manager ───────────────┘                │
│  (Auth, Orders,      (Market Data Stream)                       │
│   Journals, AI)       ▲                                         │
│       │               │ Ticks                                   │
│       ▼               │                                         │
│  Trading Engine ──────┤                                         │
│  (Paper Matching)     │                                         │
│       │               │                                         │
│       ▼               │                                         │
│  SQLAlchemy ORM ──────┘                                         │
│  (SQLite/PostgreSQL)                                            │
│                                                                 │
│                      BACKEND LAYER (PYTHON)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Subsystems (`/src`)

### Store Architecture (Zustand)
- `appStore.ts`: Global application settings, active workspace tab, notifications/toasts, account leverage.
- `marketStore.ts`: Active symbol selection, global timeframe, instrument watchlist, candle history cache.
- `marketPriceStore.ts`: High-frequency bid/ask/last price dictionary updated on every ticker message.
- `journalStore.ts`: Trade journal entries, trade tags, equity curve history, consistency metrics.
- `alertStore.ts`: Price alerts, technical cross alerts, alert trigger history.
- `replayStore.ts`: Market replay state, playback speed, paused state, historical cursor.

### Canvas Component Architecture
- `Chart.tsx`: Main chart component containing single/multi chart grid logic (`SingleChartCell`), canvas mouse overlay for custom line drawing, order line dragging, indicator rendering, and timeframe listeners.
- `QuantumMenu.tsx`: Institutional dark slide-out navigation panel providing quick access to account balance summary, workspaces, intelligence modules, and preferences.
- `MobileLayout.tsx`: Mobile-first responsive wrapper rendering the touch-optimized chart viewport, floating FAB buttons, slide-up order tickets, and bottom navigation.

---

## 3. Backend Subsystems (`/backend/app`)

- `main.py`: Application entry point initializing FastAPI, CORS middleware, static mounts, router registration, and DB database initialization.
- `api/`: REST API modules:
  - `auth.py`: Authentication, JWT generation, password verification.
  - `orders.py` & `positions.py`: Order submission, cancellation, active position management.
  - `market_data.py`: Historical candle retrieval and ticker snapshots.
  - `journals.py`: Trade journal logging and performance statistics.
  - `ai.py`: AI market analyst and copilot API integrations.
  - `workspace.py`: Workspace layout save and cloud sync endpoints.
- `websocket/`: Real-time WebSocket connection handlers for live tick distribution and order updates.
- `services/`: Core logic modules:
  - `trading_engine.py`: In-memory paper order matching engine.
  - `smart_order_router.py`: Algorithmic order router simulation.
  - `orderflow/`: Orderbook DOM depth and volume profile aggregation.

---

## 4. Security & Authentication Model

- Authentication uses JWT tokens signed with `HS256`.
- Passwords are encrypted using `bcrypt` before database persistence.
- CORS policy is configured via environment settings.
