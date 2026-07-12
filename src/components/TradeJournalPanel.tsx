import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useJournalStore, JournalEntry, GradeType, EmotionType, SetupType, MistakeType, DailyJournalData } from '../store/journalStore';
import { detectJournalMistakes, DetectedMistake } from '../services/mistakeDetector';
import { generateAIReview } from '../services/aiReview';
import { analyzeStreaks, analyzeSetups, analyzeMistakes } from '../services/journalAnalyzer';

const containerStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '16px',
  overflowY: 'auto',
  backgroundColor: '#070b14',
  color: '#f5f5f7',
  fontFamily: 'var(--font-sans)',
};

const subTabContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  borderBottom: '1px solid #1b2235',
  paddingBottom: '8px',
};

const subTabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: '4px',
  background: active ? '#d4af37' : 'transparent',
  border: active ? '1px solid #d4af37' : '1px solid #1b2235',
  color: active ? '#070b14' : '#f5f5f7',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  transition: 'all 0.15s ease',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '16px',
};

const cardStyle: React.CSSProperties = {
  background: '#0d1322',
  border: '1px solid #1b2235',
  borderRadius: '6px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#d4af37',
  borderBottom: '1px solid #1b2235',
  paddingBottom: '6px',
  letterSpacing: '0.04em',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#8e8e93',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
  color: '#f5f5f7',
  fontFamily: 'var(--font-mono)',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '12px',
  backgroundColor: '#070b14',
  border: '1px solid #1b2235',
  borderRadius: '4px',
  color: '#f5f5f7',
  outline: 'none',
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: '4px',
  background: '#0d1322',
  border: '1px solid #1b2235',
  color: '#f5f5f7',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const buttonPrimaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#d4af37',
  color: '#070b14',
  border: '1px solid #d4af37',
};

const dropZoneStyle: React.CSSProperties = {
  border: '2px dashed #1b2235',
  borderRadius: '6px',
  padding: '12px',
  textAlign: 'center',
  cursor: 'pointer',
  fontSize: '10px',
  color: '#8e8e93',
  background: '#070b14',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  minHeight: '120px',
};

const badgeStyle = (grade: GradeType): React.CSSProperties => {
  let bg = 'rgba(255,255,255,0.05)';
  let color = '#f5f5f7';
  if (grade.startsWith('A')) {
    bg = 'rgba(0, 192, 118, 0.1)';
    color = '#00c076';
  } else if (grade === 'B') {
    bg = 'rgba(33, 150, 243, 0.1)';
    color = '#2196F3';
  } else if (grade === 'C') {
    bg = 'rgba(255, 193, 7, 0.1)';
    color = '#FFC107';
  } else if (grade === 'F') {
    bg = 'rgba(255, 77, 87, 0.1)';
    color = '#ff4d57';
  }
  return {
    padding: '2px 6px',
    borderRadius: '3px',
    fontWeight: 700,
    fontSize: '9px',
    backgroundColor: bg,
    color,
    display: 'inline-block',
  };
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px', // Header requirement hierarchy
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: '9px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#8e8e93',
  borderBottom: '1px solid #1b2235',
  background: '#0d1322',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #1b2235',
  color: '#f5f5f7',
};

const fmt = (val: number) =>
  val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TradeJournalPanel: React.FC = () => {
  const history = useAppStore((s) => s.history);
  const { entries, dailyJournals, updateEntry, setDailyJournal, getOrCreateEntry } = useJournalStore();

  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'logger' | 'daily' | 'weekly' | 'ai_review'>(() => {
    try {
      const saved = localStorage.getItem('journal-sub-tab');
      if (saved) return saved as any;
    } catch {}
    return 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('journal-sub-tab', activeSubTab);
  }, [activeSubTab]);

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);

  const activeEntry = useMemo(() => {
    if (!selectedTradeId) return null;
    return entries[selectedTradeId] || null;
  }, [selectedTradeId, entries]);

  // Sync entries
  const journalList = useMemo(() => {
    return history.map((t) => getOrCreateEntry(t));
  }, [history, getOrCreateEntry]);

  // Filters
  const [search, setSearch] = useState(() => localStorage.getItem('j-filter-search') || '');
  const [symbolFilter, setSymbolFilter] = useState(() => localStorage.getItem('j-filter-symbol') || '');
  const [setupFilter, setSetupFilter] = useState(() => localStorage.getItem('j-filter-setup') || '');
  const [gradeFilter, setGradeFilter] = useState(() => localStorage.getItem('j-filter-grade') || '');

  useEffect(() => {
    localStorage.setItem('j-filter-search', search);
    localStorage.setItem('j-filter-symbol', symbolFilter);
    localStorage.setItem('j-filter-setup', setupFilter);
    localStorage.setItem('j-filter-grade', gradeFilter);
  }, [search, symbolFilter, setupFilter, gradeFilter]);

  const filteredEntries = useMemo(() => {
    return journalList.filter((e) => {
      if (symbolFilter && e.symbol !== symbolFilter) return false;
      if (setupFilter && e.setupType !== setupFilter) return false;
      if (gradeFilter && e.grade !== gradeFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        const matchesNotes = e.notes.toLowerCase().includes(query) || (e.entryReason || '').toLowerCase().includes(query);
        const matchesTags = e.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesNotes && !matchesTags) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
  }, [journalList, symbolFilter, setupFilter, gradeFilter, search]);

  // --- 1. DASHBOARD METRICS ---
  const dashboardStats = useMemo(() => {
    if (journalList.length === 0) {
      return {
        winRate: 0,
        profitFactor: 0,
        expectancy: 0,
        avgRR: 0,
        largestWin: 0,
        largestLoss: 0,
        monthlyPnl: 0,
        equityCurve: [] as number[],
      };
    }

    const pnlList = journalList.map((e) => e.pnl);
    const wins = pnlList.filter((v) => v > 0);
    const losses = pnlList.filter((v) => v < 0);

    const winRate = (wins.length / journalList.length) * 100;

    const grossProfit = wins.reduce((a, b) => a + b, 0);
    const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    const expectancy = pnlList.reduce((a, b) => a + b, 0) / journalList.length;

    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.9 : 0;

    const largestWin = wins.length > 0 ? Math.max(...wins) : 0;
    const largestLoss = losses.length > 0 ? Math.min(...losses) : 0;

    // Monthly PnL (for current calendar month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyPnl = journalList
      .filter((e) => {
        const d = new Date(e.closeTime);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, e) => acc + e.pnl, 0);

    // Equity Curve running points
    const sorted = [...journalList].sort(
      (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );
    let bal = 10000;
    const equityCurve = [bal];
    sorted.forEach((e) => {
      bal += e.pnl;
      equityCurve.push(bal);
    });

    return {
      winRate,
      profitFactor,
      expectancy,
      avgRR,
      largestWin,
      largestLoss,
      monthlyPnl,
      equityCurve,
    };
  }, [journalList]);

  // --- 2. DAILY PLANNER STATE ---
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [morningPlan, setMorningPlan] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [endOfDaySummary, setEndOfDaySummary] = useState('');

  // Load daily values
  useEffect(() => {
    const daily = dailyJournals[todayStr] || { morningPlan: '', lessonsLearned: '', endOfDaySummary: '' };
    setMorningPlan(daily.morningPlan);
    setLessonsLearned(daily.lessonsLearned);
    setEndOfDaySummary(daily.endOfDaySummary);
  }, [dailyJournals, todayStr]);

  const saveDailyJournal = () => {
    setDailyJournal(todayStr, { morningPlan, lessonsLearned, endOfDaySummary });
    alert('Daily Journal entry successfully saved!');
  };

  // --- 3. WEEKLY REVIEW METRICS ---
  const weeklyReviewStats = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyTrades = journalList.filter(
      (e) => new Date(e.closeTime).getTime() >= sevenDaysAgo
    );

    if (weeklyTrades.length === 0) {
      return {
        tradeCount: 0,
        winRate: 0,
        bestSetup: 'N/A',
        worstSetup: 'N/A',
        mostTraded: 'N/A',
        mostProfitable: 'N/A',
        avgHoldingTime: '0m',
        largestDrawdown: 0,
        weeklyCurve: [10000],
      };
    }

    const wins = weeklyTrades.filter((t) => t.pnl > 0);
    const winRate = (wins.length / weeklyTrades.length) * 100;

    // Setups breakdown
    const setupPnLs: Record<string, number> = {};
    const setupCounts: Record<string, number> = {};
    weeklyTrades.forEach((t) => {
      setupPnLs[t.setupType] = (setupPnLs[t.setupType] || 0) + t.pnl;
      setupCounts[t.setupType] = (setupCounts[t.setupType] || 0) + 1;
    });

    let bestSetup = 'N/A';
    let worstSetup = 'N/A';
    let maxSetup = -Infinity;
    let minSetup = Infinity;
    Object.entries(setupPnLs).forEach(([setup, pnl]) => {
      if (pnl > maxSetup) {
        maxSetup = pnl;
        bestSetup = setup;
      }
      if (pnl < minSetup) {
        minSetup = pnl;
        worstSetup = setup;
      }
    });

    // Asset analysis
    const assetPnLs: Record<string, number> = {};
    const assetCounts: Record<string, number> = {};
    weeklyTrades.forEach((t) => {
      assetPnLs[t.symbol] = (assetPnLs[t.symbol] || 0) + t.pnl;
      assetCounts[t.symbol] = (assetCounts[t.symbol] || 0) + 1;
    });

    let mostTraded = 'N/A';
    let maxTraded = 0;
    Object.entries(assetCounts).forEach(([sym, count]) => {
      if (count > maxTraded) {
        maxTraded = count;
        mostTraded = sym;
      }
    });

    let mostProfitable = 'N/A';
    let maxProfPnl = -Infinity;
    Object.entries(assetPnLs).forEach(([sym, pnl]) => {
      if (pnl > maxProfPnl) {
        maxProfPnl = pnl;
        mostProfitable = sym;
      }
    });

    // Average holding time
    const avgHoldingTimeMs = weeklyTrades.reduce((acc, t) => acc + t.durationMs, 0) / weeklyTrades.length;
    const h = Math.floor(avgHoldingTimeMs / 3600000);
    const m = Math.floor((avgHoldingTimeMs % 3600000) / 60000);
    const avgHoldingTime = h > 0 ? `${h}h ${m}m` : `${m}m`;

    // Largest Drawdown during the week
    let peak = 10000;
    let currentBalance = 10000;
    let maxDd = 0;
    const weeklyCurve = [currentBalance];

    const sortedWeekly = [...weeklyTrades].sort(
      (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );

    sortedWeekly.forEach((t) => {
      currentBalance += t.pnl;
      weeklyCurve.push(currentBalance);
      if (currentBalance > peak) peak = currentBalance;
      const dd = peak - currentBalance;
      if (dd > maxDd) maxDd = dd;
    });

    return {
      tradeCount: weeklyTrades.length,
      winRate,
      bestSetup,
      worstSetup,
      mostTraded,
      mostProfitable,
      avgHoldingTime,
      largestDrawdown: maxDd,
      weeklyCurve,
    };
  }, [journalList]);

  // --- 4. DETECTED MISTAKES AND OBSERVATIONS ---
  const mistakesReport = useMemo(() => {
    return detectJournalMistakes(journalList);
  }, [journalList]);

  const coachObservations = useMemo(() => {
    return generateAIReview(journalList);
  }, [journalList]);

  // --- 5. IMAGE UPLOADER HANDLERS ---
  const handleImageFile = (file: File, field: 'screenshotBefore' | 'screenshotDuring' | 'screenshotAfter') => {
    if (!selectedTradeId) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateEntry(selectedTradeId, { [field]: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, field: 'screenshotBefore' | 'screenshotDuring' | 'screenshotAfter') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file, field);
    }
  };

  // --- 6. EXPORTERS ---
  const exportPDFReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = '';
    filteredEntries.forEach((e) => {
      tableRows += `
        <tr>
          <td>${e.symbol}</td>
          <td>${e.side.toUpperCase()}</td>
          <td>$${e.entryPrice.toFixed(2)}</td>
          <td>$${e.exitPrice.toFixed(2)}</td>
          <td>$${e.pnl.toFixed(2)}</td>
          <td>${e.setupType}</td>
          <td>${e.emotion}</td>
          <td>${e.grade}</td>
        </tr>
      `;
    });

    let AIHtml = '';
    coachObservations.suggestions.forEach((s) => {
      AIHtml += `<li>${s}</li>`;
    });

    const htmlContent = `
      <html>
        <head>
          <title>AI Trade Journal Report</title>
          <style>
            body { font-family: Inter, sans-serif; background: #ffffff; color: #111; padding: 24px; }
            h1 { color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; font-size: 11px; text-align: left; }
            th { background: #f4f4f4; }
          </style>
        </head>
        <body>
          <h1>AI Trade Journal Monthly Performance Report</h1>
          <p>Generated: ${new Date().toLocaleDateString()}</p>
          <h3>Coach Recommendations</h3>
          <ul>${AIHtml}</ul>
          <h3>Journaled Closed Trades List</h3>
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>PnL</th>
                <th>Setup</th>
                <th>Emotion</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const exportCSVReport = () => {
    let csv = 'Symbol,Side,Entry,Exit,Qty,PnL,Setup,Emotion,Grade,Entry Reason,ExitReason\n';
    filteredEntries.forEach((e) => {
      csv += `${e.symbol},${e.side},${e.entryPrice},${e.exitPrice},${e.quantity},${e.pnl},${e.setupType},${e.emotion},${e.grade},"${(e.entryReason || '').replace(/"/g, '""')}","${(e.exitReason || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trade-journal-report.csv';
    a.click();
  };

  // SVG dimensions for running curves
  const svgW = 500;
  const svgH = 120;

  const minMaxEquity = useMemo(() => {
    const arr = dashboardStats.equityCurve;
    if (arr.length === 0) return { min: 9000, max: 11000 };
    const min = Math.min(...arr, 9500);
    const max = Math.max(...arr, 10500);
    const pad = (max - min) * 0.1 || 200;
    return { min: min - pad, max: max + pad };
  }, [dashboardStats]);

  const dashboardEquityPath = useMemo(() => {
    const data = dashboardStats.equityCurve;
    if (data.length < 2) return '';
    return data.map((val, i) => {
      const x = (i / (data.length - 1)) * svgW;
      const range = minMaxEquity.max - minMaxEquity.min || 1;
      const y = svgH - ((val - minMaxEquity.min) / range) * svgH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [dashboardStats, minMaxEquity]);

  // Session monitor values
  const sessionStats = useMemo(() => {
    const sMap = {
      Asian: { count: 0, wins: 0, pnl: 0, grossWins: 0, grossLosses: 0 },
      London: { count: 0, wins: 0, pnl: 0, grossWins: 0, grossLosses: 0 },
      'New York': { count: 0, wins: 0, pnl: 0, grossWins: 0, grossLosses: 0 },
    };

    journalList.forEach((e) => {
      const s = sMap[e.session];
      if (s) {
        s.count++;
        s.pnl += e.pnl;
        if (e.pnl > 0) {
          s.wins++;
          s.grossWins += e.pnl;
        } else {
          s.grossLosses += Math.abs(e.pnl);
        }
      }
    });

    return Object.entries(sMap).map(([name, data]) => {
      const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
      const profitFactor = data.grossLosses > 0 ? data.grossWins / data.grossLosses : data.grossWins > 0 ? 99.9 : 0;
      return { name, ...data, winRate, profitFactor };
    });
  }, [journalList]);

  // Unique symbols list for filters
  const symbolsList = useMemo(() => {
    return Array.from(new Set(history.map((t) => t.symbol)));
  }, [history]);

  return (
    <div style={containerStyle}>
      {/* Sub Tabs Navigation */}
      <div style={subTabContainerStyle}>
        <button style={subTabButtonStyle(activeSubTab === 'dashboard')} onClick={() => setActiveSubTab('dashboard')}>
          Dashboard
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'logger')} onClick={() => setActiveSubTab('logger')}>
          Journal Logger
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'daily')} onClick={() => setActiveSubTab('daily')}>
          Daily Planner
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'weekly')} onClick={() => setActiveSubTab('weekly')}>
          Weekly Review
        </button>
        <button style={subTabButtonStyle(activeSubTab === 'ai_review')} onClick={() => setActiveSubTab('ai_review')}>
          AI Review &amp; Leak Coach
        </button>
      </div>

      {/* --- DASHBOARD VIEW --- */}
      {activeSubTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={gridStyle}>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Win Rate</span>
              <div style={{ ...metricValueStyle, color: '#00c076' }}>{dashboardStats.winRate.toFixed(1)}%</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Profit Factor</span>
              <div style={{ ...metricValueStyle, color: dashboardStats.profitFactor >= 1.5 ? '#00c076' : '#ff4d57' }}>
                {dashboardStats.profitFactor.toFixed(2)}
              </div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Expectancy</span>
              <div style={metricValueStyle}>${dashboardStats.expectancy.toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Average R:R</span>
              <div style={metricValueStyle}>{dashboardStats.avgRR.toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Largest Win</span>
              <div style={{ ...metricValueStyle, color: '#00c076' }}>+${dashboardStats.largestWin.toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Largest Loss</span>
              <div style={{ ...metricValueStyle, color: '#ff4d57' }}>-${Math.abs(dashboardStats.largestLoss).toFixed(2)}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Monthly Net P&amp;L</span>
              <div style={{ ...metricValueStyle, color: dashboardStats.monthlyPnl >= 0 ? '#00c076' : '#ff4d57' }}>
                {dashboardStats.monthlyPnl >= 0 ? '+' : ''}${dashboardStats.monthlyPnl.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Running Equity Curve */}
            <div style={cardStyle}>
              <span style={titleStyle}>Trading Running Equity Curve</span>
              <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                {dashboardStats.equityCurve.length < 2 ? (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#8e8e93', fontSize: '11px' }}>
                    No trades logged to display running curve.
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height="100%" preserveAspectRatio="none">
                    <line x1="0" y1={svgH / 2} x2={svgW} y2={svgH / 2} stroke="#1b2235" strokeWidth="0.5" strokeDasharray="3,3" />
                    <path d={dashboardEquityPath} fill="none" stroke="#d4af37" strokeWidth="2" />
                  </svg>
                )}
              </div>
            </div>

            {/* Session stats monitor */}
            <div style={cardStyle}>
              <span style={titleStyle}>Session Monitor Analysis</span>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '4px', textAlign: 'left', color: '#8e8e93' }}>Session</th>
                    <th style={{ padding: '4px', textAlign: 'right', color: '#8e8e93' }}>Trades</th>
                    <th style={{ padding: '4px', textAlign: 'right', color: '#8e8e93' }}>Win Rate</th>
                    <th style={{ padding: '4px', textAlign: 'right', color: '#8e8e93' }}>Net P&amp;L</th>
                    <th style={{ padding: '4px', textAlign: 'right', color: '#8e8e93' }}>PF</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionStats.map((s) => (
                    <tr key={s.name}>
                      <td style={{ padding: '6px 4px', fontWeight: 700 }}>{s.name}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{s.count}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{s.count > 0 ? `${s.winRate.toFixed(1)}%` : '-'}</td>
                      <td style={{ padding: '6px 4px', textAlign: 'right', color: s.pnl >= 0 ? '#00c076' : '#ff4d57', fontWeight: 700 }}>
                        {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(0)}
                      </td>
                      <td style={{ padding: '6px 4px', textAlign: 'right' }}>{s.count > 0 ? s.profitFactor.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- DAILY PLANNER VIEW --- */}
      {activeSubTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={titleStyle}>Daily Planner &amp; Reflection ({todayStr})</span>
              <button style={buttonPrimaryStyle} onClick={saveDailyJournal}>
                Save Daily Journal
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#8e8e93', fontWeight: 700, textTransform: 'uppercase' }}>Morning plan &amp; Setup Criteria</span>
                <textarea
                  placeholder="Define assets to watch, news releases to avoid, and entry rules..."
                  rows={3}
                  value={morningPlan}
                  onChange={(e) => setMorningPlan(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#8e8e93', fontWeight: 700, textTransform: 'uppercase' }}>Lessons learned</span>
                <textarea
                  placeholder="What did the market teach you today? Any slippage or timing lessons?"
                  rows={3}
                  value={lessonsLearned}
                  onChange={(e) => setLessonsLearned(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#8e8e93', fontWeight: 700, textTransform: 'uppercase' }}>End-of-day summary</span>
                <textarea
                  placeholder="Summarize your performance, mood, and consistency adherence..."
                  rows={3}
                  value={endOfDaySummary}
                  onChange={(e) => setEndOfDaySummary(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- WEEKLY REVIEW VIEW --- */}
      {activeSubTab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={gridStyle}>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Weekly Trades</span>
              <div style={metricValueStyle}>{weeklyReviewStats.tradeCount} trades</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Weekly Win Rate</span>
              <div style={{ ...metricValueStyle, color: '#00c076' }}>{weeklyReviewStats.winRate.toFixed(1)}%</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Best Weekly Setup</span>
              <div style={metricValueStyle}>{weeklyReviewStats.bestSetup}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Worst Weekly Setup</span>
              <div style={{ ...metricValueStyle, color: '#ff4d57' }}>{weeklyReviewStats.worstSetup}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Most Traded Asset</span>
              <div style={metricValueStyle}>{weeklyReviewStats.mostTraded}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Most Profitable Asset</span>
              <div style={{ ...metricValueStyle, color: '#00c076' }}>{weeklyReviewStats.mostProfitable}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Avg Holding Duration</span>
              <div style={metricValueStyle}>{weeklyReviewStats.avgHoldingTime}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Largest Weekly Drawdown</span>
              <div style={{ ...metricValueStyle, color: '#ff4d57' }}>-${weeklyReviewStats.largestDrawdown.toFixed(0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* --- AI REVIEW & LEAKS VIEW --- */}
      {activeSubTab === 'ai_review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Coach card */}
          <div style={{ ...cardStyle, border: '1px solid #d4af37', background: 'rgba(212,175,55,0.02)' }}>
            <span style={titleStyle}>AI Coach Recommendation</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '6px' }}>
              <div>
                <strong style={{ fontSize: '10px', color: '#00c076', textTransform: 'uppercase' }}>Observations &amp; Strengths</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {coachObservations.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              </div>
              <div>
                <strong style={{ fontSize: '10px', color: '#ff4d57', textTransform: 'uppercase' }}>Weaknesses &amp; Leaks</strong>
                <ul style={{ paddingLeft: '16px', marginTop: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {coachObservations.weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* Mistakes Detector */}
          <div style={cardStyle}>
            <span style={titleStyle}>Mistake Detection Engine</span>
            {mistakesReport.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#8e8e93', fontSize: '11px' }}>
                No trading mistakes detected. Excellent discipline!
              </div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Mistake Type</th>
                    <th style={thStyle}>Description</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Total Losses caused</th>
                    <th style={thStyle}>Coach Suggestion</th>
                  </tr>
                </thead>
                <tbody>
                  {mistakesReport.map((m) => (
                    <tr key={m.name}>
                      <td style={{ ...tdStyle, color: '#ff4d57', fontWeight: 700 }}>{m.name}</td>
                      <td style={tdStyle}>{m.description}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#ff4d57', fontFamily: 'var(--font-mono)' }}>
                        -${m.cost.toFixed(0)}
                      </td>
                      <td style={{ ...tdStyle, fontStyle: 'italic', color: '#8e8e93' }}>{m.suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* --- LOGGER TAB FEED VIEW --- */}
      {activeSubTab === 'logger' && !selectedTradeId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Exporter Actions & Filter Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search notes/tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, width: '150px' }}
              />
              <select value={symbolFilter} onChange={(e) => setSymbolFilter(e.target.value)} style={{ ...selectStyle, width: '110px' }}>
                <option value="">All Pairs</option>
                {symbolsList.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={setupFilter} onChange={(e) => setSetupFilter(e.target.value)} style={{ ...selectStyle, width: '110px' }}>
                <option value="">All Setups</option>
                <option value="Breakout">Breakout</option>
                <option value="Pullback">Pullback</option>
                <option value="Trend Continuation">Trend Continuation</option>
                <option value="Reversal">Reversal</option>
                <option value="ICT">ICT</option>
                <option value="SMC">SMC</option>
                <option value="Scalping">Scalping</option>
                <option value="Swing">Swing</option>
                <option value="None">None</option>
              </select>
              <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} style={{ ...selectStyle, width: '90px' }}>
                <option value="">All Grades</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="F">F</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={buttonStyle} onClick={exportCSVReport}>Export CSV</button>
              <button style={buttonPrimaryStyle} onClick={exportPDFReport}>Export PDF Report</button>
            </div>
          </div>

          {/* List Table */}
          <div style={cardStyle}>
            {filteredEntries.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8e8e93', fontSize: '11px' }}>
                No closed trades journaled matching criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Close Time</th>
                      <th style={thStyle}>Symbol</th>
                      <th style={thStyle}>Side</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>PnL</th>
                      <th style={thStyle}>Setup</th>
                      <th style={thStyle}>Emotion</th>
                      <th style={thStyle}>Grade</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((e) => (
                      <tr key={e.tradeId}>
                        <td style={tdStyle}>{new Date(e.closeTime).toLocaleDateString()}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{e.symbol}</td>
                        <td style={{ ...tdStyle, color: e.side === 'buy' ? '#00c076' : '#ff4d57', fontWeight: 700 }}>
                          {e.side.toUpperCase()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: e.pnl >= 0 ? '#00c076' : '#ff4d57', fontFamily: 'var(--font-mono)' }}>
                          {e.pnl >= 0 ? '+' : ''}${e.pnl.toFixed(2)}
                        </td>
                        <td style={tdStyle}>{e.setupType}</td>
                        <td style={tdStyle}>{e.emotion}</td>
                        <td style={tdStyle}><span style={badgeStyle(e.grade)}>{e.grade}</span></td>
                        <td style={tdStyle}>
                          <button style={buttonPrimaryStyle} onClick={() => setSelectedTradeId(e.tradeId)}>
                            Journal details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- EDITOR DETAIL VIEW --- */}
      {selectedTradeId && activeEntry && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button style={buttonStyle} onClick={() => setSelectedTradeId(null)}>
              ← Back to list
            </button>
            <strong style={{ color: '#d4af37' }}>
              Enriching: {activeEntry.symbol} {activeEntry.side.toUpperCase()} (${activeEntry.pnl.toFixed(2)})
            </strong>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Notes & details */}
            <div style={{ ...cardStyle, gap: '12px' }}>
              <span style={titleStyle}>Trade details &amp; reasons</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93' }}>Entry Reason</span>
                <input
                  type="text"
                  placeholder="Why did you click buy/sell? e.g. support breakout"
                  value={activeEntry.entryReason || ''}
                  onChange={(e) => updateEntry(activeEntry.tradeId, { entryReason: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93' }}>Exit Reason</span>
                <input
                  type="text"
                  placeholder="Why did you close? e.g. hit TP, trailing stop hit"
                  value={activeEntry.exitReason || ''}
                  onChange={(e) => updateEntry(activeEntry.tradeId, { exitReason: e.target.value })}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93' }}>Confidence Level ({activeEntry.confidenceScore || 70}%)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={activeEntry.confidenceScore || 70}
                  onChange={(e) => updateEntry(activeEntry.tradeId, { confidenceScore: parseInt(e.target.value) })}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93' }}>Setup Type</span>
                <select
                  value={activeEntry.setupType}
                  onChange={(e) => updateEntry(activeEntry.tradeId, { setupType: e.target.value as SetupType })}
                  style={selectStyle}
                >
                  <option value="None">None</option>
                  <option value="Breakout">Breakout</option>
                  <option value="Pullback">Pullback</option>
                  <option value="Trend Continuation">Trend Continuation</option>
                  <option value="Reversal">Reversal</option>
                  <option value="ICT">ICT</option>
                  <option value="SMC">SMC</option>
                  <option value="Scalping">Scalping</option>
                  <option value="Swing">Swing</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93' }}>Emotion State</span>
                <select
                  value={activeEntry.emotion}
                  onChange={(e) => updateEntry(activeEntry.tradeId, { emotion: e.target.value as EmotionType })}
                  style={selectStyle}
                >
                  <option value="Neutral">Neutral</option>
                  <option value="Confident">Confident</option>
                  <option value="Fear">Fear</option>
                  <option value="Greed">Greed</option>
                  <option value="Revenge">Revenge</option>
                  <option value="FOMO">FOMO</option>
                  <option value="Hesitation">Hesitation</option>
                </select>
              </div>
            </div>

            {/* Grade & Mistakes */}
            <div style={{ ...cardStyle, gap: '12px' }}>
              <span style={titleStyle}>Mistakes &amp; Grade</span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93' }}>Grade Badge</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['A+', 'A', 'B', 'C', 'F'] as GradeType[]).map((g) => (
                    <button
                      key={g}
                      style={{
                        ...buttonStyle,
                        borderColor: activeEntry.grade === g ? '#d4af37' : '#1b2235',
                        background: activeEntry.grade === g ? 'rgba(212,175,55,0.08)' : '#070b14',
                      }}
                      onClick={() => updateEntry(activeEntry.tradeId, { grade: g })}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93' }}>Check Mistakes committed:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['Early Entry', 'Late Entry', 'No SL', 'Overtrading', 'Revenge Trading', 'FOMO', 'Wrong Bias', 'Ignored Trend', 'News Trading'] as MistakeType[]).map((m) => {
                    const active = activeEntry.mistakes.includes(m);
                    return (
                      <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#f5f5f7', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {
                            const updated = active
                              ? activeEntry.mistakes.filter((x: MistakeType) => x !== m)
                              : [...activeEntry.mistakes, m];
                            updateEntry(activeEntry.tradeId, { mistakes: updated });
                          }}
                        />
                        {m}
                      </label>
                    );
                  })}
                </div>
              </div>

              <textarea
                placeholder="Write custom notes/EOD reflections here..."
                rows={3}
                value={activeEntry.notes}
                onChange={(e) => updateEntry(activeEntry.tradeId, { notes: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical', marginTop: '6px' }}
              />
            </div>
          </div>

          {/* Screenshot timeline gallery */}
          <div style={cardStyle}>
            <span style={titleStyle}>Timeline Screenshot Gallery</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '6px' }}>
              
              {/* Pre entry */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', textAlign: 'center' }}>Pre-Entry Chart</span>
                <div
                  style={dropZoneStyle}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'screenshotBefore')}
                >
                  {activeEntry.screenshotBefore ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                      <img src={activeEntry.screenshotBefore} alt="Pre-Entry" style={{ width: '100%', objectFit: 'contain', maxHeight: '110px' }} />
                      <button
                        style={{ position: 'absolute', top: '4px', right: '4px', background: '#ff4d57', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', padding: '2px 4px', fontSize: '8px' }}
                        onClick={(e) => { e.stopPropagation(); updateEntry(activeEntry.tradeId, { screenshotBefore: undefined }); }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>Drag image here</span>
                      <input
                        type="file"
                        accept="image/*"
                        id="pre-file"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageFile(f, 'screenshotBefore');
                        }}
                      />
                      <label htmlFor="pre-file" style={{ ...buttonStyle, padding: '2px 8px' }}>Browse</label>
                    </>
                  )}
                </div>
              </div>

              {/* During Trade */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', textAlign: 'center' }}>During Trade</span>
                <div
                  style={dropZoneStyle}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'screenshotDuring')}
                >
                  {activeEntry.screenshotDuring ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                      <img src={activeEntry.screenshotDuring} alt="During Trade" style={{ width: '100%', objectFit: 'contain', maxHeight: '110px' }} />
                      <button
                        style={{ position: 'absolute', top: '4px', right: '4px', background: '#ff4d57', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', padding: '2px 4px', fontSize: '8px' }}
                        onClick={(e) => { e.stopPropagation(); updateEntry(activeEntry.tradeId, { screenshotDuring: undefined }); }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>Drag image here</span>
                      <input
                        type="file"
                        accept="image/*"
                        id="dur-file"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageFile(f, 'screenshotDuring');
                        }}
                      />
                      <label htmlFor="dur-file" style={{ ...buttonStyle, padding: '2px 8px' }}>Browse</label>
                    </>
                  )}
                </div>
              </div>

              {/* Exit chart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', textAlign: 'center' }}>Exit Chart</span>
                <div
                  style={dropZoneStyle}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'screenshotAfter')}
                >
                  {activeEntry.screenshotAfter ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                      <img src={activeEntry.screenshotAfter} alt="Exit Chart" style={{ width: '100%', objectFit: 'contain', maxHeight: '110px' }} />
                      <button
                        style={{ position: 'absolute', top: '4px', right: '4px', background: '#ff4d57', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', padding: '2px 4px', fontSize: '8px' }}
                        onClick={(e) => { e.stopPropagation(); updateEntry(activeEntry.tradeId, { screenshotAfter: undefined }); }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>Drag image here</span>
                      <input
                        type="file"
                        accept="image/*"
                        id="exit-file"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageFile(f, 'screenshotAfter');
                        }}
                      />
                      <label htmlFor="exit-file" style={{ ...buttonStyle, padding: '2px 8px' }}>Browse</label>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeJournalPanel;
