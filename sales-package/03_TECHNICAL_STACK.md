# QUANTUM TERMINAL — TECHNICAL ARCHITECTURE & STACK

---

## 1. ARCHITECTURE OVERVIEW

Quantum Terminal is structured as a decoupled client-server web architecture:

Frontend: React 18 / TypeScript / Vite / Zustand / TradingView Lightweight Charts
Backend: Python 3.11/3.14 / FastAPI / AsyncIO / SQLAlchemy Async / WebSockets

---

## 2. FRONTEND TECHNICAL STACK

- **Framework**: React 18 (TypeScript)
- **Build System**: Vite v5.4
- **State Management**: Zustand
- **Charting Engine**: TradingView Lightweight Charts v4 + Custom HTML5 Canvas Overlay
- **Styling**: Vanilla CSS Design System (Dark institutional layout, modular CSS files per component)
- **PWA & Icons**: Manifest v3, Service Worker (sw.js), custom Quantum Terminal PWA icons (icon-192x192.png, icon-512x512.png)

---

## 3. BACKEND TECHNICAL STACK

- **Language / Runtime**: Python 3.11 / 3.14
- **Web Framework**: FastAPI (AsyncIO)
- **Application Server**: Uvicorn
- **Database / ORM**: SQLAlchemy Async (SQLite for development / PostgreSQL supported for production)
- **Data Streaming**: FastAPI Native WebSockets (/ws/market-data)
- **Authentication**: JWT (JSON Web Tokens) with Passlib & OAuth2 password bearer flow

---

## 4. TESTING & VERIFICATION STACK

- **Backend Test Suite**: Pytest (36 test suites covering auth, positions, replay, options, script engine, health, SOR)
- **End-to-End Screenshot Engine**: Playwright Chrome automation engine (generate_verified_screenshots_v9.js)

---

## 5. DEPLOYMENT & CONTAINERIZATION

- **Containerization**: Dockerfile, docker-compose.yml
- **Production Web Server**: NGINX (nginx.conf)
- **PaaS Deployment**: Procfile (Heroku/Render), railway.json (Railway)
