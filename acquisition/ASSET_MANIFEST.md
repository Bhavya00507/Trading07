# Quantum Terminal — Codebase Asset Manifest

## Overview
This manifest records codebase asset metrics, file counts, and component inventories across Quantum Terminal.

---

## 1. File & Component Inventory Summary

| Subsystem / Area | Path | File Count | Description |
|---|---|---|---|
| **Frontend Root** | `/src` | 10 Files | Main application components, entry points, and global styles. |
| **Frontend Components** | `/src/components` | 108 Files | Desktop panels, modals, drawers, and presentation components. |
| **Frontend Hooks** | `/src/hooks` | 12 Files | Custom React hooks (WS streams, account metrics, chart hooks). |
| **Frontend Services** | `/src/services` | 18 Files | API services, candle engine, broker adapters, branding. |
| **Frontend Stores** | `/src/store` | 8 Files | Zustand client stores (`appStore`, `marketStore`, etc.). |
| **Backend Core & Routers**| `/backend/app` | 28 Files | FastAPI endpoints, services, database ORM models, WebSockets. |
| **Backend Unit Tests** | `/backend/tests` | 35 Files | Pytest test suite (155 passing unit and integration tests). |
| **Documentation Package** | `/docs` | 10 Files | System architecture, setup, broker integration, and API guides. |
| **Acquisition Package** | `/acquisition` | 18 Files | Legal, IP audit, feature matrix, security, and due-diligence package. |
| **Root Configurations** | `/` | 24 Files | `.env.example`, `package.json`, `vite.config.ts`, `Dockerfile`, etc. |

**Total Project Inventory**: **~241 Files** across Frontend, Backend, Test Suite, and Documentation.
