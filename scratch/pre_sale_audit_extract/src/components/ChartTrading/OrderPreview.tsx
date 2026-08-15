import React from 'react';
import { IconShield, IconTarget, IconZap, IconX } from './Icons';

export interface OrderPreviewDetails {
  symbol: string;
  side: 'BUY' | 'SELL';
  order_type: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  notional_value: number;
  required_margin: number;
  margin_percentage: number;
  estimated_commission: number;
  estimated_spread_cost: number;
  estimated_swap_nightly: number;
  risk_metrics: {
    entry_price?: number;
    current_price?: number;
    stop_loss?: number;
    take_profit?: number;
    risk_usd: number;
    risk_pct: number;
    reward_usd: number;
    reward_pct: number;
    risk_reward_ratio: string;
    sl_projected_pnl?: number;
    tp_projected_pnl?: number;
  };
  can_execute: boolean;
  warning?: string;
}

interface OrderPreviewProps {
  details: OrderPreviewDetails;
  onConfirm: () => void;
  onCancel: () => void;
}

export const OrderPreviewModal: React.FC<OrderPreviewProps> = ({
  details,
  onConfirm,
  onCancel,
}) => {
  const isBuy = details.side === 'BUY';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        fontFamily: "'Inter', -apple-system, sans-serif",
        pointerEvents: 'auto',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          borderRadius: '12px',
          border: '1px solid #1b2235',
          background: '#0d1322',
          padding: '24px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          color: '#f5f5f7',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #1b2235' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px 8px', borderRadius: '6px', background: 'rgba(0,192,118,0.12)', color: '#00c076' }}>
              <IconZap className="w-5 h-5" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#ffffff' }}>Order Placement Preview</h3>
              <p style={{ fontSize: '11px', color: '#8e8e93', margin: '2px 0 0' }}>Review institutional trade & risk details</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: '#8e8e93', cursor: 'pointer', padding: '4px' }}
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Order Type & Symbol Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: '#080a10', border: '1px solid #1b2235', fontFamily: 'monospace' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 800,
                background: isBuy ? 'rgba(0,192,118,0.15)' : 'rgba(255,77,87,0.15)',
                color: isBuy ? '#00c076' : '#ff4d57',
                border: isBuy ? '1px solid #00c076' : '1px solid #ff4d57',
              }}
            >
              {details.side} {details.order_type}
            </span>
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '13px' }}>{details.symbol}</span>
          </div>
          <span style={{ fontSize: '11px', color: '#8e8e93' }}>
            {details.quantity} lot(s)
          </span>
        </div>

        {/* Financial Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(8,10,16,0.6)', border: '1px solid #1b2235' }}>
            <div style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase' }}>Entry Price</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>{details.entry_price.toFixed(2)}</div>
          </div>

          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(8,10,16,0.6)', border: '1px solid #1b2235' }}>
            <div style={{ fontSize: '9px', color: '#8e8e93', textTransform: 'uppercase' }}>Required Margin</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#00c076', marginTop: '2px' }}>
              ${details.required_margin.toFixed(2)} ({details.margin_percentage}%)
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,77,87,0.08)', border: '1px solid rgba(255,77,87,0.2)' }}>
            <div style={{ fontSize: '9px', color: '#ff4d57', textTransform: 'uppercase' }}>Max Loss (SL)</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ff4d57', marginTop: '2px' }}>
              {details.risk_metrics.stop_loss ? `-$${details.risk_metrics.risk_usd.toFixed(2)} (${details.risk_metrics.risk_pct}%)` : 'None'}
            </div>
          </div>

          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,192,118,0.08)', border: '1px solid rgba(0,192,118,0.2)' }}>
            <div style={{ fontSize: '9px', color: '#00c076', textTransform: 'uppercase' }}>Max Profit (TP)</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#00c076', marginTop: '2px' }}>
              {details.risk_metrics.take_profit ? `+$${details.risk_metrics.reward_usd.toFixed(2)} (${details.risk_metrics.reward_pct}%)` : 'None'}
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', borderRadius: '8px', background: '#080a10', border: '1px solid #1b2235', fontSize: '11px', fontFamily: 'monospace' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8e8e93' }}>Risk:Reward Ratio:</span>
            <span style={{ color: '#00c076', fontWeight: 800 }}>{details.risk_metrics.risk_reward_ratio}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8e8e93' }}>Est. Commission:</span>
            <span style={{ color: '#ffffff' }}>${details.estimated_commission.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8e8e93' }}>Est. Spread Cost:</span>
            <span style={{ color: '#ffffff' }}>${details.estimated_spread_cost.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8e8e93' }}>Overnight Swap:</span>
            <span style={{ color: '#ffffff' }}>${details.estimated_swap_nightly.toFixed(2)} / night</span>
          </div>
        </div>

        {/* Warning if any */}
        {details.warning && (
          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)', fontSize: '11px', color: '#ff9800', fontWeight: 600 }}>
            ⚠️ {details.warning}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              background: '#1b2235',
              color: '#8e8e93',
              border: 'none',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!details.can_execute}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              background: isBuy ? '#00c076' : '#ff4d57',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: 12,
              cursor: details.can_execute ? 'pointer' : 'not-allowed',
              opacity: details.can_execute ? 1 : 0.5,
              boxShadow: isBuy ? '0 4px 16px rgba(0,192,118,0.4)' : '0 4px 16px rgba(255,77,87,0.4)',
            }}
          >
            Confirm {details.side} Order
          </button>
        </div>
      </div>
    </div>
  );
};
