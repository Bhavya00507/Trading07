import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { usePositionStore } from '../store/positionStore';
import { placeOrder } from '../services/api';
import { formatPrice } from './Watchlist';
import { MarketSessionService } from '../services/marketSessionService';
import './OrderPanel.css';

type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';

const getPipSize = (symbol: string) => {
  if (symbol.includes('JPY')) return 0.01;
  if (symbol.includes('XAU')) return 0.10; // Gold 1 pip = $0.10
  if (symbol.includes('XAG')) return 0.01; // Silver 1 pip = $0.01
  if (symbol.includes('US30') || symbol.includes('NAS100') || symbol.includes('SPX500') || symbol.includes('GER40')) return 1.0;
  return 0.0001; // standard forex
};

const getPrecision = (sym: string) => {
  if (sym.includes('JPY') || sym.includes('XAU')) return 2;
  if (sym.includes('XAG')) return 3;
  if (sym.indexOf('USD') !== -1 || sym.indexOf('EUR') !== -1 || sym.indexOf('GBP') !== -1) return 5;
  return 2;
};

const OrderPanel: React.FC = () => {
  const selected = useAppStore((state) => state.selectedInstrument);
  const livePrice = useMarketPriceStore((state) => state.currentPrice) ?? (selected ? selected.price : 0);
  const bid = useMarketPriceStore((state) => state.bid);
  const ask = useMarketPriceStore((state) => state.ask);
  const spread = useMarketPriceStore((state) => state.spread);
  const account = useAppStore((state) => state.account);
  
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState<number>(0.1);
  const [leverage, setLeverage] = useState<number>(10);
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  
  // SL/TP inputs
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  
  // Risk Calculator Inputs
  const [targetRisk, setTargetRisk] = useState<number>(50); // Target Risk in USD
  
  // Advanced Execution Options
  const [reduceOnly, setReduceOnly] = useState(false);
  const [closeOnTrigger, setCloseOnTrigger] = useState(false);
  const [tif, setTif] = useState<'GTC' | 'GTD' | 'IOC' | 'FOK'>('GTC');
  const [isOco, setIsOco] = useState(false);
  const [ocoPrice, setOcoPrice] = useState('');
  const [isMultiTp, setIsMultiTp] = useState(false);
  const [takeProfit2, setTakeProfit2] = useState('');
  const [isTrailingSl, setIsTrailingSl] = useState(false);
  const [trailingDistance, setTrailingDistance] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isOpen, setIsOpen] = useState(true);
  const [countdownText, setCountdownText] = useState('');

  useEffect(() => {
    if (!selected) return;
    const updateStatus = () => {
      const open = MarketSessionService.isOpen(selected.symbol);
      setIsOpen(open);
      if (!open) {
        const nextOp = MarketSessionService.nextOpen(selected.symbol);
        if (nextOp) {
          const diffMs = nextOp.getTime() - Date.now();
          if (diffMs > 0) {
            const secs = Math.floor(diffMs / 1000) % 60;
            const mins = Math.floor(diffMs / 60000) % 60;
            const hours = Math.floor(diffMs / 3600000) % 24;
            const days = Math.floor(diffMs / 86400000);
            
            let str = '';
            if (days > 0) str += `${days}d `;
            str += `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            setCountdownText(`Market opens in ${str}`);
          } else {
            setCountdownText('Market opening...');
          }
        } else {
          setCountdownText('Market is Closed');
        }
      } else {
        setCountdownText('');
      }
    };
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [selected]);

  // livePrice is now directly subscribed from useMarketStore above

  const balance = account?.balance || 10000;

  // Set default limit price when switching order type
  useEffect(() => {
    if (livePrice > 0 && (orderType === 'limit' || orderType === 'stop' || orderType === 'stop_limit') && !limitPrice) {
      setLimitPrice(livePrice.toString());
    }
    if (livePrice > 0 && orderType === 'stop_limit' && !stopPrice) {
      setStopPrice(livePrice.toString());
    }
  }, [orderType, livePrice]);

  const entryPrice = useMemo(() => {
    if (orderType === 'market') return livePrice;
    return parseFloat(limitPrice) || livePrice;
  }, [orderType, limitPrice, livePrice]);

  // Margin required
  const marginRequired = useMemo(() => {
    if (entryPrice <= 0 || quantity <= 0 || leverage <= 0) return 0;
    return (quantity * entryPrice) / leverage;
  }, [entryPrice, quantity, leverage]);

  // Est. Trading Fees (0.05% taker/maker fee)
  const estFee = useMemo(() => {
    if (entryPrice <= 0 || quantity <= 0) return 0;
    return quantity * entryPrice * 0.0005;
  }, [entryPrice, quantity]);

  // Pip value calculator
  const pipValue = useMemo(() => {
    if (!selected || quantity <= 0) return 0;
    const pipSize = getPipSize(selected.symbol);
    return quantity * pipSize;
  }, [selected, quantity]);

  // Stop Loss Distance calculation
  const slDistance = useMemo(() => {
    const sl = parseFloat(stopLoss);
    if (isNaN(sl) || sl <= 0 || entryPrice <= 0) return 0;
    return Math.abs(entryPrice - sl);
  }, [entryPrice, stopLoss]);

  // Risk Amount ($) calculation
  const riskAmount = useMemo(() => {
    if (slDistance <= 0 || quantity <= 0) return 0;
    return slDistance * quantity;
  }, [slDistance, quantity]);

  // Risk % of Balance calculation
  const riskPct = useMemo(() => {
    if (riskAmount <= 0 || balance <= 0) return 0;
    return (riskAmount / balance) * 100;
  }, [riskAmount, balance]);

  // Liquidation Price calculation
  const liqPrices = useMemo(() => {
    if (entryPrice <= 0 || leverage <= 0) return { long: 0, short: 0 };
    return {
      long: entryPrice * (1 - 1 / leverage),
      short: entryPrice * (1 + 1 / leverage),
    };
  }, [entryPrice, leverage]);

  // Take Profit Distance & Reward calculation
  const tpDistance = useMemo(() => {
    const tp = parseFloat(takeProfit);
    if (isNaN(tp) || tp <= 0 || entryPrice <= 0) return 0;
    return Math.abs(tp - entryPrice);
  }, [entryPrice, takeProfit]);

  const rewardAmount = useMemo(() => {
    if (tpDistance <= 0 || quantity <= 0) return 0;
    return tpDistance * quantity;
  }, [tpDistance, quantity]);

  const rewardPct = useMemo(() => {
    if (rewardAmount <= 0 || balance <= 0) return 0;
    return (rewardAmount / balance) * 100;
  }, [rewardAmount, balance]);

  const rrRatio = useMemo(() => {
    if (riskAmount <= 0 || rewardAmount <= 0) return 0;
    return rewardAmount / riskAmount;
  }, [riskAmount, rewardAmount]);

  // Warnings lists
  const smartWarnings = useMemo(() => {
    const list: string[] = [];
    if (leverage > 15) {
      list.push('High Leverage: Exposes account to rapid liquidation (>15x).');
    }
    if (rrRatio > 0 && rrRatio < 1.5) {
      list.push('Poor R:R Ratio: Risk is high relative to reward (< 1.5).');
    }
    if (marginRequired > balance * 0.25) {
      list.push('High Margin Usage: Order uses >25% of balance.');
    }
    if (account && account.free_margin < marginRequired) {
      list.push('Margin Deficit: Insufficient free margin for order.');
    }
    if (selected && (selected.symbol === 'GBPUSD' || selected.symbol === 'EURUSD')) {
      list.push('Correlation Alert: Highly correlated currency pair.');
    }
    return list;
  }, [leverage, rrRatio, marginRequired, balance, account, selected]);

  // Handle auto-calculating position size from target risk
  const handleCalculateSize = () => {
    if (slDistance <= 0 || targetRisk <= 0) {
      useAppStore.getState().addToast('error', 'Set a valid Stop Loss price and Target Risk to calculate size.');
      return;
    }
    const computedQty = targetRisk / slDistance;
    setQuantity(parseFloat(computedQty.toFixed(4)));
    useAppStore.getState().addToast('success', `Position size set to ${computedQty.toFixed(4)} based on $${targetRisk} risk.`);
  };

  if (!selected) {
    return (
      <div className="order-panel empty">
        Select an instrument from the watchlist to trade.
      </div>
    );
  }

  const handleSubmit = async (side: 'buy' | 'sell') => {
    if (quantity <= 0) {
      useAppStore.getState().addToast('error', 'Please enter a valid quantity');
      return;
    }
    setLoading(true);
    setMessage(null);

    // 1. Create optimistic position instantly
    const price = orderType === 'market' ? livePrice : parseFloat(limitPrice || '0');
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticPosition = {
      id: optimisticId,
      symbol: selected.symbol,
      quantity: side === 'buy' ? quantity : -quantity,
      average_price: price,
      unrealized_pnl: 0,
      realized_pnl: 0,
      stop_loss: stopLoss ? parseFloat(stopLoss) : null,
      take_profit: takeProfit ? parseFloat(takeProfit) : null,
      trailing_stop: trailingDistance ? parseFloat(trailingDistance) : null,
      account_type: useAppStore.getState().activeAccountType || 'paper',
      isOptimistic: true,
    };
    usePositionStore.getState().updatePosition(optimisticPosition as any);

    // 2. Update account metrics optimistically
    const accountState = useAppStore.getState().account;
    if (accountState) {
      const getContractSizeLocal = (sym: string) => {
        const s = sym.toUpperCase();
        if (s.includes('XAU')) return 100.0;
        if (s.includes('XAG')) return 5000.0;
        if (s.includes('EUR') || s.includes('GBP') || s.includes('USD') || s.includes('JPY')) return 100000.0;
        return 1.0;
      };
      const contractSize = getContractSizeLocal(selected.symbol);
      const margin = (quantity * contractSize * price) / leverage;
      useAppStore.getState().setAccount({
        ...accountState,
        margin_used: accountState.margin_used + margin,
        free_margin: Math.max(0, accountState.free_margin - margin),
      });
    }

    try {
      await placeOrder({
        symbol: selected.symbol,
        side,
        type: orderType,
        quantity,
        price: orderType === 'market' ? undefined : parseFloat(limitPrice),
        stop_price: orderType === 'stop_limit' ? parseFloat(stopPrice) : undefined,
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        leverage,
        reduce_only: reduceOnly,
        close_on_trigger: closeOnTrigger,
        time_in_force: tif,
        is_oco: isOco,
        oco_price: ocoPrice ? parseFloat(ocoPrice) : undefined,
        is_multi_tp: isMultiTp,
        take_profit_2: takeProfit2 ? parseFloat(takeProfit2) : undefined,
        is_trailing_sl: isTrailingSl,
        trailing_distance: trailingDistance ? parseFloat(trailingDistance) : undefined,
      });
      
      setMessage({
        type: 'success',
        text: `Order executed successfully: ${side.toUpperCase()} ${quantity} ${selected.symbol}`,
      });
      setQuantity(0.1);
      setStopLoss('');
      setTakeProfit('');
      setLimitPrice('');
      setStopPrice('');
      setReduceOnly(false);
      setCloseOnTrigger(false);
      setTif('GTC');
      setIsOco(false);
      setOcoPrice('');
      setIsMultiTp(false);
      setTakeProfit2('');
      setIsTrailingSl(false);
      setTrailingDistance('');
    } catch (err: any) {
      console.error('Failed to place order:', err);
      setMessage({ type: 'error', text: err.message || 'Order execution failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-panel-container">
      <h3 className="panel-title">Institutional Order Entry</h3>
      
      <div className="order-instrument-row">
        <span className="order-instrument-title">{selected.symbol}</span>
        <span className="order-live-price">
          {formatPrice(livePrice, selected.symbol, selected.category)}
        </span>
      </div>

      <div className="order-bid-ask-spread-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 10, borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: 6 }}>
        <div>BID: <span style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{formatPrice(bid, selected.symbol, selected.category)}</span></div>
        <div>ASK: <span style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{formatPrice(ask, selected.symbol, selected.category)}</span></div>
        <div>SPR: <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{formatPrice(spread, selected.symbol, selected.category)}</span></div>
      </div>

      {/* Order Type Tabs */}
      <div className="type-selector-tabs">
        {(['market', 'limit', 'stop', 'stop_limit'] as const).map((type) => (
          <button
            key={type}
            className={`type-tab ${orderType === type ? 'active' : ''}`}
            onClick={() => setOrderType(type)}
          >
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>
      
      {message && (
        <div className={`order-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="order-inputs-container">
        {/* Price Input (for limit/stop/stop_limit) */}
        {orderType !== 'market' && (
          <div className="order-input-group">
            <label>
              {orderType === 'limit' && 'Limit Price'}
              {orderType === 'stop' && 'Stop Price'}
              {orderType === 'stop_limit' && 'Limit Price'}
            </label>
            <input
              type="number"
              step="any"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              disabled={loading}
              className="order-field"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Stop Trigger Price (only for stop_limit) */}
        {orderType === 'stop_limit' && (
          <div className="order-input-group">
            <label>Stop Trigger Price</label>
            <input
              type="number"
              step="any"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              disabled={loading}
              className="order-field"
              placeholder="0.00"
            />
          </div>
        )}

        {/* Quantity Field */}
        <div className="order-input-group">
          <label>Quantity</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={quantity === 0 ? '' : quantity}
            onChange={(e) => setQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
            disabled={loading}
            className="order-field"
            placeholder="0.00"
          />
        </div>

        {/* Leverage Slider */}
        <div className="order-input-group">
          <div className="leverage-header">
            <label>Leverage</label>
            <span className="leverage-value">{leverage}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            value={leverage > 20 ? 20 : leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value) || 1)}
            disabled={loading}
            className="leverage-slider"
          />
        </div>

        {/* Stop Loss & Take Profit */}
        <div className="order-input-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="order-input-group">
            <label>Stop Loss (SL)</label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              disabled={loading}
              className="order-field"
              placeholder="None"
            />
          </div>
          <div className="order-input-group">
            <label>Take Profit (TP)</label>
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              disabled={loading}
              className="order-field"
              placeholder="None"
            />
          </div>
        </div>

        {/* Advanced Execution Options */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
          padding: 8,
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Advanced Execution Options
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={reduceOnly} onChange={(e) => setReduceOnly(e.target.checked)} />
              Reduce Only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={closeOnTrigger} onChange={(e) => setCloseOnTrigger(e.target.checked)} />
              Close On Trigger
            </label>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, marginTop: 4 }}>
            <span style={{ color: 'var(--text-secondary)' }}>TIF:</span>
            <select
              value={tif}
              onChange={(e) => setTif(e.target.value as any)}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'white',
                padding: '2px 4px',
                borderRadius: 3,
                fontSize: 9,
                cursor: 'pointer'
              }}
            >
              <option value="GTC">Good Till Cancel (GTC)</option>
              <option value="GTD">Good Till Date (GTD)</option>
              <option value="IOC">Immediate Or Cancel (IOC)</option>
              <option value="FOK">Fill Or Kill (FOK)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={isOco} onChange={(e) => setIsOco(e.target.checked)} />
              OCO Order
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={isMultiTp} onChange={(e) => setIsMultiTp(e.target.checked)} />
              Multi TP
            </label>
          </div>

          {isOco && (
            <div className="order-input-group" style={{ marginTop: 4 }}>
              <label>OCO Limit/Trigger Price</label>
              <input
                type="number"
                step="any"
                value={ocoPrice}
                onChange={(e) => setOcoPrice(e.target.value)}
                className="order-field"
                placeholder="0.00"
              />
            </div>
          )}

          {isMultiTp && (
            <div className="order-input-group" style={{ marginTop: 4 }}>
              <label>Take Profit 2 (TP2)</label>
              <input
                type="number"
                step="any"
                value={takeProfit2}
                onChange={(e) => setTakeProfit2(e.target.value)}
                className="order-field"
                placeholder="None"
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={isTrailingSl} onChange={(e) => setIsTrailingSl(e.target.checked)} />
              Trailing SL
            </label>
            {isTrailingSl && (
              <input
                type="number"
                step="any"
                value={trailingDistance}
                onChange={(e) => setTrailingDistance(e.target.value)}
                className="order-field"
                placeholder="Distance in pips"
              />
            )}
          </div>
        </div>

        {/* Risk Tools Panel */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 4,
          padding: 8,
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Risk & Calculations Tools
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Target Risk ($)</span>
              <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                <input
                  type="number"
                  value={targetRisk}
                  onChange={(e) => setTargetRisk(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    padding: '2px 4px',
                    borderRadius: 3,
                    fontSize: 9
                  }}
                />
                <button
                  type="button"
                  onClick={handleCalculateSize}
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--bg-primary)',
                    border: 'none',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontSize: 8,
                    cursor: 'pointer'
                  }}
                >
                  Calc
                </button>
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Risk Percentage</span>
              <div style={{ color: riskPct > 2 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 700, marginTop: 4 }}>
                {riskPct.toFixed(2)}%
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Pip Value</span>
              <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>
                ${pipValue.toFixed(4)}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Margin Required</span>
              <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>
                ${marginRequired.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Expected Profit</span>
              <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--success)' }}>
                ${rewardAmount.toFixed(2)}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Reward Pct</span>
              <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--success)' }}>
                {rewardPct.toFixed(2)}%
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Risk:Reward Ratio</span>
              <div style={{ fontWeight: 700, marginTop: 2, color: rrRatio >= 1.5 ? 'var(--success)' : 'var(--danger)' }}>
                1 : {rrRatio.toFixed(2)}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Expected Loss</span>
              <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--danger)' }}>
                ${riskAmount.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Est. Liq Price (Long)</span>
              <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--success)' }}>
                ${liqPrices.long.toFixed(getPrecision(selected.symbol))}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Est. Liq Price (Short)</span>
              <div style={{ fontWeight: 700, marginTop: 2, color: 'var(--danger)' }}>
                ${liqPrices.short.toFixed(getPrecision(selected.symbol))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart warnings */}
      {smartWarnings.length > 0 && (
        <div style={{
          background: 'rgba(255, 77, 87, 0.08)',
          border: '1px solid rgba(255, 77, 87, 0.2)',
          borderRadius: 4,
          padding: '6px 8px',
          marginTop: 8,
          fontSize: 9,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          {smartWarnings.map((w, idx) => (
            <div key={idx} style={{ color: '#ff4d57', display: 'flex', gap: 4, alignItems: 'center' }}>
              <span>⚠️</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Market Closed Banner */}
      {!isOpen && (
        <div style={{
          background: 'rgba(255, 77, 87, 0.15)',
          border: '1px solid rgba(255, 77, 87, 0.3)',
          borderRadius: 4,
          padding: '8px 12px',
          marginTop: 10,
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: '#ff4d57',
          fontFamily: 'var(--font-mono)'
        }}>
          ⚠️ {countdownText}
        </div>
      )}

      {/* Execution Buttons: BUY and SELL side-by-side */}
      <div className="execution-buttons-row" style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button 
          className="btn execute-btn buy-btn"
          onClick={() => handleSubmit('buy')} 
          disabled={loading || quantity <= 0 || !isOpen}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 4,
            background: isOpen ? 'var(--success)' : '#2c2c2e',
            color: isOpen ? 'var(--bg-primary)' : '#8e8e93',
            border: 'none',
            cursor: isOpen ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? '...' : orderType === 'market' ? 'BUY MARKET' : `BUY ${orderType.replace('_', ' ').toUpperCase()}`}
        </button>
        <button 
          className="btn execute-btn sell-btn"
          onClick={() => handleSubmit('sell')} 
          disabled={loading || quantity <= 0 || !isOpen}
          style={{
            flex: 1,
            padding: '10px 16px',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 4,
            background: isOpen ? 'var(--danger)' : '#2c2c2e',
            color: isOpen ? 'var(--text-primary)' : '#8e8e93',
            border: 'none',
            cursor: isOpen ? 'pointer' : 'not-allowed'
          }}
        >
          {loading ? '...' : orderType === 'market' ? 'SELL MARKET' : `SELL ${orderType.replace('_', ' ').toUpperCase()}`}
        </button>
      </div>
    </div>
  );
};

export default React.memo(OrderPanel);
