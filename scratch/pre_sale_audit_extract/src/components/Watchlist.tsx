// src/components/Watchlist.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { Instrument } from '../types';
import { MarketSessionService } from '../services/marketSessionService';
import './Watchlist.css';

export const formatPrice = (price: number, symbol: string, category?: string) => {
  const sym = symbol.toUpperCase();
  const cat = category?.toLowerCase() || '';
  let decimals = 2;
  if (sym === 'XAUUSD') decimals = 2;
  else if (sym === 'XAGUSD') decimals = 3;
  else if (cat === 'forex') decimals = 5;
  else if (cat === 'indices') decimals = 1;
  else if (cat === 'crypto') decimals = 2;
  
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const getSpreadAndDecimals = (symbol: string, category?: string) => {
  const sym = symbol.toUpperCase();
  const cat = category?.toLowerCase() || '';
  let spread = 0.1;
  let decimals = 2;

  if (sym === 'BTCUSDT') { spread = 4.0; decimals = 2; }
  else if (sym === 'ETHUSDT') { spread = 0.5; decimals = 2; }
  else if (sym === 'EURUSD') { spread = 0.00012; decimals = 5; }
  else if (sym === 'GBPUSD') { spread = 0.00018; decimals = 5; }
  else if (sym === 'USDJPY') { spread = 0.015; decimals = 3; }
  else if (sym === 'XAUUSD') { spread = 0.25; decimals = 2; }
  else if (sym === 'XAGUSD') { spread = 0.015; decimals = 3; }
  else if (sym === 'US30') { spread = 2.0; decimals = 1; }
  else if (sym === 'NAS100') { spread = 1.5; decimals = 1; }
  else if (sym === 'SPX500') { spread = 0.4; decimals = 1; }
  else if (sym === 'GER40') { spread = 1.0; decimals = 1; }
  else {
    if (cat === 'forex') { spread = 0.0002; decimals = 5; }
    else if (cat === 'indices') { spread = 1.0; decimals = 1; }
    else if (cat === 'metals') { spread = 0.05; decimals = 2; }
    else { spread = 0.05; decimals = 2; }
  }

  return { spread, decimals };
};

const WatchlistItemRow = React.memo<{
  inst: Instrument;
  selected: boolean;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}>(({ inst, selected, onClick, isFavorite, onToggleFavorite }) => {
  const livePrice = useMarketPriceStore((s) => s.prices[inst.symbol.toUpperCase()]?.currentPrice ?? inst.price ?? 0);
  const isDelayed = useMarketStore((s) => s.prices[inst.symbol.toUpperCase()]?.isDelayed ?? inst.is_delayed ?? false);
  const candles = useMarketStore((s) => s.candles[`${inst.symbol}|1m`]);

  const [tickDirection, setTickDirection] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(livePrice);

  useEffect(() => {
    if (livePrice > prevPriceRef.current) {
      setTickDirection('up');
    } else if (livePrice < prevPriceRef.current) {
      setTickDirection('down');
    }
    prevPriceRef.current = livePrice;

    const timeout = setTimeout(() => {
      setTickDirection(null);
    }, 800);
    
    return () => clearTimeout(timeout);
  }, [livePrice]);

  const { spread, decimals } = getSpreadAndDecimals(inst.symbol, inst.category);
  const bid = livePrice;
  const ask = livePrice + spread;
  
  // Calculate daily high/low using a stable formula
  const basePrice = inst.price || livePrice;
  const dailyHigh = Math.max(livePrice, basePrice * 1.008);
  const dailyLow = Math.min(livePrice, basePrice * 0.992);

  const openPrice = candles && candles.length > 0 ? candles[0].open : inst.price;
  const pctChange = openPrice ? ((livePrice - openPrice) / openPrice) * 100 : 0;

  const tickClass = tickDirection === 'up' ? 'tick-up' : tickDirection === 'down' ? 'tick-down' : '';
  const changeColor = pctChange > 0 ? 'var(--success)' : pctChange < 0 ? 'var(--danger)' : 'var(--text-secondary)';

  return (
    <tr
      className={`watchlist-row-item ${selected ? 'selected' : ''} ${tickClass}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>
        <button 
          className={`fav-btn ${isFavorite ? 'active' : ''}`} 
          onClick={onToggleFavorite}
          style={{ marginRight: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          ★
        </button>
        <span style={{ 
          color: MarketSessionService.isOpen(inst.symbol) ? '#00c076' : '#ff4d57', 
          marginRight: 4, 
          fontSize: 10,
          verticalAlign: 'middle'
        }}>●</span>
        <span className="item-symbol" style={{ fontWeight: 700 }}>{inst.symbol}</span>
        {isDelayed && <span className="delayed-badge" style={{ fontSize: 7, marginLeft: 2 }}>D</span>}
      </td>
      <td style={{ padding: '6px 4px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        {bid.toFixed(decimals)}
      </td>
      <td style={{ padding: '6px 4px', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
        {ask.toFixed(decimals)}
      </td>
      <td style={{ padding: '6px 4px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-secondary)' }}>
        {spread.toFixed(decimals)}
      </td>
      <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 600, color: changeColor }}>
        {pctChange > 0 ? '+' : ''}{pctChange.toFixed(2)}%
      </td>
      <td style={{ padding: '6px 4px', fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-secondary)', fontSize: 9 }}>
        {dailyLow.toFixed(decimals)}/{dailyHigh.toFixed(decimals)}
      </td>
    </tr>
  );
});
WatchlistItemRow.displayName = 'WatchlistItemRow';

const Watchlist: React.FC = () => {
  const watchlist = useAppStore((state) => state.watchlist);
  const setSelected = useAppStore((state) => state.setSelectedInstrument);
  const selected = useAppStore((state) => state.selectedInstrument);

  const [search, setSearch] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<'All' | 'Crypto' | 'Forex' | 'Indices' | 'Metals'>('All');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    crypto: false,
    forex: false,
    indices: false,
    metals: false
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('trading-watchlist-favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse favorites:', e);
    }
  }, []);

  // Auto-expand categories if search is active
  useEffect(() => {
    if (search.trim() !== '') {
      setCollapsed({
        crypto: false,
        forex: false,
        indices: false,
        metals: false
      });
    }
  }, [search]);

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
      const matchesSearch = inst.symbol.toLowerCase().includes(search.toLowerCase()) ||
                            (inst.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesFavorite = !showOnlyFavorites || favorites.includes(inst.symbol);
      return matchesSearch && matchesFavorite;
    });
  }, [watchlist, search, showOnlyFavorites, favorites]);

  const categoriesList = [
    { key: 'crypto', label: 'Crypto' },
    { key: 'forex', label: 'Forex' },
    { key: 'indices', label: 'Indices' },
    { key: 'metals', label: 'Metals' }
  ] as const;

  const totalVisibleCount = filteredWatchlist.length;

  return (
    <div className="watchlist-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="watchlist-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 10px 4px 10px' }}>
        <h3 className="panel-title" style={{ margin: 0 }}>Market Watch</h3>
        <button 
          className={`filter-favs-toggle ${showOnlyFavorites ? 'active' : ''}`}
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          title="Show Favorites Only"
          style={{ background: 'transparent', border: 'none', color: showOnlyFavorites ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
        >
          ★
        </button>
      </div>

      <div className="watchlist-categories" style={{ display: 'flex', gap: 4, padding: '4px 10px 8px 10px', overflowX: 'auto', borderBottom: '1px solid var(--border-color)', marginBottom: 8 }}>
        {['All', 'Crypto', 'Forex', 'Indices', 'Metals'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat as any)}
            style={{
              padding: '3px 8px',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 3,
              background: activeCategory === cat ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: activeCategory === cat ? 'var(--bg-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="watchlist-search-wrapper" style={{ padding: '0 10px 8px 10px' }}>
        <input
          type="text"
          placeholder="Search Symbol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="watchlist-search-input"
          style={{ width: '100%', padding: '6px 8px', fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 3, color: 'var(--text-primary)' }}
        />
      </div>

      <div className="watchlist-list" style={{ overflowY: 'auto', overflowX: 'auto', flex: 1, padding: '0 10px' }}>
        {totalVisibleCount === 0 ? (
          <div className="panel empty" style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>No items found</div>
        ) : (
          categoriesList
            .filter((cat) => activeCategory === 'All' || activeCategory.toLowerCase() === cat.key)
            .map((cat) => {
              const items = filteredWatchlist.filter((inst) => inst.category?.toLowerCase() === cat.key);
              if (items.length === 0) return null;
              
              return (
                <div key={cat.key} className="category-section" style={{ marginBottom: 12 }}>
                  <div 
                    className="category-header" 
                    onClick={() => setCollapsed((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '4px 6px', borderRadius: 3, cursor: 'pointer', border: '1px solid var(--border-color)', marginBottom: 4 }}
                  >
                    <div className="category-header-title" style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      <span>{collapsed[cat.key] ? '▶' : '▼'}</span>
                      <span>{cat.label}</span>
                    </div>
                    <span className="category-count" style={{ fontSize: 9, color: 'var(--text-muted)' }}>({items.length})</span>
                  </div>
                  {!collapsed[cat.key] && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '4px', color: 'var(--text-secondary)', fontSize: 8 }}>Symbol</th>
                          <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)', fontSize: 8 }}>Bid</th>
                          <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)', fontSize: 8 }}>Ask</th>
                          <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)', fontSize: 8 }}>Spread</th>
                          <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)', fontSize: 8 }}>Chg%</th>
                          <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)', fontSize: 8 }}>Low/High</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((inst) => {
                          return (
                            <WatchlistItemRow
                              key={inst.symbol}
                              inst={inst}
                              selected={selected?.symbol === inst.symbol}
                              onClick={() => setSelected(inst)}
                              isFavorite={favorites.includes(inst.symbol)}
                              onToggleFavorite={(e) => toggleFavorite(inst.symbol, e)}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

export default React.memo(Watchlist);
