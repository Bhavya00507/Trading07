import React, { useState, useEffect } from 'react';

export const GlobalFinancialEcosystemPanel: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'networth' | 'wallet' | 'lending' | 'tax' | 'ai'>('networth');
  const [transferAmount, setTransferAmount] = useState<number>(1000);
  const [fromCurr, setFromCurr] = useState<string>('USD');
  const [toCurr, setToCurr] = useState<string>('EUR');

  const fetchDashboard = () => {
    fetch('/api/ecosystem/dashboard')
      .then(res => res.json())
      .then(d => setDashboard(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleTransfer = async () => {
    try {
      const res = await fetch('/api/ecosystem/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_curr: fromCurr, to_curr: toCurr, amount: transferAmount })
      });
      if (res.ok) {
        alert(`✅ Internal Transfer Processed: ${transferAmount} ${fromCurr} -> ${toCurr}`);
        fetchDashboard();
      }
    } catch {}
  };

  if (!dashboard) return null;
  const nw = dashboard.net_worth;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
            🌐 GLOBAL FINANCIAL ECOSYSTEM (SUPER PLATFORM) (v8.0)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Consolidated Net Worth | Multi-Currency Digital Wallet | Portfolio Loans | Tax Center | AI Wealth Advisor
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setActiveTab('networth')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'networth' ? '#10b981' : '#1e293b', color: activeTab === 'networth' ? '#0f172a' : '#cbd5e1' }}>💰 Net Worth</button>
          <button onClick={() => setActiveTab('wallet')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'wallet' ? '#38bdf8' : '#1e293b', color: activeTab === 'wallet' ? '#0f172a' : '#cbd5e1' }}>💳 Digital Wallet</button>
          <button onClick={() => setActiveTab('lending')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'lending' ? '#f59e0b' : '#1e293b', color: activeTab === 'lending' ? '#0f172a' : '#cbd5e1' }}>🏦 Portfolio Loans</button>
          <button onClick={() => setActiveTab('tax')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'tax' ? '#a78bfa' : '#1e293b', color: activeTab === 'tax' ? '#0f172a' : '#cbd5e1' }}>📑 Tax Center</button>
        </div>
      </div>

      {activeTab === 'networth' && nw && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Net Worth Summary Banner */}
          <div style={{ padding: 14, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #10b981', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: '#94a3b8', fontSize: 10 }}>CONSOLIDATED NET WORTH</span>
            <span style={{ fontWeight: 900, fontSize: 24, color: '#10b981' }}>${nw.total_net_worth_usd?.toLocaleString()}</span>
          </div>

          {/* Assets & Liabilities Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontWeight: 800, color: '#10b981', fontSize: 12 }}>📈 TOTAL ASSETS</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Trading & Investments: <strong>${nw.assets_breakdown?.trading_investments?.toLocaleString()}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Cash & Bank Accounts: <strong>${nw.assets_breakdown?.cash_bank_accounts?.toLocaleString()}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Real Estate Property: <strong>${nw.assets_breakdown?.real_estate_property?.toLocaleString()}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Crypto Digital Assets: <strong>${nw.assets_breakdown?.crypto_digital_assets?.toLocaleString()}</strong></div>
            </div>

            <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontWeight: 800, color: '#ef4444', fontSize: 12 }}>📉 TOTAL LIABILITIES</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Portfolio Margin Loans: <strong style={{ color: '#ef4444' }}>${nw.liabilities_breakdown?.portfolio_margin_loans?.toLocaleString()}</strong></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wallet' && dashboard.wallet && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>💳 MULTI-CURRENCY DIGITAL WALLET</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {Object.entries(dashboard.wallet.balances || {}).map(([curr, bal]: [string, any]) => (
              <div key={curr} style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }}>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>{curr} BALANCE</div>
                <div style={{ fontWeight: 900, color: '#38bdf8', fontSize: 14 }}>{bal} {curr}</div>
              </div>
            ))}
          </div>

          {/* Quick Transfer Converter */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input type="number" value={transferAmount} onChange={e => setTransferAmount(Number(e.target.value))} style={{ padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
            <select value={fromCurr} onChange={e => setFromCurr(e.target.value)} style={{ padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }}><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select>
            <span>➔</span>
            <select value={toCurr} onChange={e => setToCurr(e.target.value)} style={{ padding: 6, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }}><option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option></select>
            <button onClick={handleTransfer} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}>Transfer</button>
          </div>
        </div>
      )}

      {activeTab === 'tax' && dashboard.tax_summary && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#a78bfa', fontSize: 12 }}>📑 TAX CENTER & ANNUAL REPORTING ({dashboard.tax_summary.tax_year})</span>
            <button onClick={() => alert('Downloading official tax report PDF...')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#a78bfa', color: '#0f172a', fontWeight: 900, cursor: 'pointer', fontSize: 10 }}>📄 Download Tax PDF</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 4 }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>SHORT-TERM GAINS</div>
              <div style={{ fontWeight: 900, color: '#10b981' }}>${dashboard.tax_summary.short_term_capital_gains_usd?.toLocaleString()}</div>
            </div>
            <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 4 }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>LONG-TERM GAINS</div>
              <div style={{ fontWeight: 900, color: '#38bdf8' }}>${dashboard.tax_summary.long_term_capital_gains_usd?.toLocaleString()}</div>
            </div>
            <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 4 }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>DIVIDEND INCOME</div>
              <div style={{ fontWeight: 900, color: '#f59e0b' }}>${dashboard.tax_summary.dividend_income_usd?.toLocaleString()}</div>
            </div>
            <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 4 }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>ESTIMATED TAX LIABILITY</div>
              <div style={{ fontWeight: 900, color: '#ef4444' }}>${dashboard.tax_summary.estimated_tax_liability_usd?.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
