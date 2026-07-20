# Changelog

All notable changes to the **Trading Terminal** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-20

### 🚀 Production Architecture Release
- **Unified Centralized Backend**: Complete migration from local SQLite per-device instances to a production-grade FastAPI application with asynchronous PostgreSQL engine support (`sqlalchemy.ext.asyncio`).
- **Progressive Web App (PWA)**: Implemented PWA web app manifest (`manifest.json`), service worker offline shell caching (`sw.js`), and Apple/Android Add-to-Home-Screen app capabilities.
- **Cross-Platform Delivery**: Single React codebase powering the responsive web client (Desktop, Tablet, Mobile) and the Electron Windows Desktop Application.

### ✨ Features & Modules
- **Authentication**: JWT access and refresh token authentication system with SHA-256 salted password hashing, automatic token refresh, and role-based permissions (`user`, `admin`, `trader`).
- **Market Data Engine**: Real-time WebSocket feed (`/ws/market`) broadcasting live price ticks and candle OHLC data for Crypto, Forex, Indices, and Metals.
- **Trading Engine**: Complete order execution engine supporting Market, Limit, Stop, Stop-Limit, TWAP, Iceberg, and Trailing Stop orders with leverage bounds and margin safety calculation.
- **Multi-Account Management**: Isolated support for Paper, Live, Binance, Bybit, MT5, and Demo trading accounts with real-time balance, equity, and margin tracking.
- **Responsive Layout**: Native-feeling mobile trading UI with bottom navigation, touch-optimized order ticket drawers, collapsible watchlists, and orientation-aware chart scaling.

### 🛡️ Security & Performance
- **CORS & Preflight**: Robust CORS middleware configuration supporting wildcard cross-origin resource sharing, dynamic LAN IP resolving, and credential handshakes.
- **Database Migrations**: Automatic Alembic database migration runner with auto-stamping and schema versioning.
- **Optimized Bundling**: Code splitting and manual chunking in Vite (`react-vendor`, `charts-vendor`, `state-vendor`).
- **Cache Self-Cleaning**: Client-side inline cache purging script preventing stale module script hash mismatches.

---

## [0.9.0] - 2026-07-15

### 🔧 Pre-Release Iteration
- Integrated Lightweight Charts library with custom technical indicator overlays (SMA, EMA, RSI, MACD, Bollinger Bands).
- Implemented Zustand global stores for Account, Orders, Positions, Trade History, Alerts, and Market feeds.
- Added support for dark theme glassmorphism design system.
