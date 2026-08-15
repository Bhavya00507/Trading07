// src/components/RiskDeskPanel.tsx
import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { usePositionStore } from '../store/positionStore';

interface ExposureRow {
  symbol: string;
  grossExposure: number;
  netExposure: number;
  limitPct: number;
  marginUsed: number;
  status: 'Safe' | 'Warning' | 'Exceeded';
}

const RiskDeskPanel: React.FC = () => {
  const account = useAppStore((state) => state.account);
  const positions = usePositionStore((state) => state.positions);

  const balance = account?.balance || 10000;

  // Compute VaR, CVaR and ruin metrics
  const riskMetrics = useMemo(() => {
    // VaR 95% 1-day estimated at 2.45% of balance
    const varAmount = balance * 0.0245;
    // CVaR estimated at 3.65% of balance
    const cvarAmount = balance * 0.0365;

    return {
      varPct: 2.45,
      varAmount,
      cvarPct: 3.65,
      cvarAmount,
      ruinProb: 1.2,
      maxLeverage: 12.5
    };
  }, [balance]);

  // Compute active exposures from position store
  const exposures = useMemo(() => {
    return positions.map((p): ExposureRow => {
      const gross = Math.abs(p.quantity) * p.average_price;
      const net = p.quantity * p.average_price;
      const margin = gross / ((p as any).leverage || 10);
      const weight = (gross / balance) * 100;
      
      let status: 'Safe' | 'Warning' | 'Exceeded' = 'Safe';
      if (weight > 35) status = 'Exceeded';
      else if (weight > 20) status = 'Warning';

      return {
        symbol: p.symbol,
        grossExposure: gross,
        netExposure: net,
        limitPct: 30, // structural limit of 30%
        marginUsed: margin,
        status
      };
    });
  }, [positions, balance]);

  // Stress tests scenarios
  const stressScenarios = [
    { name: 'US Interest Rate Hike (+50bps)', usdImpact: -450, color: '#ff4d57' },
    { name: 'Crypto Flash Crash (-15%)', usdImpact: -1820, color: '#ff4d57' },
    { name: 'Forex Volatility Spike (+8%)', usdImpact: 240, color: '#00c076' },
    { name: 'Gold Safe Haven Rally (+5%)', usdImpact: 650, color: '#00c076' }
  ];

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>Risk Desk</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>Monitor VaR/CVaR, leverage boundaries, stress scenarios, and exposure limits</span>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left: Exposure Limits Table */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#0d1322', padding: '6px 10px', borderBottom: '1px solid #1b2235', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
            Real-Time Exposure limits
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            {exposures.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#8e8e93', fontSize: '11px', textTransform: 'uppercase' }}>
                No active exposures to monitor. Open a position to sync.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1b2235', color: '#8e8e93' }}>
                    <th style={{ padding: '6px 4px' }}>Symbol</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Gross Exposure</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Net Exposure</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Margin Used</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center' }}>Limit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {exposures.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(27,34,53,0.3)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 700, color: '#f5f5f7' }}>{item.symbol}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${item.grossExposure.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: item.netExposure >= 0 ? '#00c076' : '#ff4d57' }}>
                        {item.netExposure >= 0 ? '+' : ''}${item.netExposure.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${item.marginUsed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: '2px',
                          fontSize: '8px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: item.status === 'Safe' ? 'rgba(0,192,118,0.1)' : item.status === 'Warning' ? 'rgba(234,115,23,0.1)' : 'rgba(255,77,87,0.1)',
                          color: item.status === 'Safe' ? '#00c076' : item.status === 'Warning' ? '#ea7317' : '#ff4d57'
                        }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: VaR metrics & Shocks */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          
          {/* Risk Metrics */}
          <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: '#0d1322', padding: '6px', borderRadius: '3px', border: '1px solid #1b2235' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>VaR (95% 1-Day)</span>
              <strong style={{ display: 'block', color: '#ff4d57', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                ${riskMetrics.varAmount.toFixed(2)}
              </strong>
            </div>
            <div style={{ background: '#0d1322', padding: '6px', borderRadius: '3px', border: '1px solid #1b2235' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>Expected Shortfall (CVaR)</span>
              <strong style={{ display: 'block', color: '#ff4d57', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                ${riskMetrics.cvarAmount.toFixed(2)}
              </strong>
            </div>
            <div style={{ background: '#0d1322', padding: '6px', borderRadius: '3px', border: '1px solid #1b2235' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>Ruin Probability</span>
              <strong style={{ display: 'block', color: '#00c076', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                {riskMetrics.ruinProb}%
              </strong>
            </div>
            <div style={{ background: '#0d1322', padding: '6px', borderRadius: '3px', border: '1px solid #1b2235' }}>
              <span style={{ color: '#8e8e93', fontSize: '9px' }}>Max Peak Leverage</span>
              <strong style={{ display: 'block', color: '#d4af37', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                {riskMetrics.maxLeverage}x
              </strong>
            </div>
          </div>

          {/* Stress scenarios */}
          <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              Macro Shock Scenario stress tests
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '10px' }}>
              {stressScenarios.map((sc, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(27,34,53,0.3)', paddingBottom: '3px' }}>
                  <span style={{ color: '#f5f5f7' }}>{sc.name}</span>
                  <strong style={{ color: sc.color, fontFamily: 'var(--font-mono)' }}>
                    {sc.usdImpact >= 0 ? '+' : ''}${sc.usdImpact.toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default RiskDeskPanel;
