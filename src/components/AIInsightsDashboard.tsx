import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore } from '../store/journalStore';
import { generateAIReview } from '../services/aiReview';
import { analyzeStreaks, analyzeSetups, analyzeMistakes } from '../services/journalAnalyzer';

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
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const coachCardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.05), rgba(17, 20, 27, 0.95))',
  border: '1px solid var(--accent)',
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

const metricLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
};

const AIInsightsDashboard: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, getOrCreateEntry } = useJournalStore();

  const journalList = useMemo(() => {
    return history.map((t) => getOrCreateEntry(t));
  }, [history, getOrCreateEntry]);

  // AI coach analysis
  const review = useMemo(() => {
    return generateAIReview(journalList);
  }, [journalList]);

  // Aggregate stats for Dashboard Metrics
  const dashboardMetrics = useMemo(() => {
    if (journalList.length === 0) {
      return {
        bestPair: 'N/A',
        worstPair: 'N/A',
        bestSession: 'N/A',
        worstSession: 'N/A',
        bestSetup: 'N/A',
        worstSetup: 'N/A',
        biggestMistake: 'N/A',
        highestProfitDay: 'N/A',
        longestWinStreak: 0,
        longestLossStreak: 0,
      };
    }

    // 1. Symbol profits
    const symbolProfits: Record<string, number> = {};
    journalList.forEach((e) => {
      symbolProfits[e.symbol] = (symbolProfits[e.symbol] || 0) + e.pnl;
    });
    let bestPair = 'N/A';
    let worstPair = 'N/A';
    let maxSymPnl = -Infinity;
    let minSymPnl = Infinity;
    Object.entries(symbolProfits).forEach(([sym, pnl]) => {
      if (pnl > maxSymPnl) {
        maxSymPnl = pnl;
        bestPair = `${sym} (+$${pnl.toFixed(0)})`;
      }
      if (pnl < minSymPnl) {
        minSymPnl = pnl;
        worstPair = `${sym} (-$${Math.abs(pnl).toFixed(0)})`;
      }
    });

    // 2. Sessions profits
    const sessionProfits: Record<string, number> = { Asian: 0, London: 0, 'New York': 0 };
    journalList.forEach((e) => {
      sessionProfits[e.session] = (sessionProfits[e.session] || 0) + e.pnl;
    });
    let bestSession = 'N/A';
    let worstSession = 'N/A';
    let maxSess = -Infinity;
    let minSess = Infinity;
    Object.entries(sessionProfits).forEach(([sess, pnl]) => {
      if (pnl > maxSess) {
        maxSess = pnl;
        bestSession = `${sess} (+$${pnl.toFixed(0)})`;
      }
      if (pnl < minSess) {
        minSess = pnl;
        worstSession = `${sess} (-$${Math.abs(pnl).toFixed(0)})`;
      }
    });

    // 3. Setups
    const setupStats = analyzeSetups(journalList);
    let bestSetup = 'N/A';
    let worstSetup = 'N/A';
    let maxSetupPnl = -Infinity;
    let minSetupPnl = Infinity;
    setupStats.forEach((s) => {
      if (s.count > 0) {
        if (s.netPnl > maxSetupPnl) {
          maxSetupPnl = s.netPnl;
          bestSetup = `${s.setup} (+$${s.netPnl.toFixed(0)})`;
        }
        if (s.netPnl < minSetupPnl) {
          minSetupPnl = s.netPnl;
          worstSetup = `${s.setup} (-$${Math.abs(s.netPnl).toFixed(0)})`;
        }
      }
    });

    // 4. Mistakes
    const mistakeStats = analyzeMistakes(journalList);
    let biggestMistake = 'None';
    let maxMistakeCost = 0;
    mistakeStats.forEach((m) => {
      if (m.lossesCaused > maxMistakeCost) {
        maxMistakeCost = m.lossesCaused;
        biggestMistake = `${m.mistake} (-$${m.lossesCaused.toFixed(0)})`;
      }
    });

    // 5. Daily profits
    const dailyPnL: Record<string, number> = {};
    journalList.forEach((e) => {
      const dateStr = new Date(e.closeTime).toLocaleDateString('en-US', { dateStyle: 'medium' });
      dailyPnL[dateStr] = (dailyPnL[dateStr] || 0) + e.pnl;
    });
    let highestProfitDay = 'N/A';
    let maxDailyPnl = -Infinity;
    Object.entries(dailyPnL).forEach(([dateStr, pnl]) => {
      if (pnl > maxDailyPnl) {
        maxDailyPnl = pnl;
        highestProfitDay = `${dateStr} (+$${pnl.toFixed(0)})`;
      }
    });

    // 6. Streaks
    const streaks = analyzeStreaks(journalList);

    return {
      bestPair,
      worstPair,
      bestSession,
      worstSession,
      bestSetup,
      worstSetup,
      biggestMistake,
      highestProfitDay,
      longestWinStreak: streaks.longestWinStreak,
      longestLossStreak: streaks.longestLossStreak,
    };
  }, [journalList]);

  return (
    <div style={containerStyle}>
      {/* Prominent AI Recommendation Coach Card */}
      <div style={coachCardStyle}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'inline-block' }} />
          AI Performance Coach Recommendations
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <strong style={{ fontSize: '10px', color: 'var(--success)', textTransform: 'uppercase' }}>Strengths</strong>
            <ul style={{ paddingLeft: '16px', margin: '6px 0', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-primary)' }}>
              {review.strengths.map((str, idx) => (
                <li key={idx}>{str}</li>
              ))}
            </ul>
          </div>

          <div>
            <strong style={{ fontSize: '10px', color: 'var(--danger)', textTransform: 'uppercase' }}>Weaknesses</strong>
            <ul style={{ paddingLeft: '16px', margin: '6px 0', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-primary)' }}>
              {review.weaknesses.map((weak, idx) => (
                <li key={idx}>{weak}</li>
              ))}
            </ul>
          </div>

          <div>
            <strong style={{ fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase' }}>Suggestions</strong>
            <ul style={{ paddingLeft: '16px', margin: '6px 0', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-primary)' }}>
              {review.suggestions.map((sug, idx) => (
                <li key={idx}>{sug}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Grid of Dashboard Metrics */}
      <div style={gridStyle}>
        <div style={cardStyle}>
          <span style={metricLabelStyle}>Best Pair</span>
          <span style={{ ...metricValueStyle, color: 'var(--success)' }}>{dashboardMetrics.bestPair}</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Worst Pair</span>
          <span style={{ ...metricValueStyle, color: 'var(--danger)' }}>{dashboardMetrics.worstPair}</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Best Session</span>
          <span style={{ ...metricValueStyle, color: 'var(--success)' }}>{dashboardMetrics.bestSession}</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Worst Session</span>
          <span style={{ ...metricValueStyle, color: 'var(--danger)' }}>{dashboardMetrics.worstSession}</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Best Trading Setup</span>
          <span style={{ ...metricValueStyle, color: 'var(--success)' }}>{dashboardMetrics.bestSetup}</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Worst Trading Setup</span>
          <span style={{ ...metricValueStyle, color: 'var(--danger)' }}>{dashboardMetrics.worstSetup}</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Biggest Mistake committed</span>
          <span style={{ ...metricValueStyle, color: 'var(--danger)' }}>{dashboardMetrics.biggestMistake}</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Highest Profit Day</span>
          <span style={{ ...metricValueStyle, color: 'var(--success)' }}>{dashboardMetrics.highestProfitDay}</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Longest Win Run</span>
          <span style={metricValueStyle}>{dashboardMetrics.longestWinStreak} trades</span>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Longest Loss Run</span>
          <span style={metricValueStyle}>{dashboardMetrics.longestLossStreak} trades</span>
        </div>
      </div>
    </div>
  );
};

export default AIInsightsDashboard;
