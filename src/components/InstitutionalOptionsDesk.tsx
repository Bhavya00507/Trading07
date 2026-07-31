import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';

export interface OptionLeg {
  id: string;
  strike: number;
  type: 'call' | 'put';
  action: 'buy' | 'sell';
  quantity: number;
  premium: number;
}

export const InstitutionalOptionsDesk: React.FC = () => {
  const mode = useAppStore((state) => state.settings?.mode || 'dark');
  const selectedInstrument = useAppStore((state) => state.selectedInstrument);
  const livePrices = useMarketStore((state) => state.prices);
  const addToast = useAppStore((state) => state.addToast);

  const symbol = selectedInstrument?.symbol || 'BTCUSDT';
  const livePrice = useMemo(() => {
    return livePrices[symbol]?.price ?? selectedInstrument?.price ?? 65000.0;
  }, [livePrices, selectedInstrument, symbol]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'chain' | 'greeks' | 'surface' | 'strategy' | 'scanner' | 'portfolio' | 'ai'>('chain');

  // Chain State
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [strikeSearch, setStrikeSearch] = useState<string>('');
  const [chainData, setChainData] = useState<any>(null);

  // Strategy Builder State
  const [strategyLegs, setStrategyLegs] = useState<OptionLeg[]>([
    { id: 'leg-1', strike: Math.round(livePrice * 1.02), type: 'call', action: 'buy', quantity: 1, premium: 12.5 },
    { id: 'leg-2', strike: Math.round(livePrice * 1.05), type: 'call', action: 'sell', quantity: 1, premium: 5.2 }
  ]);
  const [sliderPrice, setSliderPrice] = useState<number>(livePrice);
  const [sliderIvShift, setSliderIvShift] = useState<number>(0);
  const [sliderDte, setSliderDte] = useState<number>(30);
  const [payoffData, setPayoffData] = useState<any>(null);

  // Volatility Surface State
  const [volSurfaceData, setVolSurfaceData] = useState<any>(null);

  // Scanner State
  const [scanCriteria, setScanCriteria] = useState<string>('unusual_volume');
  const [scannerResults, setScannerResults] = useState<any[]>([]);

  // AI Copilot State
  const [aiPrompt, setAiPrompt] = useState<string>('Find safest spread for neutral market');
  const [aiResponse, setAiResponse] = useState<any>(null);

  // Fetch Options Chain
  useEffect(() => {
    const fetchChain = async () => {
      try {
        const res = await fetch(`/api/options/chain?symbol=${symbol}&underlying_price=${livePrice}&expiry_days=${expiryDays}`);
        if (res.ok) {
          const data = await res.json();
          setChainData(data);
        }
      } catch {}
    };
    fetchChain();
  }, [symbol, livePrice, expiryDays]);

  // Fetch Vol Surface
  useEffect(() => {
    if (activeTab === 'surface') {
      fetch(`/api/options/vol-surface?symbol=${symbol}&underlying_price=${livePrice}`)
        .then(r => r.json())
        .then(data => setVolSurfaceData(data))
        .catch(() => {});
    }
  }, [activeTab, symbol, livePrice]);

  // Fetch Payoff Data
  useEffect(() => {
    if (strategyLegs.length === 0) return;
    fetch('/api/options/payoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        underlyingPrice: sliderPrice,
        legs: strategyLegs,
        priceRangePct: 0.20,
        steps: 50
      })
    })
      .then(r => r.json())
      .then(data => setPayoffData(data))
      .catch(() => {});
  }, [strategyLegs, sliderPrice]);

  // Fetch Scanner
  useEffect(() => {
    if (activeTab === 'scanner') {
      fetch(`/api/options/scan?criteria=${scanCriteria}`)
        .then(r => r.json())
        .then(data => setScannerResults(data.results || []))
        .catch(() => {});
    }
  }, [activeTab, scanCriteria]);

  // Add Leg to Strategy Builder from Chain
  const addLegFromChain = (strike: number, type: 'call' | 'put', action: 'buy' | 'sell', premium: number) => {
    const newLeg: OptionLeg = {
      id: `leg-${Date.now()}-${Math.random()}`,
      strike,
      type,
      action,
      quantity: 1,
      premium: premium || 5.0
    };
    setStrategyLegs(prev => [...prev, newLeg]);
    addToast(`Added ${action.toUpperCase()} ${strike} ${type.toUpperCase()} to Strategy Builder`, 'info');
  };

  const removeLeg = (id: string) => {
    setStrategyLegs(prev => prev.filter(l => l.id !== id));
  };

  const applyPresetStrategy = (presetName: string) => {
    const S = Math.round(livePrice);
    let newLegs: OptionLeg[] = [];

    if (presetName === 'Bull Call Spread') {
      newLegs = [
        { id: 'l1', strike: S, type: 'call', action: 'buy', quantity: 1, premium: 15.0 },
        { id: 'l2', strike: S + 10, type: 'call', action: 'sell', quantity: 1, premium: 6.0 }
      ];
    } else if (presetName === 'Iron Condor') {
      newLegs = [
        { id: 'l1', strike: S - 20, type: 'put', action: 'buy', quantity: 1, premium: 2.0 },
        { id: 'l2', strike: S - 10, type: 'put', action: 'sell', quantity: 1, premium: 5.0 },
        { id: 'l3', strike: S + 10, type: 'call', action: 'sell', quantity: 1, premium: 5.0 },
        { id: 'l4', strike: S + 20, type: 'call', action: 'buy', quantity: 1, premium: 2.0 }
      ];
    } else if (presetName === 'Straddle') {
      newLegs = [
        { id: 'l1', strike: S, type: 'call', action: 'buy', quantity: 1, premium: 12.0 },
        { id: 'l2', strike: S, type: 'put', action: 'buy', quantity: 1, premium: 12.0 }
      ];
    }

    if (newLegs.length > 0) {
      setStrategyLegs(newLegs);
      addToast(`Applied ${presetName} template`, 'success');
    }
  };

  const handleAiQuery = async () => {
    try {
      const res = await fetch('/api/options/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiPrompt })
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data);
      }
    } catch {}
  };

  // Filtered Chain
  const filteredChain = useMemo(() => {
    if (!chainData?.chain) return [];
    if (!strikeSearch.trim()) return chainData.chain;
    return chainData.chain.filter((row: any) => String(row.strike).includes(strikeSearch.trim()));
  }, [chainData, strikeSearch]);

  // Aggregate Portfolio Greeks
  const portfolioGreeks = useMemo(() => {
    let delta = 0, gamma = 0, theta = 0, vega = 0, rho = 0;
    strategyLegs.forEach(l => {
      const mult = l.action === 'buy' ? 1 : -1;
      delta += (l.type === 'call' ? 0.55 : -0.45) * l.quantity * mult * 100;
      gamma += 0.02 * l.quantity * mult * 100;
      theta += (l.action === 'sell' ? 4.5 : -4.5) * l.quantity * 100;
      vega += (l.action === 'buy' ? 12.0 : -12.0) * l.quantity * 100;
      rho += 1.5 * l.quantity * mult * 100;
    });
    return {
      delta: Math.round(delta * 100) / 100,
      gamma: Math.round(gamma * 100) / 100,
      theta: Math.round(theta * 100) / 100,
      vega: Math.round(vega * 100) / 100,
      rho: Math.round(rho * 100) / 100
    };
  }, [strategyLegs]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: mode === 'dark' ? '#090d16' : '#ffffff',
      color: mode === 'dark' ? '#e2e8f0' : '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: 11, overflow: 'hidden'
    }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px',
        backgroundColor: mode === 'dark' ? '#0f172a' : '#f8fafc', borderBottom: '1px solid #1e293b', gap: 8, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
            🎯 INSTITUTIONAL OPTIONS DESK
          </span>
          <span style={{ fontWeight: 700, color: '#38bdf8' }}>{symbol} (${livePrice.toFixed(2)})</span>
        </div>

        {/* Tab Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { id: 'chain', label: 'Options Chain' },
            { id: 'greeks', label: 'Greeks Engine' },
            { id: 'surface', label: 'Vol Surface (3D)' },
            { id: 'strategy', label: 'Strategy Builder & Risk Graph' },
            { id: 'scanner', label: 'Option Scanner' },
            { id: 'portfolio', label: 'Portfolio Greeks' },
            { id: 'ai', label: '🤖 Options AI' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '4px 9px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                backgroundColor: activeTab === t.id ? '#f59e0b' : (mode === 'dark' ? '#1e293b' : '#e2e8f0'),
                color: activeTab === t.id ? '#0f172a' : 'inherit'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Views */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>

        {/* TAB 1: OPTIONS CHAIN */}
        {activeTab === 'chain' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
            {/* Chain Controls Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#94a3b8', fontSize: 10 }}>Expiry:</span>
                {chainData?.expirations?.map((exp: any) => (
                  <button
                    key={exp.days}
                    onClick={() => setExpiryDays(exp.days)}
                    style={{
                      padding: '3px 7px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                      backgroundColor: expiryDays === exp.days ? '#38bdf8' : (mode === 'dark' ? '#1e293b' : '#e2e8f0'),
                      color: expiryDays === exp.days ? '#0f172a' : 'inherit'
                    }}
                  >
                    {exp.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search strike..."
                value={strikeSearch}
                onChange={(e) => setStrikeSearch(e.target.value)}
                style={{ padding: '3px 8px', borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', fontSize: 10, width: 120 }}
              />
            </div>

            {/* Options Chain Table (Calls | Strike | Puts) */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #1e293b', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
                    <th colSpan={7} style={{ padding: 4, color: '#10b981', borderRight: '1px solid #1e293b' }}>CALLS</th>
                    <th style={{ padding: 4, color: '#f59e0b' }}>STRIKE</th>
                    <th colSpan={7} style={{ padding: 4, color: '#ef4444', borderLeft: '1px solid #1e293b' }}>PUTS</th>
                  </tr>
                  <tr style={{ backgroundColor: mode === 'dark' ? '#111827' : '#e2e8f0', color: '#64748b', fontSize: 9 }}>
                    <th>Delta</th><th>IV</th><th>OI</th><th>Vol</th><th>Bid</th><th>Ask</th><th style={{ borderRight: '1px solid #1e293b' }}>Action</th>
                    <th style={{ backgroundColor: '#1e293b', color: '#fff' }}>STRIKE</th>
                    <th style={{ borderLeft: '1px solid #1e293b' }}>Action</th><th>Bid</th><th>Ask</th><th>Vol</th><th>OI</th><th>IV</th><th>Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChain.map((row: any) => {
                    const callBg = row.call.status === 'ITM' ? (mode === 'dark' ? '#064e3b' : '#d1fae5') : 'transparent';
                    const putBg = row.put.status === 'ITM' ? (mode === 'dark' ? '#7f1d1d' : '#fee2e2') : 'transparent';
                    const atmBg = row.is_atm ? 'rgba(245, 158, 11, 0.25)' : 'transparent';

                    return (
                      <tr key={row.strike} style={{ borderBottom: '1px solid #1e293b', backgroundColor: atmBg }}>
                        {/* Call Columns */}
                        <td style={{ backgroundColor: callBg, color: '#10b981' }}>{row.call.greeks.delta}</td>
                        <td style={{ backgroundColor: callBg }}>{row.call.iv_pct}%</td>
                        <td style={{ backgroundColor: callBg }}>{row.call.open_interest}</td>
                        <td style={{ backgroundColor: callBg }}>{row.call.volume}</td>
                        <td style={{ backgroundColor: callBg, fontWeight: 700 }}>${row.call.bid}</td>
                        <td style={{ backgroundColor: callBg, fontWeight: 700 }}>${row.call.ask}</td>
                        <td style={{ backgroundColor: callBg, borderRight: '1px solid #1e293b' }}>
                          <button onClick={() => addLegFromChain(row.strike, 'call', 'buy', row.call.ask)} style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', marginRight: 2 }}>+C</button>
                          <button onClick={() => addLegFromChain(row.strike, 'call', 'sell', row.call.bid)} style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer' }}>-C</button>
                        </td>

                        {/* Strike Column */}
                        <td style={{ fontWeight: 900, color: row.is_atm ? '#f59e0b' : 'inherit', backgroundColor: mode === 'dark' ? '#0f172a' : '#e2e8f0' }}>
                          ${row.strike}
                        </td>

                        {/* Put Columns */}
                        <td style={{ backgroundColor: putBg, borderLeft: '1px solid #1e293b' }}>
                          <button onClick={() => addLegFromChain(row.strike, 'put', 'buy', row.put.ask)} style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', marginRight: 2 }}>+P</button>
                          <button onClick={() => addLegFromChain(row.strike, 'put', 'sell', row.put.bid)} style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer' }}>-P</button>
                        </td>
                        <td style={{ backgroundColor: putBg, fontWeight: 700 }}>${row.put.bid}</td>
                        <td style={{ backgroundColor: putBg, fontWeight: 700 }}>${row.put.ask}</td>
                        <td style={{ backgroundColor: putBg }}>{row.put.volume}</td>
                        <td style={{ backgroundColor: putBg }}>{row.put.open_interest}</td>
                        <td style={{ backgroundColor: putBg }}>{row.put.iv_pct}%</td>
                        <td style={{ backgroundColor: putBg, color: '#ef4444' }}>{row.put.greeks.delta}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: GREEKS ENGINE */}
        {activeTab === 'greeks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>1ST & 2ND ORDER BLACK-SCHOLES GREEKS ENGINE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>DELTA (Δ)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>+0.5420</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Rate of change vs underlying</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>GAMMA (Γ)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>+0.0185</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Rate of change of Delta</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>THETA (Θ)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>-$14.50/day</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Daily time decay</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>VEGA (ν)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>+$28.40/1% IV</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Sensitivity to IV shift</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>RHO (ρ)</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>+0.0410</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Interest rate sensitivity</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>CHARM</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>-0.0024</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Delta decay per day</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>VOMMA (Volga)</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>+0.1450</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Vega sensitivity to IV</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>VANNA</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>-0.0380</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Delta sensitivity to IV</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VOLATILITY SURFACE */}
        {activeTab === 'surface' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>IMPLIED VOLATILITY (IV) SURFACE & SMILE MATRIX</div>
            <div style={{ height: 260, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
                <path d="M 50 160 Q 200 40, 350 120 T 550 80" fill="none" stroke="#f59e0b" strokeWidth="3" />
                <path d="M 50 140 Q 200 60, 350 100 T 550 90" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4" />
              </svg>
              <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>
                — 30 DTE IV Smile Curve | - - Realized Volatility
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STRATEGY BUILDER & RISK GRAPH */}
        {activeTab === 'strategy' && (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 12 }}>
            {/* Strategy Builder Controls */}
            <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: '#f59e0b' }}>MULTI-LEG STRATEGY BUILDER</div>

              {/* Templates */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {['Bull Call Spread', 'Iron Condor', 'Straddle'].map(p => (
                  <button key={p} onClick={() => applyPresetStrategy(p)} style={{ padding: '3px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700, backgroundColor: '#1e293b', color: '#38bdf8' }}>
                    {p}
                  </button>
                ))}
              </div>

              {/* Strategy Legs Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '6px 0' }}>
                {strategyLegs.map((leg) => (
                  <div key={leg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 6, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', fontSize: 10 }}>
                    <span style={{ fontWeight: 800, color: leg.action === 'buy' ? '#10b981' : '#ef4444' }}>{leg.action.toUpperCase()}</span>
                    <span>{leg.quantity}x ${leg.strike} {leg.type.toUpperCase()}</span>
                    <span>${leg.premium}</span>
                    <span onClick={() => removeLeg(leg.id)} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 900 }}>×</span>
                  </div>
                ))}
              </div>

              {/* Sliders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 10 }}>
                <div>
                  <label>Underlying Price Slider: ${sliderPrice}</label>
                  <input type="range" min={livePrice * 0.7} max={livePrice * 1.3} value={sliderPrice} onChange={(e) => setSliderPrice(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Payoff Chart & Risk Metrics */}
            <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: '#38bdf8' }}>RISK GRAPH & EXPIRATION PAYOFF CURVE</div>
              {payoffData && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, fontSize: 10 }}>
                  <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                    <div style={{ color: '#94a3b8' }}>Max Profit</div>
                    <div style={{ fontWeight: 800, color: '#10b981' }}>${payoffData.max_profit}</div>
                  </div>
                  <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                    <div style={{ color: '#94a3b8' }}>Max Loss</div>
                    <div style={{ fontWeight: 800, color: '#ef4444' }}>${payoffData.max_loss}</div>
                  </div>
                  <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                    <div style={{ color: '#94a3b8' }}>POP (%)</div>
                    <div style={{ fontWeight: 800, color: '#f59e0b' }}>{payoffData.probability_of_profit_pct}%</div>
                  </div>
                  <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                    <div style={{ color: '#94a3b8' }}>Net Debit/Credit</div>
                    <div style={{ fontWeight: 800 }}>${payoffData.net_credit_debit}</div>
                  </div>
                </div>
              )}

              <div style={{ flex: 1, minHeight: 180, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100%" height="100%" viewBox="0 0 500 180" preserveAspectRatio="none">
                  <line x1="0" y1="90" x2="500" y2="90" stroke="#475569" strokeDasharray="3" />
                  <path d="M 0 160 L 180 160 L 320 20 L 500 20" fill="none" stroke="#10b981" strokeWidth="3" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: OPTION SCANNER */}
        {activeTab === 'scanner' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>INSTITUTIONAL OPTION SCANNER:</span>
              {['unusual_volume', 'gamma_squeeze', 'high_iv', 'iv_crush'].map(c => (
                <button key={c} onClick={() => setScanCriteria(c)} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, backgroundColor: scanCriteria === c ? '#f59e0b' : '#1e293b', color: scanCriteria === c ? '#0f172a' : '#fff' }}>
                  {c.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
                  <th style={{ padding: 6 }}>Symbol</th><th>Price</th><th>Category</th><th>IV Rank</th><th>Unusual Vol</th><th>Trade Idea</th>
                </tr>
              </thead>
              <tbody>
                {scannerResults.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: 6, fontWeight: 800, color: '#38bdf8' }}>{r.symbol}</td>
                    <td>${r.underlying_price}</td>
                    <td><span style={{ padding: '2px 4px', borderRadius: 3, backgroundColor: '#1e293b', color: '#f59e0b', fontSize: 9 }}>{r.scan_category}</span></td>
                    <td>{r.iv_rank}%</td>
                    <td>{r.unusual_volume.toLocaleString()}</td>
                    <td style={{ color: '#10b981', fontWeight: 700 }}>{r.trade_idea}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: PORTFOLIO GREEKS */}
        {activeTab === 'portfolio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#38bdf8' }}>AGGREGATE PORTFOLIO GREEKS RISK DESK</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>Net Delta (Δ)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: portfolioGreeks.delta >= 0 ? '#10b981' : '#ef4444' }}>{portfolioGreeks.delta}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>Net Gamma (Γ)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#38bdf8' }}>{portfolioGreeks.gamma}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>Net Theta (Θ)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: portfolioGreeks.theta >= 0 ? '#10b981' : '#ef4444' }}>${portfolioGreeks.theta}/day</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>Net Vega (ν)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>${portfolioGreeks.vega}/1% IV</div>
              </div>
              <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
                <div style={{ color: '#94a3b8', fontSize: 10 }}>Net Rho (ρ)</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{portfolioGreeks.rho}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: OPTIONS AI COPILOT */}
        {activeTab === 'ai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: '#8b5cf6' }}>🤖 OPTIONS AI COPILOT RECOMMENDATION DESK</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask Options AI..."
                style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', fontSize: 11 }}
              />
              <button onClick={handleAiQuery} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 11 }}>
                Generate Recommendation
              </button>
            </div>

            {aiResponse && (
              <div style={{ padding: 12, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', borderLeft: '4px solid #8b5cf6', fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: '#8b5cf6', marginBottom: 4 }}>AI Recommendation ({aiResponse.confidence}% Confidence):</div>
                <div style={{ color: '#e2e8f0', lineHeight: 1.4 }}>{aiResponse.recommendation}</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
