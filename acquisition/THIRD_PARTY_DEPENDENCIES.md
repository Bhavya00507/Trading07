# Quantum Terminal — Third-Party Dependency Inventory

## Overview
This document contains the exact inventory of third-party software dependencies extracted from `package.json` and `backend/requirements.txt`.

---

## 1. Node.js Production Dependencies (`package.json`)

```json
{
  "@tanstack/react-query": "^5.101.0",
  "electron-log": "^5.4.4",
  "electron-updater": "^6.8.9",
  "immer": "^11.1.8",
  "lightweight-charts": "^4.0.0",
  "playwright-core": "^1.61.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "uuid": "^9.0.0",
  "zustand": "^4.4.0"
}
```

---

## 2. Node.js Development Dependencies (`package.json`)

```json
{
  "@types/react": "^18.2.14",
  "@types/react-dom": "^18.2.6",
  "@types/uuid": "^10.0.0",
  "@typescript-eslint/eslint-plugin": "^8.62.1",
  "@typescript-eslint/parser": "^8.62.1",
  "@vitejs/plugin-react": "^4.0.0",
  "electron": "^43.1.0",
  "electron-builder": "^26.15.3",
  "eslint": "^8.50.0",
  "eslint-plugin-react": "^7.33.2",
  "eslint-plugin-react-hooks": "^7.1.1",
  "typescript": "^5.2.2",
  "vite": "^5.0.0"
}
```

---

## 3. Python Backend Dependencies (`backend/requirements.txt`)

```text
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
psycopg[binary]
asyncpg
python-dotenv
pyjwt
websockets
httpx
pydantic
pytest
pytest-asyncio
alembic
```
