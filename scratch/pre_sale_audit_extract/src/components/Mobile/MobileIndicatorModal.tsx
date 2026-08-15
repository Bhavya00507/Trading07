import React, { useState } from 'react';

interface IndicatorItem {
  id: string;
  name: string;
  category: string;
  isFav?: boolean;
  isAiRec?: boolean;
}

const ALL_INDICATORS: IndicatorItem[] = [
  { id: 'rsi', name: 'Relative Strength Index (RSI)', category: 'Oscillators', isFav: true, isAiRec: true },
  { id: 'macd', name: 'MACD (Moving Average Convergence Divergence)', category: 'Momentum', isFav: true },
  { id: 'ema', name: 'Exponential Moving Average (EMA)', category: 'Moving Averages', isFav: true },
  { id: 'bb', name: 'Bollinger Bands', category: 'Volatility', isFav: false },
  { id: 'vwap', name: 'Volume Weighted Average Price (VWAP)', category: 'Volume', isFav: true, isAiRec: true },
  { id: 'atr', name: 'Average True Range (ATR)', category: 'Volatility', isFav: false },
  { id: 'fvg', name: 'Smart Money Fair Value Gap (FVG)', category: 'Smart Money', isFav: true, isAiRec: true },
  { id: 'ob', name: 'Institutional Order Block Detector', category: 'Smart Money', isFav: true, isAiRec: true },
  { id: 'supertrend', name: 'SuperTrend AI Filter', category: 'Trend', isFav: false },
];

interface MobileIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndicator?: (id: string) => void;
}

export const MobileIndicatorModal: React.FC<MobileIndicatorModalProps> = React.memo(({
  isOpen,
  onClose,
  onSelectIndicator,
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'favorites' | 'ai'>('all');

  if (!isOpen) return null;

  const filtered = ALL_INDICATORS.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase());
    if (activeCategory === 'favorites') return matchesSearch && item.isFav;
    if (activeCategory === 'ai') return matchesSearch && item.isAiRec;
    return matchesSearch;
  });

  return (
    <div className="quantum-indicator-modal-overlay" onClick={onClose}>
      <div className="quantum-indicator-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-block">
            <h3>TECHNICAL INDICATORS & STUDIES</h3>
            <span className="subtitle">Search 50+ Institutional Indicators</span>
          </div>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-search-bar">
          <input
            type="text"
            placeholder="Search indicator name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filter-pills">
          <button 
            className={`pill ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All Studies
          </button>
          <button 
            className={`pill ${activeCategory === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveCategory('favorites')}
          >
            ★ Favorites
          </button>
          <button 
            className={`pill ${activeCategory === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveCategory('ai')}
          >
            🤖 AI Recommended
          </button>
        </div>

        <div className="indicators-list">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="indicator-row"
              onClick={() => {
                if (onSelectIndicator) onSelectIndicator(item.id);
                onClose();
              }}
            >
              <div className="row-info">
                <span className="ind-name">{item.name}</span>
                <span className="ind-cat">{item.category}</span>
              </div>
              <div className="row-tags">
                {item.isAiRec && <span className="ai-tag">AI PICK</span>}
                {item.isFav && <span className="fav-star">★</span>}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="empty-msg">No matching indicators found.</div>}
        </div>
      </div>
    </div>
  );
});

MobileIndicatorModal.displayName = 'MobileIndicatorModal';
