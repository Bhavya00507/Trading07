import { useMarketStore, Candle } from '../store/marketStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { getApiUrl } from './config';

async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  try {
    const res = await fetch(url);
    if (!res.ok && res.status >= 500 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, delay * 1.5);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1, delay * 1.5);
    }
    throw err;
  }
}

class GoldApiService {
  private baseUrl = `${getApiUrl()}/api/market`;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private subscriptions: Set<string> = new Set();
  private pollIntervals: Map<string, any> = new Map();
  private lastPrices: Map<string, number> = new Map();

  private setStatus(status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') {
    this.connectionStatus = status;
    useMarketStore.getState().setRealMarketConnectionStatus(status);
  }

  // 1. getQuote (Fetches securely from FastAPI backend)
  async getQuote(symbol: string): Promise<{ price: number; timestamp: number; stale?: boolean }> {
    const norm = symbol.toUpperCase();
    const url = `${this.baseUrl}/quote/${norm}`;

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      this.setStatus('reconnecting');
      throw new Error(`FastAPI secure quote error: ${res.status}`);
    }

    const data = await res.json();
    if (typeof data.price !== 'number' || isNaN(data.price) || data.price <= 0) {
      throw new Error('Invalid quote price received from backend');
    }

    const ts = data.timestamp !== undefined ? data.timestamp : data.time;
    const ms = ts !== undefined ? (ts > 30000000000 ? ts : ts * 1000) : Date.now();
    this.setStatus(data.stale ? 'reconnecting' : 'connected');
    this.lastPrices.set(norm, data.price);
    return {
      price: data.price,
      timestamp: ms,
      stale: data.stale,
    };
  }

  // 2. getCandles (Fetches securely from FastAPI backend historical endpoint)
  async getCandles(symbol: string, timeframe: string, limit = 1000, before?: number): Promise<Candle[]> {
    const norm = symbol.toUpperCase();
    let url = `${this.baseUrl}/history/${norm}?timeframe=${timeframe}&limit=${limit}`;
    if (before) {
      url += `&before=${before}`;
    }

    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`FastAPI secure history error: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('History response from backend is not an array');
    }

    const candles: Candle[] = data.map((item: any) => {
      const ts = item.timestamp !== undefined ? item.timestamp : item.time;
      const ms = ts > 30000000000 ? ts : ts * 1000;
      return {
        timestamp: ms,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume || 0),
      };
    });

    return candles.sort((a, b) => a.timestamp - b.timestamp);
  }

  // 3. subscribe (polls every 1 second securely from backend)
  subscribe(symbol: string) {
    const norm = symbol.toUpperCase();
    if (this.subscriptions.has(norm)) return;
    this.subscriptions.add(norm);

    this.setStatus('connecting');
    this.pollQuote(norm);

    const interval = setInterval(() => {
      this.pollQuote(norm);
    }, 1000);

    this.pollIntervals.set(norm, interval);
  }

  // 4. unsubscribe
  unsubscribe(symbol: string) {
    const norm = symbol.toUpperCase();
    this.subscriptions.delete(norm);

    const interval = this.pollIntervals.get(norm);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(norm);
    }

    if (this.subscriptions.size === 0) {
      this.setStatus('disconnected');
    }
  }

  private async pollQuote(symbol: string) {
    try {
      const tick = await this.getQuote(symbol);
      useMarketStore.getState().updatePrice(symbol, tick.price, tick.timestamp, false);
      useMarketStore.getState().updateCandleFromTick(symbol, tick.price, tick.timestamp);
      useMarketPriceStore.getState().updatePrice(symbol, { currentPrice: tick.price, timestamp: tick.timestamp });
    } catch (err) {
      console.warn(`Secure GoldAPI Polling Error for ${symbol}:`, err);
      this.setStatus('reconnecting');
      const lastPrice = this.lastPrices.get(symbol);
      if (lastPrice !== undefined) {
        useMarketStore.getState().updatePrice(symbol, lastPrice, Date.now(), true);
        useMarketPriceStore.getState().updatePrice(symbol, { currentPrice: lastPrice, timestamp: Date.now() });
      }
    }
  }
}

export const goldApi = new GoldApiService();
