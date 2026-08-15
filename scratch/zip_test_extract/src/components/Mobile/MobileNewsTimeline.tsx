import React, { useState } from 'react';

interface NewsItem {
  id: string;
  title: string;
  impact: 'high' | 'medium' | 'low';
  currency: string;
  time: string;
  forecast: string;
  previous: string;
}

const DEFAULT_NEWS: NewsItem[] = [
  { id: '1', title: 'US CPI Inflation Rate (YoY)', impact: 'high', currency: 'USD', time: '14:30', forecast: '3.1%', previous: '3.2%' },
  { id: '2', title: 'ECB Rate Decision', impact: 'high', currency: 'EUR', time: '15:15', forecast: '3.75%', previous: '4.00%' },
  { id: '3', title: 'FOMC Member Speaks', impact: 'medium', currency: 'USD', time: '18:00', forecast: '--', previous: '--' },
];

export const MobileNewsTimeline: React.FC = React.memo(() => {
  const [isOpenSheet, setIsOpenSheet] = useState(false);

  return (
    <>
      {/* 1-Line Compact Event Pill Anchored Below Chart */}
      <div className="quantum-news-compact-pill" onClick={() => setIsOpenSheet(true)}>
        <div className="pill-content">
          <span className="live-pulse">🔴</span>
          <span className="pill-txt">3 High Impact Events Today • US CPI Inflation Rate (14:30)</span>
        </div>
        <span className="expand-hint">Tap for details ▲</span>
      </div>

      {/* Slide-Up Economic Calendar Drawer */}
      {isOpenSheet && (
        <div className="quantum-news-sheet-overlay" onClick={() => setIsOpenSheet(false)}>
          <div className="quantum-news-sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" onClick={() => setIsOpenSheet(false)} />
            
            <div className="sheet-head">
              <div className="head-title">
                <span className="icon">📰</span>
                <div>
                  <h3>ECONOMIC CALENDAR CATALYSTS</h3>
                  <span className="sub">Real-Time Macro Event Impact</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setIsOpenSheet(false)}>✕</button>
            </div>

            <div className="events-list">
              {DEFAULT_NEWS.map((item) => (
                <div key={item.id} className={`event-row impact-${item.impact}`}>
                  <div className="row-meta">
                    <span className={`impact-tag ${item.impact}`}>
                      {item.impact === 'high' ? '🔴 HIGH' : '🟡 MED'}
                    </span>
                    <span className="curr">{item.currency}</span>
                    <span className="time">{item.time}</span>
                  </div>
                  <div className="event-title">{item.title}</div>
                  <div className="event-stats">
                    <span>Forecast: <strong>{item.forecast}</strong></span>
                    <span>Previous: <strong>{item.previous}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

MobileNewsTimeline.displayName = 'MobileNewsTimeline';
