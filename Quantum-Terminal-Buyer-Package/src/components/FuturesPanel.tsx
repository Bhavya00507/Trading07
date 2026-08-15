import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface FuturesContract {
  symbol: string;
  name: string;
  expiry: string;
  daysToRoll: number;
  openInterest: number;
  volume: number;
  settlePrice: number;
  basis: number; // Spot - Futures
  basisPct: number;
  termStructure: { month: string; price: number }[];
  structureType: 'Contango' | 'Backwardation';
  fundingRate?: number; // Perpetuals
}

export const FuturesPanel: React.FC = () => {
  const selected = useAppStore((s) => s.selectedInstrument);

  const [activeFuturesGroup, setActiveFuturesGroup] = useState<'Equity' | 'Energy' | 'Metals' | 'Crypto'>('Equity');

  // Expiration Calendar mock data
  const futuresContracts = useMemo((): Record<'Equity' | 'Energy' | 'Metals' | 'Crypto', FuturesContract[]> => {
    return {
      Equity: [
        {
          symbol: 'ESH26', name: 'S&P 500 E-mini Mar 2026', expiry: '2026-03-20', daysToRoll: -98, openInterest: 245000, volume: 15400, settlePrice: 5120.50, basis: 3.25, basisPct: 0.06,
          termStructure: [{ month: 'Mar 26', price: 5120.5 }, { month: 'Jun 26', price: 5142.0 }, { month: 'Sep 26', price: 5165.5 }, { month: 'Dec 26', price: 5190.0 }],
          structureType: 'Contango'
        },
        {
          symbol: 'ESM26', name: 'S&P 500 E-mini Jun 2026', expiry: '2026-06-19', daysToRoll: -7, openInterest: 1850000, volume: 1450000, settlePrice: 5142.00, basis: -18.25, basisPct: -0.35,
          termStructure: [{ month: 'Mar 26', price: 5120.5 }, { month: 'Jun 26', price: 5142.0 }, { month: 'Sep 26', price: 5165.5 }, { month: 'Dec 26', price: 5190.0 }],
          structureType: 'Contango'
        },
        {
          symbol: 'ESU26', name: 'S&P 500 E-mini Sep 2026', expiry: '2026-09-18', daysToRoll: 84, openInterest: 320000, volume: 18000, settlePrice: 5165.50, basis: -41.75, basisPct: -0.81,
          termStructure: [{ month: 'Mar 26', price: 5120.5 }, { month: 'Jun 26', price: 5142.0 }, { month: 'Sep 26', price: 5165.5 }, { month: 'Dec 26', price: 5190.0 }],
          structureType: 'Contango'
        },
      ],
      Energy: [
        {
          symbol: 'CLN26', name: 'WTI Crude Oil Jul 2026', expiry: '2026-06-22', daysToRoll: -4, openInterest: 420000, volume: 220000, settlePrice: 78.50, basis: 0.15, basisPct: 0.19,
          termStructure: [{ month: 'Jul 26', price: 78.5 }, { month: 'Aug 26', price: 78.1 }, { month: 'Sep 26', price: 77.6 }, { month: 'Oct 26', price: 77.2 }],
          structureType: 'Backwardation'
        },
        {
          symbol: 'CLQ26', name: 'WTI Crude Oil Aug 2026', expiry: '2026-07-21', daysToRoll: 25, openInterest: 295000, volume: 34000, settlePrice: 78.10, basis: 0.55, basisPct: 0.70,
          termStructure: [{ month: 'Jul 26', price: 78.5 }, { month: 'Aug 26', price: 78.1 }, { month: 'Sep 26', price: 77.6 }, { month: 'Oct 26', price: 77.2 }],
          structureType: 'Backwardation'
        },
      ],
      Metals: [
        {
          symbol: 'GCM26', name: 'Gold Futures Jun 2026', expiry: '2026-06-26', daysToRoll: 0, openInterest: 640000, volume: 380000, settlePrice: 2350.50, basis: -1.50, basisPct: -0.06,
          termStructure: [{ month: 'Jun 26', price: 2350.5 }, { month: 'Aug 26', price: 2364.0 }, { month: 'Oct 26', price: 2378.2 }, { month: 'Dec 26', price: 2395.0 }],
          structureType: 'Contango'
        },
        {
          symbol: 'GCQ26', name: 'Gold Futures Aug 2026', expiry: '2026-08-27', daysToRoll: 62, openInterest: 210000, volume: 12000, settlePrice: 2364.00, basis: -15.00, basisPct: -0.63,
          termStructure: [{ month: 'Jun 26', price: 2350.5 }, { month: 'Aug 26', price: 2364.0 }, { month: 'Oct 26', price: 2378.2 }, { month: 'Dec 26', price: 2395.0 }],
          structureType: 'Contango'
        },
      ],
      Crypto: [
        {
          symbol: 'BTC-PERP', name: 'Bitcoin Perpetual Swap', expiry: 'None (Perpetual)', daysToRoll: 999, openInterest: 8400000, volume: 15400000, settlePrice: 67240.00, basis: -45.00, basisPct: -0.07,
          termStructure: [{ month: 'Spot', price: 67195 }, { month: 'Perp', price: 67240 }, { month: 'Jun 26', price: 67550 }, { month: 'Sep 26', price: 68100 }],
          structureType: 'Contango', fundingRate: 0.0001 // 0.01% every 8 hours
        },
        {
          symbol: 'BTC0626', name: 'Bitcoin Futures Jun 2026', expiry: '2026-06-26', daysToRoll: 0, openInterest: 940000, volume: 1450000, settlePrice: 67550.00, basis: -355.00, basisPct: -0.53,
          termStructure: [{ month: 'Spot', price: 67195 }, { month: 'Perp', price: 67240 }, { month: 'Jun 26', price: 67550 }, { month: 'Sep 26', price: 68100 }],
          structureType: 'Contango'
        },
      ],
    };
  }, []);

  const activeContracts = futuresContracts[activeFuturesGroup];
  const activeStructure = activeContracts[0]?.termStructure || [];
  const structureType = activeContracts[0]?.structureType || 'Contango';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0d1322',
      color: '#fff',
      padding: '12px',
      gap: '10px',
      overflowY: 'auto',
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
    }}>
      {/* Expiry Calendar & Continuous contracts banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px' }}>
        <div>
          <strong style={{ fontSize: '13px', color: '#f5f5f7' }}>Futures Expiration & Roll Analytics</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>
            Analyze continuous contracts, term structure curve, roll yield, and spot/futures basis difference
          </span>
        </div>

        {/* Group Selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['Equity', 'Energy', 'Metals', 'Crypto'] as const).map((grp) => (
            <button
              key={grp}
              onClick={() => setActiveFuturesGroup(grp)}
              style={{
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 600,
                borderRadius: '3px',
                border: '1px solid #1b2235',
                background: activeFuturesGroup === grp ? '#d4af37' : '#070b14',
                color: activeFuturesGroup === grp ? '#070b14' : '#8e8e93',
                cursor: 'pointer',
              }}
            >
              {grp}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Expiration Table and Term Structure Curve */}
      <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: '260px', flexWrap: 'wrap' }}>
        {/* Expiration and Basis Table */}
        <div style={{ flex: 1.8, minWidth: '450px', display: 'flex', flexDirection: 'column', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#070b14', padding: '6px', fontWeight: 800, color: '#f5f5f7', borderBottom: '1px solid #1b2235' }}>
            Active Contracts Expiration Calendar
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#070b14', borderBottom: '1px solid #1b2235', color: '#8e8e93', fontSize: '9px' }}>
                  <th style={{ padding: '6px 8px' }}>CONTRACT</th>
                  <th style={{ padding: '6px 8px' }}>EXPIRY</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>DAYS TO ROLL</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>SETTLE PRICE</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>BASIS (S-F)</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>BASIS %</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>OPEN INTEREST</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>FUNDING/RATE</th>
                </tr>
              </thead>
              <tbody>
                {activeContracts.map((contract) => (
                  <tr key={contract.symbol} style={{ borderBottom: '1px solid #1b2235', background: '#0d1322' }}>
                    <td style={{ padding: '8px 8px', fontWeight: 700 }}>{contract.symbol}</td>
                    <td style={{ padding: '8px 8px', color: '#8e8e93' }}>{contract.expiry}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: contract.daysToRoll < 0 ? '#ff4d57' : contract.daysToRoll < 10 ? '#ffb74d' : '#00c076' }}>
                      {contract.daysToRoll === 999 ? 'N/A' : contract.daysToRoll}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>${contract.settlePrice.toLocaleString()}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: contract.basis >= 0 ? '#00c076' : '#ff4d57' }}>
                      {contract.basis > 0 ? '+' : ''}{contract.basis.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: contract.basisPct >= 0 ? '#00c076' : '#ff4d57' }}>
                      {contract.basisPct > 0 ? '+' : ''}{contract.basisPct}%
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right' }}>{contract.openInterest.toLocaleString()}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', color: '#d4af37' }}>
                      {contract.fundingRate ? `${(contract.fundingRate * 100).toFixed(4)}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Term Structure / Curve Chart (flex 1) */}
        <div style={{ flex: 1, minWidth: '280px', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <strong style={{ color: '#d4af37', textTransform: 'uppercase', fontSize: '10px' }}>Term Structure Curve</strong>
            <span style={{ display: 'block', color: '#8e8e93', fontSize: '9px', marginTop: '2px' }}>
              Current market state: <strong style={{ color: structureType === 'Contango' ? '#d4af37' : '#ffb74d' }}>{structureType.toUpperCase()}</strong>
            </span>
          </div>

          {/* Simple Visual curve representation */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '140px', borderBottom: '1px solid #1b2235', paddingBottom: '6px', gap: '16px' }}>
            {activeStructure.map((pt, idx) => {
              // Normalize height based on contract settlePrice min/max range
              const prices = activeStructure.map(p => p.price);
              const maxPrice = Math.max(...prices);
              const minPrice = Math.min(...prices);
              const range = maxPrice - minPrice || 1;
              const height = 40 + ((pt.price - minPrice) / range) * 80;

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '8px', color: '#8e8e93' }}>${pt.price}</span>
                  <div style={{
                    width: '100%',
                    height: `${height}px`,
                    background: structureType === 'Contango' ? 'linear-gradient(to top, #1b2235, #d4af37)' : 'linear-gradient(to top, #1b2235, #ffb74d)',
                    borderRadius: '2px 2px 0 0',
                    boxShadow: '0 0 8px rgba(212,175,55,0.1)'
                  }} />
                  <strong style={{ fontSize: '9px', color: '#f5f5f7' }}>{pt.month}</strong>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '9px', color: '#8e8e93', lineHeight: '1.4' }}>
            {structureType === 'Contango' ? (
              <span>ℹ <strong>Contango</strong> detected. Far-month contracts trade at a premium over near-month contracts. Roll yield is negative for long holders.</span>
            ) : (
              <span>ℹ <strong>Backwardation</strong> detected. Near-month contracts trade at a premium over far-month contracts. Roll yield is positive for long holders.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FuturesPanel;
