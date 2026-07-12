import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';

interface FootprintRow {
  price: number;
  bidVol: number;
  askVol: number;
  delta: number;
  imbalance: 'bullish' | 'bearish' | 'none';
  isIceberg: boolean;
  isAbsorption: boolean;
}

export const MicrostructurePanel: React.FC = () => {
  const selected = useAppStore((s) => s.selectedInstrument);
  const prices = useMarketStore((s) => s.prices);

  const [tick, setTick] = useState(0);

  const livePrice = useMemo(() => {
    if (!selected) return 100;
    return prices[selected.symbol]?.price ?? selected.price ?? 100;
  }, [selected, prices]);

  // Tick update
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Generate Footprint Rows centered on live price
  const footprintData = useMemo(() => {
    const rows: FootprintRow[] = [];
    const step = livePrice > 1000 ? 10 : livePrice > 100 ? 1 : 0.1;
    const centerPrice = Math.round(livePrice / step) * step;

    for (let i = -5; i <= 5; i++) {
      const price = parseFloat((centerPrice + i * step).toFixed(2));
      const seed = Math.floor(price * 100) + tick;

      // Bid and Ask Volume simulation
      const bidVol = (seed % 95) + 5;
      const askVol = ((seed * 3) % 95) + 5;
      const delta = askVol - bidVol;

      // Imbalance check (diagonally bid vs ask, simulated here per row for visualization)
      let imbalance: FootprintRow['imbalance'] = 'none';
      if (askVol > bidVol * 3) imbalance = 'bullish';
      if (bidVol > askVol * 3) imbalance = 'bearish';

      // Absorption & Iceberg detection simulation
      const isIceberg = seed % 13 === 0 && (bidVol > 80 || askVol > 80);
      const isAbsorption = seed % 17 === 0 && (bidVol > 75 || askVol > 75);

      rows.push({
        price,
        bidVol,
        askVol,
        delta,
        imbalance,
        isIceberg,
        isAbsorption
      });
    }

    // Sort price descending (highest price on top)
    return rows.sort((a, b) => b.price - a.price);
  }, [livePrice, tick]);

  // Cumulative Delta calculation
  const cumulativeDelta = useMemo(() => {
    const seed = Math.floor(livePrice) + tick;
    return (seed % 1000) - 500;
  }, [livePrice, tick]);

  // Volume Profile totals
  const maxVolume = useMemo(() => {
    return Math.max(...footprintData.map(r => r.bidVol + r.askVol), 1);
  }, [footprintData]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0d1322',
      color: '#fff',
      padding: '12px',
      gap: '10px',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
    }}>
      
      {/* Microstructure Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '13px', color: '#f5f5f7' }}>
            {selected?.symbol ?? 'BTCUSD'} Microstructure Order Flow
          </strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>
            Footprint split Bid/Ask, volume profiles, bid-ask imbalances, cumulative delta, absorption levels, and hidden iceberg orders
          </span>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '10px' }}>
          <div>
            <span style={{ color: '#8e8e93' }}>Cumulative Delta: </span>
            <strong style={{ color: cumulativeDelta >= 0 ? '#00c076' : '#ff4d57', fontFamily: 'var(--font-mono)' }}>
              {cumulativeDelta >= 0 ? '+' : ''}{cumulativeDelta}
            </strong>
          </div>
          <div>
            <span style={{ color: '#8e8e93' }}>Imbalance Threshold: </span>
            <strong style={{ color: '#d4af37' }}>300% (3x)</strong>
          </div>
        </div>
      </div>

      {/* Main Microstructure Layout */}
      <div style={{ display: 'flex', gap: '12px', flex: 1, overflow: 'hidden' }}>
        
        {/* Footprint Chart (Left / flex 2) */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#0d1322', padding: '6px 10px', borderBottom: '1px solid #1b2235', fontWeight: 800, color: '#f5f5f7' }}>
            Bid / Ask Volume Footprint Grid
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#070b14', borderBottom: '1px solid #1b2235', color: '#8e8e93', fontSize: '9px' }}>
                  <th style={{ padding: '6px 4px', width: '25%' }}>BID VOLUME</th>
                  <th style={{ padding: '6px 4px', width: '20%', background: '#0d1322', color: '#fff' }}>PRICE</th>
                  <th style={{ padding: '6px 4px', width: '25%' }}>ASK VOLUME</th>
                  <th style={{ padding: '6px 4px', width: '15%' }}>DELTA</th>
                  <th style={{ padding: '6px 4px', width: '15%' }}>INDICATORS</th>
                </tr>
              </thead>
              <tbody>
                {footprintData.map((row) => {
                  const bidBg = row.imbalance === 'bearish' ? 'rgba(255,77,87,0.15)' : 'transparent';
                  const askBg = row.imbalance === 'bullish' ? 'rgba(0,192,118,0.15)' : 'transparent';

                  return (
                    <tr key={row.price} style={{ borderBottom: '1px solid #1b2235' }}>
                      {/* Bid Vol */}
                      <td style={{ padding: '6px 4px', background: bidBg, color: row.imbalance === 'bearish' ? '#ff4d57' : '#fff', fontWeight: row.imbalance === 'bearish' ? 700 : 400 }}>
                        {row.bidVol}
                      </td>

                      {/* Price Level */}
                      <td style={{ padding: '6px 4px', background: '#0d1322', fontWeight: 800, color: '#f5f5f7' }}>
                        ${row.price.toLocaleString()}
                      </td>

                      {/* Ask Vol */}
                      <td style={{ padding: '6px 4px', background: askBg, color: row.imbalance === 'bullish' ? '#00c076' : '#fff', fontWeight: row.imbalance === 'bullish' ? 700 : 400 }}>
                        {row.askVol}
                      </td>

                      {/* Row Delta */}
                      <td style={{ padding: '6px 4px', color: row.delta >= 0 ? '#00c076' : '#ff4d57', fontWeight: 600 }}>
                        {row.delta >= 0 ? '+' : ''}{row.delta}
                      </td>

                      {/* Microstructure highlights */}
                      <td style={{ padding: '6px 4px' }}>
                        <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                          {row.isIceberg && (
                            <span style={{ padding: '1px 3px', borderRadius: '2px', fontSize: '8px', fontWeight: 700, background: '#d4af3722', color: '#d4af37', border: '1px solid #d4af3740' }} title="Hidden Iceberg Order Detected">
                              ICEBERG
                            </span>
                          )}
                          {row.isAbsorption && (
                            <span style={{ padding: '1px 3px', borderRadius: '2px', fontSize: '8px', fontWeight: 700, background: '#00c07622', color: '#00c076', border: '1px solid #00c07640' }} title="Buying/Selling Absorption Level">
                              ABSORBED
                            </span>
                          )}
                          {!row.isIceberg && !row.isAbsorption && (
                            <span style={{ color: '#8e8e93', fontSize: '9px' }}>-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Volume & Delta Profile (Right / flex 1) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', gap: '10px' }}>
          <div>
            <strong style={{ color: '#d4af37', textTransform: 'uppercase', fontSize: '10px' }}>Volume Profile Structure</strong>
            <span style={{ display: 'block', color: '#8e8e93', fontSize: '9px', marginTop: '2px' }}>Total volume & delta per price level</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
            {footprintData.map((row) => {
              const totalVol = row.bidVol + row.askVol;
              const fillPct = (totalVol / maxVolume) * 100;
              const deltaPct = Math.min(100, (Math.abs(row.delta) / totalVol) * 100);

              return (
                <div key={row.price} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Price label */}
                  <span style={{ width: '55px', color: '#8e8e93', fontSize: '9px', textAlign: 'right' }}>
                    ${row.price}
                  </span>
                  
                  {/* Profile Bar */}
                  <div style={{ flex: 1, height: '12px', background: '#0d1322', borderRadius: '2px', overflow: 'hidden', border: '1px solid #1b2235', position: 'relative' }}>
                    {/* Volume Bar Fill */}
                    <div style={{ width: `${fillPct}%`, height: '100%', background: 'linear-gradient(to right, #1b2235, #d4af37)', borderRadius: '2px 0 0 2px' }} />
                    {/* Overlay Delta Marker */}
                    <div style={{
                      position: 'absolute',
                      left: '4px',
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '8px',
                      color: row.delta >= 0 ? '#00c076' : '#ff4d57',
                      fontWeight: 700
                    }}>
                      {row.delta >= 0 ? '▲' : '▼'} {Math.round(deltaPct)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};

export default MicrostructurePanel;
