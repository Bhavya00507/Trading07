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

/**
 * Authoritative timeframe to milliseconds converter.
 * Handles both standard lowercase and uppercase timeframe strings.
 * Disambiguates 1M (1 Month = 2592000000ms) from 1m (1 Minute = 60000ms).
 */
export function getTimeframeMs(tf: string): number {
  if (!tf) return 60000;
  
  // Special check for Monthly vs 1 Minute
  if (tf === '1M' || tf.toLowerCase() === '1mo' || tf.toLowerCase() === 'monthly') {
    return 2592000000;
  }

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
  return 60000;
}

/**
 * Deduplicates and sorts candles by timestamp ascending.
 * Ensures timestamps are valid non-NaN numbers and preserves the latest candle per timestamp bucket.
 */
export function dedupeCandles(candles: Candle[]): Candle[] {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  const map = new Map<number, Candle>();

  for (const c of candles) {
    if (!c || typeof c !== 'object') continue;
    const ts = Number(c.timestamp);
    const close = Number(c.close);
    if (isNaN(ts) || isNaN(close) || ts <= 0 || close <= 0) continue;

    map.set(ts, {
      timestamp: ts,
      open: Number(c.open),
      high: Math.max(Number(c.high), Number(c.open), close),
      low: Math.min(Number(c.low), Number(c.open), close),
      close,
      volume: c.volume !== undefined ? Number(c.volume) : 0,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}

class CandleEngine {
  private candles: Record<string, Candle[]> = {}; // key: "SYMBOL|TIMEFRAME"
  private listeners: Record<string, Set<CandleListener>> = {}; // key: "SYMBOL|TIMEFRAME"

  // Load history into the engine with deduplication and sorting
  setHistory(symbol: string, timeframe: string, history: Candle[]) {
    if (!symbol || !timeframe) return;
    const key = `${symbol.toUpperCase()}|${timeframe}`;
    this.candles[key] = dedupeCandles(history);
  }

  getHistory(symbol: string, timeframe: string): Candle[] {
    if (!symbol || !timeframe) return [];
    const key = `${symbol.toUpperCase()}|${timeframe}`;
    return this.candles[key] || [];
  }

  clearHistory(symbol: string, timeframe: string) {
    if (!symbol || !timeframe) return;
    const key = `${symbol.toUpperCase()}|${timeframe}`;
    delete this.candles[key];
  }

  reset(symbol?: string, timeframe?: string) {
    if (symbol && timeframe) {
      const key = `${symbol.toUpperCase()}|${timeframe}`;
      delete this.candles[key];
      delete this.listeners[key];
    } else {
      this.candles = {};
      this.listeners = {};
    }
  }

  // Handle incoming live tick and aggregate into correct timeframe bucket
  addTick(symbol: string, price: number, timestamp: number, volume: number = 0) {
    if (!symbol || isNaN(price) || price <= 0 || isNaN(timestamp) || timestamp <= 0) {
      return;
    }

    const symUpper = symbol.toUpperCase();
    const keyPrefix = `${symUpper}|`;
    const activeKeys = Object.keys(this.candles).filter(k => k.startsWith(keyPrefix));
    
    for (const key of activeKeys) {
      const timeframe = key.split('|')[1];
      const tfMs = getTimeframeMs(timeframe);
      const tsMs = timestamp < 30000000000 ? timestamp * 1000 : timestamp;
      const alignTime = Math.floor(tsMs / tfMs) * tfMs;

      const history = this.candles[key];
      if (!history || history.length === 0) continue;

      const lastIdx = history.length - 1;
      const last = history[lastIdx];

      let isNew = false;
      let updatedCandle: Candle;

      if (last.timestamp === alignTime) {
        // Update active candle within current bucket
        last.close = price;
        if (price > last.high) last.high = price;
        if (price < last.low) last.low = price;
        last.volume += volume;
        updatedCandle = { ...last };
      } else if (alignTime > last.timestamp) {
        // Freeze old candle and open a new bucket
        const newCandle: Candle = {
          timestamp: alignTime,
          open: last.close,
          high: Math.max(last.close, price),
          low: Math.min(last.close, price),
          close: price,
          volume: volume
        };
        history.push(newCandle);
        if (history.length > 2000) {
          history.shift();
        }
        updatedCandle = newCandle;
        isNew = true;
      } else {
        // Ignore stale tick
        continue;
      }

      // Sync with Zustand store
      try {
        useMarketStore.getState().setCandles(key, [...history]);
      } catch (e) { /* ignore store errors */ }

      // Notify registered listeners
      const listeners = this.listeners[key];
      if (listeners) {
        listeners.forEach(cb => {
          try { cb(updatedCandle, isNew); } catch (e) { console.error('Error in CandleListener callback:', e); }
        });
      }
    }
  }

  addCandle(symbol: string, timeframe: string, candle: Candle) {
    if (!symbol || !timeframe || !candle || isNaN(candle.timestamp) || isNaN(candle.close)) return;
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

    try {
      useMarketStore.getState().setCandles(key, [...history]);
    } catch (e) {}

    const listeners = this.listeners[key];
    if (listeners) {
      listeners.forEach(cb => {
        try { cb(candle, isNew); } catch (e) { console.error('Error in CandleListener callback:', e); }
      });
    }
  }

  subscribe(symbol: string, timeframe: string, cb: CandleListener): () => void {
    if (!symbol || !timeframe) return () => {};
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
}

export const candleEngine = new CandleEngine();
