import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getApiUrl } from '../services/config';

export interface PortfolioAccountItem {
  id: string;
  accountName: string;
  broker: 'MT5' | 'Binance' | 'Bybit' | 'Alpaca' | 'IBKR' | 'Zerodha' | 'Angel One' | 'Upstox' | 'Paper';
  accountType: 'live' | 'demo' | 'paper';
  accountGroup: 'Personal' | 'Prop Firm' | 'Retirement' | 'Crypto' | 'Swing' | 'Scalping' | 'Institutional';
  currency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD';
  balance: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnl: number;
  marginUsed: number;
  freeMargin: number;
  leverage: number;
  isActive: boolean;
}

export interface PortfolioPositionItem {
  id: string;
  accountId: string;
  broker: string;
  symbol: string;
  assetClass: 'Stocks' | 'Forex' | 'Crypto' | 'Commodities' | 'Indices' | 'ETFs' | 'Options' | 'Futures';
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  sl?: number;
  tp?: number;
  margin: number;
  exposure: number;
  sector: string;
  country: string;
}

export interface DividendItem {
  id: string;
  symbol: string;
  amount: number;
  yieldPct: number;
  exDate: string;
  payDate: string;
  status: 'Upcoming' | 'Received';
  type: string;
}

interface PortfolioState {
  baseCurrency: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD';
  accounts: PortfolioAccountItem[];
  positions: PortfolioPositionItem[];
  dividends: DividendItem[];
  
  // KPI Metrics
  totalEquity: number;
  totalBalance: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  annualReturn: number;
  drawdownPct: number;
  totalExposure: number;
  buyingPower: number;
  
  // Risk & Allocation
  beta: number;
  volatility: number;
  var95: number;
  var99: number;
  expectedShortfall: number;
  correlationMatrix: Record<string, Record<string, number>>;
  assetAllocation: { category: string; value: number; percentage: number }[];

  // Benchmarks
  benchmarks: Record<string, Record<string, number>>;

  // Cloud Sync Status
  lastSyncedAt: string | null;

  // Actions
  setBaseCurrency: (curr: 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD') => void;
  addAccount: (acct: Partial<PortfolioAccountItem>) => void;
  removeAccount: (id: string) => void;
  fetchPortfolioKPIs: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchPositions: () => Promise<void>;
  fetchRiskAndCorrelation: () => Promise<void>;
  fetchBenchmarks: () => Promise<void>;
  fetchDividends: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      baseCurrency: 'USD',
      accounts: [
        {
          id: 'acct_1',
          accountName: 'MT5 Institutional Live',
          broker: 'MT5',
          accountType: 'live',
          accountGroup: 'Prop Firm',
          currency: 'USD',
          balance: 50000.0,
          equity: 52400.0,
          unrealizedPnl: 2400.0,
          realizedPnl: 1200.0,
          marginUsed: 5000.0,
          freeMargin: 47400.0,
          leverage: 20.0,
          isActive: true,
        },
        {
          id: 'acct_2',
          accountName: 'Binance Spot Crypto',
          broker: 'Binance',
          accountType: 'live',
          accountGroup: 'Crypto',
          currency: 'USD',
          balance: 25000.0,
          equity: 27800.0,
          unrealizedPnl: 2800.0,
          realizedPnl: 3400.0,
          marginUsed: 0.0,
          freeMargin: 27800.0,
          leverage: 1.0,
          isActive: true,
        },
        {
          id: 'acct_3',
          accountName: 'Interactive Brokers Stocks',
          broker: 'IBKR',
          accountType: 'live',
          accountGroup: 'Personal',
          currency: 'USD',
          balance: 100000.0,
          equity: 104500.0,
          unrealizedPnl: 4500.0,
          realizedPnl: 6200.0,
          marginUsed: 12000.0,
          freeMargin: 92500.0,
          leverage: 2.0,
          isActive: true,
        },
      ],
      positions: [
        {
          id: 'pos_1',
          accountId: 'acct_1',
          broker: 'MT5',
          symbol: 'BTCUSDT',
          assetClass: 'Crypto',
          side: 'buy',
          quantity: 0.5,
          entryPrice: 64000.0,
          currentPrice: 65800.0,
          pnl: 900.0,
          pnlPct: 2.81,
          sl: 62000.0,
          tp: 70000.0,
          margin: 3200.0,
          exposure: 32900.0,
          sector: 'Crypto',
          country: 'Global',
        },
        {
          id: 'pos_2',
          accountId: 'acct_3',
          broker: 'IBKR',
          symbol: 'NVDA',
          assetClass: 'Stocks',
          side: 'buy',
          quantity: 20,
          entryPrice: 110.0,
          currentPrice: 124.5,
          pnl: 290.0,
          pnlPct: 13.18,
          sl: 100.0,
          tp: 150.0,
          margin: 2200.0,
          exposure: 2490.0,
          sector: 'Technology',
          country: 'US',
        },
        {
          id: 'pos_3',
          accountId: 'acct_1',
          broker: 'MT5',
          symbol: 'EURUSD',
          assetClass: 'Forex',
          side: 'buy',
          quantity: 2.0,
          entryPrice: 1.0820,
          currentPrice: 1.0875,
          pnl: 1100.0,
          pnlPct: 0.51,
          sl: 1.0780,
          tp: 1.0950,
          margin: 1082.0,
          exposure: 217500.0,
          sector: 'Currencies',
          country: 'EU',
        },
      ],
      dividends: [
        { id: 'div_1', symbol: 'AAPL', amount: 0.24, yieldPct: 0.6, exDate: '2026-08-10', payDate: '2026-08-15', status: 'Upcoming', type: 'Dividend' },
        { id: 'div_2', symbol: 'MSFT', amount: 0.75, yieldPct: 0.7, exDate: '2026-07-20', payDate: '2026-07-28', status: 'Received', type: 'Dividend' },
      ],

      totalEquity: 184700.0,
      totalBalance: 175000.0,
      unrealizedPnl: 9700.0,
      realizedPnl: 10800.0,
      dailyReturn: 5.54,
      weeklyReturn: 12.8,
      monthlyReturn: 24.5,
      annualReturn: 52.0,
      drawdownPct: 0.0,
      totalExposure: 252890.0,
      buyingPower: 1677000.0,

      beta: 1.12,
      volatility: 16.5,
      var95: 2.2,
      var99: 3.5,
      expectedShortfall: 4.2,
      correlationMatrix: {
        BTCUSDT: { BTCUSDT: 1.0, NVDA: 0.65, EURUSD: 0.25 },
        NVDA: { BTCUSDT: 0.65, NVDA: 1.0, EURUSD: 0.15 },
        EURUSD: { BTCUSDT: 0.25, NVDA: 0.15, EURUSD: 1.0 },
      },
      assetAllocation: [
        { category: 'Crypto', value: 32900.0, percentage: 51.5 },
        { category: 'Stocks', value: 2490.0, percentage: 3.9 },
        { category: 'Forex', value: 217500.0, percentage: 44.6 },
      ],

      benchmarks: {
        portfolio: { '1M': 8.5, '3M': 18.2, YTD: 34.5, '1Y': 48.0 },
        sp500: { '1M': 2.1, '3M': 6.4, YTD: 12.8, '1Y': 22.1 },
        nasdaq: { '1M': 3.4, '3M': 9.1, YTD: 16.5, '1Y': 28.4 },
        bitcoin: { '1M': 12.4, '3M': 28.5, YTD: 55.0, '1Y': 85.0 },
      },

      lastSyncedAt: new Date().toISOString(),

      setBaseCurrency: (curr) => {
        set({ baseCurrency: curr });
        get().fetchPortfolioKPIs();
      },

      addAccount: (acct) => {
        const newAccount: PortfolioAccountItem = {
          id: `acct_${Date.now()}`,
          accountName: acct.accountName || 'New Trading Account',
          broker: acct.broker || 'MT5',
          accountType: acct.accountType || 'live',
          accountGroup: acct.accountGroup || 'Personal',
          currency: acct.currency || 'USD',
          balance: acct.balance || 10000,
          equity: acct.balance || 10000,
          unrealizedPnl: 0,
          realizedPnl: 0,
          marginUsed: 0,
          freeMargin: acct.balance || 10000,
          leverage: acct.leverage || 10,
          isActive: true,
        };
        set((state) => ({ accounts: [...state.accounts, newAccount] }));
      },

      removeAccount: (id) => {
        set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) }));
      },

      fetchPortfolioKPIs: async () => {
        const { baseCurrency } = get();
        try {
          const res = await fetch(`${getApiUrl()}/api/portfolio/kpis?base_currency=${baseCurrency}`);
          if (res.ok) {
            const data = await res.json();
            set({
              totalEquity: data.total_equity,
              totalBalance: data.total_balance,
              unrealizedPnl: data.unrealized_pnl,
              realizedPnl: data.realized_pnl,
              dailyReturn: data.daily_return,
              weeklyReturn: data.weekly_return,
              monthlyReturn: data.monthly_return,
              annualReturn: data.annual_return,
              drawdownPct: data.drawdown_pct,
              totalExposure: data.total_exposure,
              buyingPower: data.buying_power,
            });
          }
        } catch (e) {
          console.error('Failed to fetch portfolio KPIs:', e);
        }
      },

      fetchAccounts: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/portfolio/accounts`);
          if (res.ok) {
            const data = await res.json();
            const mapped: PortfolioAccountItem[] = data.map((a: any) => ({
              id: a.id,
              accountName: a.account_name,
              broker: a.broker,
              accountType: a.account_type,
              accountGroup: a.account_group,
              currency: a.currency,
              balance: floatVal(a.balance),
              equity: floatVal(a.equity),
              unrealizedPnl: floatVal(a.unrealized_pnl),
              realizedPnl: floatVal(a.realized_pnl),
              marginUsed: floatVal(a.margin_used),
              freeMargin: floatVal(a.free_margin),
              leverage: floatVal(a.leverage),
              isActive: a.is_active,
            }));
            set({ accounts: mapped });
          }
        } catch (e) {
          console.error('Failed to fetch accounts:', e);
        }
      },

      fetchPositions: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/portfolio/positions`);
          if (res.ok) {
            const data = await res.json();
            if (data.positions && data.positions.length > 0) {
              const mapped: PortfolioPositionItem[] = data.positions.map((p: any) => ({
                id: p.id,
                accountId: p.account_id,
                broker: p.broker,
                symbol: p.symbol,
                assetClass: p.asset_class,
                side: p.side,
                quantity: floatVal(p.quantity),
                entryPrice: floatVal(p.entry_price),
                currentPrice: floatVal(p.current_price),
                pnl: floatVal(p.pnl),
                pnlPct: floatVal(p.pnl_pct),
                sl: p.sl ? floatVal(p.sl) : undefined,
                tp: p.tp ? floatVal(p.tp) : undefined,
                margin: floatVal(p.margin),
                exposure: floatVal(p.exposure),
                sector: p.sector,
                country: p.country,
              }));
              set({ positions: mapped });
            }
          }
        } catch (e) {
          console.error('Failed to fetch positions:', e);
        }
      },

      fetchRiskAndCorrelation: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/portfolio/risk`);
          if (res.ok) {
            const data = await res.json();
            set({
              beta: data.beta,
              volatility: data.volatility,
              var95: data.var_95,
              var99: data.var_99,
              expectedShortfall: data.expected_shortfall,
              correlationMatrix: data.correlation_matrix || {},
            });
          }
        } catch (e) {
          console.error('Failed to fetch risk & correlation:', e);
        }
      },

      fetchBenchmarks: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/portfolio/benchmarks`);
          if (res.ok) {
            const data = await res.json();
            set({ benchmarks: data });
          }
        } catch (e) {
          console.error('Failed to fetch benchmarks:', e);
        }
      },

      fetchDividends: async () => {
        try {
          const res = await fetch(`${getApiUrl()}/api/portfolio/dividends`);
          if (res.ok) {
            const data = await res.json();
            const mapped: DividendItem[] = data.map((d: any, idx: number) => ({
              id: d.id || `div_${idx}`,
              symbol: d.symbol,
              amount: floatVal(d.amount),
              yieldPct: floatVal(d.yield_pct),
              exDate: d.ex_date,
              payDate: d.pay_date,
              status: d.status,
              type: d.type || 'Dividend',
            }));
            set({ dividends: mapped });
          }
        } catch (e) {
          console.error('Failed to fetch dividends:', e);
        }
      },

      syncWithCloud: async () => {
        const { accounts, positions, baseCurrency } = get();
        try {
          const res = await fetch(`${getApiUrl()}/api/portfolio/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ baseCurrency, accountsCount: accounts.length, positionsCount: positions.length }),
          });
          if (res.ok) {
            set({ lastSyncedAt: new Date().toISOString() });
          }
        } catch (e) {
          console.error('Cloud sync failed:', e);
        }
      },
    }),
    {
      name: 'portfolio-management-store-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const floatVal = (v: any): number => (typeof v === 'number' ? v : parseFloat(v || '0'));
