// src/components/ChartTrading/EventTimelineOverlay.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import './EventTimelineOverlay.css';

export interface EconomicEvent {
  id: string;
  code: string; // e.g. 'NFP', 'CPI', 'FOMC', 'PPI', 'PMI'
  title: string; // e.g. 'Non-Farm Employment Change'
  currency: string; // e.g. 'USD', 'EUR', 'GBP'
  importance: 'HIGH' | 'MEDIUM' | 'LOW' | 'HOLIDAY';
  timestamp: number; // Unix timestamp ms
  forecast?: string;
  previous?: string;
  actual?: string;
}

interface EventTimelineOverlayProps {
  chartInstance: any; // Lightweight Charts IChartApi instance
  symbol: string;
  isMobile?: boolean;
}

export const EventTimelineOverlay: React.FC<EventTimelineOverlayProps> = ({
  chartInstance,
  symbol,
  isMobile = false,
}) => {
  const [visibleEvents, setVisibleEvents] = useState<
    { event: EconomicEvent; x: number }[]
  >([]);
  const [hoveredEvent, setHoveredEvent] = useState<EconomicEvent | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  // Real-time tick every second for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showClusterModal, setShowClusterModal] = useState(false);

  // Comprehensive Economic Events Dataset (NFP, CPI, FOMC, PPI, PMI, Rates, Core PCE, GDP)
  const eventsList: EconomicEvent[] = useMemo(() => {
    const base = Date.now();
    return [
      {
        id: 'ev-cpi-gbp',
        code: 'CPI',
        title: 'Consumer Price Index (YoY)',
        currency: 'GBP',
        importance: 'HIGH',
        timestamp: base - 30 * 60 * 1000, // 30m ago
        forecast: '2.1%',
        previous: '2.3%',
        actual: '2.2%',
      },
      {
        id: 'ev-fomc-usd',
        code: 'FOMC',
        title: 'FOMC Rate Decision & Press Conference',
        currency: 'USD',
        importance: 'HIGH',
        timestamp: base + (2 * 3600 + 29 * 60) * 1000, // in 2h 29m
        forecast: '5.25%',
        previous: '5.25%',
      },
      {
        id: 'ev-nfp-usd',
        code: 'NFP',
        title: 'Non-Farm Employment Change',
        currency: 'USD',
        importance: 'HIGH',
        timestamp: base + (4 * 3600 + 59 * 60) * 1000, // in 4h 59m
        forecast: '185K',
        previous: '175K',
      },
      {
        id: 'ev-pce-usd',
        code: 'CORE PCE',
        title: 'Core PCE Price Index (MoM)',
        currency: 'USD',
        importance: 'HIGH',
        timestamp: base + (5 * 3600 + 30 * 60) * 1000, // in 5h 30m
        forecast: '0.2%',
        previous: '0.3%',
      },
      {
        id: 'ev-ppi-usd',
        code: 'PPI',
        title: 'Producer Price Index (MoM)',
        currency: 'USD',
        importance: 'HIGH',
        timestamp: base + (6 * 3600 + 15 * 60) * 1000, // in 6h 15m
        forecast: '0.3%',
        previous: '0.2%',
      },
      {
        id: 'ev-rates-ecb',
        code: 'RATES',
        title: 'ECB Main Refinancing Rate Decision',
        currency: 'EUR',
        importance: 'HIGH',
        timestamp: base + 12 * 3600 * 1000, // in 12h
        forecast: '3.75%',
        previous: '4.00%',
      },
      {
        id: 'ev-gdp-usd',
        code: 'GDP',
        title: 'Gross Domestic Product (QoQ)',
        currency: 'USD',
        importance: 'HIGH',
        timestamp: base + 22 * 3600 * 1000, // in 22h
        forecast: '2.8%',
        previous: '3.0%',
      },
      {
        id: 'ev-pmi-eur',
        code: 'PMI',
        title: 'S&P Global Manufacturing PMI',
        currency: 'EUR',
        importance: 'MEDIUM',
        timestamp: base + 8 * 3600 * 1000, // in 8h
        forecast: '45.8',
        previous: '45.6',
      },
      {
        id: 'ev-claims-usd',
        code: 'EMPLOY',
        title: 'Initial Unemployment Claims',
        currency: 'USD',
        importance: 'LOW',
        timestamp: base + 16 * 3600 * 1000, // in 16h
        forecast: '215K',
        previous: '210K',
      },
    ];
  }, []);

  // Format live countdown (e.g. 4h 59m, 30m, 2h 29m)
  const formatCountdown = useCallback((timestamp: number) => {
    const diff = timestamp - nowMs;
    if (diff <= 0) {
      const minsAgo = Math.floor(Math.abs(diff) / 60000);
      return minsAgo < 5 ? 'LIVE' : `${minsAgo}m ago`;
    }
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [nowMs]);

  const formatUtcTime = useCallback((timestamp: number) => {
    const d = new Date(timestamp);
    const hrs = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hrs}:${mins} UTC`;
  }, []);

  // High Impact Filtering by Default
  const filteredEvents = useMemo(() => {
    return eventsList.filter((ev) => showAllEvents || ev.importance === 'HIGH');
  }, [eventsList, showAllEvents]);

  // Display top 3 nearest upcoming events, collapse others into +N
  const { top3Events, collapsedCount } = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => a.timestamp - b.timestamp);
    const top3 = sorted.slice(0, 3);
    const extra = Math.max(0, sorted.length - 3);
    return { top3Events: top3, collapsedCount: extra };
  }, [filteredEvents]);

  return (
    <>
      {/* Horizontal Event Lane directly above X-Axis Time Scale (Height: 30px) */}
      <div className="economic-event-strip-lane">
        <div className="economic-event-strip-content">
          {top3Events.map((ev) => {
            const impactClass = ev.importance.toLowerCase();
            const countdownStr = formatCountdown(ev.timestamp);

            return (
              <div
                key={ev.id}
                className={`event-strip-pill ${impactClass}`}
                onMouseEnter={() => setHoveredEvent(ev)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => setSelectedEvent(ev)}
              >
                <span className={`event-strip-dot ${impactClass}`} />
                <span className="event-strip-code">{ev.code}</span>
                <span className="event-strip-countdown">{countdownStr}</span>

                {/* Hover Tooltip */}
                {hoveredEvent?.id === ev.id && (
                  <div className="event-hover-tooltip">
                    <div className="tooltip-title">
                      {ev.code} ({ev.currency}) - {ev.title}
                    </div>
                    <div className="tooltip-time">{formatUtcTime(ev.timestamp)}</div>
                    <span className={`tooltip-impact-badge ${impactClass}`}>
                      {ev.importance} IMPACT
                    </span>

                    {ev.forecast && (
                      <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 4 }}>
                        Forecast: <strong style={{ color: '#fff' }}>{ev.forecast}</strong>
                      </div>
                    )}
                    {ev.previous && (
                      <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>
                        Previous: <strong style={{ color: '#fff' }}>{ev.previous}</strong>
                      </div>
                    )}
                    {ev.actual && (
                      <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>
                        Actual: <strong style={{ color: '#00c076' }}>{ev.actual}</strong>
                      </div>
                    )}

                    <div className="tooltip-remaining">
                      {ev.timestamp > nowMs ? `Countdown: ${countdownStr}` : `Status: ${countdownStr}`}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {collapsedCount > 0 && (
            <button
              className="event-strip-pill collapsed-pill"
              onClick={() => setShowClusterModal(true)}
              title="Click to view all economic events"
            >
              <span>+{collapsedCount} More</span>
            </button>
          )}

          <button
            className={`event-strip-pill toggle-all-pill ${showAllEvents ? 'active' : ''}`}
            onClick={() => setShowAllEvents(!showAllEvents)}
            title="Toggle between High Impact only and All Events"
          >
            <span>{showAllEvents ? 'HIGH ONLY' : 'SHOW ALL'}</span>
          </button>
        </div>
      </div>

      {/* Event Details Modal / Bottom Sheet */}
      {selectedEvent && (
        <div className="event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div
            className={isMobile ? 'event-bottom-sheet' : 'event-modal-content'}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                  {selectedEvent.title}
                </h3>
                <span style={{ fontSize: 11, color: '#8f929d' }}>
                  {selectedEvent.currency} • {formatUtcTime(selectedEvent.timestamp)}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'transparent', border: 'none', color: '#8f929d', fontSize: 22, cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#8f929d' }}>Impact Level:</span>
                <span className={`tooltip-impact-badge ${selectedEvent.importance.toLowerCase()}`}>
                  {selectedEvent.importance} IMPACT
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#8f929d' }}>Countdown:</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#d4af37', fontFamily: 'var(--font-mono)' }}>
                  {formatCountdown(selectedEvent.timestamp)}
                </span>
              </div>

              {selectedEvent.forecast && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8f929d' }}>Forecast:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {selectedEvent.forecast}
                  </span>
                </div>
              )}

              {selectedEvent.previous && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8f929d' }}>Previous:</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                    {selectedEvent.previous}
                  </span>
                </div>
              )}

              {selectedEvent.actual && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#8f929d' }}>Actual:</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#00c076', fontFamily: 'var(--font-mono)' }}>
                    {selectedEvent.actual}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
