import React, { useState } from 'react';
import { IconBarChart3, IconLayers, IconTrendingUp } from './Icons';

export interface ProfileNode {
  price: number;
  buy_volume: number;
  sell_volume: number;
  total_volume: number;
  delta: number;
  is_poc?: boolean;
  in_value_area?: boolean;
  is_hvn?: boolean;
  is_lvn?: boolean;
}

export interface VolumeProfileData {
  poc_price: number;
  vah_price: number;
  val_price: number;
  total_volume: number;
  total_delta: number;
  value_area_volume: number;
  nodes: ProfileNode[];
  hvn_prices?: number[];
  lvn_prices?: number[];
  developing_poc?: { timestamp: number; poc_price: number }[];
}

interface VolumeProfileProps {
  profileData: VolumeProfileData;
  profileType?: 'visible_range' | 'fixed_range' | 'session';
  sessionType?: 'daily' | 'weekly' | 'monthly';
  onProfileTypeChange?: (type: 'visible_range' | 'fixed_range' | 'session') => void;
  onSessionTypeChange?: (sess: 'daily' | 'weekly' | 'monthly') => void;
  height?: number;
}

export const VolumeProfile: React.FC<VolumeProfileProps> = ({
  profileData,
  profileType = 'visible_range',
  sessionType = 'daily',
  onProfileTypeChange,
  onSessionTypeChange,
  height = 360,
}) => {
  if (!profileData || !profileData.nodes || profileData.nodes.length === 0) return null;

  const { poc_price, vah_price, val_price, total_volume, total_delta, nodes } = profileData;

  const maxNodeVol = Math.max(1, ...nodes.map((n) => n.total_volume));
  const sortedNodes = [...nodes].sort((a, b) => b.price - a.price);

  return (
    <div className="relative w-full rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl font-sans">
      {/* Header Controls */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <IconBarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Institutional Volume Profile
            </h3>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
              <span>Vol: {Math.round(total_volume)}</span>
              <span>•</span>
              <span className={total_delta >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                Delta: {total_delta > 0 ? `+${Math.round(total_delta)}` : Math.round(total_delta)}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Type Selectors */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
            {(['visible_range', 'fixed_range', 'session'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onProfileTypeChange && onProfileTypeChange(t)}
                className={`px-2 py-1 rounded font-medium capitalize transition ${
                  profileType === t
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>

          {profileType === 'session' && (
            <select
              value={sessionType}
              onChange={(e) => onSessionTypeChange && onSessionTypeChange(e.target.value as any)}
              className="rounded bg-slate-900 border border-slate-800 px-2 py-1 text-[10px] text-white focus:outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
        </div>
      </div>

      {/* Key Profile Metrics Badges (POC, VAH, VAL) */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/40">
          <div className="text-[9px] uppercase font-bold text-amber-400">Point of Control (POC)</div>
          <div className="text-xs font-mono font-extrabold text-amber-300">{poc_price.toFixed(2)}</div>
        </div>

        <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-500/40">
          <div className="text-[9px] uppercase font-bold text-blue-400">Value Area High (VAH)</div>
          <div className="text-xs font-mono font-extrabold text-blue-300">{vah_price.toFixed(2)}</div>
        </div>

        <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-500/40">
          <div className="text-[9px] uppercase font-bold text-blue-400">Value Area Low (VAL)</div>
          <div className="text-xs font-mono font-extrabold text-blue-300">{val_price.toFixed(2)}</div>
        </div>
      </div>

      {/* Volume Profile Bars List */}
      <div
        className="w-full overflow-y-auto pr-1 space-y-[2px]"
        style={{ maxHeight: `${height}px` }}
      >
        {sortedNodes.map((node) => {
          const buyRatio = (node.buy_volume / maxNodeVol) * 100;
          const sellRatio = (node.sell_volume / maxNodeVol) * 100;
          const isPOC = node.price === poc_price;
          const inVA = node.in_value_area;

          return (
            <div
              key={`vp_node_${node.price}`}
              className={`group flex items-center justify-between px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                isPOC
                  ? 'bg-amber-950/40 border-amber-500 shadow-md font-bold'
                  : inVA
                  ? 'bg-blue-950/20 border-blue-900/40'
                  : 'bg-slate-900/30 border-slate-900'
              }`}
            >
              {/* Price */}
              <span className={`w-14 text-left ${isPOC ? 'text-amber-300 font-extrabold' : 'text-slate-300'}`}>
                {node.price.toFixed(2)}
              </span>

              {/* Split Buy/Sell Volume Bars */}
              <div className="flex-1 mx-3 flex items-center h-2.5 rounded bg-slate-900 overflow-hidden relative border border-slate-800">
                {/* Buy Bar (Green) */}
                <div
                  className="h-full bg-emerald-500 opacity-90 transition-all"
                  style={{ width: `${Math.max(1, buyRatio)}%` }}
                />
                {/* Sell Bar (Red) */}
                <div
                  className="h-full bg-red-500 opacity-90 transition-all"
                  style={{ width: `${Math.max(1, sellRatio)}%` }}
                />
              </div>

              {/* Total Vol & Delta */}
              <div className="flex items-center space-x-2 text-[10px]">
                <span className="text-slate-400">{Math.round(node.total_volume)}</span>
                <span className={node.delta >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {node.delta > 0 ? `+${Math.round(node.delta)}` : Math.round(node.delta)}
                </span>
                {node.is_hvn && (
                  <span className="px-1 py-0.2 rounded bg-cyan-900/50 text-cyan-300 text-[8px] uppercase font-sans">
                    HVN
                  </span>
                )}
                {node.is_lvn && (
                  <span className="px-1 py-0.2 rounded bg-slate-800 text-slate-400 text-[8px] uppercase font-sans">
                    LVN
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
