// src/hooks/useLiveAccountMetrics.ts
import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { usePositionStore } from '../store/positionStore';
import { useActivePrices } from './useActivePrices';

export const getContractSize = (symbol: string) => {
  const sym = symbol.toUpperCase();
  if (sym.includes('EURUSD') || sym.includes('GBPUSD') || sym.includes('USDJPY') || sym.includes('USDCHF') || sym.includes('AUDUSD') || sym.includes('NZDUSD') || sym.includes('USDCAD')) {
    return 100000.0;
  }
  if (sym.includes('XAU')) return 100.0;
  if (sym.includes('XAG')) return 5000.0;
  if (sym.includes('US30') || sym.includes('NAS100') || sym.includes('SPX500') || sym.includes('GER40') || sym.includes('UK100') || sym.includes('JP225')) {
    return 10.0;
  }
  if (sym === 'AAPL' || sym === 'TSLA' || sym === 'MSFT') {
    return 100.0;
  }
  return 1.0;
};

export const useLiveAccountMetrics = () => {
  const account = useAppStore((s) => s.account);
  const positions = usePositionStore((s) => s.positions);

  const activePositions = useMemo(() => {
    return positions.filter((p) => p.quantity !== 0);
  }, [positions]);

  const activeSymbols = useMemo(() => {
    return activePositions.map((p) => p.symbol);
  }, [activePositions]);

  const activePrices = useActivePrices(activeSymbols);

  const metrics = useMemo(() => {
    const balance = account?.balance ?? 10000;
    
    let sumUnrealizedPnl = 0;
    let sumMarginUsed = 0;

    activePositions.forEach((p) => {
      const livePrice = activePrices[p.symbol] ?? p.average_price;
      const contractSize = getContractSize(p.symbol);
      const pnl = p.quantity > 0 
        ? (livePrice - p.average_price) * p.quantity * contractSize
        : (p.average_price - livePrice) * Math.abs(p.quantity) * contractSize;
      
      sumUnrealizedPnl += pnl;

      // 20x leverage
      const qty = Math.abs(p.quantity);
      const margin = (qty * contractSize * livePrice) / 20.0;
      sumMarginUsed += margin;
    });

    const equity = balance + sumUnrealizedPnl;
    const freeMargin = equity - sumMarginUsed;
    const marginLevel = sumMarginUsed > 0 ? (equity / sumMarginUsed) * 100 : 0;

    return {
      balance,
      unrealizedPnl: sumUnrealizedPnl,
      equity,
      marginUsed: sumMarginUsed,
      freeMargin,
      marginLevel,
    };
  }, [account, activePositions, activePrices]);

  return metrics;
};
