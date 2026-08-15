import React, { useMemo } from 'react';
import { FootprintCell, FootprintLevelData } from './FootprintCell';
import { IconLayers, IconActivity, IconSettings, IconTrendingUp, IconTrendingDown } from './Icons';

export interface FootprintCandleData {
  timestamp: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  total_volume: number;
  total_delta: number;
  poc_price: number;
  levels: FootprintLevelData[];
}

interface FootprintChartProps {
  candles: FootprintCandleData[];
  showNumbers?: boolean;
  pocColor?: string;
  onOpenSettings?: () => void;
}

export const FootprintChart: React.FC<FootprintChartProps> = ({
  candles,
  showNumbers = true,
  pocColor = '#f59e0b',
  onOpenSettings,
}) => {
  if (!candles || candles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-sans">
        <IconActivity className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
        <p className="text-sm font-semibold">Generating Footprint Order Flow Ladders...</p>
      </div>
    );
  }

  // Calculate cumulative stats
  const totalVolume = useMemo(
    () => candles.reduce((acc, c) => acc + c.total_volume, 0),
    [candles]
  );
  const totalDelta = useMemo(
    () => candles.reduce((acc, c) => acc + c.total_delta, 0),
    [candles]
  );

  return (
    <div className="flex flex-col w-full h-full bg-slate-950/95 border border-slate-800 rounded-xl p-4 shadow-2xl font-sans overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/90">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <IconLayers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Institutional Order Flow Footprint
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                Bid x Ask Ladder
              </span>
            </h3>
            <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 mt-0.5">
              <span>Total Volume: <strong className="text-white">{Math.round(totalVolume)}</strong></span>
              <span>
                Session Delta:{' '}
                <strong className={totalDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {totalDelta > 0 ? `+${Math.round(totalDelta)}` : Math.round(totalDelta)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <IconSettings className="w-4 h-4 text-cyan-400" />
              <span>Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Footprint Columns Container */}
      <div className="flex-1 w-full overflow-x-auto overflow-y-auto pr-2 pb-2">
        <div className="flex items-start space-x-3 min-w-max p-1">
          {candles.map((candle, cIdx) => {
            const isBull = candle.close >= candle.open;
            const candleMaxVol = Math.max(1, ...candle.levels.map((l) => l.total_volume));

            const timeStr = new Date(candle.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={`fp_candle_${candle.timestamp}_${cIdx}`}
                className="flex flex-col w-56 rounded-xl border border-slate-800/90 bg-slate-900/60 p-2 shadow-lg hover:border-cyan-500/50 transition-all duration-200"
              >
                {/* Candle Header Info */}
                <div
                  className={`flex items-center justify-between pb-2 mb-2 border-b text-xs font-mono font-bold ${
                    isBull
                      ? 'border-emerald-500/40 text-emerald-400'
                      : 'border-red-500/40 text-red-400'
                  }`}
                >
                  <div className="flex items-center space-x-1">
                    {isBull ? <IconTrendingUp className="w-3.5 h-3.5" /> : <IconTrendingDown className="w-3.5 h-3.5" />}
                    <span>{timeStr}</span>
                  </div>
                  <span className="text-[11px] font-sans text-slate-400 font-semibold">
                    C: {candle.close.toFixed(2)}
                  </span>
                </div>

                {/* Footprint Price Levels (Ladder) */}
                <div className="flex flex-col space-y-[1px] my-1">
                  {candle.levels.map((level) => (
                    <FootprintCell
                      key={`lvl_${candle.timestamp}_${level.price}`}
                      level={level}
                      maxCandleVolume={candleMaxVol}
                      showNumbers={showNumbers}
                      pocColor={pocColor}
                    />
                  ))}
                </div>

                {/* Candle Summary Footer */}
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <div>
                    Vol: <strong className="text-white">{Math.round(candle.total_volume)}</strong>
                  </div>
                  <div>
                    Delta:{' '}
                    <strong className={candle.total_delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {candle.total_delta > 0 ? `+${Math.round(candle.total_delta)}` : Math.round(candle.total_delta)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
