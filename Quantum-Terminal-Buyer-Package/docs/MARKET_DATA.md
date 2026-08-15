# Quantum Terminal — Market Data Gateway Guide

## Overview
Quantum Terminal receives high-frequency market data through a centralized Market Data Gateway.

---

## 1. WebSocket Protocol Specifications

The frontend WebSocket connection is established at:
`ws://127.0.0.1:8000/ws/market-data`

### Subscribing to Tickers & Orderbook
```json
{
  "action": "subscribe",
  "symbol": "BTCUSDT",
  "timeframe": "1m"
}
```

### Incoming Ticker Message Format
```json
{
  "type": "ticker",
  "symbol": "BTCUSDT",
  "price": 63520.50,
  "bid": 63520.00,
  "ask": 63521.00,
  "volume": 1450.25,
  "timestamp": 1723715400
}
```

### Incoming Candle Bar Message Format
```json
{
  "type": "candle",
  "symbol": "BTCUSDT",
  "timeframe": "1m",
  "candle": {
    "timestamp": 1723715400,
    "open": 63500.00,
    "high": 63550.00,
    "low": 63480.00,
    "close": 63520.50,
    "volume": 42.15
  }
}
```

---

## 2. Integrating External Data Providers

To connect a commercial data feed (e.g., Finnhub, TwelveData, Polygon.io, or Direct Exchange Feeds):

1. Update `backend/app/services/market_data.py` to route WebSocket subscriptions to your data provider's endpoint.
2. Store feed credentials in `backend/.env` (`FINNHUB_API_KEY`, etc.).
3. The frontend candle engine (`candleEngine.ts`) automatically receives the standardized ticker payload and aggregates candles.
