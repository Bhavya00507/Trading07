// src/components/MobileLayout.tsx
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
    <div
      className={`watchlist-mobile-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="card-top">
        <div className="card-symbol-block">
          <button className={`fav-star ${isFav ? 'active' : ''}`} onClick={onToggleFavorite}>
            ★
          </button>
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
        <div className="details-item">
          <span>Quantity</span>
          <span>{Math.abs(pos.quantity).toFixed(2)} Lots</span>
        </div>
        <div className="details-item">
          <span>Entry Price</span>
          <span>{formatPrice(pos.average_price, pos.symbol)}</span>
        </div>
        <div className="details-item">
          <span>Stop Loss</span>
          <span>{pos.stop_loss ? formatPrice(pos.stop_loss, pos.symbol) : '--'}</span>
        </div>
        <div className="details-item">
          <span>Take Profit</span>
          <span>{pos.take_profit ? formatPrice(pos.take_profit, pos.symbol) : '--'}</span>
        </div>
      </div>

      <div className="card-actions-row">
        <button className="card-action-btn secondary" onClick={() => handleBreakEven(pos.symbol, pos.id)}>
          🛡️ Break Even
        </button>
        <button className="card-action-btn secondary" onClick={() => handleReverse(pos.symbol, pos.id)}>
          🔄 Reverse
        </button>
        <button className="card-action-btn close" onClick={() => handleClose(pos.symbol, pos.id)}>
          ✕ Close Position
        </button>
      </div>
    </div>
  );
});
MobilePositionCard.displayName = 'MobilePositionCard';

export const MobileLayout: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'chart' | 'trade' | 'positions' | 'settings'>('watchlist');
  const [activeCategory, setActiveCategory] = useState<'all' | 'crypto' | 'forex' | 'metals' | 'indices'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(() => typeof window !== 'undefined' ? window.innerHeight < window.innerWidth : false);

  useEffect(() => {
    const handleOrientation = () => {
      const landscape = window.innerHeight < window.innerWidth;
      setIsLandscape(landscape);
      if (landscape) {
        setActiveTab('chart'); // Force chart tab on landscape for immersive view
      }
    };
    window.addEventListener('resize', handleOrientation);
    return () => window.removeEventListener('resize', handleOrientation);
  }, []);

  // Order state
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState<number>(0.1);
  const [leverage, setLeverage] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Indicator modal state
  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState(false);

  // Close all positions state
  const [processingCloseAll, setProcessingCloseAll] = useState(false);
  const [showCloseAllConfirm, setShowCloseAllConfirm] = useState(false);

  // App store selections
  const watchlist = useAppStore((s) => s.watchlist);
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const setSelectedInstrument = useAppStore((s) => s.setSelectedInstrument);
  const account = useAppStore((s) => s.account);

  // Market prices and position/order stores
  const connectionStatus = useMarketStore((s) => s.connectionStatus);
  const activePositionsCount = usePositionStore((s) => s.positions.filter(p => p.quantity !== 0).length);
  const openPositions = usePositionStore(
    (s) => s.positions.filter(p => p.quantity !== 0),
    (oldVal, newVal) => {
      if (oldVal.length !== newVal.length) return false;
      for (let i = 0; i < oldVal.length; i++) {
        if (oldVal[i].id !== newVal[i].id || oldVal[i].unrealized_pnl !== newVal[i].unrealized_pnl || oldVal[i].quantity !== newVal[i].quantity) {
          return false;
        }
      }
      return true;
    }
  );
  const orders = useOrderStore((s) => s.orders);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('trading-watchlist-favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
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

  const activeInstrument = selectedInstrument || watchlist[0];

  const livePrice = useMarketPriceStore(
    (s) => s.currentPrice
  ) ?? activeInstrument?.price ?? 0;

  // Set default limit price when selecting limit type
  useEffect(() => {
    if (livePrice > 0 && orderType === 'limit' && !limitPrice) {
      setLimitPrice(livePrice.toString());
    }
  }, [orderType, livePrice]);

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
      if (orderType === 'limit' && limitPrice) {
        params.price = parseFloat(limitPrice);
      }
      if (stopLoss) {
        params.stop_loss = parseFloat(stopLoss);
      }
      if (takeProfit) {
        params.take_profit = parseFloat(takeProfit);
      }
      await placeOrder(params);
      useAppStore.getState().addToast('success', `${side.toUpperCase()} order placed successfully.`);
      // Clear inputs
      setStopLoss('');
      setTakeProfit('');
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  // Close and cancel handlers
  const handleClosePosition = async (symbol: string, positionId?: string) => {
    try {
      const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
      await closeSymbol(symbol, positionId, activeAccountType);
      useAppStore.getState().addToast('success', `Closed position for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to close position');
    }
  };

  const handleReversePosition = async (symbol: string, positionId?: string) => {
    try {
      await reversePosition(symbol, positionId);
      useAppStore.getState().addToast('success', `Reversed position for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to reverse position');
    }
  };

  const handleBreakEvenPosition = async (symbol: string, positionId?: string) => {
    try {
      await breakEven(symbol, positionId);
      useAppStore.getState().addToast('success', `Moved SL to break-even for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to apply break-even');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      useAppStore.getState().addToast('success', 'Order cancelled successfully.');
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to cancel order');
    }
  };

  const handleConfirmCloseAll = () => {
    setShowCloseAllConfirm(true);
  };

  const handleExecuteCloseAll = async () => {
    setShowCloseAllConfirm(false);
    setProcessingCloseAll(true);

    const totalCount = openPositions.length;
    const activeAccountType = useAppStore.getState().activeAccountType || 'paper';

    try {
      const result = await closeAllPositions(activeAccountType);
      const closedCount = result.closed_count !== undefined ? result.closed_count : totalCount;
      const failedCount = totalCount - closedCount;
      
      useAppStore.getState().addToast(
        failedCount > 0 ? 'info' : 'success', 
        `Closed ${closedCount} positions. ${failedCount} failed.`
      );
    } catch (err: any) {
      console.warn("Bulk close failed, falling back to individual closes:", err);
      let closedCount = 0;
      let failedCount = 0;
      for (const pos of openPositions) {
        try {
          await closeSymbol(pos.symbol, pos.id, activeAccountType);
          closedCount++;
        } catch (e) {
          failedCount++;
        }
      }
      useAppStore.getState().addToast(
        failedCount > 0 ? 'info' : 'success', 
        `Closed ${closedCount} positions. ${failedCount} failed.`
      );
    } finally {
      await useAppStore.getState().syncState();
      setProcessingCloseAll(false);
    }
  };

  // Quick preset helpers
  const adjustQty = (amount: number) => {
    setQuantity((prev) => Math.max(0.01, parseFloat((prev + amount).toFixed(2))));
  };

  return (
    <div className="mobile-layout-container">
      {/* Mobile Top Header */}
      {!isLandscape && (
        <header className="mobile-header">
          <div className="mobile-header-left">
            <button className="hamburger-btn" onClick={() => setIsDrawerOpen(true)}>
              ☰
            </button>
            <span className="mobile-logo">ANTIGRAVITY</span>
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
                <h4>Account Summary</h4>
                <div className="drawer-row"><span>Balance</span><span>${account?.balance?.toLocaleString() || '10,000.00'}</span></div>
                <div className="drawer-row"><span>Equity</span><span>${account?.equity?.toLocaleString() || '10,000.00'}</span></div>
                <div className="drawer-row"><span>Used Margin</span><span>${account?.margin_used?.toLocaleString() || '0.00'}</span></div>
                <div className="drawer-row"><span>Free Margin</span><span>${account?.free_margin?.toLocaleString() || '10,000.00'}</span></div>
              </div>
              <div className="drawer-section">
                <h4>Shortcuts</h4>
                <button onClick={() => { setActiveTab('watchlist'); setIsDrawerOpen(false); }} className="drawer-link">📋 Watchlist</button>
                <button onClick={() => { setActiveTab('chart'); setIsDrawerOpen(false); }} className="drawer-link">📈 Fullscreen Chart</button>
                <button onClick={() => { setActiveTab('trade'); setIsDrawerOpen(false); }} className="drawer-link">⚡ Quick Trade Entry</button>
                <button onClick={() => { setActiveTab('positions'); setIsDrawerOpen(false); }} className="drawer-link">💼 Open Positions</button>
              </div>
              <button className="logout-btn" onClick={() => useAppStore.getState().logout()}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Render Workspace */}
      <main className="mobile-tab-viewport" style={{ paddingBottom: isLandscape ? '0px' : '60px' }}>
        {/* TAB 1: WATCHLIST */}
        {activeTab === 'watchlist' && (
          <div className="tab-pane watchlist-pane">
            <div className="search-bar-container">
              <input
                type="text"
                placeholder="Search symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mobile-search-input"
              />
            </div>

            {/* Category horizontal scroller */}
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

            {/* Watchlist Cards */}
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
                      setActiveTab('chart'); // switch to chart on select
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CHART */}
        {activeTab === 'chart' && (
          <div className="tab-pane chart-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Chart />
            </div>
            
            {/* Quick Actions Footer Overlaid on Chart Pane */}
            <div className="chart-floating-controls">
              <button className="chart-action-fab" onClick={() => setIsIndicatorModalOpen(true)}>
                ⚙️ Indicators
              </button>
              <button className="chart-action-fab" onClick={() => setActiveTab('trade')}>
                ⚡ Quick Trade
              </button>
            </div>

            {/* Floating Indicators Modal */}
            {isIndicatorModalOpen && (
              <div className="modal-overlay" onClick={() => setIsIndicatorModalOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Indicators Configuration</h3>
                    <button className="close-modal-btn" onClick={() => setIsIndicatorModalOpen(false)}>×</button>
                  </div>
                  <div className="modal-body">
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Toggle chart indicator layers:</p>
                    {/* Simplified checklist updates */}
                    <div className="indicators-checklist">
                      <label><input type="checkbox" defaultChecked /> EMA 20/50/200</label>
                      <label><input type="checkbox" defaultChecked /> Bollinger Bands</label>
                      <label><input type="checkbox" defaultChecked /> RSI Oscillator</label>
                      <label><input type="checkbox" /> MACD Histogram</label>
                      <label><input type="checkbox" /> ATR Panel</label>
                    </div>
                    <button className="apply-indicators-btn" onClick={() => setIsIndicatorModalOpen(false)}>
                      Apply configuration
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRADING ENTRY */}
        {activeTab === 'trade' && (
          <div className="tab-pane trade-pane">
            <div className="trading-symbol-header">
              <span className="trade-symbol-label">{activeInstrument?.symbol || 'Select a symbol'}</span>
              <span className="trade-price-label">${livePrice.toFixed(4)}</span>
            </div>

            {/* Quick Trade Form */}
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
                </select>
              </div>

              {orderType === 'limit' && (
                <div className="form-group">
                  <label className="input-label">Limit Price</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="mobile-input"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder="Execution price"
                  />
                </div>
              )}

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
                <div className="presets-row">
                  <button onClick={() => setQuantity(0.01)} className="preset-btn">Min (0.01)</button>
                  <button onClick={() => setQuantity(0.1)} className="preset-btn">Micro (0.1)</button>
                  <button onClick={() => setQuantity(1.0)} className="preset-btn">Standard (1.0)</button>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Leverage multiplier (1x - 125x)</label>
                <input
                  type="range"
                  min="1"
                  max="125"
                  className="mobile-slider"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                />
                <span className="leverage-display-val">{leverage}x leverage</span>
              </div>

              <div className="sltp-toggle-row">
                <div className="sltp-field">
                  <label>Stop Loss (Price)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mobile-input-small"
                    placeholder="SL target"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                  />
                </div>
                <div className="sltp-field">
                  <label>Take Profit (Price)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="mobile-input-small"
                    placeholder="TP target"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                  />
                </div>
              </div>

              <button
                disabled={loading}
                className={`execute-order-btn ${side}`}
                onClick={handlePlaceOrder}
              >
                {loading ? 'Processing...' : `SUBMIT ${side.toUpperCase()} ORDER`}
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: POSITIONS & ORDERS CARDS */}
        {activeTab === 'positions' && (
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

              {activePositionsCount === 0 && (
                <p className="empty-message">No active positions on this account.</p>
              )}
            </div>

            <h3 className="section-title" style={{ marginTop: '20px' }}>Pending Orders ({orders.filter(o => o.status === 'PENDING').length})</h3>
            
            <div className="orders-cards-list">
              {orders.filter(o => o.status === 'PENDING').map((order) => {
                return (
                  <div className="order-mobile-card" key={order.id}>
                    <div className="card-top-row">
                      <div className="symbol-info">
                        <span className="symbol-name">{order.symbol}</span>
                        <span className={`side-badge ${order.side.toLowerCase()}`}>{order.side.toUpperCase()}</span>
                      </div>
                      <span className="order-type-badge">{order.type.toUpperCase()}</span>
                    </div>

                    <div className="card-details-grid">
                      <div className="details-item">
                        <span>Size</span>
                        <span>{order.quantity} Lots</span>
                      </div>
                      <div className="details-item">
                        <span>Price</span>
                        <span>{order.price ? formatPrice(order.price, order.symbol) : 'Market'}</span>
                      </div>
                    </div>

                    <div className="card-actions-row single">
                      <button className="card-action-btn close" onClick={() => handleCancelOrder(order.id)}>
                        Cancel Pending Order
                      </button>
                    </div>
                  </div>
                );
              })}

              {orders.filter(o => o.status === 'PENDING').length === 0 && (
                <p className="empty-message">No pending limit orders.</p>
              )}
            </div>

            {activePositionsCount > 0 && (
              <div className="mobile-close-all-container">
                <button
                  className="mobile-close-all-btn"
                  onClick={handleConfirmCloseAll}
                  disabled={processingCloseAll}
                >
                  {processingCloseAll ? (
                    <>
                      <span className="spinner"></span> Closing Positions...
                    </>
                  ) : (
                    "Close All"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="tab-pane settings-pane">
            <div className="profile-card">
              <div className="profile-avatar">👤</div>
              <div className="profile-info">
                <h3>Trader Pro</h3>
                <span className="profile-account-type">Live Account Type</span>
              </div>
            </div>

            <div className="settings-list">
              <div className="setting-row">
                <span>Centralized Server connection</span>
                <span className={`connection-status-badge ${connectionStatus}`}>{connectionStatus}</span>
              </div>
              <div className="setting-row">
                <span>Account Balance</span>
                <span>${account?.balance?.toLocaleString() || '10,000.00'}</span>
              </div>
              <div className="setting-row">
                <span>Available margin</span>
                <span>${account?.free_margin?.toLocaleString() || '10,000.00'}</span>
              </div>
            </div>

            <button
              onClick={async () => {
                try {
                  const token = useAppStore.getState().token;
                  const API_BASE = getApiUrl();
                  const res = await fetch(`${API_BASE}/paper/reset`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  if (!res.ok) throw new Error('Reset failed');
                  useAppStore.getState().addToast('success', 'Paper account has been reset successfully!');
                  await useAppStore.getState().syncState();
                } catch (err: any) {
                  useAppStore.getState().addToast('error', 'Failed to reset paper account');
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: '#ffc107',
                color: '#0d1322',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                marginBottom: '10px',
                textTransform: 'uppercase'
              }}
            >
              Reset Paper Account
            </button>

            <button className="mobile-logout-large-btn" onClick={() => useAppStore.getState().logout()}>
              LOG OUT FROM PLATFORM
            </button>
          </div>
        )}
      </main>

      {/* Sticky Bottom Navigation Bar */}
      {!isLandscape && (
        <nav className="mobile-bottom-nav">
          <button
            className={`nav-item ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-text">Watchlist</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
          >
            <span className="nav-icon">📈</span>
            <span className="nav-text">Chart</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'trade' ? 'active' : ''}`}
            onClick={() => setActiveTab('trade')}
          >
            <span className="nav-icon">⚡</span>
            <span className="nav-text">Trade</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'positions' ? 'active' : ''}`}
            onClick={() => setActiveTab('positions')}
          >
            <span className="nav-icon">💼</span>
            <span className="nav-text">Positions</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-text">Settings</span>
          </button>
        </nav>
      )}
      {showCloseAllConfirm && (
        <div className="mobile-modal-overlay">
          <div className="mobile-modal-content glass-card">
            <h3 className="mobile-modal-title">Close all open positions?</h3>
            <p className="mobile-modal-desc">This action will immediately execute market close orders for all open positions on the active account.</p>
            <div className="mobile-modal-actions">
              <button 
                className="mobile-modal-btn cancel-btn"
                onClick={() => setShowCloseAllConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="mobile-modal-btn confirm-btn"
                onClick={handleExecuteCloseAll}
              >
                Close All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
MobileLayout.displayName = 'MobileLayout';
