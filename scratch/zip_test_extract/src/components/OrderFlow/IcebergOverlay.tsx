import React from 'react';
import { IconAnchor } from './Icons';

export interface IcebergSignal {
  timestamp: number;
  price: number;
  side: 'buy_iceberg' | 'sell_iceberg';
  total_traded_volume: number;
  estimated_hidden_volume: number;
  confidence_percentage: number;
  color?: string;
}

interface IcebergOverlayProps {
  signals: IcebergSignal[];
  minPrice: number;
  maxPrice: number;
  height: number;
}

export const IcebergOverlay: React.FC<IcebergOverlayProps> = ({
  signals,
  minPrice,
  maxPrice,
  height,
}) => {
  if (!signals || signals.length === 0 || maxPrice <= minPrice || height <= 0) return null;

  const priceToY = (p: number) => {
    const ratio = (maxPrice - p) / (maxPrice - minPrice);
    return Math.max(0, Math.min(height, ratio * height));
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {signals.map((sig, idx) => {
        const y = priceToY(sig.price);
        const isBuy = sig.side === 'buy_iceberg';

        return (
          <div
            key={`ice_${sig.timestamp}_${sig.price}_${idx}`}
            className="absolute left-8 transform -translate-y-1/2 group pointer-events-auto cursor-pointer"
            style={{ top: `${y}px` }}
          >
            <div
              className={`flex items-center space-x-1 px-2 py-0.5 rounded border text-[10px] font-mono font-bold shadow-lg backdrop-blur-md transition-all hover:scale-105 ${
                isBuy
                  ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300'
                  : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
              }`}
            >
              <IconAnchor className="w-3 h-3 text-cyan-400" />
              <span>ICEBERG</span>
              <span className="text-[9px] opacity-80">{sig.confidence_percentage}%</span>
            </div>

            {/* Hover details */}
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden group-hover:block w-56 p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 text-xs text-slate-200 shadow-2xl z-30 pointer-events-none">
              <div className="font-bold text-cyan-400 mb-1 flex items-center gap-1">
                <IconAnchor className="w-3.5 h-3.5" /> Hidden Iceberg Order
              </div>
              <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                <div>Price Level: <span className="text-white font-bold">{sig.price.toFixed(2)}</span></div>
                <div>Side: <span className={isBuy ? 'text-emerald-400' : 'text-amber-400'}>{isBuy ? 'BUY' : 'SELL'}</span></div>
                <div>Traded Vol: <span className="text-white font-bold">{sig.total_traded_volume}</span></div>
                <div>Est. Hidden Vol: <span className="text-cyan-300 font-bold">{sig.estimated_hidden_volume}</span></div>
                <div>Confidence: <span className="text-amber-300 font-bold">{sig.confidence_percentage}%</span></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
