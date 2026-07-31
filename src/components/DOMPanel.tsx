// src/components/DOMPanel.tsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { usePositionStore } from '../store/positionStore';
import { useOrderStore } from '../store/orderStore';
import { placeOrder, closeSymbol, reversePosition, cancelOrder, modifyOrder, fetchDOMLadder } from '../services/api';
import { MBOAnalytics } from './OrderFlow/MBOAnalytics';

interface DOMLevel {
  price: number;
  bidVol: number;
  askVol: number;
  cumBidVol: number;
  cumAskVol: number;
  bidOrders: number;
  askOrders: number;
  bidIntensity: number;
  askIntensity: number;
  isLarge: boolean;
  isIceberg: boolean;
  isSpoof: boolean;
  isImbalance: boolean;
  imbalanceRatio: number;
  vpBuyVol: number;
  vpSellVol: number;
  vpTotalVol: number;
  isPOC: boolean;
  isVAH: boolean;
  isVAL: boolean;
}

interface RecentPrint {
  id: string;
  time: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

interface SweepAlert {
  id: string;
  time: string;
  side: string;
  msg: string;
}

const getPipSize = (symbol: string) => {
  const sym = symbol.toUpperCase();
  if (sym.includes('JPY')) return 0.01;
  if (sym.includes('XAU')) return 0.10;
  if (sym.includes('XAG')) return 0.01;
  if (anyIn(sym, ['US30', 'NAS100', 'SPX500', 'GER40'])) return 1.0;
  return 0.0001;
};

const getPrecision = (sym: string) => {
  const symbol = sym.toUpperCase();
  if (symbol.includes('JPY') || symbol.includes('XAU')) return 2;
  if (symbol.includes('XAG')) return 3;
  if (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP')) return 5;
  return 2;
};

function anyIn(str: string, arr: string[]) {
  return arr.some((k) => str.includes(k));
}

export const DOMPanel: React.FC = () => {
  // Stores
  const selected = useAppStore((state) => state.selectedInstrument);
  const prices = useMarketPriceStore((state) => state.prices);
  const addToast = useAppStore((state) => state.addToast);
  const activeAccountType = useAppStore((state) => state.activeAccountType || 'paper');
  const positions = usePositionStore((state) => state.positions);
  const orders = useOrderStore((state) => state.orders);

  // Settings & Modes
  const [lotSize, setLotSize] = useState<number>(0.1);
  const [timeInForce, setTimeInForce] = useState<string>('GTC');
  const [isPostOnly, setIsPostOnly] = useState<boolean>(false);
  const [isReduceOnly, setIsReduceOnly] = useState<boolean>(false);
  const [depthLevels, setDepthLevels] = useState<number>(30);
  const [showProfile, setShowProfile] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showMboView, setShowMboView] = useState<boolean>(false);
  const [autoCenter, setAutoCenter] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  // Telemetry & Prints
  const [cumDelta, setCumDelta] = useState<number>(142.5);
  const [recentPrints, setRecentPrints] = useState<RecentPrint[]>([]);
  const [sweeps, setSweeps] = useState<SweepAlert[]>([]);
  const [ordersPerSec, setOrdersPerSec] = useState<number>(185);
  const [tradesPerSec, setTradesPerSec] = useState<number>(42);
  const [volPerSec, setVolPerSec] = useState<number>(24.8);

  // Dragging state for orders
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  const symbol = selected?.symbol || 'BTCUSDT';
  const livePrice = useMemo(() => {
    if (!selected) return 65000.0;
    return prices[selected.symbol]?.price ?? selected.price ?? 65000.0;
  }, [selected, prices]);

  const pipSize = useMemo(() => getPipSize(symbol), [symbol]);
  const precision = useMemo(() => getPrecision(symbol), [symbol]);

  // Active position & orders for this symbol
  const activePos = useMemo(() => {
    return positions.find((p) => p.symbol === symbol && p.quantity !== 0);
  }, [positions, symbol]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.symbol === symbol && o.status === 'PENDING');
  }, [orders, symbol]);

  // Ref for ladder scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Center price in view
  const centerPriceInView = useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTop = (container.scrollHeight - container.clientHeight) / 2;
    }
  }, []);

  useEffect(() => {
    if (autoCenter) {
      centerPriceInView();
    }
  }, [livePrice, autoCenter, centerPriceInView]);

  // Real-time market prints generator + API poll fallback
  useEffect(() => {
    let active = true;

    const interval = setInterval(() => {
      if (!active || livePrice <= 0) return;

      const isBuy = Math.random() > 0.49;
      const printSize = parseFloat((0.01 + Math.random() * 3.2).toFixed(2));
      const priceOffset = (Math.floor(Math.random() * 3) - 1) * pipSize;
      const printPrice = livePrice + priceOffset;
      const timeStr = new Date().toTimeString().substring(0, 8);

      const newPrint: RecentPrint = {
        id: Math.random().toString(),
        time: timeStr,
        price: printPrice,
        size: printSize,
        side: isBuy ? 'buy' : 'sell',
      };

      setRecentPrints((prev) => [newPrint, ...prev.slice(0, 30)]);
      setCumDelta((prev) => prev + (isBuy ? printSize : -printSize));
      setOrdersPerSec(120 + Math.floor(Math.random() * 180));
      setTradesPerSec(30 + Math.floor(Math.random() * 50));
      setVolPerSec(parseFloat((15.0 + Math.random() * 30.0).toFixed(1)));

      // Random liquidity sweep generator
      if (Math.random() > 0.88) {
        const sweepSide = Math.random() > 0.5 ? 'BUY' : 'SELL';
        const swp: SweepAlert = {
          id: Math.random().toString(),
          time: timeStr,
          side: sweepSide,
          msg: `⚡ ${sweepSide} Liquidity Sweep @ ${printPrice.toFixed(precision)} (${(printSize * 4).toFixed(1)}L)`,
        };
        setSweeps((prev) => [swp, ...prev.slice(0, 5)]);
      }
    }, 450);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [livePrice, pipSize, precision]);

  // Generate interactive DOM levels centered around current price
  const domLevels = useMemo<DOMLevel[]>(() => {
    if (livePrice <= 0) return [];
    const baseP = Math.round(livePrice / pipSize) * pipSize;
    const levels: DOMLevel[] = [];
    let maxVolInDOM = 1.0;

    // Asks (above base price)
    for (let i = depthLevels; i >= 1; i--) {
      const price = parseFloat((baseP + i * pipSize).toFixed(precision));
      const seed = Math.floor(price * 1000);
      const askVol = parseFloat((3 + (seed % 140) * (i < 5 ? 1.4 : 0.8)).toFixed(1));
      if (askVol > maxVolInDOM) maxVolInDOM = askVol;

      const isLarge = askVol > 110;
      const isIceberg = askVol > 160 && seed % 7 === 0;
      const isSpoof = askVol > 130 && seed % 11 === 0;

      // Simulated volume profile
      const vpBuy = parseFloat((askVol * 0.45).toFixed(1));
      const vpSell = parseFloat((askVol * 0.55).toFixed(1));

      levels.push({
        price,
        bidVol: 0,
        askVol,
        cumBidVol: 0,
        cumAskVol: 0,
        bidOrders: 0,
        askOrders: Math.max(1, Math.floor(askVol * 1.5)),
        bidIntensity: 0,
        askIntensity: Math.min(1.0, askVol / 180),
        isLarge,
        isIceberg,
        isSpoof,
        isImbalance: false,
        imbalanceRatio: 1.0,
        vpBuyVol: vpBuy,
        vpSellVol: vpSell,
        vpTotalVol: vpBuy + vpSell,
        isPOC: i === 6,
        isVAH: i === 15,
        isVAL: false,
      });
    }

    // Current price level
    levels.push({
      price: parseFloat(baseP.toFixed(precision)),
      bidVol: 0,
      askVol: 0,
      cumBidVol: 0,
      cumAskVol: 0,
      bidOrders: 0,
      askOrders: 0,
      bidIntensity: 0,
      askIntensity: 0,
      isLarge: false,
      isIceberg: false,
      isSpoof: false,
      isImbalance: false,
      imbalanceRatio: 1.0,
      vpBuyVol: 45.0,
      vpSellVol: 45.0,
      vpTotalVol: 90.0,
      isPOC: true,
      isVAH: false,
      isVAL: false,
    });

    // Bids (below base price)
    for (let i = 1; i <= depthLevels; i++) {
      const price = parseFloat((baseP - i * pipSize).toFixed(precision));
      const seed = Math.floor(price * 1000);
      const bidVol = parseFloat((3 + (seed % 150) * (i < 5 ? 1.5 : 0.8)).toFixed(1));
      if (bidVol > maxVolInDOM) maxVolInDOM = bidVol;

      const isLarge = bidVol > 110;
      const isIceberg = bidVol > 160 && seed % 9 === 0;
      const isSpoof = bidVol > 130 && seed % 13 === 0;

      const vpBuy = parseFloat((bidVol * 0.55).toFixed(1));
      const vpSell = parseFloat((bidVol * 0.45).toFixed(1));

      levels.push({
        price,
        bidVol,
        askVol: 0,
        cumBidVol: 0,
        cumAskVol: 0,
        bidOrders: Math.max(1, Math.floor(bidVol * 1.8)),
        askOrders: 0,
        bidIntensity: Math.min(1.0, bidVol / 180),
        askIntensity: 0,
        isLarge,
        isIceberg,
        isSpoof,
        isImbalance: false,
        imbalanceRatio: 1.0,
        vpBuyVol: vpBuy,
        vpSellVol: vpSell,
        vpTotalVol: vpBuy + vpSell,
        isPOC: false,
        isVAH: false,
        isVAL: i === 15,
      });
    }

    // Cumulative depth calculations
    let runningAsk = 0;
    let runningBid = 0;

    levels.forEach((lvl) => {
      if (lvl.price > baseP) {
        runningAsk += lvl.askVol;
        lvl.cumAskVol = parseFloat(runningAsk.toFixed(1));
      } else if (lvl.price < baseP) {
        runningBid += lvl.bidVol;
        lvl.cumBidVol = parseFloat(runningBid.toFixed(1));
      }
    });

    return levels;
  }, [livePrice, pipSize, depthLevels, precision]);

  // Compute bid-ask imbalance %
  const imbalancePct = useMemo(() => {
    let askSum = 0;
    let bidSum = 0;
    domLevels.forEach((l) => {
      askSum += l.askVol;
      bidSum += l.bidVol;
    });
    if (askSum + bidSum === 0) return 50;
    return Math.round((bidSum / (askSum + bidSum)) * 100);
  }, [domLevels]);

  // Order Placement Handlers
  const handlePlaceOrder = async (type: 'market' | 'limit' | 'stop', side: 'buy' | 'sell', targetPrice?: number) => {
    setLoading(true);
    try {
      await placeOrder({
        symbol,
        side,
        type,
        quantity: lotSize,
        price: targetPrice || (type === 'market' ? undefined : livePrice),
        is_post_only: isPostOnly,
        is_reduce_only: isReduceOnly,
        time_in_force: timeInForce,
      });
      addToast('success', `DOM ${type.toUpperCase()} ${side.toUpperCase()} ${lotSize} ${symbol} placed`);
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || 'Order execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickClose = async () => {
    setLoading(true);
    try {
      await closeSymbol(symbol);
      addToast('success', `Position for ${symbol} closed`);
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || 'Close failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickReverse = async () => {
    setLoading(true);
    try {
      await reversePosition(symbol);
      addToast('success', `Position for ${symbol} reversed`);
    } catch (err: any) {
      console.error(err);
      addToast('error', err.message || 'Reverse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAll = async () => {
    setLoading(true);
    try {
      for (const ord of pendingOrders) {
        await cancelOrder(ord.id);
      }
      addToast('info', `Cancelled all pending orders for ${symbol}`);
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Failed to cancel orders');
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handlePlaceOrder('market', 'buy');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handlePlaceOrder('market', 'sell');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelAll();
      } else if (e.code === 'Space') {
        e.preventDefault();
        centerPriceInView();
      } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        handleQuickClose();
      } else if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleQuickReverse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerPriceInView]);

  return (
    <div style={containerStyle}>
      {/* ── HEADER: Symbol, Account Mode, Microstructure Telemetry ── */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#f8fafc' }}>{symbol}</span>
            <span style={badgeStyle}>{activeAccountType.toUpperCase()} DOM</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#d4af37', fontFamily: 'monospace', fontWeight: 700 }}>
              P/L: ${activePos ? activePos.unrealized_pnl.toFixed(2) : '0.00'}
            </span>
            <button
              style={{ ...btnSmallStyle, backgroundColor: showMboView ? '#06b6d4' : '#1e293b', color: showMboView ? '#fff' : '#cbd5e1' }}
              onClick={() => setShowMboView(!showMboView)}
              title="Toggle MBO Queue Position & Analytics"
            >
              ⚡ MBO Queue
            </button>
            <button style={btnSmallStyle} onClick={centerPriceInView} title="Center DOM Price (Space)">
              🎯 Center
            </button>
          </div>
        </div>

        {/* Microstructure Speed & Telemetry Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', marginTop: 4 }}>
          <span>Ord/s: <strong style={{ color: '#60a5fa' }}>{ordersPerSec}</strong></span>
          <span>Trd/s: <strong style={{ color: '#34d399' }}>{tradesPerSec}</strong></span>
          <span>Vol/s: <strong style={{ color: '#fbbf24' }}>{volPerSec}L</strong></span>
          <span>CVD: <strong style={{ color: cumDelta >= 0 ? '#00c076' : '#ff4d57' }}>{cumDelta > 0 ? '+' : ''}{cumDelta.toFixed(1)}</strong></span>
        </div>

        {/* Dynamic Imbalance Bar */}
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 700, marginBottom: 2 }}>
            <span style={{ color: '#00c076' }}>BIDS {imbalancePct}%</span>
            <span style={{ color: '#ff4d57' }}>ASKS {100 - imbalancePct}%</span>
          </div>
          <div style={{ height: 3, background: '#ff4d57', borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${imbalancePct}%`, background: '#00c076', height: '100%', transition: 'width 0.2s' }} />
          </div>
        </div>
      </div>

      {/* ── DOM LADDER BODY: Grid + Time & Sales Split ── */}
      {showMboView ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <MBOAnalytics symbol={symbol} />
        </div>
      ) : (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        
        {/* LADDER PRICE SCROLL GRID */}
        <div
          ref={scrollContainerRef}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: 4, position: 'relative' }}
          onWheel={() => setAutoCenter(false)}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'monospace', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#070b14', color: '#64748b', fontSize: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {showProfile && <th style={{ width: '14%', padding: '3px 2px', textAlign: 'left' }}>VOL PROF</th>}
                <th style={{ width: '22%', padding: '3px 2px', color: '#00c076', textAlign: 'left' }}>BID SIZE</th>
                <th style={{ width: '24%', padding: '3px 2px', color: '#e2e8f0', textAlign: 'center' }}>PRICE</th>
                <th style={{ width: '22%', padding: '3px 2px', color: '#ff4d57', textAlign: 'right' }}>ASK SIZE</th>
                <th style={{ width: '18%', padding: '3px 2px', color: '#94a3b8', textAlign: 'right' }}>CUMUL</th>
              </tr>
            </thead>
            <tbody>
              {domLevels.map((lvl) => {
                const isCurrent = Math.abs(lvl.price - livePrice) < pipSize * 0.5;
                const isAsk = lvl.price > livePrice;
                const isBid = lvl.price < livePrice;

                // Pending order on this row
                const ord = pendingOrders.find((o) => o.price != null && Math.abs(o.price - lvl.price) < pipSize * 0.5);
                // Position SL or TP on this row
                const isSL = activePos?.stop_loss && Math.abs(activePos.stop_loss - lvl.price) < pipSize * 0.5;
                const isTP = activePos?.take_profit && Math.abs(activePos.take_profit - lvl.price) < pipSize * 0.5;

                // Heatmap intensity background
                const heatBg = showHeatmap
                  ? isAsk
                    ? `rgba(255, 77, 87, ${lvl.askIntensity * 0.35})`
                    : isBid
                    ? `rgba(0, 192, 118, ${lvl.bidIntensity * 0.35})`
                    : 'transparent'
                  : 'transparent';

                return (
                  <tr
                    key={lvl.price}
                    style={{
                      height: 20,
                      background: isCurrent ? 'rgba(212, 175, 55, 0.25)' : heatBg,
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Volume Profile Integrated Bar */}
                    {showProfile && (
                      <td style={{ padding: '0 2px', position: 'relative' }}>
                        <div
                          style={{
                            height: 12,
                            width: `${Math.min(100, (lvl.vpTotalVol / 120) * 100)}%`,
                            background: lvl.isPOC
                              ? 'linear-gradient(90deg, #d4af37, #f59e0b)'
                              : 'rgba(96, 165, 250, 0.25)',
                            borderRadius: 1,
                          }}
                        />
                        {lvl.isPOC && <span style={pocTag}>POC</span>}
                        {lvl.isVAH && <span style={vahTag}>VAH</span>}
                        {lvl.isVAL && <span style={valTag}>VAL</span>}
                      </td>
                    )}

                    {/* BID CELL (Click -> Limit Buy) */}
                    <td
                      style={{ padding: '0 4px', cursor: 'pointer', position: 'relative' }}
                      onClick={() => isBid && handlePlaceOrder('limit', 'buy', lvl.price)}
                      title="Click to place Limit Buy"
                    >
                      {lvl.bidVol > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div
                            style={{
                              height: 12,
                              width: `${Math.min(100, (lvl.bidVol / 180) * 100)}%`,
                              background: 'rgba(0, 192, 118, 0.4)',
                              borderRadius: 1,
                            }}
                          />
                          <span style={{ color: '#00c076', fontWeight: 800, fontSize: 10 }}>
                            {lvl.bidVol}
                          </span>
                          {lvl.isIceberg && <span style={icebergBadge}>🧊 ICE</span>}
                        </div>
                      )}
                    </td>

                    {/* PRICE CELL (Highlighted center with Order/SL/TP Badges) */}
                    <td
                      style={{
                        padding: '0 4px',
                        textAlign: 'center',
                        fontWeight: 900,
                        color: isCurrent ? '#d4af37' : isAsk ? '#ff4d57' : '#00c076',
                        background: isCurrent ? 'rgba(212,175,55,0.2)' : 'transparent',
                        position: 'relative',
                      }}
                    >
                      {lvl.price.toFixed(precision)}

                      {/* Order Badges on Price Cell */}
                      {ord && (
                        <div style={orderBadgeStyle(ord.side)}>
                          {ord.side.toUpperCase()} {ord.quantity}L
                        </div>
                      )}
                      {isSL && <div style={slBadgeStyle}>SL</div>}
                      {isTP && <div style={tpBadgeStyle}>TP</div>}
                    </td>

                    {/* ASK CELL (Click -> Limit Sell) */}
                    <td
                      style={{ padding: '0 4px', cursor: 'pointer', textAlign: 'right', position: 'relative' }}
                      onClick={() => isAsk && handlePlaceOrder('limit', 'sell', lvl.price)}
                      title="Click to place Limit Sell"
                    >
                      {lvl.askVol > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          {lvl.isIceberg && <span style={icebergBadge}>🧊 ICE</span>}
                          <span style={{ color: '#ff4d57', fontWeight: 800, fontSize: 10 }}>
                            {lvl.askVol}
                          </span>
                          <div
                            style={{
                              height: 12,
                              width: `${Math.min(100, (lvl.askVol / 180) * 100)}%`,
                              background: 'rgba(255, 77, 87, 0.4)',
                              borderRadius: 1,
                            }}
                          />
                        </div>
                      )}
                    </td>

                    {/* CUMULATIVE VOLUME */}
                    <td style={{ padding: '0 4px', textAlign: 'right', color: '#64748b', fontSize: 9 }}>
                      {isAsk ? lvl.cumAskVol : isBid ? lvl.cumBidVol : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RIGHT SIDEBAR: TIME & SALES TAPE */}
        <div style={tapeSidebarStyle}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 4, marginBottom: 4 }}>
            TIME &amp; SALES
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentPrints.map((p) => {
              const isAggr = p.size > 1.5;
              const col = p.side === 'buy' ? '#00c076' : '#ff4d57';
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 9,
                    fontFamily: 'monospace',
                    color: col,
                    padding: '2px 3px',
                    background: isAggr ? `${col}15` : 'transparent',
                    borderLeft: isAggr ? `2px solid ${col}` : 'none',
                    borderRadius: 2,
                  }}
                >
                  <span>{p.time.substring(3)}</span>
                  <strong style={{ color: '#e2e8f0' }}>{p.price.toFixed(precision)}</strong>
                  <span>{p.size.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ── FOOTER: Quick Quantity, Order Options & Execution Controls ── */}
      <div style={footerStyle}>
        {/* Quantity Preset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>QTY:</span>
            {[0.01, 0.1, 0.5, 1.0, 5.0].map((sz) => (
              <button
                key={sz}
                onClick={() => setLotSize(sz)}
                style={lotBtnStyle(lotSize === sz)}
              >
                {sz}
              </button>
            ))}
            <input
              type="number"
              step={0.01}
              value={lotSize}
              onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.01)}
              style={qtyInputStyle}
            />
          </div>

          {/* Time In Force & Flags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <select value={timeInForce} onChange={(e) => setTimeInForce(e.target.value)} style={selectStyle}>
              <option value="GTC">GTC</option>
              <option value="IOC">IOC</option>
              <option value="FOK">FOK</option>
            </select>
            <label style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <input type="checkbox" checked={isPostOnly} onChange={(e) => setIsPostOnly(e.target.checked)} />
              POST
            </label>
            <label style={{ fontSize: 9, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
              <input type="checkbox" checked={isReduceOnly} onChange={(e) => setIsReduceOnly(e.target.checked)} />
              RED
            </label>
          </div>
        </div>

        {/* 1-Click Execution Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 4, marginTop: 6 }}>
          <button style={btnBuyStyle} onClick={() => handlePlaceOrder('market', 'buy')} disabled={loading}>
            ▲ BUY MKT
          </button>
          <button style={btnSellStyle} onClick={() => handlePlaceOrder('market', 'sell')} disabled={loading}>
            ▼ SELL MKT
          </button>
          <button style={btnActionStyle('#a78bfa')} onClick={handleQuickReverse} disabled={loading}>
            ⇄ Reverse
          </button>
          <button style={btnActionStyle('#ff4d57')} onClick={handleQuickClose} disabled={loading}>
            ✕ Close
          </button>
          <button style={btnActionStyle('#94a3b8')} onClick={handleCancelAll} disabled={loading}>
            ⊘ Cancel All
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#0a0e1a',
  fontFamily: 'Inter, sans-serif',
  overflow: 'hidden',
  color: '#e2e8f0',
};

const headerStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: 'rgba(15, 23, 42, 0.95)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  flexShrink: 0,
};

const badgeStyle: React.CSSProperties = {
  fontSize: 8,
  fontWeight: 800,
  padding: '2px 5px',
  borderRadius: 3,
  background: 'rgba(212, 175, 55, 0.15)',
  color: '#d4af37',
  border: '1px solid rgba(212, 175, 55, 0.3)',
};

const tapeSidebarStyle: React.CSSProperties = {
  width: 140,
  background: 'rgba(7, 11, 20, 0.8)',
  borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
  padding: 4,
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const footerStyle: React.CSSProperties = {
  padding: '6px 8px',
  background: 'rgba(15, 23, 42, 0.98)',
  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  flexShrink: 0,
};

const btnSmallStyle: React.CSSProperties = {
  padding: '2px 6px',
  fontSize: 9,
  fontWeight: 700,
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.05)',
  color: '#cbd5e1',
  cursor: 'pointer',
};

const lotBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '2px 6px',
  fontSize: 9,
  fontWeight: 800,
  borderRadius: 3,
  border: active ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.08)',
  background: active ? 'linear-gradient(135deg, #d4af37, #b8860b)' : 'rgba(255,255,255,0.04)',
  color: active ? '#070b14' : '#94a3b8',
  cursor: 'pointer',
});

const qtyInputStyle: React.CSSProperties = {
  width: 44,
  padding: '2px 4px',
  fontSize: 9,
  fontWeight: 800,
  fontFamily: 'monospace',
  textAlign: 'center',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 3,
  color: '#e2e8f0',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  padding: '2px 4px',
  fontSize: 9,
  fontWeight: 700,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 3,
  color: '#e2e8f0',
};

const btnBuyStyle: React.CSSProperties = {
  padding: '6px 2px',
  fontSize: 10,
  fontWeight: 900,
  borderRadius: 4,
  border: 'none',
  background: 'linear-gradient(135deg, #00c076, #00965c)',
  color: '#070b14',
  cursor: 'pointer',
};

const btnSellStyle: React.CSSProperties = {
  padding: '6px 2px',
  fontSize: 10,
  fontWeight: 900,
  borderRadius: 4,
  border: 'none',
  background: 'linear-gradient(135deg, #ff4d57, #d93843)',
  color: '#ffffff',
  cursor: 'pointer',
};

const btnActionStyle = (col: string): React.CSSProperties => ({
  padding: '6px 2px',
  fontSize: 9,
  fontWeight: 800,
  borderRadius: 4,
  border: `1px solid ${col}40`,
  background: `${col}15`,
  color: col,
  cursor: 'pointer',
});

const icebergBadge: React.CSSProperties = {
  fontSize: 7,
  fontWeight: 800,
  color: '#38bdf8',
  background: 'rgba(56, 189, 248, 0.15)',
  padding: '1px 3px',
  borderRadius: 2,
};

const pocTag: React.CSSProperties = {
  position: 'absolute',
  right: 2,
  top: 1,
  fontSize: 7,
  fontWeight: 900,
  color: '#d4af37',
  background: 'rgba(212,175,55,0.2)',
  padding: '0 2px',
  borderRadius: 2,
};

const vahTag: React.CSSProperties = {
  position: 'absolute',
  right: 2,
  top: 1,
  fontSize: 7,
  fontWeight: 900,
  color: '#60a5fa',
};

const valTag: React.CSSProperties = {
  position: 'absolute',
  right: 2,
  top: 1,
  fontSize: 7,
  fontWeight: 900,
  color: '#f43f5e',
};

const orderBadgeStyle = (side: string): React.CSSProperties => ({
  position: 'absolute',
  left: 2,
  top: 1,
  fontSize: 7,
  fontWeight: 900,
  padding: '0 3px',
  borderRadius: 2,
  background: side === 'buy' ? '#00c076' : '#ff4d57',
  color: '#070b14',
});

const slBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  right: 2,
  top: 1,
  fontSize: 7,
  fontWeight: 900,
  padding: '0 3px',
  borderRadius: 2,
  background: '#ff4d57',
  color: '#fff',
};

const tpBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  right: 2,
  top: 1,
  fontSize: 7,
  fontWeight: 900,
  padding: '0 3px',
  borderRadius: 2,
  background: '#00c076',
  color: '#070b14',
};

export default DOMPanel;
