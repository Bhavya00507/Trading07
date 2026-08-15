import React, { useState, useEffect } from 'react';

export const HedgeFundMAMPanel: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'mam' | 'pamm' | 'copy' | 'audit'>('mam');
  const [bulkSymbol, setBulkSymbol] = useState<string>('BTCUSDT');
  const [bulkVolume, setBulkVolume] = useState<number>(10.0);
  const [bulkGroup, setBulkGroup] = useState<string>('ALL');

  const fetchDashboard = () => {
    fetch('/api/hedge-fund/dashboard')
      .then(res => res.json())
      .then(d => setDashboard(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleBulkOrder = async (side: 'BUY' | 'SELL') => {
    try {
      const res = await fetch('/api/hedge-fund/mam/bulk-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_name: bulkGroup, symbol: bulkSymbol, side, total_volume: bulkVolume })
      });
      if (res.ok) {
        const d = await res.json();
        alert(`⚡ Bulk ${side} Executed across ${d.account_count} accounts! Total Volume: ${d.total_volume}`);
        fetchDashboard();
      }
    } catch {}
  };

  const handleSubscribe = async (providerId: string) => {
    try {
      const res = await fetch('/api/hedge-fund/copy-trading/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, risk_multiplier: 1.0 })
      });
      if (res.ok) {
        alert('✅ Successfully subscribed to Strategy Provider with 1.0x Risk Multiplier!');
        fetchDashboard();
      }
    } catch {}
  };

  if (!dashboard) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            🏦 HEDGE FUND & MULTI-ACCOUNT MANAGEMENT PLATFORM (MAM / PAMM) (v6.0)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Multi-Account Manager | PAMM Capital Allocation | Copy Trading Network | Enterprise RBAC Compliance
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setActiveTab('mam')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'mam' ? '#f59e0b' : '#1e293b', color: activeTab === 'mam' ? '#0f172a' : '#cbd5e1' }}>MAM Accounts ({dashboard.total_accounts})</button>
          <button onClick={() => setActiveTab('pamm')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'pamm' ? '#10b981' : '#1e293b', color: activeTab === 'pamm' ? '#0f172a' : '#cbd5e1' }}>PAMM Portal (${(dashboard.total_aum / 1000000).toFixed(2)}M)</button>
          <button onClick={() => setActiveTab('copy')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'copy' ? '#38bdf8' : '#1e293b', color: activeTab === 'copy' ? '#0f172a' : '#cbd5e1' }}>Copy Trading</button>
        </div>
      </div>

      {/* AUM Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>ASSETS UNDER MANAGEMENT (AUM)</div>
          <div style={{ fontWeight: 900, color: '#10b981', fontSize: 16 }}>${dashboard.total_aum?.toLocaleString()}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>ACTIVE INVESTORS</div>
          <div style={{ fontWeight: 900, color: '#38bdf8', fontSize: 16 }}>{dashboard.active_investors} Partners</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>PERFORMANCE FEES COLLECTED</div>
          <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: 16 }}>${dashboard.pamm?.total_performance_fees_collected_usd?.toLocaleString()}</div>
        </div>
        <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>SERVER HEALTH & SYNC LATENCY</div>
          <div style={{ fontWeight: 900, color: '#10b981', fontSize: 14 }}>{dashboard.server_health} ({dashboard.latency_ms}ms)</div>
        </div>
      </div>

      {activeTab === 'mam' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Bulk Execution Control Bar */}
          <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 800, color: '#f59e0b' }}>⚡ MAM BULK ORDER EXECUTION:</span>
            <input type="text" value={bulkSymbol} onChange={e => setBulkSymbol(e.target.value)} style={{ padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', width: 90 }} />
            <input type="number" value={bulkVolume} onChange={e => setBulkVolume(Number(e.target.value))} style={{ padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', width: 70 }} />
            <button onClick={() => handleBulkOrder('BUY')} style={{ padding: '6px 14px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}>BUY BULK</button>
            <button onClick={() => handleBulkOrder('SELL')} style={{ padding: '6px 14px', borderRadius: 4, border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 900, cursor: 'pointer' }}>SELL BULK</button>
          </div>

          {/* Connected Accounts Table */}
          <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8', marginBottom: 8 }}>📋 CONNECTED HEDGE FUND ACCOUNTS ({dashboard.mam?.accounts?.length})</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
              <thead>
                <tr style={{ backgroundColor: '#111827', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: 6 }}>Account ID</th>
                  <th style={{ padding: 6 }}>Account Name</th>
                  <th style={{ padding: 6 }}>Group</th>
                  <th style={{ padding: 6 }}>Type / Broker</th>
                  <th style={{ padding: 6 }}>Balance</th>
                  <th style={{ padding: 6 }}>Equity</th>
                  <th style={{ padding: 6 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.mam?.accounts?.map((acc: any) => (
                  <tr key={acc.account_id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: 6, fontWeight: 800 }}>{acc.account_id}</td>
                    <td style={{ padding: 6, color: '#f8fafc' }}>{acc.name}</td>
                    <td style={{ padding: 6, color: '#a78bfa', fontWeight: 700 }}>{acc.group}</td>
                    <td style={{ padding: 6 }}>{acc.type} ({acc.broker})</td>
                    <td style={{ padding: 6 }}>${acc.balance?.toLocaleString()}</td>
                    <td style={{ padding: 6, color: '#10b981', fontWeight: 800 }}>${acc.equity?.toLocaleString()}</td>
                    <td style={{ padding: 6, color: '#10b981', fontWeight: 900 }}>{acc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pamm' && dashboard.pamm && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 800, color: '#10b981', fontSize: 12 }}>💼 PAMM CAPITAL ALLOCATION & INVESTOR PORTAL</span>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ backgroundColor: '#111827', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: 6 }}>Investor Partner</th>
                <th style={{ padding: 6 }}>Capital Allocated</th>
                <th style={{ padding: 6 }}>Share %</th>
                <th style={{ padding: 6 }}>Monthly P&L ($)</th>
                <th style={{ padding: 6 }}>20% Performance Fee ($)</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.pamm.investors?.map((inv: any) => (
                <tr key={inv.investor_id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: 6, fontWeight: 800, color: '#f8fafc' }}>{inv.name}</td>
                  <td style={{ padding: 6 }}>${inv.capital?.toLocaleString()}</td>
                  <td style={{ padding: 6, color: '#38bdf8', fontWeight: 800 }}>{inv.share_pct}%</td>
                  <td style={{ padding: 6, color: '#10b981', fontWeight: 800 }}>+${inv.monthly_pnl_usd?.toLocaleString()}</td>
                  <td style={{ padding: 6, color: '#f59e0b', fontWeight: 800 }}>${inv.performance_fee_paid?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'copy' && dashboard.copy_trading && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>🚀 COPY TRADING NETWORK LEADERBOARD</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {dashboard.copy_trading.leaderboard?.map((p: any) => (
              <div key={p.provider_id} style={{ padding: 10, borderRadius: 6, backgroundColor: '#1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 12, color: '#f8fafc' }}>{p.trader_name}</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>Strategy: {p.strategy}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#10b981', fontWeight: 900 }}>+30D: {p.return_30d_pct}%</span>
                  <span style={{ color: '#ef4444' }}>Max DD: {p.max_drawdown_pct}%</span>
                </div>
                <button onClick={() => handleSubscribe(p.provider_id)} style={{ padding: '6px 10px', borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 900, cursor: 'pointer', marginTop: 6, fontSize: 10 }}>
                  👥 Mirror Trader (1.0x)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
