import { create } from 'zustand';
import { UTCTimestamp } from 'lightweight-charts';

export interface ReplayCandle {
  index?: number;
  timestamp?: number;
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  buyVolume?: number;
  sellVolume?: number;
  delta?: number;
  cvd?: number;
  vwap?: number;
  footprint?: any[];
}

export interface ReplayPosition {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  quantity: number;
  sl?: number;
  tp?: number;
  trailingStop?: number;
  entryTime: number;
}

export interface ReplayTradeRecord {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  netPnl: number;
  commission: number;
  entryTime: number;
  exitTime: number;
  durationSec: number;
}

export interface NewsEvent {
  time: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual: string;
  forecast: string;
  previous: string;
}

export interface ReplayDrawingTool {
  id: string;
  type: 'trendline' | 'horizontal_level' | 'anchored_vwap' | 'fibonacci' | 'pitchfork';
  points: { time: number; price: number }[];
  color: string;
}

export interface ReplayStats {
  totalTrades: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  largestWin: number;
  largestLoss: number;
  avgWin: number;
  avgLoss: number;
  avgDurationSec: number;
  expectancy: number;
  totalPnl: number;
  openPnl: number;
  closedPnl: number;
}

interface ReplayState {
  isReplayActive: boolean;
  isPlaying: boolean;
  symbol: string;
  assetClass: 'Stocks' | 'Forex' | 'Crypto' | 'Futures' | 'Indices';
  timeframe: string;
  candles: ReplayCandle[];
  currentIndex: number;
  speedMultiplier: number;

  // Account & Simulation
  initialBalance: number;
  balance: number;
  equity: number;
  marginUsed: number;
  freeMargin: number;
  drawdown: number;
  maxDrawdown: number;
  leverage: number;
  positions: ReplayPosition[];
  tradeHistory: ReplayTradeRecord[];
  stats: ReplayStats;
  equityCurve: { time: number; equity: number; balance: number }[];

  // Replay DOM & Order Flow
  orderBookDepth: { bids: [number, number][]; asks: [number, number][] };
  cvd: number;
  delta: number;

  // Drawings & Workspace
  drawingTools: ReplayDrawingTool[];
  savedSessions: { [id: string]: any };

  // AI Insights
  aiQueryResponse: { query: string; answer: string; confidence: number } | null;

  // Actions
  enableReplay: (symbol: string, timeframe: string, assetClass?: 'Stocks' | 'Forex' | 'Crypto' | 'Futures' | 'Indices', count?: number) => Promise<void>;
  disableReplay: () => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  stepForward: (count?: number) => void;
  stepBackward: (count?: number) => void;
  setSpeedMultiplier: (mult: number) => void;
  setTimeframe: (tf: string) => void;
  jumpToDate: (dateStr: string) => void;
  jumpToCandle: (index: number) => void;

  // Trading Actions
  placeOrder: (side: 'buy' | 'sell', qty: number, sl?: number, tp?: number, trailingStop?: number, orderType?: 'market' | 'limit' | 'stop') => void;
  closePosition: (posId: string, partialQty?: number) => void;
  reversePosition: (posId: string) => void;
  moveToBreakEven: (posId: string) => void;

  // Drawing Actions
  addDrawingTool: (tool: ReplayDrawingTool) => void;
  removeDrawingTool: (id: string) => void;

  // Session & AI Actions
  saveSession: (name: string) => Promise<void>;
  loadSession: (name: string) => Promise<void>;
  queryAI: (prompt: string) => Promise<void>;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  isReplayActive: false,
  isPlaying: false,
  symbol: 'BTCUSDT',
  assetClass: 'Crypto',
  timeframe: '1m',
  candles: [],
  currentIndex: 0,
  speedMultiplier: 1,

  initialBalance: 10000.0,
  balance: 10000.0,
  equity: 10000.0,
  marginUsed: 0.0,
  freeMargin: 10000.0,
  drawdown: 0.0,
  maxDrawdown: 0.0,
  leverage: 10.0,
  positions: [],
  tradeHistory: [],
  equityCurve: [{ time: Date.now() / 1000, equity: 10000.0, balance: 10000.0 }],
  stats: {
    totalTrades: 0, winRate: 0.0, lossRate: 0.0, profitFactor: 0.0,
    sharpeRatio: 0.0, maxDrawdown: 0.0, largestWin: 0.0, largestLoss: 0.0,
    avgWin: 0.0, avgLoss: 0.0, avgDurationSec: 0, expectancy: 0.0,
    totalPnl: 0.0, openPnl: 0.0, closedPnl: 0.0
  },

  orderBookDepth: { bids: [], asks: [] },
  cvd: 0,
  delta: 0,

  drawingTools: [],
  savedSessions: {},
  aiQueryResponse: null,

  enableReplay: async (symbol, timeframe, assetClass = 'Crypto', count = 1000) => {
    try {
      const res = await fetch(`/api/replay/candles?symbol=${symbol}&timeframe=${timeframe}&count=${count}`);
      if (!res.ok) throw new Error('Failed to fetch replay candles');
      const data = await res.json();
      const rawCandles = data.candles || [];

      const formattedCandles: ReplayCandle[] = rawCandles.map((c: any, idx: number) => ({
        index: idx,
        timestamp: c.timestamp,
        time: (c.time || Math.floor(c.timestamp / 1000)) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        buyVolume: c.buyVolume,
        sellVolume: c.sellVolume,
        delta: c.delta,
        cvd: c.cvd,
        vwap: c.vwap,
        footprint: c.footprint,
      }));

      set({
        isReplayActive: true,
        isPlaying: false,
        symbol,
        timeframe,
        assetClass,
        candles: formattedCandles,
        currentIndex: 0,
        balance: 10000.0,
        equity: 10000.0,
        freeMargin: 10000.0,
        positions: [],
        tradeHistory: [],
        equityCurve: [{ time: Date.now() / 1000, equity: 10000.0, balance: 10000.0 }],
      });
    } catch (e) {
      console.error('Failed enabling replay:', e);
    }
  },

  disableReplay: () => {
    set({ isReplayActive: false, isPlaying: false, candles: [], currentIndex: 0 });
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),

  restart: () => {
    set({
      currentIndex: 0,
      isPlaying: false,
      balance: get().initialBalance,
      equity: get().initialBalance,
      positions: [],
      tradeHistory: [],
      equityCurve: [{ time: Date.now() / 1000, equity: get().initialBalance, balance: get().initialBalance }]
    });
  },

  stepForward: (count = 1) => {
    const { candles, currentIndex } = get();
    if (currentIndex + count < candles.length) {
      set({ currentIndex: currentIndex + count });
    }
  },

  stepBackward: (count = 1) => {
    const { currentIndex } = get();
    if (currentIndex - count >= 0) {
      set({ currentIndex: currentIndex - count });
    }
  },

  setSpeedMultiplier: (mult) => set({ speedMultiplier: mult }),
  setTimeframe: (tf) => set({ timeframe: tf }),

  jumpToDate: (dateStr) => {
    const { candles } = get();
    const targetTs = new Date(dateStr).getTime() / 1000;
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < candles.length; i++) {
      const diff = Math.abs(candles[i].time - targetTs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    set({ currentIndex: closestIdx });
  },

  jumpToCandle: (index) => {
    const { candles } = get();
    const idx = Math.max(0, Math.min(candles.length - 1, index));
    set({ currentIndex: idx });
  },

  placeOrder: (side, qty, sl, tp, trailingStop, orderType = 'market') => {
    const { candles, currentIndex, symbol, positions, balance } = get();
    if (candles.length === 0) return;

    const currentPrice = candles[currentIndex].close;
    const newPos: ReplayPosition = {
      id: `pos-${Date.now()}`,
      symbol,
      side,
      entryPrice: currentPrice,
      quantity: qty,
      sl,
      tp,
      trailingStop,
      entryTime: candles[currentIndex].time,
    };

    set({ positions: [...positions, newPos] });
  },

  closePosition: (posId, partialQty) => {
    const { positions, candles, currentIndex, balance, tradeHistory, equityCurve } = get();
    const pos = positions.find(p => p.id === posId);
    if (!pos || candles.length === 0) return;

    const currentPrice = candles[currentIndex].close;
    const closeQty = partialQty || pos.quantity;
    const pnl = pos.side === 'buy' ? (currentPrice - pos.entryPrice) * closeQty : (pos.entryPrice - currentPrice) * closeQty;

    const newBalance = balance + pnl;
    const newRecord: ReplayTradeRecord = {
      id: `trd-${Date.now()}`,
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      exitPrice: currentPrice,
      quantity: closeQty,
      pnl: Math.round(pnl * 100) / 100,
      netPnl: Math.round(pnl * 100) / 100,
      commission: 1.0,
      entryTime: pos.entryTime,
      exitTime: candles[currentIndex].time,
      durationSec: Math.max(60, candles[currentIndex].time - pos.entryTime),
    };

    const remainingPositions = pos.quantity - closeQty > 0.001
      ? positions.map(p => p.id === posId ? { ...p, quantity: p.quantity - closeQty } : p)
      : positions.filter(p => p.id !== posId);

    const updatedHistory = [newRecord, ...tradeHistory];
    const wins = updatedHistory.filter(h => h.pnl > 0);
    const winRate = updatedHistory.length > 0 ? Math.round((wins.length / updatedHistory.length) * 100) : 0;

    set({
      balance: newBalance,
      equity: newBalance,
      positions: remainingPositions,
      tradeHistory: updatedHistory,
      equityCurve: [...equityCurve, { time: candles[currentIndex].time, equity: newBalance, balance: newBalance }],
      stats: {
        ...get().stats,
        totalTrades: updatedHistory.length,
        winRate,
        totalPnl: Math.round((newBalance - get().initialBalance) * 100) / 100,
        closedPnl: Math.round((newBalance - get().initialBalance) * 100) / 100,
      }
    });
  },

  reversePosition: (posId) => {
    const { positions } = get();
    const pos = positions.find(p => p.id === posId);
    if (!pos) return;
    get().closePosition(posId);
    get().placeOrder(pos.side === 'buy' ? 'sell' : 'buy', pos.quantity);
  },

  moveToBreakEven: (posId) => {
    const { positions } = get();
    set({
      positions: positions.map(p => p.id === posId ? { ...p, sl: p.entryPrice } : p)
    });
  },

  addDrawingTool: (tool) => {
    set({ drawingTools: [...get().drawingTools, tool] });
  },

  removeDrawingTool: (id) => {
    set({ drawingTools: get().drawingTools.filter(t => t.id !== id) });
  },

  saveSession: async (name) => {
    const state = {
      symbol: get().symbol,
      timeframe: get().timeframe,
      currentIndex: get().currentIndex,
      balance: get().balance,
      positions: get().positions,
      tradeHistory: get().tradeHistory,
      drawingTools: get().drawingTools,
    };
    try {
      await fetch(`/api/replay/save-session?session_id=${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      set({ savedSessions: { ...get().savedSessions, [name]: state } });
    } catch {}
  },

  loadSession: async (name) => {
    try {
      const res = await fetch(`/api/replay/load-session?session_id=${encodeURIComponent(name)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.state) {
        set({
          symbol: data.state.symbol,
          timeframe: data.state.timeframe,
          currentIndex: data.state.currentIndex,
          balance: data.state.balance,
          positions: data.state.positions || [],
          tradeHistory: data.state.tradeHistory || [],
          drawingTools: data.state.drawingTools || [],
        });
      }
    } catch {}
  },

  queryAI: async (prompt) => {
    try {
      const res = await fetch('/api/replay/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: prompt,
          trades: get().tradeHistory,
          candlesCount: get().candles.length,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        set({ aiQueryResponse: data });
      }
    } catch {}
  }
}));
