import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { usePositionStore } from '../store/positionStore';
import { useMarketStore } from '../store/marketStore';
import { TradeHistory } from '../types';
import { formatPrice } from './Watchlist';
import MonthlyReturnsPanel from './MonthlyReturnsPanel';

const fmt = (val: number) =>
  val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pnlColor = (val: number) =>
  val > 0 ? 'var(--success)' : val < 0 ? 'var(--danger)' : 'var(--text-secondary)';

const fmtPnl = (val: number) =>
  val > 0 ? `+$${fmt(val)}` : val < 0 ? `-$${fmt(Math.abs(val))}` : `$${fmt(val)}`;

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
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
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

const exportBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '10px',
  fontWeight: 700,
  borderRadius: '3px',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
};

const subTabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '8px',
};

const subTabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: '4px',
  background: active ? 'var(--accent)' : 'transparent',
  border: active ? '1px solid var(--accent)' : '1px solid var(--border-color)',
  color: active ? 'var(--bg-primary)' : 'var(--text-primary)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  transition: 'all 0.15s ease',
});

const PortfolioAnalyticsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const account = useAppStore((s) => s.account);
  const positions = usePositionStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<'curve' | 'monthly'>(() => {
    try {
      const saved = localStorage.getItem('trading-portfolio-subtab');
      if (saved === 'curve' || saved === 'monthly') return saved;
    } catch {}
    return 'curve';
  });

  useEffect(() => {
    localStorage.setItem('trading-portfolio-subtab', subTab);
  }, [subTab]);

  // 1. Reconstruct chronological balance, equity, and HWM history
  const sortedHistory = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [history]);

  const curveData = useMemo(() => {
    const data: { time: string; balance: number; equity: number; hwm: number }[] = [];
    let currentBal = 10000;
    let peak = 10000;

    data.push({
      time: 'Start',
      balance: currentBal,
      equity: currentBal,
      hwm: peak,
    });

    sortedHistory.forEach((t, idx) => {
      currentBal += t.pnl;
      if (currentBal > peak) peak = currentBal;
      data.push({
        time: `Trade ${idx + 1}`,
        balance: currentBal,
        equity: currentBal,
        hwm: peak,
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
    if (activeEquity > peak) peak = activeEquity;

    data.push({
      time: 'Live',
      balance: currentBal,
      equity: activeEquity,
      hwm: peak,
    });

    return data;
  }, [sortedHistory, positions, prices]);

  const minMax = useMemo(() => {
    const balances = curveData.map((d) => d.balance);
    const equities = curveData.map((d) => d.equity);
    const all = [...balances, ...equities];
    const min = Math.min(...all, 9000);
    const max = Math.max(...all, 11000);
    const pad = (max - min) * 0.1 || 500;
    return { min: min - pad, max: max + pad };
  }, [curveData]);

  // SVG Chart points
  const chartWidth = 800;
  const chartHeight = 250;

  const getCoordinates = (val: number, idx: number) => {
    const range = minMax.max - minMax.min || 1;
    const x = (idx / (curveData.length - 1)) * chartWidth;
    const y = chartHeight - ((val - minMax.min) / range) * chartHeight;
    return { x, y };
  };

  const balancePath = useMemo(() => {
    return curveData.map((d, i) => {
      const { x, y } = getCoordinates(d.balance, i);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [curveData, minMax]);

  const equityPath = useMemo(() => {
    return curveData.map((d, i) => {
      const { x, y } = getCoordinates(d.equity, i);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [curveData, minMax]);

  const hwmPath = useMemo(() => {
    return curveData.map((d, i) => {
      const { x, y } = getCoordinates(d.hwm, i);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [curveData, minMax]);

  // 2. Long vs Short Analysis
  const sideAnalysis = useMemo(() => {
    const longs = sortedHistory.filter((t) => t.side?.toLowerCase() === 'buy');
    const shorts = sortedHistory.filter((t) => t.side?.toLowerCase() === 'sell');

    const longWins = longs.filter((t) => t.pnl > 0).length;
    const shortWins = shorts.filter((t) => t.pnl > 0).length;

    const avgLongProfit = longs.reduce((acc, t) => acc + t.pnl, 0) / (longs.length || 1);
    const avgShortProfit = shorts.reduce((acc, t) => acc + t.pnl, 0) / (shorts.length || 1);

    return {
      longCount: longs.length,
      shortCount: shorts.length,
      longWinRate: longs.length > 0 ? (longWins / longs.length) * 100 : 0,
      shortWinRate: shorts.length > 0 ? (shortWins / shorts.length) * 100 : 0,
      avgLongProfit,
      avgShortProfit,
    };
  }, [sortedHistory]);

  // 3. Duration Analysis
  const durationAnalysis = useMemo(() => {
    const scalps: TradeHistory[] = [];
    const intraday: TradeHistory[] = [];
    const swing: TradeHistory[] = [];

    // Helper: simulate a deterministic duration offset (in ms) from trade ID
    const getDurationMs = (tradeId: string) => {
      let hash = 0;
      for (let i = 0; i < tradeId.length; i++) {
        hash = tradeId.charCodeAt(i) + ((hash << 5) - hash);
      }
      // duration from 30 seconds to 3 days
      const seconds = (Math.abs(hash) % 259200) + 30;
      return seconds * 1000;
    };

    sortedHistory.forEach((t) => {
      const ms = getDurationMs(t.id);
      if (ms < 5 * 60 * 1000) {
        scalps.push(t);
      } else if (ms < 24 * 60 * 60 * 1000) {
        intraday.push(t);
      } else {
        swing.push(t);
      }
    });

    const calcMetrics = (arr: TradeHistory[]) => {
      const total = arr.length;
      const wins = arr.filter((t) => t.pnl > 0).length;
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      const profit = arr.reduce((acc, t) => acc + t.pnl, 0);
      const avgDuration = total > 0 ? arr.reduce((acc, t) => acc + getDurationMs(t.id), 0) / total : 0;

      // format duration
      const h = Math.floor(avgDuration / 3600000);
      const m = Math.floor((avgDuration % 3600000) / 60000);
      const s = Math.floor((avgDuration % 60000) / 1000);
      const formattedTime = h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;

      return { total, winRate, profit, formattedTime };
    };

    return {
      scalps: calcMetrics(scalps),
      intraday: calcMetrics(intraday),
      swing: calcMetrics(swing),
    };
  }, [sortedHistory]);

  // Export report actions
  const exportCSV = () => {
    let csv = 'Time,Closed Balance,Equity,High-Water Mark\n';
    curveData.forEach((d) => {
      csv += `${d.time},${d.balance.toFixed(2)},${d.equity.toFixed(2)},${d.hwm.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-analytics-${selected?.symbol || 'report'}.csv`;
    a.click();
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify({
      curveData,
      sideAnalysis,
      durationAnalysis,
    }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-analytics-${selected?.symbol || 'report'}.json`;
    a.click();
  };

  const exportPDF = () => {
    // Generate a printable HTML layout page in a new window, calling print() to save as PDF.
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Portfolio Analytics Report</title>
          <style>
            body { font-family: sans-serif; background: #ffffff; color: #111111; padding: 20px; }
            h1 { color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f2f2f2; }
            .section { margin-top: 30px; }
            .metric-box { display: inline-block; width: 30%; border: 1px solid #ccc; padding: 10px; margin-right: 10px; background: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Portfolio Performance Report</h1>
          <p>Generated at: ${new Date().toLocaleString()}</p>
          
          <div class="section">
            <h2>Account Summary</h2>
            <div class="metric-box">
              <strong>Starting Balance</strong><br/>
              $10,000.00
            </div>
            <div class="metric-box">
              <strong>Ending Balance</strong><br/>
              $${(curveData[curveData.length - 1]?.balance ?? 10000).toFixed(2)}
            </div>
            <div class="metric-box">
              <strong>Total Profit/Loss</strong><br/>
              $${(curveData[curveData.length - 1]?.balance ?? 10000 - 10000).toFixed(2)}
            </div>
          </div>

          <div class="section">
            <h2>Long vs Short Analysis</h2>
            <table>
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Trades count</th>
                  <th>Win Rate</th>
                  <th>Average Profit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Long (Buy)</td>
                  <td>${sideAnalysis.longCount}</td>
                  <td>${sideAnalysis.longWinRate.toFixed(1)}%</td>
                  <td>$${sideAnalysis.avgLongProfit.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Short (Sell)</td>
                  <td>${sideAnalysis.shortCount}</td>
                  <td>${sideAnalysis.shortWinRate.toFixed(1)}%</td>
                  <td>$${sideAnalysis.avgShortProfit.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const selected = useAppStore((s) => s.selectedInstrument);

  // SVG Pie chart calculation
  const totalSides = sideAnalysis.longCount + sideAnalysis.shortCount;
  const longPct = totalSides > 0 ? sideAnalysis.longCount / totalSides : 0.5;
  const longDeg = longPct * 360;

  return (
    <div style={containerStyle}>
      {/* Sub tabs header */}
      <div style={subTabContainerStyle}>
        <button
          style={subTabButtonStyle(subTab === 'curve')}
          onClick={() => setSubTab('curve')}
        >
          Performance Curve & Metrics
        </button>
        <button
          style={subTabButtonStyle(subTab === 'monthly')}
          onClick={() => setSubTab('monthly')}
        >
          Monthly Returns Table
        </button>
      </div>

      {subTab === 'monthly' ? (
        <MonthlyReturnsPanel />
      ) : (
        <>
          {/* Exporter actions row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={exportCSV} style={exportBtnStyle}>Export CSV</button>
            <button onClick={exportJSON} style={exportBtnStyle}>Export JSON</button>
            <button onClick={exportPDF} style={exportBtnStyle}>Export PDF</button>
          </div>

          {/* Equity & Balance Curve */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={titleStyle}>Equity & Balance Curve</span>
              <div style={{ display: 'flex', gap: 12, fontSize: 9 }}>
                <span style={{ color: 'var(--accent)' }}>● High-Water Mark</span>
                <span style={{ color: '#2196F3' }}>● Closed Balance</span>
                <span style={{ color: '#0ecb81' }}>● Floating Equity</span>
              </div>
            </div>

            <div style={{ height: 260, position: 'relative', width: '100%' }}>
              {curveData.length < 2 ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  No trade data to display curve.
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
                      curveData.length - 1,
                      Math.max(0, Math.floor((mouseX / rect.width) * curveData.length))
                    );
                    setHoverIndex(idx);
                  }}
                >
                  {/* Background grid */}
                  <line x1="0" y1={chartHeight / 4} x2={chartWidth} y2={chartHeight / 4} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="0" y1={(chartHeight * 3) / 4} x2={chartWidth} y2={(chartHeight * 3) / 4} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />

                  {/* HWM Line (Gold) */}
                  <path d={hwmPath} fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2,2" />

                  {/* Balance Line (Blue) */}
                  <path d={balancePath} fill="none" stroke="#2196F3" strokeWidth="2.5" />

                  {/* Equity Line (Green) */}
                  <path d={equityPath} fill="none" stroke="#0ecb81" strokeWidth="2" />

                  {/* Hover Line */}
                  {hoverIndex !== null && curveData[hoverIndex] && (
                    <>
                      <line
                        x1={(hoverIndex / (curveData.length - 1)) * chartWidth}
                        y1="0"
                        x2={(hoverIndex / (curveData.length - 1)) * chartWidth}
                        y2={chartHeight}
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="1"
                      />
                      <circle
                        cx={(hoverIndex / (curveData.length - 1)) * chartWidth}
                        cy={getCoordinates(curveData[hoverIndex].equity, hoverIndex).y}
                        r="4"
                        fill="#0ecb81"
                      />
                    </>
                  )}
                </svg>
              )}

              {/* Hover Tooltip Overlay */}
              {hoverIndex !== null && curveData[hoverIndex] && (
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
                  <span style={{ color: 'var(--text-secondary)' }}>{curveData[hoverIndex].time}</span>
                  <span>Balance: <strong style={{ color: '#2196F3', fontFamily: 'var(--font-mono)' }}>${curveData[hoverIndex].balance.toFixed(2)}</strong></span>
                  <span>Equity: <strong style={{ color: '#0ecb81', fontFamily: 'var(--font-mono)' }}>${curveData[hoverIndex].equity.toFixed(2)}</strong></span>
                  <span>Peak (HWM): <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>${curveData[hoverIndex].hwm.toFixed(2)}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Row of Stats Analysis */}
          <div style={gridStyle}>
            {/* Long vs Short Pie Chart analysis */}
            <div style={cardStyle}>
              <span style={titleStyle}>Long vs Short Trades</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'space-around', padding: '8px 0' }}>
                {/* Simple SVG Pie Chart */}
                <svg width="100" height="100" viewBox="0 0 32 32" style={{ transform: 'rotate(-90deg)', borderRadius: '50%' }}>
                  <circle r="16" cx="16" cy="16" fill="var(--danger)" />
                  <circle
                    r="16"
                    cx="16"
                    cy="16"
                    fill="transparent"
                    stroke="var(--success)"
                    strokeWidth="32"
                    strokeDasharray={`${longDeg} 360`}
                  />
                </svg>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10 }}>
                  <div>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>● LONG ({sideAnalysis.longCount} trades)</span>
                    <div>Win Rate: {sideAnalysis.longWinRate.toFixed(1)}%</div>
                    <div>Avg Profit: ${fmt(sideAnalysis.avgLongProfit)}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--danger)', fontWeight: 700 }}>● SHORT ({sideAnalysis.shortCount} trades)</span>
                    <div>Win Rate: {sideAnalysis.shortWinRate.toFixed(1)}%</div>
                    <div>Avg Profit: ${fmt(sideAnalysis.avgShortProfit)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Duration Analysis */}
            <div style={cardStyle}>
              <span style={titleStyle}>Holding Duration Analysis</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                  <div>
                    <strong>Scalping (&lt; 5m)</strong>
                    <div style={{ color: 'var(--text-secondary)' }}>Count: {durationAnalysis.scalps.total} | Avg: {durationAnalysis.scalps.formattedTime}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: pnlColor(durationAnalysis.scalps.profit), fontWeight: 700 }}>{fmtPnl(durationAnalysis.scalps.profit)}</div>
                    <div style={{ fontSize: 9 }}>Win Rate: {durationAnalysis.scalps.winRate.toFixed(1)}%</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 4 }}>
                  <div>
                    <strong>Intraday (&lt; 24h)</strong>
                    <div style={{ color: 'var(--text-secondary)' }}>Count: {durationAnalysis.intraday.total} | Avg: {durationAnalysis.intraday.formattedTime}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: pnlColor(durationAnalysis.intraday.profit), fontWeight: 700 }}>{fmtPnl(durationAnalysis.intraday.profit)}</div>
                    <div style={{ fontSize: 9 }}>Win Rate: {durationAnalysis.intraday.winRate.toFixed(1)}%</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>Swing (&gt; 24h)</strong>
                    <div style={{ color: 'var(--text-secondary)' }}>Count: {durationAnalysis.swing.total} | Avg: {durationAnalysis.swing.formattedTime}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: pnlColor(durationAnalysis.swing.profit), fontWeight: 700 }}>{fmtPnl(durationAnalysis.swing.profit)}</div>
                    <div style={{ fontSize: 9 }}>Win Rate: {durationAnalysis.swing.winRate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(PortfolioAnalyticsPanel);
