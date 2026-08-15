// src/components/ChartRiskCalculator.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { placeOrder } from '../services/api';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';

export interface ChartOrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  clickedPrice: number;
}

interface ChartRiskCalculatorProps {
  request: ChartOrderRequest | null;
  onClose: () => void;
  onOrderPlaced: () => void;
}

const getPrecision = (sym: string) => {
  const symbol = sym.toUpperCase();
  if (symbol === 'BTCUSDT') return 2;
  if (symbol === 'ETHUSDT') return 2;
  if (symbol === 'EURUSD') return 5;
  if (symbol === 'GBPUSD') return 5;
  if (symbol === 'USDJPY') return 3;
  if (symbol === 'XAUUSD') return 2;
  if (symbol === 'XAGUSD') return 3;
  if (symbol === 'US30') return 1;
  if (symbol === 'NAS100') return 1;
  if (symbol === 'SPX500') return 1;
  if (symbol === 'GER40') return 1;
  if (symbol.includes('JPY')) return 3;
  if (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP')) return 5;
  return 2;
};

const getPipSize = (sym: string) => {
  const s = sym.toUpperCase();
  if (s.includes('JPY')) return 0.01;
  if (s === 'XAUUSD' || s === 'XAGUSD') return 0.1;
  if (s === 'BTCUSDT' || s === 'ETHUSDT') return 1.0;
  if (s === 'US30' || s === 'NAS100' || s === 'SPX500' || s === 'GER40') return 1.0;
  return 0.0001;
};

const getContractSize = (sym: string) => {
  const s = sym.toUpperCase();
  if (s === 'BTCUSDT' || s === 'ETHUSDT') return 1;
  if (s === 'XAUUSD') return 100;
  if (s === 'XAGUSD') return 5000;
  return 100000;
};

export const ChartRiskCalculator: React.FC<ChartRiskCalculatorProps> = ({
  request,
  onClose,
  onOrderPlaced,
}) => {
  const account = useAppStore((s) => s.account);
  const activeAccountType = useAppStore((s) => s.activeAccountType);
  const prices = useMarketStore((s) => s.prices);

  const [quantity, setQuantity] = useState('0.01');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    const prec = getPrecision(request.symbol);
    setLimitPrice(request.clickedPrice.toFixed(prec));
    setStopLoss('');
    setTakeProfit('');
    setQuantity('0.01');
    setError(null);
  }, [request]);

  const calcStats = useCallback(() => {
    if (!request) return null;
    const livePrice = prices[request.symbol]?.price ?? request.clickedPrice;
    const balance = account?.balance ?? 10000;
    const qty = parseFloat(quantity) || 0;
    const prec = getPrecision(request.symbol);
    const pipSz = getPipSize(request.symbol);
    const contractSz = getContractSize(request.symbol);
    const entryPrice = request.type === 'market' ? livePrice : (parseFloat(limitPrice) || livePrice);
    const slPrice = parseFloat(stopLoss);
    const tpPrice = parseFloat(takeProfit);

    const notional = qty * entryPrice * contractSz;
    const leverage = 10; // default
    const marginRequired = notional / leverage;
    const commission = notional * 0.0001; // 0.01% one-way
    const spreadPips = 2;
    const spreadCost = spreadPips * pipSz * contractSz * qty;

    let moneyRisk = 0;
    let moneyReward = 0;
    let riskPct = 0;
    let rrRatio = '—';

    if (!isNaN(slPrice) && slPrice > 0) {
      const slDist = Math.abs(entryPrice - slPrice);
      moneyRisk = slDist * contractSz * qty;
      riskPct = (moneyRisk / balance) * 100;
    }

    if (!isNaN(tpPrice) && tpPrice > 0) {
      const tpDist = Math.abs(tpPrice - entryPrice);
      moneyReward = tpDist * contractSz * qty;
    }

    if (moneyRisk > 0 && moneyReward > 0) {
      rrRatio = `1 : ${(moneyReward / moneyRisk).toFixed(2)}`;
    }

    return {
      notional: notional.toFixed(2),
      marginRequired: marginRequired.toFixed(2),
      commission: commission.toFixed(2),
      spreadCost: spreadCost.toFixed(4),
      moneyRisk: moneyRisk.toFixed(2),
      moneyReward: moneyReward.toFixed(2),
      riskPct: riskPct.toFixed(2),
      rrRatio,
      entryPrice: entryPrice.toFixed(prec),
    };
  }, [request, quantity, limitPrice, stopLoss, takeProfit, prices, account]);

  const stats = calcStats();

  const handlePlace = async () => {
    if (!request) return;
    setIsPlacing(true);
    setError(null);
    try {
      const prec = getPrecision(request.symbol);
      const livePrice = prices[request.symbol]?.price ?? request.clickedPrice;
      const entryP = request.type === 'market' ? livePrice : parseFloat(limitPrice);

      const orderPayload: any = {
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        quantity: parseFloat(quantity),
        account_type: activeAccountType || 'paper',
      };

      if (request.type === 'limit') {
        orderPayload.price = parseFloat(limitPrice);
      } else if (request.type === 'stop') {
        orderPayload.stop_price = parseFloat(limitPrice);
      }

      if (stopLoss && parseFloat(stopLoss) > 0) {
        orderPayload.stop_loss = parseFloat(stopLoss);
      }
      if (takeProfit && parseFloat(takeProfit) > 0) {
        orderPayload.take_profit = parseFloat(takeProfit);
      }

      await placeOrder(orderPayload);
      useAppStore.getState().addToast(
        'success',
        `${request.side.toUpperCase()} ${request.type.toUpperCase()} placed for ${request.symbol} @ ${entryP.toFixed(prec)}`
      );
      onOrderPlaced();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setIsPlacing(false);
    }
  };

  if (!request) return null;

  const prec = getPrecision(request.symbol);
  const isBuy = request.side === 'buy';
  const sideColor = isBuy ? '#00c076' : '#ff4d57';
  const isMarket = request.type === 'market';
  const priceLabel = request.type === 'limit' ? 'Limit Price' : request.type === 'stop' ? 'Stop Price' : 'Market Price';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        backdropFilter: 'blur(4px)',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#0d1322',
        border: `1px solid ${sideColor}`,
        borderRadius: '8px',
        padding: '20px 24px',
        width: '420px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: `0 0 40px ${sideColor}22, 0 8px 32px rgba(0,0,0,0.8)`,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#8e8e93', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Chart Order
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f5f5f7', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: sideColor,
                color: '#000',
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                fontWeight: 800
              }}>
                {request.side.toUpperCase()}
              </span>
              <span style={{ color: '#f5f5f7' }}>{request.type.toUpperCase()}</span>
              <span style={{ color: sideColor }}>{request.symbol}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#8e8e93',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Price Field */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            {priceLabel}
          </label>
          <input
            type="number"
            value={isMarket ? (prices[request.symbol]?.price?.toFixed(prec) ?? request.clickedPrice.toFixed(prec)) : limitPrice}
            onChange={(e) => !isMarket && setLimitPrice(e.target.value)}
            disabled={isMarket}
            step={Math.pow(10, -prec).toString()}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: isMarket ? 'rgba(255,255,255,0.03)' : '#0a0f1c',
              border: `1px solid ${isMarket ? '#1b2235' : sideColor}`,
              borderRadius: '4px',
              color: isMarket ? '#666' : '#f5f5f7',
              fontSize: '13px',
              fontFamily: 'monospace',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          {isMarket && (
            <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>Executes at best available market price</div>
          )}
        </div>

        {/* Quantity */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '10px', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Lot Size
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              step="0.01"
              min="0.01"
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#0a0f1c',
                border: '1px solid #1b2235',
                borderRadius: '4px',
                color: '#f5f5f7',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            {['0.01','0.05','0.1','0.5','1.0'].map(v => (
              <button
                key={v}
                onClick={() => setQuantity(v)}
                style={{
                  padding: '4px 8px',
                  background: quantity === v ? sideColor : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${quantity === v ? sideColor : '#1b2235'}`,
                  borderRadius: '3px',
                  color: quantity === v ? '#000' : '#8e8e93',
                  fontSize: '9px',
                  cursor: 'pointer',
                  fontWeight: quantity === v ? 700 : 400,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* SL / TP */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#ff4d57', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Stop Loss (optional)
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="—"
              step={Math.pow(10, -prec).toString()}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#0a0f1c',
                border: '1px solid #ff4d5740',
                borderRadius: '4px',
                color: '#ff4d57',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', color: '#00c076', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Take Profit (optional)
            </label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="—"
              step={Math.pow(10, -prec).toString()}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: '#0a0f1c',
                border: '1px solid #00c07640',
                borderRadius: '4px',
                color: '#00c076',
                fontSize: '12px',
                fontFamily: 'monospace',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Risk Calculator Stats */}
        {stats && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid #1b2235',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 700 }}>
              Risk Calculator
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
              {[
                { label: 'Notional Value', value: `$${stats.notional}`, color: '#f5f5f7' },
                { label: 'Margin Required', value: `$${stats.marginRequired}`, color: '#f5f5f7' },
                { label: 'Commission Est.', value: `$${stats.commission}`, color: '#ffb74d' },
                { label: 'Spread Cost Est.', value: `$${stats.spreadCost}`, color: '#ffb74d' },
                { label: 'Money at Risk', value: stats.moneyRisk === '0.00' ? '—' : `-$${stats.moneyRisk}`, color: parseFloat(stats.moneyRisk) > 0 ? '#ff4d57' : '#666' },
                { label: 'Risk %', value: stats.riskPct === '0.00' ? '—' : `${stats.riskPct}%`, color: parseFloat(stats.riskPct) > 2 ? '#ff4d57' : '#ffb74d' },
                { label: 'Potential Reward', value: stats.moneyReward === '0.00' ? '—' : `+$${stats.moneyReward}`, color: parseFloat(stats.moneyReward) > 0 ? '#00c076' : '#666' },
                { label: 'Risk : Reward', value: stats.rrRatio, color: '#d4af37' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ fontSize: '9px', color: '#666', marginBottom: '1px' }}>{label}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(255,77,87,0.15)',
            border: '1px solid #ff4d57',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#ff4d57',
            marginBottom: '12px',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #1b2235',
              borderRadius: '5px',
              color: '#8e8e93',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handlePlace}
            disabled={isPlacing}
            style={{
              flex: 2,
              padding: '10px',
              background: isPlacing ? '#333' : sideColor,
              border: 'none',
              borderRadius: '5px',
              color: isPlacing ? '#666' : '#000',
              fontSize: '12px',
              cursor: isPlacing ? 'not-allowed' : 'pointer',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
          >
            {isPlacing ? 'Placing...' : `${request.side === 'buy' ? '▲ Buy' : '▼ Sell'} ${request.type.toUpperCase()}`}
          </button>
        </div>

        <div style={{ marginTop: '8px', fontSize: '9px', color: '#444', textAlign: 'center' }}>
          Broker: {(activeAccountType || 'paper').toUpperCase()} — Confirm by clicking the button above
        </div>
      </div>
    </div>
  );
};

export default ChartRiskCalculator;
