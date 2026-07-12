// src/components/DOMPanel.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { placeOrder, closeSymbol, reversePosition } from '../services/api';

interface DOMRow {
  price: number;
  bidVol: number;
  askVol: number;
  isLarge: boolean;
}

interface RecentPrint {
  id: string;
  time: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

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

const DOMPanel: React.FC = () => {
  const selected = useAppStore((state) => state.selectedInstrument);
  const prices = useMarketPriceStore((state) => state.prices);
  const addToast = useAppStore((state) => state.addToast);

  const [lotSize, setLotSize] = useState<number>(0.1);
  const [leverage] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Stats
  const [cumDelta, setCumDelta] = useState<number>(142);
  const [recentPrints, setRecentPrints] = useState<RecentPrint[]>([]);

  const livePrice = useMemo(() => {
    if (!selected) return 0;
    return prices[selected.symbol]?.price ?? selected.price ?? 0;
  }, [selected, prices]);

  const pipSize = useMemo(() => {
    if (!selected) return 0.0001;
    return getPipSize(selected.symbol);
  }, [selected]);

  const precision = useMemo(() => {
    if (!selected) return 2;
    return getPrecision(selected.symbol);
  }, [selected]);

  // Fast tick simulation for DOM depth updates + Scrolling prints tape
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);

      if (livePrice > 0 && selected) {
        // Generate a random trade print
        const isBuy = Math.random() > 0.48;
        const size = parseFloat((0.01 + Math.random() * 2.5).toFixed(2));
        const priceOffset = ((Math.floor(Math.random() * 3) - 1) * pipSize);
        const printPrice = livePrice + priceOffset;
        
        const now = new Date();
        const timeStr = now.toTimeString().substring(0, 8);

        const newPrint: RecentPrint = {
          id: Math.random().toString(),
          time: timeStr,
          price: printPrice,
          size,
          side: isBuy ? 'buy' : 'sell'
        };

        setRecentPrints((prev) => [newPrint, ...prev.slice(0, 24)]);
        setCumDelta((prev) => prev + (isBuy ? size : -size));
      }
    }, 850);

    return () => clearInterval(interval);
  }, [livePrice, selected, pipSize]);

  // Generate Ask & Bid rows centered around the live price
  const domRows = useMemo(() => {
    if (livePrice <= 0 || !selected) return [];

    const rows: DOMRow[] = [];
    
    // 5 Ask Levels (above)
    for (let i = 5; i >= 1; i--) {
      const price = livePrice + i * pipSize;
      const seed = Math.floor(price * 1000) + tick;
      const askVol = 5 + (seed % 150);
      const isLarge = askVol > 120;
      rows.push({ price, bidVol: 0, askVol, isLarge });
    }

    // 5 Bid Levels (below)
    for (let i = 1; i <= 5; i++) {
      const price = livePrice - i * pipSize;
      const seed = Math.floor(price * 1000) + tick;
      const bidVol = 5 + (seed % 165);
      const isLarge = bidVol > 120;
      rows.push({ price, bidVol, askVol: 0, isLarge });
    }

    return rows;
  }, [livePrice, selected, pipSize, tick]);

  // Compute bid-ask imbalance %
  const imbalancePct = useMemo(() => {
    let askSum = 0;
    let bidSum = 0;
    domRows.forEach((r) => {
      askSum += r.askVol;
      bidSum += r.bidVol;
    });
    if (askSum + bidSum === 0) return 50;
    return Math.round((bidSum / (askSum + bidSum)) * 100);
  }, [domRows]);

  const handleQuickOrder = async (side: 'buy' | 'sell') => {
    if (!selected) return;
    setLoading(true);
    try {
      await placeOrder({
        symbol: selected.symbol,
        side,
        type: 'market',
        quantity: lotSize,
        leverage,
      });
      addToast('success', `Quick ${side.toUpperCase()} of ${lotSize} ${selected.symbol} executed`);
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || 'Quick execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReverse = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await reversePosition(selected.symbol);
      addToast('success', `Position for ${selected.symbol} reversed`);
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || 'Reverse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickClose = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await closeSymbol(selected.symbol);
      addToast('success', `Position for ${selected.symbol} closed`);
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || 'Close failed');
    } finally {
      setLoading(false);
    }
  };

  if (!selected) {
    return (
      <div style={{ padding: '16px', color: '#8e8e93', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>
        Select an instrument from the watchlist to display depth of market.
      </div>
    );
  }

  const mockSpreadVal = 0.8 + ((Math.floor(livePrice * 100) + tick) % 5) * 0.1;

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Selector & Spread Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '13px', color: '#f5f5f7' }}>{selected.symbol} Institutional DOM</strong>
            <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Standard depth levels (pips steps)</span>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#d4af37', fontFamily: 'var(--font-mono)' }}>
              Spread: {mockSpreadVal.toFixed(1)} pips
            </span>
          </div>
        </div>
        
        {/* Dynamic Imbalance Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#8e8e93' }}>
            <span style={{ color: '#00c076', fontWeight: 600 }}>Bids (Imbalance): {imbalancePct}%</span>
            <span style={{ color: '#ff4d57', fontWeight: 600 }}>Asks: {100 - imbalancePct}%</span>
          </div>
          <div style={{ height: '4px', background: '#ff4d57', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${imbalancePct}%`, background: '#00c076', height: '100%' }} />
          </div>
        </div>
      </div>

      {/* DOM Content Container (Split screen: Left Price ladder, Right Recent trades) */}
      <div style={{ flex: 1, display: 'flex', gap: '10px', overflow: 'hidden' }}>
        
        {/* Left side: Price ladder */}
        <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid #1b2235', paddingRight: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ background: '#070b14' }}>
                <th style={{ padding: '4px 6px', color: '#ff4d57', textAlign: 'left', width: '12%', fontSize: '9px' }}>HEATMAP</th>
                <th style={{ padding: '4px 6px', color: '#ff4d57', textAlign: 'left', width: '28%', fontSize: '9px' }}>ASK VOL</th>
                <th style={{ padding: '4px 6px', color: '#8e8e93', textAlign: 'center', width: '20%', fontSize: '9px' }}>PRICE</th>
                <th style={{ padding: '4px 6px', color: '#00c076', textAlign: 'right', width: '28%', fontSize: '9px' }}>BID VOL</th>
                <th style={{ padding: '4px 6px', color: '#00c076', textAlign: 'right', width: '12%', fontSize: '9px' }}>HEATMAP</th>
              </tr>
            </thead>
            <tbody>
              {domRows.map((row, idx) => {
                const bg = row.isLarge 
                  ? 'rgba(212,175,55,0.04)' 
                  : (idx === 5 ? 'rgba(255,255,255,0.02)' : 'transparent');
                
                const askHeatmapStyle: React.CSSProperties = {
                  background: row.askVol > 0 ? `rgba(255, 77, 87, ${Math.min(1, row.askVol / 180) * 0.4})` : 'transparent',
                  width: '100%',
                  height: '100%',
                  display: 'inline-block',
                  minHeight: '12px',
                  borderRadius: '1px'
                };

                const bidHeatmapStyle: React.CSSProperties = {
                  background: row.bidVol > 0 ? `rgba(0, 192, 118, ${Math.min(1, row.bidVol / 180) * 0.4})` : 'transparent',
                  width: '100%',
                  height: '100%',
                  display: 'inline-block',
                  minHeight: '12px',
                  borderRadius: '1px'
                };

                return (
                  <tr key={row.price} style={{ background: bg, borderBottom: '1px solid rgba(27,34,53,0.3)' }}>
                    {/* Ask heatmap intensity column */}
                    <td style={{ padding: '2px 4px', textAlign: 'left' }}>
                      <span style={askHeatmapStyle} />
                    </td>

                    {/* Ask volume */}
                    <td style={{ padding: '4px 6px', color: '#ff4d57', textAlign: 'left' }}>
                      {row.askVol > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ height: '5px', width: `${Math.min(50, (row.askVol / 150) * 50)}px`, background: 'rgba(255,77,87,0.2)', borderRadius: '1px' }} />
                          <span>{row.askVol}</span>
                        </div>
                      ) : ''}
                    </td>
                    
                    {/* Price */}
                    <td style={{ padding: '4px 6px', color: idx < 5 ? '#ff4d57' : '#00c076', textAlign: 'center', fontWeight: 600 }}>
                      {row.price.toFixed(precision)}
                    </td>
                    
                    {/* Bid volume */}
                    <td style={{ padding: '4px 6px', color: '#00c076', textAlign: 'right' }}>
                      {row.bidVol > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                          <span>{row.bidVol}</span>
                          <div style={{ height: '5px', width: `${Math.min(50, (row.bidVol / 165) * 50)}px`, background: 'rgba(0,192,118,0.2)', borderRadius: '1px' }} />
                        </div>
                      ) : ''}
                    </td>

                    {/* Bid heatmap intensity column */}
                    <td style={{ padding: '2px 4px', textAlign: 'right' }}>
                      <span style={bidHeatmapStyle} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right side: Time & Sales Scrolling trades tape with aggressive trader highlights */}
        <div style={{ width: '200px', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1b2235', paddingBottom: '4px', marginBottom: '4px', flexShrink: 0 }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>Time &amp; Sales</span>
            <span style={{ fontSize: '9px', color: '#8e8e93', fontFamily: 'var(--font-mono)' }}>Delta: {cumDelta.toFixed(1)}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {recentPrints.map((print) => {
              const isAggr = print.size > 1.5;
              const sideColor = print.side === 'buy' ? '#00c076' : '#ff4d57';
              
              return (
                <div
                  key={print.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: sideColor,
                    padding: '3px 4px',
                    background: isAggr 
                      ? (print.side === 'buy' ? 'rgba(0,192,118,0.08)' : 'rgba(255,77,87,0.08)')
                      : (print.side === 'buy' ? 'rgba(0,192,118,0.02)' : 'rgba(255,77,87,0.02)'),
                    borderRadius: '2px',
                    borderLeft: isAggr ? `2px solid ${sideColor}` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{print.time}</span>
                    <strong>{print.price.toFixed(precision)}</strong>
                    <span>{print.size.toFixed(2)}</span>
                  </div>
                  {isAggr && (
                    <span style={{ fontSize: '8px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: sideColor, marginTop: '2px' }}>
                      ⚡ AGGRESSIVE {print.side === 'buy' ? 'BUYER' : 'SELLER'}
                    </span>
                  )}
                </div>
              );
            })}
            {recentPrints.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase' }}>
                Waiting for prints...
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Lot size selector & 1-Click buttons */}
      <div style={{ borderTop: '1px solid #1b2235', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        
        {/* Lot Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase' }}>Qty:</span>
            {[0.01, 0.1, 0.5, 1.0, 5.0].map((size) => (
              <button
                key={size}
                onClick={() => setLotSize(size)}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  borderRadius: '3px',
                  border: '1px solid #1b2235',
                  background: lotSize === size ? '#d4af37' : '#070b14',
                  color: lotSize === size ? '#070b14' : '#8e8e93',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {size}
              </button>
            ))}
          </div>
          
          <div style={{ fontSize: '10px', color: '#8e8e93' }}>
            1-Click Trading Enabled
          </div>
        </div>

        {/* 1-Click Control Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
          <button
            onClick={() => handleQuickOrder('buy')}
            disabled={loading}
            style={{
              padding: '6px 4px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '3px',
              border: 'none',
              background: '#00c076',
              color: '#070b14',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Buy
          </button>
          
          <button
            onClick={() => handleQuickOrder('sell')}
            disabled={loading}
            style={{
              padding: '6px 4px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '3px',
              border: 'none',
              background: '#ff4d57',
              color: '#ffffff',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Sell
          </button>

          <button
            onClick={handleQuickReverse}
            disabled={loading}
            style={{
              padding: '6px 4px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '3px',
              border: '1px solid #1b2235',
              background: '#070b14',
              color: '#ea7317',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Reverse
          </button>

          <button
            onClick={handleQuickClose}
            disabled={loading}
            style={{
              padding: '6px 4px',
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '3px',
              border: '1px solid #1b2235',
              background: '#070b14',
              color: '#ff4d57',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Close
          </button>
        </div>
      </div>

    </div>
  );
};

export default DOMPanel;
