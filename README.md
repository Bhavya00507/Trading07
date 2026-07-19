# Trading Terminal

Professional production-grade real-time trading platform featuring a Windows Desktop Application (built with Electron) and a fully responsive installable Progressive Web App (PWA) React website, sharing a single centralized FastAPI backend powered by a PostgreSQL database.

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

## 🚀 Key Features

*   **Centralized PostgreSQL Database**: Shared state across web, mobile browser, and desktop clients for positions, orders, account history, watchlists, and balances.
*   **Fully Responsive Web Shell**: Touch-friendly terminal interface matching standard trading platform design systems (glowing status elements, clean grids, list panels).
*   **Immersive PWA (Progressive Web App)**: Service-worker caching for assets, local offline capability wrapper, and support for "Add to Home Screen" installation on iPhone and Android.
*   **Windows Desktop App**: Packaged via Electron, interfacing directly with the secure production API server.

## 🛠️ Project Directory Structure

```
├── backend/                  # FastAPI web server, database migrations (Alembic), and models
│   ├── app/                  # Main server application codebase
│   └── alembic/              # Database schema migrations versions
├── src/                      # React frontend codebase
│   ├── components/           # Terminal UI widgets (Charts, Watchlists, Position blocks)
│   ├── services/             # WebSocket connections and REST API endpoints
│   └── store/                # Zustand global client states (Account, Orders, Market feeds)
├── public/                   # Static PWA icon, manifest, and service worker shell
├── main.js                   # Electron main application thread
├── package.json              # Client dependencies and Electron compilation definitions
└── vite.config.ts            # Vite asset compilation pipelines
```

## ⚙️ Quick Start

### 1. Start the Central Backend
```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```

### 2. Start the Frontend (Vite)
```bash
npm install
npm run dev
```

### 3. Start the Desktop App (Electron)
```bash
npm run electron:dev
```
