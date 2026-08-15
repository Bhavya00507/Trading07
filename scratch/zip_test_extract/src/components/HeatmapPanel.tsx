// src/components/HeatmapPanel.tsx
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { formatPrice } from './Watchlist';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  fontSize: 11,
};

const filterBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-color)',
};

const filterSelect: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const gridWrap: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '12px',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
  gap: 8,
};

const getHeatmapColor = (change: number): string => {
  if (change > 2.0) return 'rgba(14, 203, 129, 0.85)'; // Strong Green
  if (change > 0.8) return 'rgba(14, 203, 129, 0.6)';  // Medium Green
  if (change > 0.1) return 'rgba(14, 203, 129, 0.35)'; // Light Green
  if (change < -2.0) return 'rgba(246, 70, 93, 0.85)'; // Strong Red
  if (change < -0.8) return 'rgba(246, 70, 93, 0.6)';  // Medium Red
  if (change < -0.1) return 'rgba(246, 70, 93, 0.35)'; // Light Red
  return 'var(--bg-tertiary)'; // Neutral Grey
};

const cardStyle = (change: number, isSelected: boolean): React.CSSProperties => ({
  backgroundColor: getHeatmapColor(change),
  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-color)',
  borderRadius: 4,
  padding: '12px 10px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  minHeight: 70,
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  boxShadow: isSelected ? '0 0 8px var(--border-glow)' : 'none',
});

const HeatmapPanel: React.FC = () => {
  const watchlist = useAppStore((state) => state.watchlist);
  const selected = useAppStore((state) => state.selectedInstrument);
  const setSelected = useAppStore((state) => state.setSelectedInstrument);
  const prices = useMarketStore((state) => state.prices);
  const candlesMap = useMarketStore((state) => state.candles);

  const [heatmapGroup, setHeatmapGroup] = useState<'all' | 'crypto' | 'forex' | 'indices' | 'metals'>('all');

  const processedItems = useMemo(() => {
    return watchlist.map((inst) => {
      const livePrice = prices[inst.symbol]?.price ?? inst.price ?? 0;
      const candles = candlesMap[`${inst.symbol}|1m`] || [];
      const openPrice = candles.length > 0 ? candles[0].open : inst.price;
      const pctChange = openPrice ? ((livePrice - openPrice) / openPrice) * 100 : 0;
      
      return {
        inst,
        livePrice,
        pctChange,
      };
    });
  }, [watchlist, prices, candlesMap]);

  const filteredItems = useMemo(() => {
    if (heatmapGroup === 'all') return processedItems;
    return processedItems.filter(item => item.inst.category?.toLowerCase() === heatmapGroup);
  }, [processedItems, heatmapGroup]);

  return (
    <div style={containerStyle}>
      <div style={filterBar}>
        <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 9 }}>Group:</span>
        <select
          value={heatmapGroup}
          onChange={(e) => setHeatmapGroup(e.target.value as any)}
          style={filterSelect}
        >
          <option value="all">All Markets</option>
          <option value="forex">Forex Heatmap</option>
          <option value="crypto">Crypto Heatmap</option>
          <option value="indices">Index Heatmap</option>
          <option value="metals">Metals Heatmap</option>
        </select>
      </div>

      <div style={gridWrap}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
            No instruments available in this group.
          </div>
        ) : (
          <div style={gridStyle}>
            {filteredItems.map(({ inst, livePrice, pctChange }) => {
              const isSelected = selected?.symbol === inst.symbol;
              const textColor = Math.abs(pctChange) > 0.8 ? '#000000' : 'var(--text-primary)';
              const subTextColor = Math.abs(pctChange) > 0.8 ? 'rgba(0,0,0,0.6)' : 'var(--text-secondary)';

              return (
                <div
                  key={inst.symbol}
                  onClick={() => setSelected(inst)}
                  style={cardStyle(pctChange, isSelected)}
                  className="heatmap-card"
                  title={`${inst.name || inst.symbol} - ${inst.category?.toUpperCase()}`}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{inst.symbol}</span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: textColor, margin: '2px 0' }}>
                    {formatPrice(livePrice, inst.symbol, inst.category)}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: pctChange >= 0 ? (Math.abs(pctChange) > 0.8 ? '#064e3b' : 'var(--success)') : (Math.abs(pctChange) > 0.8 ? '#7f1d1d' : 'var(--danger)') }}>
                    {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatmapPanel;
