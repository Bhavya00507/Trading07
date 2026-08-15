import React from 'react';
import { IconShieldAlert, IconShieldCheck } from './Icons';

export interface AbsorptionEvent {
  timestamp: number;
  price: number;
  type: 'buyer_absorption' | 'seller_absorption';
  title: string;
  description: string;
  absorbed_volume: number;
  counter_volume: number;
  strength: number;
  color?: string;
}

interface AbsorptionOverlayProps {
  events: AbsorptionEvent[];
  minPrice: number;
  maxPrice: number;
  height: number;
}

export const AbsorptionOverlay: React.FC<AbsorptionOverlayProps> = ({
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
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {events.map((ev, idx) => {
        const y = priceToY(ev.price);
        const isBuyerAbs = ev.type === 'buyer_absorption';

        return (
          <div
            key={`abs_${ev.timestamp}_${ev.price}_${idx}`}
            className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 group pointer-events-auto cursor-pointer"
            style={{ top: `${y}px` }}
          >
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-xl backdrop-blur-md transition-transform hover:scale-110 ${
                isBuyerAbs
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-red-950/80 border-red-500/60 text-red-300'
              }`}
            >
              {isBuyerAbs ? (
                <IconShieldCheck className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <IconShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              )}
              <span>{isBuyerAbs ? 'BUYER ABSORPTION' : 'SELLER ABSORPTION'}</span>
              <span className="opacity-75 font-mono">({ev.absorbed_volume}v)</span>
            </div>

            {/* Hover Card */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 rounded-xl bg-slate-900/95 border border-slate-700 text-xs text-slate-200 shadow-2xl z-30 pointer-events-none">
              <div className="font-bold text-white mb-1">{ev.title}</div>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                {ev.description}
              </p>
              <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 font-mono border-t border-slate-800 pt-1.5">
                <div>Absorbed: <span className="text-white font-bold">{ev.absorbed_volume}</span></div>
                <div>Counter Vol: <span className="text-white font-bold">{ev.counter_volume}</span></div>
                <div>Strength: <span className="text-cyan-400 font-bold">{ev.strength}x</span></div>
                <div>Price: <span className="text-amber-300 font-bold">{ev.price.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
