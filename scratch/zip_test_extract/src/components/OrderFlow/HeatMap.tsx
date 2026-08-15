import React, { useMemo } from 'react';

export interface HeatmapData {
  current_price: number;
  price_grid: number[];
  time_snapshots_count: number;
  heatmap_matrix: {
    price: number;
    volume: number;
    intensity: number;
    color: string;
    is_spoofing?: boolean;
  }[][];
  spoofing_alerts?: {
    snapshot_index: number;
    price: number;
    volume: number;
    type: string;
    description: string;
  }[];
}

interface HeatMapProps {
  heatmapData: HeatmapData;
  height?: number;
}

export const HeatMap: React.FC<HeatMapProps> = ({ heatmapData, height = 240 }) => {
  if (!heatmapData || !heatmapData.heatmap_matrix || heatmapData.heatmap_matrix.length === 0) {
    return null;
  }

  const { price_grid, heatmap_matrix, spoofing_alerts } = heatmapData;

  return (
    <div className="relative w-full rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            DOM Liquidity Heatmap
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">
            (Depth Profile & Spoofing Detector)
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
          <span>Low</span>
          <div className="h-2 w-16 rounded bg-gradient-to-r from-blue-900 via-yellow-500 via-orange-500 to-red-600" />
          <span>High Liquidity</span>
        </div>
      </div>

      {/* Grid Canvas / Visual Matrix */}
      <div
        className="w-full relative overflow-x-auto overflow-y-hidden rounded border border-slate-900 bg-slate-950"
        style={{ height: `${height}px` }}
      >
        <div className="h-full w-full flex flex-col justify-between py-1 px-1">
          {heatmap_matrix[0].map((cell, pIdx) => {
            const priceVal = price_grid[pIdx] || cell.price;
            const rowCells = heatmap_matrix.map((timeRow) => timeRow[pIdx]);

            return (
              <div
                key={`heatmap_row_${pIdx}`}
                className="flex items-center w-full h-[6px] my-[0.5px]"
              >
                {/* Price Label */}
                <span className="w-14 text-[9px] font-mono font-semibold text-slate-400 select-none">
                  {priceVal.toFixed(1)}
                </span>

                {/* Heatmap Row Cells across time */}
                <div className="flex-1 flex h-full items-center space-x-[1px]">
                  {rowCells.map((timeCell, tIdx) => (
                    <div
                      key={`hm_cell_${pIdx}_${tIdx}`}
                      className={`flex-1 h-full rounded-[0.5px] transition-all hover:scale-125 hover:z-20 cursor-pointer ${
                        timeCell.is_spoofing ? 'border border-red-500 animate-ping' : ''
                      }`}
                      style={{ backgroundColor: timeCell.color }}
                      title={`Price: ${timeCell.price.toFixed(2)} | Liquidity: ${timeCell.volume} lots | Intensity: ${Math.round(timeCell.intensity * 100)}%`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spoofing Alerts Notification Banner */}
      {spoofing_alerts && spoofing_alerts.length > 0 && (
        <div className="mt-2 p-2 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center justify-between text-[11px] text-red-300">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 rounded bg-red-500 text-slate-950 font-extrabold text-[9px] uppercase">
              Spoofing Alert
            </span>
            <span className="font-mono text-slate-200">
              {spoofing_alerts[0].description}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {spoofing_alerts.length} event(s) detected
          </span>
        </div>
      )}
    </div>
  );
};
