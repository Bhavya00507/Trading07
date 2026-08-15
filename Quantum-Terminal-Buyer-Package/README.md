# QUANTUM TERMINAL — INSTITUTIONAL MULTI-ASSET TRADING PLATFORM

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │   QUANTUM TERMINAL v1.0.0 (BUYER PRESENTATION RELEASE)                 │
 │   ● DEMO MODE ENABLED | REAL-TIME MULTI-ASSET WORKSTATION               │
 └────────────────────────────────────────────────────────────────────────┘
```

**Quantum Terminal** is an institutional-grade, multi-asset trading platform designed for prop trading firms, quantitative hedge funds, brokerages, and fintech platforms. It delivers a modern, high-density desktop workstation experience alongside **Quantum Mobile Pro**, a touch-optimized mobile trading interface.

---

## 1. WHAT IS INCLUDED

The buyer acquisition package includes the complete source code, backend services, verified presentation screenshots, due-diligence documentation, and deployment configurations:

- **Desktop Workstation**: React 18 multi-pane desktop interface with dockable layout, header toolbar, and quick command palette.
- **Quantum Mobile Pro**: Touch-optimized mobile workstation viewport with candle charting, drawing tools, and bottom navigation.
- **Charting & Indicators**: Multi-timeframe charting engine (1s to 1W) with 10+ technical indicators (EMA, SMA, RSI, VWAP, MACD, etc.).
- **Paper Execution Engine**: Order entry panel supporting Market/Limit orders, Stop Loss (SL), Take Profit (TP), and execution logs.
- **Portfolio & Risk Desk**: Balance, equity, margin level monitoring (e.g. 817.42%), drawdown risk lab, and open positions table.
- **Market Replay Studio**: Historical candle replay engine with step playback controls and dedicated replay order desk.
- **Options Desk**: Call/Put options chain matrix displaying Strike prices, Delta, Implied Volatility (IV), OI, and Greeks calculator.
- **Script Studio**: Pine-style QScript strategy editor with sandbox compiler, AI code generator prompt, and strategy backtester.
- **Market Data Gateway**: Live Binance WebSocket stream combined with synthetic fallback price generator covering Crypto, FX, Indices, and Metals.
- **Level-2 DOM Ladder**: Orderbook DOM depth ladder visualization and simulated order routing.
- **FastAPI Backend Services**: Python FastAPI REST API, WebSocket stream manager `/ws/market-data`, and SQLAlchemy async persistence engine.
- **Verified Buyer Screenshots**: 12 verified high-resolution presentation screenshots and 4x3 overview contact sheet (`buyer-demo/`).
- **Acquisition Documentation**: Architectural guides, due-diligence reports, feature classification matrix, and buyer handoff package (`docs/`, `acquisition/`).

---

## 2. INSTALLATION & SETUP

### System Requirements
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11 or higher
- **Git**

### Installation Commands
```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies (in python environment)
pip install -r backend/requirements.txt

# 3. Create environment configuration from template
cp backend/.env.example backend/.env
```

---

## 3. HOW TO RUN THE PLATFORM

### Option A: Run Full Platform (Frontend + Backend Concurrently)
```bash
npm run quantum
```

### Option B: Run Backend Server Only
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
Backend API will be live at: `http://127.0.0.1:8000` (Swagger UI: `http://127.0.0.1:8000/docs`)

### Option C: Run Frontend Client Only
```bash
npm run dev
```
Frontend Workstation will be live at: `http://localhost:5173`

---

## 4. DEMO MODE & SAFELAB EXPLORATION

By default, Quantum Terminal operates in **DEMO MODE** out-of-the-box:
- **No Broker Credentials Required**: Explore all workstation features safely without real exchange keys or broker logons.
- **Simulated Order Execution**: Orders placed in the terminal match against paper liquidity without financial risk.
- **Safe State Reset**: Click the `● DEMO MODE` header badge or `Reset` button to reset paper balance to $10,000.00.

---

## 5. DOCUMENTATION & BUYER ASSET LOCATIONS

| Deliverable Package | Location Path | Content Description |
|---------------------|---------------|---------------------|
| **Buyer Handoff Guide** | [`BUYER_HANDOFF.md`](file:///d:/Trading07/BUYER_HANDOFF.md) | Technical setup, architecture, and customization roadmap. |
| **Feature Classification Matrix** | [`FEATURE_MATRIX.md`](file:///d:/Trading07/FEATURE_MATRIX.md) | Complete module status breakdown (`WORKING`, `DEMO/SIMULATED`, `EXTERNAL REQUIRED`). |
| **Known Limitations** | [`docs/KNOWN_LIMITATIONS.md`](file:///d:/Trading07/docs/KNOWN_LIMITATIONS.md) | Prototype disclosures and regulatory integration requirements. |
| **Acquisition Audit Package** | [`acquisition/`](file:///d:/Trading07/acquisition/) | 18 technical due-diligence audit documents. |
| **Verified Buyer Screenshots** | [`buyer-demo/screenshots/`](file:///d:/Trading07/buyer-demo/screenshots/) | 12 verified PNG workstation screenshots (Zero login screens). |
| **Presentation Contact Sheet** | [`buyer-demo/presentation/quantum-terminal-screenshot-overview.png`](file:///d:/Trading07/buyer-demo/presentation/quantum-terminal-screenshot-overview.png) | 4x3 high-resolution overview contact sheet. |

---

## 6. CREDENTIALS & COMPONENT CLASSIFICATION

### Components Requiring External Credentials for Live Operation
- **Live Broker Execution**: Connecting to Binance, Interactive Brokers, or FIX 4.4 gateways for live market routing requires buyer API keys (`BINANCE_API_KEY`, `BINANCE_API_SECRET`, etc.).
- **Institutional Paid Data Feeds**: Accessing live equity/forex feeds via Finnhub or TwelveData requires paid API keys (`FINNHUB_API_KEY`, `TWELVEDATA_API_KEY`).
- **OpenAI Integration**: Advanced AI assistant models require `OPENAI_API_KEY`.

### Components Operating in Demo / Simulated Mode
- **Paper Execution Engine**: Matches market and limit orders locally against paper orderbooks.
- **Synthetic Quote Feed Generator**: Supplies realistic tick data for non-crypto assets when external paid feed keys are omitted.
- **Technical AI Heuristic Engine**: Generates market commentary and signal analysis when `OPENAI_API_KEY` is omitted.
- **Smart Order Router DOM Ladder**: Simulates multi-venue routing and depth ladder matching.

---

## 7. LICENSE & COPYRIGHT

License terms are specified in [`LICENSE.txt`](file:///d:/Trading07/LICENSE.txt):
*Draft — final acquisition/license terms must be agreed between buyer and seller.*
