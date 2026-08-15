import React from 'react';
import { useMarketPriceStore } from '../../store/marketPriceStore';
import { useMarketStore } from '../../store/marketStore';
import { getSpreadAndDecimals, formatPrice } from '../Watchlist';

interface MobileOHLCRibbonProps {
  symbol: string;
  category?: string;
}

export const MobileOHLCRibbon: React.FC<MobileOHLCRibbonProps> = React.memo(({ symbol, category = 'crypto' }) => {
  const priceObj = useMarketPriceStore((s) => s.prices[symbol.toUpperCase()]);
  const livePrice = priceObj?.currentPrice ?? 63530.50;
  const candles = useMarketStore((s) => s.candles[`${symbol}|1m`]) || [];
  
  const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const openPrice = latestCandle?.open ?? livePrice;
  const highPrice = latestCandle?.high ?? livePrice * 1.002;
  const lowPrice = latestCandle?.low ?? livePrice * 0.998;
  const closePrice = livePrice || (latestCandle?.close ?? livePrice);
  const volume = latestCandle?.volume ?? 12450;
  
  const { spread } = getSpreadAndDecimals(symbol, category);

  return (
    <div className="quantum-ohlc-strip">
      <div className="strip-item"><span className="lbl">O</span><span className="val">{formatPrice(openPrice, symbol)}</span></div>
      <div className="strip-item"><span className="lbl">H</span><span className="val">{formatPrice(highPrice, symbol)}</span></div>
      <div className="strip-item"><span className="lbl">L</span><span className="val">{formatPrice(lowPrice, symbol)}</span></div>
      <div className="strip-item"><span className="lbl">C</span><span className="val highlight">{formatPrice(closePrice, symbol)}</span></div>
      <div className="strip-item"><span className="lbl">VOL</span><span className="val">{(volume / 1000).toFixed(1)}K</span></div>
      <div className="strip-item"><span className="lbl">SPR</span><span className="val">{(spread * (category === 'forex' ? 10000 : 1)).toFixed(1)}</span></div>
      <div className="strip-item"><span className="lbl">FUND</span><span className="val up">+0.01%</span></div>
      <div className="strip-item"><span className="lbl">OI</span><span className="val">$4.1B</span></div>
      <div className="strip-item session-tag"><span className="val">NY SESSION</span></div>
    </div>
  );
});

MobileOHLCRibbon.displayName = 'MobileOHLCRibbon';
