import React, { useState, useEffect } from 'react';

export const JournalAssistantPanel: React.FC = () => {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    fetch('/api/ai/journal-assistant?entries_count=15')
      .then(res => res.json())
      .then(d => setReport(d))
      .catch(() => {});
  }, []);

  if (!report) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>📓 TRADING JOURNAL & EMOTIONAL BIAS AUDITOR</div>

      <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
        {report.weekly_report}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>HISTORICAL WIN RATE</div>
          <div style={{ fontWeight: 800, color: '#10b981', fontSize: 14 }}>{report.win_rate_pct}%</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>BEST SETUP</div>
          <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 10 }}>{report.best_setup}</div>
        </div>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>WORST MISTAKE</div>
          <div style={{ fontWeight: 800, color: '#ef4444', fontSize: 10 }}>{report.worst_setup}</div>
        </div>
      </div>
    </div>
  );
};
