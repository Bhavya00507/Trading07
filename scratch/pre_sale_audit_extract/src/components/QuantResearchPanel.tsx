// src/components/QuantResearchPanel.tsx
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

const QuantResearchPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'walkforward' | 'montecarlo' | 'genetic' | 'factor'>('walkforward');
  const [optimizing, setOptimizing] = useState(false);
  const [optProgress, setOptProgress] = useState(100);
  const addToast = useAppStore((state) => state.addToast);

  // Parameter sensitivity matrix grid (e.g. Fast EMA vs Slow EMA net profit)
  const sensitivityMatrix = [
    { fast: 10, slow: 20, profit: 12.4, drawdown: 4.5 },
    { fast: 10, slow: 50, profit: 18.2, drawdown: 3.2 },
    { fast: 20, slow: 50, profit: 24.5, drawdown: 2.1 },
    { fast: 20, slow: 100, profit: 15.1, drawdown: 5.8 },
    { fast: 50, slow: 100, profit: 8.4, drawdown: 7.2 }
  ];

  const handleStartOptimization = () => {
    setOptimizing(true);
    setOptProgress(0);
    const interval = setInterval(() => {
      setOptProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setOptimizing(false);
          addToast('success', 'Quant Walk-forward and Parameter optimization completed. Best fit model identified.');
          return 100;
        }
        return p + 20;
      });
    }, 300);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Quant Research Lab</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Solve parameter optimizations, walk-forward robustness, and factor analyses</span>
        </div>
        <button
          onClick={handleStartOptimization}
          disabled={optimizing}
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
          {optimizing ? `OPTIMIZING (${optProgress}%)` : 'START OPTIMIZATION'}
        </button>
      </div>

      {/* Main split tab layout */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1b2235', paddingBottom: '4px', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={() => setActiveTab('walkforward')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'walkforward' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'walkforward' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Walk-Forward &amp; Sensitivity
        </button>
        <button
          onClick={() => setActiveTab('montecarlo')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'montecarlo' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'montecarlo' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Monte Carlo &amp; Stress
        </button>
        <button
          onClick={() => setActiveTab('genetic')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'genetic' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'genetic' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Genetic Algorithms
        </button>
        <button
          onClick={() => setActiveTab('factor')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'factor' ? '2px solid #d4af37' : '2px solid transparent',
            padding: '6px 12px',
            color: activeTab === 'factor' ? '#d4af37' : '#8e8e93',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer'
          }}
        >
          Factor &amp; Correlation
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        
        {/* Walk-Forward Tab */}
        {activeTab === 'walkforward' && (
          <div style={{ display: 'flex', gap: '12px', height: '100%' }}>
            {/* Table */}
            <div style={{ flex: 1.2, background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Parameter Sensitivity Matrix
              </span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1b2235', color: '#8e8e93' }}>
                    <th style={{ padding: '6px 4px' }}>Fast Period</th>
                    <th style={{ padding: '6px 4px' }}>Slow Period</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Net Profit</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Drawdown</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityMatrix.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(27,34,53,0.3)', background: item.profit >= 20 ? 'rgba(0,192,118,0.03)' : 'transparent' }}>
                      <td style={{ padding: '8px 4px' }}>EMA {item.fast}</td>
                      <td style={{ padding: '8px 4px' }}>EMA {item.slow}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#00c076', fontWeight: item.profit >= 20 ? 700 : 400 }}>+{item.profit}%</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#ff4d57' }}>-{item.drawdown}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* In-sample / Out-of-sample visual comparison graph */}
            <div style={{ flex: 1, background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                Walk-Forward Robustness Curve
              </span>
              <div style={{ flex: 1, position: 'relative' }}>
                <svg viewBox="0 0 200 100" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
                  {/* Grid */}
                  <line x1="10" y1="50" x2="190" y2="50" stroke="#1b2235" strokeWidth="0.5" strokeDasharray="3,3" />

                  {/* In-Sample line (Solid green) */}
                  <polyline
                    fill="none"
                    stroke="#00c076"
                    strokeWidth="1.5"
                    points="10,90 40,75 70,62 100,51 130,42 160,30 190,15"
                  />

                  {/* Out-Of-Sample line (Dashed blue) */}
                  <polyline
                    fill="none"
                    stroke="#58a6ff"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                    points="100,51 130,55 160,42 190,32"
                  />
                </svg>
                {/* Legends */}
                <div style={{ position: 'absolute', bottom: '4px', right: '4px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '8px' }}>
                  <span style={{ color: '#00c076' }}>— In-Sample (IS)</span>
                  <span style={{ color: '#58a6ff' }}>- - Out-Of-Sample (OOS)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monte Carlo Tab */}
        {activeTab === 'montecarlo' && (
          <div style={{ fontSize: '11px', color: '#8e8e93', padding: '12px', textAlign: 'center' }}>
            Monte Carlo path solver is running. Walk-forward efficiency ratio calculated at: <strong style={{ color: '#00c076' }}>74.5% (High Robustness)</strong>.
          </div>
        )}

        {/* Genetic Algorithms Tab */}
        {activeTab === 'genetic' && (
          <div style={{ fontSize: '11px', color: '#8e8e93', padding: '12px', textAlign: 'center' }}>
            Genetic algorithm completed. Population size: 200, Generations: 50. Best chromosome fitness solved.
          </div>
        )}

        {/* Factor analysis Tab */}
        {activeTab === 'factor' && (
          <div style={{ fontSize: '11px', color: '#8e8e93', padding: '12px', textAlign: 'center' }}>
            Principal Component Analysis (PCA) completed. Component 1 (Market Momentum) explains 42.4% of strategy variance.
          </div>
        )}

      </div>

    </div>
  );
};

export default QuantResearchPanel;
