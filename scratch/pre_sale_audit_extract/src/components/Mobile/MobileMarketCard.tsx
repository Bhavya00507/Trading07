import React from 'react';
import { useMarketPriceStore } from '../../store/marketPriceStore';
import { formatPrice } from '../Watchlist';

interface MobileMarketCardProps {
  symbol: string;
  category?: string;
}

export const MobileMarketCard: React.FC<MobileMarketCardProps> = React.memo(({
  symbol,
  category = 'crypto',
}) => {
  const priceObj = useMarketPriceStore((s) => s.prices[symbol.toUpperCase()]);
  const livePrice = priceObj?.currentPrice ?? 63530.50;
  const changePct = 2.45;
  const volume = '1.42B';
  const fundingRate = '+0.0100%';
  const openInterest = '$4.18B';

  return (
    <div className="quantum-market-info-card">
      <div className="card-top-header">
        <div className="sym-details">
          <span className="sym-code">{symbol}</span>
          <span className="sym-tag">{category.toUpperCase()} PERP</span>
        </div>
        <div className="price-badge-block">
          <span className="live-price-val">${formatPrice(livePrice, symbol)}</span>
          <span className={`change-pill ${changePct >= 0 ? 'up' : 'down'}`}>
            {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="card-stats-grid">
        <div className="stat-cell">
          <span className="lbl">24h Vol</span>
          <span className="val">{volume}</span>
        </div>
        <div className="stat-cell">
          <span className="lbl">Funding</span>
          <span className="val up">{fundingRate}</span>
        </div>
        <div className="stat-cell">
          <span className="lbl">Open Interest</span>
          <span className="val">{openInterest}</span>
        </div>
        <div className="stat-cell">
          <span className="lbl">Session</span>
          <span className="val">NEW YORK</span>
        </div>
      </div>
    </div>
  );
});

MobileMarketCard.displayName = 'MobileMarketCard';
