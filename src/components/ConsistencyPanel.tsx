import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore } from '../store/journalStore';

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

const valueStyle: React.CSSProperties = {
  fontSize: '20px',
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

const ConsistencyPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, getOrCreateEntry } = useJournalStore();

  const journalList = useMemo(() => {
    return history.map((t) => getOrCreateEntry(t));
  }, [history, getOrCreateEntry]);

  const sortedList = useMemo(() => {
    return [...journalList].sort(
      (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );
  }, [journalList]);

  // Aggregate weekly and monthly data, and consecutive profitable days
  const consistencyStats = useMemo(() => {
    if (sortedList.length === 0) {
      return {
        consecutiveProfitableDays: 0,
        avgWeeklyPnl: 0,
        avgMonthlyPnl: 0,
        winRatio: 0,
        weeklyCurve: [] as { label: string; balance: number }[],
        monthlyBars: [] as { label: string; pnl: number }[],
      };
    }

    // 1. Group by day to calculate consecutive profitable days
    const dailyPnL: Record<string, number> = {};
    sortedList.forEach((e) => {
      const dateStr = new Date(e.closeTime).toDateString();
      dailyPnL[dateStr] = (dailyPnL[dateStr] || 0) + e.pnl;
    });

    const dailyChronological = Object.keys(dailyPnL)
      .map((k) => ({ date: new Date(k), pnl: dailyPnL[k] }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let maxConsecDays = 0;
    let currentConsecDays = 0;
    dailyChronological.forEach((day) => {
      if (day.pnl > 0) {
        currentConsecDays += 1;
        if (currentConsecDays > maxConsecDays) maxConsecDays = currentConsecDays;
      } else {
        currentConsecDays = 0;
      }
    });

    // 2. Group by week for average weekly PnL and Weekly Equity Curve
    const weeklyPnL: Record<string, number> = {};
    sortedList.forEach((e) => {
      const d = new Date(e.closeTime);
      const onejan = new Date(d.getFullYear(), 0, 1);
      const weekNum = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
      const weekStr = `${d.getFullYear()}-W${weekNum}`;
      weeklyPnL[weekStr] = (weeklyPnL[weekStr] || 0) + e.pnl;
    });

    const sortedWeeks = Object.keys(weeklyPnL).sort();
    let currentBalance = 10000;
    const weeklyCurve = sortedWeeks.map((weekKey) => {
      currentBalance += weeklyPnL[weekKey];
      return { label: weekKey, balance: currentBalance };
    });

    // Add start week
    weeklyCurve.unshift({ label: 'Start', balance: 10000 });

    const totalWeeks = Object.keys(weeklyPnL).length || 1;
    const totalPnl = sortedList.reduce((acc, e) => acc + e.pnl, 0);
    const avgWeeklyPnl = totalPnl / totalWeeks;

    // 3. Group by month for average monthly PnL and Monthly Performance Bars
    const monthlyPnL: Record<string, number> = {};
    sortedList.forEach((e) => {
      const d = new Date(e.closeTime);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyPnL[mStr] = (monthlyPnL[mStr] || 0) + e.pnl;
    });

    const sortedMonthsKeys = Object.keys(monthlyPnL).sort();
    const monthlyBars = sortedMonthsKeys.map((mKey) => ({
      label: mKey,
      pnl: monthlyPnL[mKey],
    }));

    const totalMonths = sortedMonthsKeys.length || 1;
    const avgMonthlyPnl = totalPnl / totalMonths;

    // 4. Overall Win Ratio
    const wins = sortedList.filter((e) => e.pnl > 0).length;
    const winRatio = (wins / sortedList.length) * 100;

    return {
      consecutiveProfitableDays: maxConsecDays,
      avgWeeklyPnl,
      avgMonthlyPnl,
      winRatio,
      weeklyCurve,
      monthlyBars,
    };
  }, [sortedList]);

  // SVG Chart bounds
  const chartWidth = 600;
  const chartHeight = 150;

  const minMaxWeekly = useMemo(() => {
    const balances = consistencyStats.weeklyCurve.map((d) => d.balance);
    if (balances.length === 0) return { min: 9000, max: 11000 };
    const min = Math.min(...balances, 9500);
    const max = Math.max(...balances, 10500);
    const pad = (max - min) * 0.1 || 200;
    return { min: min - pad, max: max + pad };
  }, [consistencyStats]);

  const weeklyPath = useMemo(() => {
    const data = consistencyStats.weeklyCurve;
    if (data.length < 2) return '';
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const range = minMaxWeekly.max - minMaxWeekly.min || 1;
      const y = chartHeight - ((d.balance - minMaxWeekly.min) / range) * chartHeight;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [consistencyStats, minMaxWeekly]);

  const maxMonthPnl = useMemo(() => {
    const absPnl = consistencyStats.monthlyBars.map((d) => Math.abs(d.pnl));
    return Math.max(...absPnl, 100);
  }, [consistencyStats]);

  const fmt = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <div style={cardStyle}>
          <span style={labelStyle}>Consecutive Profitable Days</span>
          <div style={{ ...valueStyle, color: 'var(--success)' }}>
            {consistencyStats.consecutiveProfitableDays} days
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>all-time streak record</span>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Average Weekly Profit</span>
          <div style={{ ...valueStyle, color: consistencyStats.avgWeeklyPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {consistencyStats.avgWeeklyPnl >= 0 ? '+' : ''}${fmt(consistencyStats.avgWeeklyPnl)}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>average week returns</span>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Average Monthly Profit</span>
          <div style={{ ...valueStyle, color: consistencyStats.avgMonthlyPnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {consistencyStats.avgMonthlyPnl >= 0 ? '+' : ''}${fmt(consistencyStats.avgMonthlyPnl)}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>average month returns</span>
        </div>

        <div style={cardStyle}>
          <span style={labelStyle}>Journal Win Ratio</span>
          <div style={valueStyle}>
            {consistencyStats.winRatio.toFixed(1)}%
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>overall trades win rate</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Weekly Equity Curve */}
        <div style={cardStyle}>
          <span style={titleStyle}>Weekly Running Equity Curve</span>
          <div style={{ height: 160, width: '100%', position: 'relative' }}>
            {consistencyStats.weeklyCurve.length < 2 ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                No weekly data to display.
              </div>
            ) : (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" preserveAspectRatio="none">
                <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                <path d={weeklyPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
              </svg>
            )}
          </div>
        </div>

        {/* Monthly Performance Bars */}
        <div style={cardStyle}>
          <span style={titleStyle}>Monthly Performance Bars</span>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '160px', padding: '10px 0', width: '100%' }}>
            {consistencyStats.monthlyBars.map((bar) => {
              const heightPct = Math.max((Math.abs(bar.pnl) / maxMonthPnl) * 100, 4);
              const isLoss = bar.pnl < 0;
              return (
                <div key={bar.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '60px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isLoss ? 'var(--danger)' : 'var(--success)' }}>
                    {bar.pnl >= 0 ? '+' : ''}${bar.pnl.toFixed(0)}
                  </span>
                  <div style={{
                    width: '20px',
                    height: `${heightPct}px`,
                    backgroundColor: isLoss ? 'var(--danger)' : 'var(--success)',
                    borderRadius: '2px 2px 0 0',
                    opacity: 0.85
                  }} />
                  <span style={{ fontSize: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>{bar.label}</span>
                </div>
              );
            })}
            {consistencyStats.monthlyBars.length === 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center' }}>No monthly data to chart.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsistencyPanel;
