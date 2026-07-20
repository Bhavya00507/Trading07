# REST API & WebSocket Specifications

This document specifies the REST API routes, payloads, and WebSocket feed protocols provided by the **Trading Terminal** FastAPI backend.

---

## 🔐 1. Authentication Endpoints

### `POST /auth/register`
Create a new user account and seed initial trading sub-accounts (paper, live, binance, bybit, mt5).

**Request Body**:
```json
{
  "username": "charli",
  "email": "charli@example.com",
  "password": "123456789"
}
```

**Response (HTTP 201)**:
```json
{
  "message": "User registered successfully"
}
```

---

### `POST /auth/login`
Authenticate credentials and return JWT tokens.

**Request Body**:
```json
{
  "username": "charli",
  "password": "123456789"
}
```

**Response (HTTP 200)**:
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": "00000000-0000-0000-0000-000000000002",
    "username": "charli",
    "email": "charli@example.com",
    "role": "user"
  }
}
```

---

## 📊 2. System State & Trading Endpoints

### `GET /sync-state`
Fetch the complete state of active user accounts, open orders, open positions, trade history, and real-time market snapshots.

**Headers**: `Authorization: Bearer <access_token>`  
**Query Parameters**: `account_type=paper` (or `live`, `demo`)

**Response (HTTP 200)**:
```json
{
  "account": {
    "id": "...",
    "balance": 10000.0,
    "equity": 10000.0,
    "margin_used": 0.0,
    "free_margin": 10000.0,
    "account_type": "paper"
  },
  "accounts": [...],
  "orders": [...],
  "positions": [...],
  "history": [...],
  "market_snapshot": {
    "BTCUSDT": 65000.0,
    "ETHUSDT": 3500.0
  }
}
```

---

### `POST /buy` & `POST /sell`
Execute or place a market/limit order.

**Headers**: `Authorization: Bearer <access_token>`

**Request Body**:
```json
{
  "symbol": "BTCUSDT",
  "quantity": 0.1,
  "price": null,
  "stop_loss": 62000.0,
  "take_profit": 72000.0,
  "account_type": "paper"
}
```

---

## 📈 3. Market Data Endpoints

### `GET /market/instruments`
Fetch real-time categorized symbol catalog (crypto, forex, indices, metals).

### `GET /market/candles`
Fetch historical candlestick data.

**Query Parameters**:
- `symbol`: `BTCUSDT`
- `timeframe`: `1m`
- `limit`: `1000`

---

## ⚡ 4. WebSocket Feed Protocol

### `WS /ws/market`
Public and authenticated market tick data feed.

**Handshake**: `ws://<host>:8000/ws/market` (Optionally append `?token=<access_token>`)  
**Status**: `101 Switching Protocols`

**Streamed Broadcast Event Example**:
```json
{
  "type": "price_update",
  "symbol": "BTCUSDT",
  "price": 65420.5,
  "timestamp": 1784543566903
}
```

**Ping/Pong Keep-Alive**:
- **Client sends**: `{"type": "ping", "event_id": "123"}`
- **Server responds**: `{"type": "pong", "event_id": "123", "timestamp": 1784543566910}`
