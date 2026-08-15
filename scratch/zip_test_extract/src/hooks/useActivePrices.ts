// src/hooks/useActivePrices.ts
import { useMarketPriceStore } from '../store/marketPriceStore';

const shallowCompare = (oldVal: Record<string, number>, newVal: Record<string, number>) => {
  const oldKeys = Object.keys(oldVal);
  const newKeys = Object.keys(newVal);
  if (oldKeys.length !== newKeys.length) return false;
  for (const k of oldKeys) {
    if (oldVal[k] !== newVal[k]) return false;
  }
  return true;
};

export const useActivePrices = (symbols: string[]) => {
  return useMarketPriceStore(
    (s) => {
      const subset: Record<string, number> = {};
      for (const sym of symbols) {
        const norm = sym.toUpperCase();
        if (s.prices[norm]) {
          subset[sym] = s.prices[norm].currentPrice;
        }
      }
      return subset;
    },
    shallowCompare
  );
};
