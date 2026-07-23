# Quantum Terminal v1.0.0 — Closed Beta Tester Kit & Release Documentation

Official Closed Beta Package, Tester Guide, Feedback Template, and Bug Reporting Protocol for **Quantum Terminal v1.0.0 Beta**.

---

## 1. Beta Tester Onboarding & Quick Start Guide

Welcome to the **Quantum Terminal v1.0.0 Closed Beta**! Quantum Terminal is an institutional-grade, multi-broker trading workstation designed for speed, level 2 market depth analysis, algorithmic risk management, and AI trade assistance.

### Step 1: Installation & Setup
1. Download the official installer: `Quantum Terminal Setup 1.0.0.exe`.
2. Double-click `Quantum Terminal Setup 1.0.0.exe` to run the installation wizard.
3. The installer creates a desktop icon and Start Menu shortcut: **Quantum Terminal**.
4. Double-click the application icon to launch. The embedded backend process boots automatically in the background.

### Step 2: First-Time Login & Account Access
1. Upon launching, the authentication screen appears.
2. Log in with your beta credentials or click **Create Account** to register a new account.
3. Once logged in, your initial **Simulated Paper Trading Account** ($10,000 balance) is automatically active.

### Step 3: Broker Connection (Optional)
1. Click the **User Account Dropdown** in the top-right header or open the **Broker Manager** panel.
2. Select your preferred broker:
   - **MetaTrader 5 (MT5)**: Input Account Number, Password, Server Name, and MT5 Terminal Path.
   - **Binance / Bybit**: Input API Key & Secret Key.
   - **Alpaca / Interactive Brokers**: Select Broker and save credentials.
3. Click **Connect** to verify live connection status.

---

## 2. Beta Release Notes (v1.0.0-beta)

### Features Included in Beta 1.0
- ⚡ **Multi-Broker Execution**: Native Paper Trading, MetaTrader 5 (MT5), Binance, Bybit, Alpaca, IBKR.
- 📊 **Lightweight Charts Engine**: High-FPS candlestick/line charts, SMA/EMA/RSI/MACD indicators, drawing tools, and multi-timeframe analysis (1m to 1D).
- 🎯 **Order Execution Suite**: Market, Limit, Stop, OCO, TWAP, and Iceberg orders with leverage selection (1x to 100x).
- 🛡 **Risk & Position Management**: Dynamic lot sizing, floating PnL tracking, partial close, break-even toggle, and trailing stops.
- 🤖 **AI Market Copilot**: Real-time chart pattern detection, sentiment scoring, and natural-language trade breakdowns.
- 📈 **Backtesting & Strategy Replay**: Strategy builder, historical tick replay, win rate calculation, drawdown analysis, and CSV export.
- 💼 **Options Chain & Greeks**: Options chain matrix with Delta, Gamma, Theta, Vega, IV, and PCR calculations.

---

## 3. Known Issues & Limitations (Beta 1.0)

1. **Interactive Brokers (IBKR TWS)**: Requires TWS (Trader Workstation) or IB Gateway running locally on port 7497/4002.
2. **GoldAPI Rate Limits**: Gold/Silver quote feeds fall back to Yahoo Finance data feeds if API rate limit triggers.
3. **Multi-Monitor Windows**: Full multi-window detachable layout is scheduled for Version 1.1.

---

## 4. Bug Report Template

If you encounter an issue or crash during testing, please submit a bug report using the format below:

```markdown
### Bug Title: [Brief summary of the issue]

- **OS / Platform**: Windows 11 / Windows 10 / Web Browser
- **App Version**: v1.0.0-beta
- **Account Type**: Paper / MT5 / Binance / Bybit
- **Severity**: Critical (App Crash) / High (Order Failure) / Medium (UI Glitch) / Low (Typo)

#### Steps to Reproduce:
1. Go to [Panel Name]
2. Click on [Button Name]
3. Input [Value]
4. Observe error

#### Expected Behavior:
[What should have happened]

#### Actual Behavior:
[What actually happened + Console error log if available]
```

---

## 5. Feedback Form Template

```markdown
### Beta Tester Feedback

1. **Overall Rating (1-10)**: [ Rating ]
2. **Favorite Feature**: [ Charting / Multi-Broker / DOM / AI Copilot / Order Entry ]
3. **Execution Speed Rating**: [ Excellent / Good / Fair / Poor ]
4. **UI & Usability Feedback**: [ Comments ]
5. **Feature Requests for v1.1**: [ Comments ]
```
