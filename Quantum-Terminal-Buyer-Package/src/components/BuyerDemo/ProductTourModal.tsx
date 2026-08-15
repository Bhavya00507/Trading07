// src/components/BuyerDemo/ProductTourModal.tsx
import React, { useState } from 'react';
import './BuyerDemo.css';

interface ProductTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: () => void;
}

interface TourStep {
  step: number;
  badge: string;
  title: string;
  content: string;
  moduleKey?: string;
}

export const ProductTourModal: React.FC<ProductTourModalProps> = ({
  isOpen,
  onClose,
  onFinish,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps: TourStep[] = [
    {
      step: 1,
      badge: 'Step 1 of 8 — Platform Overview',
      title: 'Quantum Terminal Workstation',
      content:
        'Welcome to Quantum Terminal! This institutional trading platform features modular workspace layouts, custom CSS tokens, multi-chart cell synchronization, and a real-time paper trading engine.',
    },
    {
      step: 2,
      badge: 'Step 2 of 8 — High-Frequency Charting',
      title: 'TradingView Canvas Charting',
      content:
        'Powered by Lightweight Charts v4. Render high-frequency candlesticks, custom line drawings, 14+ technical indicators (EMA, VWAP, RSI, MACD, BB), and drag-and-drop order line adjustments directly on canvas.',
    },
    {
      step: 3,
      badge: 'Step 3 of 8 — Order Matching Engine',
      title: 'Algorithmic Paper Execution',
      content:
        'Submit Market, Limit, Stop, and Stop-Limit orders. The paper trading engine calculates position margins, leverage, unrealized/realized PnL, and automatic Stop-Loss/Take-Profit triggers on every tick.',
    },
    {
      step: 4,
      badge: 'Step 4 of 8 — Options Desk Analytics',
      title: 'Options Desk & Volatility Surface',
      content:
        'Analyze options chains, Black-Scholes Greeks (Delta, Gamma, Theta, Vega), implied volatility skew, and multi-leg option strategy payoff diagrams.',
    },
    {
      step: 5,
      badge: 'Step 5 of 8 — Market Data Streaming',
      title: 'Market Data Gateway',
      content:
        'Centralized REST and WebSocket market gateway streaming live pricing ticks or synthetic fallback streams across Crypto, FX, and Equities.',
    },
    {
      step: 6,
      badge: 'Step 6 of 8 — Backtesting & Simulation',
      title: 'Market Replay Studio',
      content:
        'Replay historical market tick data step-by-step to evaluate algorithmic strategy performance and test discretionary execution skills.',
    },
    {
      step: 7,
      badge: 'Step 7 of 8 — Custom Quantitative Scripts',
      title: 'Script Studio Strategy Engine',
      content:
        'Write custom indicator formulas and quantitative algorithms using Pine-style syntax. Test rules against historical candle data.',
    },
    {
      step: 8,
      badge: 'Step 8 of 8 — Mobile Infrastructure',
      title: 'Quantum Mobile Pro',
      content:
        'Experience Quantum Mobile Pro — a touch-optimized mobile interface featuring canvas panning, vertical price scaling, economic event overlays, slide-up order sheets, and drawer navigation.',
    },
  ];

  const stepObj = tourSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('quantum_tour_completed', 'true');
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="buyer-demo-modal-overlay">
      <div className="tour-step-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tour-step-badge">{stepObj.badge}</span>
          <button
            onClick={() => {
              localStorage.setItem('quantum_tour_completed', 'true');
              onClose();
            }}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <h3 className="tour-step-title">{stepObj.title}</h3>
        <p className="tour-step-content">{stepObj.content}</p>

        <div className="tour-controls-row">
          <button
            onClick={() => {
              localStorage.setItem('quantum_tour_completed', 'true');
              onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Skip Tour
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 4,
                  color: '#ffffff',
                  padding: '6px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ◀ Previous
              </button>
            )}
            <button
              onClick={handleNext}
              style={{
                background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
                border: 'none',
                borderRadius: 4,
                color: '#ffffff',
                padding: '6px 16px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {currentStep === tourSteps.length - 1 ? 'Finish Tour ✓' : 'Next ➔'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
