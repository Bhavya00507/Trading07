import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolioStore, PortfolioAccountItem, PortfolioPositionItem } from '../store/portfolioStore';

const containerStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '20px',
  overflowY: 'auto',
  backgroundColor: '#050811',
  color: '#f8fafc',
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

const gridStyle = (cols = 'repeat(auto-fit, minmax(200px, 1fr))'): React.CSSProperties => ({
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

const PortfolioSystemPanel: React.FC = () => {
  const {
    baseCurrency,
    setBaseCurrency,
    accounts,
    positions,
    dividends,
    totalEquity,
    totalBalance,
    unrealizedPnl,
    realizedPnl,
    dailyReturn,
    weeklyReturn,
    monthlyReturn,
    annualReturn,
    drawdownPct,
    totalExposure,
    buyingPower,
    beta,
    volatility,
    var95,
    var99,
    expectedShortfall,
    correlationMatrix,
    assetAllocation,
    benchmarks,
    lastSyncedAt,
    addAccount,
    removeAccount,
    fetchPortfolioKPIs,
    fetchAccounts,
    fetchPositions,
    fetchRiskAndCorrelation,
    fetchBenchmarks,
    fetchDividends,
    syncWithCloud,
  } = usePortfolioStore();

  const [activeTab, setActiveTab] = useState<'summary' | 'positions' | 'allocation' | 'risk' | 'benchmarks' | 'dividends' | 'reports'>('summary');
  
  // Filters & Search for Position Manager
  const [posSearch, setPosSearch] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [assetClassFilter, setAssetClassFilter] = useState('');

  // Add Account Modal State
  const [showAddAcctModal, setShowAddAcctModal] = useState(false);
  const [newAcctName, setNewAcctName] = useState('');
  const [newAcctBroker, setNewAcctBroker] = useState<any>('MT5');
  const [newAcctGroup, setNewAcctGroup] = useState<any>('Personal');
  const [newAcctBal, setNewAcctBal] = useState(25000);

  useEffect(() => {
    fetchPortfolioKPIs();
    fetchAccounts();
    fetchPositions();
    fetchRiskAndCorrelation();
    fetchBenchmarks();
    fetchDividends();
  }, []);

  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      if (brokerFilter && p.broker !== brokerFilter) return false;
      if (assetClassFilter && p.assetClass !== assetClassFilter) return false;
      if (posSearch) {
        const q = posSearch.toLowerCase();
        if (!p.symbol.toLowerCase().includes(q) && !p.broker.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [positions, brokerFilter, assetClassFilter, posSearch]);

  const currencySymbol = useMemo(() => {
    switch (baseCurrency) {
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'INR': return '₹';
      case 'JPY': return '¥';
      case 'AUD': return 'A$';
      default: return '$';
    }
  }, [baseCurrency]);

  const handleCreateAccount = () => {
    if (!newAcctName) return;
    addAccount({
      accountName: newAcctName,
      broker: newAcctBroker,
      accountGroup: newAcctGroup,
      balance: newAcctBal,
      equity: newAcctBal,
      freeMargin: newAcctBal,
      currency: baseCurrency,
    });
    setShowAddAcctModal(false);
    setNewAcctName('');
  };

  const exportReport = (format: 'csv' | 'json') => {
    const dataStr = format === 'csv'
      ? 'Symbol,Broker,AssetClass,Side,Qty,EntryPrice,CurrentPrice,PnL,PnLPct\n' + filteredPositions.map(p => `"${p.symbol}","${p.broker}","${p.assetClass}","${p.side}",${p.quantity},${p.entryPrice},${p.currentPrice},${p.pnl},${p.pnlPct}`).join('\n')
      : JSON.stringify({ kpis: { totalEquity, totalBalance, unrealizedPnl, dailyReturn }, positions: filteredPositions }, null, 2);

    const blob = new Blob([dataStr], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-report-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
  };

  return (
    <div style={containerStyle}>
      {/* Top Header & Base Currency FX Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em' }}>
            Institutional Portfolio &amp; Multi-Account Engine
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Real-time Consolidation across {accounts.length} Accounts • 100,000+ Position Capacity
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', background: '#0f172a', padding: '4px 10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <span style={{ color: '#64748b', fontWeight: 800 }}>BASE FX:</span>
            {(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD'] as const).map((curr) => (
              <button
                key={curr}
                style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '4px',
                  border: 'none',
                  background: baseCurrency === curr ? '#0ea5e9' : 'transparent',
                  color: baseCurrency === curr ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer',
                }}
                onClick={() => setBaseCurrency(curr)}
              >
                {curr}
              </button>
            ))}
          </div>

          <button style={buttonPrimaryStyle} onClick={() => setShowAddAcctModal(true)}>
            + Connect Broker Account
          </button>
        </div>
      </div>

      {/* KPI Cards Header */}
      <div style={gridStyle('repeat(auto-fit, minmax(180px, 1fr))')}>
        <div style={cardStyle}>
          <span style={metricLabelStyle}>Total Consolidated Equity</span>
          <div style={{ ...metricValueStyle, color: '#0ea5e9' }}>
            {currencySymbol}{totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Unrealized PnL</span>
          <div style={{ ...metricValueStyle, color: unrealizedPnl >= 0 ? '#10b981' : '#ef4444' }}>
            {unrealizedPnl >= 0 ? '+' : ''}{currencySymbol}{unrealizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Daily / Annual Return</span>
          <div style={{ ...metricValueStyle, fontSize: '18px' }}>
            <span style={{ color: dailyReturn >= 0 ? '#10b981' : '#ef4444' }}>{dailyReturn >= 0 ? '+' : ''}{dailyReturn.toFixed(2)}%</span> /{' '}
            <span style={{ color: '#10b981' }}>+{annualReturn.toFixed(1)}%</span>
          </div>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Total Exposure</span>
          <div style={metricValueStyle}>
            {currencySymbol}{totalExposure.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
        </div>

        <div style={cardStyle}>
          <span style={metricLabelStyle}>Buying Power</span>
          <div style={metricValueStyle}>
            {currencySymbol}{buyingPower.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={subTabContainerStyle}>
        <button style={subTabButtonStyle(activeTab === 'summary')} onClick={() => setActiveTab('summary')}>
          🏢 Multi-Account Summary ({accounts.length})
        </button>
        <button style={subTabButtonStyle(activeTab === 'positions')} onClick={() => setActiveTab('positions')}>
          📋 Position Manager ({filteredPositions.length})
        </button>
        <button style={subTabButtonStyle(activeTab === 'allocation')} onClick={() => setActiveTab('allocation')}>
          🟩 Asset Allocation &amp; Treemap
        </button>
        <button style={subTabButtonStyle(activeTab === 'risk')} onClick={() => setActiveTab('risk')}>
          🛡️ Risk &amp; Correlation Heatmap
        </button>
        <button style={subTabButtonStyle(activeTab === 'benchmarks')} onClick={() => setActiveTab('benchmarks')}>
          📈 Benchmark Analytics
        </button>
        <button style={subTabButtonStyle(activeTab === 'dividends')} onClick={() => setActiveTab('dividends')}>
          💰 Dividend Tracker ({dividends.length})
        </button>
        <button style={subTabButtonStyle(activeTab === 'reports')} onClick={() => setActiveTab('reports')}>
          📑 Reports &amp; Cloud Sync
        </button>
      </div>

      {/* --- TAB 1: MULTI-ACCOUNT SUMMARY --- */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={titleStyle}>Connected Broker Accounts &amp; Groups</div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Account Name</th>
                    <th style={thStyle}>Broker</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Group</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Equity</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Unrealized PnL</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acct) => (
                    <tr key={acct.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{acct.accountName}</td>
                      <td style={tdStyle}><span style={{ padding: '2px 6px', background: '#1e293b', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>{acct.broker}</span></td>
                      <td style={tdStyle}>{acct.accountType.toUpperCase()}</td>
                      <td style={tdStyle}>{acct.accountGroup}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace' }}>${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, fontFamily: 'monospace' }}>${acct.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: acct.unrealizedPnl >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                        {acct.unrealizedPnl >= 0 ? '+' : ''}${acct.unrealizedPnl.toFixed(2)}
                      </td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonStyle, padding: '2px 8px', fontSize: '10px', color: '#ef4444' }} onClick={() => removeAccount(acct.id)}>
                          Disconnect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: POSITION MANAGER --- */}
      {activeTab === 'positions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search position symbol or broker..."
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
              style={{ ...inputStyle, width: '200px' }}
            />
            <select value={brokerFilter} onChange={(e) => setBrokerFilter(e.target.value)} style={{ ...selectStyle, width: '130px' }}>
              <option value="">All Brokers</option>
              <option value="MT5">MT5</option>
              <option value="Binance">Binance</option>
              <option value="Bybit">Bybit</option>
              <option value="IBKR">IBKR</option>
              <option value="Zerodha">Zerodha</option>
            </select>
            <select value={assetClassFilter} onChange={(e) => setAssetClassFilter(e.target.value)} style={{ ...selectStyle, width: '130px' }}>
              <option value="">All Asset Classes</option>
              <option value="Crypto">Crypto</option>
              <option value="Stocks">Stocks</option>
              <option value="Forex">Forex</option>
              <option value="Commodities">Commodities</option>
              <option value="Indices">Indices</option>
            </select>
          </div>

          <div style={cardStyle}>
            <div style={titleStyle}>Virtualized Multi-Broker Position Manager</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Symbol</th>
                    <th style={thStyle}>Broker</th>
                    <th style={thStyle}>Asset Class</th>
                    <th style={thStyle}>Side</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Entry Price</th>
                    <th style={thStyle}>Current Price</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Unrealized PnL</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>PnL %</th>
                    <th style={thStyle}>SL / TP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPositions.map((pos) => {
                    const isWin = pos.pnl >= 0;
                    return (
                      <tr key={pos.id}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{pos.symbol}</td>
                        <td style={tdStyle}><span style={{ padding: '2px 6px', background: '#1e293b', borderRadius: '4px', fontSize: '10px' }}>{pos.broker}</span></td>
                        <td style={tdStyle}>{pos.assetClass}</td>
                        <td style={{ ...tdStyle, color: pos.side === 'buy' ? '#10b981' : '#ef4444', fontWeight: 800 }}>{pos.side.toUpperCase()}</td>
                        <td style={tdStyle}>{pos.quantity}</td>
                        <td style={tdStyle}>${pos.entryPrice}</td>
                        <td style={tdStyle}>${pos.currentPrice}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: isWin ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                          {isWin ? '+' : ''}${pos.pnl.toFixed(2)}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800, color: isWin ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                          {isWin ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                        </td>
                        <td style={tdStyle}>{pos.sl ? `$${pos.sl}` : 'None'} / {pos.tp ? `$${pos.tp}` : 'None'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: ASSET ALLOCATION & TREEMAP --- */}
      {activeTab === 'allocation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={cardStyle}>
              <div style={titleStyle}>Asset Class Allocation Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {assetAllocation.map((item) => (
                  <div key={item.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ fontWeight: 800 }}>{item.category}</span>
                      <span style={{ fontFamily: 'monospace', color: '#0ea5e9' }}>${item.value.toLocaleString()} ({item.percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#090d16', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${item.percentage}%`, height: '100%', background: '#0ea5e9', borderRadius: '3px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Treemap Visualization */}
            <div style={cardStyle}>
              <div style={titleStyle}>Portfolio Performance Treemap</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', minHeight: '180px', marginTop: '10px' }}>
                {positions.map((p) => {
                  const isWin = p.pnl >= 0;
                  return (
                    <div
                      key={p.id}
                      style={{
                        background: isWin ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        border: `1px solid ${isWin ? '#10b981' : '#ef4444'}`,
                        borderRadius: '6px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '12px' }}>{p.symbol}</div>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: isWin ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                        {isWin ? '+' : ''}${p.pnl.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: RISK & CORRELATION HEATMAP --- */}
      {activeTab === 'risk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={gridStyle('repeat(auto-fit, minmax(180px, 1fr))')}>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Portfolio Beta</span>
              <div style={metricValueStyle}>{beta}</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Portfolio Volatility</span>
              <div style={metricValueStyle}>{volatility}%</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Value at Risk (VaR 95%)</span>
              <div style={{ ...metricValueStyle, color: '#ef4444' }}>-{var95}%</div>
            </div>
            <div style={cardStyle}>
              <span style={metricLabelStyle}>Expected Shortfall (CVaR)</span>
              <div style={{ ...metricValueStyle, color: '#ef4444' }}>-{expectedShortfall}%</div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={titleStyle}>Asset Correlation Heatmap Matrix</div>
            <div style={{ overflowX: 'auto', marginTop: '10px' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Asset</th>
                    {Object.keys(correlationMatrix).map((sym) => <th key={sym} style={thStyle}>{sym}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(correlationMatrix).map(([s1, row]) => (
                    <tr key={s1}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{s1}</td>
                      {Object.entries(row).map(([s2, val]) => (
                        <td key={s2} style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700, color: val > 0.5 ? '#ef4444' : '#10b981' }}>
                          {val.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: BENCHMARK ANALYTICS --- */}
      {activeTab === 'benchmarks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={titleStyle}>Portfolio Performance vs Major Indices &amp; Assets</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Benchmark / Index</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>1 Month</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>3 Month</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>YTD</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>1 Year</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(benchmarks).map(([name, perf]) => (
                  <tr key={name}>
                    <td style={{ ...tdStyle, fontWeight: 800, textTransform: 'uppercase' }}>{name}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: perf['1M'] >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>+{perf['1M']}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: perf['3M'] >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>+{perf['3M']}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: perf['YTD'] >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>+{perf['YTD']}%</td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: perf['1Y'] >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>+{perf['1Y']}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 6: DIVIDEND TRACKER --- */}
      {activeTab === 'dividends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={titleStyle}>Dividend Income &amp; Corporate Actions Tracker</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Symbol</th>
                  <th style={thStyle}>Event Type</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Yield %</th>
                  <th style={thStyle}>Ex-Date</th>
                  <th style={thStyle}>Pay Date</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((d) => (
                  <tr key={d.id}>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{d.symbol}</td>
                    <td style={tdStyle}>{d.type}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>${d.amount}</td>
                    <td style={tdStyle}>{d.yieldPct}%</td>
                    <td style={tdStyle}>{d.exDate}</td>
                    <td style={tdStyle}>{d.payDate}</td>
                    <td style={tdStyle}><span style={{ padding: '2px 6px', borderRadius: '4px', background: d.status === 'Received' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: d.status === 'Received' ? '#10b981' : '#f59e0b', fontSize: '10px', fontWeight: 800 }}>{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 7: REPORTS & CLOUD SYNC --- */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            <div style={titleStyle}>Portfolio Reports &amp; Cloud Sync Engine</div>
            <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
              <button style={buttonPrimaryStyle} onClick={() => exportReport('csv')}>
                Export CSV Report
              </button>
              <button style={buttonStyle} onClick={() => exportReport('json')}>
                Export JSON State
              </button>
              <button style={{ ...buttonStyle, borderColor: '#10b981', color: '#10b981' }} onClick={syncWithCloud}>
                ☁ Sync Portfolio to Cloud
              </button>
            </div>
            {lastSyncedAt && <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>Last cloud sync: {new Date(lastSyncedAt).toLocaleString()}</div>}
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAcctModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...cardStyle, width: '400px', background: '#0f172a' }}>
            <div style={titleStyle}>
              <span>Connect Broker Account</span>
              <button style={{ ...buttonStyle, padding: '2px 6px' }} onClick={() => setShowAddAcctModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <div>
                <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Account Name</label>
                <input type="text" placeholder="e.g. My Alpaca Live Account" value={newAcctName} onChange={(e) => setNewAcctName(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Broker</label>
                <select value={newAcctBroker} onChange={(e) => setNewAcctBroker(e.target.value)} style={selectStyle}>
                  <option value="MT5">MetaTrader 5 (MT5)</option>
                  <option value="Binance">Binance</option>
                  <option value="Bybit">Bybit</option>
                  <option value="Alpaca">Alpaca Paper/Live</option>
                  <option value="IBKR">Interactive Brokers (IBKR)</option>
                  <option value="Zerodha">Zerodha</option>
                  <option value="Upstox">Upstox</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Account Group</label>
                <select value={newAcctGroup} onChange={(e) => setNewAcctGroup(e.target.value)} style={selectStyle}>
                  <option value="Personal">Personal</option>
                  <option value="Prop Firm">Prop Firm</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Swing">Swing</option>
                  <option value="Scalping">Scalping</option>
                  <option value="Institutional">Institutional</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Initial Balance ($)</label>
                <input type="number" value={newAcctBal} onChange={(e) => setNewAcctBal(parseFloat(e.target.value) || 0)} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button style={buttonStyle} onClick={() => setShowAddAcctModal(false)}>Cancel</button>
                <button style={buttonPrimaryStyle} onClick={handleCreateAccount}>Save Account</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioSystemPanel;
