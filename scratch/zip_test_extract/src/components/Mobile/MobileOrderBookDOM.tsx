import React from 'react';
import { useMarketPriceStore } from '../../store/marketPriceStore';
import { formatPrice } from '../Watchlist';

interface MobileOrderBookDOMProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MobileOrderBookDOM: React.FC<MobileOrderBookDOMProps> = React.memo(({
  symbol,
  isOpen,
  onClose,
}) => {
  const priceObj = useMarketPriceStore((s) => s.prices[symbol.toUpperCase()]);
  const livePrice = priceObj?.currentPrice ?? 63530.50;

  if (!isOpen) return null;

  // Generate mock DOM levels centered around livePrice
  const asks = Array.from({ length: 8 }).map((_, i) => ({
    price: livePrice + (8 - i) * 2.5,
    size: (Math.sin(i + 1) * 2.5 + 3.5).toFixed(3),
  }));

  const bids = Array.from({ length: 8 }).map((_, i) => ({
    price: livePrice - (i + 1) * 2.5,
    size: (Math.cos(i + 1) * 2.5 + 3.5).toFixed(3),
  }));

  return (
    <div className="quantum-dom-sheet-overlay" onClick={onClose}>
      <div className="quantum-dom-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle-bar" onClick={onClose}>
          <div className="handle" />
        </div>

        <div className="dom-sheet-header">
          <div className="header-info">
            <span className="dom-title">LEVEL 2 DOM DEPTHTRACK</span>
            <span className="dom-sym">{symbol}</span>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="dom-grid-header">
          <span>SIZE</span>
          <span>BID PRICE</span>
          <span>ASK PRICE</span>
          <span>SIZE</span>
        </div>

        <div className="dom-levels-container">
          {/* Asks (Sells) */}
          <div className="asks-section">
            {asks.map((ask, idx) => (
              <div key={`ask-${idx}`} className="dom-row ask-row">
                <span className="cell-size">{ask.size}</span>
                <span className="cell-price">--</span>
                <span className="cell-price ask-txt">{formatPrice(ask.price, symbol)}</span>
                <span className="cell-size">{ask.size}</span>
                <div 
                  className="depth-bar ask-bar" 
                  style={{ width: `${Math.min(100, parseFloat(ask.size) * 15)}%` }} 
                />
              </div>
            ))}
          </div>

          {/* Current Mid Spread Banner */}
          <div className="dom-mid-spread">
            <span className="mid-price">${formatPrice(livePrice, symbol)}</span>
            <span className="spread-lbl">Spread 0.20</span>
          </div>

          {/* Bids (Buys) */}
          <div className="bids-section">
            {bids.map((bid, idx) => (
              <div key={`bid-${idx}`} className="dom-row bid-row">
                <span className="cell-size">{bid.size}</span>
                <span className="cell-price bid-txt">{formatPrice(bid.price, symbol)}</span>
                <span className="cell-price">--</span>
                <span className="cell-size">{bid.size}</span>
                <div 
                  className="depth-bar bid-bar" 
                  style={{ width: `${Math.min(100, parseFloat(bid.size) * 15)}%` }} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

MobileOrderBookDOM.displayName = 'MobileOrderBookDOM';
