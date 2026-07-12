import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type GradeType = 'A+' | 'A' | 'B' | 'C' | 'F';
export type EmotionType = 'Confident' | 'Fear' | 'Greed' | 'Revenge' | 'FOMO' | 'Hesitation' | 'Neutral';
export type SetupType = 'Breakout' | 'Pullback' | 'Trend Continuation' | 'Reversal' | 'ICT' | 'SMC' | 'Scalping' | 'Swing' | 'None';
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
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  fees: number;
  openTime: string;
  closeTime: string;
  durationMs: number;
  session: 'Asian' | 'London' | 'New York';
  setupType: SetupType;
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
}

export interface DailyJournalData {
  morningPlan: string;
  lessonsLearned: string;
  endOfDaySummary: string;
}

interface JournalState {
  entries: { [tradeId: string]: JournalEntry };
  dailyJournals: { [dateStr: string]: DailyJournalData };
  updateEntry: (tradeId: string, updates: Partial<JournalEntry>) => void;
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
      setDailyJournal: (dateStr, updates) => {
        set((state) => {
          const current = state.dailyJournals[dateStr] || {
            morningPlan: '',
            lessonsLearned: '',
            endOfDaySummary: '',
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

        // Deduce details
        const closeTime = trade.timestamp;
        let hash = 0;
        for (let i = 0; i < trade.id.length; i++) {
          hash = trade.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const offsetMinutes = (Math.abs(hash) % 180) + 15;
        const openDate = new Date(new Date(closeTime).getTime() - offsetMinutes * 60 * 1000);
        const openTime = openDate.toISOString();
        const durationMs = offsetMinutes * 60 * 1000;

        const hour = openDate.getUTCHours();
        let session: 'Asian' | 'London' | 'New York' = 'New York';
        if (hour >= 0 && hour < 8) {
          session = 'Asian';
        } else if (hour >= 8 && hour < 16) {
          session = 'London';
        }

        const newEntry: JournalEntry = {
          tradeId: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          entryPrice: trade.entry_price,
          exitPrice: trade.exit_price,
          quantity: trade.quantity,
          pnl: trade.pnl,
          fees: Math.abs(trade.pnl) * 0.0005,
          openTime,
          closeTime,
          durationMs,
          session,
          setupType: 'None',
          emotion: 'Neutral',
          notes: '',
          tags: [],
          grade: 'B',
          mistakes: [],
          entryReason: '',
          exitReason: '',
          confidenceScore: 70,
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
      name: 'trading-journal-store-v2',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
