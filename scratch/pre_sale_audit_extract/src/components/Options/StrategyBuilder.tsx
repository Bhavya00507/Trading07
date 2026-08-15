import React, { useState, useEffect } from 'react';
import { PayoffGraph } from './PayoffGraph';

export interface OptionLeg {
  id: string;
  strike: number;
  type: 'call' | 'put';
  action: 'buy' | 'sell';
  quantity: number;
  premium: number;
}

export const StrategyBuilder: React.FC<{ symbol: string; livePrice: number; mode?: 'dark' | 'light' }> = ({
  symbol,
  livePrice,
  mode = 'dark'
}) => {
  const [legs, setLegs] = useState<OptionLeg[]>([
    { id: 'l1', strike: Math.round(livePrice), type: 'call', action: 'buy', quantity: 1, premium: 12.0 },
    { id: 'l2', strike: Math.round(livePrice * 1.05), type: 'call', action: 'sell', quantity: 1, premium: 5.0 }
  ]);

  const [sliderPrice, setSliderPrice] = useState<number>(livePrice);
  const [payoffData, setPayoffData] = useState<any>(null);

  useEffect(() => {
    if (legs.length === 0) return;
    fetch('/api/options/payoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        underlyingPrice: sliderPrice,
        legs,
        priceRangePct: 0.20,
        steps: 50
      })
    })
      .then(res => res.json())
      .then(data => setPayoffData(data))
      .catch(() => {});
  }, [legs, sliderPrice]);

  const applyPreset = (presetName: string) => {
    const S = Math.round(livePrice);
    if (presetName === 'Bull Call Spread') {
      setLegs([
        { id: 'l1', strike: S, type: 'call', action: 'buy', quantity: 1, premium: 15.0 },
        { id: 'l2', strike: S + 10, type: 'call', action: 'sell', quantity: 1, premium: 6.0 }
      ]);
    } else if (presetName === 'Iron Condor') {
      setLegs([
        { id: 'l1', strike: S - 20, type: 'put', action: 'buy', quantity: 1, premium: 2.0 },
        { id: 'l2', strike: S - 10, type: 'put', action: 'sell', quantity: 1, premium: 5.0 },
        { id: 'l3', strike: S + 10, type: 'call', action: 'sell', quantity: 1, premium: 5.0 },
        { id: 'l4', strike: S + 20, type: 'call', action: 'buy', quantity: 1, premium: 2.0 }
      ]);
    } else if (presetName === 'Straddle') {
      setLegs([
        { id: 'l1', strike: S, type: 'call', action: 'buy', quantity: 1, premium: 12.0 },
        { id: 'l2', strike: S, type: 'put', action: 'buy', quantity: 1, premium: 12.0 }
      ]);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12, fontSize: 10 }}>
      {/* Legs & Preset Controls */}
      <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontWeight: 800, color: '#f59e0b' }}>STRATEGY BUILDER LEGS</div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {['Bull Call Spread', 'Iron Condor', 'Straddle'].map(p => (
            <button key={p} onClick={() => applyPreset(p)} style={{ padding: '3px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700, backgroundColor: '#1e293b', color: '#38bdf8' }}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {legs.map(leg => (
            <div key={leg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 6, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9' }}>
              <span style={{ fontWeight: 800, color: leg.action === 'buy' ? '#10b981' : '#ef4444' }}>{leg.action.toUpperCase()}</span>
              <span>{leg.quantity}x ${leg.strike} {leg.type.toUpperCase()}</span>
              <span>${leg.premium}</span>
            </div>
          ))}
        </div>

        <div>
          <label>Price Slider: ${sliderPrice}</label>
          <input type="range" min={livePrice * 0.7} max={livePrice * 1.3} value={sliderPrice} onChange={e => setSliderPrice(Number(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>

      {/* Payoff Graph View */}
      <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b' }}>
        <PayoffGraph payoffData={payoffData} mode={mode} />
      </div>
    </div>
  );
};
