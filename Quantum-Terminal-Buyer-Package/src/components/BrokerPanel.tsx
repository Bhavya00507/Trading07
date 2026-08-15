// src/components/BrokerPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { getApiUrl } from '../services/config';

export interface BrokerAccountItem {
  id: string;
  name: string;
  brokerType: 'mt5' | 'binance' | 'bybit' | 'ibkr' | 'zerodha' | 'angelone' | 'upstox' | 'alpaca' | 'paper';
  status: 'connected' | 'disconnected' | 'connecting' | 'failed';
  errorMessage?: string;
  lastSync?: string;
  latencyMs?: number;
  balance: number;
  equity: number;
  positionsCount: number;
  ordersCount: number;
  autoReconnect: boolean;

  // MT5 fields
  account?: string;
  password?: string;
  server?: string;
  path?: string;

  // Binance / Bybit / Zerodha / Upstox / Alpaca fields
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  testnet?: boolean;

  // IBKR fields
  host?: string;
  port?: string;
  clientId?: string;

  // Angel One fields
  clientCode?: string;
  pin?: string;
  totpSecret?: string;

  // Zerodha fields
  requestToken?: string;

  // Upstox fields
  redirectUri?: string;
}

const DEFAULT_ACCOUNTS: BrokerAccountItem[] = [
  {
    id: 'paper-main',
    name: 'Paper Trading Account',
    brokerType: 'paper',
    status: 'connected',
    balance: 10000.00,
    equity: 10000.00,
    positionsCount: 0,
    ordersCount: 0,
    autoReconnect: true,
    lastSync: new Date().toISOString(),
    latencyMs: 1
  },
  {
    id: 'mt5-demo',
    name: 'MetaTrader 5 Demo',
    brokerType: 'mt5',
    status: 'disconnected',
    account: '',
    password: '',
    server: 'MetaQuotes-Demo',
    path: '',
    balance: 0,
    equity: 0,
    positionsCount: 0,
    ordersCount: 0,
    autoReconnect: true
  },
  {
    id: 'binance-futures',
    name: 'Binance Futures Live',
    brokerType: 'binance',
    status: 'disconnected',
    apiKey: '',
    apiSecret: '',
    testnet: false,
    balance: 0,
    equity: 0,
    positionsCount: 0,
    ordersCount: 0,
    autoReconnect: true
  },
  {
    id: 'bybit-perps',
    name: 'Bybit Derivatives',
    brokerType: 'bybit',
    status: 'disconnected',
    apiKey: '',
    apiSecret: '',
    testnet: false,
    balance: 0,
    equity: 0,
    positionsCount: 0,
    ordersCount: 0,
    autoReconnect: true
  },
  {
    id: 'ibkr-tws',
    name: 'Interactive Brokers TWS',
    brokerType: 'ibkr',
    status: 'disconnected',
    host: '127.0.0.1',
    port: '7497',
    clientId: '1',
    balance: 0,
    equity: 0,
    positionsCount: 0,
    ordersCount: 0,
    autoReconnect: true
  }
];

const BrokerPanel: React.FC = () => {
  const [accounts, setAccounts] = useState<BrokerAccountItem[]>(() => {
    try {
      const saved = localStorage.getItem('quantum-broker-accounts-v3');
      return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
    } catch {
      return DEFAULT_ACCOUNTS;
    }
  });

  const [selectedId, setSelectedId] = useState<string>(accounts[1]?.id || accounts[0]?.id);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Account Form state
  const [newAccName, setNewAccName] = useState('');
  const [newBrokerType, setNewBrokerType] = useState<BrokerAccountItem['brokerType']>('mt5');

  const token = useAppStore((s) => s.token);
  const addToast = useAppStore((s) => s.addToast);

  const activeAccount = accounts.find((a) => a.id === selectedId) || accounts[0];

  // Dedicated Form Input States for Selected Account
  const [formAccount, setFormAccount] = useState(activeAccount?.account || '');
  const [formPassword, setFormPassword] = useState(activeAccount?.password || '');
  const [formServer, setFormServer] = useState(activeAccount?.server || 'MetaQuotes-Demo');
  const [formPath, setFormPath] = useState(activeAccount?.path || '');

  const [formApiKey, setFormApiKey] = useState(activeAccount?.apiKey || '');
  const [formApiSecret, setFormApiSecret] = useState(activeAccount?.apiSecret || '');
  const [formPassphrase, setFormPassphrase] = useState(activeAccount?.passphrase || '');
  const [formTestnet, setFormTestnet] = useState(activeAccount?.testnet || false);

  const [formHost, setFormHost] = useState(activeAccount?.host || '127.0.0.1');
  const [formPort, setFormPort] = useState(activeAccount?.port || '7497');
  const [formClientId, setFormClientId] = useState(activeAccount?.clientId || '1');

  const [formClientCode, setFormClientCode] = useState(activeAccount?.clientCode || '');
  const [formPin, setFormPin] = useState(activeAccount?.pin || '');
  const [formTotpSecret, setFormTotpSecret] = useState(activeAccount?.totpSecret || '');

  const [formRequestToken, setFormRequestToken] = useState(activeAccount?.requestToken || '');
  const [formRedirectUri, setFormRedirectUri] = useState(activeAccount?.redirectUri || 'https://127.0.0.1:8000/callback');

  useEffect(() => {
    localStorage.setItem('quantum-broker-accounts-v3', JSON.stringify(accounts));
  }, [accounts]);

  // Update form inputs when selected account changes
  useEffect(() => {
    if (!activeAccount) return;
    setFormAccount(activeAccount.account || '');
    setFormPassword(activeAccount.password || '');
    setFormServer(activeAccount.server || 'MetaQuotes-Demo');
    setFormPath(activeAccount.path || '');

    setFormApiKey(activeAccount.apiKey || '');
    setFormApiSecret(activeAccount.apiSecret || '');
    setFormPassphrase(activeAccount.passphrase || '');
    setFormTestnet(activeAccount.testnet || false);

    setFormHost(activeAccount.host || '127.0.0.1');
    setFormPort(activeAccount.port || '7497');
    setFormClientId(activeAccount.clientId || '1');

    setFormClientCode(activeAccount.clientCode || '');
    setFormPin(activeAccount.pin || '');
    setFormTotpSecret(activeAccount.totpSecret || '');

    setFormRequestToken(activeAccount.requestToken || '');
    setFormRedirectUri(activeAccount.redirectUri || 'https://127.0.0.1:8000/callback');
  }, [selectedId, accounts]);

  // Task 3: Exact Validation rules per broker type
  const validateAccountCredentials = (acc: BrokerAccountItem): { isValid: boolean; fieldError?: string } => {
    if (acc.brokerType === 'paper') return { isValid: true };

    if (acc.brokerType === 'mt5') {
      if (!acc.account || !acc.account.trim()) return { isValid: false, fieldError: 'Login required' };
      if (!acc.password || !acc.password.trim()) return { isValid: false, fieldError: 'Password required' };
      if (!acc.server || !acc.server.trim()) return { isValid: false, fieldError: 'Server required' };
      return { isValid: true };
    }

    if (acc.brokerType === 'binance' || acc.brokerType === 'bybit' || acc.brokerType === 'alpaca') {
      if (!acc.apiKey || !acc.apiKey.trim()) return { isValid: false, fieldError: 'API Key required' };
      if (!acc.apiSecret || !acc.apiSecret.trim()) return { isValid: false, fieldError: 'Secret Key required' };
      return { isValid: true };
    }

    if (acc.brokerType === 'ibkr') {
      if (!acc.host || !acc.host.trim()) return { isValid: false, fieldError: 'Host required' };
      if (!acc.port || !acc.port.trim()) return { isValid: false, fieldError: 'Port required' };
      return { isValid: true };
    }

    if (acc.brokerType === 'zerodha') {
      if (!acc.apiKey || !acc.apiKey.trim()) return { isValid: false, fieldError: 'API Key required' };
      if (!acc.apiSecret || !acc.apiSecret.trim()) return { isValid: false, fieldError: 'API Secret required' };
      return { isValid: true };
    }

    if (acc.brokerType === 'angelone') {
      if (!acc.apiKey || !acc.apiKey.trim()) return { isValid: false, fieldError: 'API Key required' };
      if (!acc.clientCode || !acc.clientCode.trim()) return { isValid: false, fieldError: 'Client Code required' };
      if (!acc.pin || !acc.pin.trim()) return { isValid: false, fieldError: 'PIN required' };
      return { isValid: true };
    }

    if (acc.brokerType === 'upstox') {
      if (!acc.apiKey || !acc.apiKey.trim()) return { isValid: false, fieldError: 'API Key required' };
      if (!acc.apiSecret || !acc.apiSecret.trim()) return { isValid: false, fieldError: 'Secret Key required' };
      return { isValid: true };
    }

    return { isValid: true };
  };

  const handleConnect = async (accId: string) => {
    const target = accounts.find((a) => a.id === accId);
    if (!target) return;

    // Validate credentials first
    const val = validateAccountCredentials(target);
    if (!val.isValid) {
      const errorMsg = val.fieldError || 'Validation failed';
      setAccounts((prev) =>
        prev.map((a) => (a.id === accId ? { ...a, status: 'failed', errorMessage: errorMsg } : a))
      );
      addToast('error', `Connection Failed: ${errorMsg}`);
      return;
    }

    setAccounts((prev) =>
      prev.map((a) => (a.id === accId ? { ...a, status: 'connecting', errorMessage: undefined } : a))
    );

    if (target.brokerType === 'paper') {
      setTimeout(() => {
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === accId
              ? {
                  ...a,
                  status: 'connected',
                  lastSync: new Date().toISOString(),
                  latencyMs: 1
                }
              : a
          )
        );
        addToast('success', `${target.name} connected successfully.`);
      }, 300);
      return;
    }

    // Call Real Backend API POST /brokers/connect
    try {
      const api = getApiUrl();
      const startTime = Date.now();
      const res = await fetch(`${api}/brokers/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          broker_id: target.brokerType,
          account: target.account,
          password: target.password,
          server: target.server,
          path: target.path,
          api_key: target.apiKey,
          api_secret: target.apiSecret,
          passphrase: target.passphrase,
          host: target.host,
          port: target.port ? parseInt(target.port, 10) : undefined,
          client_id: target.clientId,
          client_code: target.clientCode,
          pin: target.pin,
          totp_secret: target.totpSecret,
          request_token: target.requestToken,
          redirect_uri: target.redirectUri,
          testnet: target.testnet,
          environment: target.testnet ? 'demo' : 'live'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const errorDetail = data.detail || data.message || 'Connection failed';
        setAccounts((prev) =>
          prev.map((a) => (a.id === accId ? { ...a, status: 'failed', errorMessage: errorDetail } : a))
        );
        addToast('error', `Connection Failed: ${errorDetail}`);
        return;
      }

      const latency = Date.now() - startTime;
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accId
            ? {
                ...a,
                status: 'connected',
                errorMessage: undefined,
                lastSync: new Date().toISOString(),
                latencyMs: latency
              }
            : a
        )
      );
      addToast('success', `${target.name} connected successfully.`);
    } catch (err: any) {
      const msg = err.message || 'Network failure connecting to gateway';
      setAccounts((prev) =>
        prev.map((a) => (a.id === accId ? { ...a, status: 'failed', errorMessage: msg } : a))
      );
      addToast('error', `Connection Failed: ${msg}`);
    }
  };

  const handleDisconnect = async (accId: string) => {
    const target = accounts.find((a) => a.id === accId);
    if (!target) return;

    try {
      if (target.brokerType !== 'paper') {
        const api = getApiUrl();
        await fetch(`${api}/brokers/disconnect?broker_id=${target.brokerType}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.error('Disconnect API error:', e);
    }

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accId
          ? {
              ...a,
              status: 'disconnected',
              errorMessage: undefined,
              latencyMs: undefined
            }
          : a
      )
    );
    addToast('info', `Disconnected from ${target.name}`);
  };

  const handleSaveParameters = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;

    const updated = accounts.map((a) => {
      if (a.id === activeAccount.id) {
        return {
          ...a,
          account: formAccount,
          password: formPassword,
          server: formServer,
          path: formPath,
          apiKey: formApiKey,
          apiSecret: formApiSecret,
          passphrase: formPassphrase,
          testnet: formTestnet,
          host: formHost,
          port: formPort,
          clientId: formClientId,
          clientCode: formClientCode,
          pin: formPin,
          totpSecret: formTotpSecret,
          requestToken: formRequestToken,
          redirectUri: formRedirectUri
        };
      }
      return a;
    });

    setAccounts(updated);
    addToast('success', `Saved connection settings for ${activeAccount.name}`);
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      addToast('error', 'Account Name is required.');
      return;
    }

    const newId = `acc-${Date.now()}`;
    const newAcc: BrokerAccountItem = {
      id: newId,
      name: newAccName,
      brokerType: newBrokerType,
      status: 'disconnected',
      balance: 0,
      equity: 0,
      positionsCount: 0,
      ordersCount: 0,
      autoReconnect: true,
      server: newBrokerType === 'mt5' ? 'MetaQuotes-Demo' : undefined,
      host: newBrokerType === 'ibkr' ? '127.0.0.1' : undefined,
      port: newBrokerType === 'ibkr' ? '7497' : undefined
    };

    setAccounts((prev) => [...prev, newAcc]);
    setSelectedId(newId);
    setIsAddModalOpen(false);
    setNewAccName('');
    addToast('success', `Added account '${newAccName}'. Please configure credentials and click Connect.`);
  };

  const handleDeleteAccount = (accId: string) => {
    if (accId === 'paper-main') {
      addToast('error', 'Cannot delete default Paper Trading Account.');
      return;
    }
    const filtered = accounts.filter((a) => a.id !== accId);
    setAccounts(filtered);
    if (selectedId === accId) {
      setSelectedId(filtered[0]?.id || 'paper-main');
    }
    addToast('info', 'Account removed from manager.');
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Multi-Broker Manager</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Manage native connections, MT5 gateway, exchange APIs, and account status</span>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            background: 'var(--accent)',
            color: '#070b14',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '5px 10px',
            cursor: 'pointer'
          }}
        >
          + Add Broker Account
        </button>
      </div>

      {/* Main Grid split */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left column: Accounts List */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#0d1322', padding: '6px 10px', borderBottom: '1px solid #1b2235', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Broker Accounts ({accounts.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1b2235', color: '#8e8e93' }}>
                  <th style={{ padding: '6px 4px' }}>Account / Broker</th>
                  <th style={{ padding: '6px 4px' }}>Status</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Last Sync</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Latency</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((b) => {
                  const isSel = b.id === selectedId;
                  const isConn = b.status === 'connected';
                  const isConnng = b.status === 'connecting';
                  const isFailed = b.status === 'failed';
                  
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      style={{
                        borderBottom: '1px solid rgba(27,34,53,0.3)',
                        cursor: 'pointer',
                        background: isSel ? 'rgba(212,175,55,0.06)' : 'transparent',
                        transition: 'background 0.1s'
                      }}
                    >
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: isSel ? 'var(--accent)' : '#f5f5f7' }}>
                        {b.name}
                        <span style={{ fontSize: '8px', display: 'block', color: '#8e8e93', fontWeight: 400 }}>{b.brokerType.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '8px 4px' }}>
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: '2px',
                          fontSize: '8px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: isConn ? 'rgba(0,192,118,0.1)' : isConnng ? 'rgba(234,115,23,0.1)' : 'rgba(255,77,87,0.1)',
                          color: isConn ? '#00c076' : isConnng ? '#ea7317' : '#ff4d57'
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#8e8e93' }}>
                        {b.lastSync ? new Date(b.lastSync).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#8e8e93' }}>
                        {b.latencyMs ? `${b.latencyMs} ms` : '—'}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          {isConn ? (
                            <button
                              onClick={() => handleDisconnect(b.id)}
                              style={{ padding: '3px 6px', fontSize: '9px', background: 'transparent', border: '1px solid #ff4d57', color: '#ff4d57', borderRadius: 3, cursor: 'pointer' }}
                            >
                              Disconnect
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnect(b.id)}
                              disabled={isConnng}
                              style={{ padding: '3px 6px', fontSize: '9px', background: 'transparent', border: '1px solid #00c076', color: '#00c076', borderRadius: 3, cursor: 'pointer' }}
                            >
                              {isConnng ? '...' : 'Connect'}
                            </button>
                          )}
                          {b.id !== 'paper-main' && (
                            <button
                              onClick={() => handleDeleteAccount(b.id)}
                              style={{ padding: '3px 6px', fontSize: '9px', background: 'transparent', border: '1px solid #1b2235', color: '#8e8e93', borderRadius: 3, cursor: 'pointer' }}
                              title="Delete Account"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Broker-Specific Form & Diagnostics */}
        {activeAccount && (
          <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', gap: '8px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                {activeAccount.name} Configuration
              </span>
              <span style={{
                fontSize: '8px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '2px',
                textTransform: 'uppercase',
                background: activeAccount.status === 'connected' ? 'rgba(0,192,118,0.1)' : activeAccount.status === 'failed' ? 'rgba(255,77,87,0.1)' : 'rgba(234,115,23,0.1)',
                color: activeAccount.status === 'connected' ? '#00c076' : activeAccount.status === 'failed' ? '#ff4d57' : '#ea7317'
              }}>
                {activeAccount.status}
              </span>
            </div>

            {/* Error Message Diagnostics Banner */}
            {activeAccount.status === 'failed' && activeAccount.errorMessage && (
              <div style={{ background: 'rgba(255,77,87,0.1)', border: '1px solid #ff4d57', color: '#ff4d57', padding: '6px 8px', borderRadius: '4px', fontSize: '10px' }}>
                <strong>Connection Error:</strong> {activeAccount.errorMessage}
              </div>
            )}

            {activeAccount.brokerType === 'paper' ? (
              <div style={{ fontSize: '11px', color: '#8e8e93', padding: '16px 0', textAlign: 'center' }}>
                Quantum Paper Trading Engine executes in memory. No login or API keys required.
              </div>
            ) : (
              <form onSubmit={handleSaveParameters} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* MetaTrader 5 Form */}
                {activeAccount.brokerType === 'mt5' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Account Login Number <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formAccount}
                        onChange={(e) => setFormAccount(e.target.value)}
                        placeholder="e.g. 1059281"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Password <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="MT5 Trading Password"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Server <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formServer}
                        onChange={(e) => setFormServer(e.target.value)}
                        placeholder="e.g. MetaQuotes-Demo or ICMarkets-Demo"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Terminal Path (Optional)</label>
                      <input
                        type="text"
                        value={formPath}
                        onChange={(e) => setFormPath(e.target.value)}
                        placeholder="e.g. C:\Program Files\MetaTrader 5\terminal64.exe"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                  </>
                )}

                {/* Binance / Bybit / Alpaca Form */}
                {['binance', 'bybit', 'alpaca'].includes(activeAccount.brokerType) && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>API Key <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        placeholder="API Key"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Secret Key <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="password"
                        value={formApiSecret}
                        onChange={(e) => setFormApiSecret(e.target.value)}
                        placeholder="Secret Key"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f5f5f7' }}>
                      <input
                        type="checkbox"
                        checked={formTestnet}
                        onChange={(e) => setFormTestnet(e.target.checked)}
                      />
                      Use Testnet / Sandbox Environment
                    </div>
                  </>
                )}

                {/* IBKR Form */}
                {activeAccount.brokerType === 'ibkr' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>TWS / Gateway Host <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formHost}
                        onChange={(e) => setFormHost(e.target.value)}
                        placeholder="127.0.0.1"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>API Socket Port <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formPort}
                        onChange={(e) => setFormPort(e.target.value)}
                        placeholder="7497 (Paper) / 7496 (Live)"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Client ID</label>
                      <input
                        type="text"
                        value={formClientId}
                        onChange={(e) => setFormClientId(e.target.value)}
                        placeholder="1"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                  </>
                )}

                {/* Zerodha Form */}
                {activeAccount.brokerType === 'zerodha' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>API Key <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        placeholder="Kite API Key"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>API Secret <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="password"
                        value={formApiSecret}
                        onChange={(e) => setFormApiSecret(e.target.value)}
                        placeholder="Kite API Secret"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Request Token</label>
                      <input
                        type="text"
                        value={formRequestToken}
                        onChange={(e) => setFormRequestToken(e.target.value)}
                        placeholder="Request Token from login redirect"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                  </>
                )}

                {/* Angel One Form */}
                {activeAccount.brokerType === 'angelone' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>API Key <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        placeholder="SmartAPI Key"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Client Code <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formClientCode}
                        onChange={(e) => setFormClientCode(e.target.value)}
                        placeholder="e.g. A12345"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>PIN <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="password"
                        value={formPin}
                        onChange={(e) => setFormPin(e.target.value)}
                        placeholder="Account PIN"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>TOTP Secret</label>
                      <input
                        type="password"
                        value={formTotpSecret}
                        onChange={(e) => setFormTotpSecret(e.target.value)}
                        placeholder="Authenticator TOTP Key"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                  </>
                )}

                {/* Upstox Form */}
                {activeAccount.brokerType === 'upstox' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>API Key <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="text"
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        placeholder="Upstox API Key"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>Secret Key <span style={{ color: '#ff4d57' }}>*</span></label>
                      <input
                        type="password"
                        value={formApiSecret}
                        onChange={(e) => setFormApiSecret(e.target.value)}
                        placeholder="Upstox Secret Key"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <label style={{ fontSize: '10px', color: '#8e8e93' }}>OAuth Redirect URL</label>
                      <input
                        type="text"
                        value={formRedirectUri}
                        onChange={(e) => setFormRedirectUri(e.target.value)}
                        placeholder="https://127.0.0.1:8000/callback"
                        style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                      />
                    </div>
                  </>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      background: 'var(--accent)',
                      color: '#070b14',
                      fontWeight: 700,
                      fontSize: '11px',
                      border: 'none',
                      padding: '6px',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Save Parameters
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConnect(activeAccount.id)}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: '#00c076',
                      border: '1px solid #00c076',
                      fontWeight: 700,
                      fontSize: '11px',
                      padding: '6px',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    Connect Gateway
                  </button>
                </div>

              </form>
            )}

          </div>
        )}

      </div>

      {/* Add Account Modal */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '320px', background: '#070b14', border: '1px solid #1b2235', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '13px', color: '#f5f5f7' }}>Add Broker Account</strong>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#8e8e93', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddAccount} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Account Name</label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. My MT5 Real Account"
                  style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Broker Type</label>
                <select
                  value={newBrokerType}
                  onChange={(e) => setNewBrokerType(e.target.value as any)}
                  style={{ padding: '6px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', borderRadius: '4px' }}
                >
                  <option value="mt5">MetaTrader 5</option>
                  <option value="binance">Binance (Spot & Futures)</option>
                  <option value="bybit">Bybit Derivatives</option>
                  <option value="ibkr">Interactive Brokers TWS</option>
                  <option value="zerodha">Zerodha Kite Connect</option>
                  <option value="angelone">Angel One SmartAPI</option>
                  <option value="upstox">Upstox Pro</option>
                  <option value="alpaca">Alpaca Markets</option>
                  <option value="paper">Paper Trading</option>
                </select>
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
                Add Account
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BrokerPanel;
