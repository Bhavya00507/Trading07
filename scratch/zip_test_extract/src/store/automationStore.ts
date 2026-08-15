import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BotConfig {
  id: string;
  name: string;
  enabled: boolean;
  symbol: string;
  timeframe: string;
  positionSize: number;
  maxTradesPerDay: number;
  riskPct: number;
  maxDailyLoss: number;
  sessions: string[];
  tpPips: number;
  slPips: number;
  status: 'running' | 'paused' | 'stopped';
  winRate: number;
  pnl: number;
  lastTrade: string;
  tradeCount: number;
}

type AutomationState = {
  bots: BotConfig[];
  toggleBot: (id: string) => void;
  updateBot: (id: string, updates: Partial<BotConfig>) => void;
  tickBotsSimulation: () => void;
};

const INITIAL_BOTS: BotConfig[] = [
  { id: 'ema', name: 'EMA Crossover Bot', enabled: false, symbol: 'BTCUSDT', timeframe: '1m', positionSize: 0.1, maxTradesPerDay: 5, riskPct: 1, maxDailyLoss: 200, sessions: ['London', 'New York'], tpPips: 50, slPips: 25, status: 'stopped', winRate: 64.5, pnl: 450.20, lastTrade: 'Buy 0.1 BTCUSDT @ 64850', tradeCount: 12 },
  { id: 'rsi', name: 'RSI Reversal Bot', enabled: false, symbol: 'EURUSD', timeframe: '5m', positionSize: 0.5, maxTradesPerDay: 10, riskPct: 2, maxDailyLoss: 500, sessions: ['Asian', 'London', 'New York'], tpPips: 15, slPips: 8, status: 'stopped', winRate: 58.2, pnl: -120.50, lastTrade: 'Sell 0.5 EURUSD @ 1.0874', tradeCount: 19 },
  { id: 'macd', name: 'MACD Trend Bot', enabled: false, symbol: 'GBPUSD', timeframe: '15m', positionSize: 0.3, maxTradesPerDay: 3, riskPct: 1.5, maxDailyLoss: 300, sessions: ['London', 'New York'], tpPips: 30, slPips: 15, status: 'stopped', winRate: 70.0, pnl: 890.00, lastTrade: 'Buy 0.3 GBPUSD @ 1.2742', tradeCount: 10 },
  { id: 'breakout', name: 'Breakout Bot', enabled: false, symbol: 'XAUUSD', timeframe: '5m', positionSize: 0.2, maxTradesPerDay: 8, riskPct: 2.5, maxDailyLoss: 800, sessions: ['London', 'New York'], tpPips: 100, slPips: 50, status: 'stopped', winRate: 52.8, pnl: 1450.00, lastTrade: 'Buy 0.2 XAUUSD @ 2342.10', tradeCount: 25 },
  { id: 'london', name: 'London Session Bot', enabled: false, symbol: 'EURUSD', timeframe: '15m', positionSize: 1.0, maxTradesPerDay: 2, riskPct: 1.0, maxDailyLoss: 1000, sessions: ['London'], tpPips: 20, slPips: 10, status: 'stopped', winRate: 66.7, pnl: 320.00, lastTrade: 'Buy 1.0 EURUSD @ 1.0850', tradeCount: 6 },
  { id: 'ny', name: 'New York Session Bot', enabled: false, symbol: 'US30', timeframe: '5m', positionSize: 0.05, maxTradesPerDay: 4, riskPct: 1.5, maxDailyLoss: 600, sessions: ['New York'], tpPips: 80, slPips: 40, status: 'stopped', winRate: 60.0, pnl: -210.00, lastTrade: 'Sell 0.05 US30 @ 39850', tradeCount: 5 },
  { id: 'scalping', name: 'Scalping Bot', enabled: false, symbol: 'NAS100', timeframe: '1m', positionSize: 0.1, maxTradesPerDay: 20, riskPct: 3.0, maxDailyLoss: 1500, sessions: ['London', 'New York'], tpPips: 20, slPips: 10, status: 'stopped', winRate: 62.1, pnl: 2150.00, lastTrade: 'Buy 0.1 NAS100 @ 19742', tradeCount: 58 }
];

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set) => ({
      bots: INITIAL_BOTS,
      toggleBot: (id) =>
        set((state) => ({
          bots: state.bots.map((b) => {
            if (b.id !== id) return b;
            const nextEnabled = !b.enabled;
            return {
              ...b,
              enabled: nextEnabled,
              status: nextEnabled ? 'running' : 'stopped',
            };
          }),
        })),
      updateBot: (id, updates) =>
        set((state) => ({
          bots: state.bots.map((b) => (b.id === id ? { ...b, ...updates } : b)),
        })),
      tickBotsSimulation: () =>
        set((state) => ({
          bots: state.bots.map((b) => {
            if (!b.enabled || b.status !== 'running') return b;
            
            // 2% chance of executing a trade on each tick
            if (Math.random() > 0.02) return b;

            const isWin = Math.random() < (b.winRate / 100);
            const rawPips = isWin ? b.tpPips : -b.slPips;
            
            // Approximate pnl calculation
            const isForex = b.symbol.indexOf('USD') !== -1 && b.symbol.length === 6;
            const multiplier = isForex ? 10 : 2; 
            const tradePnl = parseFloat((b.positionSize * rawPips * multiplier).toFixed(2));
            const newPnl = parseFloat((b.pnl + tradePnl).toFixed(2));
            
            // Random entry price based on some baseline
            const randPrice = b.symbol.includes('BTC') ? 65000 + Math.random() * 500 :
                             b.symbol.includes('XAU') ? 2300 + Math.random() * 20 :
                             b.symbol.includes('EUR') ? 1.0800 + Math.random() * 0.0050 : 1.2500 + Math.random() * 0.0050;
            const formattedPrice = randPrice.toFixed(b.symbol.includes('EUR') || b.symbol.includes('GBP') ? 4 : 2);
            
            const side = Math.random() > 0.5 ? 'Buy' : 'Sell';
            const lastTrade = `${side} ${b.positionSize} ${b.symbol} @ ${formattedPrice}`;
            
            const nextTradeCount = b.tradeCount + 1;
            const nextWinRate = parseFloat(((b.winRate * b.tradeCount + (isWin ? 100 : 0)) / nextTradeCount).toFixed(1));

            // Dispatches simulated-trade event for toast/notification managers
            try {
              const event = new CustomEvent('simulated-trade', {
                detail: { botName: b.name, lastTrade, tradePnl }
              });
              window.dispatchEvent(event);
            } catch (err) {}

            return {
              ...b,
              pnl: newPnl,
              lastTrade,
              tradeCount: nextTradeCount,
              winRate: nextWinRate,
            };
          }),
        })),
    }),
    {
      name: 'trading-automation-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
