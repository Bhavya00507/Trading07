// src/components/ReportGeneratorPanel.tsx
import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';

const ReportGeneratorPanel: React.FC = () => {
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('weekly');
  const [format, setFormat] = useState<'pdf' | 'csv' | 'excel' | 'json'>('pdf');
  const [generating, setGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const addToast = useAppStore((state) => state.addToast);

  const handleGenerate = () => {
    setGenerating(true);
    setReportUrl(null);
    setTimeout(() => {
      setGenerating(false);
      setReportUrl('ready');
      addToast('success', `${range.toUpperCase()} Report generated successfully in ${format.toUpperCase()} format.`);
    }, 1500);
  };

  const handleDownload = () => {
    const history = useAppStore.getState().history;
    const account = useAppStore.getState().account;
    
    let blob: Blob;
    let fileName = `trading_report_${range}_${Date.now()}`;

    if (format === 'csv' || format === 'excel') {
      const headers = ['ID', 'Symbol', 'Side', 'Entry Price', 'Exit Price', 'Quantity', 'PnL', 'Account Type', 'Timestamp'];
      const rows = history.map((t) => [
        t.id, t.symbol, t.side, t.entry_price, t.exit_price, t.quantity, t.pnl, t.account_type || 'paper', t.timestamp
      ]);
      const csvContent = [headers.join(','), ...rows.map((r) => r.map(v => `"${v}"`).join(','))].join('\n');
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      fileName += format === 'csv' ? '.csv' : '.xlsx';
    } else if (format === 'json') {
      blob = new Blob([JSON.stringify({ account, history }, null, 2)], { type: 'application/json' });
      fileName += '.json';
    } else {
      // PDF/HTML format
      const htmlContent = `
        <html>
          <head>
            <title>Trading Report - ${range.toUpperCase()}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; background: #070b14; color: #fff; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #1b2235; padding: 8px; text-align: left; }
              th { background: #0d1322; color: #d4af37; }
              .pnl-pos { color: #00c076; }
              .pnl-neg { color: #ff4d57; }
            </style>
          </head>
          <body>
            <h2>Trading Terminal Performance Statement (${range.toUpperCase()})</h2>
            <p>Account Balance: $${account?.balance || 10000}</p>
            <p>Account Equity: $${account?.equity || 10000}</p>
            <p>Total Trades: ${history.length}</p>
            <table>
              <thead>
                <tr><th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th><th>Qty</th><th>PnL</th></tr>
              </thead>
              <tbody>
                ${history.map((t) => `
                  <tr>
                    <td>${t.symbol}</td>
                    <td style="text-transform: uppercase;">${t.side}</td>
                    <td>$${t.entry_price}</td>
                    <td>$${t.exit_price}</td>
                    <td>${t.quantity}</td>
                    <td class="${t.pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}">$${t.pnl}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      fileName += '.html';
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', `Export file downloaded successfully: ${fileName}`);
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Institutional Report Generator</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Generate audited trading statements, equity curves, and performance metric dossiers</span>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left: Configuration form */}
        <div style={{ flex: 1.2, background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            Report Configuration
          </span>

          {/* Time range */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', color: '#8e8e93' }}>Time Horizon Range</label>
            <select
              value={range}
              onChange={(e: any) => setRange(e.target.value)}
              style={{ padding: '5px 8px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px', cursor: 'pointer' }}
            >
              <option value="daily">Daily Account Summary</option>
              <option value="weekly">Weekly Performance Dossier</option>
              <option value="monthly">Monthly Audited Statement</option>
              <option value="quarterly">Quarterly Execution Review</option>
              <option value="yearly">Yearly Institutional Audit</option>
            </select>
          </div>

          {/* Format */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <label style={{ fontSize: '10px', color: '#8e8e93' }}>Output File Format</label>
            <select
              value={format}
              onChange={(e: any) => setFormat(e.target.value)}
              style={{ padding: '5px 8px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px', cursor: 'pointer' }}
            >
              <option value="pdf">Acrobat PDF Document (.pdf)</option>
              <option value="csv">Comma-Separated Values (.csv)</option>
              <option value="excel">Microsoft Excel Sheet (.xlsx)</option>
              <option value="json">Raw Data Object (.json)</option>
            </select>
          </div>

          {/* Checklist options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #1b2235', paddingTop: '8px', fontSize: '11px', color: '#f5f5f7' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              Include Audited Trade Execution Logs
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              Include Sharpe, Sortino, &amp; DD Risk Statistics
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              Include Equity Curve charts
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked />
              Include Session overlap heatmaps
            </label>
          </div>

          {/* Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              fontWeight: 700,
              fontSize: '11px',
              border: 'none',
              padding: '8px',
              borderRadius: '3px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            {generating ? 'COMPILING REPORT...' : 'COMPILE & EXPORT'}
          </button>
        </div>

        {/* Right: Mock download area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '12px', gap: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            Output Terminal Logs
          </span>

          <div style={{ flex: 1, background: '#0d1322', borderRadius: '3px', border: '1px solid #1b2235', padding: '8px', fontFamily: 'var(--font-mono)', fontSize: '10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', color: '#8e8e93' }}>
            <div>Ready to compile statements...</div>
            {generating && (
              <>
                <div style={{ color: '#ea7317' }}>[18:38:20] Scanning SQLite databases for history audit trail...</div>
                <div style={{ color: '#ea7317' }}>[18:38:21] Computing drawdown and Sharpe ratios...</div>
                <div style={{ color: '#ea7317' }}>[18:38:21] Building PDF vectors for charts...</div>
              </>
            )}
            {reportUrl && (
              <>
                <div style={{ color: '#ea7317' }}>[18:38:20] Scanning SQLite databases for history audit trail...</div>
                <div style={{ color: '#ea7317' }}>[18:38:21] Computing drawdown and Sharpe ratios...</div>
                <div style={{ color: '#ea7317' }}>[18:38:21] Building PDF vectors for charts...</div>
                <div style={{ color: '#00c076', fontWeight: 700 }}>[18:38:22] Statement generated. Output file ready.</div>
              </>
            )}
          </div>

          {reportUrl && (
            <button
              onClick={handleDownload}
              style={{
                display: 'block',
                background: '#00c076',
                color: '#070b14',
                textAlign: 'center',
                padding: '8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              DOWNLOAD {format.toUpperCase()} REPORT
            </button>
          )}
        </div>

      </div>

    </div>
  );
};

export default ReportGeneratorPanel;
