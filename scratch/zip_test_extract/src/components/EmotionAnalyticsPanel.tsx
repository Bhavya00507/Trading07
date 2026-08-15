import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore, EmotionType } from '../store/journalStore';
import { analyzeEmotions } from '../services/journalAnalyzer';

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
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '11px',
};

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontSize: '9px',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-color)',
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  color: 'var(--text-primary)',
};

const EMOTION_COLORS: Record<EmotionType, string> = {
  Confident: '#0ecb81', // green
  Fear: '#2196F3',      // blue
  Greed: '#FF9800',     // orange
  Revenge: '#ea3d5c',   // red
  FOMO: '#9C27B0',      // purple
  Hesitation: '#FFEB3B', // yellow
  Neutral: '#757575',    // gray
};

const EmotionAnalyticsPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, getOrCreateEntry } = useJournalStore();

  const journalList = useMemo(() => {
    return history.map((t) => getOrCreateEntry(t));
  }, [history, getOrCreateEntry]);

  const emotionData = useMemo(() => {
    return analyzeEmotions(journalList);
  }, [journalList]);

  // Compute SVG Pie Chart sectors
  const pieSectors = useMemo(() => {
    const total = emotionData.reduce((sum, d) => sum + d.count, 0);
    if (total === 0) return [];

    let accumulatedAngle = 0;
    return emotionData.map((d) => {
      const percentage = d.count / total;
      const angle = percentage * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      // Arc calculation coordinates
      const r = 40;
      const cx = 50;
      const cy = 50;

      const x1 = cx + r * Math.cos((startAngle - 90) * Math.PI / 180);
      const y1 = cy + r * Math.sin((startAngle - 90) * Math.PI / 180);
      const x2 = cx + r * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
      const y2 = cy + r * Math.sin((accumulatedAngle - 90) * Math.PI / 180);

      const largeArc = angle > 180 ? 1 : 0;

      // D path
      const pathD = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

      return {
        emotion: d.emotion,
        pathD,
        color: EMOTION_COLORS[d.emotion],
        percentage,
        count: d.count
      };
    }).filter((s) => s.count > 0);
  }, [emotionData]);

  // Max value for bar scaling
  const maxAvgPnl = useMemo(() => {
    const absVals = emotionData.map((d) => Math.abs(d.avgPnl));
    return Math.max(...absVals, 100);
  }, [emotionData]);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        {/* Emotion breakdown table */}
        <div style={cardStyle}>
          <span style={titleStyle}>Emotion Statistics</span>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Emotion</th>
                <th style={thStyle}>Trades</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Win Rate</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Avg PnL</th>
              </tr>
            </thead>
            <tbody>
              {emotionData.map((d) => {
                const color = EMOTION_COLORS[d.emotion];
                const pnlColor = d.avgPnl > 0 ? 'var(--success)' : d.avgPnl < 0 ? 'var(--danger)' : 'var(--text-secondary)';
                return (
                  <tr key={d.emotion}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, marginRight: '6px' }} />
                      {d.emotion}
                    </td>
                    <td style={tdStyle}>{d.count}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {d.count > 0 ? `${d.winRate.toFixed(1)}%` : '-'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: pnlColor, fontFamily: 'var(--font-mono)' }}>
                      {d.count > 0 ? `${d.avgPnl >= 0 ? '+' : ''}$${d.avgPnl.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Emotion frequency pie chart */}
        <div style={cardStyle}>
          <span style={titleStyle}>Emotion Distribution (Frequency)</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', gap: '20px' }}>
            {pieSectors.length === 0 ? (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No trading data to chart.</span>
            ) : (
              <>
                <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(0deg)' }}>
                  {pieSectors.map((s, idx) => (
                    <path
                      key={idx}
                      d={s.pathD}
                      fill={s.color}
                      stroke="var(--bg-secondary)"
                      strokeWidth="1.5"
                    />
                  ))}
                  {/* Center circle for donut look */}
                  <circle cx="50" cy="50" r="16" fill="var(--bg-secondary)" />
                </svg>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
                  {pieSectors.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color }} />
                      <span>{s.emotion}: <strong>{(s.percentage * 100).toFixed(0)}%</strong> ({s.count})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SVG Bar Chart comparing profits by emotion */}
      <div style={cardStyle}>
        <span style={titleStyle}>Average Profitability by Emotion ($)</span>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', padding: '16px 0', width: '100%' }}>
          {emotionData.filter(d => d.count > 0).map((d) => {
            const heightPct = Math.max((Math.abs(d.avgPnl) / maxAvgPnl) * 100, 4);
            const isLoss = d.avgPnl < 0;
            const barColor = EMOTION_COLORS[d.emotion];

            return (
              <div key={d.emotion} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '70px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isLoss ? 'var(--danger)' : 'var(--success)' }}>
                  {d.avgPnl >= 0 ? '+' : ''}${d.avgPnl.toFixed(0)}
                </span>
                <div style={{
                  width: '24px',
                  height: `${heightPct}px`,
                  backgroundColor: barColor,
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.85,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }} />
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 600 }}>{d.emotion}</span>
              </div>
            );
          })}
          {emotionData.filter(d => d.count > 0).length === 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No trading data to chart.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmotionAnalyticsPanel;
