// src/store/alertStore.ts
import { create } from 'zustand';
import { useMarketStore } from './marketStore';
import { useAppStore } from './appStore';
import { usePositionStore } from './positionStore';

export interface PriceAlert {
  id: string;
  symbol: string; // "ALL" for PnL alerts
  type: 'price_above' | 'price_below' | 'rsi_above' | 'rsi_below' | 'pnl_above' | 'pnl_below' | 'trendline_cross' | 'indicator_crossover' | 'breakout_alert';
  value: number;
  condition: string;
  isActive: boolean;
  isTriggered: boolean;
  createdAt: string;
  extraParams?: {
    indicator?: string; // e.g. "EMA 20"
    targetValue?: number; // target crossover or boundary
    highBound?: number;
    lowBound?: number;
    snoozeMinutes?: number;
    repeat?: 'once' | 'always';
    webhook?: boolean;
    telegram?: boolean;
    discord?: boolean;
    email?: boolean;
    push?: boolean;
  };
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  message: string;
}

interface AlertState {
  alerts: PriceAlert[];
  notifications: NotificationLog[];
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'isTriggered' | 'isActive'>) => void;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  clearTriggered: () => void;
  clearNotifications: () => void;
  checkAlerts: (symbol: string, currentPrice: number, indicators?: Record<string, number>) => void;
  checkPnlAlerts: (totalPnl: number) => void;
}

const requestNotificationPermission = () => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
};

if (typeof window !== 'undefined') {
  requestNotificationPermission();
}

const showDesktopNotification = (title: string, body: string) => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch (e) {
        console.error('Failed to show notification:', e);
      }
    }
  }
};

export const useAlertStore = create<AlertState>((set, get) => {
  let initialAlerts: PriceAlert[] = [];
  let initialNotifications: NotificationLog[] = [];
  try {
    const savedAlerts = localStorage.getItem('trading-alerts');
    if (savedAlerts) {
      initialAlerts = JSON.parse(savedAlerts);
    }
    const savedNotifications = localStorage.getItem('trading-notifications');
    if (savedNotifications) {
      initialNotifications = JSON.parse(savedNotifications);
    }
  } catch (e) {
    console.error('Failed to load initial alerts data:', e);
  }

  const addLog = (message: string) => {
    const log: NotificationLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleString(),
      message,
    };
    set((state) => {
      const updated = [log, ...state.notifications].slice(0, 100); // keep last 100
      localStorage.setItem('trading-notifications', JSON.stringify(updated));
      return { notifications: updated };
    });
  };

  return {
    alerts: initialAlerts,
    notifications: initialNotifications,

    addAlert: (alertData) => {
      const newAlert: PriceAlert = {
        ...alertData,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toLocaleTimeString(),
        isActive: true,
        isTriggered: false,
      };

      set((state) => {
        const updated = [...state.alerts, newAlert];
        localStorage.setItem('trading-alerts', JSON.stringify(updated));
        return { alerts: updated };
      });

      const targetLabel = newAlert.symbol === 'ALL' ? 'Account PnL' : newAlert.symbol;
      useAppStore.getState().addToast(
        'success',
        `Alert created: ${targetLabel} ${newAlert.type.replace('_', ' ')} ${newAlert.value}`
      );
      
      requestNotificationPermission();
    },

    toggleAlert: (id) => {
      set((state) => {
        const updated = state.alerts.map((al) =>
          al.id === id ? { ...al, isActive: !al.isActive, isTriggered: al.isActive ? al.isTriggered : false } : al
        );
        localStorage.setItem('trading-alerts', JSON.stringify(updated));
        return { alerts: updated };
      });
    },

    deleteAlert: (id) => {
      set((state) => {
        const updated = state.alerts.filter((al) => al.id !== id);
        localStorage.setItem('trading-alerts', JSON.stringify(updated));
        return { alerts: updated };
      });
    },

    clearTriggered: () => {
      set((state) => {
        const updated = state.alerts.filter((al) => !al.isTriggered);
        localStorage.setItem('trading-alerts', JSON.stringify(updated));
        return { alerts: updated };
      });
    },

    clearNotifications: () => {
      set(() => {
        localStorage.removeItem('trading-notifications');
        return { notifications: [] };
      });
    },

    checkAlerts: (symbol, currentPrice, indicators = {}) => {
      const { alerts } = get();
      let hasUpdates = false;

      const updatedAlerts = alerts.map((alert) => {
        if (!alert.isActive || alert.isTriggered || alert.symbol !== symbol) return alert;

        let shouldTrigger = false;
        let message = '';

        if (alert.type === 'price_above' && currentPrice >= alert.value) {
          shouldTrigger = true;
          message = `${symbol} price rose to ${currentPrice} (Target: >= ${alert.value})`;
        } else if (alert.type === 'price_below' && currentPrice <= alert.value) {
          shouldTrigger = true;
          message = `${symbol} price fell to ${currentPrice} (Target: <= ${alert.value})`;
        } else if (alert.type === 'rsi_above' && indicators['RSI'] && indicators['RSI'] >= alert.value) {
          shouldTrigger = true;
          message = `${symbol} RSI crossed above ${indicators['RSI'].toFixed(2)} (Target: >= ${alert.value})`;
        } else if (alert.type === 'rsi_below' && indicators['RSI'] && indicators['RSI'] <= alert.value) {
          shouldTrigger = true;
          message = `${symbol} RSI crossed below ${indicators['RSI'].toFixed(2)} (Target: <= ${alert.value})`;
        } else if (alert.type === 'trendline_cross') {
          // Check if price crossed the target trendline value
          shouldTrigger = Math.abs(currentPrice - alert.value) < (currentPrice * 0.001); // within 0.1% tolerance
          message = `${symbol} price crossed trendline level of ${alert.value} (Price: ${currentPrice})`;
        } else if (alert.type === 'indicator_crossover' && alert.extraParams?.indicator) {
          const indVal = indicators[alert.extraParams.indicator];
          if (indVal) {
            shouldTrigger = Math.abs(currentPrice - indVal) < (currentPrice * 0.001);
            message = `${symbol} price crossed indicator ${alert.extraParams.indicator} at ${indVal.toFixed(2)} (Price: ${currentPrice})`;
          }
        } else if (alert.type === 'breakout_alert' && alert.extraParams) {
          const high = alert.extraParams.highBound || Infinity;
          const low = alert.extraParams.lowBound || -Infinity;
          if (currentPrice >= high) {
            shouldTrigger = true;
            message = `${symbol} upside breakout above ${high} (Price: ${currentPrice})`;
          } else if (currentPrice <= low) {
            shouldTrigger = true;
            message = `${symbol} downside breakout below ${low} (Price: ${currentPrice})`;
          }
        }

        if (shouldTrigger) {
          hasUpdates = true;
          useAppStore.getState().addToast('info', `🔔 ALERT: ${message}`);
          showDesktopNotification('Trading Alert', message);
          addLog(message);
          return { ...alert, isTriggered: true, isActive: false };
        }

        return alert;
      });

      if (hasUpdates) {
        set({ alerts: updatedAlerts });
        localStorage.setItem('trading-alerts', JSON.stringify(updatedAlerts));
      }
    },

    checkPnlAlerts: (totalPnl) => {
      const { alerts } = get();
      let hasUpdates = false;

      const updatedAlerts = alerts.map((alert) => {
        if (!alert.isActive || alert.isTriggered || alert.symbol !== 'ALL') return alert;

        let shouldTrigger = false;
        let message = '';

        if (alert.type === 'pnl_above' && totalPnl >= alert.value) {
          shouldTrigger = true;
          message = `Account Floating PnL reached $${totalPnl.toFixed(2)} (Target: >= $${alert.value})`;
        } else if (alert.type === 'pnl_below' && totalPnl <= alert.value) {
          shouldTrigger = true;
          message = `Account Floating PnL dropped to $${totalPnl.toFixed(2)} (Target: <= $${alert.value})`;
        }

        if (shouldTrigger) {
          hasUpdates = true;
          useAppStore.getState().addToast('info', `🔔 PNL ALERT: ${message}`);
          showDesktopNotification('PnL Alert', message);
          addLog(message);
          return { ...alert, isTriggered: true, isActive: false };
        }

        return alert;
      });

      if (hasUpdates) {
        set({ alerts: updatedAlerts });
        localStorage.setItem('trading-alerts', JSON.stringify(updatedAlerts));
      }
    }
  };
});

// Subscribe globally to price changes in marketStore to check alerts dynamically
import { calculateEMA, calculateVWAP, calculateRSI, ChartDataPoint } from '../services/indicatorCalcs';

useMarketStore.subscribe((state) => {
  const alerts = useAlertStore.getState().alerts;
  const activeAlerts = alerts.filter((a) => a.isActive && !a.isTriggered);
  if (activeAlerts.length === 0) return;

  const activeSymbols = activeAlerts.map((a) => a.symbol);
  
  // 1. Check standard Price, Trendline, Breakout & Indicator Crossover alerts
  const uniqueSymbols = Array.from(new Set(activeSymbols)).filter(s => s !== 'ALL');
  uniqueSymbols.forEach((sym) => {
    const marketPriceObj = state.prices[sym];
    if (marketPriceObj) {
      const key = `${sym}|1m`;
      const candles = state.candles[key] || [];
      const indicators: Record<string, number> = {};

      if (candles.length > 0) {
        const formatted: ChartDataPoint[] = candles.map((c) => ({
          time: Math.floor(c.timestamp / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume || 0,
        })).sort((a, b) => a.time - b.time);

        if (formatted.length >= 20) {
          const ema20 = calculateEMA(formatted, 20);
          if (ema20.length > 0) indicators['EMA 20'] = ema20[ema20.length - 1].value;
        }
        if (formatted.length >= 50) {
          const ema50 = calculateEMA(formatted, 50);
          if (ema50.length > 0) indicators['EMA 50'] = ema50[ema50.length - 1].value;
        }
        if (formatted.length >= 200) {
          const ema200 = calculateEMA(formatted, 200);
          if (ema200.length > 0) indicators['EMA 200'] = ema200[ema200.length - 1].value;
        }
        const vwap = calculateVWAP(formatted);
        if (vwap.length > 0) indicators['VWAP'] = vwap[vwap.length - 1].value;

        const rsi = calculateRSI(formatted);
        if (rsi.length > 0) indicators['RSI'] = rsi[rsi.length - 1].value;
      }

      useAlertStore.getState().checkAlerts(sym, marketPriceObj.price, indicators);
    }
  });

  // 2. Check PnL alerts
  const hasActivePnlAlerts = activeAlerts.some((a) => a.symbol === 'ALL');
  if (hasActivePnlAlerts) {
    const positions = usePositionStore.getState().positions;
    let totalPnl = 0;
    positions.forEach((pos) => {
      if (pos.quantity === 0) return;
      const livePrice = state.prices[pos.symbol]?.price ?? pos.average_price;
      const pnl = pos.quantity > 0 
        ? (livePrice - pos.average_price) * pos.quantity
        : (pos.average_price - livePrice) * Math.abs(pos.quantity);
      totalPnl += pnl;
    });
    useAlertStore.getState().checkPnlAlerts(totalPnl);
  }
});

