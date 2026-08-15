import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useMarketStore } from '../../store/marketStore';
import { OptionsChainPanel } from './OptionsChainPanel';
import { GreeksPanel } from './GreeksPanel';
import { IVSurfacePanel } from './IVSurfacePanel';
import { StrategyBuilder } from './StrategyBuilder';
import { ScannerPanel } from './ScannerPanel';
import { PortfolioGreeksPanel } from './PortfolioGreeksPanel';
import { OptionHeatmapPanel } from './OptionHeatmapPanel';
import { OptionOrderEntryPanel } from './OptionOrderEntryPanel';
import { OptionProbabilityPanel } from './OptionProbabilityPanel';
import { OptionBacktestPanel } from './OptionBacktestPanel';

export const OptionsAnalyticsDesk: React.FC = () => {
  const mode = useAppStore(s => s.settings?.mode || 'dark');
  const selectedInstrument = useAppStore(s => s.selectedInstrument);
  const livePrices = useMarketStore(s => s.prices);

  const symbol = selectedInstrument?.symbol || 'BTCUSDT';
  const livePrice = livePrices[symbol]?.price ?? selectedInstrument?.price ?? 65000.0;

  const [activeTab, setActiveTab] = useState<
    'chain' | 'greeks' | 'surface' | 'strategy' | 'order' | 'prob' | 'scanner' | 'portfolio' | 'heatmap' | 'backtest'
  >('chain');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: mode === 'dark' ? '#090d16' : '#ffffff',
      color: mode === 'dark' ? '#e2e8f0' : '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: 11
    }}>
      {/* Header Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px',
        backgroundColor: mode === 'dark' ? '#0f172a' : '#f8fafc', borderBottom: '1px solid #1e293b', gap: 6, flexWrap: 'wrap'
      }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>
          🎯 QUANTUM v2.5 OPTIONS DESK
        </span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { id: 'chain', label: 'Options Chain' },
            { id: 'greeks', label: 'Greeks Engine' },
            { id: 'surface', label: '3D Vol Surface' },
            { id: 'strategy', label: 'Strategy Builder & Payoff' },
            { id: 'order', label: '⚡ Order Entry' },
            { id: 'prob', label: 'Probability (1-3σ)' },
            { id: 'scanner', label: 'Option Scanner' },
            { id: 'portfolio', label: 'Portfolio Greeks' },
            { id: 'heatmap', label: 'Option Heatmaps' },
            { id: 'backtest', label: 'Theta Backtest' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                backgroundColor: activeTab === t.id ? '#f59e0b' : '#1e293b',
                color: activeTab === t.id ? '#0f172a' : '#cbd5e1'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Body Panel View */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {activeTab === 'chain' && <OptionsChainPanel symbol={symbol} livePrice={livePrice} mode={mode} />}
        {activeTab === 'greeks' && <GreeksPanel mode={mode} />}
        {activeTab === 'surface' && <IVSurfacePanel symbol={symbol} livePrice={livePrice} mode={mode} />}
        {activeTab === 'strategy' && <StrategyBuilder symbol={symbol} livePrice={livePrice} mode={mode} />}
        {activeTab === 'order' && <OptionOrderEntryPanel symbol={symbol} livePrice={livePrice} mode={mode} />}
        {activeTab === 'prob' && <OptionProbabilityPanel symbol={symbol} livePrice={livePrice} mode={mode} />}
        {activeTab === 'scanner' && <ScannerPanel mode={mode} />}
        {activeTab === 'portfolio' && <PortfolioGreeksPanel mode={mode} />}
        {activeTab === 'heatmap' && <OptionHeatmapPanel symbol={symbol} livePrice={livePrice} mode={mode} />}
        {activeTab === 'backtest' && <OptionBacktestPanel symbol={symbol} livePrice={livePrice} mode={mode} />}
      </div>
    </div>
  );
};
