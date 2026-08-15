import React from 'react';

export interface ImbalanceEvent {
  timestamp: number;
  price: number;
  type: 'buy_imbalance' | 'sell_imbalance';
  ratio: number;
  ask_volume?: number;
  bid_volume?: number;
  color?: string;
}

interface ImbalanceOverlayProps {
  events: ImbalanceEvent[];
  minPrice: number;
  maxPrice: number;
  height: number;
  width: number;
}

export const ImbalanceOverlay: React.FC<ImbalanceOverlayProps> = ({
  events,
  minPrice,
  maxPrice,
  height,
}) => {
  if (!events || events.length === 0 || maxPrice <= minPrice || height <= 0) return null;

  const priceToY = (p: number) => {
    const ratio = (maxPrice - p) / (maxPrice - minPrice);
    return Math.max(0, Math.min(height, ratio * height));
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
      {events.map((ev, idx) => {
        const y = priceToY(ev.price);
        const isBuy = ev.type === 'buy_imbalance';

        return (
          <div
            key={`imb_${ev.timestamp}_${ev.price}_${idx}`}
            className="absolute right-4 transform -translate-y-1/2 flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold shadow-lg border"
            style={{
              top: `${y}px`,
              backgroundColor: isBuy ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
              borderColor: isBuy ? '#10b981' : '#ef4444',
              color: isBuy ? '#34d399' : '#f87171',
            }}
          >
            <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: isBuy ? '#10b981' : '#ef4444' }} />
            <span>
              {isBuy ? 'BUY IMB' : 'SELL IMB'} ({ev.ratio.toFixed(1)}x) @ {ev.price.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
};
