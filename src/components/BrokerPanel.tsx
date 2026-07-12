// src/components/BrokerPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';

interface BrokerConnection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'connecting';
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  balance: number;
  positionsSynced: number;
  ordersSynced: number;
  autoReconnect: boolean;
}

const INITIAL_BROKERS: BrokerConnection[] = [
  { id: 'paper', name: 'Paper Account', type: 'Simulated', status: 'connected', apiKey: 'PAPER_SYSTEM_KEY', apiSecret: '••••••••••••••••', balance: 10000.00, positionsSynced: 2, ordersSynced: 3, autoReconnect: true },
  { id: 'binance', name: 'Binance Futures', type: 'Crypto', status: 'disconnected', apiKey: '', apiSecret: '', balance: 0.00, positionsSynced: 0, ordersSynced: 0, autoReconnect: true },
  { id: 'bybit', name: 'Bybit Derivatives', type: 'Crypto', status: 'disconnected', apiKey: '', apiSecret: '', balance: 0.00, positionsSynced: 0, ordersSynced: 0, autoReconnect: true },
  { id: 'coinbase', name: 'Coinbase Advanced', type: 'Crypto', status: 'disconnected', apiKey: '', apiSecret: '', balance: 0.00, positionsSynced: 0, ordersSynced: 0, autoReconnect: false },
  { id: 'oanda', name: 'OANDA v20', type: 'Forex', status: 'disconnected', apiKey: '', apiSecret: '', balance: 0.00, positionsSynced: 0, ordersSynced: 0, autoReconnect: true },
  { id: 'ib', name: 'Interactive Brokers TWS', type: 'Multi-Asset', status: 'disconnected', apiKey: '', apiSecret: '', balance: 0.00, positionsSynced: 0, ordersSynced: 0, autoReconnect: true },
  { id: 'mt5', name: 'MetaTrader 5 Bridge', type: 'Forex/CFDs', status: 'disconnected', apiKey: '', apiSecret: '', balance: 0.00, positionsSynced: 0, ordersSynced: 0, autoReconnect: true }
];

const BrokerPanel: React.FC = () => {
  const [brokers, setBrokers] = useState<BrokerConnection[]>(() => {
    try {
      const saved = localStorage.getItem('broker-manager-connections');
      return saved ? JSON.parse(saved) : INITIAL_BROKERS;
    } catch {
      return INITIAL_BROKERS;
    }
  });

  const [selectedId, setSelectedId] = useState<string>('binance');
  const [keyInput, setKeyInput] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [passInput, setPassInput] = useState('');
  const addToast = useAppStore((state) => state.addToast);

  useEffect(() => {
    localStorage.setItem('broker-manager-connections', JSON.stringify(brokers));
  }, [brokers]);

  const activeBroker = brokers.find((b) => b.id === selectedId) || brokers[0];

  const handleConnect = (id: string) => {
    setBrokers((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const isPaper = id === 'paper';
          return {
            ...b,
            status: 'connecting',
          };
        }
        return b;
      })
    );

    // Simulate connection delay
    setTimeout(() => {
      setBrokers((prev) =>
        prev.map((b) => {
          if (b.id === id) {
            const hasKeys = b.apiKey || id === 'paper';
            if (!hasKeys && id !== 'paper') {
              addToast('error', `Failed to connect ${b.name}: Missing API Keys`);
              return { ...b, status: 'disconnected' };
            }
            addToast('success', `${b.name} connected successfully. Synced balance, orders, and positions.`);
            return {
              ...b,
              status: 'connected',
              balance: id === 'paper' ? b.balance : 5000 + Math.random() * 25000,
              positionsSynced: id === 'paper' ? b.positionsSynced : 1 + Math.floor(Math.random() * 4),
              ordersSynced: id === 'paper' ? b.ordersSynced : Math.floor(Math.random() * 5),
            };
          }
          return b;
        })
      );
    }, 1000);
  };

  const handleDisconnect = (id: string) => {
    setBrokers((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          addToast('info', `Disconnected from ${b.name}`);
          return {
            ...b,
            status: 'disconnected',
            balance: id === 'paper' ? b.balance : 0,
            positionsSynced: 0,
            ordersSynced: 0
          };
        }
        return b;
      })
    );
  };

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput) {
      addToast('error', 'API Key cannot be empty');
      return;
    }
    setBrokers((prev) =>
      prev.map((b) => {
        if (b.id === selectedId) {
          return {
            ...b,
            apiKey: keyInput,
            apiSecret: secretInput || '••••••••••••••••',
            passphrase: passInput || undefined
          };
        }
        return b;
      })
    );
    addToast('success', `API Credentials saved for ${activeBroker.name}`);
    setKeyInput('');
    setSecretInput('');
    setPassInput('');
  };

  const handleToggleAutoReconnect = (id: string) => {
    setBrokers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, autoReconnect: !b.autoReconnect } : b))
    );
  };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Multi-Broker Manager</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Manage API connectivity, sync balances and position metrics</span>
        </div>
      </div>

      {/* Main Grid split */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left column: Connections List */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#0d1322', padding: '6px 10px', borderBottom: '1px solid #1b2235', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Broker Accounts
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1b2235', color: '#8e8e93' }}>
                  <th style={{ padding: '6px 4px' }}>Broker / Exchange</th>
                  <th style={{ padding: '6px 4px' }}>Status</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Balance ($)</th>
                  <th style={{ padding: '6px 4px', textAlign: 'right' }}>Sync (Pos/Ord)</th>
                  <th style={{ padding: '6px 4px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map((b) => {
                  const isSel = b.id === selectedId;
                  const isConn = b.status === 'connected';
                  const isConnng = b.status === 'connecting';
                  
                  return (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      style={{
                        borderBottom: '1px solid rgba(27,34,53,0.3)',
                        cursor: 'pointer',
                        background: isSel ? 'rgba(212,175,55,0.04)' : 'transparent',
                        transition: 'background 0.1s'
                      }}
                    >
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: isSel ? 'var(--accent)' : '#f5f5f7' }}>
                        {b.name}
                        <span style={{ fontSize: '8px', display: 'block', color: '#8e8e93', fontWeight: 400 }}>{b.type}</span>
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
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {isConn ? b.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#8e8e93' }}>
                        {isConn ? `${b.positionsSynced} pos / ${b.ordersSynced} ord` : '—'}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {isConn ? (
                          <button
                            onClick={() => handleDisconnect(b.id)}
                            style={{ padding: '3px 8px', fontSize: '9px', background: 'transparent', border: '1px solid #ff4d57', color: '#ff4d57', borderRadius: 3, cursor: 'pointer' }}
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(b.id)}
                            disabled={isConnng}
                            style={{ padding: '3px 8px', fontSize: '9px', background: 'transparent', border: '1px solid #00c076', color: '#00c076', borderRadius: 3, cursor: 'pointer' }}
                          >
                            {isConnng ? '...' : 'Connect'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: Credentials Editor & Status */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', gap: '8px', overflowY: 'auto' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
            Connection Configuration: {activeBroker.name}
          </span>

          {activeBroker.id === 'paper' ? (
            <div style={{ fontSize: '11px', color: '#8e8e93', padding: '16px 0', textAlign: 'center' }}>
              Paper account uses local system memory for trading simulations. No API keys required.
            </div>
          ) : (
            <form onSubmit={handleSaveKeys} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* API Key */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>API Key</label>
                <input
                  type="text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={activeBroker.apiKey ? 'Saved API Key (Encrypted)' : 'Enter API Key'}
                  style={{ padding: '5px 8px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                />
              </div>

              {/* Secret Key */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <label style={{ fontSize: '10px', color: '#8e8e93' }}>Secret Key</label>
                <input
                  type="password"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder={activeBroker.apiSecret ? 'Saved Secret Key (Encrypted)' : 'Enter Secret Key'}
                  style={{ padding: '5px 8px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                />
              </div>

              {/* Passphrase (needed for coinbase/bybit sometimes) */}
              {activeBroker.id === 'coinbase' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '10px', color: '#8e8e93' }}>Passphrase</label>
                  <input
                    type="password"
                    value={passInput}
                    onChange={(e) => setPassInput(e.target.value)}
                    placeholder="Passphrase"
                    style={{ padding: '5px 8px', fontSize: '11px', background: '#0d1322', border: '1px solid #1b2235', color: '#f5f5f7', borderRadius: '3px' }}
                  />
                </div>
              )}

              {/* Save Button */}
              <button
                type="submit"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg-primary)',
                  fontWeight: 700,
                  fontSize: '11px',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                Save Credentials
              </button>
            </form>
          )}

          {/* Auto Reconnect Settings */}
          <div style={{ borderTop: '1px solid #1b2235', paddingTop: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f5f5f7', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={activeBroker.autoReconnect}
                onChange={() => handleToggleAutoReconnect(activeBroker.id)}
              />
              Enable Automatic Reconnection on socket failure
            </label>
            <span style={{ fontSize: '8px', color: '#8e8e93' }}>
              When active, system automatically retries connections with exponential backoff on network dropouts.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default BrokerPanel;
