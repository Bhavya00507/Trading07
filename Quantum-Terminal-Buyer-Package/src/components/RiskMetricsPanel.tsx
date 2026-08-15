import React, { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { usePositionStore } from '../store/positionStore';
import { useMarketStore } from '../store/marketStore';

const containerStyle: React.CSSProperties = {
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '12px',
  overflowY: 'auto',
  backgroundColor: '#070b14',
  color: '#e0e0e0',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
};

const cardStyle = (color: string): React.CSSProperties => ({
  backgroundColor: '#0d1322',
  border: `1px solid ${color === 'red' ? '#ff4d57' : color === 'yellow' ? '#dfa010' : '#1b2235'}`,
  borderRadius: '6px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
});

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#8e8e93',
  letterSpacing: '0.06em',
};

const valueStyle = (color: string): React.CSSProperties => ({
  fontSize: '18px',
  fontWeight: 700,
  fontFamily: 'var(--font-mono)',
  color: color === 'red' ? '#ff4d57' : color === 'green' ? '#00c076' : color === 'yellow' ? '#dfa010' : '#ffffff',
});

const warningBannerStyle = (color: string): React.CSSProperties => ({
  padding: '10px 14px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: color === 'red' ? 'rgba(255,77,87,0.12)' : 'rgba(223,160,16,0.12)',
  border: `1px solid ${color === 'red' ? '#ff4d57' : '#dfa010'}`,
  color: color === 'red' ? '#ff4d57' : '#dfa010',
});

const RiskMetricsPanel: React.FC = () => {
  const account = useAppStore((s) => s.account);
  const positions = usePositionStore((s) => s.positions);
  const prices = useMarketStore((s) => s.prices);
  const history = useAppStore((s) => s.history);

  const activePositions = useMemo(() => positions.filter((p) => p.quantity !== 0), [positions]);

  // Real-time calculations
  const computed = useMemo(() => {
    let floatingPnl = 0;
    let usedMargin = 0;
    let openRisk = 0;

    activePositions.forEach((p) => {
      const livePrice = prices[p.symbol]?.price ?? p.average_price;
      const pnl = p.quantity > 0 
        ? (livePrice - p.average_price) * p.quantity
        : (p.average_price - livePrice) * Math.abs(p.quantity);
      
      floatingPnl += pnl;

      const qty = Math.abs(p.quantity);
      usedMargin += (qty * livePrice) / 10.0; // 10x leverage

      // Calculate Open Risk (distance to SL)
      if (p.stop_loss) {
        openRisk += qty * Math.abs(p.average_price - p.stop_loss);
      } else {
        openRisk += qty * livePrice; // full exposure if no SL
      }
    });

    const balance = account?.balance ?? 10000;
    const equity = balance + floatingPnl;
    const freeMargin = Math.max(0, equity - usedMargin);
    const marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0;
    const riskExposure = equity > 0 ? (usedMargin / equity) * 100 : 0;
    const dailyDrawdown = balance > 0 ? Math.max(0, (account?.drawdown ?? 0) * 100) : 0;

    // Fees, commissions, swaps from history
    let commission = history.length * 1.0; // simulated $1 per trade
    let swap = history.length * 0.25; // simulated swap
    let totalFees = commission + swap;

    return {
      balance,
      equity,
      usedMargin,
      freeMargin,
      marginLevel,
      riskExposure,
      dailyDrawdown,
      maxDrawdown: dailyDrawdown > 15 ? dailyDrawdown : 15.0, // simulated max
      floatingPnl,
      openRisk,
      commission,
      swap,
      totalFees,
    };
  }, [activePositions, prices, account, history]);

  // Warning Flags & Thresholds
  const warnings = useMemo(() => {
    const alerts: { type: 'red' | 'yellow'; msg: string; code: string }[] = [];

    if (computed.marginLevel > 0 && computed.marginLevel < 120) {
      alerts.push({
        code: 'MARGIN_CALL',
        type: 'red',
        msg: `CRITICAL: Margin Call warning. Margin level is dangerously low (${computed.marginLevel.toFixed(1)}%). Liquidation threshold: 100%.`,
      });
    } else if (computed.marginLevel > 0 && computed.marginLevel < 200) {
      alerts.push({
        code: 'LOW_MARGIN',
        type: 'yellow',
        msg: `WARNING: Low margin level (${computed.marginLevel.toFixed(1)}%). Consider closing positions to free up margin.`,
      });
    }

    if (computed.riskExposure > 50) {
      alerts.push({
        code: 'HIGH_EXPOSURE',
        type: 'red',
        msg: `CRITICAL: High portfolio risk exposure (${computed.riskExposure.toFixed(1)}%). Limit exposure to prevent margin calls.`,
      });
    } else if (computed.riskExposure > 30) {
      alerts.push({
        code: 'MED_EXPOSURE',
        type: 'yellow',
        msg: `WARNING: Elevated portfolio risk exposure (${computed.riskExposure.toFixed(1)}%). Monitor leverage and spreads.`,
      });
    }

    if (computed.dailyDrawdown > 5.0) {
      alerts.push({
        code: 'DAILY_LOSS_LIMIT',
        type: 'red',
        msg: `CRITICAL: Daily Drawdown limit exceeded (${computed.dailyDrawdown.toFixed(2)}%). Daily risk threshold is 5.00%.`,
      });
    }

    return alerts;
  }, [computed]);

  const fmt = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={containerStyle}>
      {/* Risk alerts panel */}
      {warnings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {warnings.map((alert) => (
            <div key={alert.code} style={warningBannerStyle(alert.type)}>
              <span style={{ fontSize: '14px' }}>⚠️</span>
              <span>{alert.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Risk values grid */}
      <div style={gridStyle}>
        {/* Margin status */}
        <div style={cardStyle(computed.marginLevel > 0 && computed.marginLevel < 120 ? 'red' : computed.marginLevel > 0 && computed.marginLevel < 200 ? 'yellow' : 'normal')}>
          <span style={sectionTitleStyle}>Margin Level %</span>
          <span style={valueStyle(computed.marginLevel > 0 && computed.marginLevel < 120 ? 'red' : computed.marginLevel > 200 ? 'green' : 'yellow')}>
            {computed.marginLevel > 0 ? `${computed.marginLevel.toFixed(2)}%` : '0.00%'}
          </span>
        </div>

        {/* Risk Exposure */}
        <div style={cardStyle(computed.riskExposure > 50 ? 'red' : computed.riskExposure > 30 ? 'yellow' : 'normal')}>
          <span style={sectionTitleStyle}>Risk Exposure %</span>
          <span style={valueStyle(computed.riskExposure > 50 ? 'red' : computed.riskExposure < 30 ? 'green' : 'yellow')}>
            {computed.riskExposure.toFixed(2)}%
          </span>
        </div>

        {/* Daily Drawdown */}
        <div style={cardStyle(computed.dailyDrawdown > 5.0 ? 'red' : 'normal')}>
          <span style={sectionTitleStyle}>Daily Drawdown %</span>
          <span style={valueStyle(computed.dailyDrawdown > 5.0 ? 'red' : 'green')}>
            {computed.dailyDrawdown.toFixed(2)}%
          </span>
        </div>

        {/* Max Drawdown */}
        <div style={cardStyle('normal')}>
          <span style={sectionTitleStyle}>Max Drawdown %</span>
          <span style={valueStyle('normal')}>{computed.maxDrawdown.toFixed(2)}%</span>
        </div>
      </div>

      <div style={gridStyle}>
        {/* Balance details */}
        <div style={cardStyle('normal')}>
          <span style={sectionTitleStyle}>Account Balance</span>
          <span style={valueStyle('normal')}>${fmt(computed.balance)}</span>
        </div>

        <div style={cardStyle('normal')}>
          <span style={sectionTitleStyle}>Account Equity</span>
          <span style={valueStyle('normal')}>${fmt(computed.equity)}</span>
        </div>

        <div style={cardStyle('normal')}>
          <span style={sectionTitleStyle}>Used Margin</span>
          <span style={valueStyle('normal')}>${fmt(computed.usedMargin)}</span>
        </div>

        <div style={cardStyle('normal')}>
          <span style={sectionTitleStyle}>Free Margin</span>
          <span style={valueStyle('normal')}>${fmt(computed.freeMargin)}</span>
        </div>
      </div>

      <div style={gridStyle}>
        {/* Floating P&L */}
        <div style={cardStyle('normal')}>
          <span style={sectionTitleStyle}>Floating P&amp;L</span>
          <span style={valueStyle(computed.floatingPnl >= 0 ? 'green' : 'red')}>
            {computed.floatingPnl >= 0 ? '+' : ''}${fmt(computed.floatingPnl)}
          </span>
        </div>

        {/* Open Risk */}
        <div style={cardStyle('normal')}>
          <span style={sectionTitleStyle}>Open Position Risk</span>
          <span style={valueStyle('normal')}>${fmt(computed.openRisk)}</span>
        </div>

        {/* Total Fees */}
        <div style={cardStyle('normal')}>
          <span style={sectionTitleStyle}>Fees &amp; Commission</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: '#8e8e93' }}>Commission:</span>
              <span style={{ fontWeight: 600 }}>${fmt(computed.commission)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: '#8e8e93' }}>Swap:</span>
              <span style={{ fontWeight: 600 }}>${fmt(computed.swap)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid #1b2235', paddingTop: '4px', marginTop: '4px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Total:</span>
              <span style={{ color: '#ff4d57', fontWeight: 700 }}>-${fmt(computed.totalFees)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMetricsPanel;
