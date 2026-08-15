# QUANTUM TERMINAL — BUYER HANDOFF & ACQUISITION DOCUMENTATION

**Product**: Quantum Terminal & Quantum Mobile Pro  
**Version**: 1.0.0 (Buyer Presentation Release)  
**Date**: August 15, 2026  
**License Notice**: *Draft — final acquisition/license terms must be agreed between buyer and seller.*

---

## 1. PRODUCT OVERVIEW

**Quantum Terminal** is an institutional-grade, multi-asset trading terminal platform designed for prop trading firms, quantitative hedge funds, brokerages, and fintech platforms. It delivers a modern, high-density desktop workstation experience alongside **Quantum Mobile Pro**, a touch-optimized mobile trading platform.

The platform provides a complete foundation including multi-asset charting, technical indicator libraries, paper trading execution engines, market replay simulation, options analytics desks, custom strategy scripting (QScript), level-2 DOM orderbook ladders, and diagnostic system monitoring.

---

## 2. ARCHITECTURE & TECHNOLOGY STACK

```
┌────────────────────────────────────────────────────────────────────────┐
│                        QUANTUM TERMINAL CLIENT                         │
│  React 18 | TypeScript | Vite | Zustand State | Lightweight Charts     │
│  Desktop Workstation Pane Engine   │   Quantum Mobile Pro Viewport     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSocket / REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                        FASTAPI BACKEND ENGINE                          │
│  Python 3.11/3.14 | FastAPI | SQLAlchemy Async | SQLite / PostgreSQL   │
├────────────────────────────────────────────────────────────────────────┤
│  • Paper Execution Engine              • Market Replay Engine          │
│  • Options & Greeks Calculator         • Script Engine & Sandbox       │
│  • WebSocket Market Data Stream        • System Health Diagnostics     │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Technologies
- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS Design System, Zustand, TradingView Lightweight Charts.
- **Backend**: Python 3.11/3.14, FastAPI, AsyncIO, SQLAlchemy Async, SQLite (Local Dev) / PostgreSQL (Production).
- **Automation & Testing**: Playwright E2E Verification Engine, Pytest Automated Suite (155+ tests).

---

## 3. MAJOR MODULES & FUNCTIONALITY CLASSIFICATION

| Module | Classification | Description |
|--------|----------------|-------------|
| **Desktop Workstation** | `WORKING` | Multi-pane trading interface with drag-and-drop workspace layout, command palette, and header toolbar. |
| **Quantum Mobile Pro** | `WORKING` | Dedicated mobile viewport with candle chart, indicator toolbar, drawing tools, and touch bottom navigation. |
| **Charting & Indicators** | `WORKING` | Multi-timeframe charting engine with 10+ institutional technical indicators (EMA, SMA, RSI, VWAP, MACD, etc.). |
| **Paper Execution** | `WORKING` | Order panel supporting Market/Limit orders, SL/TP protection, and real-time position state management. |
| **Portfolio & Risk** | `WORKING` | Account balance, equity, margin level tracking, drawdown risk lab, and open positions table. |
| **Replay Studio** | `WORKING` | Historical candle replay engine with step playback controls and replay order desk. |
| **Options Desk** | `WORKING` | Options chain matrix displaying Call/Put contracts, Strike prices, Implied Volatility, and Greeks calculations. |
| **Script Studio** | `WORKING` | Pine-style strategy editor with sandbox runtime compiler, AI code generator prompt, and backtesting. |
| **Market Data Gateway** | `DEMO / SIMULATED` | Live Binance WebSocket feed combined with synthetic fallback quote generator for non-crypto assets. |
| **System Health** | `WORKING` | Real-time diagnostic modal monitoring REST API, WebSocket Manager, Database, and Execution Engine status. |
| **Broker Integration** | `EXTERNAL INTEGRATION REQUIRED` | Extensible broker adapter architecture (Binance, IBKR, FIX 4.4). Requires buyer live broker API credentials. |

---

## 4. SETUP & LOCAL DEVELOPMENT INSTRUCTIONS

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11 or higher
- **Git**

### Step 1: Clone & Install Frontend
```bash
# Install frontend dependencies
npm install
```

### Step 2: Set Up Backend Environment
```bash
# Create virtual environment (optional)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python backend dependencies
pip install -r backend/requirements.txt

# Create local environment configuration
cp backend/.env.example backend/.env
```

### Step 3: Run Development Server
```bash
# Option A: Launch full platform (Frontend + FastAPI Backend concurrently)
npm run quantum

# Option B: Run components individually
# Terminal 1: Run Frontend
npm run dev

# Terminal 2: Run FastAPI Backend
cd backend && uvicorn app.main:app --reload --port 8000
```

---

## 5. WHITE-LABEL REBRANDING & CUSTOMIZATION

The platform includes a zero-code white-label branding system via `public/branding.json`:

```json
{
  "appName": "Quantum Terminal",
  "companyName": "Quantum Capital Technologies",
  "tagline": "Institutional Multi-Asset Trading Terminal",
  "logoUrl": "/logo.svg",
  "accentColor": "#00f0ff",
  "secondaryColor": "#7000ff",
  "backgroundColor": "#090d16",
  "cardBgColor": "#121824",
  "supportEmail": "support@quantumterminal.io",
  "websiteUrl": "https://quantumterminal.io",
  "copyright": "© 2026 Quantum Capital Technologies Inc."
}
```
Modifying `public/branding.json` instantly customizes the application title, brand accent colors, company copyright, and support links without needing to recompile React source code.

---

## 6. KNOWN LIMITATIONS & BUYER DISCLOSURE

> [!WARNING]
> **REGULATORY & PRODUCTION NOTICE**: Quantum Terminal is provided as a software prototype and technical platform foundation. It is **NOT** a regulated brokerage service, clearing firm, or financial advisory platform out-of-the-box. The purchasing buyer assumes full responsibility for integrating regulated brokerage execution APIs, obtaining financial licenses, complying with SEC/FINRA/FCA/ESMA regulations, and securing production infrastructure.

- **Standalone Demo Mode**: Out-of-the-box order execution operates in paper/simulated matching mode to allow safe exploration without broker credentials.
- **Market Data Feeds**: Live streaming is enabled for crypto via Binance WebSockets; non-crypto assets (FX, Indices, Commodities) utilize synthetic fallback generators unless buyer configures paid API keys (Finnhub, TwelveData).
- **AI Commentary**: The AI assistant UI operates via technical heuristic signal engines when `OPENAI_API_KEY` is omitted.

---

## 7. RECOMMENDED BUYER ENGINEERING ROADMAP

```
Phase 1: Acquisition & Handoff  ──►  Phase 2: Broker Integration  ──►  Phase 3: Security & Audit  ──►  Phase 4: Commercial Launch
• Codebase review & setup            • Connect live broker FIX/REST      • Penetration testing & SOC2         • Production deployment
• White-label branding setup         • Integrate paid market data feeds   • KYC/AML user onboarding integration • Client web/mobile launch
```
