// src/store/marketPriceStore.ts
import { createWithEqualityFn } from 'zustand/traditional';
import { useAppStore } from './appStore';
import { goldApi } from '../services/goldApi';

export interface PriceInfo {
  price: number; // Compatibility field mapping to currentPrice
  currentPrice: number;
  bid: number;
  ask: number;
  lastPrice: number;
  markPrice: number;
  spread: number;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

// Simple fallback helper to get decimals and spread
const getSymbolSpecs = (symbol: string) => {
  const sym = symbol.toUpperCase();
  let spread = 0.1;
  let decimals = 2;

  if (sym === 'BTCUSDT') { spread = 4.0; decimals = 2; }
  else if (sym === 'ETHUSDT') { spread = 0.5; decimals = 2; }
  else if (sym === 'EURUSD') { spread = 0.00012; decimals = 5; }
  else if (sym === 'GBPUSD') { spread = 0.00018; decimals = 5; }
  else if (sym === 'USDJPY') { spread = 0.015; decimals = 3; }
  else if (sym === 'XAUUSD') { spread = 0.25; decimals = 2; }
  else if (sym === 'XAGUSD') { spread = 0.015; decimals = 3; }
  else if (sym === 'US30') { spread = 2.0; decimals = 1; }
  else if (sym === 'NAS100') { spread = 1.5; decimals = 1; }
  else if (sym === 'SPX500') { spread = 0.4; decimals = 1; }
  else if (sym === 'GER40') { spread = 1.0; decimals = 1; }
  else {
    if (sym.includes('JPY')) { spread = 0.015; decimals = 3; }
    else if (sym.includes('USD') || sym.includes('EUR') || sym.includes('GBP')) { spread = 0.0002; decimals = 5; }
    else { spread = 0.05; decimals = 2; }
  }

  return { spread, decimals };
};

interface MarketPriceState {
  currentPrice: number;
  bid: number;
  ask: number;
  lastPrice: number;
  markPrice: number;
  spread: number;
  change24h: number;
  volume24h: number;
  timestamp: number;

  prices: Record<string, PriceInfo>;

  updatePrice: (symbol: string, data: Partial<PriceInfo>) => void;
  syncActiveSymbol: () => void;
  subscribe: (symbol: string, timeframe?: string) => void;
  unsubscribe: (symbol: string, timeframe?: string) => void;
}

export const useMarketPriceStore = createWithEqualityFn<MarketPriceState>((set, get) => ({
  currentPrice: 0,
  bid: 0,
  ask: 0,
  lastPrice: 0,
  markPrice: 0,
  spread: 0,
  change24h: 0,
  volume24h: 0,
  timestamp: 0,

  prices: {},

  updatePrice: (symbol, data) => {
    const sym = symbol.toUpperCase();
    set((state) => {
      const existing = state.prices[sym] || {
        price: 0,
        currentPrice: 0,
        bid: 0,
        ask: 0,
        lastPrice: 0,
        markPrice: 0,
        spread: 0,
        change24h: 0,
        volume24h: 0,
        timestamp: Date.now(),
      };

      const updatedInfo = { ...existing, ...data };

      // Fill in bid, ask and spread if they are not explicitly set but price is set
      const price = data.currentPrice ?? data.lastPrice ?? updatedInfo.currentPrice;
      if (price > 0) {
        updatedInfo.currentPrice = price;
        if (data.lastPrice === undefined) {
          updatedInfo.lastPrice = price;
        }
        if (data.markPrice === undefined) {
          updatedInfo.markPrice = price;
        }
        if (data.bid === undefined && data.ask === undefined) {
          const { spread: symSpread } = getSymbolSpecs(sym);
          updatedInfo.bid = price;
          updatedInfo.ask = price + symSpread;
          updatedInfo.spread = symSpread;
        }
      }
      updatedInfo.price = updatedInfo.currentPrice;

      // Re-calculate spread if bid/ask are provided and spread is not explicitly set
      if (data.bid !== undefined || data.ask !== undefined) {
        const bid = data.bid !== undefined ? data.bid : updatedInfo.bid;
        const ask = data.ask !== undefined ? data.ask : updatedInfo.ask;
        updatedInfo.spread = Math.max(0, ask - bid);
      }

      const nextPrices = { ...state.prices, [sym]: updatedInfo };

      const activeSymbol = useAppStore.getState().selectedInstrument?.symbol;
      if (activeSymbol && sym === activeSymbol.toUpperCase()) {
        return {
          prices: nextPrices,
          currentPrice: updatedInfo.currentPrice,
          bid: updatedInfo.bid,
          ask: updatedInfo.ask,
          lastPrice: updatedInfo.lastPrice,
          markPrice: updatedInfo.markPrice,
          spread: updatedInfo.spread,
          change24h: updatedInfo.change24h,
          volume24h: updatedInfo.volume24h,
          timestamp: updatedInfo.timestamp,
        };
      }

      return { prices: nextPrices };
    });
  },

  syncActiveSymbol: () => {
    const activeSymbol = useAppStore.getState().selectedInstrument?.symbol;
    if (!activeSymbol) return;
    const sym = activeSymbol.toUpperCase();
    set((state) => {
      const info = state.prices[sym];
      if (!info) {
        // Fallback default setup
        const defaultPrice = useAppStore.getState().selectedInstrument?.price ?? 0;
        const { spread: symSpread } = getSymbolSpecs(sym);
        return {
          currentPrice: defaultPrice,
          bid: defaultPrice,
          ask: defaultPrice + symSpread,
          lastPrice: defaultPrice,
          markPrice: defaultPrice,
          spread: symSpread,
          change24h: 0,
          volume24h: 0,
          timestamp: Date.now(),
        };
      }
      return {
        currentPrice: info.currentPrice,
        bid: info.bid,
        ask: info.ask,
        lastPrice: info.lastPrice,
        markPrice: info.markPrice,
        spread: info.spread,
        change24h: info.change24h,
        volume24h: info.volume24h,
        timestamp: info.timestamp,
      };
    });
  },

  subscribe: (symbol, timeframe = '1m') => {
    const sym = symbol.toUpperCase();
    import('../services/marketWebSocket').then((m) => m.marketWebSocket.subscribe(sym, timeframe)).catch(() => {});
    if (sym === 'XAUUSD' || sym === 'XAGUSD') {
      goldApi.subscribe(sym);
    }
  },

  unsubscribe: (symbol, timeframe = '1m') => {
    const sym = symbol.toUpperCase();
    import('../services/marketWebSocket').then((m) => m.marketWebSocket.unsubscribe(sym, timeframe)).catch(() => {});
    if (sym === 'XAUUSD' || sym === 'XAGUSD') {
      goldApi.unsubscribe(sym);
    }
  }
}));

// Setup automatic sync when active instrument changes in appStore after module load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    let lastSymbol = useAppStore.getState().selectedInstrument?.symbol;

    useAppStore.subscribe((state) => {
      const currentSymbol = state.selectedInstrument?.symbol;
      if (currentSymbol !== lastSymbol) {
        lastSymbol = currentSymbol;
        useMarketPriceStore.getState().syncActiveSymbol();
      }
    });
  }, 0);
}
