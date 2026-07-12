// src/components/MLAnalyticsPanel.tsx
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface FeatureImportance {
  feature: string;
  weight: number;
  description: string;
}

const FEATURE_IMPORTANCES: FeatureImportance[] = [
  { feature: 'EMA_Cross_Spread', weight: 34.2, description: 'Relative distance between fast/slow EMAs' },
  { feature: 'RSI_14_Zone', weight: 24.8, description: 'Overbought / oversold boundary distance' },
  { feature: 'ATR_Volatility_Ratio', weight: 18.5, description: 'Current volatility vs 50-period average' },
  { feature: 'Session_Hour', weight: 14.1, description: 'Trading session execution hour (NY, LDN, ASIA)' },
  { feature: 'Volume_Imbalance_5m', weight: 8.4, description: 'Order book bid/ask volume imbalance ratio' }
];

const MLAnalyticsPanel: React.FC = () => {
  const selected = useAppStore((state) => state.selectedInstrument);
  const [runningModel, setRunningModel] = useState(false);
  const [confidence, setConfidence] = useState(84);
  const addToast = useAppStore((state) => state.addToast);

  const handleRetrain = () => {
    setRunningModel(true);
    setTimeout(() => {
      setRunningModel(false);
      setConfidence(81 + Math.floor(Math.random() * 15));
      addToast('success', 'Machine Learning model successfully retrained on recent trade cluster data.');
    }, 1200);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Machine Learning Analytics</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Market regime classification, trade clustering, and predictive feature importance</span>
        </div>
        <button
          onClick={handleRetrain}
          disabled={runningModel}
          style={{
            background: '#d4af37',
            color: '#070b14',
            fontSize: '9px',
            fontWeight: 700,
            border: 'none',
            padding: '4px 10px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          {runningModel ? 'RETRAINING...' : 'RETRAIN MODEL'}
        </button>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left column: Regimes & Clusters */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Regime Classification Card */}
          <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
              Current Market Regime Classification
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#ff4d57', textTransform: 'uppercase' }}>
                  High-Volatility Bearish Trend
                </strong>
                <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93', marginTop: '2px' }}>
                  Regime Stability: 92% (Persistent)
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#00c076', fontFamily: 'var(--font-mono)' }}>
                  Confidence: {confidence}%
                </span>
              </div>
            </div>
            {/* Visual classification timeline */}
            <div style={{ display: 'flex', gap: '2px', height: '14px', marginTop: '4px', background: '#0d1322', borderRadius: '2px', overflow: 'hidden', padding: '2px' }}>
              <div style={{ flex: 3, background: '#ff4d57', opacity: 0.8 }} title="High Vol Bearish" />
              <div style={{ flex: 1, background: '#ea7317', opacity: 0.8 }} title="Sideways Range" />
              <div style={{ flex: 2, background: '#00c076', opacity: 0.8 }} title="Low Vol Bullish" />
              <div style={{ flex: 4, background: '#ff4d57', opacity: 0.95 }} title="High Vol Bearish (Current)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#8e8e93' }}>
              <span>24 Hours Ago</span>
              <span>Current</span>
            </div>
          </div>

          {/* Trade Clustering Card */}
          <div style={{ flex: 1, background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              Trade Clustering &amp; Setups
            </span>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              
              {/* Cluster 1 */}
              <div style={{ borderLeft: '3px solid #ff4d57', paddingLeft: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '11px', color: '#f5f5f7' }}>Cluster 1: High-Vol Breakout Chasing</strong>
                  <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Triggers: NFP news spikes, breakout traps</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '10px' }}>
                  <span style={{ color: '#ff4d57', fontWeight: 700 }}>Win Rate: 34%</span>
                  <span style={{ display: 'block', fontSize: '8px', color: '#8e8e93' }}>Drawdown: -14.2%</span>
                </div>
              </div>

              {/* Cluster 2 */}
              <div style={{ borderLeft: '3px solid #00c076', paddingLeft: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '11px', color: '#f5f5f7' }}>Cluster 2: Mean-Reversion Range Trades</strong>
                  <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Triggers: Overbought/oversold boundaries</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '10px' }}>
                  <span style={{ color: '#00c076', fontWeight: 700 }}>Win Rate: 68%</span>
                  <span style={{ display: 'block', fontSize: '8px', color: '#8e8e93' }}>Drawdown: -2.8%</span>
                </div>
              </div>

              {/* Cluster 3 */}
              <div style={{ borderLeft: '3px solid #ea7317', paddingLeft: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '11px', color: '#f5f5f7' }}>Cluster 3: Session Open Spikes</strong>
                  <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Triggers: London / New York Open hours</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: '10px' }}>
                  <span style={{ color: '#ea7317', fontWeight: 700 }}>Win Rate: 51%</span>
                  <span style={{ display: 'block', fontSize: '8px', color: '#8e8e93' }}>Drawdown: -5.4%</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right column: Feature Importance */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', gap: '6px', overflowY: 'auto' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            ML Model Feature Importance
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {FEATURE_IMPORTANCES.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                  <span style={{ color: '#f5f5f7' }}>{item.feature}</span>
                  <span style={{ color: '#d4af37', fontFamily: 'var(--font-mono)' }}>{item.weight}%</span>
                </div>
                <div style={{ height: '5px', width: '100%', background: '#0d1322', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.weight}%`, background: '#d4af37' }} />
                </div>
                <span style={{ fontSize: '8px', color: '#8e8e93' }}>{item.description}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default MLAnalyticsPanel;
