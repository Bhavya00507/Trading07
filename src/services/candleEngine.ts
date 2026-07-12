import { useMarketStore } from '../store/marketStore';

export interface Candle {
  timestamp: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type CandleListener = (candle: Candle, isNew: boolean) => void;

class CandleEngine {
  private candles: Record<string, Candle[]> = {}; // key: "symbol|timeframe"
  private listeners: Record<string, Set<CandleListener>> = {}; // key: "symbol|timeframe"

  // Load history into the engine
  setHistory(symbol: string, timeframe: string, history: Candle[]) {
    const key = `${symbol.toUpperCase()}|${timeframe}`;
    this.candles[key] = [...history].sort((a, b) => a.timestamp - b.timestamp);
  }

  getHistory(symbol: string, timeframe: string): Candle[] {
    const key = `${symbol.toUpperCase()}|${timeframe}`;
    return this.candles[key] || [];
  }

  clearHistory(symbol: string, timeframe: string) {
    const key = `${symbol.toUpperCase()}|${timeframe}`;
    delete this.candles[key];
  }

  // Handle incoming live tick
  addTick(symbol: string, price: number, timestamp: number, volume: number = 0) {
    const keyPrefix = `${symbol.toUpperCase()}|`;
    
    // Update all active timeframes that have history loaded in the engine
    const activeKeys = Object.keys(this.candles).filter(k => k.startsWith(keyPrefix));
    
    for (const key of activeKeys) {
      const timeframe = key.split('|')[1];
      const tfMs = this.getTimeframeMs(timeframe);
      const alignTime = Math.floor(timestamp / tfMs) * tfMs;

      const history = this.candles[key];
      if (!history || history.length === 0) continue;

      const lastIdx = history.length - 1;
      const last = history[lastIdx];

      let isNew = false;
      let updatedCandle: Candle;

      if (last.timestamp === alignTime) {
        // Update active candle
        last.close = price;
        if (price > last.high) last.high = price;
        if (price < last.low) last.low = price;
        last.volume += volume;
        updatedCandle = { ...last };
      } else if (alignTime > last.timestamp) {
        // Freeze the old candle and append a new one
        const newCandle: Candle = {
          timestamp: alignTime,
          open: last.close,
          high: Math.max(last.close, price),
          low: Math.min(last.close, price),
          close: price,
          volume: volume
        };
        history.push(newCandle);
        if (history.length > 1000) {
          history.shift();
        }
        updatedCandle = newCandle;
        isNew = true;
      } else {
        // Ignore older ticks
        continue;
      }

      // Sync with Zustand store
      useMarketStore.getState().setCandles(key, [...history]);

      // Notify listeners
      const listeners = this.listeners[key];
      if (listeners) {
        listeners.forEach(cb => cb(updatedCandle, isNew));
      }
    }
  }

  addCandle(symbol: string, timeframe: string, candle: Candle) {
    const key = `${symbol.toUpperCase()}|${timeframe}`;
    const history = this.candles[key];
    if (!history || history.length === 0) return;

    const lastIdx = history.length - 1;
    const last = history[lastIdx];

    let isNew = false;
    if (last.timestamp === candle.timestamp) {
      history[lastIdx] = { ...candle };
    } else if (candle.timestamp > last.timestamp) {
      history.push({ ...candle });
      if (history.length > 2000) {
        history.shift();
      }
      isNew = true;
    } else {
      return;
    }

    useMarketStore.getState().setCandles(key, [...history]);

    const listeners = this.listeners[key];
    if (listeners) {
      listeners.forEach(cb => cb(candle, isNew));
    }
  }

  subscribe(symbol: string, timeframe: string, cb: CandleListener): () => void {
    const key = `${symbol.toUpperCase()}|${timeframe}`;
    if (!this.listeners[key]) {
      this.listeners[key] = new Set();
    }
    this.listeners[key].add(cb);

    return () => {
      const set = this.listeners[key];
      if (set) {
        set.delete(cb);
        if (set.size === 0) {
          delete this.listeners[key];
        }
      }
    };
  }

  private getTimeframeMs(tf: string): number {
    const norm = tf.toLowerCase();
    if (norm === '1s') return 1000;
    if (norm === '5s') return 5000;
    if (norm === '15s') return 15000;
    if (norm === '30s') return 30000;
    if (norm === '1m') return 60000;
    if (norm === '3m') return 180000;
    if (norm === '5m') return 300000;
    if (norm === '10m') return 600000;
    if (norm === '15m') return 900000;
    if (norm === '30m') return 1800000;
    if (norm === '45m') return 2700000;
    if (norm === '1h') return 3600000;
    if (norm === '2h') return 7200000;
    if (norm === '4h') return 14400000;
    if (norm === '6h') return 21600000;
    if (norm === '8h') return 28800000;
    if (norm === '12h') return 43200000;
    if (norm === '1d' || norm === 'daily') return 86400000;
    if (norm === '1w' || norm === 'weekly') return 604800000;
    if (norm === '1mo' || norm === 'monthly') return 2592000000;
    return 60000;
  }
}

export const candleEngine = new CandleEngine();
