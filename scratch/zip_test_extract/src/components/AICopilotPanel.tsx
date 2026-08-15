// src/components/AICopilotPanel.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketPriceStore } from '../store/marketPriceStore';

interface AnalysisData {
  trend: 'Bullish' | 'Bearish' | 'Neutral';
  momentum: 'Strong' | 'Weak' | 'Flat';
  volatility: 'High' | 'Medium' | 'Low';
  marketStructure: 'Higher Highs / Higher Lows' | 'Lower Highs / Lower Lows' | 'Ranging';
  support: number;
  resistance: number;
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
  probability: number;
}

const AICopilotPanel: React.FC = () => {
  const selected = useAppStore((s) => s.selectedInstrument);
  const prices = useMarketPriceStore((s) => s.prices);
  
  const [activeTab, setActiveTab] = useState<'long' | 'short' | 'range' | 'notrade'>('long');
  const [analyzing, setAnalyzing] = useState(false);
  const [tick, setTick] = useState(0);

  const livePrice = useMemo(() => {
    if (!selected) return 100;
    return prices[selected.symbol]?.price ?? selected.price ?? 100;
  }, [selected, prices]);

  // Trigger analysis recalculation simulation when selected symbol changes
  useEffect(() => {
    setAnalyzing(true);
    const timer = setTimeout(() => {
      setAnalyzing(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [selected]);

  const analysis: AnalysisData = useMemo(() => {
    const seed = Math.floor(livePrice * 100) + tick;
    const isGoldOrBtc = selected?.symbol.includes('BTC') || selected?.symbol.includes('XAU');
    
    // Support and resistance steps based on price level
    const step = livePrice * 0.015;
    const support = parseFloat((livePrice - (step * (1 + (seed % 3) * 0.1))).toFixed(2));
    const resistance = parseFloat((livePrice + (step * (1 + (seed % 4) * 0.1))).toFixed(2));

    const trend = seed % 3 === 0 ? 'Bullish' : seed % 3 === 1 ? 'Bearish' : 'Neutral';
    const momentum = seed % 2 === 0 ? 'Strong' : 'Weak';
    const volatility = isGoldOrBtc ? 'High' : 'Medium';
    const marketStructure = trend === 'Bullish' 
      ? 'Higher Highs / Higher Lows' 
      : trend === 'Bearish' 
        ? 'Lower Highs / Lower Lows' 
        : 'Ranging';

    const riskLevel = volatility === 'High' ? 'Aggressive' : 'Moderate';
    const probability = 62 + (seed % 28);

    return {
      trend,
      momentum,
      volatility,
      marketStructure,
      support,
      resistance,
      riskLevel,
      probability,
    };
  }, [livePrice, selected, tick]);

  const getBadgeColor = (val: string) => {
    if (val === 'Bullish' || val === 'Strong' || val === 'Conservative') return '#00c076';
    if (val === 'Bearish' || val === 'Aggressive') return '#ff4d57';
    return '#ea7317';
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '15px', color: '#f5f5f7' }}>AI Market Copilot</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>
            Real-time Technical Copilot Analysis for {selected?.symbol ?? 'BTCUSD'}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '10px', color: '#00c076', background: 'rgba(0,192,118,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
            Probability: {analysis.probability}%
          </span>
        </div>
      </div>

      {/* Main Grid: Info columns + Scenarios */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left column: Metrics dashboard */}
        <div style={{
          width: '240px',
          background: '#070b14',
          border: '1px solid #1b2235',
          borderRadius: '4px',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Copilot Indicators
          </span>

          {analyzing ? (
            <div style={{ padding: '16px', textTransform: 'uppercase', color: '#8e8e93', fontSize: '10px', textAlign: 'center' }}>
              Running Analysis...
            </div>
          ) : (
            <>
              {/* Trend */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
                <span style={{ color: '#8e8e93' }}>Market Trend</span>
                <strong style={{ color: getBadgeColor(analysis.trend) }}>{analysis.trend}</strong>
              </div>

              {/* Momentum */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
                <span style={{ color: '#8e8e93' }}>Momentum Strength</span>
                <strong style={{ color: getBadgeColor(analysis.momentum) }}>{analysis.momentum}</strong>
              </div>

              {/* Volatility */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
                <span style={{ color: '#8e8e93' }}>Volatility</span>
                <strong style={{ color: '#f5f5f7' }}>{analysis.volatility}</strong>
              </div>

              {/* Structure */}
              <div style={{ display: 'flex', flexDirection: 'column', fontSize: '11px', borderBottom: '1px solid #1b2235', paddingBottom: '4px', gap: '2px' }}>
                <span style={{ color: '#8e8e93' }}>Market Structure</span>
                <strong style={{ color: '#ffffff' }}>{analysis.marketStructure}</strong>
              </div>

              {/* S/R levels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
                <span style={{ color: '#8e8e93' }}>Support (Key S1)</span>
                <strong style={{ color: '#00c076', fontFamily: 'var(--font-mono)' }}>${analysis.support.toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
                <span style={{ color: '#8e8e93' }}>Resistance (Key R1)</span>
                <strong style={{ color: '#ff4d57', fontFamily: 'var(--font-mono)' }}>${analysis.resistance.toLocaleString()}</strong>
              </div>

              {/* Risk level */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: '#8e8e93' }}>Recommended Risk</span>
                <strong style={{ color: getBadgeColor(analysis.riskLevel) }}>{analysis.riskLevel}</strong>
              </div>
            </>
          )}

          {/* Warning disclaimer */}
          <div style={{
            marginTop: 'auto',
            background: 'rgba(234,115,23,0.06)',
            border: '1px solid rgba(234,115,23,0.15)',
            borderRadius: '3px',
            padding: '6px',
            fontSize: '8px',
            color: '#ea7317',
            lineHeight: '1.2'
          }}>
            <strong>DISCLAIMER:</strong> Auto-trading is disabled; Copilot scenarios are educational. Placing trades must be done manually via the Order Panel.
          </div>
        </div>

        {/* Right column: Scenario view */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1b2235', background: '#0d1322' }}>
            {(['long', 'short', 'range', 'notrade'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid #d4af37' : '2px solid transparent',
                  padding: '8px 16px',
                  color: activeTab === tab ? '#d4af37' : '#8e8e93',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab === 'notrade' ? 'No-Trade Scenario' : `${tab} Playbook`}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', lineHeight: '1.4' }}>
            {activeTab === 'long' && (
              <>
                <h4 style={{ margin: 0, color: '#00c076', fontSize: '13px' }}>Bullish Scenario: Buy Breakout above resistance</h4>
                <div style={{ color: '#f5f5f7' }}>
                  <strong>Trigger Level:</strong> Open buy orders if price closes above resistance line at <strong>${analysis.resistance}</strong> with high relative volume.
                </div>
                <div style={{ color: '#8e8e93' }}>
                  <strong>Invalidation SL:</strong> Below the key support pivot level of <strong>${analysis.support}</strong>.
                </div>
                <div style={{ borderTop: '1px solid #1b2235', paddingTop: '6px', color: '#8e8e93', fontSize: '11px' }}>
                  <strong>Copilot Reasoning:</strong> Market structure displays higher highs, and RSI sits comfortably at 55, indicating strong room to run before overbought territory. Momentum is accelerating. Target profit levels are projected near next major resistance zone.
                </div>
              </>
            )}

            {activeTab === 'short' && (
              <>
                <h4 style={{ margin: 0, color: '#ff4d57', fontSize: '13px' }}>Bearish Scenario: Rejection at Resistance Zone</h4>
                <div style={{ color: '#f5f5f7' }}>
                  <strong>Trigger Level:</strong> Look to open sell positions near resistance level of <strong>${analysis.resistance}</strong> on a clear candlestick rejection pattern (e.g. Shooting Star or Bearish Engulfing).
                </div>
                <div style={{ color: '#8e8e93' }}>
                  <strong>Invalidation SL:</strong> Stop Loss should be set above <strong>${(analysis.resistance * 1.008).toFixed(2)}</strong>.
                </div>
                <div style={{ borderTop: '1px solid #1b2235', paddingTop: '6px', color: '#8e8e93', fontSize: '11px' }}>
                  <strong>Copilot Reasoning:</strong> Despite overall neutral bias, volatility suggests sharp reversals at structural boundaries. Selling near the highs provides excellent risk-to-reward ratio opportunity ({'>'} 2.0).
                </div>
              </>
            )}

            {activeTab === 'range' && (
              <>
                <h4 style={{ margin: 0, color: '#ea7317', fontSize: '13px' }}>Ranging Playbook: Boundary Trading</h4>
                <div style={{ color: '#f5f5f7' }}>
                  <strong>Strategy:</strong> Buy near support at <strong>${analysis.support}</strong> and sell near resistance at <strong>${analysis.resistance}</strong>.
                </div>
                <div style={{ color: '#8e8e93' }}>
                  <strong>Target TP:</strong> Centered midpoint price of <strong>${((analysis.support + analysis.resistance) / 2).toFixed(2)}</strong>.
                </div>
                <div style={{ borderTop: '1px solid #1b2235', paddingTop: '6px', color: '#8e8e93', fontSize: '11px' }}>
                  <strong>Copilot Reasoning:</strong> Low volatility environment coupled with flat moving averages confirms standard sideways consolidation phase. Avoid breakout chases during range-bound conditions.
                </div>
              </>
            )}

            {activeTab === 'notrade' && (
              <>
                <h4 style={{ margin: 0, color: '#8e8e93', fontSize: '13px' }}>No-Trade Strategy: Stand Aside and Preserve Capital</h4>
                <div style={{ color: '#f5f5f7' }}>
                  <strong>Action:</strong> No active positions. Stand aside and wait for clear structural breakouts.
                </div>
                <div style={{ borderTop: '1px solid #1b2235', paddingTop: '6px', color: '#8e8e93', fontSize: '11px' }}>
                  <strong>Copilot Reasoning:</strong> High volatility news events or indecisive chop make this a low-probability trade environment. Stand aside to keep drawdown to 0. Capital preservation is the highest priority.
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default AICopilotPanel;
