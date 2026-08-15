// src/components/BuyerDemo/BuyerDemoDashboardModal.tsx
import React from 'react';
import { FeatureStatusBadge } from './BuyerDemoHeaderBadge';
import './BuyerDemo.css';

interface BuyerDemoDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (moduleKey: string) => void;
  onStartTour: () => void;
}

interface ModuleItem {
  key: string;
  title: string;
  icon: string;
  description: string;
  statusType: 'paper' | 'simulated' | 'integration';
  statusLabel: string;
}

export const BuyerDemoDashboardModal: React.FC<BuyerDemoDashboardModalProps> = ({
  isOpen,
  onClose,
  onSelectModule,
  onStartTour,
}) => {
  if (!isOpen) return null;

  const modules: ModuleItem[] = [
    {
      key: 'chart',
      title: 'Workstation & Charting',
      icon: '📊',
      description: 'Multi-chart canvas grid powered by TradingView Lightweight Charts with custom drawing overlay.',
      statusType: 'paper',
      statusLabel: 'Production-Like',
    },
    {
      key: 'portfolio',
      title: 'Portfolio & Risk Lab',
      icon: '💼',
      description: 'Real-time equity, margin utilization, drawdown alerts, and position sizing risk metrics.',
      statusType: 'paper',
      statusLabel: 'Production-Like',
    },
    {
      key: 'execution',
      title: 'Order Execution & Lines',
      icon: '⚡',
      description: 'Interactive canvas order line dragging for SL/TP modification with instant paper fill execution.',
      statusType: 'paper',
      statusLabel: 'Paper Execution',
    },
    {
      key: 'dom',
      title: 'Order Flow & Level-2 DOM',
      icon: '🌊',
      description: 'Level-2 orderbook depth, footprint chart panels, volume profiles, and time-and-sales feed.',
      statusType: 'simulated',
      statusLabel: 'Simulated Depth',
    },
    {
      key: 'replay',
      title: 'Market Replay Studio',
      icon: '⏮️',
      description: 'Tick-by-tick historical playback engine for strategy backtesting and simulation.',
      statusType: 'simulated',
      statusLabel: 'Simulated Playback',
    },
    {
      key: 'options',
      title: 'Institutional Options Desk',
      icon: '🎯',
      description: 'Options chain analytics, Black-Scholes Greeks, volatility surface charts, and strategy payoff diagrams.',
      statusType: 'simulated',
      statusLabel: 'Simulated Analytics',
    },
    {
      key: 'sor',
      title: 'Smart Order Router (SOR)',
      icon: '🔄',
      description: 'Algorithmic multi-venue routing simulation demonstrating liquidity pool order splitting.',
      statusType: 'simulated',
      statusLabel: 'Simulated Routing',
    },
    {
      key: 'script',
      title: 'Script Studio & Indicators',
      icon: '📜',
      description: 'Pine-style script editor for custom indicator math and automated strategy backtesting.',
      statusType: 'paper',
      statusLabel: 'Production-Like',
    },
    {
      key: 'ai',
      title: 'Autonomous AI Analyst',
      icon: '🤖',
      description: 'AI Copilot and signal analyst with built-in heuristic models and OpenAI/Claude API integration.',
      statusType: 'simulated',
      statusLabel: 'Heuristic Fallback',
    },
    {
      key: 'gateway',
      title: 'Market Data Gateway',
      icon: '🌐',
      description: 'Centralized REST & WebSocket gateway streaming ticker feeds and candle aggregations.',
      statusType: 'simulated',
      statusLabel: 'Live / Synthetic Feed',
    },
    {
      key: 'mobile',
      title: 'Quantum Mobile Pro',
      icon: '📱',
      description: 'Touch-optimized mobile layout with chart canvas panning, quick order sheet, and drawer navigation.',
      statusType: 'paper',
      statusLabel: 'Production-Like',
    },
    {
      key: 'broker',
      title: 'Broker Adapter Gateway',
      icon: '🔌',
      description: 'Extensible provider interface for connecting custom broker APIs (Binance, IBKR, MT5, FIX).',
      statusType: 'integration',
      statusLabel: 'Integration Required',
    },
  ];

  return (
    <div className="buyer-demo-modal-overlay" onClick={onClose}>
      <div className="buyer-demo-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="buyer-demo-modal-header">
          <h2>
            <span>🚀</span> Quantum Terminal — Buyer Presentation Dashboard
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                onClose();
                onStartTour();
              }}
              style={{
                background: 'linear-gradient(135deg, #d4af37, #38bdf8)',
                border: 'none',
                borderRadius: 4,
                color: '#000000',
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Start Product Tour ➔
            </button>
            <button className="buyer-demo-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="buyer-demo-modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              Explore the 12 core functional modules of the Quantum Terminal platform architecture:
            </p>
            <span style={{ fontSize: 10, color: '#d4af37', fontWeight: 700 }}>
              ● DEMO MODE ACTIVE
            </span>
          </div>

          <div className="buyer-modules-grid">
            {modules.map((m) => (
              <div
                key={m.key}
                className="buyer-module-card"
                onClick={() => {
                  onSelectModule(m.key);
                  onClose();
                }}
              >
                <div>
                  <div className="buyer-module-card-header">
                    <span className="buyer-module-icon">{m.icon}</span>
                    <span className="buyer-module-title">{m.title}</span>
                  </div>
                  <p className="buyer-module-desc" style={{ marginTop: 8 }}>
                    {m.description}
                  </p>
                </div>

                <div className="buyer-module-footer">
                  <FeatureStatusBadge type={m.statusType} customLabel={m.statusLabel} />
                  <span style={{ fontSize: 10, color: '#38bdf8', fontWeight: 700, cursor: 'pointer' }}>
                    Open Module ➔
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
