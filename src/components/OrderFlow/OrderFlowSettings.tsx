import React from 'react';
import { IconX, IconSliders, IconEye, IconZap, IconLayers } from './Icons';

export interface OrderFlowSettingsConfig {
  tickSize: number;
  imbalanceRatio: number; // 2.0, 3.0, 4.0, 5.0
  colorTheme: 'dark' | 'neon' | 'monochrome';
  pocColor: string;
  vaColor: string;
  deltaThreshold: number;
  showNumbers: boolean;
  showHeatmap: boolean;
  showPOC: boolean;
  showValueArea: boolean;
  showImbalances: boolean;
  showAbsorptions: boolean;
  showIcebergs: boolean;
  performanceMode: boolean;
}

interface OrderFlowSettingsProps {
  config: OrderFlowSettingsConfig;
  onChange: (updated: OrderFlowSettingsConfig) => void;
  onClose: () => void;
}

export const OrderFlowSettingsModal: React.FC<OrderFlowSettingsProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const updateField = <K extends keyof OrderFlowSettingsConfig>(
    key: K,
    val: OrderFlowSettingsConfig[K]
  ) => {
    onChange({ ...config, [key]: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-xl border border-slate-700/80 bg-slate-900/95 p-6 shadow-2xl text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <IconSliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-white">
                Order Flow Settings
              </h2>
              <p className="text-xs text-slate-400">
                Institutional Footprint, Delta & Volume Profile Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* General & Parameters */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <IconLayers className="w-4 h-4" /> Parameters & Ratios
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tick Size Aggregation
                </label>
                <select
                  value={config.tickSize}
                  onChange={(e) => updateField('tickSize', parseFloat(e.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value={0.1}>0.1 Ticks</option>
                  <option value={0.5}>0.5 Ticks (Default)</option>
                  <option value={1.0}>1.0 Ticks</option>
                  <option value={2.5}>2.5 Ticks</option>
                  <option value={5.0}>5.0 Ticks</option>
                  <option value={10.0}>10.0 Ticks</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Imbalance Ratio
                </label>
                <select
                  value={config.imbalanceRatio}
                  onChange={(e) => updateField('imbalanceRatio', parseFloat(e.target.value))}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value={2.0}>2x (200%)</option>
                  <option value={3.0}>3x (300% Default)</option>
                  <option value={4.0}>4x (400%)</option>
                  <option value={5.0}>5x (500%)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Delta Highlight Threshold (Contracts)
              </label>
              <input
                type="number"
                value={config.deltaThreshold}
                onChange={(e) => updateField('deltaThreshold', parseFloat(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                placeholder="e.g. 50"
              />
            </div>
          </div>

          {/* Styling & Palette */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <IconLayers className="w-4 h-4" /> Color Theme & Styling
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Theme Preset
                </label>
                <select
                  value={config.colorTheme}
                  onChange={(e) => updateField('colorTheme', e.target.value as any)}
                  className="w-full rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="dark">Dark Institutional</option>
                  <option value="neon">Neon Cyber</option>
                  <option value="monochrome">Monochrome</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  POC Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={config.pocColor}
                    onChange={(e) => updateField('pocColor', e.target.value)}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">{config.pocColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Value Area Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={config.vaColor.startsWith('#') ? config.vaColor : '#3b82f6'}
                    onChange={(e) => updateField('vaColor', e.target.value)}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-xs text-slate-400">70% VA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <IconEye className="w-4 h-4" /> Overlays & Display Toggles
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.showNumbers}
                  onChange={(e) => updateField('showNumbers', e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <span>Show Bid x Ask Numbers</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.showHeatmap}
                  onChange={(e) => updateField('showHeatmap', e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                />
                <span>Show DOM Heatmap</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.showPOC}
                  onChange={(e) => updateField('showPOC', e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <span>Show Point of Control (POC)</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.showValueArea}
                  onChange={(e) => updateField('showValueArea', e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-0"
                />
                <span>Show Value Area (VAH / VAL)</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.showImbalances}
                  onChange={(e) => updateField('showImbalances', e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                />
                <span>Highlight Imbalances</span>
              </label>

              <label className="flex items-center space-x-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={config.showAbsorptions}
                  onChange={(e) => updateField('showAbsorptions', e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0"
                />
                <span>Show Absorptions</span>
              </label>
            </div>
          </div>

          {/* Performance Mode */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20">
              <div className="flex items-center space-x-2">
                <IconZap className="w-5 h-5 text-cyan-400 animate-pulse" />
                <div>
                  <div className="text-xs font-bold text-cyan-300">
                    60 FPS Performance Mode
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Enable windowed rendering & 100,000+ tick canvas optimization
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.performanceMode}
                onChange={(e) => updateField('performanceMode', e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-400 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-lg shadow-cyan-900/30"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
