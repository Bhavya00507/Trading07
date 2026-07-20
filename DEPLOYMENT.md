# Production Deployment Guide

This document outlines the deployment strategy for releasing the **Trading Terminal** platform to commercial production infrastructure using **Vercel** (Frontend), **Railway** or **Render** (Backend), and **PostgreSQL** (Managed Database).

---

## 🏗️ Architecture Blueprint

```
                      Internet
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
   Vercel / Netlify               Railway / Render
(React PWA Frontend)            (FastAPI Backend)
        │                                 │
        └────────────────┬────────────────┘
                         ▼
               Managed PostgreSQL Database
```

---

## 🐘 1. Managed Database (PostgreSQL)

1.  Provision a managed PostgreSQL database instance (e.g., Railway PostgreSQL, Render PostgreSQL, Supabase, or AWS RDS).
2.  Obtain the connection URI formatted for `asyncpg` / `psycopg`:
    ```
    postgresql+asyncpg://user:password@host:5432/dbname
    ```
3.  Set `DATABASE_URL` in your backend environment variables to this connection URI.

---

## 🚀 2. Backend Deployment (Railway / Render)

### Option A: Deploying to Railway
1.  Connect your GitHub repository to Railway.
2.  Set the root directory or service path to the repository root.
3.  Railway automatically detects `Dockerfile` or `railway.json`.
4.  Configure the environment variables in Railway Dashboard:
    *   `DATABASE_URL`: `postgresql+asyncpg://...`
    *   `JWT_SECRET`: `your-secure-64-character-random-hex-string`
    *   `PORT`: `8000`
5.  Deploy the service. Railway will generate a public HTTPS URL (e.g. `https://trading07-production.up.railway.app`).

### Option B: Deploying to Render
1.  Create a **Web Service** on Render connected to your repository.
2.  Build Command: `pip install -r backend/requirements.txt`
3.  Start Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4.  Set environment variables:
    *   `DATABASE_URL`: `postgresql+asyncpg://...`
    *   `JWT_SECRET`: `your-secure-64-character-random-hex-string`
5.  Deploy the service.

---

## 🌐 3. Frontend Deployment (Vercel)

1.  Import your GitHub repository to **Vercel**.
2.  Framework Preset: **Vite**
3.  Build Command: `npm run build`
4.  Output Directory: `dist`
5.  Set Environment Variable in Vercel:
    *   `VITE_API_BASE_URL`: `https://your-backend-production-url.railway.app`
6.  Deploy. Vercel will automatically provision HTTPS, CDN caching, and continuous deployment on git pushes.

---

## 🔒 4. Production Security Checklist

- [x] Enforce HTTPS and WSS for all API endpoints and WebSocket streams.
- [x] Configure production `JWT_SECRET` with strong entropy.
- [x] Verify CORS middleware origins restrict access to authorized domain origins (`allow_origin_regex`).
- [x] Enable automatic database connection pooling and Alembic migration upgrades on startup.
- [x] Set up database backups and WAL archiving.
