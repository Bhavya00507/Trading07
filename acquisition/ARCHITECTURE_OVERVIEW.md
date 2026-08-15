# Quantum Terminal — Architecture Overview & Topology

## Overview
This document illustrates the architectural topology, data flow pipelines, and component boundaries of **Quantum Terminal**.

---

## 1. System Topology Diagram

```text
                               ┌──────────────────────────────────────────┐
                               │             USER INTERFACE               │
                               ├────────────────────┬─────────────────────┤
                               │ DESKTOP WORKSTATION│ QUANTUM MOBILE PRO  │
                               │ Multi-Chart Grid,  │ Touch Panning Canvas│
                               │ Level-2 DOM, Watch │ Drawer Navigation,  │
                               │ Order Ticket, Risk │ Slide-up Order Sheet│
                               └─────────┬──────────┴──────────┬──────────┘
                                         │                     │
                                         ▼                     ▼
                               ┌──────────────────────────────────────────┐
                               │           ZUSTAND STATE ENGINE           │
                               │ appStore | marketStore | marketPriceStore│
                               └─────────┬─────────────────────┬──────────┘
                                         │ HTTP REST           │ WebSockets
                                         ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          FASTAPI BACKEND ENGINE                         │
├──────────────────────┬───────────────────────┬──────────────────────────┤
│ REST API ROUTERS     │ WEBSOCKET STREAMING   │ SIMULATED TRADING ENGINE │
│ Auth, Orders, DB,    │ /ws/market-data       │ In-Memory Tick Matching, │
│ Positions, AI, SOR   │ /ws/orderflow         │ Margin, SL/TP Execution  │
└──────────┬───────────┴───────────┬───────────┴────────────┬─────────────┘
           │                       │                        │
           ▼                       ▼                        ▼
┌──────────────────────┐┌──────────────────────┐┌──────────────────────────┐
│ PERSISTENCE LAYER    ││ MARKET DATA GATEWAY  ││ BROKER ADAPTER INTERFACE │
│ SQLAlchemy 2.0 ORM   ││ Live WS Stream /     ││ `BrokerAdapter.ts`       │
│ SQLite / PostgreSQL  ││ Synthetic Tick Engine││ Demo / Exchange Adapter  │
└──────────────────────┘└──────────────────────┘└──────────────────────────┘
```

---

## 2. Component Integration Matrix

- **Canvas Charting (`Chart.tsx`)**: Receives candlestick history via REST (`/api/candles`) and high-frequency price updates via WebSocket. Renders candlestick layers, drawing overlays, and order line drag handles.
- **Paper Execution Engine (`trading_engine.py`)**: Intercepts order submissions, calculates required margin based on user leverage, models slippage, and executes fills on matching ticks.
- **Smart Order Router (`smart_order_router.py`)**: Demonstrates multi-venue order routing by splitting parent orders across simulated liquidity venues (Binance, Coinbase, Kraken, LMAX).
- **Market Data Gateway (`market_data.py`, `marketWebSocket.ts`)**: Streams ticker price updates to connected WebSocket clients; aggregates ticks into standard timeframe candles.
- **Quantum Mobile Pro (`MobileLayout.tsx`)**: Manages responsive touch interactions, isolating chart canvas gestures (`vertTouchDrag`, `horzTouchDrag`) from browser page scrolling.
