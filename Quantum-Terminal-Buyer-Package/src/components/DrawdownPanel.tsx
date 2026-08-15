import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { usePositionStore } from '../store/positionStore';
import { useMarketStore } from '../store/marketStore';

const containerStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '16px',
  overflowY: 'auto',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--accent)',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '6px',
  letterSpacing: '0.04em',
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-primary)',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const fmt = (val: number) =>
  val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DrawdownPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const positions = usePositionStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [history]);

  // Reconstruct account equity/balance points and calculate drawdown at each step
  const drawdownData = useMemo(() => {
    const points: {
      time: string;
      timestamp: number;
      balance: number;
      drawdown: number;
      drawdownPct: number;
      peak: number;
    }[] = [];

    let currentBal = 10000;
    let peak = 10000;
    const startTime = sortedHistory.length > 0
      ? new Date(sortedHistory[0].timestamp).getTime() - 24 * 60 * 60 * 1000
      : Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Start point
    points.push({
      time: 'Start',
      timestamp: startTime,
      balance: currentBal,
      drawdown: 0,
      drawdownPct: 0,
      peak,
    });

    sortedHistory.forEach((t, idx) => {
      currentBal += t.pnl;
      peak = Math.max(peak, currentBal);
      const dd = peak - currentBal;
      const ddPct = (dd / peak) * 100;

      points.push({
        time: `Trade ${idx + 1}`,
        timestamp: new Date(t.timestamp).getTime(),
        balance: currentBal,
        drawdown: dd,
        drawdownPct: ddPct,
        peak,
      });
    });

    // Append active floating equity at the end
    const activePositions = positions.filter((p) => p.quantity !== 0);
    let floatingPnl = 0;
    activePositions.forEach((p) => {
      const livePrice = prices[p.symbol]?.price ?? p.average_price;
      const pnl = p.quantity > 0 
        ? (livePrice - p.average_price) * p.quantity
        : (p.average_price - livePrice) * Math.abs(p.quantity);
      floatingPnl += pnl;
    });

    const activeEquity = currentBal + floatingPnl;
    peak = Math.max(peak, activeEquity);
    const dd = peak - activeEquity;
    const ddPct = (dd / peak) * 100;

    points.push({
      time: 'Live',
      timestamp: Date.now(),
      balance: activeEquity,
      drawdown: dd,
      drawdownPct: ddPct,
      peak,
    });

    return points;
  }, [sortedHistory, positions, prices]);

  const metrics = useMemo(() => {
    if (drawdownData.length === 0) {
      return {
        currentDrawdown: 0,
        currentDrawdownPct: 0,
        maxDrawdown: 0,
        maxDrawdownPct: 0,
        avgDrawdownPct: 0,
        maxDurationStr: '0h',
        recoveryFactor: 0,
      };
    }

    const dds = drawdownData.map((d) => d.drawdown);
    const ddPcts = drawdownData.map((d) => d.drawdownPct);

    const currentDrawdown = dds[dds.length - 1];
    const currentDrawdownPct = ddPcts[ddPcts.length - 1];

    let maxDrawdown = 0;
    let maxDrawdownPct = 0;
    ddPcts.forEach((pct, i) => {
      if (pct > maxDrawdownPct) {
        maxDrawdownPct = pct;
        maxDrawdown = dds[i];
      }
    });

    const activeDds = ddPcts.filter((pct) => pct > 0);
    const avgDrawdownPct = activeDds.length > 0 
      ? activeDds.reduce((a, b) => a + b, 0) / activeDds.length 
      : 0;

    // Calculate drawdown durations
    let maxDurationMs = 0;
    let currentDdStart: number | null = null;

    drawdownData.forEach((p) => {
      if (p.balance < p.peak) {
        if (currentDdStart === null) {
          currentDdStart = p.timestamp;
        } else {
          const duration = p.timestamp - currentDdStart;
          if (duration > maxDurationMs) {
            maxDurationMs = duration;
          }
        }
      } else {
        currentDdStart = null;
      }
    });

    // Format duration
    let maxDurationStr = '0 trades';
    if (maxDurationMs > 0) {
      const hours = Math.floor(maxDurationMs / 3600000);
      const days = Math.floor(hours / 24);
      if (days > 0) {
        maxDurationStr = `${days}d ${hours % 24}h`;
      } else {
        maxDurationStr = `${hours}h`;
      }
    }

    // Recovery Factor: Net Profit / Max Drawdown in Dollars
    const endingBalance = drawdownData[drawdownData.length - 1]?.balance ?? 10000;
    const netProfit = endingBalance - 10000;
    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : netProfit > 0 ? 99.9 : 0;

    return {
      currentDrawdown,
      currentDrawdownPct,
      maxDrawdown,
      maxDrawdownPct,
      avgDrawdownPct,
      maxDurationStr,
      recoveryFactor,
    };
  }, [drawdownData]);

  // SVG Chart points
  const chartWidth = 800;
  const chartHeight = 200;

  const maxPct = Math.max(...drawdownData.map((d) => d.drawdownPct), 5); // display at least up to 5% range
  const chartRange = maxPct * 1.1;

  const getCoordinates = (pct: number, idx: number) => {
    const x = (idx / (drawdownData.length - 1)) * chartWidth;
    // Drawdown is plotted downwards: 0% is at y=0, maxPct is at y=chartHeight
    const y = (pct / chartRange) * chartHeight;
    return { x, y };
  };

  const areaPath = useMemo(() => {
    if (drawdownData.length < 2) return '';
    const pointsList = drawdownData.map((d, i) => {
      const { x, y } = getCoordinates(d.drawdownPct, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    // Complete the area by drawing to the bottom-right and bottom-left at y=0
    const firstX = getCoordinates(drawdownData[0].drawdownPct, 0).x;
    const lastX = getCoordinates(drawdownData[drawdownData.length - 1].drawdownPct, drawdownData.length - 1).x;
    return `M ${firstX.toFixed(1)},0 L ${pointsList.join(' L ')} L ${lastX.toFixed(1)},0 Z`;
  }, [drawdownData, chartRange]);

  const linePath = useMemo(() => {
    if (drawdownData.length < 2) return '';
    return drawdownData.map((d, i) => {
      const { x, y } = getCoordinates(d.drawdownPct, i);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [drawdownData, chartRange]);

  return (
    <div style={containerStyle}>
      {/* Metrics Row */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <span style={metricLabelStyle}>Current Drawdown</span>
          <div style={{ ...metricValueStyle, color: metrics.currentDrawdownPct > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {metrics.currentDrawdownPct > 0 ? `-${metrics.currentDrawdownPct.toFixed(2)}%` : '0.00%'}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            -${fmt(metrics.currentDrawdown)}
          </span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Max Drawdown</span>
          <div style={{ ...metricValueStyle, color: 'var(--danger)' }}>
            -{metrics.maxDrawdownPct.toFixed(2)}%
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            -${fmt(metrics.maxDrawdown)}
          </span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Average Drawdown</span>
          <div style={metricValueStyle}>
            -{metrics.avgDrawdownPct.toFixed(2)}%
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            when in drawdown
          </span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Recovery Factor</span>
          <div style={{ ...metricValueStyle, color: metrics.recoveryFactor >= 1.5 ? 'var(--success)' : 'var(--text-primary)' }}>
            {metrics.recoveryFactor.toFixed(2)}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Net Profit / Max DD
          </span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Max Drawdown Duration</span>
          <div style={metricValueStyle}>
            {metrics.maxDurationStr}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Time to recover peak
          </span>
        </div>
      </div>

      {/* Underwater Drawdown Chart */}
      <div style={cardStyle}>
        <span style={titleStyle}>Underwater Drawdown Chart (%)</span>

        <div style={{ height: 220, position: 'relative', width: '100%' }}>
          {drawdownData.length < 2 ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              No drawdown data to display.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              style={{ display: 'block' }}
              onMouseLeave={() => setHoverIndex(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const idx = Math.min(
                  drawdownData.length - 1,
                  Math.max(0, Math.floor((mouseX / rect.width) * drawdownData.length))
                );
                setHoverIndex(idx);
              }}
            >
              <defs>
                <linearGradient id="drawdownArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(234, 61, 92, 0.05)" />
                  <stop offset="100%" stopColor="rgba(234, 61, 92, 0.45)" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1={chartHeight / 4} x2={chartWidth} y2={chartHeight / 4} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
              <line x1="0" y1={(chartHeight * 3) / 4} x2={chartWidth} y2={(chartHeight * 3) / 4} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />

              {/* Underwater Area */}
              <path d={areaPath} fill="url(#drawdownArea)" />

              {/* Drawdown Line */}
              <path d={linePath} fill="none" stroke="var(--danger)" strokeWidth="1.5" />

              {/* Hover vertical bar */}
              {hoverIndex !== null && drawdownData[hoverIndex] && (
                <>
                  <line
                    x1={(hoverIndex / (drawdownData.length - 1)) * chartWidth}
                    y1="0"
                    x2={(hoverIndex / (drawdownData.length - 1)) * chartWidth}
                    y2={chartHeight}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={(hoverIndex / (drawdownData.length - 1)) * chartWidth}
                    cy={getCoordinates(drawdownData[hoverIndex].drawdownPct, hoverIndex).y}
                    r="4"
                    fill="var(--danger)"
                  />
                </>
              )}
            </svg>
          )}

          {/* Hover Tooltip Overlay */}
          {hoverIndex !== null && drawdownData[hoverIndex] && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(17,20,27,0.92)',
              border: '1px solid var(--border-color)',
              padding: '6px 10px',
              borderRadius: 4,
              fontSize: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 10
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>{drawdownData[hoverIndex].time}</span>
              <span>Drawdown: <strong style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>-{drawdownData[hoverIndex].drawdownPct.toFixed(2)}%</strong></span>
              <span>Value: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>-${fmt(drawdownData[hoverIndex].drawdown)}</strong></span>
              <span>Peak Balance: <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>${fmt(drawdownData[hoverIndex].peak)}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DrawdownPanel;
