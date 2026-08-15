/**
 * ChartTradingLayer.tsx
 * Chart trading orchestration layer.
 *
 * Renders:
 *  - A compact trading toolbar DOCKED at the top of the chart (above candles)
 *  - A position card docked top-right
 *  - Professional SL/TP/Entry order lines
 *  - Click-to-place TP/SL (crosshair mode)
 *  - Right-click context menu
 *  - Order preview modal
 *  - Pending order lines
 *  - Hotkeys (B, S, Esc, Del, R, F)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PendingOrderOverlay, PendingOrderOverlayData } from './PendingOrderOverlay';
import { DragTooltip, DragTooltipMetrics } from './DragTooltip';
import { ChartOrderContextMenu } from './ChartOrderContextMenu';
import { OrderPreviewModal, OrderPreviewDetails } from './OrderPreview';
import { PositionCard, PositionCardData } from './PositionCard';
import { ChartOrderLines } from './ChartOrderLines';
import { TPSLManager, TPSLPlacementMode } from './TPSLManager';
import { ChartHotkeys } from './ChartHotkeys';
import { ChartExecutionAnimations } from './ChartExecutionAnimations';
import { usePositionStore } from '../../store/positionStore';
import { useMarketPriceStore } from '../../store/marketPriceStore';
import { useAppStore } from '../../store/appStore';
import {
  placeOrder,
  closeSymbol,
  closeAllPositions,
  reversePosition,
  partialClose,
  breakEven,
  cancelOrder,
} from '../../services/api';
import { useOrderStore } from '../../store/orderStore';

export interface ChartTradingLayerProps {
  symbol: string;
  activeDrawingTool?: string | null;
  height?: number | string;
  minPrice?: number;
  maxPrice?: number;
}

const roundTwo = (n: number) => Math.round(n * 100) / 100;

// ─── Inject global button animations once ────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('ctl-btn-style')) {
  const s = document.createElement('style');
  s.id = 'ctl-btn-style';
  s.textContent = `
    @keyframes ctl-spin { to { transform: rotate(360deg); } }
    .ctl-buy:active  { transform: scale(0.94) !important; }
    .ctl-sell:active { transform: scale(0.94) !important; }
    .ctl-buy:focus-visible  { outline: 2px solid #00c076; outline-offset: 2px; }
    .ctl-sell:focus-visible { outline: 2px solid #ff4d57; outline-offset: 2px; }
    .ctl-icon-btn { transition: all 180ms ease-in-out; }
    .ctl-icon-btn:hover { filter: brightness(1.25); transform: translateY(-1px); }
    .ctl-icon-btn:active { transform: scale(0.95); }
    .ctl-trade-bar-expanded { transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1); }
  `;
  document.head.appendChild(s);
}

export const ChartTradingLayer: React.FC<ChartTradingLayerProps> = ({
  symbol = 'BTCUSDT',
  activeDrawingTool = null,
  height = 500,
  minPrice = 64000,
  maxPrice = 66000,
}) => {
  // ─── Toolbar state ────────────────────────────────────────────────────
  const [oneClickEnabled, setOneClickEnabled] = useState(true);
  const [lotSize, setLotSize] = useState(1.0);
  const [riskPct, setRiskPct] = useState(1.0);
  const [tpInput, setTpInput] = useState<string>('');
  const [slInput, setSlInput] = useState<string>('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [buyHover, setBuyHover] = useState(false);
  const [sellHover, setSellHover] = useState(false);
  const [forceExpanded, setForceExpanded] = useState(false);
  const [isModifyOpen, setIsModifyOpen] = useState(false);

  // ─── TP/SL placement state ────────────────────────────────────────────
  const [placingMode, setPlacingMode] = useState<TPSLPlacementMode>(null);
  const [localSL, setLocalSL] = useState<number | undefined>(undefined);
  const [localTP, setLocalTP] = useState<number | undefined>(undefined);

  // ─── UI state ─────────────────────────────────────────────────────────
  const [activeDropdown, setActiveDropdown] = useState<'position' | 'protection' | 'risk' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; price: number } | null>(null);
  const [dragMetrics, setDragMetrics] = useState<DragTooltipMetrics | null>(null);
  const [orderPreview, setOrderPreview] = useState<OrderPreviewDetails | null>(null);

  useEffect(() => {
    if (!activeDropdown) return;
    const closeDd = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-ctl-dropdown]')) {
        setActiveDropdown(null);
      }
    };
    window.addEventListener('click', closeDd);
    return () => window.removeEventListener('click', closeDd);
  }, [activeDropdown]);

  // ─── Stores ───────────────────────────────────────────────────────────
  const addToast = useAppStore((s) => s.addToast);
  const activeAccountType = useAppStore((s) => s.activeAccountType || 'paper');
  const accountBalance = useAppStore((s) => s.account?.balance ?? 10000);
  const marketPrice = useMarketPriceStore(
    (s) => s.prices[symbol.toUpperCase()]?.currentPrice || s.currentPrice
  );
  const currentPrice = marketPrice > 0 ? marketPrice : 65000.0;

  const positions = usePositionStore((s) => s.positions);
  const activePosition = positions.find(
    (p) => p.symbol === symbol && (p as any).quantity !== 0
  );
  const orders = useOrderStore((s) => s.orders);
  const pendingOrders = orders.filter(
    (o) => o.symbol === symbol &&
      (o.status === 'PENDING' || (o.status as string).toLowerCase() === 'pending')
  );

  // ─── Sync SL/TP from store ────────────────────────────────────────────
  useEffect(() => {
    if (activePosition) {
      const sl = (activePosition as any).stop_loss ?? (activePosition as any).stopLoss;
      const tp = (activePosition as any).take_profit ?? (activePosition as any).takeProfit;
      setLocalSL(sl != null ? sl : undefined);
      setLocalTP(tp != null ? tp : undefined);
      if (sl) setSlInput(sl.toString());
      if (tp) setTpInput(tp.toString());
    } else {
      setLocalSL(undefined);
      setLocalTP(undefined);
    }
  }, [activePosition]);

  // ─── Coordinate helpers ───────────────────────────────────────────────
  const numHeight = typeof height === 'number' ? height : (parseFloat(String(height)) || 500);

  const priceToY = useCallback((price: number) => {
    if (maxPrice <= minPrice || numHeight <= 0) return 0;
    return Math.max(0, Math.min(numHeight, ((maxPrice - price) / (maxPrice - minPrice)) * numHeight));
  }, [numHeight, minPrice, maxPrice]);

  const yToPrice = useCallback((y: number) => {
    if (numHeight <= 0) return currentPrice;
    return maxPrice - (y / numHeight) * (maxPrice - minPrice);
  }, [numHeight, minPrice, maxPrice, currentPrice]);

  useEffect(() => () => ChartExecutionAnimations.cleanup(), []);

  // ─── Ref for stable callbacks ─────────────────────────────────────────
  const ref = useRef({ oneClickEnabled, lotSize, currentPrice, symbol, activeAccountType });
  useEffect(() => {
    ref.current = { oneClickEnabled, lotSize, currentPrice, symbol, activeAccountType };
  });

  // ─── Build SL/TP defaults ─────────────────────────────────────────────
  const buildSlTp = (side: 'buy' | 'sell', price: number) => {
    const slVal = slInput ? parseFloat(slInput) : undefined;
    const tpVal = tpInput ? parseFloat(tpInput) : undefined;
    return { sl: slVal, tp: tpVal };
  };

  // ─── Build preview ────────────────────────────────────────────────────
  const buildLocalPreview = (side: 'buy' | 'sell', orderType: string, price: number): OrderPreviewDetails => {
    const { sl, tp } = buildSlTp(side, price);
    const riskUsd = sl ? Math.abs(price - sl) * lotSize : 0;
    const rewardUsd = tp ? Math.abs(tp - price) * lotSize : 0;
    return {
      symbol, side: side.toUpperCase() as 'BUY' | 'SELL',
      order_type: orderType.toUpperCase(), quantity: lotSize,
      entry_price: price, current_price: currentPrice,
      notional_value: price * lotSize,
      required_margin: Math.round((price * lotSize) / 100),
      margin_percentage: 1.0, estimated_commission: 3.5 * lotSize,
      estimated_spread_cost: 0.5 * lotSize, estimated_swap_nightly: -0.5,
      risk_metrics: {
        entry_price: price, current_price: currentPrice, stop_loss: sl, take_profit: tp,
        risk_usd: riskUsd, risk_pct: roundTwo((riskUsd / accountBalance) * 100),
        sl_projected_pnl: -riskUsd, reward_usd: rewardUsd,
        reward_pct: roundTwo((rewardUsd / accountBalance) * 100),
        tp_projected_pnl: rewardUsd,
        risk_reward_ratio: riskUsd > 0 && rewardUsd > 0 ? `1 : ${(rewardUsd / riskUsd).toFixed(2)}` : '—',
      },
      can_execute: true, warning: undefined,
    };
  };

  // ─── Order execution ──────────────────────────────────────────────────
  const handleOrder = useCallback(async (
    side: 'buy' | 'sell', orderType = 'market', overridePrice?: number,
  ) => {
    const { oneClickEnabled, lotSize, currentPrice, symbol } = ref.current;
    const price = overridePrice || currentPrice;

    if (!oneClickEnabled) {
      setOrderPreview(buildLocalPreview(side, orderType, price));
      return;
    }
    setIsOrdering(true);
    try {
      const payload: Record<string, any> = { symbol, side, type: orderType, quantity: lotSize };
      if (orderType !== 'market') {
        payload.price = price;
      }
      if (slInput) payload.stop_loss = parseFloat(slInput);
      if (tpInput) payload.take_profit = parseFloat(tpInput);
      await placeOrder(payload);
      ChartExecutionAnimations.flashFill(symbol, side, lotSize, price);
      addToast('success', `${side.toUpperCase()} ${lotSize} ${symbol} @ ${price.toFixed(2)}`);
    } catch (err: any) {
      addToast('error', `Order failed: ${err?.message || 'error'}`);
    } finally {
      setIsOrdering(false);
    }
  }, [slInput, tpInput, addToast]);

  // ─── Position actions ─────────────────────────────────────────────────
  const handleClose = useCallback(async () => {
    if (!activePosition) return;
    try { await closeSymbol(symbol, activePosition.id); addToast('success', `Closed ${symbol}`); }
    catch (e: any) { addToast('error', e?.message); }
  }, [activePosition, symbol, addToast]);

  const handleReverse = useCallback(async () => {
    if (!activePosition) return;
    try { await reversePosition(symbol, activePosition.id); addToast('success', `Reversed ${symbol}`); }
    catch (e: any) { addToast('error', e?.message); }
  }, [activePosition, symbol, addToast]);

  const handleFlatten = useCallback(async () => {
    try { await closeAllPositions(); addToast('success', 'Flattened all positions'); }
    catch (e: any) { addToast('error', e?.message); }
  }, [addToast]);

  const handleCancelAll = useCallback(async () => {
    if (!pendingOrders.length) return;
    await Promise.all(pendingOrders.map((o) => cancelOrder(o.id)));
    addToast('success', `Cancelled ${pendingOrders.length} orders`);
  }, [pendingOrders, addToast]);

  const handlePartialClose = useCallback(async (pct: number) => {
    if (!activePosition) return;
    try {
      await partialClose(symbol, roundTwo(activePosition.quantity * pct), activePosition.id);
      addToast('success', `Closed ${Math.round(pct * 100)}%`);
    } catch (e: any) { addToast('error', e?.message); }
  }, [activePosition, symbol, addToast]);

  const handleBreakEven = useCallback(async () => {
    if (!activePosition) return;
    try { await breakEven(symbol, activePosition.id); addToast('success', 'SL → break even'); }
    catch (e: any) { addToast('error', e?.message); }
  }, [activePosition, symbol, addToast]);

  const handleTrail = useCallback(async () => {
    if (!activePosition) return;
    try {
      await placeOrder({
        symbol,
        side: activePosition.quantity > 0 ? 'sell' : 'buy',
        type: 'trailing_stop',
        quantity: Math.abs(activePosition.quantity),
      });
      addToast('success', 'Trailing stop activated');
    } catch (e: any) {
      addToast('info', 'Trailing stop updated');
    }
  }, [activePosition, symbol, addToast]);

  // ─── Context menu ─────────────────────────────────────────────────────
  const handleContextAction = useCallback((action: string, price: number) => {
    const map: Record<string, () => void> = {
      buy_market:  () => handleOrder('buy', 'market', price),
      sell_market: () => handleOrder('sell', 'market', price),
      buy_limit:   () => handleOrder('buy', 'limit', price),
      sell_limit:  () => handleOrder('sell', 'limit', price),
      buy_stop:    () => handleOrder('buy', 'stop', price),
      sell_stop:   () => handleOrder('sell', 'stop', price),
      add_sl: () => setPlacingMode('sl'),
      add_tp: () => setPlacingMode('tp'),
      breakeven: handleBreakEven,
      trailing_stop: handleTrail,
      partial_close: () => handlePartialClose(0.5),
      close_position: handleClose,
      cancel_pending: handleCancelAll,
      reverse_position: handleReverse,
    };
    (map[action] || (() => addToast('info', action)))();
  }, [handleOrder, handleClose, handleCancelAll, handleReverse, handleBreakEven, handleTrail, handlePartialClose, addToast]);

  // ─── Chart clicks ─────────────────────────────────────────────────────
  const handleChartClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (placingMode) return;
    if (!e.shiftKey && !e.ctrlKey && !e.altKey) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const price = yToPrice(e.clientY - rect.top);
    if (e.shiftKey && !e.ctrlKey) handleOrder('buy', 'market', price);
    else if (e.ctrlKey && !e.shiftKey) handleOrder('sell', 'market', price);
    else if (e.altKey) setContextMenu({ x: e.clientX, y: e.clientY, price });
  }, [placingMode, yToPrice, handleOrder]);

  const handleRightClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (placingMode) { setPlacingMode(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ x: e.clientX, y: e.clientY, price: yToPrice(e.clientY - rect.top) });
  }, [placingMode, yToPrice]);

  // ─── Hotkeys ──────────────────────────────────────────────────────────
  useEffect(() => {
    ChartHotkeys.mount({
      onBuy: () => handleOrder('buy', 'market'),
      onSell: () => handleOrder('sell', 'market'),
      onCancel: handleCancelAll,
      onClosePosition: handleClose,
      onReverse: handleReverse,
      onFlatten: handleFlatten,
      onCloseWinners: async () => {
        await Promise.all(
          positions.filter((p) => (p as any).floating_pnl > 0).map((p) => closeSymbol(p.symbol, p.id))
        );
      },
      onCloseLoosers: async () => {
        await Promise.all(
          positions.filter((p) => (p as any).floating_pnl < 0).map((p) => closeSymbol(p.symbol, p.id))
        );
      },
    });
    return () => ChartHotkeys.unmount();
  }, []); // eslint-disable-line

  // ─── Position card data ───────────────────────────────────────────────
  const posCardData: PositionCardData | null = activePosition ? {
    id: activePosition.id,
    symbol: activePosition.symbol,
    side: (((activePosition as any).side || (activePosition.quantity > 0 ? 'BUY' : 'SELL')) as string).toUpperCase() as 'BUY' | 'SELL',
    quantity: Math.abs(activePosition.quantity),
    entryPrice: (activePosition as any).entry_price ?? activePosition.average_price ?? currentPrice,
    currentPrice,
    stopLoss: localSL,
    takeProfit: localTP,
    floatingPnl: (activePosition as any).floating_pnl ?? activePosition.unrealized_pnl ?? 0,
    marginUsed: (activePosition as any).margin_used ?? 0,
    accountBalance,
  } : null;

  const pendingOverlays: PendingOrderOverlayData[] = pendingOrders
    .filter((o) => typeof (o as any).price === 'number')
    .map((o) => ({
      id: o.id, symbol: o.symbol,
      side: (o.side?.toUpperCase() || 'BUY') as 'BUY' | 'SELL',
      order_type: ((o as any).type?.toUpperCase() || 'LIMIT') as string,
      quantity: o.quantity,
      limit_price: (o as any).price as number,
    }));

  // ─── Toolbar styles ───────────────────────────────────────────────────
  const buyStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 14px', borderRadius: 4,
    border: '1px solid rgba(0,192,118,0.5)',
    background: buyHover
      ? 'linear-gradient(135deg,#00c076,#007a4a)'
      : 'linear-gradient(135deg,rgba(0,192,118,0.9),rgba(0,122,74,0.85))',
    color: '#fff', fontFamily: 'Inter,sans-serif', fontSize: 11,
    fontWeight: 800, letterSpacing: '0.8px',
    cursor: isOrdering ? 'wait' : 'pointer',
    transition: 'all 180ms ease-in-out',
    transform: buyHover ? 'scale(1.03)' : 'scale(1)',
    boxShadow: buyHover ? '0 0 16px rgba(0,192,118,0.5)' : '0 0 8px rgba(0,192,118,0.2)',
    whiteSpace: 'nowrap',
  };
  const sellStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 14px', borderRadius: 4,
    border: '1px solid rgba(255,77,87,0.5)',
    background: sellHover
      ? 'linear-gradient(135deg,#ff4d57,#a01420)'
      : 'linear-gradient(135deg,rgba(255,77,87,0.9),rgba(160,20,32,0.85))',
    color: '#fff', fontFamily: 'Inter,sans-serif', fontSize: 11,
    fontWeight: 800, letterSpacing: '0.8px',
    cursor: isOrdering ? 'wait' : 'pointer',
    transition: 'all 180ms ease-in-out',
    transform: sellHover ? 'scale(1.03)' : 'scale(1)',
    boxShadow: sellHover ? '0 0 16px rgba(255,77,87,0.5)' : '0 0 8px rgba(255,77,87,0.2)',
    whiteSpace: 'nowrap',
  };
  const iconBtn = (col = '#94a3b8', active = false): React.CSSProperties => ({
    padding: '4px 8px', borderRadius: 4,
    border: `1px solid ${active ? col + '60' : 'rgba(255,255,255,0.08)'}`,
    background: active ? col + '22' : 'rgba(255,255,255,0.04)',
    color: active ? col : col,
    fontFamily: 'Inter,sans-serif', fontSize: 10, fontWeight: 700,
    cursor: 'pointer', transition: 'all 180ms ease-in-out', whiteSpace: 'nowrap',
    lineHeight: 1,
  });
  const divider: React.CSSProperties = {
    width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 3px',
  };

  const dropdownMenu: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    minWidth: 165,
    background: 'rgba(10, 14, 26, 0.97)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    padding: 4,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    zIndex: 250,
    backdropFilter: 'blur(12px)',
  };

  const dropdownItem = (col = '#e2e8f0'): React.CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 'none',
    color: col,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    padding: '6px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 0.12s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  });

  const dropdownDivider: React.CSSProperties = {
    height: 1,
    background: 'rgba(255, 255, 255, 0.06)',
    margin: '4px 0',
  };

  const chartTradingEnabled = useAppStore((s) => s.settings?.chartTradingEnabled ?? true);
  const isCollapsedByDrawing = Boolean(activeDrawingTool) && !forceExpanded;

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 20,
        overflow: 'hidden', userSelect: 'none', pointerEvents: 'none',
        cursor: placingMode ? 'crosshair' : undefined,
      }}
      onClick={handleChartClick}
      onContextMenu={handleRightClick}
    >
      {/* ══════════════════════════════════════════════════════════════════
          FIXED TRADING TOOLBAR — directly below chart header bar.
          Rendered ONLY when Chart Trading is enabled in settings.
      ══════════════════════════════════════════════════════════════════ */}
      {chartTradingEnabled && (
        <div
          className="ctl-trade-bar-expanded"
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px',
          background: 'rgba(10, 14, 26, 0.96)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
          zIndex: 100,
          pointerEvents: 'auto',
          flexWrap: 'nowrap',
          overflowX: 'auto',
        }}
      >
        {/* Drawing Tools Active -> Collapsed State (Single ⚡ Trade Button) */}
        {isCollapsedByDrawing ? (
          <button
            className="ctl-icon-btn"
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid rgba(212, 175, 55, 0.6)',
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(212, 175, 55, 0.1))',
              color: '#d4af37',
              fontFamily: 'Inter, sans-serif',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => setForceExpanded(true)}
            title="Expand Trading Controls"
          >
            ⚡ Trade
          </button>
        ) : (
          <>
            {/* Draw mode expand toggle if active tool */}
            {activeDrawingTool && (
              <button
                className="ctl-icon-btn"
                style={{ ...iconBtn('#d4af37', true), padding: '3px 6px', fontSize: 9 }}
                onClick={() => setForceExpanded(false)}
                title="Collapse to ⚡ Trade"
              >
                ◀ ⚡
              </button>
            )}

            {/* BUY | SELL Buttons (ALWAYS Visible) */}
            <button
              id="chart-buy-btn"
              className="ctl-buy"
              style={buyStyle}
              onMouseEnter={() => setBuyHover(true)}
              onMouseLeave={() => setBuyHover(false)}
              onClick={() => handleOrder('buy', 'market')}
              title="Buy Market (B)"
              disabled={isOrdering}
            >
              ▲ BUY
            </button>
            <button
              id="chart-sell-btn"
              className="ctl-sell"
              style={sellStyle}
              onMouseEnter={() => setSellHover(true)}
              onMouseLeave={() => setSellHover(false)}
              onClick={() => handleOrder('sell', 'market')}
              title="Sell Market (S)"
              disabled={isOrdering}
            >
              ▼ SELL
            </button>

            <div style={divider} />

            {/* Qty Quick Control */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 1,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4, padding: '1px 2px',
              }}
              title="Quantity (Lots)"
            >
              <span style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, paddingLeft: 4 }}>Qty</span>
              <button
                className="ctl-icon-btn"
                style={{ ...iconBtn(), width: 16, height: 16, padding: 0, fontSize: 12, fontWeight: 900 }}
                onClick={() => setLotSize((v) => Math.max(0.01, parseFloat((v - 0.01).toFixed(2))))}
              >−</button>
              <input
                value={lotSize}
                onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) setLotSize(v); }}
                type="number" step={0.01} min={0.01}
                style={{
                  width: 36, textAlign: 'center', background: 'transparent', border: 'none',
                  color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, outline: 'none',
                }}
              />
              <button
                className="ctl-icon-btn"
                style={{ ...iconBtn(), width: 16, height: 16, padding: 0, fontSize: 12, fontWeight: 900 }}
                onClick={() => setLotSize((v) => parseFloat((v + 0.01).toFixed(2)))}
              >+</button>
            </div>

            <div style={divider} />

            {/* POSITION ▼ DROPDOWN */}
            <div style={{ position: 'relative' }} data-ctl-dropdown>
              <button
                className="ctl-icon-btn"
                style={iconBtn(activePosition ? '#00c076' : '#94a3b8', activeDropdown === 'position')}
                onClick={() => setActiveDropdown(activeDropdown === 'position' ? null : 'position')}
                title="Position Management Tools"
              >
                ⚡ Position ▼
              </button>

              {activeDropdown === 'position' && (
                <div style={dropdownMenu}>
                  {activePosition && (
                    <>
                      <button style={dropdownItem('#ff4d57')} onClick={() => { handleClose(); setActiveDropdown(null); }}>
                        ✕ Close Position ({symbol})
                      </button>
                      <button style={dropdownItem('#a78bfa')} onClick={() => { handleReverse(); setActiveDropdown(null); }}>
                        ⇄ Reverse Direction
                      </button>
                      <button style={dropdownItem('#d4af37')} onClick={() => { handleBreakEven(); setActiveDropdown(null); }}>
                        🛡️ Move SL to Break-Even
                      </button>
                      <div style={dropdownDivider} />
                    </>
                  )}
                  <button style={dropdownItem('#f87171')} onClick={() => { handleFlatten(); setActiveDropdown(null); }}>
                    ◼ Flatten All Positions
                  </button>
                  <button style={dropdownItem('#94a3b8')} onClick={() => { handleCancelAll(); setActiveDropdown(null); }}>
                    ⊘ Cancel Pending Orders
                  </button>
                </div>
              )}
            </div>

            {/* PROTECTION ▼ DROPDOWN (SL/TP/Trail) */}
            <div style={{ position: 'relative' }} data-ctl-dropdown>
              <button
                className="ctl-icon-btn"
                style={iconBtn(localSL || localTP ? '#33e09a' : '#94a3b8', activeDropdown === 'protection')}
                onClick={() => setActiveDropdown(activeDropdown === 'protection' ? null : 'protection')}
                title="SL / TP / Trailing Protection"
              >
                🛡️ Protection ▼
              </button>

              {activeDropdown === 'protection' && (
                <div style={dropdownMenu}>
                  <button style={dropdownItem('#00c076')} onClick={() => { setPlacingMode('tp'); setActiveDropdown(null); }}>
                    🎯 Set Take Profit (Click Chart)
                  </button>
                  <button style={dropdownItem('#ff4d57')} onClick={() => { setPlacingMode('sl'); setActiveDropdown(null); }}>
                    🔒 Set Stop Loss (Click Chart)
                  </button>
                  <button style={dropdownItem('#fb923c')} onClick={() => { handleTrail(); setActiveDropdown(null); }}>
                    ⇣ Activate Trailing Stop
                  </button>
                </div>
              )}
            </div>

            {/* RISK ▼ DROPDOWN */}
            <div style={{ position: 'relative' }} data-ctl-dropdown>
              <button
                className="ctl-icon-btn"
                style={iconBtn('#d4af37', activeDropdown === 'risk')}
                onClick={() => setActiveDropdown(activeDropdown === 'risk' ? null : 'risk')}
                title="Risk % & Margin Settings"
              >
                ⚖️ Risk ({riskPct}%) ▼
              </button>

              {activeDropdown === 'risk' && (
                <div style={{ ...dropdownMenu, width: 180, padding: 8 }}>
                  <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>RISK % OF EQUITY</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                    <input
                      value={riskPct}
                      onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0 && v <= 100) setRiskPct(v); }}
                      type="number" step={0.1} min={0.1} max={100}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 4, color: '#d4af37', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, padding: '3px 6px',
                      }}
                    />
                    <span style={{ fontSize: 10, color: '#d4af37', fontWeight: 800 }}>%</span>
                  </div>

                  <div style={{ fontSize: 9, color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
                    <div>Est Margin: <span style={{ color: '#e2e8f0', fontWeight: 700 }}>${((currentPrice * lotSize) / 100).toFixed(2)}</span></div>
                    <div>Account: <span style={{ color: '#e2e8f0', fontWeight: 700 }}>${accountBalance.toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>

            <div style={divider} />

            {/* Preview Toggle Mode */}
            <button
              id="chart-preview-toggle"
              className="ctl-icon-btn"
              style={iconBtn('#60a5fa', !oneClickEnabled)}
              onClick={() => setOneClickEnabled((v) => !v)}
              title={oneClickEnabled ? 'Switch to Order Preview Mode' : 'Switch to 1-Click Execution Mode'}
            >
              {!oneClickEnabled ? '◉ Preview' : '○ Preview'}
            </button>
          </>
        )}
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CANVAS OVERLAYS — below the toolbar strip (top: 32px effectively)
      ══════════════════════════════════════════════════════════════════ */}

      {/* TP/SL click-to-place */}
      <TPSLManager
        placingMode={placingMode}
        onModeChange={setPlacingMode}
        yToPrice={yToPrice}
        symbol={symbol}
        positionId={activePosition?.id}
        currentSL={localSL}
        currentTP={localTP}
        onPlaced={(type, price) => {
          if (type === 'sl') setLocalSL(price);
          else setLocalTP(price);
          addToast('success', `${type.toUpperCase()} placed @ ${price.toFixed(2)}`);
        }}
      />

      {/* SL/TP/Entry lines */}
      {posCardData && (
        <ChartOrderLines
          entryPrice={posCardData.entryPrice}
          currentPrice={currentPrice}
          stopLoss={localSL}
          takeProfit={localTP}
          side={posCardData.side}
          quantity={posCardData.quantity}
          symbol={symbol}
          positionId={posCardData.id}
          accountBalance={accountBalance}
          priceToY={priceToY}
          yToPrice={yToPrice}
          onAddSL={() => setPlacingMode('sl')}
          onAddTP={() => setPlacingMode('tp')}
          onSLChanged={(p) => setLocalSL(p > 0 ? p : undefined)}
          onTPChanged={(p) => setLocalTP(p > 0 ? p : undefined)}
          onClose={handleClose}
        />
      )}

      {/* Pending order lines */}
      {pendingOverlays.map((order) => (
        <PendingOrderOverlay
          key={order.id}
          order={order}
          priceToY={priceToY}
          onStartDrag={() => {}}
          onCancel={() =>
            cancelOrder(order.id)
              .then(() => addToast('success', 'Order cancelled'))
              .catch((e) => addToast('error', e.message))
          }
        />
      ))}

      {dragMetrics && <DragTooltip metrics={dragMetrics} />}

      {/* Right-click menu */}
      {contextMenu && (
        <ChartOrderContextMenu
          x={contextMenu.x} y={contextMenu.y} price={contextMenu.price}
          symbol={symbol}
          onSelectAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Order preview */}
      {orderPreview && (
        <OrderPreviewModal
          details={orderPreview}
          onConfirm={async () => {
            setOrderPreview(null);
            try {
              await placeOrder({
                symbol: orderPreview.symbol,
                side: orderPreview.side.toLowerCase(),
                type: orderPreview.order_type.toLowerCase(),
                quantity: orderPreview.quantity,
                price: orderPreview.entry_price,
                stop_loss: orderPreview.risk_metrics?.stop_loss,
                take_profit: orderPreview.risk_metrics?.take_profit,
              });
              ChartExecutionAnimations.flashFill(
                orderPreview.symbol,
                orderPreview.side.toLowerCase() as 'buy' | 'sell',
                orderPreview.quantity,
                orderPreview.entry_price,
              );
              addToast('success', `${orderPreview.side} ${orderPreview.quantity} ${orderPreview.symbol} confirmed`);
            } catch (e: any) { addToast('error', `Order failed: ${e?.message}`); }
          }}
          onCancel={() => setOrderPreview(null)}
        />
      )}

      {/* Position card — docked top-right */}
      {posCardData && (
        <PositionCard
          position={posCardData}
          onClose={handleClose}
          onReverse={handleReverse}
          onBreakEven={handleBreakEven}
          onPartialClose={handlePartialClose}
          onAddSL={() => setPlacingMode('sl')}
          onAddTP={() => setPlacingMode('tp')}
        />
      )}
    </div>
  );
};

// Re-export ChartToolbar for any external use
export { ChartToolbar } from './ChartToolbar';
