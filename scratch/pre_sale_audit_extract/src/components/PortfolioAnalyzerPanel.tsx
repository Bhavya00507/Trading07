// src/components/PortfolioAnalyzerPanel.tsx
import React, { useMemo } from 'react';
import { usePositionStore } from '../store/positionStore';
import { useMarketStore } from '../store/marketStore';

const panelStyle: React.CSSProperties = {
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '12px',
  overflowY: 'auto',
  backgroundColor: '#070b14',
  color: '#e0e0e0',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#0d1322',
  border: '1px solid #1b2235',
  borderRadius: '6px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#8e8e93',
  letterSpacing: '0.06em',
  borderBottom: '1px solid #1b2235',
  paddingBottom: '4px',
};

const gridStyle = (cols: string): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  gap: '12px',
});

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#8e8e93',
};

const valStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: '#ffffff',
};

const PortfolioAnalyzerPanel: React.FC = () => {
  const positions = usePositionStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);

  const activePositions = useMemo(() => positions.filter((p) => p.quantity !== 0), [positions]);

  const analytics = useMemo(() => {
    let longExp = 0;
    let shortExp = 0;
    const catExp: Record<string, number> = { crypto: 0, forex: 0, indices: 0, metals: 0 };
    const symExp: Record<string, number> = {};

    activePositions.forEach((p) => {
      const livePrice = prices[p.symbol]?.price ?? p.average_price;
      const value = Math.abs(p.quantity) * livePrice;
      if (p.quantity > 0) {
        longExp += value;
      } else {
        shortExp += value;
      }

      // Categorize
      const sym = p.symbol.toUpperCase();
      let cat = 'forex';
      if (sym.includes('USDJPY') || sym.includes('EURUSD') || sym.includes('GBPUSD')) cat = 'forex';
      else if (sym.includes('BTC') || sym.includes('ETH')) cat = 'crypto';
      else if (sym.includes('US30') || sym.includes('NAS100') || sym.includes('GER40')) cat = 'indices';
      else if (sym.includes('XAU') || sym.includes('XAG')) cat = 'metals';

      catExp[cat] += value;
      symExp[p.symbol] = value;
    });

    const netExp = longExp - shortExp;
    const grossExp = longExp + shortExp;

    // Calculate diversification score
    // Max diversification is achieved when exposure is evenly spread across 4 categories
    const categories = Object.values(catExp);
    const totalCatExp = categories.reduce((a, b) => a + b, 0) || 1;
    let entropy = 0;
    categories.forEach((exp) => {
      const p = exp / totalCatExp;
      if (p > 0) entropy -= p * Math.log2(p);
    });
    // Max entropy for 4 items is log2(4) = 2
    const divScore = Math.round((entropy / 2) * 100);

    // Correlation Risk index: 0 (low) to 100 (high)
    // High correlation risk if net exposure is close to gross exposure (i.e. highly directional)
    const correlationRisk = grossExp > 0 ? Math.round((Math.abs(netExp) / grossExp) * 100) : 0;

    return {
      longExp,
      shortExp,
      netExp,
      grossExp,
      catExp,
      symExp,
      divScore,
      correlationRisk,
    };
  }, [activePositions, prices]);

  const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={panelStyle}>
      <div style={gridStyle('repeat(auto-fit, minmax(240px, 1fr))')}>
        {/* Core Exposures */}
        <div style={cardStyle}>
          <span style={titleStyle}>Exposure Summary</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={labelStyle}>Gross Exposure</span>
            <span style={valStyle}>${fmt(analytics.grossExp)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={labelStyle}>Net Exposure</span>
            <span style={{ ...valStyle, color: analytics.netExp >= 0 ? '#00c076' : '#ff4d57' }}>
              {analytics.netExp >= 0 ? '+' : ''}${fmt(analytics.netExp)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={labelStyle}>Long Exposure</span>
            <span style={{ ...valStyle, color: '#00c076' }}>${fmt(analytics.longExp)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={labelStyle}>Short Exposure</span>
            <span style={{ ...valStyle, color: '#ff4d57' }}>${fmt(analytics.shortExp)}</span>
          </div>
        </div>

        {/* Risk Metrics */}
        <div style={cardStyle}>
          <span style={titleStyle}>Portfolio Risk Analysis</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={labelStyle}>Diversification Score</span>
            <span style={{ ...valStyle, color: analytics.divScore >= 70 ? '#00c076' : analytics.divScore >= 40 ? '#dfa010' : '#ff4d57' }}>
              {analytics.divScore}/100
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={labelStyle}>Correlation Risk</span>
            <span style={{ ...valStyle, color: analytics.correlationRisk <= 30 ? '#00c076' : analytics.correlationRisk <= 70 ? '#dfa010' : '#ff4d57' }}>
              {analytics.correlationRisk}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={labelStyle}>Leverage Exposure</span>
            <span style={valStyle}>{(analytics.grossExp / 10000.0).toFixed(2)}x</span>
          </div>
        </div>
      </div>

      <div style={gridStyle('repeat(auto-fit, minmax(320px, 1fr))')}>
        {/* Treemap representation */}
        <div style={cardStyle}>
          <span style={titleStyle}>Asset Treemap</span>
          <div style={{ display: 'flex', height: '140px', background: '#070b14', borderRadius: '4px', overflow: 'hidden', padding: '4px' }}>
            {analytics.grossExp === 0 ? (
              <span style={{ margin: 'auto', color: '#8e8e93', fontSize: '11px' }}>No active exposures</span>
            ) : (
              <div style={{ display: 'flex', width: '100%', height: '100%', gap: '4px' }}>
                {Object.entries(analytics.catExp).map(([cat, val]) => {
                  if (val === 0) return null;
                  const widthPct = (val / analytics.grossExp) * 100;
                  return (
                    <div
                      key={cat}
                      style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        backgroundColor: '#1b2235',
                        border: '1px solid #2c354d',
                        borderRadius: '3px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <span>{cat}</span>
                      <span style={{ fontSize: '9px', fontWeight: 600, color: '#8e8e93', fontFamily: 'monospace', marginTop: '2px' }}>
                        {widthPct.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Stacked asset exposure */}
        <div style={cardStyle}>
          <span style={titleStyle}>Stacked Asset Exposure</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
            {Object.entries(analytics.catExp).map(([cat, val]) => {
              const maxVal = Math.max(...Object.values(analytics.catExp)) || 1;
              const fillPct = Math.min(100, (val / maxVal) * 100);
              return (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', textTransform: 'capitalize' }}>
                    <span>{cat}</span>
                    <span style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'monospace' }}>
                      ${val.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: '6px', background: '#1b2235', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${fillPct}%`, background: '#d4af37', borderRadius: '3px' }} />
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

export default PortfolioAnalyzerPanel;
