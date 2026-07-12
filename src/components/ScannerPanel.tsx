// src/components/ScannerPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';

interface ScannerItem {
  symbol: string;
  category: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsi: number;
  atr: number;
  volume: string;
  momentum: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
}

const ScannerPanel: React.FC = () => {
  const watchlist = useAppStore((state) => state.watchlist);
  const prices = useMarketStore((state) => state.prices);
  const setSelectedInstrument = useAppStore((state) => state.setSelectedInstrument);

  const [activeCategory, setActiveCategory] = useState<'ALL' | 'crypto' | 'forex' | 'indices' | 'metals'>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'trending' | 'breakout' | 'oversold' | 'overbought'>('ALL');
  const [tick, setTick] = useState(0);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute scanner values based on prices and baseline hashes
  const scanResults = useMemo(() => {
    return watchlist.map((inst): ScannerItem => {
      const livePrice = prices[inst.symbol]?.price ?? inst.price ?? 100;
      
      // Dynamic calculations matching price
      const seed = Math.floor(livePrice * 100) + tick;
      
      // RSI: fluctuate around 30 to 70 depending on seed
      const rsi = parseFloat((30 + (seed % 41)).toFixed(1));
      
      // ATR: base on price level
      const baseAtr = livePrice * 0.0008;
      const atr = parseFloat((baseAtr + ((seed % 10) * baseAtr * 0.1)).toFixed(inst.symbol.includes('JPY') ? 2 : 4));
      
      // Volume: simulated
      const volNum = (1000 + (seed % 9000)) * (livePrice > 1000 ? 5 : 50);
      const volume = volNum >= 1000000 ? `${(volNum / 1000000).toFixed(1)}M` : `${Math.round(volNum / 1000)}K`;
      
      // Momentum %
      const momentum = parseFloat((((seed % 200) - 100) / 100).toFixed(2));
      
      // Trend
      let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      if (momentum > 0.15) trend = 'BULLISH';
      else if (momentum < -0.15) trend = 'BEARISH';
      
      // Signal based on RSI and Momentum rules
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      if (rsi < 35 || (trend === 'BULLISH' && rsi < 60)) signal = 'BUY';
      else if (rsi > 65 || (trend === 'BEARISH' && rsi > 40)) signal = 'SELL';
      
      // Confidence %
      const confidence = 50 + (seed % 46);

      return {
        symbol: inst.symbol,
        category: inst.category,
        trend,
        rsi,
        atr,
        volume,
        momentum,
        signal,
        confidence,
      };
    });
  }, [watchlist, prices, tick]);

  // Apply filters
  const filteredResults = useMemo(() => {
    return scanResults.filter((item) => {
      // 1. Category Filter
      if (activeCategory !== 'ALL' && item.category !== activeCategory) return false;

      // 2. Technical Filter
      if (activeFilter === 'trending' && item.trend === 'NEUTRAL') return false;
      if (activeFilter === 'breakout' && item.confidence < 80) return false;
      if (activeFilter === 'oversold' && item.rsi >= 35) return false;
      if (activeFilter === 'overbought' && item.rsi <= 65) return false;

      return true;
    });
  }, [scanResults, activeCategory, activeFilter]);

  const getSignalColor = (sig: string) => {
    if (sig === 'BUY') return '#00c076';
    if (sig === 'SELL') return '#ff4d57';
    return '#ea7317'; // Yellow / Neutral
  };

  const getTrendColor = (tr: string) => {
    if (tr === 'BULLISH') return '#00c076';
    if (tr === 'BEARISH') return '#ff4d57';
    return '#8e8e93';
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Filtering Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '8px' }}>
        
        {/* Categories Selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['ALL', 'crypto', 'forex', 'indices', 'metals'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '3px',
                border: '1px solid #1b2235',
                background: activeCategory === cat ? '#d4af37' : '#070b14',
                color: activeCategory === cat ? '#070b14' : '#8e8e93',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Signal Filters */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['ALL', 'trending', 'breakout', 'oversold', 'overbought'] as const).map((filt) => (
            <button
              key={filt}
              onClick={() => setActiveFilter(filt)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '3px',
                border: '1px solid #1b2235',
                background: activeFilter === filt ? '#1b2235' : '#070b14',
                color: activeFilter === filt ? '#d4af37' : '#8e8e93',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {filt}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '10px', color: '#8e8e93' }}>
          Auto-refreshing in 5s... (Updates: {tick})
        </div>
      </div>

      {/* Results Grid Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid #1b2235', color: '#8e8e93', textAlign: 'left', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>Symbol</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid #1b2235', color: '#8e8e93', textAlign: 'left', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>Trend</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid #1b2235', color: '#8e8e93', textAlign: 'right', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>RSI (14)</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid #1b2235', color: '#8e8e93', textAlign: 'right', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>ATR</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid #1b2235', color: '#8e8e93', textAlign: 'right', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>Volume</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid #1b2235', color: '#8e8e93', textAlign: 'right', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>Momentum</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid #1b2235', color: '#8e8e93', textAlign: 'center', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>Signal</th>
              <th style={{ padding: '6px 8px', borderBottom: '1px solid #1b2235', color: '#8e8e93', textAlign: 'right', textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((item) => (
              <tr
                key={item.symbol}
                style={{ cursor: 'pointer', borderBottom: '1px solid #1b2235' }}
                onClick={() => {
                  const match = watchlist.find((w) => w.symbol === item.symbol);
                  if (match) setSelectedInstrument(match);
                }}
              >
                <td style={{ padding: '8px', fontWeight: 700, color: '#f5f5f7' }}>{item.symbol}</td>
                <td style={{ padding: '8px', color: getTrendColor(item.trend), fontWeight: 600 }}>{item.trend}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{item.rsi}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{item.atr}</td>
                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{item.volume}</td>
                <td style={{ padding: '8px', textAlign: 'right', color: item.momentum >= 0 ? '#00c076' : '#ff4d57', fontFamily: 'var(--font-mono)' }}>
                  {item.momentum >= 0 ? '+' : ''}{item.momentum}%
                </td>
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '3px',
                    fontWeight: 700,
                    fontSize: '10px',
                    backgroundColor: `${getSignalColor(item.signal)}15`,
                    color: getSignalColor(item.signal),
                    border: `1px solid ${getSignalColor(item.signal)}30`
                  }}>
                    {item.signal}
                  </span>
                </td>
                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#d4af37', fontFamily: 'var(--font-mono)' }}>
                  {item.confidence}%
                </td>
              </tr>
            ))}
            {filteredResults.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#8e8e93' }}>
                  No scanner results match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScannerPanel;
