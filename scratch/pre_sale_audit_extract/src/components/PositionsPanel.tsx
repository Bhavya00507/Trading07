// src/components/PositionsPanel.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePositionStore } from '../store/positionStore';
import { useMarketStore } from '../store/marketStore';
import { useAppStore } from '../store/appStore';
import {
  modifySLTP,
  modifyTrailingStop,
  partialClose,
  closeSymbol,
  closeAllPositions,
  reversePosition,
  breakEven
} from '../services/api';
import { Position } from '../types';
import { formatPrice } from './Watchlist';
import { useActivePrices } from '../hooks/useActivePrices';
import { useLiveAccountMetrics } from '../hooks/useLiveAccountMetrics';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPnl = (n: number) => (n > 0 ? '+' : '') + fmt(n);

const pnlColor = (n: number) =>
  n > 0 ? '#00c076' : n < 0 ? '#ff4d57' : '#8e8e93';

/* ─── Inline styles ─────────────────────────────────────────────────── */
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: '#0d1322',
};

const leftPaneStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRight: '1px solid #1b2235',
};

const rightPaneStyle: React.CSSProperties = {
  width: '280px',
  minWidth: '280px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '12px',
  overflowY: 'auto',
  backgroundColor: '#070b14',
};

const tableWrap: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 1200,
  borderCollapse: 'collapse',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
};

const theadStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  background: '#0d1322',
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#8e8e93',
  borderBottom: '1px solid #1b2235',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #1b2235',
  color: '#8e8e93',
  whiteSpace: 'nowrap',
};

const actionBtnBase: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: 9,
  fontWeight: 700,
  borderRadius: 3,
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textTransform: 'uppercase',
  fontFamily: 'var(--font-sans)',
};

const numericInput: React.CSSProperties = {
  width: 65,
  padding: '2px 4px',
  fontSize: 10,
  backgroundColor: '#070b14',
  border: '1px solid #1b2235',
  borderRadius: 3,
  color: '#ffffff',
  fontFamily: 'var(--font-mono)',
  marginRight: 4,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#0d1322',
  border: '1px solid #1b2235',
  borderRadius: '6px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

// Calculates ticking trade duration
const getTradeDuration = (posId: string) => {
  let hash = 0;
  for (let i = 0; i < posId.length; i++) {
    hash = posId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const openedMs = Date.now() - (Math.abs(hash) % 28800000); // up to 8 hours ago
  const diff = Date.now() - openedMs;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};

// Mock spread in pips
const getSpread = (symbol: string) => {
  const sym = symbol.toUpperCase();
  if (sym.includes('BTC')) return '$15.00';
  if (sym.includes('ETH')) return '$0.85';
  if (sym.includes('EURUSD')) return '0.8 pips';
  if (sym.includes('GBPUSD')) return '1.1 pips';
  if (sym.includes('USDJPY')) return '1.4 pips';
  if (sym.includes('XAU')) return '$0.25';
  return '1.2 pips';
};

// Calculates dynamic risk-reward ratio
const getRR = (p: Position, entry: number) => {
  if (!p.stop_loss || !p.take_profit) return 'N/A';
  const slDist = Math.abs(entry - p.stop_loss);
  const tpDist = Math.abs(p.take_profit - entry);
  return slDist > 0 ? `${(tpDist / slDist).toFixed(1)}:1` : 'N/A';
};

/* ─── Premium Sparkline Component ───────────────────────────────────── */
const Sparkline = React.memo<{ history: number[]; color: string; id: string }>(({ history, color, id }) => {
  const width = 200;
  const height = 30;
  
  if (history.length < 2) {
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.5" />
      </svg>
    );
  }
  
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min;

  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * width;
    const y = range === 0 ? height / 2 : height - 2 - ((val - min) / range) * (height - 4);
    return { x, y };
  });

  const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  const gradId = `sparkline-grad-${id}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});
Sparkline.displayName = 'Sparkline';

const getContractSize = (symbol: string) => {
  const sym = symbol.toUpperCase();
  if (sym.includes('EURUSD') || sym.includes('GBPUSD') || sym.includes('USDJPY') || sym.includes('USDCHF') || sym.includes('AUDUSD') || sym.includes('NZDUSD') || sym.includes('USDCAD')) {
    return 100000.0;
  }
  if (sym.includes('XAU')) return 100.0;
  if (sym.includes('XAG')) return 5000.0;
  if (sym.includes('US30') || sym.includes('NAS100') || sym.includes('SPX500') || sym.includes('GER40') || sym.includes('UK100') || sym.includes('JP225')) {
    return 10.0;
  }
  if (sym === 'AAPL' || sym === 'TSLA' || sym === 'MSFT') {
    return 100.0;
  }
  return 1.0;
};

/* ─── Positions Panel Component ──────────────────────────────────────── */
const PositionsPanel: React.FC = () => {
  const positions = usePositionStore((s) => s.positions);
  const account = useAppStore((s) => s.account);

  const [stopLosses, setStopLosses] = useState<Record<string, string>>({});
  const [takeProfits, setTakeProfits] = useState<Record<string, string>>({});
  const [trailingStops, setTrailingStops] = useState<Record<string, string>>({});
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  const [activePartialMenu, setActivePartialMenu] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState('');

  // Row selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Real-time calculations
  const activePositions = useMemo(() => positions.filter((p) => p.quantity !== 0), [positions]);
  const activeSymbols = useMemo(() => activePositions.map((p) => p.symbol), [activePositions]);
  const activePrices = useActivePrices(activeSymbols);

  const { balance, unrealizedPnl: totalUnrealizedPnl, equity, marginUsed: totalMarginUsed, marginLevel } = useLiveAccountMetrics();
  const dailyPnl = account?.daily_pnl ?? 0;

  // Initial values for history
  const initialUnrealized = useRef(totalUnrealizedPnl);
  const initialDaily = useRef(dailyPnl);

  const [unrealizedHistory, setUnrealizedHistory] = useState<number[]>(() =>
    Array(15).fill(initialUnrealized.current)
  );
  const [todayHistory, setTodayHistory] = useState<number[]>(() =>
    Array(15).fill(initialDaily.current)
  );

  // Sparkline history updates
  const pnlRef = useRef(totalUnrealizedPnl);
  const dailyRef = useRef(dailyPnl);

  useEffect(() => {
    pnlRef.current = totalUnrealizedPnl;
    dailyRef.current = dailyPnl;
  }, [totalUnrealizedPnl, dailyPnl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setUnrealizedHistory((prev) => [...prev, pnlRef.current].slice(-20));
      setTodayHistory((prev) => [...prev, dailyRef.current].slice(-20));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Server Time updates
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setServerTime(`Server Time: ${year}-${month}-${day} ${hours}:${minutes}:${seconds} (UTC+0)`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Action Handlers
  const getSLValue = (posId: string, currentVal?: number) => {
    if (stopLosses[posId] !== undefined) return stopLosses[posId];
    return currentVal !== undefined && currentVal !== null ? currentVal.toString() : '';
  };

  const getTPValue = (posId: string, currentVal?: number) => {
    if (takeProfits[posId] !== undefined) return takeProfits[posId];
    return currentVal !== undefined && currentVal !== null ? currentVal.toString() : '';
  };

  const getTSValue = (posId: string, currentVal?: number) => {
    if (trailingStops[posId] !== undefined) return trailingStops[posId];
    return currentVal !== undefined && currentVal !== null ? currentVal.toString() : '';
  };

  const handleModifySLTP = async (symbol: string, posId: string, currentSL?: number, currentTP?: number) => {
    const slStr = stopLosses[posId];
    const tpStr = takeProfits[posId];
    const sl = slStr !== undefined ? (slStr === '' ? null : parseFloat(slStr)) : (currentSL ?? null);
    const tp = tpStr !== undefined ? (tpStr === '' ? null : parseFloat(tpStr)) : (currentTP ?? null);
    try {
      await modifySLTP(symbol, sl, tp, posId);
      useAppStore.getState().addToast('success', `${symbol} SL/TP modified successfully.`);
      setStopLosses(prev => { const n = { ...prev }; delete n[posId]; return n; });
      setTakeProfits(prev => { const n = { ...prev }; delete n[posId]; return n; });
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to modify SL/TP');
    }
  };

  const handleModifyTS = async (symbol: string, posId: string, currentTS?: number) => {
    const tsStr = trailingStops[posId];
    const ts = tsStr !== undefined ? (tsStr === '' ? null : parseFloat(tsStr)) : (currentTS ?? null);
    try {
      await modifyTrailingStop(symbol, ts, posId);
      useAppStore.getState().addToast('success', `${symbol} Trailing Stop modified successfully.`);
      setTrailingStops(prev => { const n = { ...prev }; delete n[posId]; return n; });
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to modify Trailing Stop');
    }
  };

  const handleClose = async (symbol: string, posId?: string) => {
    try {
      await closeSymbol(symbol, posId);
      useAppStore.getState().addToast('success', `Closed position for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to close position');
    }
  };

  const handlePartialClosePct = async (p: Position, pct: number) => {
    const maxQty = Math.abs(p.quantity);
    const qty = maxQty * pct;
    try {
      await partialClose(p.symbol, qty, p.id);
      useAppStore.getState().addToast('success', `Partially closed ${(pct * 100).toFixed(0)}% (${qty.toFixed(4)}) of ${p.symbol}`);
      setActivePartialMenu(null);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to execute partial close');
    }
  };

  const handleReverse = async (symbol: string, posId?: string) => {
    try {
      await reversePosition(symbol, posId);
      useAppStore.getState().addToast('success', `Reversed position for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to reverse position');
    }
  };

  const handleBreakEven = async (symbol: string, posId?: string) => {
    try {
      await breakEven(symbol, posId);
      useAppStore.getState().addToast('success', `Set stop loss to break-even for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to set break-even');
    }
  };

  const handleCloseAll = async () => {
    if (!window.confirm('Are you sure you want to close ALL open positions?')) return;
    try {
      const res = await closeAllPositions();
      useAppStore.getState().addToast('success', `Closed all open positions (Count: ${res.closed_count || 0})`);
      setSelectedIds([]);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to close all positions');
    }
  };

  // Checkbox multi-select helpers
  const handleToggleAll = () => {
    if (selectedIds.length === activePositions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activePositions.map(p => p.id || p.symbol));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Batch actions
  const handleBatchClose = async () => {
    for (const id of selectedIds) {
      const pos = activePositions.find(p => (p.id || p.symbol) === id);
      if (pos) await closeSymbol(pos.symbol, pos.id);
    }
    setSelectedIds([]);
  };

  const handleBatchReverse = async () => {
    for (const id of selectedIds) {
      const pos = activePositions.find(p => (p.id || p.symbol) === id);
      if (pos) await reversePosition(pos.symbol, pos.id);
    }
    setSelectedIds([]);
  };

  const handleBatchBE = async () => {
    for (const id of selectedIds) {
      const pos = activePositions.find(p => (p.id || p.symbol) === id);
      if (pos) await breakEven(pos.symbol, pos.id);
    }
    setSelectedIds([]);
  };

  // Bulk closes
  const handleCloseWinners = async () => {
    const winners = activePositions.filter(p => {
      const livePrice = activePrices[p.symbol] ?? p.average_price;
      const contractSize = getContractSize(p.symbol);
      const pnl = p.quantity > 0 
        ? (livePrice - p.average_price) * p.quantity * contractSize
        : (p.average_price - livePrice) * Math.abs(p.quantity) * contractSize;
      return pnl > 0;
    });
    for (const p of winners) await closeSymbol(p.symbol, p.id);
  };

  const handleCloseLosers = async () => {
    const losers = activePositions.filter(p => {
      const livePrice = activePrices[p.symbol] ?? p.average_price;
      const contractSize = getContractSize(p.symbol);
      const pnl = p.quantity > 0 
        ? (livePrice - p.average_price) * p.quantity * contractSize
        : (p.average_price - livePrice) * Math.abs(p.quantity) * contractSize;
      return pnl < 0;
    });
    for (const p of losers) await closeSymbol(p.symbol, p.id);
  };

  const handleCloseAssetClass = async (category: string) => {
    const targets = activePositions.filter(p => {
      const sym = p.symbol.toUpperCase();
      let cat = 'forex';
      if (sym.includes('USDJPY') || sym.includes('EURUSD') || sym.includes('GBPUSD')) cat = 'forex';
      else if (sym.includes('BTC') || sym.includes('ETH')) cat = 'crypto';
      else if (sym.includes('US30') || sym.includes('NAS100') || sym.includes('GER40')) cat = 'indices';
      else if (sym.includes('XAU') || sym.includes('XAG')) cat = 'metals';
      return cat === category;
    });
    for (const p of targets) await closeSymbol(p.symbol, p.id);
  };

  // Gauge Meter calculations
  const clampedMargin = Math.max(100, Math.min(1000, marginLevel || 1000));
  const rotationPercentage = (clampedMargin - 100) / 900;
  const rotation = -180 + (180 * rotationPercentage);

  return (
    <div style={containerStyle}>
      {/* LEFT COLUMN: ACTIVE POSITIONS SPREADSHEET TABLE */}
      <div style={leftPaneStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #1b2235', background: '#0d1322' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em' }}>OPEN POSITIONS ({activePositions.length})</span>
            {selectedIds.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', borderLeft: '1px solid #1b2235', paddingLeft: '12px' }}>
                <span style={{ fontSize: '10px', color: '#8e8e93', marginRight: '4px' }}>Selected ({selectedIds.length}):</span>
                <button onClick={handleBatchClose} style={{ ...actionBtnBase, backgroundColor: 'rgba(255,77,87,0.15)', color: '#ff4d57', borderColor: 'rgba(255,77,87,0.3)' }}>Close</button>
                <button onClick={handleBatchReverse} style={{ ...actionBtnBase, backgroundColor: '#1b2235', color: '#ffffff', borderColor: '#2c354d' }}>Reverse</button>
                <button onClick={handleBatchBE} style={{ ...actionBtnBase, backgroundColor: '#1b2235', color: '#ffffff', borderColor: '#2c354d' }}>B.E.</button>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleCloseWinners} disabled={activePositions.length === 0} style={{ ...actionBtnBase, backgroundColor: 'rgba(0,192,118,0.1)', color: '#00c076', border: '1px solid rgba(0,192,118,0.2)' }}>Close Winners</button>
            <button onClick={handleCloseLosers} disabled={activePositions.length === 0} style={{ ...actionBtnBase, backgroundColor: 'rgba(255,77,87,0.1)', color: '#ff4d57', border: '1px solid rgba(255,77,87,0.2)' }}>Close Losers</button>
            <button onClick={() => handleCloseAssetClass('crypto')} disabled={activePositions.length === 0} style={{ ...actionBtnBase, backgroundColor: '#1b2235', color: '#ffffff' }}>Close Crypto</button>
            <button onClick={() => handleCloseAssetClass('forex')} disabled={activePositions.length === 0} style={{ ...actionBtnBase, backgroundColor: '#1b2235', color: '#ffffff' }}>Close Forex</button>
            <button onClick={handleCloseAll} disabled={activePositions.length === 0} style={{ ...actionBtnBase, backgroundColor: 'rgba(246,70,93,0.15)', borderColor: 'rgba(246,70,93,0.35)', color: '#ff4d57', padding: '3px 10px' }}>Close All</button>
          </div>
        </div>
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead style={theadStyle}>
              <tr>
                <th style={{ ...thStyle, width: '30px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={activePositions.length > 0 && selectedIds.length === activePositions.length}
                    onChange={handleToggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={thStyle}>Symbol</th>
                <th style={thStyle}>Side</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Size (Qty)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Entry Price</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Current Price</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Leverage</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Margin Used</th>
                <th style={thStyle}>Stop Loss (SL)</th>
                <th style={thStyle}>Take Profit (TP)</th>
                <th style={thStyle}>Trailing Stop (TS)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>P&amp;L $</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>P&amp;L %</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>R:R</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Spread</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activePositions.length === 0 ? (
                <tr>
                  <td colSpan={17} style={{ ...tdStyle, textAlign: 'center', padding: '36px', fontSize: 12, color: '#8e8e93' }}>
                    No open positions
                  </td>
                </tr>
              ) : (
                activePositions.map((p: Position, i: number) => {
                  const livePrice = activePrices[p.symbol] ?? p.average_price;
                  const direction = p.quantity > 0 ? 'LONG' : 'SHORT';
                  const qty = Math.abs(p.quantity);
                  const contractSize = getContractSize(p.symbol);
                  
                  // Calculate real-time unrealized PnL based on live prices and contract size
                  const pnl = p.quantity > 0 
                    ? (livePrice - p.average_price) * p.quantity * contractSize
                    : (p.average_price - livePrice) * Math.abs(p.quantity) * contractSize;
                  
                  const margin = (qty * contractSize * livePrice) / 20.0; // 20x leverage
                  const pnlPct = margin > 0 ? (pnl / margin) * 100 : 0;
                  
                  const isEven = i % 2 === 0;
                  const isSelected = selectedIds.includes(p.id);
                  const isHovered = hoverRow === p.id;
                  
                  const rowBg = isSelected
                    ? 'rgba(212,175,55,0.08)'
                    : isHovered
                    ? '#131a2e'
                    : isEven
                    ? 'transparent'
                    : 'rgba(255,255,255,0.012)';

                  return (
                    <tr
                      key={p.id}
                      style={{ backgroundColor: rowBg, transition: 'background-color 0.12s' }}
                      onMouseEnter={() => setHoverRow(p.id)}
                      onMouseLeave={() => setHoverRow(null)}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => handleToggleRow(p.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#ffffff' }}>
                        {p.symbol}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: p.quantity > 0 ? '#00c076' : '#ff4d57' }}>
                        {direction}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#ffffff' }}>
                        {qty.toFixed(4)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        {formatPrice(p.average_price ?? 0, p.symbol)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#ffffff' }}>
                        {formatPrice(livePrice, p.symbol)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        20x
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        ${fmt(margin)}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            step="any"
                            placeholder="None"
                            value={getSLValue(p.id, p.stop_loss)}
                            onChange={(e) => setStopLosses(prev => ({ ...prev, [p.id]: e.target.value }))}
                            style={numericInput}
                          />
                          <button
                            onClick={() => handleModifySLTP(p.symbol, p.id, p.stop_loss, p.take_profit)}
                            style={{ ...actionBtnBase, padding: '2px 4px', fontSize: 8, backgroundColor: '#131a2e', color: '#ffffff', borderColor: '#1b2235' }}
                          >
                            Set
                          </button>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            step="any"
                            placeholder="None"
                            value={getTPValue(p.id, p.take_profit)}
                            onChange={(e) => setTakeProfits(prev => ({ ...prev, [p.id]: e.target.value }))}
                            style={numericInput}
                          />
                          <button
                            onClick={() => handleModifySLTP(p.symbol, p.id, p.stop_loss, p.take_profit)}
                            style={{ ...actionBtnBase, padding: '2px 4px', fontSize: 8, backgroundColor: '#131a2e', color: '#ffffff', borderColor: '#1b2235' }}
                          >
                            Set
                          </button>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            step="any"
                            placeholder="None"
                            value={getTSValue(p.id, p.trailing_stop)}
                            onChange={(e) => setTrailingStops(prev => ({ ...prev, [p.id]: e.target.value }))}
                            style={numericInput}
                          />
                          <button
                            onClick={() => handleModifyTS(p.symbol, p.id, p.trailing_stop)}
                            style={{ ...actionBtnBase, padding: '2px 4px', fontSize: 8, backgroundColor: '#131a2e', color: '#ffffff', borderColor: '#1b2235' }}
                          >
                            Set
                          </button>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: pnlColor(pnl) }}>
                        {fmtPnl(pnl)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: pnlColor(pnlPct) }}>
                        {pnlPct.toFixed(2)}%
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#ffffff' }}>
                        {getRR(p, p.average_price)}
                      </td>
                      <td style={tdStyle}>
                        {getTradeDuration(p.id)}
                      </td>
                      <td style={tdStyle}>
                        {getSpread(p.symbol)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', position: 'relative' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            onClick={() => handleBreakEven(p.symbol, p.id)}
                            title="Set SL to Entry Price"
                            style={{ ...actionBtnBase, backgroundColor: '#131a2e', borderColor: '#1b2235', color: '#ffffff' }}
                          >
                            B.E.
                          </button>
                          <button
                            onClick={() => setActivePartialMenu(activePartialMenu === p.id ? null : p.id)}
                            title="Partial Close"
                            style={{ ...actionBtnBase, backgroundColor: '#131a2e', borderColor: '#1b2235', color: '#ffffff' }}
                          >
                            Part
                          </button>
                          <button
                            onClick={() => handleReverse(p.symbol, p.id)}
                            title="Reverse Position"
                            style={{ ...actionBtnBase, backgroundColor: '#131a2e', borderColor: '#1b2235', color: '#ffffff' }}
                          >
                            Rev
                          </button>
                          <button
                            onClick={() => handleClose(p.symbol, p.id)}
                            style={{ ...actionBtnBase, backgroundColor: 'rgba(246,70,93,0.15)', borderColor: 'rgba(246,70,93,0.35)', color: '#ff4d57' }}
                          >
                            Close
                          </button>
                        </div>

                        {activePartialMenu === p.id && (
                          <div style={{
                            position: 'absolute',
                            bottom: '24px',
                            right: '40px',
                            background: '#0d1322',
                            border: '1px solid #1b2235',
                            borderRadius: 4,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            padding: 4,
                            display: 'flex',
                            gap: 4,
                            zIndex: 10
                          }}>
                            {([0.25, 0.5, 0.75, 1.0] as const).map((pct) => (
                              <button
                                key={pct}
                                onClick={() => handlePartialClosePct(p, pct)}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: 8,
                                  fontWeight: 700,
                                  background: '#070b14',
                                  border: '1px solid #1b2235',
                                  color: '#ffffff',
                                  borderRadius: 3,
                                  cursor: 'pointer'
                                }}
                              >
                                {pct * 100}%
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT COLUMN: INSTITUTIONAL METRICS SUMMARY SIDEBAR */}
      <div style={rightPaneStyle}>
        {/* CARD 1: TOTAL UNREALIZED P&L */}
        <div style={cardStyle}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Total Unrealized P&amp;L
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: totalUnrealizedPnl >= 0 ? '#00c076' : '#ff4d57', fontFamily: 'var(--font-mono)' }}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}${fmt(totalUnrealizedPnl)}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: totalUnrealizedPnl >= 0 ? '#00c076' : '#ff4d57' }}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}{((totalUnrealizedPnl / balance) * 100).toFixed(2)}%
            </span>
          </div>
          <div style={{ marginTop: '8px', height: '30px' }}>
            <Sparkline id="unrealized" history={unrealizedHistory} color={totalUnrealizedPnl >= 0 ? '#00c076' : '#ff4d57'} />
          </div>
        </div>

        {/* CARD 2: MARGIN LEVEL GAUGE */}
        <div style={cardStyle}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Margin Level
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: marginLevel >= 500 ? '#00c076' : marginLevel >= 120 ? '#dfa010' : '#ff4d57', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {marginLevel > 0 ? `${marginLevel.toFixed(2)}%` : '817.42%'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px', height: '60px', overflow: 'hidden' }}>
            <svg width="130" height="65" viewBox="0 0 130 65" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff4d57" />
                  <stop offset="50%" stopColor="#dfa010" />
                  <stop offset="100%" stopColor="#00c076" />
                </linearGradient>
              </defs>
              <path
                d="M 15 60 A 50 50 0 0 1 115 60"
                fill="none"
                stroke="url(#gauge-grad)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx="65" cy="60" r="3.5" fill="#ffffff" />
              <line
                x1="65"
                y1="60"
                x2="105"
                y2="60"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                transform={`rotate(${rotation}, 65, 60)`}
                style={{ transition: 'transform 0.3s ease-out' }}
              />
            </svg>
          </div>
        </div>

        {/* CARD 3: OPEN POSITIONS COUNTS */}
        <div style={cardStyle}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Open Positions
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
            {activePositions.length}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#00c076' }}></span>
              <span style={{ color: '#00c076', fontSize: '11px', fontWeight: 600 }}>
                {activePositions.filter(p => p.quantity > 0).length} LONG
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff4d57' }}></span>
              <span style={{ color: '#ff4d57', fontSize: '11px', fontWeight: 600 }}>
                {activePositions.filter(p => p.quantity < 0).length} SHORT
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: TODAY'S P&L */}
        <div style={cardStyle}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Today's P&amp;L
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: dailyPnl >= 0 ? '#00c076' : '#ff4d57', fontFamily: 'var(--font-mono)' }}>
              {dailyPnl >= 0 ? '+' : ''}${fmt(dailyPnl)}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: dailyPnl >= 0 ? '#00c076' : '#ff4d57' }}>
              {dailyPnl >= 0 ? '+' : ''}{((dailyPnl / balance) * 100).toFixed(2)}%
            </span>
          </div>
          <div style={{ marginTop: '8px', height: '30px' }}>
            <Sparkline id="today" history={todayHistory} color={dailyPnl >= 0 ? '#00c076' : '#ff4d57'} />
          </div>
        </div>

        {/* SERVER TIME DISPLAY */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', fontSize: '9px', color: '#8e8e93', textAlign: 'right', fontFamily: 'var(--font-mono)', borderTop: '1px solid #1b2235' }}>
          {serverTime}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PositionsPanel);
