import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore, JournalEntry, GradeType, EmotionType, SetupType, MistakeType } from '../store/journalStore';

const containerStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '16px',
  overflowY: 'auto',
};

const filterSelect: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: '11px',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '3px',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  outline: 'none',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '6px',
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

const cellStyle: React.CSSProperties = {
  aspectRatio: '1',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '6px',
  fontSize: '10px',
  cursor: 'pointer',
  position: 'relative',
  transition: 'transform 0.1s ease',
};

const weekdayLabelStyle: React.CSSProperties = {
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '10px',
  color: 'var(--text-secondary)',
  padding: '4px 0',
  textTransform: 'uppercase',
};

const detailRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize: '11px',
};

const detailValStyle: React.CSSProperties = {
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-primary)',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const JournalCalendarPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, getOrCreateEntry } = useJournalStore();

  const availableYears = useMemo(() => {
    const years = history.map((t) => new Date(t.timestamp).getFullYear());
    const unique = Array.from(new Set(years)).sort((a, b) => b - a);
    return unique.length > 0 ? unique : [new Date().getFullYear()];
  }, [history]);

  // Filters state with localStorage persistence
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('journal-calendar-year');
      if (saved) return parseInt(saved);
    } catch {}
    return availableYears[0] || new Date().getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('journal-calendar-month');
      if (saved) return parseInt(saved);
    } catch {}
    return new Date().getMonth();
  });

  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  useEffect(() => {
    localStorage.setItem('journal-calendar-year', selectedYear.toString());
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('journal-calendar-month', selectedMonth.toString());
  }, [selectedMonth]);

  const journalList = useMemo(() => {
    return history.map((t) => getOrCreateEntry(t));
  }, [history, getOrCreateEntry]);

  // Aggregate daily info
  const dailyStatsMap = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; wins: number; journalEntries: JournalEntry[] }>();

    journalList.forEach((e) => {
      const date = new Date(e.closeTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const curr = map.get(key) || { pnl: 0, count: 0, wins: 0, journalEntries: [] };
      curr.pnl += e.pnl;
      curr.count += 1;
      if (e.pnl > 0) curr.wins += 1;
      curr.journalEntries.push(e);
      map.set(key, curr);
    });

    return map;
  }, [journalList]);

  // Days calculations
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ isEmpty: true, dayNum: 0, dateKey: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ isEmpty: false, dayNum: d, dateKey });
    }
    return cells;
  }, [selectedYear, selectedMonth, daysInMonth, firstDayIndex]);

  // Active day details
  const activeDayKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const dayDetails = useMemo(() => {
    const stats = dailyStatsMap.get(activeDayKey);
    if (!stats || stats.count === 0) return null;

    const winRate = (stats.wins / stats.count) * 100;
    const emotions = Array.from(new Set(stats.journalEntries.map((e) => e.emotion)));
    const mistakes = Array.from(new Set(stats.journalEntries.flatMap((e) => e.mistakes)));
    
    // Average Grade
    const grades = stats.journalEntries.map((e) => e.grade);
    const scoreMap = { 'A+': 5, 'A': 4, 'B': 3, 'C': 2, 'F': 0 };
    const avgScore = grades.reduce((acc, g) => acc + scoreMap[g], 0) / grades.length;
    let avgGrade: GradeType = 'B';
    if (avgScore >= 4.5) avgGrade = 'A+';
    else if (avgScore >= 3.5) avgGrade = 'A';
    else if (avgScore >= 2.5) avgGrade = 'B';
    else if (avgScore >= 1.5) avgGrade = 'C';
    else avgGrade = 'F';

    return {
      dateStr: new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString('en-US', { dateStyle: 'long' }),
      trades: stats.count,
      winRate,
      pnl: stats.pnl,
      emotions,
      mistakes,
      grade: avgGrade,
    };
  }, [dailyStatsMap, activeDayKey, selectedYear, selectedMonth, selectedDay]);

  const getCellColor = (pnl: number) => {
    if (pnl === 0) return 'var(--bg-tertiary)';
    return pnl > 0 ? 'rgba(14, 203, 129, 0.25)' : 'rgba(234, 61, 92, 0.25)';
  };

  const fmt = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={containerStyle}>
      {/* Month/Year Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(parseInt(e.target.value));
              setSelectedDay(1);
            }}
            style={filterSelect}
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(parseInt(e.target.value));
              setSelectedDay(1);
            }}
            style={filterSelect}
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Heatmap Grid Calendar */}
        <div style={cardStyle}>
          <span style={titleStyle}>Monthly Heatmap Calendar</span>
          <div style={gridStyle}>
            {WEEKDAYS.map((day) => (
              <div key={day} style={weekdayLabelStyle}>
                {day}
              </div>
            ))}
            {calendarCells.map((cell, idx) => {
              if (cell.isEmpty) {
                return <div key={`empty-${idx}`} style={{ ...cellStyle, border: 'none', cursor: 'default' }} />;
              }

              const stats = dailyStatsMap.get(cell.dateKey) || { pnl: 0, count: 0, wins: 0 };
              const cellBg = getCellColor(stats.pnl);
              const isSelected = selectedDay === cell.dayNum;

              return (
                <div
                  key={cell.dayNum}
                  style={{
                    ...cellStyle,
                    backgroundColor: cellBg,
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                    borderWidth: isSelected ? '2px' : '1px',
                  }}
                  onClick={() => setSelectedDay(cell.dayNum)}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cell.dayNum}</span>
                  {stats.count > 0 && (
                    <span style={{
                      fontWeight: 700,
                      fontSize: '8px',
                      fontFamily: 'var(--font-mono)',
                      color: stats.pnl >= 0 ? '#0ecb81' : '#ea3d5c',
                      alignSelf: 'center'
                    }}>
                      {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(0)}
                    </span>
                  )}
                  <span />
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily View Details Panel */}
        <div style={cardStyle}>
          <span style={titleStyle}>Daily Journal Summary</span>
          {dayDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: '12px', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                {dayDetails.dateStr}
              </strong>
              
              <div style={detailRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Trades Logged</span>
                <span style={detailValStyle}>{dayDetails.trades} trades</span>
              </div>

              <div style={detailRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Win Rate</span>
                <span style={detailValStyle}>{dayDetails.winRate.toFixed(1)}%</span>
              </div>

              <div style={detailRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Net Profit / Loss</span>
                <span style={{ ...detailValStyle, color: dayDetails.pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {dayDetails.pnl >= 0 ? '+' : ''}${fmt(dayDetails.pnl)}
                </span>
              </div>

              <div style={detailRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Average Grade</span>
                <span style={{ ...detailValStyle, color: 'var(--accent)' }}>{dayDetails.grade}</span>
              </div>

              <div style={detailRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Emotions Logged</span>
                <span style={{ ...detailValStyle, fontSize: '10px' }}>{dayDetails.emotions.join(', ') || 'None'}</span>
              </div>

              <div style={{ ...detailRowStyle, borderBottom: 'none' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Mistakes Logged</span>
                <span style={{ ...detailValStyle, color: 'var(--danger)', fontSize: '10px' }}>
                  {dayDetails.mistakes.join(', ') || 'None'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '11px', minHeight: '160px' }}>
              No trading activity logged for {new Date(selectedYear, selectedMonth, selectedDay).toLocaleDateString('en-US', { dateStyle: 'medium' })}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalCalendarPanel;
