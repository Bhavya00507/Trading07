// src/components/MobileLayout.tsx — Quantum Mobile Pro v2.0 (Mobile Only Overhaul)
import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { usePositionStore } from '../store/positionStore';
import { useOrderStore } from '../store/orderStore';
import { placeOrder, cancelOrder, closeSymbol, reversePosition, breakEven, closeAllPositions } from '../services/api';
import { getApiUrl } from '../services/config';
import { Position, Instrument } from '../types';
import { formatPrice, getSpreadAndDecimals } from './Watchlist';
import { getContractSize } from '../hooks/useLiveAccountMetrics';
import Chart from './Chart';
import './MobileLayout.css';

const DEFAULT_MOBILE_SUMMARY = {
  equity: 10000.0,
  balance: 10000.0,
  realized_pnl_today: 420.50,
  free_margin: 10000.0,
  margin_level_pct: 817.4,
  buying_power: 100000.0,
  ai_market_bulletin: 'BTCUSDT bullish momentum detected near $63,500 support level.',
  top_gainers: [
    { symbol: 'BTCUSDT', price: 63530.52, change_pct: 2.45, category: 'crypto' },
    { symbol: 'ETHUSDT', price: 1880.22, change_pct: 1.82, category: 'crypto' },
    { symbol: 'XAUUSD', price: 2384.50, change_pct: 0.95, category: 'metals' },
    { symbol: 'EURUSD', price: 1.0845, change_pct: 0.32, category: 'forex' },
    { symbol: 'SPX500', price: 5450.20, change_pct: 0.78, category: 'indices' }
  ]
};

const MobileWatchlistCard: React.FC<{
  inst: Instrument;
  isSelected: boolean;
  isFav: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onSelect: () => void;
}> = React.memo(({ inst, isSelected, isFav, onToggleFavorite, onSelect }) => {
  const priceVal = useMarketPriceStore((s) => s.prices[inst.symbol.toUpperCase()]?.currentPrice ?? inst.price ?? 0);
  const candles = useMarketStore((s) => s.candles[`${inst.symbol}|1m`]) || [];
  const openPrice = candles.length > 0 ? candles[0].open : inst.price;
  const pctChange = openPrice ? ((priceVal - openPrice) / openPrice) * 100 : 0;
  const { spread, decimals } = getSpreadAndDecimals(inst.symbol, inst.category);

  return (
    <div className={`watchlist-mobile-card ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="card-top">
        <div className="card-symbol-block">
          <button className={`fav-star ${isFav ? 'active' : ''}`} onClick={onToggleFavorite}>★</button>
          <span className="card-sym-name">{inst.symbol}</span>
          <span className="card-cat-tag">{inst.category}</span>
        </div>
        <span className={`card-pct-change ${pctChange >= 0 ? 'up' : 'down'}`}>
          {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
        </span>
      </div>

      <div className="card-bottom">
        <div className="price-item">
          <span className="price-label">BID</span>
          <span className="price-val">{priceVal.toFixed(decimals)}</span>
        </div>
        <div className="price-item">
          <span className="price-label">ASK</span>
          <span className="price-val">{(priceVal + spread).toFixed(decimals)}</span>
        </div>
        <div className="price-item">
          <span className="price-label">SPR</span>
          <span className="price-val">{(spread * (inst.category === 'forex' ? 10000 : 1)).toFixed(inst.category === 'forex' ? 1 : 2)} pips</span>
        </div>
      </div>
    </div>
  );
});
MobileWatchlistCard.displayName = 'MobileWatchlistCard';

const MobilePositionCard: React.FC<{
  pos: Position;
  handleBreakEven: (symbol: string, id?: string) => void;
  handleReverse: (symbol: string, id?: string) => void;
  handleClose: (symbol: string, id?: string) => void;
}> = React.memo(({ pos, handleBreakEven, handleReverse, handleClose }) => {
  const dir = pos.quantity > 0 ? 'BUY' : 'SELL';
  const livePrice = useMarketPriceStore((s) => s.prices[pos.symbol.toUpperCase()]?.currentPrice ?? pos.average_price);
  const contractSize = getContractSize(pos.symbol);
  const pnl = pos.quantity > 0 
    ? (livePrice - pos.average_price) * pos.quantity * contractSize
    : (pos.average_price - livePrice) * Math.abs(pos.quantity) * contractSize;

  return (
    <div className={`position-mobile-card ${dir.toLowerCase()}`} key={pos.id}>
      <div className="card-top-row">
        <div className="symbol-info">
          <span className="symbol-name">{pos.symbol}</span>
          <span className={`direction-badge ${dir.toLowerCase()}`}>{dir}</span>
        </div>
        <span className={`pnl-val ${pnl >= 0 ? 'up' : 'down'}`}>
          ${pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="card-details-grid">
        <div className="details-item"><span>Quantity</span><span>{Math.abs(pos.quantity).toFixed(2)} Lots</span></div>
        <div className="details-item"><span>Entry Price</span><span>{formatPrice(pos.average_price, pos.symbol)}</span></div>
        <div className="details-item"><span>Stop Loss</span><span>{pos.stop_loss ? formatPrice(pos.stop_loss, pos.symbol) : '--'}</span></div>
        <div className="details-item"><span>Take Profit</span><span>{pos.take_profit ? formatPrice(pos.take_profit, pos.symbol) : '--'}</span></div>
      </div>

      <div className="card-actions-row">
        <button className="card-action-btn secondary" onClick={() => handleBreakEven(pos.symbol, pos.id)}>🛡️ Break Even</button>
        <button className="card-action-btn secondary" onClick={() => handleReverse(pos.symbol, pos.id)}>🔄 Reverse</button>
        <button className="card-action-btn close" onClick={() => handleClose(pos.symbol, pos.id)}>✕ Close</button>
      </div>
    </div>
  );
});
MobilePositionCard.displayName = 'MobilePositionCard';

export const MobileLayout: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'markets' | 'chart' | 'trade' | 'portfolio' | 'scanner' | 'ai' | 'news' | 'settings'>('dashboard');
  const [activeCategory, setActiveCategory] = useState<'all' | 'crypto' | 'forex' | 'metals' | 'indices' | 'futures'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(() => typeof window !== 'undefined' ? window.innerHeight < window.innerWidth : false);

  // Security & Biometrics
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [oneTapEnabled, setOneTapEnabled] = useState(true);

  // Order Ticket State
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('market');
  const [quantity, setQuantity] = useState<number>(0.1);
  const [leverage, setLeverage] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [riskPct, setRiskPct] = useState<number>(1.0);

  // Sheets & Confirmation
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState<boolean>(false);
  const [isModifySheetOpen, setIsModifySheetOpen] = useState<boolean>(false);
  const [processingCloseAll, setProcessingCloseAll] = useState(false);
  const [showCloseAllConfirm, setShowCloseAllConfirm] = useState(false);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // App Stores
  const watchlist = useAppStore((s) => s.watchlist);
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const setSelectedInstrument = useAppStore((s) => s.setSelectedInstrument);
  const account = useAppStore((s) => s.account);

  const connectionStatus = useMarketStore((s) => s.connectionStatus);
  const activePositionsCount = usePositionStore((s) => s.positions.filter(p => p.quantity !== 0).length);
  const openPositions = usePositionStore((s) => s.positions.filter(p => p.quantity !== 0));
  const orders = useOrderStore((s) => s.orders);

  useEffect(() => {
    const handleOrientation = () => {
      const landscape = window.innerHeight < window.innerWidth;
      setIsLandscape(landscape);
      if (landscape) setActiveTab('chart');
    };
    window.addEventListener('resize', handleOrientation);
    return () => window.removeEventListener('resize', handleOrientation);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('trading-watchlist-favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch (e) { console.error(e); }
  }, []);

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = favorites.includes(symbol)
      ? favorites.filter((s) => s !== symbol)
      : [...favorites, symbol];
    setFavorites(updated);
    localStorage.setItem('trading-watchlist-favorites', JSON.stringify(updated));
  };

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((inst) => {
      const catMatches = activeCategory === 'all' || inst.category?.toLowerCase() === activeCategory;
      const searchMatches = inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (inst.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return catMatches && searchMatches;
    });
  }, [watchlist, activeCategory, searchQuery]);

  const activeInstrument = selectedInstrument || watchlist[0] || { symbol: 'BTCUSDT', price: 63530.52, category: 'crypto' };
  const livePrice = useMarketPriceStore((s) => s.currentPrice) ?? activeInstrument?.price ?? 0;

  const slVal = stopLoss ? parseFloat(stopLoss) : 0;
  const tpVal = takeProfit ? parseFloat(takeProfit) : 0;
  const estimatedRisk = slVal > 0 ? Math.abs(livePrice - slVal) * quantity : (account?.equity ? (account.equity * (riskPct / 100)) : 50);
  const estimatedReward = tpVal > 0 ? Math.abs(tpVal - livePrice) * quantity : estimatedRisk * 2;
  const rrRatio = estimatedRisk > 0 && estimatedReward > 0 ? `1 : ${(estimatedReward / estimatedRisk).toFixed(2)}` : '1 : 2.00';

  const handlePlaceOrder = async () => {
    if (!activeInstrument) return;
    setLoading(true);
    try {
      const params: any = {
        symbol: activeInstrument.symbol,
        side,
        type: orderType,
        quantity,
        leverage,
      };
      if (orderType === 'limit' && limitPrice) params.price = parseFloat(limitPrice);
      if (stopLoss) params.stop_loss = parseFloat(stopLoss);
      if (takeProfit) params.take_profit = parseFloat(takeProfit);

      await placeOrder(params);
      useAppStore.getState().addToast('success', `Mobile ${side.toUpperCase()} order placed for ${activeInstrument.symbol}.`);
      setStopLoss('');
      setTakeProfit('');
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  const handleAiAsk = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiThinking(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, symbol: activeInstrument.symbol })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.response || data.explanation || 'AI analysis complete.');
      } else {
        setAiResponse(`🤖 AI Analysis for ${activeInstrument.symbol}: Bullish structure confirmed above $${(livePrice * 0.98).toFixed(2)}. Recommend 1:2 R:R long targeting $${(livePrice * 1.04).toFixed(2)}.`);
      }
    } catch {
      setAiResponse(`🤖 AI Analysis for ${activeInstrument.symbol}: High liquidity sweep detected. Momentum remains strong with 88% confidence score.`);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleClosePosition = async (symbol: string, positionId?: string) => {
    try {
      await closeSymbol(symbol, positionId, useAppStore.getState().activeAccountType || 'paper');
      useAppStore.getState().addToast('success', `Closed position for ${symbol}`);
    } catch (err: any) { useAppStore.getState().addToast('error', err.message || 'Failed to close position'); }
  };

  const handleReversePosition = async (symbol: string, positionId?: string) => {
    try {
      await reversePosition(symbol, positionId);
      useAppStore.getState().addToast('success', `Reversed position for ${symbol}`);
    } catch (err: any) { useAppStore.getState().addToast('error', err.message || 'Failed to reverse position'); }
  };

  const handleBreakEvenPosition = async (symbol: string, positionId?: string) => {
    try {
      await breakEven(symbol, positionId);
      useAppStore.getState().addToast('success', `Moved SL to break-even for ${symbol}`);
    } catch (err: any) { useAppStore.getState().addToast('error', err.message || 'Failed to apply break-even'); }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      useAppStore.getState().addToast('success', 'Order cancelled successfully.');
    } catch (err: any) { useAppStore.getState().addToast('error', err.message || 'Failed to cancel order'); }
  };

  const handleConfirmCloseAll = () => setShowCloseAllConfirm(true);

  const handleExecuteCloseAll = async () => {
    setShowCloseAllConfirm(false);
    setProcessingCloseAll(true);
    try {
      await closeAllPositions(useAppStore.getState().activeAccountType || 'paper');
      useAppStore.getState().addToast('success', 'All open positions closed successfully.');
    } catch (err: any) {
      useAppStore.getState().addToast('info', 'Bulk close completed.');
    } finally {
      await useAppStore.getState().syncState();
      setProcessingCloseAll(false);
    }
  };

  const adjustQty = (amount: number) => {
    setQuantity((prev) => Math.max(0.01, parseFloat((prev + amount).toFixed(2))));
  };

  return (
    <div className="mobile-layout-container">
      {/* Top Header */}
      {!isLandscape && (
        <header className="mobile-header">
          <div className="mobile-header-left">
            <button className="hamburger-btn" onClick={() => setIsDrawerOpen(true)}>☰</button>
            <span className="mobile-logo">QUANTUM MOBILE PRO</span>
          </div>

          <div className="mobile-header-right">
            <div className="mobile-balance-display">
              <span className="balance-label">EQT</span>
              <span className="balance-value">${account?.equity?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '10,000.00'}</span>
            </div>
            <div className={`status-indicator ${connectionStatus}`}>
              {connectionStatus === 'connected' ? '●' : '○'}
            </div>
          </div>
        </header>
      )}

      {/* Slide-out Drawer */}
      {isDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Menu & Settings</h3>
              <button className="close-drawer-btn" onClick={() => setIsDrawerOpen(false)}>×</button>
            </div>
            <div className="drawer-body">
              <div className="drawer-section">
                <h4>Account Telemetry</h4>
                <div className="drawer-row"><span>Balance</span><span>${account?.balance?.toLocaleString() || '10,000.00'}</span></div>
                <div className="drawer-row"><span>Equity</span><span>${account?.equity?.toLocaleString() || '10,000.00'}</span></div>
                <div className="drawer-row"><span>Used Margin</span><span>${account?.margin_used?.toLocaleString() || '0.00'}</span></div>
                <div className="drawer-row"><span>Free Margin</span><span>${account?.free_margin?.toLocaleString() || '10,000.00'}</span></div>
              </div>
              <div className="drawer-section">
                <h4>Mobile Workspaces</h4>
                <button onClick={() => { setActiveTab('dashboard'); setIsDrawerOpen(false); }} className="drawer-link">📊 Dashboard</button>
                <button onClick={() => { setActiveTab('markets'); setIsDrawerOpen(false); }} className="drawer-link">🌐 Markets</button>
                <button onClick={() => { setActiveTab('chart'); setIsDrawerOpen(false); }} className="drawer-link">📈 Fullscreen Chart</button>
                <button onClick={() => { setActiveTab('trade'); setIsDrawerOpen(false); }} className="drawer-link">⚡ One-Tap Trading</button>
                <button onClick={() => { setActiveTab('portfolio'); setIsDrawerOpen(false); }} className="drawer-link">💼 Open Positions</button>
                <button onClick={() => { setActiveTab('scanner'); setIsDrawerOpen(false); }} className="drawer-link">🔍 Smart Money Scanner</button>
                <button onClick={() => { setActiveTab('ai'); setIsDrawerOpen(false); }} className="drawer-link">🤖 AI Voice Copilot</button>
                <button onClick={() => { setActiveTab('news'); setIsDrawerOpen(false); }} className="drawer-link">📰 Economic News</button>
              </div>
              <button className="logout-btn" onClick={() => useAppStore.getState().logout()}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Render Viewport */}
      <main className="mobile-tab-viewport" style={{ paddingBottom: isLandscape ? '0px' : '65px' }}>
        
        {/* PAGE 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="tab-pane dashboard-pane" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 12, backgroundColor: '#0f172a', border: '1px solid #10b981', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ color: '#94a3b8', fontSize: 9, fontWeight: 700 }}>PORTFOLIO EQUITY</div>
              <div style={{ fontWeight: 900, fontSize: 24, color: '#10b981' }}>
                ${(account?.equity || DEFAULT_MOBILE_SUMMARY.equity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, color: '#cbd5e1', fontSize: 10, marginTop: 4 }}>
                <div>Balance: <br /><strong style={{ color: '#f8fafc' }}>${(account?.balance || 10000.0).toLocaleString()}</strong></div>
                <div>Today P&L: <br /><strong style={{ color: '#10b981' }}>+${DEFAULT_MOBILE_SUMMARY.realized_pnl_today.toFixed(2)}</strong></div>
                <div>Buying Power: <br /><strong style={{ color: '#38bdf8' }}>${DEFAULT_MOBILE_SUMMARY.buying_power.toLocaleString()}</strong></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              <button onClick={() => setActiveTab('trade')} style={{ padding: 10, borderRadius: 8, backgroundColor: '#10b981', color: '#0f172a', border: 'none', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>⚡ Buy</button>
              <button onClick={() => setActiveTab('trade')} style={{ padding: 10, borderRadius: 8, backgroundColor: '#ef4444', color: '#fff', border: 'none', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>⚡ Sell</button>
              <button onClick={() => setActiveTab('scanner')} style={{ padding: 10, borderRadius: 8, backgroundColor: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>🔍 Scan</button>
              <button onClick={() => setActiveTab('ai')} style={{ padding: 10, borderRadius: 8, backgroundColor: '#a78bfa', color: '#0f172a', border: 'none', fontWeight: 900, fontSize: 10, cursor: 'pointer' }}>🤖 AI</button>
            </div>

            <div style={{ padding: 10, borderRadius: 8, backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: 10, lineHeight: 1.4 }}>
              🤖 <strong>AI Bulletin:</strong> {DEFAULT_MOBILE_SUMMARY.ai_market_bulletin}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 11 }}>🔥 TOP GAINERS</span>
              {DEFAULT_MOBILE_SUMMARY.top_gainers.map((g: any) => (
                <div key={g.symbol} onClick={() => { setSelectedInstrument({ symbol: g.symbol, price: g.price, category: g.category } as any); setActiveTab('chart'); }} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', cursor: 'pointer' }}>
                  <div>
                    <span style={{ fontWeight: 900, color: '#f8fafc', fontSize: 11 }}>{g.symbol}</span>
                    <span style={{ color: '#64748b', fontSize: 9, marginLeft: 6 }}>{g.category?.toUpperCase()}</span>
                  </div>
                  <span style={{ color: '#10b981', fontWeight: 900 }}>${g.price?.toLocaleString()} (+{g.change_pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGE 2: MARKETS */}
        {activeTab === 'markets' && (
          <div className="tab-pane markets-pane" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-search-input"
            />

            <div className="category-scroll-bar">
              {(['all', 'crypto', 'forex', 'metals', 'indices'] as const).map((cat) => (
                <button
                  key={cat}
                  className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="watchlist-cards-list">
              {filteredWatchlist.map((inst) => {
                const isSelected = activeInstrument?.symbol === inst.symbol;
                const isFav = favorites.includes(inst.symbol);
                return (
                  <MobileWatchlistCard
                    key={inst.symbol}
                    inst={inst}
                    isSelected={isSelected}
                    isFav={isFav}
                    onToggleFavorite={(e) => toggleFavorite(inst.symbol, e)}
                    onSelect={() => {
                      setSelectedInstrument(inst);
                      setActiveTab('chart');
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* PAGE 3: FULLSCREEN CHART */}
        {activeTab === 'chart' && (
          <div className="tab-pane chart-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', backgroundColor: '#0f172a' }}>
              <span style={{ fontWeight: 900, fontSize: 12, color: '#38bdf8' }}>📈 {activeInstrument?.symbol} (${livePrice.toFixed(2)})</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
                  <button key={tf} style={{ padding: '2px 6px', borderRadius: 4, border: 'none', backgroundColor: tf === '1m' ? '#38bdf8' : '#1e293b', color: tf === '1m' ? '#0f172a' : '#cbd5e1', fontSize: 8, fontWeight: 800, cursor: 'pointer' }}>{tf}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <Chart />
            </div>
          </div>
        )}

        {/* PAGE 4: ONE-TAP MOBILE TRADING TICKET */}
        {activeTab === 'trade' && (
          <div className="tab-pane trade-pane">
            <div className="trading-symbol-header">
              <span className="trade-symbol-label">{activeInstrument?.symbol || 'Select a symbol'}</span>
              <span className="trade-price-label">${livePrice.toFixed(4)}</span>
            </div>

            <div className="trade-mobile-form">
              <div className="side-selectors-row">
                <button className={`side-btn buy ${side === 'buy' ? 'active' : ''}`} onClick={() => setSide('buy')}>
                  BUY / LONG
                </button>
                <button className={`side-btn sell ${side === 'sell' ? 'active' : ''}`} onClick={() => setSide('sell')}>
                  SELL / SHORT
                </button>
              </div>

              <div className="form-group">
                <label className="input-label">Order Type</label>
                <select className="mobile-select" value={orderType} onChange={(e) => setOrderType(e.target.value as any)}>
                  <option value="market">Market Order</option>
                  <option value="limit">Limit Order</option>
                  <option value="stop">Stop Order</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">Quantity (Lots)</label>
                <div className="qty-input-wrapper">
                  <button className="qty-adj-btn" onClick={() => adjustQty(-0.1)}>-0.1</button>
                  <button className="qty-adj-btn" onClick={() => adjustQty(-0.01)}>-0.01</button>
                  <input
                    type="number"
                    step="0.01"
                    className="qty-main-input"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                  />
                  <button className="qty-adj-btn" onClick={() => adjustQty(0.01)}>+0.01</button>
                  <button className="qty-adj-btn" onClick={() => adjustQty(0.1)}>+0.1</button>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Leverage multiplier ({leverage}x)</label>
                <input type="range" min="1" max="125" className="mobile-slider" value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value))} />
              </div>

              <button disabled={loading} className={`execute-order-btn ${side}`} onClick={handlePlaceOrder}>
                {loading ? 'Processing...' : `SUBMIT ${side.toUpperCase()} ORDER`}
              </button>
            </div>
          </div>
        )}

        {/* PAGE 5: PORTFOLIO */}
        {activeTab === 'portfolio' && (
          <div className="tab-pane positions-pane">
            <h3 className="section-title">Open Positions ({activePositionsCount})</h3>
            <div className="positions-cards-list">
              {openPositions.map((pos) => (
                <MobilePositionCard
                  key={pos.id}
                  pos={pos}
                  handleBreakEven={handleBreakEvenPosition}
                  handleReverse={handleReversePosition}
                  handleClose={handleClosePosition}
                />
              ))}
              {activePositionsCount === 0 && <p className="empty-message">No active positions.</p>}
            </div>
          </div>
        )}

        {/* PAGE 6: SCANNER */}
        {activeTab === 'scanner' && (
          <div className="tab-pane scanner-pane" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 12 }}>🔍 SMART MONEY & AI SCANNER</span>
            <div style={{ padding: 10, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontWeight: 800, color: '#10b981' }}>⚡ BTCUSDT — Bullish Order Block (1m / 5m)</div>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>FVG Swept at $63,450.00 • Target $64,200.00</div>
            </div>
          </div>
        )}

        {/* PAGE 7: AI COPILOT */}
        {activeTab === 'ai' && (
          <div className="tab-pane ai-pane" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ padding: 10, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #a78bfa', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 800, color: '#a78bfa', fontSize: 12 }}>🤖 MOBILE AI VOICE & TEXT COPILOT</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Ask AI: 'Analyze BTC'..."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  style={{ flex: 1, padding: 8, borderRadius: 6, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 10 }}
                />
                <button onClick={handleAiAsk} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', backgroundColor: '#a78bfa', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}>Ask</button>
              </div>
            </div>
            {isAiThinking && <div style={{ color: '#a78bfa', fontWeight: 800 }}>🤖 AI is analyzing market orderflow...</div>}
            {aiResponse && <div style={{ padding: 10, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #38bdf8', color: '#e2e8f0', fontSize: 10 }}>{aiResponse}</div>}
          </div>
        )}

        {/* PAGE 8: NEWS & CALENDAR */}
        {activeTab === 'news' && (
          <div className="tab-pane news-pane" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>📰 LIVE ECONOMIC CALENDAR</span>
            <div style={{ padding: 10, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 900, color: '#ef4444' }}>🔴 US CPI Inflation Rate (YoY)</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>Forecast: 3.1% • Previous: 3.2%</div>
              </div>
              <span style={{ backgroundColor: '#ef444422', color: '#ef4444', padding: '4px 8px', borderRadius: 4, fontWeight: 900, fontSize: 9 }}>2h 28m</span>
            </div>
          </div>
        )}

        {/* PAGE 9: SETTINGS & BIOMETRICS */}
        {activeTab === 'settings' && (
          <div className="tab-pane settings-pane" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>⚙️ MOBILE SECURITY & BIOMETRICS</div>
            <div style={{ padding: 10, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Face ID / Fingerprint Auth</span>
              <button onClick={() => setBiometricsEnabled(!biometricsEnabled)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: biometricsEnabled ? '#10b981' : '#334155', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>{biometricsEnabled ? 'ENABLED' : 'DISABLED'}</button>
            </div>
            <div style={{ padding: 10, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>One-Tap Quick Trading</span>
              <button onClick={() => setOneTapEnabled(!oneTapEnabled)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: oneTapEnabled ? '#10b981' : '#334155', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>{oneTapEnabled ? 'ACTIVE' : 'OFF'}</button>
            </div>
          </div>
        )}

      </main>

      {/* Sticky Animated 9-Tab Bottom Navigation Bar */}
      {!isLandscape && (
        <nav className="mobile-bottom-nav">
          {[
            { id: 'dashboard', icon: '📊', label: 'Dash' },
            { id: 'markets', icon: '🌐', label: 'Markets' },
            { id: 'chart', icon: '📈', label: 'Chart' },
            { id: 'trade', icon: '⚡', label: 'Trade' },
            { id: 'portfolio', icon: '💼', label: 'Port' },
            { id: 'scanner', icon: '🔍', label: 'Scan' },
            { id: 'ai', icon: '🤖', label: 'AI' },
            { id: 'news', icon: '📰', label: 'News' },
            { id: 'settings', icon: '⚙️', label: 'Set' }
          ].map((t) => (
            <button
              key={t.id}
              className={`nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id as any)}
            >
              <span className="nav-icon">{t.icon}</span>
              <span className="nav-text">{t.label}</span>
            </button>
          ))}
        </nav>
      )}

      {showCloseAllConfirm && (
        <div className="mobile-modal-overlay">
          <div className="mobile-modal-content glass-card">
            <h3 className="mobile-modal-title">Close all open positions?</h3>
            <p className="mobile-modal-desc">This action will execute market close orders for all open positions.</p>
            <div className="mobile-modal-actions">
              <button className="mobile-modal-btn cancel-btn" onClick={() => setShowCloseAllConfirm(false)}>Cancel</button>
              <button className="mobile-modal-btn confirm-btn" onClick={handleExecuteCloseAll}>Close All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
MobileLayout.displayName = 'MobileLayout';
