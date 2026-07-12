// src/store/replayStore.ts
import { create } from 'zustand';
import { getMarketCandles } from '../services/api';
import { UTCTimestamp } from 'lightweight-charts';

export interface ReplayCandle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ReplayState {
  isReplayActive: boolean;
  isPlaying: boolean;
  symbol: string;
  timeframe: string;
  candles: ReplayCandle[];
  currentIndex: number; // index up to which candles are visible
  speed: number; // delay in ms
  timerId: any | null;
  
  enableReplay: (symbol: string, timeframe: string) => Promise<void>;
  disableReplay: () => void;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  resetReplay: () => void;
  setSpeed: (speedMs: number) => void;
  jumpToDate: (dateStr: string) => void;
}

export const useReplayStore = create<ReplayState>((set, get) => ({
  isReplayActive: false,
  isPlaying: false,
  symbol: 'BTCUSDT',
  timeframe: '1m',
  candles: [],
  currentIndex: 100, // start with 100 candles of history
  speed: 1000,
  timerId: null,

  enableReplay: async (symbol, timeframe) => {
    get().disableReplay(); // clean up first
    try {
      const rawCandles = await getMarketCandles(symbol, timeframe);
      const formatted: ReplayCandle[] = rawCandles.map((c: any) => ({
        time: (c.timestamp / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
      })).sort((a: any, b: any) => (a.time as number) - (b.time as number));

      const startIdx = Math.min(100, formatted.length);
      set({
        isReplayActive: true,
        symbol,
        timeframe,
        candles: formatted,
        currentIndex: startIdx,
        isPlaying: false,
      });
    } catch (e) {
      console.error('Failed to load replay candles:', e);
    }
  },

  disableReplay: () => {
    const { timerId } = get();
    if (timerId) clearInterval(timerId);
    set({
      isReplayActive: false,
      isPlaying: false,
      candles: [],
      timerId: null,
    });
  },

  play: () => {
    const { isPlaying, timerId, speed } = get();
    if (isPlaying) return;

    if (timerId) clearInterval(timerId);

    const intervalId = setInterval(() => {
      const { currentIndex, candles } = get();
      if (currentIndex >= candles.length) {
        get().pause();
        return;
      }
      set({ currentIndex: currentIndex + 1 });
    }, speed);

    set({ isPlaying: true, timerId: intervalId });
  },

  pause: () => {
    const { timerId } = get();
    if (timerId) clearInterval(timerId);
    set({ isPlaying: false, timerId: null });
  },

  stepForward: () => {
    get().pause();
    const { currentIndex, candles } = get();
    if (currentIndex < candles.length) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  resetReplay: () => {
    get().pause();
    const { candles } = get();
    const startIdx = Math.min(100, candles.length);
    set({ currentIndex: startIdx });
  },

  setSpeed: (speedMs) => {
    set({ speed: speedMs });
    if (get().isPlaying) {
      get().pause();
      get().play();
    }
  },

  jumpToDate: (dateStr) => {
    get().pause();
    const { candles } = get();
    const targetTime = Math.floor(new Date(dateStr).getTime() / 1000);
    
    // Find index of the first candle matching or exceeding target time
    const idx = candles.findIndex(c => (c.time as number) >= targetTime);
    if (idx !== -1) {
      set({ currentIndex: Math.max(1, idx + 1) });
    }
  }
}));
