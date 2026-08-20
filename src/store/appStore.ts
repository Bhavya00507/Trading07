import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Instrument, Account, TradeHistory } from '../types';
import { getApiUrl } from '../services/config';
import { useOrderStore } from './orderStore';
import { usePositionStore } from './positionStore';

export type Toast = {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
};

export type Settings = {
  mode: 'beginner' | 'pro';
  darkTheme: boolean;
  chartTradingEnabled: boolean;
};

type AppState = {
  watchlist: Instrument[];
  selectedInstrument: Instrument | null;
  settings: Settings;
  account: Account | null;
  token: string | null;
  refreshToken: string | null;
  user: { id: string; username: string; email: string } | null;
  toasts: Toast[];
  history: TradeHistory[];
  activeAccountType: string;
  setSelectedInstrument: (inst: Instrument) => void;
  setMode: (mode: Settings['mode']) => void;
  toggleTheme: () => void;
  setChartTradingEnabled: (enabled: boolean) => void;
  setAccount: (account: Account) => void;
  login: (token: string, user: { id: string; username: string; email: string }, refreshToken?: string) => void;
  logout: () => void;
  syncState: () => Promise<void>;
  setActiveAccountType: (type: string) => Promise<void>;
  addToast: (type: Toast['type'], text: string) => void;
  removeToast: (id: string) => void;
  addTradeHistory: (trade: TradeHistory) => void;
  setHistory: (history: TradeHistory[]) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      watchlist: [
        // Crypto
        { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', price: 65000, category: 'crypto' },
        { symbol: 'ETHUSDT', name: 'Ethereum / USDT', price: 3500, category: 'crypto' },
        // Forex
        { symbol: 'EURUSD', name: 'Euro / US Dollar', price: 1.17, category: 'forex' },
        { symbol: 'GBPUSD', name: 'Great British Pound / USD', price: 1.36, category: 'forex' },
        { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', price: 145.0, category: 'forex' },
        // Indices
        { symbol: 'US30', name: 'Dow Jones Index', price: 40000, category: 'indices' },
        { symbol: 'NAS100', name: 'Nasdaq 100 Index', price: 22700, category: 'indices' },
        { symbol: 'SPX500', name: 'S&P 500 Index', price: 6200, category: 'indices' },
        { symbol: 'GER40', name: 'DAX 40 Index', price: 24000, category: 'indices' },
        // Metals
        { symbol: 'XAUUSD', name: 'Gold / US Dollar', price: 3400, category: 'metals' },
        { symbol: 'XAGUSD', name: 'Silver / US Dollar', price: 36, category: 'metals' }
      ] as any[],
      selectedInstrument: { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', price: 65000, category: 'crypto' } as any,
      settings: { mode: 'beginner', darkTheme: true, chartTradingEnabled: true },
      account: null,
      token: null,
      refreshToken: null,
      user: null,
      toasts: [],
      history: [],
      activeAccountType: 'paper',
      setSelectedInstrument: (inst) => set({ selectedInstrument: inst }),
      setMode: (mode) => set((s) => ({ settings: { ...s.settings, mode } })),
      toggleTheme: () =>
          set((s) => ({ settings: { ...s.settings, darkTheme: !s.settings.darkTheme } })),
      setChartTradingEnabled: (chartTradingEnabled) =>
          set((s) => ({ settings: { ...s.settings, chartTradingEnabled } })),
      setAccount: (account) => set({ account }),
      login: (token, user, refreshToken) => {
        set({ token, refreshToken: refreshToken || null, user });
        // Automatically trigger sync on login
        get().syncState();
      },
      logout: () => {
        // Disconnect active WebSockets
        try {
          import('../services/marketWebSocket').then((m) => m.marketWebSocket.disconnect()).catch(() => {});
        } catch (e) {
          console.error('WebSocket disconnect error:', e);
        }

        // Reset all Zustand stores
        set({ token: null, refreshToken: null, user: null, account: null, toasts: [], history: [] });
        useOrderStore.getState().setOrders([]);
        usePositionStore.getState().setPositions([]);

        // Purge session & localStorage keys across Web and Electron Desktop
        localStorage.removeItem('trading-app-store');
        localStorage.removeItem('quantum_token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('quantum-user-saved-accounts');
        localStorage.removeItem('quantum-broker-accounts-v3');
        sessionStorage.clear();

        // Reload window to reset React DOM state
        window.location.reload();
      },
      addToast: (type, text) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((s) => ({ toasts: [...s.toasts, { id, type, text }] }));
        setTimeout(() => {
          get().removeToast(id);
        }, 4000);
      },
      removeToast: (id) => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      },
      addTradeHistory: (trade) => {
        set((s) => {
          // Prevent duplicates
          if (s.history.some((h) => h.id === trade.id)) return s;
          return { history: [trade, ...s.history] };
        });
      },
      setHistory: (history) => set({ history }),
      syncState: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const api = getApiUrl();
          // Fetch latest instruments from the centralized registry only if not already loaded
          if (get().watchlist.length === 0) {
            try {
              const instRes = await fetch(`${api}/market/instruments`);
              if (instRes.ok) {
                const instData = await instRes.json();
                if (instData && typeof instData === 'object') {
                  const crypto = Array.isArray(instData.crypto) ? instData.crypto : [];
                  const forex = Array.isArray(instData.forex) ? instData.forex : [];
                  const indices = Array.isArray(instData.indices) ? instData.indices : [];
                  const metals = Array.isArray(instData.metals) ? instData.metals : [];
                  const flattened = [...crypto, ...forex, ...indices, ...metals];
                  if (flattened.length > 0) {
                    set({ watchlist: flattened });
                  }
                }
              }
            } catch (e) {
              console.error('Failed to sync instruments:', e);
            }
          }

          const accountType = get().activeAccountType || 'paper';
          const res = await fetch(`${api}/sync-state?account_type=${accountType}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.status === 401 || res.status === 403) {
            get().logout();
            return;
          }
          if (!res.ok) {
            console.warn(`Sync state non-OK status: ${res.status}`);
            return;
          }
          const data = await res.json();
          if (!data || typeof data !== 'object') {
            console.warn('Invalid sync-state data format:', data);
            return;
          }
          
          // Atomically update all stores safely
          set({ 
            account: data.account || data.active_account || null,
            history: Array.isArray(data.history) ? data.history : []
          });
          if (Array.isArray(data.orders)) {
            useOrderStore.getState().setOrders(data.orders);
          }
          if (Array.isArray(data.positions)) {
            usePositionStore.getState().setPositions(data.positions);
          }
        } catch (err) {
          console.error('State reconciliation failed:', err);
        }
      },
      setActiveAccountType: async (type) => {
        set({ activeAccountType: type });
        await get().syncState();
      }
    }),
    {
      name: 'trading-app-store',
      storage: createJSONStorage(() => localStorage),
      // Persist settings, watchlist, token, refreshToken, and user details across refreshes
      partialize: (state) => ({
        settings: state.settings,
        watchlist: state.watchlist,
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        activeAccountType: state.activeAccountType
      })
    }
  )
);
