import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type GradeType = 'A+' | 'A' | 'B' | 'C' | 'F';
export type EmotionType = 'Confident' | 'Fear' | 'Greed' | 'Revenge' | 'FOMO' | 'Hesitation' | 'Neutral';
export type SetupType = 'Breakout' | 'Pullback' | 'Trend Continuation' | 'Reversal' | 'ICT' | 'SMC' | 'Scalping' | 'Swing' | 'News' | 'None';
export type MistakeType = 
  | 'Early Entry' 
  | 'Late Entry' 
  | 'No SL' 
  | 'Overtrading' 
  | 'Revenge Trading' 
  | 'FOMO' 
  | 'Wrong Bias' 
  | 'Ignored Trend' 
  | 'News Trading';

export interface JournalEntry {
  tradeId: string;
  symbol: string;
  broker?: string;
  account?: string;
  side: 'buy' | 'sell';
  direction?: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  sl?: number;
  tp?: number;
  pnl: number;
  netPnl?: number;
  commission?: number;
  swap?: number;
  spread?: number;
  fees: number;
  rr?: number;
  openTime: string;
  closeTime: string;
  durationSec?: number;
  durationMs: number;
  session: 'Asian' | 'London' | 'New York';
  setupType: SetupType;
  strategyTag?: string;
  emotion: EmotionType;
  notes: string;
  tags: string[];
  grade: GradeType;
  mistakes: MistakeType[];
  screenshotBefore?: string; // base64 encoded image
  screenshotDuring?: string; // base64 encoded image
  screenshotAfter?: string;  // base64 encoded image
  entryReason?: string;
  exitReason?: string;
  confidenceScore?: number;  // 0 - 100
  riskPct?: number;
  leverage?: number;
  indicators?: string;
  newsEvent?: string;
  aiAnalysis?: string;
}

export interface DailyJournalData {
  morningPlan: string;
  lessonsLearned: string;
  endOfDaySummary: string;
  performanceRating?: number;
}

interface JournalState {
  entries: { [tradeId: string]: JournalEntry };
  dailyJournals: { [dateStr: string]: DailyJournalData };
  updateEntry: (tradeId: string, updates: Partial<JournalEntry>) => void;
  addManualEntry: (entry: JournalEntry) => void;
  importEntries: (newEntries: JournalEntry[]) => void;
  setDailyJournal: (dateStr: string, updates: Partial<DailyJournalData>) => void;
  getOrCreateEntry: (trade: {
    id: string;
    symbol: string;
    side: 'buy' | 'sell';
    entry_price: number;
    exit_price: number;
    quantity: number;
    pnl: number;
    timestamp: string;
    sl?: number;
    tp?: number;
    broker?: string;
    account?: string;
    commission?: number;
  }) => JournalEntry;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: {},
      dailyJournals: {},
      updateEntry: (tradeId, updates) => {
        set((state) => ({
          entries: {
            ...state.entries,
            [tradeId]: {
              ...state.entries[tradeId],
              ...updates,
            },
          },
        }));
      },
      addManualEntry: (entry) => {
        set((state) => ({
          entries: {
            ...state.entries,
            [entry.tradeId]: entry,
          },
        }));
      },
      importEntries: (newEntries) => {
        set((state) => {
          const map = { ...state.entries };
          newEntries.forEach((e) => {
            map[e.tradeId] = e;
          });
          return { entries: map };
        });
      },
      setDailyJournal: (dateStr, updates) => {
        set((state) => {
          const current = state.dailyJournals[dateStr] || {
            morningPlan: '',
            lessonsLearned: '',
            endOfDaySummary: '',
            performanceRating: 5.0,
          };
          return {
            dailyJournals: {
              ...state.dailyJournals,
              [dateStr]: {
                ...current,
                ...updates,
              },
            },
          };
        });
      },
      getOrCreateEntry: (trade) => {
        const state = get();
        if (state.entries[trade.id]) {
          return state.entries[trade.id];
        }

        const closeTime = trade.timestamp;
        let hash = 0;
        for (let i = 0; i < trade.id.length; i++) {
          hash = trade.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const offsetMinutes = (Math.abs(hash) % 180) + 15;
        const openDate = new Date(new Date(closeTime).getTime() - offsetMinutes * 60 * 1000);
        const openTime = openDate.toISOString();
        const durationMs = offsetMinutes * 60 * 1000;
        const durationSec = offsetMinutes * 60;

        const hour = openDate.getUTCHours();
        let session: 'Asian' | 'London' | 'New York' = 'New York';
        if (hour >= 0 && hour < 8) {
          session = 'Asian';
        } else if (hour >= 8 && hour < 16) {
          session = 'London';
        }

        const side = trade.side;
        const direction = side === 'buy' ? 'long' : 'short';
        const commission = trade.commission || Math.abs(trade.pnl) * 0.0005;
        const netPnl = trade.pnl - commission;

        const newEntry: JournalEntry = {
          tradeId: trade.id,
          symbol: trade.symbol,
          broker: trade.broker || 'Paper Trading',
          account: trade.account || 'Main Account',
          side,
          direction,
          entryPrice: trade.entry_price,
          exitPrice: trade.exit_price,
          quantity: trade.quantity,
          sl: trade.sl,
          tp: trade.tp,
          pnl: trade.pnl,
          netPnl,
          commission,
          swap: 0,
          spread: 0.2,
          fees: commission,
          rr: 2.0,
          openTime,
          closeTime,
          durationSec,
          durationMs,
          session,
          setupType: 'Breakout',
          strategyTag: 'Trend',
          emotion: 'Neutral',
          notes: '',
          tags: [],
          grade: 'B',
          mistakes: [],
          entryReason: '',
          exitReason: '',
          confidenceScore: 80,
          riskPct: 1.0,
          leverage: 1.0,
        };

        set((state) => ({
          entries: {
            ...state.entries,
            [trade.id]: newEntry,
          },
        }));

        return newEntry;
      },
    }),
    {
      name: 'trading-journal-store-v3',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
