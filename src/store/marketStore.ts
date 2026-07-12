// src/store/marketStore.ts
import { create } from 'zustand';

export type MarketPrice = {
  symbol: string;
  price: number;
  time: number; // epoch ms
  isDelayed?: boolean;
};

export type Candle = {
  timestamp: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type MarketState = {
  prices: Record<string, MarketPrice>;
  candles: Record<string, Candle[]>; // key: "symbol|timeframe"
  connectionStatus: ConnectionStatus;
  realMarketConnectionStatus: ConnectionStatus;
  timeframe: string; // current selected timeframe e.g., '1D'
  feedSource: string;
  fallbackSource: string;
  lostPackets: number;
  connectionQuality: string;
  latency: number;
  packetsSent: number;
  packetsReceived: number;
  updatePrice: (symbol: string, price: number, time: number, isDelayed?: boolean) => void;
  updateCandleFromTick: (symbol: string, price: number, timestamp: number) => void;
  batchUpdatePrices: (updates: { symbol: string; price: number; timestamp: number; isDelayed?: boolean }[]) => void;
  addCandle: (key: string, candle: Candle) => void;
  setCandles: (key: string, candles: Candle[]) => void;
  prependCandles: (key: string, candles: Candle[]) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRealMarketConnectionStatus: (status: ConnectionStatus) => void;
  setTimeframe: (tf: string) => void;
  clearCandleData: (key: string) => void;
  updateFeedStats: (stats: Partial<Pick<MarketState, 'feedSource' | 'fallbackSource' | 'lostPackets' | 'connectionQuality' | 'latency' | 'packetsSent' | 'packetsReceived'>>) => void;
};

export const useMarketStore = create<MarketState>((set) => ({
  prices: {},
  candles: {},
  connectionStatus: 'disconnected',
  realMarketConnectionStatus: 'disconnected',
  timeframe: '1m',
  feedSource: 'Binance WebSocket',
  fallbackSource: 'Coinbase Feed',
  lostPackets: 0,
  connectionQuality: 'Excellent',
  latency: 0,
  packetsSent: 0,
  packetsReceived: 0,
  setTimeframe: (tf) => set(() => ({ timeframe: tf })),
  updatePrice: (symbol, price, time, isDelayed) =>
    set((state) => ({
      prices: { ...state.prices, [symbol]: { symbol, price, time, isDelayed } },
    })),
  batchUpdatePrices: (updates) =>
    set((state) => {
      const nextPrices = { ...state.prices };
      for (const upd of updates) {
        nextPrices[upd.symbol] = {
          symbol: upd.symbol,
          price: upd.price,
          time: upd.timestamp,
          isDelayed: upd.isDelayed
        };
      }
      return { prices: nextPrices };
    }),
  updateCandleFromTick: () => set(() => ({})),
  addCandle: (key, candle) =>
    set((state) => {
      const existing = state.candles[key] || [];
      let updated: Candle[];
      if (existing.length === 0) {
        updated = [candle];
      } else {
        const last = existing[existing.length - 1];
        if (candle.timestamp === last.timestamp) {
          // Update in place (current candle)
          updated = [...existing];
          updated[updated.length - 1] = candle;
        } else if (candle.timestamp > last.timestamp) {
          // Append new candle
          updated = [...existing, candle];
          if (updated.length > 1500) updated = updated.slice(-1500);
        } else {
          // Out-of-order: do a full merge (rare)
          const map = new Map<number, Candle>();
          existing.forEach(c => map.set(c.timestamp, c));
          map.set(candle.timestamp, candle);
          updated = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
          if (updated.length > 1500) updated = updated.slice(-1500);
        }
      }
      return { candles: { ...state.candles, [key]: updated } };
    }),
  setCandles: (key, candles) =>
    set((state) => ({
      candles: { ...state.candles, [key]: [...candles].sort((a, b) => a.timestamp - b.timestamp) }
    })),
  prependCandles: (key, candles) =>
    set((state) => {
      const existing = state.candles[key] || [];
      const combinedMap = new Map<number, Candle>();
      candles.forEach(c => combinedMap.set(c.timestamp, c));
      existing.forEach(c => combinedMap.set(c.timestamp, c));
      const updated = Array.from(combinedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
      return { candles: { ...state.candles, [key]: updated } };
    }),
  setConnectionStatus: (status) => set(() => ({ connectionStatus: status })),
  setRealMarketConnectionStatus: (status) => set(() => ({ realMarketConnectionStatus: status })),
  clearCandleData: (key) =>
    set((state) => {
      const { [key]: _, ...rest } = state.candles;
      return { candles: rest };
    }),
  updateFeedStats: (stats) => set((state) => ({ ...state, ...stats })),
}));
