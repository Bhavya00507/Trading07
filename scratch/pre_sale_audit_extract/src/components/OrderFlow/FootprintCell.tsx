import React from 'react';
import { IconShield, IconZap, IconAnchor } from './Icons';

export interface FootprintLevelData {
  price: number;
  bid_volume: number;
  ask_volume: number;
  total_volume: number;
  delta: number;
  is_poc?: boolean;
  is_buy_imbalance?: boolean;
  is_sell_imbalance?: boolean;
  imbalance_ratio?: number;
  buyer_absorption?: boolean;
  seller_absorption?: boolean;
  iceberg_detected?: boolean;
  iceberg_confidence?: number;
}

interface FootprintCellProps {
  level: FootprintLevelData;
  maxCandleVolume: number;
  showNumbers?: boolean;
  pocColor?: string;
}

export const FootprintCell: React.FC<FootprintCellProps> = ({
  level,
  maxCandleVolume,
  showNumbers = true,
  pocColor = '#f59e0b',
}) => {
  const {
    price,
    bid_volume,
    ask_volume,
    total_volume,
    delta,
    is_poc,
    is_buy_imbalance,
    is_sell_imbalance,
    buyer_absorption,
    seller_absorption,
    iceberg_detected,
    iceberg_confidence,
  } = level;

  // Visual intensity scaling
  const fillRatio = maxCandleVolume > 0 ? Math.min(1.0, total_volume / maxCandleVolume) : 0;
  const isPositiveDelta = delta >= 0;

  // Background gradient intensity based on delta and volume
  const bgStyle: React.CSSProperties = {
    background: isPositiveDelta
      ? `linear-gradient(90deg, rgba(16, 185, 129, ${0.08 + fillRatio * 0.35}) 0%, rgba(16, 185, 129, ${0.02 + fillRatio * 0.15}) 100%)`
      : `linear-gradient(90deg, rgba(239, 68, 68, ${0.08 + fillRatio * 0.35}) 0%, rgba(239, 68, 68, ${0.02 + fillRatio * 0.15}) 100%)`,
    borderColor: is_poc
      ? pocColor
      : is_buy_imbalance
      ? '#10b981'
      : is_sell_imbalance
      ? '#ef4444'
      : 'rgba(51, 65, 85, 0.4)',
  };

  return (
    <div
      className={`group relative flex items-center justify-between px-2 py-0.5 my-[1px] text-[11px] font-mono border rounded transition-all duration-150 ${
        is_poc ? 'shadow-sm font-bold z-10 scale-[1.02]' : ''
      }`}
      style={bgStyle}
    >
      {/* Price Node Label */}
      <span
        className={`w-14 text-left font-semibold ${
          is_poc ? 'text-amber-300 font-extrabold' : 'text-slate-300'
        }`}
      >
        {price.toFixed(2)}
      </span>

      {/* Footprint Numbers: Bid x Ask */}
      {showNumbers ? (
        <div className="flex items-center space-x-2 text-center font-bold">
          {/* Bid Volume */}
          <span
            className={`min-w-[34px] px-1 py-0.2 rounded text-right ${
              is_sell_imbalance
                ? 'bg-red-500/30 text-red-300 border border-red-500/50 animate-pulse'
                : 'text-slate-200'
            }`}
          >
            {Math.round(bid_volume)}
          </span>

          <span className="text-slate-600 font-sans text-[10px]">x</span>

          {/* Ask Volume */}
          <span
            className={`min-w-[34px] px-1 py-0.2 rounded text-left ${
              is_buy_imbalance
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 animate-pulse'
                : 'text-slate-200'
            }`}
          >
            {Math.round(ask_volume)}
          </span>
        </div>
      ) : (
        <div className="flex-1 mx-2 h-2 rounded bg-slate-800/80 overflow-hidden relative">
          <div
            className={`h-full ${isPositiveDelta ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${Math.max(5, fillRatio * 100)}%` }}
          />
        </div>
      )}

      {/* Indicators: POC, Absorption, Icebergs */}
      <div className="flex items-center space-x-1 pl-1">
        {is_poc && (
          <span
            className="px-1 py-0.2 text-[9px] uppercase tracking-wider rounded font-sans text-slate-900 font-extrabold"
            style={{ backgroundColor: pocColor }}
            title="Point of Control (POC)"
          >
            POC
          </span>
        )}

        {buyer_absorption && (
          <IconShield className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20 animate-bounce" />
        )}

        {seller_absorption && (
          <IconShield className="w-3.5 h-3.5 text-red-400 fill-red-400/20 animate-bounce" />
        )}

        {iceberg_detected && (
          <IconAnchor className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
        )}
      </div>

      {/* Tooltip on Hover */}
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:flex flex-col p-2 rounded-lg bg-slate-900/95 border border-slate-700 text-[10px] text-slate-200 shadow-xl z-30 pointer-events-none whitespace-nowrap">
        <div className="font-bold text-cyan-400 mb-1">Price Level: {price.toFixed(2)}</div>
        <div>Total Volume: {total_volume.toFixed(1)}</div>
        <div>
          Delta: <span className={delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>{delta.toFixed(1)}</span>
        </div>
        <div>Bid Volume: {bid_volume.toFixed(1)}</div>
        <div>Ask Volume: {ask_volume.toFixed(1)}</div>
        {is_buy_imbalance && <div className="text-emerald-400 font-bold">Buy Imbalance Active</div>}
        {is_sell_imbalance && <div className="text-red-400 font-bold">Sell Imbalance Active</div>}
        {buyer_absorption && <div className="text-emerald-300">Buyer Defense / Absorption</div>}
        {seller_absorption && <div className="text-red-300">Seller Defense / Absorption</div>}
        {iceberg_detected && <div className="text-cyan-300">Iceberg Order Active ({Math.round((iceberg_confidence || 0.8) * 100)}%)</div>}
      </div>
    </div>
  );
};
