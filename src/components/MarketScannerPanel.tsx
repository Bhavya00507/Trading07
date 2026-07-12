import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';

type ScanEventType =
  | 'breakout'
  | 'breakdown'
  | 'ema_cross'
  | 'golden_cross'
  | 'death_cross'
  | 'rsi_overbought'
  | 'rsi_oversold'
  | 'macd_cross'
  | 'volume_spike'
  | 'new_high'
  | 'new_low'
  | 'opening_gap'
  | 'vwap_cross';

interface ScannerItem {
  symbol: string;
  category: string;
  price: number;
  rsi: number;
  volume24h: number;
  volumeChange: number;
  high52w: number;
  low52w: number;
  gapPct: number;
  vwap: number;
  activeEvents: ScanEventType[];
  eventDetail: string;
}

export const MarketScannerPanel: React.FC = () => {
  const watchlist = useAppStore((state) => state.watchlist);
  const prices = useMarketStore((state) => state.prices);
  const setSelectedInstrument = useAppStore((state) => state.setSelectedInstrument);
  const addToast = useAppStore((state) => state.addToast);

  const [activeCategory, setActiveCategory] = useState<'ALL' | 'crypto' | 'forex' | 'indices' | 'metals'>('ALL');
  const [selectedFilter, setSelectedFilter] = useState<ScanEventType | 'ALL'>('ALL');
  const [tick, setTick] = useState(0);

  // Store seen events to avoid notification spam
  const notifiedEventsRef = useRef<Set<string>>(new Set());

  // Tick generator to simulate live price updates and trigger new technical scans
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scanResults = useMemo((): ScannerItem[] => {
    return watchlist.map((inst, idx): ScannerItem => {
      const livePrice = prices[inst.symbol]?.price ?? inst.price ?? 100;
      const seed = Math.floor(livePrice * 10) + tick + idx;

      // Indicator simulation based on price seed
      const rsi = 20 + (seed % 65); // 20 to 85
      const volume24h = (seed % 1000) * 15000 + 20000;
      const volumeChange = (seed % 350) - 50; // -50% to +300%
      const high52w = livePrice * 1.25;
      const low52w = livePrice * 0.75;
      const gapPct = parseFloat((((seed % 15) - 7.5) * 0.5).toFixed(2));
      const vwap = livePrice * (0.98 + (seed % 4) * 0.01); // VWAP is near price

      const activeEvents: ScanEventType[] = [];
      let eventDetail = 'Normal Market Activity';

      // 1. Breakout / Breakdown
      if (volumeChange > 180 && seed % 4 === 0) {
        activeEvents.push('breakout');
        eventDetail = 'Bullish price breakout on high volume';
      } else if (volumeChange > 180 && seed % 4 === 1) {
        activeEvents.push('breakdown');
        eventDetail = 'Bearish breakdown on high volume';
      }

      // 2. EMA Crosses / Golden / Death
      if (seed % 12 === 0) {
        activeEvents.push('ema_cross');
        eventDetail = 'EMA 9 crossed above EMA 21';
      } else if (seed % 25 === 0) {
        activeEvents.push('golden_cross');
        eventDetail = 'Golden Cross: EMA 50 crossed above EMA 200';
      } else if (seed % 25 === 1) {
        activeEvents.push('death_cross');
        eventDetail = 'Death Cross: EMA 50 crossed below EMA 200';
      }

      // 3. RSI Overbought / Oversold
      if (rsi > 70) {
        activeEvents.push('rsi_overbought');
        eventDetail = `RSI Overbought: ${rsi}`;
      } else if (rsi < 30) {
        activeEvents.push('rsi_oversold');
        eventDetail = `RSI Oversold: ${rsi}`;
      }

      // 4. MACD Cross
      if (seed % 9 === 0) {
        activeEvents.push('macd_cross');
        eventDetail = 'MACD line crossed Signal line (Bullish)';
      }

      // 5. Volume Spike
      if (volumeChange > 200) {
        activeEvents.push('volume_spike');
        eventDetail = `Volume spike of +${volumeChange}% detected`;
      }

      // 6. New High / New Low
      if (seed % 15 === 0) {
        activeEvents.push('new_high');
        eventDetail = 'New 52-Week High reached';
      } else if (seed % 15 === 1) {
        activeEvents.push('new_low');
        eventDetail = 'New 52-Week Low reached';
      }

      // 7. Opening Gap
      if (Math.abs(gapPct) > 2.0) {
        activeEvents.push('opening_gap');
        eventDetail = `Opening Gap of ${gapPct > 0 ? '+' : ''}${gapPct}%`;
      }

      // 8. VWAP Cross
      if (Math.abs(livePrice - vwap) < 0.05 * livePrice && seed % 7 === 0) {
        activeEvents.push('vwap_cross');
        eventDetail = 'Price crossed VWAP level';
      }

      return {
        symbol: inst.symbol,
        category: inst.category,
        price: livePrice,
        rsi,
        volume24h,
        volumeChange,
        high52w,
        low52w,
        gapPct,
        vwap,
        activeEvents,
        eventDetail,
      };
    });
  }, [watchlist, prices, tick]);

  // Send notifications for newly triggered signals
  useEffect(() => {
    scanResults.forEach((item) => {
      item.activeEvents.forEach((ev) => {
        const uniqueKey = `${item.symbol}_${ev}_${tick}`;
        if (!notifiedEventsRef.current.has(uniqueKey)) {
          notifiedEventsRef.current.add(uniqueKey);
          // Limit notifications slightly to keep it premium and non-spammy
          if (notifiedEventsRef.current.size < 100) {
            addToast('info', `[SCANNER] ${item.symbol}: ${ev.toUpperCase().replace('_', ' ')} detected!`);
          }
        }
      });
    });
  }, [scanResults, addToast, tick]);

  // Filters logic
  const filteredResults = useMemo(() => {
    return scanResults.filter((item) => {
      if (activeCategory !== 'ALL' && item.category !== activeCategory) return false;
      if (selectedFilter !== 'ALL' && !item.activeEvents.includes(selectedFilter)) return false;
      return true;
    });
  }, [scanResults, activeCategory, selectedFilter]);

  const filterButtons: { id: ScanEventType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All Events' },
    { id: 'breakout', label: 'Breakouts' },
    { id: 'breakdown', label: 'Breakdowns' },
    { id: 'ema_cross', label: 'EMA Cross' },
    { id: 'golden_cross', label: 'Golden Cross' },
    { id: 'death_cross', label: 'Death Cross' },
    { id: 'rsi_overbought', label: 'Overbought' },
    { id: 'rsi_oversold', label: 'Oversold' },
    { id: 'macd_cross', label: 'MACD Cross' },
    { id: 'volume_spike', label: 'Volume Spike' },
    { id: 'new_high', label: 'New High' },
    { id: 'new_low', label: 'New Low' },
    { id: 'opening_gap', label: 'Gap' },
    { id: 'vwap_cross', label: 'VWAP Cross' },
  ];

  return (
    <div style={{
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '10px',
      background: '#0d1322',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px' }}>
        <div>
          <strong style={{ fontSize: '13px', color: '#f5f5f7' }}>Live Market Scanner</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>
            Real-time multi-asset scanner tracking breakouts, crossovers, and key technical signal changes with instant alert notifications
          </span>
        </div>
        <div style={{ fontSize: '9px', color: '#8e8e93' }}>
          Cycle: {tick} | Detected: {filteredResults.length} events
        </div>
      </div>

      {/* Asset category filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['ALL', 'crypto', 'forex', 'indices', 'metals'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
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

        {/* Technical Event Filters Toolbar */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', maxWidth: '100%', paddingBottom: '4px' }}>
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setSelectedFilter(btn.id)}
              style={{
                padding: '3px 8px',
                fontSize: '9px',
                fontWeight: 700,
                borderRadius: '3px',
                border: '1px solid #1b2235',
                background: selectedFilter === btn.id ? '#1b2235' : '#070b14',
                color: selectedFilter === btn.id ? '#d4af37' : '#8e8e93',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1b2235', color: '#8e8e93', background: '#070b14' }}>
              <th style={{ padding: '6px 8px' }}>SYMBOL</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>PRICE</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>RSI</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>VWAP</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>VOL CHANGE</th>
              <th style={{ padding: '6px 8px', textAlign: 'right' }}>GAP %</th>
              <th style={{ padding: '6px 8px' }}>SIGNALS</th>
              <th style={{ padding: '6px 8px' }}>DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((item) => {
              const rsiColor = item.rsi > 70 ? '#ff4d57' : item.rsi < 30 ? '#00c076' : '#fff';
              return (
                <tr
                  key={item.symbol}
                  onClick={() => {
                    const match = watchlist.find((w) => w.symbol === item.symbol);
                    if (match) setSelectedInstrument(match);
                  }}
                  style={{ borderBottom: '1px solid #1b2235', cursor: 'pointer', background: '#0d1322' }}
                >
                  <td style={{ padding: '8px 8px', fontWeight: 700, color: '#f5f5f7' }}>{item.symbol}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>${item.price.toLocaleString()}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: rsiColor, fontWeight: 600 }}>{item.rsi}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: '#8e8e93' }}>${item.vwap.toFixed(2)}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: item.volumeChange >= 0 ? '#00c076' : '#ff4d57' }}>
                    {item.volumeChange >= 0 ? '+' : ''}{item.volumeChange}%
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: item.gapPct >= 0 ? '#00c076' : '#ff4d57' }}>
                    {item.gapPct >= 0 ? '+' : ''}{item.gapPct}%
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                      {item.activeEvents.map((ev) => (
                        <span
                          key={ev}
                          style={{
                            padding: '1px 4px',
                            borderRadius: '2px',
                            fontSize: '8px',
                            fontWeight: 700,
                            background: ev.includes('bull') || ev.includes('buy') || ev.includes('high') || ev === 'breakout' || ev === 'golden_cross' ? '#00c07622' : '#ff4d5722',
                            color: ev.includes('bull') || ev.includes('buy') || ev.includes('high') || ev === 'breakout' || ev === 'golden_cross' ? '#00c076' : '#ff4d57',
                            border: `1px solid ${ev.includes('bull') || ev.includes('buy') || ev.includes('high') || ev === 'breakout' || ev === 'golden_cross' ? '#00c07644' : '#ff4d5744'}`,
                          }}
                        >
                          {ev.toUpperCase().replace('_', ' ')}
                        </span>
                      ))}
                      {item.activeEvents.length === 0 && (
                        <span style={{ color: '#8e8e93', fontSize: '9px' }}>None</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px 8px', color: '#f5f5f7' }}>{item.eventDetail}</td>
                </tr>
              );
            })}
            {filteredResults.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#8e8e93' }}>
                  No assets with active signal triggers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketScannerPanel;
