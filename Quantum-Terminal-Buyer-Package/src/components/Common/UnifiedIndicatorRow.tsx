import React from 'react';

export interface IndicatorMap {
  ema20?: boolean;
  ema50?: boolean;
  ema200?: boolean;
  vwap?: boolean;
  bb?: boolean;
  ichimoku?: boolean;
  supertrend?: boolean;
  rsi?: boolean;
  macd?: boolean;
  atr?: boolean;
  stochastic?: boolean;
  adx?: boolean;
  volProfile?: boolean;
  pivots?: boolean;
  [key: string]: boolean | undefined;
}

const INDICATOR_LABELS: Record<string, string> = {
  ema20: 'EMA 20',
  ema50: 'EMA 50',
  ema200: 'EMA 200',
  vwap: 'VWAP',
  bb: 'BB(20,2)',
  ichimoku: 'Ichimoku',
  supertrend: 'SuperTrend',
  rsi: 'RSI (14)',
  macd: 'MACD',
  atr: 'ATR (14)',
  stochastic: 'Stoch (14,3,3)',
  adx: 'ADX (14)',
  volProfile: 'Volume Profile (POC)',
  pivots: 'Pivots'
};

interface UnifiedIndicatorRowProps {
  indicators: IndicatorMap;
  onToggleIndicator: (id: string) => void;
  onOpenLibrary: () => void;
  compact?: boolean;
}

export const UnifiedIndicatorRow: React.FC<UnifiedIndicatorRowProps> = React.memo(({
  indicators = {},
  onToggleIndicator,
  onOpenLibrary,
  compact = false
}) => {
  const activeKeys = Object.keys(INDICATOR_LABELS).filter((key) => Boolean(indicators[key]));

  return (
    <div
      className="unified-indicator-row"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        verticalAlign: 'middle',
        padding: compact ? '2px 0' : '4px 0',
      }}
    >
      {/* 1. Main Indicators Library Trigger */}
      <button
        type="button"
        onClick={onOpenLibrary}
        title="Open Indicator Library (Ctrl+I)"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: compact ? '2px 6px' : '4px 8px',
          fontSize: compact ? 10 : 11,
          fontWeight: 700,
          borderRadius: 4,
          border: '1px solid rgba(56, 189, 248, 0.4)',
          background: 'rgba(56, 189, 248, 0.08)',
          color: '#38bdf8',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: compact ? 10 : 12 }}>ƒx</span>
        <span>Indicators</span>
        <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
      </button>

      {/* 2. Active Indicator Chips */}
      {activeKeys.map((key) => {
        const label = INDICATOR_LABELS[key] || key.toUpperCase();
        return (
          <div
            key={key}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: compact ? '1px 5px' : '2px 7px',
              fontSize: compact ? 9 : 10,
              fontWeight: 600,
              borderRadius: 3,
              border: '1px solid #1b2235',
              background: '#0c101b',
              color: '#f0f4f8',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span>{label}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleIndicator(key);
              }}
              title={`Remove ${label}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 10,
                padding: '0 2px',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              ✕
            </button>
          </div>
        );
      })}

      {/* 3. Add Indicator Quick Button */}
      <button
        type="button"
        onClick={onOpenLibrary}
        title="Add Indicator"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: compact ? 18 : 22,
          height: compact ? 18 : 22,
          padding: 0,
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
          borderRadius: 3,
          border: '1px dashed #1b2235',
          background: 'transparent',
          color: '#64748b',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        +
      </button>
    </div>
  );
});

UnifiedIndicatorRow.displayName = 'UnifiedIndicatorRow';
