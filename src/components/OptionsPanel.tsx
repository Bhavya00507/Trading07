import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';

interface OptionContract {
  strike: number;
  callBid: number;
  callAsk: number;
  callVol: number;
  callOi: number;
  callIv: number;
  callDelta: number;
  callGamma: number;
  callTheta: number;
  callVega: number;
  callRho: number;
  putBid: number;
  putAsk: number;
  putVol: number;
  putOi: number;
  putIv: number;
  putDelta: number;
  putGamma: number;
  putTheta: number;
  putVega: number;
  putRho: number;
}

export const OptionsPanel: React.FC = () => {
  const selected = useAppStore((s) => s.selectedInstrument);
  const prices = useMarketStore((s) => s.prices);
  const addToast = useAppStore((s) => s.addToast);

  const [expiry, setExpiry] = useState<string>('2026-07-17');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('custom');
  const [strategyLegs, setStrategyLegs] = useState<{ strike: number; type: 'Call' | 'Put'; action: 'Buy' | 'Sell'; qty: number }[]>([]);

  const livePrice = useMemo(() => {
    if (!selected) return 100;
    return prices[selected.symbol]?.price ?? selected.price ?? 100;
  }, [selected, prices]);

  const expiries = ['2026-07-03', '2026-07-10', '2026-07-17', '2026-07-24', '2026-08-21', '2026-09-18'];

  // Expected move calculation, IV rank/percentile
  const stats = useMemo(() => {
    const seed = Math.floor(livePrice * 10) + expiry.split('-').reduce((acc, c) => acc + parseInt(c), 0);
    const pcr = 0.6 + (seed % 90) * 0.01;
    const ivRank = 12 + (seed % 65);
    const ivPercentile = 15 + (seed % 75);
    const maxPain = Math.round(livePrice * 0.99);
    const expectedMove = parseFloat((livePrice * 0.05 * (1 + (seed % 10) * 0.05)).toFixed(2));
    const expectedMovePct = parseFloat(((expectedMove / livePrice) * 100).toFixed(1));
    return { pcr, ivRank, ivPercentile, maxPain, expectedMove, expectedMovePct };
  }, [livePrice, expiry]);

  // Generate option strikes centered on live price
  const optionChain = useMemo((): OptionContract[] => {
    const chain: OptionContract[] = [];
    const step = livePrice > 1000 ? 50 : livePrice > 100 ? 5 : 1;
    const centerStrike = Math.round(livePrice / step) * step;

    for (let i = -5; i <= 5; i++) {
      const strike = centerStrike + i * step;
      if (strike <= 0) continue;

      const diff = strike - livePrice;
      const pctDiff = Math.abs(diff / livePrice);

      // Implied Volatility Smile calculation
      const iv = 22 + (pctDiff * 75) + (strike % 5) * 0.4;

      // Call premium
      const callBase = Math.max(0.05, livePrice * 0.04 * Math.exp(-diff / (livePrice * 0.08)));
      const callBid = parseFloat(callBase.toFixed(2));
      const callAsk = parseFloat((callBase * 1.04).toFixed(2));

      // Put premium
      const putBase = Math.max(0.05, livePrice * 0.04 * Math.exp(diff / (livePrice * 0.08)));
      const putBid = parseFloat(putBase.toFixed(2));
      const putAsk = parseFloat((putBase * 1.04).toFixed(2));

      const callVol = Math.round(1500 * Math.exp(-pctDiff * 9) + (strike % 85));
      const callOi = callVol * 5 + (strike % 300);
      const putVol = Math.round(1350 * Math.exp(-pctDiff * 9) + (strike % 73));
      const putOi = putVol * 5 + (strike % 220);

      // Greeks calculations
      const normDiff = diff / (livePrice * 0.08);
      const callDelta = parseFloat((1 / (1 + Math.exp(normDiff))).toFixed(2));
      const putDelta = parseFloat((callDelta - 1).toFixed(2));

      const callGamma = parseFloat((Math.exp(-Math.pow(normDiff, 2) / 2) / (Math.sqrt(2 * Math.PI) * livePrice * 0.08)).toFixed(4));
      const putGamma = callGamma;

      const callTheta = parseFloat((-(livePrice * callGamma * 0.08 * 0.08) / 2 - 0.01 * callDelta).toFixed(2));
      const putTheta = parseFloat((-(livePrice * putGamma * 0.08 * 0.08) / 2 + 0.01 * (1 - callDelta)).toFixed(2));

      const callVega = parseFloat((livePrice * Math.sqrt(30 / 365) * callGamma * 10).toFixed(2));
      const putVega = callVega;

      const callRho = parseFloat((0.01 * strike * Math.exp(-0.01 * 30 / 365)).toFixed(2));
      const putRho = parseFloat((-0.01 * strike * Math.exp(-0.01 * 30 / 365)).toFixed(2));

      chain.push({
        strike,
        callBid,
        callAsk,
        callVol,
        callOi,
        callIv: parseFloat(iv.toFixed(1)),
        callDelta,
        callGamma,
        callTheta,
        callVega,
        callRho,
        putBid,
        putAsk,
        putVol,
        putOi,
        putIv: parseFloat(iv.toFixed(1)),
        putDelta,
        putGamma,
        putTheta,
        putVega,
        putRho,
      });
    }

    return chain;
  }, [livePrice]);

  // Strategy Presets
  const applyStrategyPreset = (strategy: string) => {
    setSelectedStrategy(strategy);
    const strikes = optionChain.map(o => o.strike);
    if (strikes.length < 5) return;

    const step = strikes[1] - strikes[0];
    const atmStrike = strikes[Math.floor(strikes.length / 2)];

    switch (strategy) {
      case 'bull_call_spread':
        setStrategyLegs([
          { strike: atmStrike, type: 'Call', action: 'Buy', qty: 1 },
          { strike: atmStrike + step, type: 'Call', action: 'Sell', qty: 1 }
        ]);
        break;
      case 'bear_put_spread':
        setStrategyLegs([
          { strike: atmStrike, type: 'Put', action: 'Buy', qty: 1 },
          { strike: atmStrike - step, type: 'Put', action: 'Sell', qty: 1 }
        ]);
        break;
      case 'straddle':
        setStrategyLegs([
          { strike: atmStrike, type: 'Call', action: 'Buy', qty: 1 },
          { strike: atmStrike, type: 'Put', action: 'Buy', qty: 1 }
        ]);
        break;
      case 'iron_condor':
        setStrategyLegs([
          { strike: atmStrike - step * 2, type: 'Put', action: 'Buy', qty: 1 },
          { strike: atmStrike - step, type: 'Put', action: 'Sell', qty: 1 },
          { strike: atmStrike + step, type: 'Call', action: 'Sell', qty: 1 },
          { strike: atmStrike + step * 2, type: 'Call', action: 'Buy', qty: 1 }
        ]);
        break;
      case 'custom':
      default:
        setStrategyLegs([]);
        break;
    }
  };

  // Add a leg to the Strategy Builder
  const addLegToStrategy = (strike: number, type: 'Call' | 'Put', action: 'Buy' | 'Sell') => {
    setStrategyLegs([...strategyLegs, { strike, type, action, qty: 1 }]);
    setSelectedStrategy('custom');
    addToast('success', `Added ${action} ${type} at strike $${strike} to Strategy Builder.`);
  };

  const removeLeg = (index: number) => {
    setStrategyLegs(strategyLegs.filter((_, idx) => idx !== index));
    setSelectedStrategy('custom');
  };

  // Compute Combined Greeks and Net Premium for strategy legs
  const strategySummary = useMemo(() => {
    let netPremium = 0;
    let combinedDelta = 0;
    let combinedGamma = 0;
    let combinedTheta = 0;
    let combinedVega = 0;

    strategyLegs.forEach((leg) => {
      const match = optionChain.find(o => o.strike === leg.strike);
      if (!match) return;

      const sign = leg.action === 'Buy' ? -1 : 1; // Buy costs money (debit/negative premium), Sell receives money (credit/positive)
      const greekSign = leg.action === 'Buy' ? 1 : -1;

      const premium = leg.type === 'Call' ? (match.callBid + match.callAsk) / 2 : (match.putBid + match.putAsk) / 2;
      netPremium += premium * sign * leg.qty;

      if (leg.type === 'Call') {
        combinedDelta += match.callDelta * greekSign * leg.qty;
        combinedGamma += match.callGamma * greekSign * leg.qty;
        combinedTheta += match.callTheta * greekSign * leg.qty;
        combinedVega += match.callVega * greekSign * leg.qty;
      } else {
        combinedDelta += match.putDelta * greekSign * leg.qty;
        combinedGamma += match.putGamma * greekSign * leg.qty;
        combinedTheta += match.putTheta * greekSign * leg.qty;
        combinedVega += match.putVega * greekSign * leg.qty;
      }
    });

    return {
      netPremium: parseFloat(netPremium.toFixed(2)),
      combinedDelta: parseFloat(combinedDelta.toFixed(2)),
      combinedGamma: parseFloat(combinedGamma.toFixed(4)),
      combinedTheta: parseFloat(combinedTheta.toFixed(2)),
      combinedVega: parseFloat(combinedVega.toFixed(2)),
    };
  }, [strategyLegs, optionChain]);

  return (
    <div style={{
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '10px',
      background: '#0d1322',
      fontFamily: 'var(--font-sans)',
      overflowY: 'auto',
      fontSize: '11px',
    }}>
      
      {/* Expiry Selector & Stats Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '8px', flexShrink: 0, flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <strong style={{ fontSize: '15px', color: '#f5f5f7' }}>
              {selected?.symbol ?? 'BTCUSD'} Options Analytics
            </strong>
            <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>
              Live Price: ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            style={{
              background: '#070b14',
              border: '1px solid #1b2235',
              color: '#f5f5f7',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {expiries.map((exp) => (
              <option key={exp} value={exp}>
                {new Date(exp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>

        {/* Expected Move / Greeks stats panel */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ background: '#070b14', padding: '4px 8px', borderRadius: 3, border: '1px solid #1b2235' }}>
            <span style={{ color: '#8e8e93' }}>Expected Move: </span>
            <strong style={{ color: '#d4af37' }}>±${stats.expectedMove} ({stats.expectedMovePct}%)</strong>
          </div>
          <div style={{ background: '#070b14', padding: '4px 8px', borderRadius: 3, border: '1px solid #1b2235' }}>
            <span style={{ color: '#8e8e93' }}>P/C Ratio: </span>
            <strong style={{ color: stats.pcr > 1 ? '#ff4d57' : '#00c076' }}>{stats.pcr.toFixed(2)}</strong>
          </div>
          <div style={{ background: '#070b14', padding: '4px 8px', borderRadius: 3, border: '1px solid #1b2235' }}>
            <span style={{ color: '#8e8e93' }}>Max Pain: </span>
            <strong style={{ color: '#fff' }}>${stats.maxPain}</strong>
          </div>
          <div style={{ background: '#070b14', padding: '4px 8px', borderRadius: 3, border: '1px solid #1b2235' }}>
            <span style={{ color: '#8e8e93' }}>IV Rank / Pct: </span>
            <strong style={{ color: '#fff' }}>{stats.ivRank}% / {stats.ivPercentile}%</strong>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Side Strategy Builder, Right Side Options Chain */}
      <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: '350px', flexWrap: 'wrap' }}>
        
        {/* Strategy Builder Panel (left side / flex 1) */}
        <div style={{ flex: 1, minWidth: '280px', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <strong style={{ color: '#d4af37', textTransform: 'uppercase', fontSize: '10px' }}>Legs Strategy Builder</strong>
            <span style={{ display: 'block', color: '#8e8e93', fontSize: '9px', marginTop: '2px' }}>Combine multiple option legs to analyze net profile</span>
          </div>

          {/* Strategy Presets */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { id: 'custom', name: 'Custom' },
              { id: 'bull_call_spread', name: 'Bull Call Spread' },
              { id: 'bear_put_spread', name: 'Bear Put Spread' },
              { id: 'straddle', name: 'Straddle' },
              { id: 'iron_condor', name: 'Iron Condor' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyStrategyPreset(preset.id)}
                style={{
                  background: selectedStrategy === preset.id ? '#d4af37' : '#0d1322',
                  color: selectedStrategy === preset.id ? '#070b14' : '#8e8e93',
                  border: '1px solid #1b2235',
                  borderRadius: '3px',
                  padding: '3px 8px',
                  fontSize: '9px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* Current Strategy Legs */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid #1b2235', background: '#0d1322', borderRadius: '3px', padding: '6px' }}>
            {strategyLegs.map((leg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#070b14', padding: '4px 8px', borderRadius: '3px', border: '1px solid #1b2235' }}>
                <div>
                  <span style={{ fontWeight: 700, color: leg.action === 'Buy' ? '#00c076' : '#ff4d57', marginRight: '6px' }}>
                    {leg.action.toUpperCase()}
                  </span>
                  <span>{leg.qty}x ${leg.strike} {leg.type}</span>
                </div>
                <button
                  onClick={() => removeLeg(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#ff4d57', fontWeight: 800, cursor: 'pointer', fontSize: '10px' }}
                >
                  ×
                </button>
              </div>
            ))}
            {strategyLegs.length === 0 && (
              <div style={{ margin: 'auto', color: '#8e8e93', fontSize: '9px', textAlign: 'center' }}>
                No active legs. Click Buy/Put or Buy/Call links on the chain to add option legs.
              </div>
            )}
          </div>

          {/* Strategy Summary & Net Greeks */}
          <div style={{ borderTop: '1px solid #1b2235', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
              <span>Net Cost / Premium:</span>
              <span style={{ color: strategySummary.netPremium >= 0 ? '#00c076' : '#ff4d57' }}>
                {strategySummary.netPremium >= 0 ? 'Credit (Receive) ' : 'Debit (Pay) '} 
                ${Math.abs(strategySummary.netPremium).toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px', marginTop: '6px' }}>
              <div style={{ background: '#0d1322', padding: '4px', borderRadius: '3px', textAlign: 'center', border: '1px solid #1b2235' }}>
                <div style={{ color: '#8e8e93', fontSize: '8px' }}>DELTA</div>
                <strong style={{ fontSize: '10px' }}>{strategySummary.combinedDelta}</strong>
              </div>
              <div style={{ background: '#0d1322', padding: '4px', borderRadius: '3px', textAlign: 'center', border: '1px solid #1b2235' }}>
                <div style={{ color: '#8e8e93', fontSize: '8px' }}>GAMMA</div>
                <strong style={{ fontSize: '10px' }}>{strategySummary.combinedGamma}</strong>
              </div>
              <div style={{ background: '#0d1322', padding: '4px', borderRadius: '3px', textAlign: 'center', border: '1px solid #1b2235' }}>
                <div style={{ color: '#8e8e93', fontSize: '8px' }}>THETA</div>
                <strong style={{ fontSize: '10px', color: strategySummary.combinedTheta >= 0 ? '#00c076' : '#ff4d57' }}>{strategySummary.combinedTheta}</strong>
              </div>
              <div style={{ background: '#0d1322', padding: '4px', borderRadius: '3px', textAlign: 'center', border: '1px solid #1b2235' }}>
                <div style={{ color: '#8e8e93', fontSize: '8px' }}>VEGA</div>
                <strong style={{ fontSize: '10px' }}>{strategySummary.combinedVega}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Options Chain Grid (right side / flex 2.5) */}
        <div style={{ flex: 2.5, minWidth: '600px', display: 'flex', flexDirection: 'column', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          {/* Column Group Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 1fr', background: '#070b14', borderBottom: '1px solid #1b2235', textAlign: 'center', fontWeight: 800, padding: '4px 0' }}>
            <span style={{ color: '#00c076' }}>CALLS</span>
            <span style={{ color: '#8e8e93' }}>STRIKE</span>
            <span style={{ color: '#ff4d57' }}>PUTS</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#070b14', borderBottom: '1px solid #1b2235', color: '#8e8e93', fontSize: '9px' }}>
                  <th style={{ padding: '4px' }}>VEGA</th>
                  <th style={{ padding: '4px' }}>THETA</th>
                  <th style={{ padding: '4px' }}>DELTA</th>
                  <th style={{ padding: '4px' }}>IV %</th>
                  <th style={{ padding: '4px' }}>BID</th>
                  <th style={{ padding: '4px' }}>ASK</th>
                  <th style={{ padding: '4px', background: '#070b14' }}>STRIKE</th>
                  <th style={{ padding: '4px' }}>BID</th>
                  <th style={{ padding: '4px' }}>ASK</th>
                  <th style={{ padding: '4px' }}>IV %</th>
                  <th style={{ padding: '4px' }}>DELTA</th>
                  <th style={{ padding: '4px' }}>THETA</th>
                  <th style={{ padding: '4px' }}>VEGA</th>
                </tr>
              </thead>
              <tbody>
                {optionChain.map((opt) => {
                  const isITMCall = livePrice >= opt.strike;
                  const isITMPut = livePrice <= opt.strike;
                  const callBg = isITMCall ? 'rgba(0,192,118,0.06)' : 'transparent';
                  const putBg = isITMPut ? 'rgba(255,77,87,0.06)' : 'transparent';

                  return (
                    <tr key={opt.strike} style={{ borderBottom: '1px solid #1b2235' }}>
                      {/* Call Greeks */}
                      <td style={{ padding: '5px', background: callBg, color: '#8e8e93' }}>{opt.callVega}</td>
                      <td style={{ padding: '5px', background: callBg, color: opt.callTheta >= 0 ? '#00c076' : '#ff4d57' }}>{opt.callTheta}</td>
                      <td style={{ padding: '5px', background: callBg, color: '#8e8e93' }}>{opt.callDelta}</td>
                      <td style={{ padding: '5px', background: callBg, color: '#d4af37' }}>{opt.callIv}%</td>

                      {/* Call Prices (Clickable to Buy Call) */}
                      <td
                        onClick={() => addLegToStrategy(opt.strike, 'Call', 'Buy')}
                        style={{ padding: '5px', background: callBg, color: '#00c076', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        title="Add Buy Call Leg"
                      >
                        {opt.callBid}
                      </td>
                      <td
                        onClick={() => addLegToStrategy(opt.strike, 'Call', 'Sell')}
                        style={{ padding: '5px', background: callBg, color: '#d4af37', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        title="Add Sell Call Leg"
                      >
                        {opt.callAsk}
                      </td>

                      {/* Center Strike */}
                      <td style={{ padding: '5px', background: '#070b14', fontWeight: 800, color: '#f5f5f7' }}>
                        {opt.strike}
                      </td>

                      {/* Put Prices (Clickable to Buy/Sell Put) */}
                      <td
                        onClick={() => addLegToStrategy(opt.strike, 'Put', 'Buy')}
                        style={{ padding: '5px', background: putBg, color: '#00c076', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        title="Add Buy Put Leg"
                      >
                        {opt.putBid}
                      </td>
                      <td
                        onClick={() => addLegToStrategy(opt.strike, 'Put', 'Sell')}
                        style={{ padding: '5px', background: putBg, color: '#d4af37', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        title="Add Sell Put Leg"
                      >
                        {opt.putAsk}
                      </td>

                      {/* Put Greeks */}
                      <td style={{ padding: '5px', background: putBg, color: '#d4af37' }}>{opt.putIv}%</td>
                      <td style={{ padding: '5px', background: putBg, color: '#8e8e93' }}>{opt.putDelta}</td>
                      <td style={{ padding: '5px', background: putBg, color: opt.putTheta >= 0 ? '#00c076' : '#ff4d57' }}>{opt.putTheta}</td>
                      <td style={{ padding: '5px', background: putBg, color: '#8e8e93' }}>{opt.putVega}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Implied Volatility Smile / Skew Plot */}
      <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', flexShrink: 0 }}>
        <strong style={{ color: '#d4af37', textTransform: 'uppercase', fontSize: '10px', display: 'block', marginBottom: '8px' }}>
          Implied Volatility Smile (Skew Analysis)
        </strong>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '60px', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
          {optionChain.map((opt) => {
            const height = Math.min(50, (opt.callIv - 15) * 2.5);
            return (
              <div key={opt.strike} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '100%', height: `${height}px`, background: 'linear-gradient(to top, #1b2235, #d4af37)', borderRadius: '2px' }} />
                <span style={{ fontSize: '8px', color: '#8e8e93' }}>${opt.strike}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default OptionsPanel;
