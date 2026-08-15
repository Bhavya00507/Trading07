// src/components/SessionPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';

interface SessionData {
  name: string;
  hoursUtc: string;
  isActive: boolean;
  high: number;
  low: number;
  range: number;
  vwap: number;
  poc: number;
  volume: string;
  countdown: string;
}

const SessionPanel: React.FC = () => {
  const selected = useAppStore((state) => state.selectedInstrument);
  const prices = useMarketStore((state) => state.prices);

  const [utcTime, setUtcTime] = useState<Date>(new Date());

  // Tick the clock every second to update session countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setUtcTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const livePrice = useMemo(() => {
    if (!selected) return 0;
    return prices[selected.symbol]?.price ?? selected.price ?? 100;
  }, [selected, prices]);

  const sessions: SessionData[] = useMemo(() => {
    const currentHour = utcTime.getUTCHours();
    const currentMin = utcTime.getUTCMinutes();
    const currentSec = utcTime.getUTCSeconds();

    // Tokyo: 00:00 - 09:00 UTC
    // London: 08:00 - 17:00 UTC
    // New York: 13:00 - 22:00 UTC

    const calculateCountdown = (closeHour: number, name: string, startHour: number) => {
      // Check if session is active
      let isActive = false;
      if (name === 'Tokyo') isActive = currentHour >= 0 && currentHour < 9;
      else if (name === 'London') isActive = currentHour >= 8 && currentHour < 17;
      else if (name === 'New York') isActive = currentHour >= 13 && currentHour < 22;

      if (isActive) {
        // Countdown to close
        let hoursLeft = closeHour - 1 - currentHour;
        if (hoursLeft < 0) hoursLeft += 24;
        const minsLeft = 59 - currentMin;
        const secsLeft = 59 - currentSec;
        return `Closes in ${hoursLeft}h ${minsLeft}m ${secsLeft}s`;
      } else {
        // Countdown to open
        let hoursToOpen = startHour - currentHour;
        if (hoursToOpen < 0) hoursToOpen += 24;
        let minsToOpen = 0 - currentMin;
        if (minsToOpen < 0) {
          minsToOpen += 60;
          hoursToOpen -= 1;
        }
        let secsToOpen = 0 - currentSec;
        if (secsToOpen < 0) {
          secsToOpen += 60;
          minsToOpen -= 1;
        }
        return `Opens in ${hoursToOpen}h ${minsToOpen}m ${secsToOpen}s`;
      }
    };

    const activeList = [
      { name: 'Tokyo', start: 0, close: 9, hoursUtc: '00:00 - 09:00 UTC' },
      { name: 'London', start: 8, close: 17, hoursUtc: '08:00 - 17:00 UTC' },
      { name: 'New York', start: 13, close: 22, hoursUtc: '13:00 - 22:00 UTC' },
    ];

    return activeList.map((s) => {
      const isActive = s.name === 'Tokyo' ? (currentHour >= 0 && currentHour < 9) :
                      s.name === 'London' ? (currentHour >= 8 && currentHour < 17) :
                      (currentHour >= 13 && currentHour < 22);
      
      const countdown = calculateCountdown(s.close, s.name, s.start);

      // Deterministic stats simulation derived from price level
      const seed = s.name.charCodeAt(0) + Math.floor(livePrice);
      const isForex = selected?.category === 'forex';
      const rangeVal = livePrice * (s.name === 'London' ? 0.008 : s.name === 'New York' ? 0.012 : 0.005);
      
      const high = parseFloat((livePrice + rangeVal * 0.4).toFixed(isForex ? 4 : 2));
      const low = parseFloat((livePrice - rangeVal * 0.6).toFixed(isForex ? 4 : 2));
      const range = parseFloat((high - low).toFixed(isForex ? 4 : 2));
      
      const vwap = parseFloat((low + range * 0.48).toFixed(isForex ? 4 : 2));
      const poc = parseFloat((low + range * (0.3 + (seed % 4) * 0.1)).toFixed(isForex ? 4 : 2));
      
      const volumeNum = 20000 + (seed % 80000);
      const volume = volumeNum >= 1000 ? `${(volumeNum / 1000).toFixed(1)}K lots` : `${volumeNum} lots`;

      return {
        name: s.name,
        hoursUtc: s.hoursUtc,
        isActive,
        high,
        low,
        range,
        vwap,
        poc,
        volume,
        countdown,
      };
    });
  }, [utcTime, livePrice, selected]);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto', background: '#070b14', fontFamily: 'var(--font-sans)' }}>
      
      {/* Title & Live Time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '15px', color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            Global Sessions Dashboard
          </h3>
          <span style={{ fontSize: '10px', color: '#8e8e93' }}>Active session monitor &amp; range analysis</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#f5f5f7', fontWeight: 600 }}>
          {utcTime.toUTCString().replace('GMT', 'UTC')}
        </div>
      </div>

      {/* Grid of Session Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        {sessions.map((sess) => (
          <div
            key={sess.name}
            style={{
              background: '#0d1322',
              border: sess.isActive ? '1px solid #d4af37' : '1px solid #1b2235',
              borderRadius: '6px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: sess.isActive ? '0 0 10px rgba(212, 175, 55, 0.05)' : 'none'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#f5f5f7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: sess.isActive ? '#00c076' : '#8e8e93',
                    display: 'inline-block'
                  }} />
                  {sess.name}
                </strong>
                <span style={{ fontSize: '9px', color: '#8e8e93', display: 'block' }}>{sess.hoursUtc}</span>
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: sess.isActive ? '#00c076' : '#8e8e93',
                fontFamily: 'var(--font-mono)'
              }}>
                {sess.countdown}
              </span>
            </div>

            {/* Metrics Checklist */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', borderTop: '1px solid #1b2235', paddingTop: '10px' }}>
              <div>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '9px' }}>Session High</span>
                <strong style={{ color: '#f5f5f7', fontFamily: 'var(--font-mono)' }}>{sess.high}</strong>
              </div>
              <div>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '9px' }}>Session Low</span>
                <strong style={{ color: '#f5f5f7', fontFamily: 'var(--font-mono)' }}>{sess.low}</strong>
              </div>
              <div>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '9px' }}>Session Range</span>
                <strong style={{ color: '#d4af37', fontFamily: 'var(--font-mono)' }}>{sess.range}</strong>
              </div>
              <div>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '9px' }}>Total Volume</span>
                <strong style={{ color: '#f5f5f7', fontFamily: 'var(--font-mono)' }}>{sess.volume}</strong>
              </div>
              <div style={{ borderTop: '1px dashed #1b2235', paddingTop: '4px' }}>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '9px' }}>Session VWAP</span>
                <strong style={{ color: '#00c076', fontFamily: 'var(--font-mono)' }}>{sess.vwap}</strong>
              </div>
              <div style={{ borderTop: '1px dashed #1b2235', paddingTop: '4px' }}>
                <span style={{ color: '#8e8e93', display: 'block', fontSize: '9px' }}>POC (Point of Control)</span>
                <strong style={{ color: '#00c076', fontFamily: 'var(--font-mono)' }}>{sess.poc}</strong>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionPanel;
