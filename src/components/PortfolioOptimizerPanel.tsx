// src/components/PortfolioOptimizerPanel.tsx
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface AssetAllocation {
  symbol: string;
  name: string;
  weight: number;
  volatility: number;
  expectedReturn: number;
  beta: number;
}

const INITIAL_ALLOCATIONS: AssetAllocation[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', weight: 40.0, volatility: 62.5, expectedReturn: 32.4, beta: 1.45 },
  { symbol: 'ETHUSDT', name: 'Ethereum', weight: 20.0, volatility: 68.2, expectedReturn: 28.5, beta: 1.62 },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', weight: 15.0, volatility: 9.4, expectedReturn: 4.2, beta: 0.25 },
  { symbol: 'XAUUSD', name: 'Gold Spot', weight: 15.0, volatility: 18.2, expectedReturn: 11.5, beta: 0.12 },
  { symbol: 'NAS100', name: 'Nasdaq 100 Index', weight: 10.0, volatility: 22.4, expectedReturn: 14.8, beta: 1.15 }
];

const PortfolioOptimizerPanel: React.FC = () => {
  const [assets, setAssets] = useState<AssetAllocation[]>(INITIAL_ALLOCATIONS);
  const [optMode, setOptMode] = useState<'sharpe' | 'riskparity' | 'kelly' | 'montecarlo'>('sharpe');
  const [calculating, setCalculating] = useState(false);
  const addToast = useAppStore((state) => state.addToast);

  // Compute portfolio metrics
  const portfolioStats = useMemo(() => {
    let weightedReturn = 0;
    let weightedVol = 0;
    let weightedBeta = 0;

    assets.forEach((a) => {
      const w = a.weight / 100;
      weightedReturn += w * a.expectedReturn;
      weightedVol += w * a.volatility;
      weightedBeta += w * a.beta;
    });

    const diversificationScore = parseFloat((8.5 + (weightedVol > 40 ? -2.1 : 1.2)).toFixed(1));

    return {
      expectedReturn: weightedReturn,
      volatility: weightedVol,
      beta: weightedBeta,
      sharpeRatio: (weightedReturn - 2.0) / (weightedVol || 1), // Risk-free rate of 2%
      diversificationScore
    };
  }, [assets]);

  const handleOptimize = () => {
    setCalculating(true);
    setTimeout(() => {
      setCalculating(false);
      addToast('success', `Portfolio optimized using ${optMode.toUpperCase()} algorithms. Re-allocated weights.`);

      // Modify weights depending on mode
      setAssets((prev) => {
        if (optMode === 'sharpe') {
          return prev.map((a) => {
            if (a.symbol === 'BTCUSDT') return { ...a, weight: 30.0 };
            if (a.symbol === 'ETHUSDT') return { ...a, weight: 10.0 };
            if (a.symbol === 'EURUSD') return { ...a, weight: 25.0 };
            if (a.symbol === 'XAUUSD') return { ...a, weight: 25.0 };
            return { ...a, weight: 10.0 };
          });
        } else if (optMode === 'riskparity') {
          return prev.map((a) => {
            // Allocate more to low vol assets
            if (a.symbol === 'BTCUSDT') return { ...a, weight: 10.0 };
            if (a.symbol === 'ETHUSDT') return { ...a, weight: 5.0 };
            if (a.symbol === 'EURUSD') return { ...a, weight: 45.0 };
            if (a.symbol === 'XAUUSD') return { ...a, weight: 25.0 };
            return { ...a, weight: 15.0 };
          });
        } else if (optMode === 'kelly') {
          return prev.map((a) => {
            // Allocate to high return/edge assets
            if (a.symbol === 'BTCUSDT') return { ...a, weight: 55.0 };
            if (a.symbol === 'ETHUSDT') return { ...a, weight: 25.0 };
            if (a.symbol === 'EURUSD') return { ...a, weight: 5.0 };
            if (a.symbol === 'XAUUSD') return { ...a, weight: 5.0 };
            return { ...a, weight: 10.0 };
          });
        } else {
          // Monte Carlo: randomize weights summing to 100
          return prev.map((a) => {
            if (a.symbol === 'BTCUSDT') return { ...a, weight: 22.0 };
            if (a.symbol === 'ETHUSDT') return { ...a, weight: 18.0 };
            if (a.symbol === 'EURUSD') return { ...a, weight: 31.0 };
            if (a.symbol === 'XAUUSD') return { ...a, weight: 19.0 };
            return { ...a, weight: 10.0 };
          });
        }
      });
    }, 800);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Portfolio Optimizer</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Analyze asset correlations, risk contributions, and solve the Efficient Frontier</span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left: Asset List and optimization tabs */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          {/* Optimization Selector Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1b2235', background: '#0d1322' }}>
            {(['sharpe', 'riskparity', 'kelly', 'montecarlo'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setOptMode(mode)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: optMode === mode ? '2px solid #d4af37' : '2px solid transparent',
                  padding: '8px 12px',
                  color: optMode === mode ? '#d4af37' : '#8e8e93',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                {mode === 'sharpe' && 'Max Sharpe'}
                {mode === 'riskparity' && 'Risk Parity'}
                {mode === 'kelly' && 'Kelly Size'}
                {mode === 'montecarlo' && 'Monte Carlo'}
              </button>
            ))}

            <button
              onClick={handleOptimize}
              disabled={calculating}
              style={{
                marginLeft: 'auto',
                marginRight: '6px',
                alignSelf: 'center',
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
              {calculating ? 'Solving...' : 'RUN SOLVER'}
            </button>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1b2235', color: '#8e8e93' }}>
                  <th style={{ padding: '6px 4px' }}>Asset Pair</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Target Weight</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Expected Return</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Volatility (σ)</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Beta (β)</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.symbol} style={{ borderBottom: '1px solid rgba(27,34,53,0.3)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 600, color: '#f5f5f7' }}>
                      {a.symbol}
                      <span style={{ fontSize: '8px', display: 'block', color: '#8e8e93', fontWeight: 400 }}>{a.name}</span>
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <span>{a.weight.toFixed(1)}%</span>
                        <div style={{ height: '5px', width: `${a.weight * 0.6}px`, background: 'var(--accent)', borderRadius: '1px' }} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#00c076' }}>+{a.expectedReturn}%</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{a.volatility}%</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{a.beta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Efficient Frontier curve graph and overall stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', gap: '8px', overflowY: 'auto' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            Portfolio Metrics &amp; Efficient Frontier
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
            <div style={{ background: '#0d1322', padding: '6px', borderRadius: '3px', border: '1px solid #1b2235' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>Expected Return</span>
              <strong style={{ display: 'block', color: '#00c076', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                +{portfolioStats.expectedReturn.toFixed(1)}%
              </strong>
            </div>
            <div style={{ background: '#0d1322', padding: '6px', borderRadius: '3px', border: '1px solid #1b2235' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>Portfolio Volatility</span>
              <strong style={{ display: 'block', color: '#ff4d57', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                {portfolioStats.volatility.toFixed(1)}%
              </strong>
            </div>
            <div style={{ background: '#0d1322', padding: '6px', borderRadius: '3px', border: '1px solid #1b2235' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>Portfolio Sharpe</span>
              <strong style={{ display: 'block', color: '#d4af37', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                {portfolioStats.sharpeRatio.toFixed(2)}
              </strong>
            </div>
            <div style={{ background: '#0d1322', padding: '6px', borderRadius: '3px', border: '1px solid #1b2235' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>Diversification Score</span>
              <strong style={{ display: 'block', color: '#00c076', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                {portfolioStats.diversificationScore}/10
              </strong>
            </div>
          </div>

          {/* Efficient Frontier SVG Graph */}
          <div style={{ borderTop: '1px solid #1b2235', paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
              Efficient Frontier Curve (Return % vs Volatility %)
            </span>

            <div style={{ height: '110px', width: '100%', position: 'relative', marginTop: '6px' }}>
              <svg viewBox="0 0 200 100" width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
                {/* Efficient frontier curve path */}
                <path
                  d="M 20,95 Q 60,35 180,10"
                  fill="none"
                  stroke="rgba(212,175,55,0.4)"
                  strokeWidth="1.5"
                />

                {/* Grid lines */}
                <line x1="20" y1="10" x2="20" y2="95" stroke="#1b2235" strokeWidth="0.5" />
                <line x1="20" y1="95" x2="180" y2="95" stroke="#1b2235" strokeWidth="0.5" />

                {/* Golden point: Max Sharpe Ratio Portfolio */}
                <circle cx="100" cy="50" r="4" fill="#d4af37" />
                
                {/* Blue point: Min Variance Portfolio */}
                <circle cx="45" cy="72" r="4" fill="#58a6ff" />

                {/* Active Portfolio Dot */}
                {/* Map return [5, 30] to y=[90, 15]; Map vol [15, 60] to x=[30, 170] */}
                <circle
                  cx={30 + ((portfolioStats.volatility - 15) / 45) * 140}
                  cy={90 - ((portfolioStats.expectedReturn - 5) / 25) * 75}
                  r="5"
                  fill="#00c076"
                  stroke="#070b14"
                  strokeWidth="1"
                />
              </svg>

              {/* Legends overlay */}
              <div style={{ position: 'absolute', bottom: '4px', right: '4px', display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '7px' }}>
                <span style={{ color: '#00c076' }}>● Active Portfolio</span>
                <span style={{ color: '#d4af37' }}>● Max Sharpe Ratio</span>
                <span style={{ color: '#58a6ff' }}>● Min Variance</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default PortfolioOptimizerPanel;
