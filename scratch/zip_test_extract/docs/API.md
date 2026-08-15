# Quantum Terminal — REST & WebSocket API Specification

## 1. REST API Endpoints

### Authentication
- `POST /api/auth/login`: Authenticate user and return JWT access token.
- `POST /api/auth/register`: Register new user account.
- `GET /api/auth/me`: Get current user profile and permissions.

### Orders & Execution
- `POST /api/orders`: Submit new paper order (Market, Limit, Stop, Stop-Limit).
- `GET /api/orders`: Retrieve active and past order history.
- `DELETE /api/orders/{order_id}`: Cancel pending order.

### Positions & Portfolio
- `GET /api/positions`: Fetch current open positions and unrealized PnL.
- `POST /api/positions/close`: Close position for symbol immediately.
- `GET /api/portfolio/summary`: Account balance, equity, margin, free margin, drawdown.

### Market Data & History
- `GET /api/candles`: Fetch historical OHLCV candles (`symbol`, `timeframe`, `limit`).
- `GET /api/market/symbols`: Get list of supported trading pairs.

### Workspaces & Settings
- `GET /api/workspace`: Load user workspace layout configuration.
- `POST /api/workspace`: Save layout grid settings and indicator preferences.

---

## 2. WebSocket Endpoints

- `GET /ws/market-data`: Live tick & candle streaming feed.
- `GET /ws/orderflow`: Level-2 orderbook DOM depth and time-and-sales.
- `GET /ws/notifications`: Real-time order execution and risk alert pushes.
