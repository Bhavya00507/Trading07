# Trading Terminal — Production Platform

A commercial-grade real-time multi-asset trading platform featuring a Windows Desktop Application (built with Electron) and a fully responsive Progressive Web App (PWA) React website, powered by a single centralized FastAPI + PostgreSQL backend.

```
                      Internet

              +----------------------+
              |   FastAPI Backend    |
              |     (PostgreSQL)     |
              +----------+-----------+
                         |
        +----------------+----------------+
        |                                 |
  React Web Client (PWA)           Electron Desktop
  (Mobile + Tablet + PC)             (Windows App)
```

---

## 📚 Commercial Documentation Suite

| Document | Description |
| :--- | :--- |
| 📖 **[INSTALL.md](file:///d:/Trading07/INSTALL.md)** | Step-by-step developer setup for Local, Docker, and Electron desktop builds |
| 🚀 **[DEPLOYMENT.md](file:///d:/Trading07/DEPLOYMENT.md)** | Production deployment guide for Vercel, Railway, Render, and PostgreSQL |
| 📡 **[API.md](file:///d:/Trading07/API.md)** | Complete REST API route specifications and WebSocket feed protocol details |
| 📝 **[CHANGELOG.md](file:///d:/Trading07/CHANGELOG.md)** | Release history and architectural milestone log |

---

## ⚡ Feature Matrix

*   **Multi-Asset Execution**: Trade Crypto, Forex, Indices, and Metals with real-time market data streaming.
*   **Order Engine**: Support for Market, Limit, Stop, Stop-Limit, TWAP, Iceberg, and Trailing Stop execution logic with netting and position reverse capabilities.
*   **Centralized State**: Multi-account management (Paper, Live, Binance, Bybit, MT5, Demo) synchronized across web browsers, mobile viewports, and desktop windows.
*   **Ultra-Responsive PWA**: Offline shell support, asset caching, service worker guards, and native Add-to-Home-Screen app capabilities.
*   **Security & JWT Auth**: Salted password hashing, JWT access & refresh tokens, automatic token renewal, and CORS middleware controls.

---

## 🛠️ Quick Start

```bash
# 1. Install & start backend (FastAPI)
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 2. Install & start web client (Vite React)
npm install
npm run dev

# 3. Start Desktop Application (Electron)
npm run electron:dev
```
