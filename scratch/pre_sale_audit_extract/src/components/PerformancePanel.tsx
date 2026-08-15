import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';

const containerStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '16px',
};

const chartBox: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  padding: '16px',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  minHeight: '220px',
};

const PerformancePanel: React.FC = () => {
  const history = useAppStore((s) => s.history);

  // Chronological order: oldest first
  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [history]);

  const balancePoints = useMemo(() => {
    const points = [10000];
    let current = 10000;
    sortedHistory.forEach((t) => {
      current += t.pnl;
      points.push(current);
    });
    return points;
  }, [sortedHistory]);

  const minMax = useMemo(() => {
    if (balancePoints.length === 0) return { min: 9000, max: 11000 };
    const min = Math.min(...balancePoints);
    const max = Math.max(...balancePoints);
    const padding = (max - min) * 0.1 || 500;
    return {
      min: min - padding,
      max: max + padding,
    };
  }, [balancePoints]);

  const svgDimensions = { width: 800, height: 260 };

  const svgPath = useMemo(() => {
    if (balancePoints.length < 2) return '';
    const { width, height } = svgDimensions;
    const { min, max } = minMax;
    const range = max - min || 1;

    const xStep = width / (balancePoints.length - 1);
    
    return balancePoints
      .map((val, idx) => {
        const x = idx * xStep;
        const y = height - ((val - min) / range) * height;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [balancePoints, minMax]);

  const svgAreaPath = useMemo(() => {
    if (balancePoints.length < 2) return '';
    const { width, height } = svgDimensions;
    const path = svgPath;
    return `${path} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;
  }, [balancePoints, svgPath]);

  const finalBalance = balancePoints[balancePoints.length - 1] || 10000;
  const totalGain = finalBalance - 10000;
  const pctGain = (totalGain / 10000) * 100;

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Initial Balance</span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>$10,000.00</span>
        </div>
        <div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Current Balance</span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            ${finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Performance</span>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: totalGain >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({totalGain >= 0 ? '+' : ''}{pctGain.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div style={chartBox}>
        {balancePoints.length < 2 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
            Not enough trade history to draw equity curve. Place some trades first.
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <svg
              viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              style={{ display: 'block' }}
            >
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.00" />
                </linearGradient>
              </defs>
              {/* Background grid */}
              <line x1="0" y1="65" x2="800" y2="65" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="0" y1="130" x2="800" y2="130" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4,4" />
              <line x1="0" y1="195" x2="800" y2="195" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4,4" />

              {/* Area under curve */}
              <path d={svgAreaPath} fill="url(#equityGrad)" />

              {/* Line path */}
              <path d={svgPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformancePanel;
