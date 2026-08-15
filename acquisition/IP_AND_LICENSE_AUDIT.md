# Quantum Terminal — Intellectual Property & License Audit

> **Critical Acquisition Compliance Document**  
> *Prepared for legal counsel, intellectual property auditors, and technical acquisition teams.*

---

## 1. Proprietary Codebase Ownership

All original application source code contained within the `/src`, `/backend/app`, `/backend/tests`, and `/acquisition` directories constitutes proprietary intellectual property created for Quantum Terminal.

Upon completion of acquisition agreements, full intellectual property rights, source code ownership, and copyright transfers to the acquiring party.

---

## 2. Third-Party Software Dependency License Audit

All third-party open-source dependencies used in Quantum Terminal operate under permissive commercial licenses (MIT, BSD-3-Clause, Apache-2.0). **Zero copyleft or restrictive licenses (GPL/AGPL/LGPL) are utilized.**

### Frontend Dependency Audit (`package.json`)

| Package | Version | License | Commercial Concern | Buyer Action Required |
|---|---|---|---|---|
| `react` | `^18.2.0` | **MIT** | None (Fully Permissive) | None |
| `react-dom` | `^18.2.0` | **MIT** | None (Fully Permissive) | None |
| `typescript` | `^5.2.2` | **Apache-2.0** | None (Fully Permissive) | None |
| `vite` | `^5.0.0` | **MIT** | None (Fully Permissive) | None |
| `lightweight-charts` | `^4.0.0` | **BSD-3-Clause** | None (TradingView Open Source) | Retain TradingView copyright notice |
| `zustand` | `^4.4.0` | **MIT** | None (Fully Permissive) | None |
| `@tanstack/react-query`| `^5.101.0` | **MIT** | None (Fully Permissive) | None |
| `immer` | `^11.1.8` | **MIT** | None (Fully Permissive) | None |
| `uuid` | `^9.0.0` | **MIT** | None (Fully Permissive) | None |
| `electron` | `^43.1.0` | **MIT** | None (Fully Permissive) | None |

### Backend Dependency Audit (`backend/requirements.txt`)

| Package | License | Purpose | Commercial Concern | Buyer Action Required |
|---|---|---|---|---|
| `fastapi` | **MIT** | Web Framework | None (Permissive) | None |
| `uvicorn` | **BSD-3-Clause** | ASGI Server | None (Permissive) | None |
| `sqlalchemy` | **MIT** | Database ORM | None (Permissive) | None |
| `asyncpg` | **Apache-2.0** | PostgreSQL Async Driver | None (Permissive) | None |
| `pyjwt` | **MIT** | JWT Auth Tokens | None (Permissive) | None |
| `pydantic` | **MIT** | Data Validation | None (Permissive) | None |
| `pytest` | **MIT** | Test Framework | None (Permissive) | None |
| `alembic` | **MIT** | DB Migrations | None (Permissive) | None |

---

## 3. Fonts, Media Assets & Branding

- **Typography**: Uses system web-safe sans-serif fonts (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`) and monospace fonts.
- **Icons**: Uses inline SVG icons and native emoji glyphs. Zero licensed icon packs or paid font files are embedded.
- **Branding**: The name "Quantum Terminal" and associated visual styling are fully custom and available for buyer rebranding.
