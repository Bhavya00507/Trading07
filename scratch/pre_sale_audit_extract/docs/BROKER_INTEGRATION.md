# Quantum Terminal — Broker & Exchange Integration Guide

## Overview
Quantum Terminal uses a provider interface pattern to decouple frontend UI components and backend order management from any specific broker API.

This enables buyers to integrate their own execution venues (e.g., Binance, Interactive Brokers, MetaTrader 5, cTrader, or custom FIX gateways) without rewriting the frontend.

---

## 1. Provider Adapter Interface (`BrokerAdapter.ts`)

The frontend interacts with execution venues through the `BrokerAdapter` interface defined in `src/services/BrokerAdapter.ts`:

```typescript
export interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface ExecutionReport {
  orderId: string;
  symbol: string;
  status: 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED';
  executedPrice: number;
  executedQuantity: number;
  timestamp: number;
}

export interface IBrokerAdapter {
  connect(credentials: Record<string, string>): Promise<boolean>;
  submitOrder(order: OrderRequest): Promise<ExecutionReport>;
  cancelOrder(orderId: string): Promise<boolean>;
  fetchPositions(): Promise<Position[]>;
  fetchAccountBalance(): Promise<AccountBalance>;
  subscribeFills(callback: (report: ExecutionReport) => void): void;
}
```

---

## 2. Implementing a Custom Broker Adapter

To connect to a live venue (e.g., Binance REST/WS API):

1. Create `src/services/adapters/BinanceBrokerAdapter.ts` implementing `IBrokerAdapter`.
2. Map standard `OrderRequest` fields to Binance API parameters.
3. Handle execution responses and invoke `subscribeFills` callbacks.
4. Register your new adapter in `src/services/BrokerAdapter.ts`.

---

## 3. Backend Live Routing Safeguards

- Set `ENABLE_LIVE_ORDER_ROUTING=true` in `backend/.env`.
- Ensure all live API keys (`BINANCE_API_KEY`, `BINANCE_API_SECRET`) are loaded securely through environment variables and never logged or exposed to client-side bundles.
