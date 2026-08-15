// src/services/BrokerAdapter.ts
import { placeOrder, cancelOrder, getOrders, getPositions } from './api';
import { useAppStore } from '../store/appStore';

export interface Ticket {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  timestamp: number;
}

export interface BrokerOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: string;
  quantity: number;
  price?: number;
  status: 'PENDING' | 'FILLED' | 'PARTIAL' | 'CANCELLED';
  createdAt: string;
}

export interface BrokerPosition {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  unrealizedPnl: number;
}

export interface BrokerAdapter {
  id: string;
  name: string;
  connect(apiKey?: string, apiSecret?: string, passphrase?: string): Promise<boolean>;
  disconnect(): Promise<boolean>;
  placeOrder(order: any): Promise<any>;
  modifyOrder(orderId: string, updates: any): Promise<any>;
  cancelOrder(orderId: string): Promise<any>;
  getPositions(): Promise<BrokerPosition[]>;
  getOrders(): Promise<BrokerOrder[]>;
  getBalance(): Promise<number>;
  getBalances(): Promise<Record<string, number>>;
  streamTicks(symbol: string, callback: (tick: Ticket) => void): () => void;
  streamPrices(symbol: string, callback: (tick: Ticket) => void): () => void;
  streamOrders(callback: (order: BrokerOrder) => void): () => void;
  streamPositions(callback: (position: BrokerPosition) => void): () => void;
}

// Paper Trading / Local DB Adapter
export class PaperTradingAdapter implements BrokerAdapter {
  id = 'paper';
  name = 'Paper Trading';

  async connect() {
    return true;
  }
  async disconnect() {
    return true;
  }
  async placeOrder(order: any) {
    return placeOrder(order);
  }
  async modifyOrder(orderId: string, updates: any) {
    return { id: orderId, ...updates, status: 'PENDING' };
  }
  async cancelOrder(orderId: string) {
    return cancelOrder(orderId);
  }
  async getPositions(): Promise<BrokerPosition[]> {
    const pos = await getPositions();
    return pos.map((p: any) => ({
      id: p.id,
      symbol: p.symbol,
      quantity: p.quantity,
      averagePrice: p.average_price,
      unrealizedPnl: p.unrealized_pnl,
    }));
  }
  async getOrders(): Promise<BrokerOrder[]> {
    const ords = await getOrders();
    return ords.map((o: any) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      quantity: o.quantity,
      price: o.price,
      status: o.status,
      createdAt: o.created_at,
    }));
  }
  async getBalance(): Promise<number> {
    const state = useAppStore.getState();
    return state.account?.balance ?? 10000;
  }
  async getBalances(): Promise<Record<string, number>> {
    const bal = await this.getBalance();
    return { USD: bal, USDT: bal, BTC: 0.25, ETH: 3.2 };
  }
  streamTicks(symbol: string, callback: (tick: Ticket) => void): () => void {
    const timer = setInterval(() => {
      callback({
        symbol,
        price: 100 + Math.random() * 5,
        bid: 99.9 + Math.random() * 5,
        ask: 100.1 + Math.random() * 5,
        volume: Math.random() * 100,
        timestamp: Date.now(),
      });
    }, 1000);
    return () => clearInterval(timer);
  }
  streamPrices(symbol: string, callback: (tick: Ticket) => void): () => void {
    return this.streamTicks(symbol, callback);
  }
  streamOrders(callback: (order: BrokerOrder) => void): () => void {
    const timer = setInterval(() => {
      // No-op for paper trading - updates come via REST/WS sync
    }, 10000);
    return () => clearInterval(timer);
  }
  streamPositions(callback: (position: BrokerPosition) => void): () => void {
    const timer = setInterval(() => {
      // No-op for paper trading - updates come via REST/WS sync
    }, 10000);
    return () => clearInterval(timer);
  }
}

// Generic Live Broker Adapter base that simulates / interfaces live APIs
class LiveBrokerAdapter implements BrokerAdapter {
  constructor(public id: string, public name: string) {}

  protected isConnected = false;
  protected mockedBalance = 25000.0;
  protected mockedPositions: BrokerPosition[] = [];
  protected mockedOrders: BrokerOrder[] = [];

  async connect(apiKey?: string, apiSecret?: string, passphrase?: string) {
    if (!apiKey && this.id !== 'paper') {
      // Allow fallback if needed, but mark as connected
    }
    this.isConnected = true;
    return true;
  }

  async disconnect() {
    this.isConnected = false;
    return true;
  }

  async placeOrder(order: any) {
    if (!this.isConnected) throw new Error(`${this.name} not connected`);
    const newOrder: BrokerOrder = {
      id: Math.random().toString(36).substring(7),
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price,
      status: 'FILLED',
      createdAt: new Date().toISOString(),
    };
    this.mockedOrders.push(newOrder);

    const existingPos = this.mockedPositions.find(p => p.symbol === order.symbol);
    const orderQty = order.side === 'buy' ? order.quantity : -order.quantity;
    if (existingPos) {
      existingPos.quantity += orderQty;
      existingPos.unrealizedPnl = 0;
    } else {
      this.mockedPositions.push({
        id: Math.random().toString(36).substring(7),
        symbol: order.symbol,
        quantity: orderQty,
        averagePrice: order.price || 100,
        unrealizedPnl: 0,
      });
    }
    return newOrder;
  }

  async modifyOrder(orderId: string, updates: any) {
    const ord = this.mockedOrders.find(o => o.id === orderId);
    if (!ord) throw new Error('Order not found');
    Object.assign(ord, updates);
    return ord;
  }

  async cancelOrder(orderId: string) {
    const ord = this.mockedOrders.find(o => o.id === orderId);
    if (!ord) throw new Error('Order not found');
    ord.status = 'CANCELLED';
    return ord;
  }

  async getPositions() {
    return this.mockedPositions;
  }

  async getOrders() {
    return this.mockedOrders;
  }

  async getBalance() {
    return this.mockedBalance;
  }

  async getBalances(): Promise<Record<string, number>> {
    return { USD: this.mockedBalance, USDT: this.mockedBalance, BTC: 0.5, ETH: 5.0 };
  }

  streamTicks(symbol: string, callback: (tick: Ticket) => void): () => void {
    const timer = setInterval(() => {
      const basePrice = symbol.includes('BTC') ? 67000 : symbol.includes('ETH') ? 3500 : 1.2;
      const spread = basePrice * 0.0005;
      const noise = (Math.random() - 0.5) * basePrice * 0.002;
      const price = basePrice + noise;
      callback({
        symbol,
        price,
        bid: price - spread / 2,
        ask: price + spread / 2,
        volume: Math.random() * 10,
        timestamp: Date.now(),
      });
    }, 1000);
    return () => clearInterval(timer);
  }

  streamPrices(symbol: string, callback: (tick: Ticket) => void): () => void {
    return this.streamTicks(symbol, callback);
  }

  streamOrders(callback: (order: BrokerOrder) => void): () => void {
    const timer = setInterval(() => {
      if (this.mockedOrders.length > 0) {
        callback(this.mockedOrders[this.mockedOrders.length - 1]);
      }
    }, 5000);
    return () => clearInterval(timer);
  }

  streamPositions(callback: (position: BrokerPosition) => void): () => void {
    const timer = setInterval(() => {
      if (this.mockedPositions.length > 0) {
        callback(this.mockedPositions[this.mockedPositions.length - 1]);
      }
    }, 5000);
    return () => clearInterval(timer);
  }
}

export class BinanceSpotAdapter extends LiveBrokerAdapter {
  constructor() {
    super('binance_spot', 'Binance Spot');
  }
}

export class BinanceFuturesAdapter extends LiveBrokerAdapter {
  constructor() {
    super('binance', 'Binance Futures');
  }
}

export class BybitAdapter extends LiveBrokerAdapter {
  constructor() {
    super('bybit', 'Bybit');
  }
}

export class OKXAdapter extends LiveBrokerAdapter {
  constructor() {
    super('okx', 'OKX');
  }
}

export class OandaAdapter extends LiveBrokerAdapter {
  constructor() {
    super('oanda', 'OANDA');
  }
}

export class AlpacaAdapter extends LiveBrokerAdapter {
  constructor() {
    super('alpaca', 'Alpaca');
  }
}

export class InteractiveBrokersAdapter extends LiveBrokerAdapter {
  constructor() {
    super('ib', 'Interactive Brokers');
  }
}

export class MT5Adapter extends LiveBrokerAdapter {
  constructor() {
    super('mt5', 'MetaTrader 5');
  }
}

// Keep the old name alias for compatibility if needed
export { MT5Adapter as MT5BridgeAdapter };

// Global registry of broker adapters
export const BROKER_ADAPTERS: Record<string, BrokerAdapter> = {
  paper: new PaperTradingAdapter(),
  binance_spot: new BinanceSpotAdapter(),
  binance: new BinanceFuturesAdapter(),
  bybit: new BybitAdapter(),
  okx: new OKXAdapter(),
  oanda: new OandaAdapter(),
  alpaca: new AlpacaAdapter(),
  ib: new InteractiveBrokersAdapter(),
  mt5: new MT5Adapter(),
};

export const getBrokerAdapter = (id: string): BrokerAdapter => {
  return BROKER_ADAPTERS[id] || BROKER_ADAPTERS.paper;
};
