/**
 * PendingOrderOverlay.tsx
 * Renders a draggable line for each pending order on the chart.
 * Pure inline CSS — no Tailwind.
 */
import React, { useState } from 'react';

export interface PendingOrderOverlayData {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  order_type: string;
  quantity: number;
  limit_price: number;
  stop_loss?: number;
  take_profit?: number;
}

interface PendingOrderOverlayProps {
  order: PendingOrderOverlayData;
  priceToY: (price: number) => number;
  onStartDrag: (startPrice: number) => void;
  onCancel: () => void;
}

export const PendingOrderOverlay: React.FC<PendingOrderOverlayProps> = ({
  order, priceToY, onStartDrag, onCancel,
}) => {
  const [hovered, setHovered] = useState(false);
  const y = priceToY(order.limit_price);
  const isBuy = order.side === 'BUY';
  const lineColor = isBuy ? '#00b8d9' : '#fbbf24';
  const bg = isBuy ? 'rgba(0,28,45,0.93)' : 'rgba(40,24,0,0.93)';
  const border = isBuy ? 'rgba(0,184,217,0.5)' : 'rgba(251,191,36,0.5)';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25 }}>
      <div
        style={{ position: 'absolute', left: 0, right: 0, top: y, height: 0, borderTop: `1px dashed ${lineColor}`, pointerEvents: 'auto', cursor: 'row-resize' }}
        onMouseDown={() => onStartDrag(order.limit_price)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          position: 'absolute',
          left: 80,
          top: '50%',
          transform: `translateY(-50%) scale(${hovered ? 1.04 : 1})`,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '2px 8px 2px 5px',
          borderRadius: 5,
          background: bg,
          border: `1px solid ${border}`,
          boxShadow: hovered ? `0 0 16px ${lineColor}40` : '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.15s ease',
          fontFamily: 'Inter, monospace',
          whiteSpace: 'nowrap',
          pointerEvents: 'auto',
        }}>
          <span style={{ fontSize: 8, color: lineColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>⠿</span>
          <span style={{ fontSize: 9, color: lineColor, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {order.side} {order.order_type}
          </span>
          <span style={{ fontSize: 10, color: '#e2e8f0', fontWeight: 900, fontFamily: 'monospace' }}>
            {order.limit_price.toFixed(2)}
          </span>
          <span style={{ fontSize: 9, color: '#5a6680' }}>× {order.quantity}L</span>
          {hovered && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              style={{
                background: 'rgba(255,77,87,0.15)', border: '1px solid rgba(255,77,87,0.3)',
                color: '#ff4d57', cursor: 'pointer', padding: '0 4px', fontSize: 10,
                lineHeight: '14px', borderRadius: 3, marginLeft: 2,
              }}
              title="Cancel Order"
            >×</button>
          )}
        </div>
      </div>
    </div>
  );
};
