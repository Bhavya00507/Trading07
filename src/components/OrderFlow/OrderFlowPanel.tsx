import React, { useState, useEffect } from 'react';
import { FootprintChart } from './FootprintChart';
import { VolumeProfile } from './VolumeProfile';
import { DeltaPanel } from './DeltaPanel';
import { HeatMap } from './HeatMap';
import { OrderFlowSettingsModal, OrderFlowSettingsConfig } from './OrderFlowSettings';
import { IconSliders, IconRefreshCw, IconLayers, IconPlay, IconPause } from './Icons';
import { useMarketStore } from '../../store/marketStore';

interface OrderFlowPanelProps {
  symbol?: string;
  timeframe?: string;
}

export const OrderFlowPanel: React.FC<OrderFlowPanelProps> = ({
  symbol: propSymbol = 'BTCUSDT',
  timeframe: propTimeframe = '1m',
}) => {
  const selectedSymbol = useMarketStore((s) => s.selectedSymbol);
  const symbol = propSymbol || selectedSymbol || 'BTCUSDT';
  const [timeframe, setTimeframe] = useState(propTimeframe);

  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);

  const [settings, setSettings] = useState<OrderFlowSettingsConfig>({
    tickSize: 0.5,
    imbalanceRatio: 3.0,
    colorTheme: 'dark',
    pocColor: '#f59e0b',
    vaColor: 'rgba(59, 130, 246, 0.25)',
    deltaThreshold: 50,
    showNumbers: true,
    showHeatmap: true,
    showPOC: true,
    showValueArea: true,
    showImbalances: true,
    showAbsorptions: true,
    showIcebergs: true,
    performanceMode: true,
  });

  const [cvdMode, setCvdMode] = useState<'session' | 'daily' | 'weekly' | 'monthly' | 'continuous'>('session');
  const [vpProfileType, setVpProfileType] = useState<'visible_range' | 'fixed_range' | 'session'>('visible_range');
  const [vpSessionType, setVpSessionType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `http://127.0.0.1:8000/api/orderflow/analytics?symbol=${symbol}&timeframe=${timeframe}&limit=50&tick_size=${settings.tickSize}&imbalance_ratio=${settings.imbalanceRatio}`
      );
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('OrderFlow analytics fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const timer = setInterval(fetchAnalytics, isReplaying ? 1000 / replaySpeed : 2500);
    return () => clearInterval(timer);
  }, [symbol, timeframe, settings.tickSize, settings.imbalanceRatio, isReplaying, replaySpeed]);

  return (
    <div className="flex flex-col w-full h-full bg-slate-950 text-slate-100 p-4 font-sans space-y-4 overflow-y-auto">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <IconLayers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold tracking-wide text-white">
                Order Flow Terminal — {symbol}
              </h2>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold">
                60 FPS Institutional Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Footprint Ladders, Cumulative Delta (CVD), Volume Profile & DOM Liquidity Heatmap
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Timeframe selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['1m', '5m', '15m', '1h', '4h'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded font-mono font-bold transition ${
                  timeframe === tf
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Replay Controls */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setIsReplaying(!isReplaying)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded font-bold transition ${
                isReplaying ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {isReplaying ? <IconPause className="w-3.5 h-3.5" /> : <IconPlay className="w-3.5 h-3.5" />}
              <span>{isReplaying ? 'Pause Replay' : 'Order Flow Replay'}</span>
            </button>
            {isReplaying && (
              <select
                value={replaySpeed}
                onChange={(e) => setReplaySpeed(parseFloat(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono focus:outline-none"
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Refresh Order Flow"
          >
            <IconRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-900/30"
          >
            <IconSliders className="w-4 h-4" />
            <span>Order Flow Settings</span>
          </button>
        </div>
      </div>

      {/* Main Order Flow Layout Grid */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        {/* Footprint Chart (Col 1-8) */}
        <div className="col-span-8 flex flex-col space-y-4">
          <FootprintChart
            candles={analytics?.footprint || []}
            showNumbers={settings.showNumbers}
            pocColor={settings.pocColor}
            onOpenSettings={() => setShowSettings(true)}
          />

          {/* Cumulative Delta Panel */}
          <DeltaPanel
            cvdSeries={analytics?.cumulative_delta || []}
            mode={cvdMode}
            onModeChange={setCvdMode}
          />
        </div>

        {/* Volume Profile & Heatmap Sidebars (Col 9-12) */}
        <div className="col-span-4 flex flex-col space-y-4">
          <VolumeProfile
            profileData={analytics?.volume_profile || { nodes: [] }}
            profileType={vpProfileType}
            sessionType={vpSessionType}
            onProfileTypeChange={setVpProfileType}
            onSessionTypeChange={setVpSessionType}
          />

          {settings.showHeatmap && analytics?.heatmap && (
            <HeatMap heatmapData={analytics.heatmap} />
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <OrderFlowSettingsModal
          config={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};
