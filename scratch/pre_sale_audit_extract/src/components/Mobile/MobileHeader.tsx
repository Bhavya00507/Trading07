import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useMarketStore } from '../../store/marketStore';
import { useMarketPriceStore } from '../../store/marketPriceStore';
import { formatPrice } from '../Watchlist';

interface MobileHeaderProps {
  symbol: string;
  onOpenMenu: () => void;
  onOpenProfile?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = React.memo(({
  symbol,
  onOpenMenu,
  onOpenProfile,
}) => {
  const connectionStatus = useMarketStore((s) => s.connectionStatus);
  const priceObj = useMarketPriceStore((s) => s.prices[symbol.toUpperCase()]);
  const livePrice = priceObj?.currentPrice ?? 63530.50;
  const changePct = 2.45;

  return (
    <header className="quantum-row-1-header">
      <div className="r1-left">
        <button 
          className="menu-trigger-btn" 
          onClick={onOpenMenu}
          aria-label="Open Navigation Menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="symbol-price-pill">
          <span className="sym-txt">{symbol}</span>
          <span className="price-txt">${formatPrice(livePrice, symbol)}</span>
          <span className={`change-badge ${changePct >= 0 ? 'up' : 'down'}`}>
            {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="r1-right">
        <div className={`status-pill ${connectionStatus}`}>
          <span className="dot" />
          <span className="txt">{connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}</span>
        </div>

        <button 
          className="profile-avatar-btn"
          onClick={onOpenProfile}
          aria-label="Profile Settings"
        >
          <span>QT</span>
        </button>
      </div>
    </header>
  );
});

MobileHeader.displayName = 'MobileHeader';
