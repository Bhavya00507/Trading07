// src/components/ReplayPanel.tsx
import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { useReplayStore } from '../store/replayStore';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  fontSize: 11,
  padding: '12px',
  gap: 12,
  background: 'var(--bg-secondary)',
  justifyContent: 'center'
};

const controlBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
};

const btnStyle = (active = false, isDanger = false): React.CSSProperties => ({
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 700,
  borderRadius: 4,
  border: 'none',
  background: active ? 'var(--accent)' : isDanger ? 'var(--danger-bg)' : 'var(--bg-tertiary)',
  color: active ? 'var(--bg-primary)' : isDanger ? 'var(--danger)' : 'var(--text-primary)',
  cursor: 'pointer',
  textTransform: 'uppercase',
});

const inputStyle: React.CSSProperties = {
  padding: '4px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const ReplayPanel: React.FC = () => {
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const globalTimeframe = useMarketStore((s) => s.timeframe);
  const watchlist = useAppStore((s) => s.watchlist);

  const {
    isReplayActive,
    isPlaying,
    symbol,
    timeframe,
    currentIndex,
    candles,
    speed,
    enableReplay,
    disableReplay,
    play,
    pause,
    stepForward,
    resetReplay,
    setSpeed,
    jumpToDate
  } = useReplayStore();

  const [selSymbol, setSelSymbol] = useState<string>(selectedInstrument?.symbol || 'BTCUSDT');
  const [selTimeframe, setSelTimeframe] = useState<string>(globalTimeframe || '1m');
  const [jumpDate, setJumpDate] = useState<string>('');

  const handleStartReplay = async () => {
    await enableReplay(selSymbol, selTimeframe);
  };

  return (
    <div style={containerStyle}>
      {!isReplayActive ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Configure Replay Mode:</span>
          
          <select value={selSymbol} onChange={(e) => setSelSymbol(e.target.value)} style={selectStyle}>
            {watchlist.map(inst => (
              <option key={inst.symbol} value={inst.symbol}>{inst.symbol}</option>
            ))}
          </select>

          <select value={selTimeframe} onChange={(e) => setSelTimeframe(e.target.value)} style={selectStyle}>
            {['1m', '5m', '15m', '1H', '4H', '1D'].map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>

          <button onClick={handleStartReplay} style={btnStyle(true)}>
            Enter Replay Mode
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={controlBar}>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
              Replay Active: {symbol} ({timeframe})
            </span>

            {/* Play/Pause */}
            {isPlaying ? (
              <button onClick={pause} style={btnStyle(false)}>
                Pause ⏸
              </button>
            ) : (
              <button onClick={play} style={btnStyle(true)}>
                Play ▶
              </button>
            )}

            {/* Step candle */}
            <button onClick={stepForward} style={btnStyle(false)}>
              Step ⏭
            </button>

            {/* Reset */}
            <button onClick={resetReplay} style={btnStyle(false)}>
              Reset 🔄
            </button>

            {/* Speed Control */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Speed:</span>
              <select
                value={speed}
                onChange={(e) => setSpeed(parseInt(e.target.value))}
                style={selectStyle}
              >
                <option value={2000}>Slow (2.0s)</option>
                <option value={1000}>Normal (1.0s)</option>
                <option value={500}>Fast (0.5s)</option>
                <option value={200}>Turbo (0.2s)</option>
              </select>
            </div>

            {/* Jump to Date */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Jump To:</span>
              <input
                type="date"
                value={jumpDate}
                onChange={(e) => setJumpDate(e.target.value)}
                style={inputStyle}
              />
              <button onClick={() => jumpDate && jumpToDate(jumpDate)} style={btnStyle(false)}>
                Jump
              </button>
            </div>

            {/* Exit Replay */}
            <button onClick={disableReplay} style={btnStyle(false, true)}>
              Exit Replay
            </button>
          </div>

          {/* Replay Progress Bar */}
          {candles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                <span>Progress: {currentIndex} / {candles.length} candles</span>
                <span>
                  Current Candle Time: {new Date((candles[Math.min(currentIndex - 1, candles.length - 1)]?.time as number) * 1000).toLocaleString()}
                </span>
              </div>
              <div style={{ width: '100%', height: 4, background: 'var(--bg-primary)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(currentIndex / candles.length) * 100}%`,
                    height: '100%',
                    backgroundColor: 'var(--accent)',
                    transition: 'width 0.1s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReplayPanel;
