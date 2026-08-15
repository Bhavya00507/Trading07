// src/components/OrderBookPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketPriceStore } from '../store/marketPriceStore';

const getPipSize = (symbol: string) => {
  if (symbol.includes('JPY')) return 0.01;
  if (symbol.includes('XAU')) return 0.10;
  if (symbol.includes('XAG')) return 0.01;
  if (symbol.includes('US30') || symbol.includes('NAS100') || symbol.includes('SPX500') || symbol.includes('GER40')) return 1.0;
  return 0.0001;
};

const getPrecision = (sym: string) => {
  if (sym.includes('JPY') || sym.includes('XAU')) return 2;
  if (sym.includes('XAG')) return 3;
  if (sym.indexOf('USD') !== -1 || sym.indexOf('EUR') !== -1 || sym.indexOf('GBP') !== -1) return 5;
  return 2;
};

interface BookRow {
  price: number;
  volume: number;
  total: number;
}

const OrderBookPanel: React.FC = React.memo(() => {
  const selected = useAppStore((state) => state.selectedInstrument);
  const livePrice = useMarketPriceStore((state) => state.currentPrice) ?? (selected ? selected.price : 0);
  
  const [tick, setTick] = useState(0);

  // Rapid order book refresh simulation (Level 2 Web Socket Feed Simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const pipSize = useMemo(() => {
    if (!selected) return 0.0001;
    return getPipSize(selected.symbol);
  }, [selected]);

  const precision = useMemo(() => {
    if (!selected) return 2;
    return getPrecision(selected.symbol);
  }, [selected]);

  // Generate ask levels (descending order) and bid levels (descending order)
  const bookData = useMemo(() => {
    if (livePrice <= 0 || !selected) return { asks: [], bids: [] };

    const asks: BookRow[] = [];
    const bids: BookRow[] = [];
    
    let askTotal = 0;
    let bidTotal = 0;

    // Generate 8 levels of asks (selling orders, above current price)
    for (let i = 8; i >= 1; i--) {
      const price = livePrice + i * pipSize;
      const seed = Math.floor(price * 1234) + tick;
      const volume = 10 + (seed % 285);
      askTotal += volume;
      asks.push({ price, volume, total: askTotal });
    }

    // Generate 8 levels of bids (buying orders, below current price)
    for (let i = 1; i <= 8; i++) {
      const price = livePrice - i * pipSize;
      const seed = Math.floor(price * 5678) + tick;
      const volume = 10 + (seed % 312);
      bidTotal += volume;
      bids.push({ price, volume, total: bidTotal });
    }

    return { asks, bids, maxAskTotal: askTotal, maxBidTotal: bidTotal };
  }, [livePrice, selected, pipSize, tick]);

  if (!selected) {
    return (
      <div style={{ padding: '16px', color: '#8e8e93', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>
        Select an instrument from the watchlist to display Order Book L2.
      </div>
    );
  }

  const { asks, bids, maxAskTotal, maxBidTotal } = bookData as any;
  const maxTotal = Math.max(maxAskTotal || 1, maxBidTotal || 1);

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '8px' }}>
        <div>
          <strong style={{ fontSize: '15px', color: '#f5f5f7' }}>{selected.symbol} Level II Order Book</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Continuous updates from WebSocket</span>
        </div>
        <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
          Last: {livePrice.toFixed(precision)}
        </div>
      </div>

      {/* Level II Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: '2px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
        
        {/* Asks (Sells) Table */}
        <div style={{ display: 'flex', flexDirection: 'column-reverse' }}>
          {asks.map((row: any) => {
            const fillWidth = (row.total / maxTotal) * 100;
            return (
              <div
                key={row.price}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '3px 6px',
                  position: 'relative',
                  background: `linear-gradient(to left, rgba(255, 77, 87, 0.08) ${fillWidth}%, transparent ${fillWidth}%)`
                }}
              >
                <span style={{ color: '#ff4d57', zIndex: 1 }}>{row.price.toFixed(precision)}</span>
                <span style={{ color: '#f5f5f7', zIndex: 1 }}>{row.volume}</span>
                <span style={{ color: '#8e8e93', zIndex: 1, fontSize: '11px' }}>{row.total}</span>
              </div>
            );
          })}
        </div>

        {/* Spread / Mid Price Indicator */}
        <div style={{
          padding: '6px',
          background: '#070b14',
          borderTop: '1px solid #1b2235',
          borderBottom: '1px solid #1b2235',
          textAlign: 'center',
          fontWeight: 700,
          color: '#d4af37',
          fontSize: '11px',
          letterSpacing: '0.05em'
        }}>
          SPREAD LEVEL INDICATOR
        </div>

        {/* Bids (Buys) Table */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {bids.map((row: any) => {
            const fillWidth = (row.total / maxTotal) * 100;
            return (
              <div
                key={row.price}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '3px 6px',
                  position: 'relative',
                  background: `linear-gradient(to left, rgba(0, 192, 118, 0.08) ${fillWidth}%, transparent ${fillWidth}%)`
                }}
              >
                <span style={{ color: '#00c076', zIndex: 1 }}>{row.price.toFixed(precision)}</span>
                <span style={{ color: '#f5f5f7', zIndex: 1 }}>{row.volume}</span>
                <span style={{ color: '#8e8e93', zIndex: 1, fontSize: '11px' }}>{row.total}</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
});
OrderBookPanel.displayName = 'OrderBookPanel';

export default OrderBookPanel;
