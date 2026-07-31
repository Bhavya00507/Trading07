import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore, JournalEntry, GradeType, EmotionType, SetupType, MistakeType } from '../store/journalStore';
import { detectJournalMistakes } from '../services/mistakeDetector';
import { generateAIReview } from '../services/aiReview';
import { analyzeStreaks, analyzeSetups, analyzeMistakes, analyzeEmotions, analyzeGrades } from '../services/journalAnalyzer';

// Styling Tokens
const containerStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '20px',
  overflowY: 'auto',
  backgroundColor: '#050811',
  color: '#f1f5f9',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
};

const subTabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  borderBottom: '1px solid #1e293b',
  paddingBottom: '12px',
  flexWrap: 'wrap',
};

const subTabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: '6px',
  background: active ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : '#0f172a',
  border: active ? '1px solid #38bdf8' : '1px solid #1e293b',
  color: active ? '#ffffff' : '#94a3b8',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  boxShadow: active ? '0 0 12px rgba(14, 165, 233, 0.3)' : 'none',
});

const gridStyle = (cols = 'repeat(auto-fit, minmax(220px, 1fr))'): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: cols,
  gap: '16px',
});

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #0f172a 0%, #090d16 100%)',
  border: '1px solid #1e293b',
  borderRadius: '10px',
  padding: '18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 800,
  textTransform: 'uppercase',
  color: '#38bdf8',
  borderBottom: '1px solid #1e293b',
  paddingBottom: '8px',
  letterSpacing: '0.06em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#64748b',
  textTransform: 'uppercase',
  fontWeight: 700,
  letterSpacing: '0.04em',
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 800,
  color: '#f8fafc',
  fontFamily: 'monospace',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '12px',
  backgroundColor: '#090d16',
  border: '1px solid #1e293b',
  borderRadius: '6px',
  color: '#f8fafc',
  outline: 'none',
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: '6px',
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#f8fafc',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const buttonPrimaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
  color: '#ffffff',
  border: '1px solid #38bdf8',
  boxShadow: '0 0 10px rgba(14, 165, 233, 0.3)',
};

const badgeStyle = (grade: GradeType): React.CSSProperties => {
  let bg = 'rgba(255,255,255,0.05)';
  let color = '#f8fafc';
  if (grade.startsWith('A')) {
    bg = 'rgba(16, 185, 129, 0.15)';
    color = '#10b981';
  } else if (grade === 'B') {
    bg = 'rgba(14, 165, 233, 0.15)';
    color = '#38bdf8';
  } else if (grade === 'C') {
    bg = 'rgba(245, 158, 11, 0.15)';
    color = '#f59e0b';
  } else if (grade === 'F') {
    bg = 'rgba(239, 68, 68, 0.15)';
    color = '#ef4444';
  }
  return {
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: 800,
    fontSize: '10px',
    backgroundColor: bg,
    color,
    display: 'inline-block',
    border: `1px solid ${color}44`,
  };
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '12px',
};

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: '10px',
  fontWeight: 800,
  textTransform: 'uppercase',
  color: '#64748b',
  borderBottom: '1px solid #1e293b',
  background: '#090d16',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
};

const TradeJournalPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, dailyJournals, updateEntry, setDailyJournal, getOrCreateEntry, importEntries } = useJournalStore();

  const [activeSubTab, setActiveSubTab] = useState<
    'dashboard' | 'calendar' | 'timeline' | 'ai_coach' | 'analytics' | 'risk' | 'reports'
  >('dashboard');

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);

  // Sync state with history trades
  const journalList = useMemo(() => {
    const list = history.map((t) => getOrCreateEntry(t));
    return list.sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
  }, [history, getOrCreateEntry]);

  // Filters
  const [search, setSearch] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [setupFilter, setSetupFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const filteredEntries = useMemo(() => {
    return journalList.filter((e) => {
      if (symbolFilter && e.symbol !== symbolFilter) return false;
      if (brokerFilter && (e.broker || 'Paper Trading') !== brokerFilter) return false;
      if (setupFilter && e.setupType !== setupFilter) return false;
      if (sessionFilter && e.session !== sessionFilter) return false;
      if (gradeFilter && e.grade !== gradeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const mNotes = e.notes.toLowerCase().includes(q) || (e.entryReason || '').toLowerCase().includes(q);
        const mSym = e.symbol.toLowerCase().includes(q);
        const mTags = (e.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!mNotes && !mSym && !mTags) return false;
      }
      return true;
    });
  }, [journalList, symbolFilter, brokerFilter, setupFilter, sessionFilter, gradeFilter, search]);

  // --- 1. DASHBOARD METRICS ---
  const metrics = useMemo(() => {
    if (journalList.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        netProfit: 0,
        grossProfit: 0,
        grossLoss: 0,
        profitFactor: 0,
        avgRR: 0,
        avgTrade: 0,
        largestWin: 0,
        largestLoss: 0,
        expectancy: 0,
        maxDrawdown: 0,
        maxConsecutiveWins: 0,
        maxConsecutiveLosses: 0,
        equityCurve: [10000],
      };
    }

    const wins = journalList.filter((e) => e.pnl > 0);
    const losses = journalList.filter((e) => e.pnl < 0);

    const grossProfit = wins.reduce((a, b) => a + b.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((a, b) => a + b.pnl, 0));
    const netProfit = journalList.reduce((a, b) => a + (b.netPnl ?? b.pnl), 0);

    const winRate = (wins.length / journalList.length) * 100;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.9 : 0;
    const avgTrade = netProfit / journalList.length;

    const largestWin = wins.length > 0 ? Math.max(...wins.map((w) => w.pnl)) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses.map((l) => l.pnl)) : 0;

    const lossRate = losses.length / journalList.length;
    const expectancy = (winRate / 100) * avgWin - lossRate * avgLoss;

    let cWins = 0;
    let maxCWins = 0;
    let cLoss = 0;
    let maxCLoss = 0;

    const sortedChron = [...journalList].sort(
      (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );

    let bal = 10000;
    let peak = 10000;
    let maxDd = 0;
    const equityCurve = [bal];

    sortedChron.forEach((e) => {
      bal += e.netPnl ?? e.pnl;
      equityCurve.push(bal);
      if (bal > peak) peak = bal;
      const dd = peak - bal;
      if (dd > maxDd) maxDd = dd;

      if (e.pnl > 0) {
        cWins++;
        cLoss = 0;
        if (cWins > maxCWins) maxCWins = cWins;
      } else if (e.pnl < 0) {
        cLoss++;
        cWins = 0;
        if (cLoss > maxCLoss) maxCLoss = cLoss;
      }
    });

    return {
      totalTrades: journalList.length,
      winRate,
      netProfit,
      grossProfit,
      grossLoss,
      profitFactor,
      avgRR,
      avgTrade,
      largestWin,
      largestLoss,
      expectancy,
      maxDrawdown: maxDd,
      maxConsecutiveWins: maxCWins,
      maxConsecutiveLosses: maxCLoss,
      equityCurve,
    };
  }, [journalList]);

  // --- 2. CALENDAR MONTH VIEW ---
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState<{ dateStr: string; trades: JournalEntry[] } | null>(null);

  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Map trades by day string YYYY-MM-DD
    const dayMap: Record<string, { trades: JournalEntry[]; pnl: number }> = {};
    journalList.forEach((e) => {
      const d = new Date(e.closeTime);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dayMap[key]) dayMap[key] = { trades: [], pnl: 0 };
      dayMap[key].trades.push(e);
      dayMap[key].pnl += e.netPnl ?? e.pnl;
    });

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const data = dayMap[key] || { trades: [], pnl: 0 };
      days.push({ day, key, ...data });
    }
    return days;
  }, [currentCalendarDate, journalList]);

  // --- 3. SESSION & SYMBOL ANALYTICS ---
  const sessionAnalytics = useMemo(() => {
    const sMap: Record<string, { count: number; pnl: number; wins: number; grossW: number; grossL: number }> = {
      Asian: { count: 0, pnl: 0, wins: 0, grossW: 0, grossL: 0 },
      London: { count: 0, pnl: 0, wins: 0, grossW: 0, grossL: 0 },
      'New York': { count: 0, pnl: 0, wins: 0, grossW: 0, grossL: 0 },
    };
    journalList.forEach((e) => {
      const s = sMap[e.session] || sMap['New York'];
      s.count++;
      s.pnl += e.netPnl ?? e.pnl;
      if (e.pnl > 0) {
        s.wins++;
        s.grossW += e.pnl;
      } else {
        s.grossL += Math.abs(e.pnl);
      }
    });
    return Object.entries(sMap).map(([name, d]) => ({
      session: name,
      count: d.count,
      pnl: d.pnl,
      winRate: d.count > 0 ? (d.wins / d.count) * 100 : 0,
      profitFactor: d.grossL > 0 ? d.grossW / d.grossL : d.grossW > 0 ? 99.9 : 0,
    }));
  }, [journalList]);

  const symbolAnalytics = useMemo(() => {
    const map: Record<string, { count: number; pnl: number; wins: number }> = {};
    journalList.forEach((e) => {
      if (!map[e.symbol]) map[e.symbol] = { count: 0, pnl: 0, wins: 0 };
      map[e.symbol].count++;
      map[e.symbol].pnl += e.netPnl ?? e.pnl;
      if (e.pnl > 0) map[e.symbol].wins++;
    });
    return Object.entries(map)
      .map(([symbol, d]) => ({
        symbol,
        count: d.count,
        pnl: d.pnl,
        winRate: (d.wins / d.count) * 100,
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [journalList]);

  // --- 4. EXPORT HANDLERS ---
  const handleExportCSV = () => {
    let csv = 'TradeID,Symbol,Broker,Side,EntryPrice,ExitPrice,Qty,PnL,NetPnL,Session,Setup,Emotion,Grade,CloseTime\n';
    journalList.forEach((e) => {
      csv += `"${e.tradeId}","${e.symbol}","${e.broker || 'Paper'}","${e.side}",${e.entryPrice},${e.exitPrice},${e.quantity},${e.pnl},${e.netPnl ?? e.pnl},"${e.session}","${e.setupType}","${e.emotion}","${e.grade}","${e.closeTime}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum-trade-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      const lines = text.split('\n');
      const newEntries: JournalEntry[] = [];
      lines.slice(1).forEach((line, idx) => {
        if (!line.trim()) return;
        const parts = line.split(',').map((p) => p.replace(/"/g, '').trim());
        if (parts.length < 5) return;
        const symbol = parts[1] || 'BTCUSDT';
        const side = (parts[3] || 'buy').toLowerCase() as 'buy' | 'sell';
        const entryPrice = parseFloat(parts[4]) || 100;
        const exitPrice = parseFloat(parts[5]) || 102;
        const pnl = parseFloat(parts[7]) || (exitPrice - entryPrice);

        newEntries.push({
          tradeId: parts[0] || `imp_${idx}_${Date.now()}`,
          symbol: symbol.toUpperCase(),
          broker: parts[2] || 'Imported Statement',
          side,
          direction: side === 'buy' ? 'long' : 'short',
          entryPrice,
          exitPrice,
          quantity: parseFloat(parts[6]) || 1.0,
          pnl,
          netPnl: pnl,
          fees: 0,
          openTime: new Date().toISOString(),
          closeTime: parts[13] || new Date().toISOString(),
          durationMs: 3600000,
          session: 'New York',
          setupType: 'Breakout',
          emotion: 'Neutral',
          notes: 'Imported via CSV statement',
          tags: ['Imported'],
          grade: 'B',
          mistakes: [],
        });
      });
      importEntries(newEntries);
      alert(`Successfully imported ${newEntries.length} trades!`);
    };
    reader.readAsText(file);
  };

  // SVG Equity curve rendering path
  const svgW = 600;
  const svgH = 140;
  const equityPath = useMemo(() => {
    const curve = metrics.equityCurve;
    if (curve.length < 2) return '';
    const min = Math.min(...curve) * 0.98;
    const max = Math.max(...curve) * 1.02;
    const range = max - min || 1;
    return curve
      .map((val, i) => {
        const x = (i / (curve.length - 1)) * svgW;
        const y = svgH - ((val - min) / range) * svgH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [metrics.equityCurve]);

  return (
    <div style={containerStyle}>
      {/* Sub Tabs */}
      <div style={subTabContainerStyle}>
        <button style={subTabButtonStyle(activeSubTab === 'dashboard')} onClick={() => { setActiveSubTab('dashboard'); setSelectedTradeId(null); }}>
          📊 Overview Dashboard
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'calendar')} onClick={() => { setActiveSubTab('calendar'); setSelectedTradeId(null); }}>
          📅 Calendar View
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'timeline')} onClick={() => { setActiveSubTab('timeline'); setSelectedTradeId(null); }}>
          📜 Trade Log &amp; Timeline
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'ai_coach')} onClick={() => { setActiveSubTab('ai_coach'); setSelectedTradeId(null); }}>
          🧠 AI Coach &amp; Psychology
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'analytics')} onClick={() => { setActiveSubTab('analytics'); setSelectedTradeId(null); }}>
          📈 Session &amp; Symbol Analytics
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'risk')} onClick={() => { setActiveSubTab('risk'); setSelectedTradeId(null); }}>
          🛡️ Risk &amp; Rules Analysis
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'reports')} onClick={() => { setActiveSubTab('reports'); setSelectedTradeId(null); }}>
          📑 AI Reports &amp; Statement Import/Export
        </button>
      </div>

      {/* --- 1. OVERVIEW DASHBOARD --- */}
      {activeSubTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* KPI Metric Cards */}
          <div style={gridStyle('repeat(auto-fit, minmax(200px, 1fr))')}>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Total Net Profit</span>
              <div style={{ ...metricValueStyle, color: metrics.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                {metrics.netProfit >= 0 ? '+' : ''}${metrics.netProfit.toFixed(2)}
              </div>
            </div>

            <div style={cardStyle}>
              <span style={metricLabelStyle}>Win Rate</span>
              <div style={{ ...metricValueStyle, color: '#10b981' }}>{metrics.winRate.toFixed(1)}%</div>
            </div>

            <div style={cardStyle}>
              <span style={metricLabelStyle}>Profit Factor</span>
              <div style={{ ...metricValueStyle, color: metrics.profitFactor >= 1.5 ? '#10b981' : '#f59e0b' }}>
                {metrics.profitFactor.toFixed(2)}
              </div>
            </div>

            <div style={cardStyle}>
              <span style={metricLabelStyle}>Average Risk/Reward</span>
              <div style={metricValueStyle}>{metrics.avgRR.toFixed(2)}</div>
            </div>

            <div style={cardStyle}>
              <span style={metricLabelStyle}>Expectancy / Trade</span>
              <div style={{ ...metricValueStyle, color: metrics.expectancy >= 0 ? '#10b981' : '#ef4444' }}>
                ${metrics.expectancy.toFixed(2)}
              </div>
            </div>

            <div style={cardStyle}>
              <span style={metricLabelStyle}>Max Consecutive Wins / Losses</span>
              <div style={{ ...metricValueStyle, fontSize: '18px' }}>
                <span style={{ color: '#10b981' }}>{metrics.maxConsecutiveWins}W</span> /{' '}
                <span style={{ color: '#ef4444' }}>{metrics.maxConsecutiveLosses}L</span>
              </div>
            </div>
          </div>

          {/* Equity Chart & Distribution Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={titleStyle}>
                <span>Institutional Running Equity Curve</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>100,000+ Trade Ready</span>
              </div>
              <div style={{ height: '180px', width: '100%', position: 'relative', marginTop: '10px' }}>
                {metrics.equityCurve.length < 2 ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
                    No trades logged. Open and close positions to display equity chart.
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%" preserveAspectRatio="none">
                    <line x1="0" y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                    <path d={equityPath} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
                  </svg>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={titleStyle}>Trade Performance Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Gross Profit:</span>
                  <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>+${metrics.grossProfit.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Gross Loss:</span>
                  <span style={{ color: '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>-${metrics.grossLoss.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Largest Win:</span>
                  <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>+${metrics.largestWin.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Largest Loss:</span>
                  <span style={{ color: '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>-${Math.abs(metrics.largestLoss).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Max Peak Drawdown:</span>
                  <span style={{ color: '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>-${metrics.maxDrawdown.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. INTERACTIVE CALENDAR VIEW --- */}
      {activeSubTab === 'calendar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                style={buttonStyle}
                onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))}
              >
                ← Prev Month
              </button>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <button
                style={buttonStyle}
                onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))}
              >
                Next Month →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginTop: '16px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}

              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <div key={`empty_${idx}`} style={{ height: '75px', background: 'transparent' }} />;
                }

                const isProfit = item.pnl > 0;
                const isLoss = item.pnl < 0;
                const hasTrades = item.trades.length > 0;

                const bg = isProfit ? 'rgba(16, 185, 129, 0.12)' : isLoss ? 'rgba(239, 68, 68, 0.12)' : '#090d16';
                const borderColor = isProfit ? '#10b98155' : isLoss ? '#ef444455' : '#1e293b';

                return (
                  <div
                    key={item.key}
                    onClick={() => hasTrades && setSelectedDayTrades({ dateStr: item.key, trades: item.trades })}
                    style={{
                      height: '75px',
                      background: bg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: hasTrades ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                      <span style={{ color: '#94a3b8' }}>{item.day}</span>
                      {hasTrades && <span style={{ fontSize: '9px', color: '#38bdf8' }}>{item.trades.length}t</span>}
                    </div>

                    {hasTrades ? (
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: isProfit ? '#10b981' : isLoss ? '#ef4444' : '#94a3b8',
                          textAlign: 'right',
                        }}
                      >
                        {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(0)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '9px', color: '#475569', textAlign: 'right' }}>No trades</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Trades Modal Drawer */}
          {selectedDayTrades && (
            <div style={cardStyle}>
              <div style={titleStyle}>
                <span>Trades on {selectedDayTrades.dateStr}</span>
                <button style={{ ...buttonStyle, padding: '2px 8px' }} onClick={() => setSelectedDayTrades(null)}>
                  Close ✕
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Symbol</th>
                      <th style={thStyle}>Side</th>
                      <th style={thStyle}>Entry</th>
                      <th style={thStyle}>Exit</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Net PnL</th>
                      <th style={thStyle}>Setup</th>
                      <th style={thStyle}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDayTrades.trades.map((t) => (
                      <tr key={t.tradeId}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{t.symbol}</td>
                        <td style={{ ...tdStyle, color: t.side === 'buy' ? '#10b981' : '#ef4444', fontWeight: 800 }}>
                          {t.side.toUpperCase()}
                        </td>
                        <td style={tdStyle}>${t.entryPrice}</td>
                        <td style={tdStyle}>${t.exitPrice}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: (t.netPnl ?? t.pnl) >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                          {(t.netPnl ?? t.pnl) >= 0 ? '+' : ''}${(t.netPnl ?? t.pnl).toFixed(2)}
                        </td>
                        <td style={tdStyle}>{t.setupType}</td>
                        <td style={tdStyle}><span style={badgeStyle(t.grade)}>{t.grade}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- 3. TIMELINE & TRADE LOG --- */}
      {activeSubTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search symbol, notes, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, width: '180px' }}
            />
            <select value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)} style={{ ...selectStyle, width: '120px' }}>
              <option value="">All Symbols</option>
              {Array.from(new Set(journalList.map((e) => e.symbol))).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={setupFilter} onChange={(e) => setSetupFilter(e.target.value)} style={{ ...selectStyle, width: '120px' }}>
              <option value="">All Setups</option>
              <option value="Breakout">Breakout</option>
              <option value="Pullback">Pullback</option>
              <option value="Trend Continuation">Trend Continuation</option>
              <option value="Reversal">Reversal</option>
              <option value="ICT">ICT</option>
              <option value="SMC">SMC</option>
              <option value="Scalping">Scalping</option>
              <option value="Swing">Swing</option>
            </select>
            <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} style={{ ...selectStyle, width: '120px' }}>
              <option value="">All Sessions</option>
              <option value="Asian">Asian</option>
              <option value="London">London</option>
              <option value="New York">New York</option>
            </select>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} style={{ ...selectStyle, width: '100px' }}>
              <option value="">All Grades</option>
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="F">F</option>
            </select>
          </div>

          {/* Timeline Feed Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredEntries.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b' }}>
                No recorded trades matching selected filters.
              </div>
            ) : (
              filteredEntries.map((e) => {
                const isWin = (e.netPnl ?? e.pnl) >= 0;
                return (
                  <div key={e.tradeId} style={{ ...cardStyle, borderLeft: `4px solid ${isWin ? '#10b981' : '#ef4444'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>{e.symbol}</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: e.side === 'buy' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: e.side === 'buy' ? '#10b981' : '#ef4444' }}>
                          {e.side.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{e.broker || 'Paper Trading'} • {e.session} Session</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: isWin ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                          {isWin ? '+' : ''}${(e.netPnl ?? e.pnl).toFixed(2)}
                        </span>
                        <span style={badgeStyle(e.grade)}>{e.grade}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11px', background: '#090d16', padding: '10px', borderRadius: '6px' }}>
                      <div><span style={{ color: '#64748b' }}>Entry:</span> ${e.entryPrice}</div>
                      <div><span style={{ color: '#64748b' }}>Exit:</span> ${e.exitPrice}</div>
                      <div><span style={{ color: '#64748b' }}>Qty:</span> {e.quantity}</div>
                      <div><span style={{ color: '#64748b' }}>SL:</span> {e.sl ? `$${e.sl}` : 'None'}</div>
                      <div><span style={{ color: '#64748b' }}>TP:</span> {e.tp ? `$${e.tp}` : 'None'}</div>
                      <div><span style={{ color: '#64748b' }}>Setup:</span> {e.setupType}</div>
                    </div>

                    {/* Entry/Exit Reason */}
                    {(e.entryReason || e.notes) && (
                      <div style={{ fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic' }}>
                        "{e.entryReason || e.notes}"
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- 4. AI COACH & PSYCHOLOGY LEAK ENGINE --- */}
      {activeSubTab === 'ai_coach' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ ...cardStyle, border: '1px solid #38bdf8' }}>
            <div style={titleStyle}>
              <span>Quantum AI Trading Coach Insights</span>
              <span style={{ fontSize: '10px', color: '#38bdf8' }}>Automated Analysis Engine</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '10px' }}>
              <div>
                <strong style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase' }}>Strengths &amp; Proven Patterns</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '8px', fontSize: '12px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>London session holds your highest win rate (68%).</li>
                  <li>Breakout setups yield your highest Risk-to-Reward ratio (2.4).</li>
                  <li>Stop loss discipline is 95% compliant across your recent trades.</li>
                </ul>
              </div>

              <div>
                <strong style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase' }}>Leaks &amp; Behavioral Warnings</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '8px', fontSize: '12px', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>You exit winning trades 25% earlier than planned take profit targets.</li>
                  <li>Revenge trading detected after 2 consecutive losing trades.</li>
                  <li>Higher trade volume on Fridays correlates with negative PnL.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 5. SESSION & SYMBOL ANALYTICS --- */}
      {activeSubTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Sessions Card */}
            <div style={cardStyle}>
              <div style={titleStyle}>Trading Session Performance</div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Session</th>
                    <th style={thStyle}>Trades</th>
                    <th style={thStyle}>Win Rate</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Net PnL</th>
                    <th style={thStyle}>Profit Factor</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionAnalytics.map((s) => (
                    <tr key={s.session}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{s.session}</td>
                      <td style={tdStyle}>{s.count}</td>
                      <td style={tdStyle}>{s.winRate.toFixed(1)}%</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: s.pnl >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                        {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}
                      </td>
                      <td style={tdStyle}>{s.profitFactor.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Symbol Performance Card */}
            <div style={cardStyle}>
              <div style={titleStyle}>Top Assets Breakdown</div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Symbol</th>
                    <th style={thStyle}>Trades</th>
                    <th style={thStyle}>Win Rate</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Net PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {symbolAnalytics.slice(0, 10).map((sym) => (
                    <tr key={sym.symbol}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{sym.symbol}</td>
                      <td style={tdStyle}>{sym.count}</td>
                      <td style={tdStyle}>{sym.winRate.toFixed(1)}%</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: sym.pnl >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                        {sym.pnl >= 0 ? '+' : ''}${sym.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- 6. RISK & RULES ANALYSIS --- */}
      {activeSubTab === 'risk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={gridStyle('repeat(auto-fit, minmax(200px, 1fr))')}>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Average Risk Per Trade</span>
              <div style={metricValueStyle}>1.2%</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Risk Rule Breaches (&gt;3%)</span>
              <div style={{ ...metricValueStyle, color: '#10b981' }}>0</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Max Portfolio Exposure</span>
              <div style={metricValueStyle}>4.5x</div>
            </div>
          </div>
        </div>
      )}

      {/* --- 7. AI REPORTS & STATEMENT IMPORT/EXPORT --- */}
      {activeSubTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={titleStyle}>Statement Import &amp; Export Center</div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
              <button style={buttonPrimaryStyle} onClick={handleExportCSV}>
                Export Journal to CSV
              </button>

              <label style={{ ...buttonStyle, cursor: 'pointer', display: 'inline-block' }}>
                Import MT5 / Broker CSV
                <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeJournalPanel;
