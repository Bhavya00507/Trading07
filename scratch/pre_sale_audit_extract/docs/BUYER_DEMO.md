# Quantum Terminal — Buyer Presentation & Demo Mode Guide

## Overview
Quantum Terminal includes an institutional **Buyer Presentation & Demo Mode** designed for prospective acquirers, product managers, and software engineers to explore the platform safely and effectively.

---

## 1. Out-of-the-Box Demo Mode Features

- **No Credentials Required**: The system launches immediately without requiring third-party broker API keys or paid exchange data subscriptions.
- **● DEMO MODE Badge**: A subtle gold indicator badge in the header bar confirms that the application is operating in paper trading demonstration mode.
- **100% Safe Execution**: Order submissions create simulated executions against live/synthetic tick streams. Real order routing is disabled by default (`ENABLE_LIVE_ORDER_ROUTING=false`).

---

## 2. Interactive Presentation Tools

### Buyer Demo Dashboard
Accessed via the header badge or on initial first launch. Presents a compact, 12-card overview of all platform modules:
1. Workstation & Multi-Chart Canvas
2. Portfolio & Risk Analytics
3. Paper Order Execution
4. Order Flow & Level-2 DOM
5. Market Replay Studio
6. Institutional Options Desk
7. Smart Order Router (SOR)
8. Script Studio & Indicators
9. Autonomous AI Analyst
10. Market Data Gateway
11. Quantum Mobile Pro
12. Broker Adapter Gateway

### 8-Step Guided Product Tour
Click **🚀 Tour** in the header to launch the guided walkthrough:
- **Step 1**: Quantum Terminal Workstation
- **Step 2**: TradingView Canvas Charting
- **Step 3**: Paper Order Matching Engine
- **Step 4**: Options Analytics & Greeks
- **Step 5**: Market Data Gateway
- **Step 6**: Replay Studio
- **Step 7**: Script Studio Engine
- **Step 8**: Quantum Mobile Pro

*Controls*: `Skip`, `Previous`, `Next`, `Finish` (completion state saved to `localStorage`).

### Technical System Health Panel
Click **⚡ Health** to open the real-time diagnostic panel monitoring:
- **Frontend UI Engine**: `READY` (React 18 / Vite)
- **Backend REST API**: `READY (PORT 8000)` / `STANDALONE DEMO`
- **WebSocket Stream Manager**: `CONNECTED` (`/ws/market-data`)
- **Database Persistence**: `READY` (SQLite / PostgreSQL)
- **Market Data Feed**: `LIVE STREAM / SYNTHETIC`
- **Paper Execution Engine**: `SIMULATED MATCHING`
- **AI Engine**: `AVAILABLE (HEURISTICS)`
- **External Broker Adapter**: `INTEGRATION REQUIRED`

### Safe Demo Reset
Click **🔄 Reset** to restore the demo environment to default state:
- Resets paper account balance to **$100,000.00**.
- Clears active paper positions and orders.
- Restores workspace layout grid presets.
- Resets product tour completion flag.

---

## 3. Feature Status Badges

To maintain acquisition credibility and complete technical transparency, Quantum Terminal labels system capabilities with subtle badges:

- `PAPER EXECUTION` (Green/Gold): Operating via in-memory paper matching engine.
- `SIMULATED DATA` (Cyan): Operating via synthetic tick stream generator when offline.
- `INTEGRATION REQUIRED` (Purple): Provider interface supplied; live exchange credentials required for production routing.
