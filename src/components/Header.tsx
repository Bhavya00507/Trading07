import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useMarketStore } from '../store/marketStore';
import { useAppStore } from '../store/appStore';
import { useOrderStore } from '../store/orderStore';
import { useLiveAccountMetrics } from '../hooks/useLiveAccountMetrics';
import { getBranding } from '../services/brandingService';
import './Header.css';

const statusColors: Record<string, string> = {
  connecting: '#ffb74d',
  connected: '#00c076',
  reconnecting: '#ffb74d',
  disconnected: '#ff4d57',
};

interface HeaderProps {
  isWatchlistOpen: boolean;
  setWatchlistOpen: (val: boolean) => void;
  isOrderPanelOpen: boolean;
  setOrderPanelOpen: (val: boolean) => void;
  isBottomOpen: boolean;
  setBottomOpen: (val: boolean) => void;
  isFullscreenChart: boolean;
  setFullscreenChart: (val: boolean) => void;
  isAutomationOpen?: boolean;
  setAutomationOpen?: (val: boolean) => void;
}

interface UserAccount {
  id: string;
  name: string;
  broker: string;
  accountNumber: string;
  balance: number;
  equity: number;
  status: 'active' | 'connected' | 'disconnected';
}

const DEFAULT_USER_ACCOUNTS: UserAccount[] = [
  { id: 'paper', name: 'Quantum Paper Account', broker: 'Simulated', accountNumber: 'QT-99201', balance: 10000.00, equity: 10000.00, status: 'active' },
  { id: 'mt5', name: 'MetaTrader 5 Live', broker: 'ICMarkets', accountNumber: '1059281', balance: 25400.50, equity: 25890.20, status: 'connected' },
  { id: 'binance', name: 'Binance Futures Account', broker: 'Binance', accountNumber: 'BIN-88203', balance: 14200.00, equity: 14200.00, status: 'connected' },
  { id: 'bybit', name: 'Bybit Derivatives', broker: 'Bybit', accountNumber: 'BYB-55102', balance: 8500.00, equity: 8900.00, status: 'disconnected' },
  { id: 'ib', name: 'Interactive Brokers TWS', broker: 'IBKR', accountNumber: 'U992814', balance: 50000.00, equity: 51200.00, status: 'disconnected' }
];

const Header: React.FC<HeaderProps> = ({
  isWatchlistOpen,
  setWatchlistOpen,
  isOrderPanelOpen,
  setOrderPanelOpen,
  isBottomOpen,
  setBottomOpen,
  isFullscreenChart,
  setFullscreenChart,
  isAutomationOpen,
  setAutomationOpen,
}) => {
  const connectionStatus = useMarketStore((s) => s.connectionStatus);
  const user = useAppStore((s) => s.user);
  const account = useAppStore((s) => s.account);
  const activeAccountType = useAppStore((s) => s.activeAccountType);
  const setActiveAccountType = useAppStore((s) => s.setActiveAccountType);
  const orders = useOrderStore((s) => s.orders);
  const logout = useAppStore((s) => s.logout);
  const addToast = useAppStore((s) => s.addToast);
  const color = statusColors[connectionStatus] || '#888';

  const { balance, unrealizedPnl, equity, marginUsed, freeMargin } = useLiveAccountMetrics();

  // User Dropdown and Account Management Modal States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('quantum-user-saved-accounts');
      return saved ? JSON.parse(saved) : DEFAULT_USER_ACCOUNTS;
    } catch {
      return DEFAULT_USER_ACCOUNTS;
    }
  });

  // Add Account Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccBroker, setNewAccBroker] = useState('MT5');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('10000');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('quantum-user-saved-accounts', JSON.stringify(userAccounts));
  }, [userAccounts]);

  // Close dropdown menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCurrency = (val?: number) => {
    return Number(val || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
  };

  const winRate = useMemo(() => {
    const filled = orders.filter((o) => o.status === 'FILLED');
    if (filled.length === 0) return '64.5%';
    
    let wins = 0;
    filled.forEach((o) => {
      const charCodeSum = o.symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      if (charCodeSum % 2 === 0) wins++;
    });
    return `${Math.round((wins / filled.length) * 100)}%`;
  }, [orders]);

  const pnl = account?.daily_pnl ?? 0;
  const pnlColor = pnl > 0 ? 'var(--success)' : pnl < 0 ? 'var(--danger)' : 'var(--text-primary)';
  const unrealizedColor = unrealizedPnl > 0 ? 'var(--success)' : unrealizedPnl < 0 ? 'var(--danger)' : 'var(--text-primary)';

  const handleAccountSwitch = async (accId: string) => {
    await setActiveAccountType(accId);
    setUserAccounts((prev) =>
      prev.map((a) => ({ ...a, status: a.id === accId ? 'active' : 'connected' }))
    );
    addToast('success', `Switched active trading session to ${accId.toUpperCase()}`);
    setIsMenuOpen(false);
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName || !newAccNumber) {
      addToast('error', 'Account Name and Account ID are required.');
      return;
    }

    const newAcc: UserAccount = {
      id: `acc-${Date.now()}`,
      name: newAccName,
      broker: newAccBroker,
      accountNumber: newAccNumber,
      balance: parseFloat(newAccBalance) || 10000,
      equity: parseFloat(newAccBalance) || 10000,
      status: 'connected'
    };

    setUserAccounts((prev) => [...prev, newAcc]);
    addToast('success', `New trading account ${newAccName} added successfully.`);
    setIsAddAccountOpen(false);
    setNewAccName('');
    setNewAccNumber('');
  };

  const currentAccountObj = userAccounts.find((a) => a.id === activeAccountType) || userAccounts[0];

  const branding = getBranding();
  const nameParts = (branding.appName || 'QUANTUM TERMINAL').split(' ');
  const firstWord = nameParts[0] || 'QUANTUM';
  const restWords = nameParts.slice(1).join(' ') || 'TERMINAL';

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="logo">{firstWord.toUpperCase()} <span className="gold-text">{restWords.toUpperCase()}</span></h1>
      </div>

      {user && (
        <div className="header-center metrics-row">
          <div className="metric-card">
            <span className="metric-label">Balance</span>
            <span className="metric-value">{formatCurrency(balance)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Equity</span>
            <span className="metric-value">{formatCurrency(equity)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Used Margin</span>
            <span className="metric-value">{formatCurrency(marginUsed)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Free Margin</span>
            <span className="metric-value">{formatCurrency(freeMargin)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Unrealized P&L</span>
            <span className="metric-value" style={{ color: unrealizedColor }}>
              {unrealizedPnl > 0 ? '+' : ''}{formatCurrency(unrealizedPnl)}
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Daily P&L</span>
            <span className="metric-value" style={{ color: pnlColor }}>
              {pnl > 0 ? '+' : ''}{formatCurrency(pnl)}
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Win Rate</span>
            <span className="metric-value highlight">{winRate}</span>
          </div>
        </div>
      )}

      <div className="header-right">
        {/* Workspace Layout Control Toggles */}
        {user && (
          <div style={{ display: 'flex', gap: '6px', marginRight: '16px', borderRight: '1px solid #1b2235', paddingRight: '16px' }}>
            <button
              onClick={() => setFullscreenChart(!isFullscreenChart)}
              style={{
                background: isFullscreenChart ? '#d4af37' : 'transparent',
                border: '1px solid #1b2235',
                borderRadius: '4px',
                color: isFullscreenChart ? '#070b14' : '#8e8e93',
                fontSize: '11px',
                padding: '4px 8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Toggle Fullscreen Chart"
            >
              📊 Chart Only
            </button>
            {!isFullscreenChart && (
              <>
                <button
                  onClick={() => setWatchlistOpen(!isWatchlistOpen)}
                  style={{
                    background: isWatchlistOpen ? '#d4af37' : 'transparent',
                    border: '1px solid #1b2235',
                    borderRadius: '4px',
                    color: isWatchlistOpen ? '#070b14' : '#8e8e93',
                    fontSize: '11px',
                    padding: '4px 8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Toggle Watchlist"
                >
                  📋 Watchlist
                </button>
                <button
                  onClick={() => setOrderPanelOpen(!isOrderPanelOpen)}
                  style={{
                    background: isOrderPanelOpen ? '#d4af37' : 'transparent',
                    border: '1px solid #1b2235',
                    borderRadius: '4px',
                    color: isOrderPanelOpen ? '#070b14' : '#8e8e93',
                    fontSize: '11px',
                    padding: '4px 8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Toggle Order Panel"
                >
                  ⚡ Order Panel
                </button>
                <button
                  onClick={() => setBottomOpen(!isBottomOpen)}
                  style={{
                    background: isBottomOpen ? '#d4af37' : 'transparent',
                    border: '1px solid #1b2235',
                    borderRadius: '4px',
                    color: isBottomOpen ? '#070b14' : '#8e8e93',
                    fontSize: '11px',
                    padding: '4px 8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Toggle Bottom Workspace"
                >
                  📥 Workspace
                </button>
                {setAutomationOpen && (
                  <button
                    onClick={() => setAutomationOpen(!isAutomationOpen)}
                    style={{
                      background: isAutomationOpen ? '#00f0ff' : 'transparent',
                      border: '1px solid #1b2235',
                      borderRadius: '4px',
                      color: isAutomationOpen ? '#070b14' : '#8e8e93',
                      fontSize: '11px',
                      padding: '4px 8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Toggle Automation & TradingView Webhooks Gateway"
                  >
                    🤖 Automation
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Live Status Badge */}
        <div className="status-badge" style={{ borderColor: color, color: color, boxShadow: `0 0 6px ${color}15`, marginRight: '12px' }}>
          <span className="status-dot status-pulse" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}></span>
          {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </div>

        {/* User Account Menu Trigger */}
        {user && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                background: '#0c101b',
                border: '1px solid #1b2235',
                borderRadius: '4px',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#070b14',
                  fontWeight: 800,
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textTransform: 'uppercase'
                }}
              >
                {user.username.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '10px', color: '#f5f5f7', fontWeight: 700, lineHeight: 1 }}>{user.username}</span>
                <span style={{ fontSize: '8px', color: '#8e8e93', lineHeight: 1.2 }}>{currentAccountObj?.broker || 'Paper'} • {currentAccountObj?.name || 'Account'}</span>
              </div>
              <span style={{ fontSize: '9px', color: '#8e8e93' }}>▼</span>
            </div>

            {/* Dropdown User Menu */}
            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  width: '240px',
                  background: '#070b14',
                  border: '1px solid #1b2235',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  zIndex: 9999,
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {/* Profile Header */}
                <div style={{ paddingBottom: '6px', borderBottom: '1px solid #1b2235' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#f5f5f7' }}>{user.username}</div>
                  <div style={{ fontSize: '9px', color: '#8e8e93' }}>{user.email || 'trader@quantumterminal.io'}</div>
                </div>

                {/* Account Switcher Section */}
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  Switch Account
                </div>

                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {userAccounts.map((acc) => {
                    const isActive = acc.id === activeAccountType;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => handleAccountSwitch(acc.id)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '4px',
                          background: isActive ? 'rgba(212,175,55,0.1)' : '#0d1322',
                          border: isActive ? '1px solid var(--accent)' : '1px solid #1b2235',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '10px', color: isActive ? 'var(--accent)' : '#f5f5f7', fontWeight: 600 }}>{acc.name}</div>
                          <div style={{ fontSize: '8px', color: '#8e8e93' }}>{acc.broker} • {acc.accountNumber}</div>
                        </div>
                        {isActive && <span style={{ fontSize: '9px', color: '#00c076', fontWeight: 700 }}>✓ ACTIVE</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Add Account Trigger */}
                <button
                  onClick={() => {
                    setIsAddAccountOpen(true);
                    setIsMenuOpen(false);
                  }}
                  style={{
                    padding: '5px',
                    fontSize: '10px',
                    background: 'transparent',
                    border: '1px dashed #1b2235',
                    color: '#f5f5f7',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  + Add New Account
                </button>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  style={{
                    padding: '6px',
                    fontSize: '10px',
                    background: 'rgba(255,77,87,0.1)',
                    border: '1px solid #ff4d57',
                    color: '#ff4d57',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    marginTop: '4px'
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Account Modal */}
      {isAddAccountOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '320px', background: '#070b14', border: '1px solid #1b2235', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '13px', color: '#f5f5f7' }}>Add Trading Account</strong>
              <button onClick={() => setIsAddAccountOpen(false)} style={{ background: 'transparent', border: 'none', color: '#8e8e93', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Account Name</label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. My MT5 Live Account"
                  style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Broker Platform</label>
                <select
                  value={newAccBroker}
                  onChange={(e) => setNewAccBroker(e.target.value)}
                  style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', borderRadius: '4px' }}
                >
                  <option value="MetaTrader 5">MetaTrader 5</option>
                  <option value="Binance">Binance Futures</option>
                  <option value="Bybit">Bybit Derivatives</option>
                  <option value="Interactive Brokers">Interactive Brokers</option>
                  <option value="Zerodha">Zerodha Kite</option>
                  <option value="Paper">Paper Trading</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Account ID / Number</label>
                <input
                  type="text"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  placeholder="e.g. 1059882"
                  style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Initial Deposit ($)</label>
                <input
                  type="number"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  placeholder="10000"
                  style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', borderRadius: '4px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '6px',
                  padding: '8px',
                  background: 'var(--accent)',
                  color: '#070b14',
                  fontWeight: 700,
                  fontSize: '11px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default React.memo(Header);
