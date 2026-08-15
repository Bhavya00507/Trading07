import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore } from '../store/journalStore';
import { analyzeStreaks } from '../services/journalAnalyzer';

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
  gap: '8px',
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

const valueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-primary)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const StreakPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, getOrCreateEntry } = useJournalStore();

  const journalList = useMemo(() => {
    return history.map((t) => getOrCreateEntry(t));
  }, [history, getOrCreateEntry]);

  const streaks = useMemo(() => {
    return analyzeStreaks(journalList);
  }, [journalList]);

  // Generate streak run history for visualization
  // A streak run is a list of streaks e.g. [3, -2, 5, -1, 4] representing 3 wins, 2 losses, etc.
  const streakRuns = useMemo(() => {
    if (journalList.length === 0) return [];
    
    // Sort chronologically
    const sorted = [...journalList].sort(
      (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );

    const runs: { length: number; isWin: boolean }[] = [];
    let currentLength = 0;
    let currentIsWin = sorted[0].pnl > 0;

    sorted.forEach((e) => {
      const isWin = e.pnl > 0;
      if (isWin === currentIsWin) {
        currentLength += 1;
      } else {
        runs.push({ length: currentLength, isWin: currentIsWin });
        currentLength = 1;
        currentIsWin = isWin;
      }
    });
    // Add final run
    if (currentLength > 0) {
      runs.push({ length: currentLength, isWin: currentIsWin });
    }

    return runs;
  }, [journalList]);

  const maxStreakLength = useMemo(() => {
    if (streakRuns.length === 0) return 1;
    return Math.max(...streakRuns.map((r) => r.length), 3);
  }, [streakRuns]);

  const fmt = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        {/* Metric Cards */}
        <div style={cardStyle}>
          <span style={labelStyle}>Current Win Streak</span>
          <div style={{ ...valueStyle, color: 'var(--success)' }}>
            {streaks.currentWinStreak} trades
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>active wins run</span>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Current Loss Streak</span>
          <div style={{ ...valueStyle, color: 'var(--danger)' }}>
            {streaks.currentLossStreak} trades
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>active losses run</span>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Longest Win Streak</span>
          <div style={{ ...valueStyle, color: 'var(--success)' }}>
            {streaks.longestWinStreak} trades
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>all-time record</span>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Longest Loss Streak</span>
          <div style={{ ...valueStyle, color: 'var(--danger)' }}>
            {streaks.longestLossStreak} trades
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>all-time record</span>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Best Trading Week</span>
          <div style={{ ...valueStyle, color: streaks.bestWeek.pnl > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
            {streaks.bestWeek.pnl > 0 ? '+' : ''}${fmt(streaks.bestWeek.pnl)}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{streaks.bestWeek.weekStr}</span>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Worst Trading Week</span>
          <div style={{ ...valueStyle, color: streaks.worstWeek.pnl < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            ${fmt(streaks.worstWeek.pnl)}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{streaks.worstWeek.weekStr}</span>
        </div>
      </div>

      {/* SVG Bar Chart visualizing consecutive runs */}
      <div style={cardStyle}>
        <span style={titleStyle}>Consecutive Wins & Losses Runs History</span>
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', height: '180px', padding: '16px', gap: '8px', overflowX: 'auto', width: '100%' }}>
          {streakRuns.map((r, idx) => {
            const heightPct = (r.length / maxStreakLength) * 100;
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '40px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {r.length}
                </span>
                <div style={{
                  width: '20px',
                  height: `${heightPct}px`,
                  backgroundColor: r.isWin ? 'var(--success)' : 'var(--danger)',
                  borderRadius: '3px 3px 0 0',
                  opacity: 0.85
                }} />
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {r.isWin ? 'Win' : 'Loss'}
                </span>
              </div>
            );
          })}
          {streakRuns.length === 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>No streak data to chart.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakPanel;
