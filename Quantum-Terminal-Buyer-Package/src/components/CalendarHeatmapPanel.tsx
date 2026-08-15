import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

const containerStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '16px',
  overflowY: 'auto',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
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

const cellStyle: React.CSSProperties = {
  aspectRatio: '1',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '6px',
  fontSize: '10px',
  position: 'relative',
  cursor: 'pointer',
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CalendarHeatmapPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);

  // 1. Available years
  const availableYears = useMemo(() => {
    const years = history.map((t) => new Date(t.timestamp).getFullYear());
    const unique = Array.from(new Set(years)).sort((a, b) => b - a);
    return unique.length > 0 ? unique : [new Date().getFullYear()];
  }, [history]);

  // 2. Load / Persist month and year
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('trading-heatmap-year');
      if (saved) return parseInt(saved);
    } catch {}
    return availableYears[0] || new Date().getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('trading-heatmap-month');
      if (saved) return parseInt(saved);
    } catch {}
    return new Date().getMonth();
  });

  useEffect(() => {
    localStorage.setItem('trading-heatmap-year', selectedYear.toString());
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('trading-heatmap-month', selectedMonth.toString());
  }, [selectedMonth]);

  // 3. Aggregate trades by day
  const dailyPnLMap = useMemo(() => {
    const map = new Map<string, { pnl: number; count: number; wins: number }>();

    history.forEach((t) => {
      const date = new Date(t.timestamp);
      // Format key: YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const key = `${year}-${month}-${day}`;

      const curr = map.get(key) || { pnl: 0, count: 0, wins: 0 };
      curr.pnl += t.pnl;
      curr.count += 1;
      if (t.pnl > 0) {
        curr.wins += 1;
      }
      map.set(key, curr);
    });

    return map;
  }, [history]);

  // 4. Generate calendar grid days
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();

  const calendarCells = useMemo(() => {
    const cells = [];

    // Prefix empty slots
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ isEmpty: true, dateKey: '', dayNum: 0 });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(selectedMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateKey = `${selectedYear}-${mStr}-${dStr}`;
      cells.push({
        isEmpty: false,
        dateKey,
        dayNum: d,
      });
    }

    return cells;
  }, [selectedYear, selectedMonth, daysInMonth, firstDayIndex]);

  // Styling helper for cell intensity
  const getCellColor = (pnl: number) => {
    if (pnl === 0) return 'var(--bg-tertiary)';
    
    // We base color opacity/intensity on return relative to $10,000 (up to $500 profit/loss for max opacity)
    const absVal = Math.min(Math.abs(pnl), 500);
    const opacity = 0.15 + (absVal / 500) * 0.75; // Between 0.15 and 0.90

    if (pnl > 0) {
      return `rgba(14, 203, 129, ${opacity})`; // var(--success) but transparent HSL equivalent
    } else {
      return `rgba(234, 61, 92, ${opacity})`; // var(--danger) but transparent HSL equivalent
    }
  };

  // Tooltip details state
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
    date: string;
    pnl: number;
    count: number;
    wins: number;
  } | null>(null);

  const handleMouseMove = (e: React.MouseEvent, cell: any, stats: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCell({
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 10,
      date: cell.dateKey,
      pnl: stats.pnl,
      count: stats.count,
      wins: stats.wins,
    });
  };

  return (
    <div style={containerStyle}>
      {/* Selector Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
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

      {/* Heatmap Grid Container */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
            Daily Closed Profit & Loss Heatmap
          </span>
          <div style={{ display: 'flex', gap: '8px', fontSize: '9px', color: 'var(--text-secondary)' }}>
            <span>Loss</span>
            <div style={{ width: '40px', height: '10px', background: 'linear-gradient(to right, rgba(234, 61, 92, 0.9), rgba(234, 61, 92, 0.15), var(--bg-tertiary), rgba(14, 203, 129, 0.15), rgba(14, 203, 129, 0.9))', border: '1px solid var(--border-color)', borderRadius: '2px' }} />
            <span>Profit</span>
          </div>
        </div>

        <div style={gridStyle}>
          {/* Weekday headers */}
          {WEEKDAYS.map((day) => (
            <div key={day} style={weekdayLabelStyle}>
              {day}
            </div>
          ))}

          {/* Calendar grid cells */}
          {calendarCells.map((cell, idx) => {
            if (cell.isEmpty) {
              return <div key={`empty-${idx}`} style={{ ...cellStyle, border: 'none', cursor: 'default' }} />;
            }

            const stats = dailyPnLMap.get(cell.dateKey) || { pnl: 0, count: 0, wins: 0 };
            const returnPct = (stats.pnl / 10000) * 100; // Base $10k return %
            const backgroundColor = getCellColor(stats.pnl);
            const isToday = new Date().toDateString() === new Date(selectedYear, selectedMonth, cell.dayNum).toDateString();

            return (
              <div
                key={cell.dayNum}
                style={{
                  ...cellStyle,
                  backgroundColor,
                  borderColor: isToday ? 'var(--accent)' : 'var(--border-color)',
                  borderWidth: isToday ? '2px' : '1px',
                }}
                onMouseEnter={(e) => handleMouseMove(e, cell, stats)}
                onMouseMove={(e) => handleMouseMove(e, cell, stats)}
                onMouseLeave={() => setHoveredCell(null)}
              >
                {/* Day number */}
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', alignSelf: 'flex-start' }}>
                  {cell.dayNum}
                </span>

                {/* Profit/Loss % (if any trades) */}
                {stats.count > 0 && (
                  <span style={{
                    fontWeight: 700,
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    alignSelf: 'center',
                    color: stats.pnl > 0 ? '#0ecb81' : stats.pnl < 0 ? '#ea3d5c' : 'var(--text-secondary)',
                  }}>
                    {stats.pnl > 0 ? '+' : ''}{returnPct.toFixed(2)}%
                  </span>
                )}

                {/* Trade count indicator */}
                {stats.count > 0 ? (
                  <span style={{
                    fontSize: '8px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    alignSelf: 'flex-end',
                  }}>
                    {stats.count} trd{stats.count > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating details tooltip */}
      {hoveredCell && (
        <div style={{
          position: 'absolute',
          left: `${hoveredCell.x}px`,
          top: `${hoveredCell.y}px`,
          transform: 'translate(-50%, -100%)',
          background: 'rgba(17,20,27,0.95)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '8px 12px',
          fontSize: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 100,
          minWidth: '130px',
        }}>
          <strong style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '2px', color: 'var(--accent)', display: 'block' }}>
            {new Date(hoveredCell.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}
          </strong>
          {hoveredCell.count > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Profit/Loss:</span>
                <strong style={{ color: hoveredCell.pnl > 0 ? 'var(--success)' : hoveredCell.pnl < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {hoveredCell.pnl > 0 ? '+' : ''}${hoveredCell.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Return %:</span>
                <strong style={{ color: hoveredCell.pnl > 0 ? 'var(--success)' : hoveredCell.pnl < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {hoveredCell.pnl > 0 ? '+' : ''}{(hoveredCell.pnl / 100).toFixed(2)}%
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Trades:</span>
                <strong>{hoveredCell.count}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Win Rate:</span>
                <strong>{((hoveredCell.wins / hoveredCell.count) * 100).toFixed(1)}%</strong>
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>No trading activity.</span>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarHeatmapPanel;
