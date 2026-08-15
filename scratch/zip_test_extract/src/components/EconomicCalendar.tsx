// src/components/EconomicCalendar.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { getMarketCalendar } from '../services/api';

export interface CalendarEvent {
  id: string;
  timeLabel: string; // original time string like "14:30"
  currency: string;
  event: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  actual?: string;
  forecast?: string;
  previous?: string;
  timestamp: number; // calculated relative epoch ms
  volatilityImpactRatio: string;
  overlap: string;
}

const getInitialEvents = (): CalendarEvent[] => {
  const now = Date.now();
  return [
    { id: '1', timeLabel: '14:30', currency: 'USD', event: 'Non-Farm Employment Change (NFP)', importance: 'HIGH', forecast: '185K', previous: '175K', timestamp: now + 50 * 60 * 1000, volatilityImpactRatio: '4.8x', overlap: 'NY / LDN' },
    { id: '2', timeLabel: '14:30', currency: 'USD', event: 'Unemployment Rate', importance: 'HIGH', forecast: '3.9%', previous: '3.8%', timestamp: now + 50 * 60 * 1000, volatilityImpactRatio: '3.2x', overlap: 'NY / LDN' },
    { id: '3', timeLabel: '11:30', currency: 'GBP', event: 'CPI y/y', importance: 'HIGH', forecast: '2.1%', previous: '2.3%', timestamp: now - 30 * 60000, volatilityImpactRatio: '3.5x', overlap: 'London' }, // 30m ago
    { id: '4', timeLabel: '19:30', currency: 'USD', event: 'FOMC Interest Rate Decision', importance: 'HIGH', forecast: '5.50%', previous: '5.50%', timestamp: now + 2.5 * 3600000, volatilityImpactRatio: '5.2x', overlap: 'New York' },
    { id: '5', timeLabel: '18:15', currency: 'EUR', event: 'ECB Interest Rate Decision', importance: 'HIGH', forecast: '4.25%', previous: '4.50%', timestamp: now + 1.5 * 3600000, volatilityImpactRatio: '4.1x', overlap: 'NY / LDN' },
    { id: '6', timeLabel: '05:00', currency: 'JPY', event: 'BOJ Policy Rate', importance: 'HIGH', forecast: '0.10%', previous: '0.10%', timestamp: now - 4 * 3600000, volatilityImpactRatio: '3.9x', overlap: 'Asian' }, // 4h ago
    { id: '7', timeLabel: '15:30', currency: 'USD', event: 'Crude Oil Inventories', importance: 'MEDIUM', forecast: '-1.2M', previous: '2.1M', timestamp: now + 26 * 3600000, volatilityImpactRatio: '2.1x', overlap: 'NY / LDN' }, // tomorrow
    { id: '8', timeLabel: '10:00', currency: 'EUR', event: 'German Flash PMI', importance: 'MEDIUM', forecast: '47.5', previous: '46.8', timestamp: now - 45 * 60000, volatilityImpactRatio: '1.8x', overlap: 'London' }, // 45m ago
    { id: '9', timeLabel: '15:00', currency: 'CAD', event: 'BOC Rate Statement', importance: 'HIGH', forecast: '4.75%', previous: '5.00%', timestamp: now + 48 * 3600000, volatilityImpactRatio: '3.4x', overlap: 'New York' }, // in 2 days
    { id: '10', timeLabel: '08:30', currency: 'AUD', event: 'Employment Change', importance: 'MEDIUM', forecast: '25.0K', previous: '39.7K', timestamp: now + 20 * 3600000, volatilityImpactRatio: '2.0x', overlap: 'Asian' }, // in 20h
    { id: '11', timeLabel: '12:00', currency: 'GBP', event: 'BoE Interest Rate Decision', importance: 'HIGH', forecast: '5.25%', previous: '5.25%', timestamp: now + 72 * 3600000, volatilityImpactRatio: '3.8x', overlap: 'London' }, // in 3 days
    { id: '12', timeLabel: '16:00', currency: 'USD', event: 'Existing Home Sales', importance: 'LOW', forecast: '4.10M', previous: '4.14M', timestamp: now + 96 * 3600000, volatilityImpactRatio: '1.2x', overlap: 'New York' } // in 4 days
  ];
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  fontSize: 11,
};

const filterBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-color)',
  flexWrap: 'wrap',
};

const filterSelect: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const tableWrap: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 700,
  borderCollapse: 'collapse',
  fontFamily: 'var(--font-sans)',
};

const thStyle: React.CSSProperties = {
  padding: '6px 12px',
  textAlign: 'left',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-color)',
  background: 'var(--bg-secondary)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
};

const badgeStyle = (importance: CalendarEvent['importance']): React.CSSProperties => {
  const bg = importance === 'HIGH' ? 'rgba(246,70,93,0.15)' : importance === 'MEDIUM' ? 'rgba(234,179,8,0.15)' : 'rgba(59,130,246,0.15)';
  const color = importance === 'HIGH' ? 'var(--danger)' : importance === 'MEDIUM' ? 'var(--warning)' : 'var(--accent)';
  return {
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 700,
    backgroundColor: bg,
    color: color,
    display: 'inline-block',
  };
};

const EconomicCalendar: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [selectedImportance, setSelectedImportance] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'TODAY' | 'WEEK'>('TODAY');
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Tick timer to update countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const [events, setEvents] = useState<CalendarEvent[]>(getInitialEvents());

  // Fetch real economic calendar from backend
  useEffect(() => {
    let active = true;
    const fetchCalendar = async () => {
      try {
        const data = await getMarketCalendar();
        if (active) {
          setEvents(data);
        }
      } catch (err) {
        console.warn('Failed to fetch economic calendar from API:', err);
      }
    };

    fetchCalendar();
    const timer = setInterval(fetchCalendar, 60000); // 60s auto refresh

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const currencies = useMemo(() => {
    return Array.from(new Set(events.map(e => e.currency))).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfTodayMs = endOfToday.getTime();

    return events.filter(e => {
      // 1. Currency filter
      if (selectedCurrency !== 'ALL' && e.currency !== selectedCurrency) return false;
      // 2. Importance filter
      if (selectedImportance !== 'ALL' && e.importance !== selectedImportance) return false;
      
      // 3. Time filter (Today / This Week)
      if (timeFilter === 'TODAY') {
        return e.timestamp <= endOfTodayMs;
      }
      return true;
    });
  }, [events, selectedCurrency, selectedImportance, timeFilter]);

  const getCountdownText = (targetMs: number) => {
    const diff = targetMs - nowTime;
    if (diff <= 0) {
      const minutesAgo = Math.floor(Math.abs(diff) / 60000);
      if (minutesAgo < 1) return 'Released just now';
      if (minutesAgo < 60) return `${minutesAgo}m ago`;
      const hoursAgo = Math.floor(minutesAgo / 60);
      return `${hoursAgo}h ago`;
    }

    const totalSecs = Math.floor(diff / 1000);
    const totalMins = Math.floor(totalSecs / 60);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    if (hours > 0) {
      return `In ${hours}h ${mins}m`;
    }
    return `In ${mins}m`;
  };

  // Pre-event Volatility warning within 2 hours
  const hasHighImpactEventSoon = useMemo(() => {
    return events.some((e) => {
      const diff = e.timestamp - nowTime;
      return e.importance === 'HIGH' && diff > 0 && diff < 2 * 3600 * 1000;
    });
  }, [events, nowTime]);

  return (
    <div style={containerStyle}>
      {/* Alert banner warnings before events */}
      {hasHighImpactEventSoon && (
        <div style={{
          background: 'rgba(255, 77, 87, 0.08)',
          border: '1px solid rgba(255, 77, 87, 0.2)',
          borderRadius: 4,
          padding: '8px 12px',
          margin: '8px 10px 0 10px',
          color: '#ff4d57',
          fontSize: '11px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <strong>🚨 HIGH VOLATILITY EVENT WARNING:</strong> NFP Employment Change or Central Bank Decision is scheduled soon. High slippages expected. Reduce leverage!
          </div>
          <span style={{ fontSize: '9px', padding: '2px 6px', background: '#ff4d57', color: '#070b14', borderRadius: '3px', fontWeight: 700 }}>
            VOLATILITY ALERT
          </span>
        </div>
      )}

      <div style={filterBar}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 9 }}>Timeframe:</span>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as any)} style={filterSelect}>
            <option value="TODAY">Today</option>
            <option value="WEEK">This Week</option>
          </select>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 9 }}>Currency:</span>
          <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} style={filterSelect}>
            <option value="ALL">All Currencies</option>
            {currencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 9 }}>Impact:</span>
          <select value={selectedImportance} onChange={(e) => setSelectedImportance(e.target.value)} style={filterSelect}>
            <option value="ALL">All Impacts</option>
            <option value="HIGH">High Impact</option>
            <option value="MEDIUM">Medium Impact</option>
            <option value="LOW">Low Impact</option>
          </select>
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)' }}>
          Countdowns update automatically
        </span>
      </div>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Scheduled Time</th>
              <th style={thStyle}>Countdown</th>
              <th style={thStyle}>Currency</th>
              <th style={thStyle}>Impact</th>
              <th style={thStyle}>Event</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Forecast</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Previous</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Vol Impact</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Overlap</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No calendar events match current filters.
                </td>
              </tr>
            ) : (
              filteredEvents.map((e, idx) => (
                <tr key={e.id} style={{ backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{e.timeLabel}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: e.timestamp > nowTime ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {getCountdownText(e.timestamp)}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{e.currency}</td>
                  <td style={tdStyle}>
                    <span style={badgeStyle(e.importance)}>{e.importance}</span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{e.event}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{e.forecast || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{e.previous || '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: e.importance === 'HIGH' ? '#ff4d57' : '#8e8e93' }}>{e.volatilityImpactRatio}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: '#8e8e93' }}>{e.overlap}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EconomicCalendar;
