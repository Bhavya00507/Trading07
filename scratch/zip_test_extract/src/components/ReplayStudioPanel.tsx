import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useReplayStore } from '../store/replayStore';
import { useAppStore } from '../store/appStore';

export const ReplayStudioPanel: React.FC = () => {
  const mode = useAppStore((state) => state.settings?.mode || 'dark');
  const addToast = useAppStore((state) => state.addToast);
  const setSelectedInstrument = useAppStore((state) => state.setSelectedInstrument);

  const {
    isReplayActive, isPlaying, symbol, assetClass, timeframe, candles, currentIndex,
    speedMultiplier, balance, equity, positions, tradeHistory, stats, equityCurve,
    drawingTools, aiQueryResponse, enableReplay, disableReplay, play, pause, restart,
    stepForward, stepBackward, setSpeedMultiplier, setTimeframe, jumpToDate, jumpToCandle,
    placeOrder, closePosition, reversePosition, moveToBreakEven, addDrawingTool,
    saveSession, loadSession, queryAI
  } = useReplayStore();

  // Config State
  const [inputSymbol, setInputSymbol] = useState<string>('BTCUSDT');
  const [selectedAssetClass, setSelectedAssetClass] = useState<'Stocks' | 'Forex' | 'Crypto' | 'Futures' | 'Indices'>('Crypto');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1m');
  const [candleCount, setCandleCount] = useState<number>(1000);

  // Jump State
  const [jumpDate, setJumpDate] = useState<string>('');
  const [jumpIdx, setJumpIdx] = useState<string>('');

  // Trade Form State
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [orderQty, setOrderQty] = useState<number>(1.0);
  const [orderSL, setOrderSL] = useState<string>('');
  const [orderTP, setOrderTP] = useState<string>('');

  // AI & Session State
  const [aiPrompt, setAiPrompt] = useState<string>('Why did this trade fail?');
  const [sessionName, setSessionName] = useState<string>('MyReplaySession_01');

  // Drawing Tools State
  const [selectedToolType, setSelectedToolType] = useState<'trendline' | 'horizontal_level' | 'anchored_vwap' | 'fibonacci' | 'pitchfork'>('anchored_vwap');

  // Auto-play interval effect
  useEffect(() => {
    if (!isPlaying) return;
    const baseIntervalMs = 1000;
    const intervalMs = Math.max(10, Math.floor(baseIntervalMs / speedMultiplier));
    const timer = setInterval(() => {
      if (currentIndex < candles.length - 1) {
        stepForward(1);
      } else {
        pause();
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speedMultiplier, currentIndex, candles.length, stepForward, pause]);

  const currentCandle = useMemo(() => {
    if (candles.length === 0 || currentIndex >= candles.length) return null;
    return candles[currentIndex];
  }, [candles, currentIndex]);

  const handleStartReplay = async () => {
    addToast(`Loading ${candleCount} replay candles for ${inputSymbol}...`, 'info');
    await enableReplay(inputSymbol, selectedTimeframe, selectedAssetClass, candleCount);
    addToast(`Replay engine initialized for ${inputSymbol}`, 'success');
  };

  const handlePlaceOrder = () => {
    const sl = orderSL ? parseFloat(orderSL) : undefined;
    const tp = orderTP ? parseFloat(orderTP) : undefined;
    placeOrder(orderSide, orderQty, sl, tp);
    addToast(`Executed Replay ${orderSide.toUpperCase()} ${orderQty} ${symbol}`, 'success');
  };

  const handleAddDrawing = () => {
    if (!currentCandle) return;
    addDrawingTool({
      id: `draw-${Date.now()}`,
      type: selectedToolType,
      points: [{ time: currentCandle.time as number, price: currentCandle.close }],
      color: '#3b82f6'
    });
    addToast(`Added ${selectedToolType} drawing at candle #${currentIndex}`, 'info');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: mode === 'dark' ? '#090d16' : '#f8f9fa',
      color: mode === 'dark' ? '#e2e8f0' : '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: 12, overflow: 'auto'
    }}>
      {/* Top Header / Control Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
        backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff',
        borderBottom: mode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
        gap: 8, flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#38bdf8' }}>
            🎬 MARKET REPLAY STUDIO
          </span>
          <span style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
            backgroundColor: isReplayActive ? '#10b981' : '#64748b', color: '#fff'
          }}>
            {isReplayActive ? (isPlaying ? 'LIVE REPLAY PLAYING' : 'REPLAY PAUSED') : 'OFFLINE'}
          </span>
        </div>

        {/* Start / Setup Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <select
            value={selectedAssetClass}
            onChange={(e) => setSelectedAssetClass(e.target.value as any)}
            style={{ padding: '4px 8px', borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#e2e8f0', color: 'inherit', border: 'none', fontSize: 11 }}
          >
            <option value="Crypto">Crypto</option>
            <option value="Forex">Forex</option>
            <option value="Stocks">Stocks</option>
            <option value="Futures">Futures</option>
            <option value="Indices">Indices</option>
          </select>

          <input
            type="text"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol..."
            style={{ padding: '4px 8px', borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#e2e8f0', color: 'inherit', border: 'none', fontSize: 11, width: 85 }}
          />

          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#e2e8f0', color: 'inherit', border: 'none', fontSize: 11 }}
          >
            {['1s', '5s', '15s', '30s', '1m', '5m', '15m', '30m', '1H', '4H', 'Daily', 'Weekly', 'Monthly'].map(tf => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>

          <input
            type="number"
            value={candleCount}
            onChange={(e) => setCandleCount(Number(e.target.value))}
            title="Number of candles (up to 100,000)"
            style={{ padding: '4px 6px', borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#e2e8f0', color: 'inherit', border: 'none', fontSize: 11, width: 65 }}
          />

          <button
            onClick={handleStartReplay}
            style={{ padding: '4px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#0284c7', color: '#fff', fontWeight: 700, fontSize: 11 }}
          >
            Initialize Replay
          </button>
        </div>
      </div>

      {/* Main Controls & Speed Switcher */}
      {isReplayActive && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px',
          backgroundColor: mode === 'dark' ? '#0b1120' : '#f1f5f9',
          borderBottom: mode === 'dark' ? '1px solid #1e293b' : '1px solid #cbd5e1',
          flexWrap: 'wrap', gap: 8
        }}>
          {/* Playback Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={restart} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#475569', color: '#fff', fontWeight: 700 }}>⏮ Restart</button>
            <button onClick={() => stepBackward(1)} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#334155', color: '#fff', fontWeight: 700 }}>◄ Step</button>
            {isPlaying ? (
              <button onClick={pause} style={{ padding: '5px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#f59e0b', color: '#fff', fontWeight: 800 }}>❚❚ PAUSE</button>
            ) : (
              <button onClick={play} style={{ padding: '5px 14px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#10b981', color: '#fff', fontWeight: 800 }}>▶ PLAY</button>
            )}
            <button onClick={() => stepForward(1)} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#334155', color: '#fff', fontWeight: 700 }}>Step ►</button>
            <button onClick={disableReplay} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#ef4444', color: '#fff', fontWeight: 700 }}>🛑 Stop</button>
          </div>

          {/* Speed Multipliers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 4 }}>Speed:</span>
            {[0.25, 0.5, 1, 2, 5, 10, 25, 50, 100].map(mult => (
              <button
                key={mult}
                onClick={() => setSpeedMultiplier(mult)}
                style={{
                  padding: '3px 7px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700,
                  backgroundColor: speedMultiplier === mult ? '#38bdf8' : (mode === 'dark' ? '#1e293b' : '#cbd5e1'),
                  color: speedMultiplier === mult ? '#0f172a' : 'inherit'
                }}
              >
                {mult}x
              </button>
            ))}
          </div>

          {/* Jump Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              placeholder="Candle #"
              value={jumpIdx}
              onChange={(e) => setJumpIdx(e.target.value)}
              style={{ padding: '3px 6px', borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', fontSize: 10, width: 70 }}
            />
            <button
              onClick={() => { if (jumpIdx) jumpToCandle(Number(jumpIdx)); }}
              style={{ padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#0284c7', color: '#fff', fontSize: 10, fontWeight: 700 }}
            >
              Jump #
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Body Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', flex: 1, gap: 12, padding: 12, minHeight: 0 }}>
        {/* Left Column: Replay Candle Details, Order Flow DOM, & Drawings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Current Candle Header Card */}
          <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8' }}>
                {symbol} ({timeframe}) — Candle #{currentIndex} / {candles.length}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {currentCandle ? new Date((currentCandle.time as number) * 1000).toUTCString() : 'No Data'}
              </span>
            </div>

            {currentCandle ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, textAlign: 'center' }}>
                <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>OPEN</div>
                  <div style={{ fontWeight: 700 }}>${currentCandle.open}</div>
                </div>
                <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>HIGH</div>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>${currentCandle.high}</div>
                </div>
                <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>LOW</div>
                  <div style={{ fontWeight: 700, color: '#ef4444' }}>${currentCandle.low}</div>
                </div>
                <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>CLOSE</div>
                  <div style={{ fontWeight: 700, color: currentCandle.close >= currentCandle.open ? '#10b981' : '#ef4444' }}>
                    ${currentCandle.close}
                  </div>
                </div>
                <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>DELTA</div>
                  <div style={{ fontWeight: 700, color: (currentCandle.delta || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                    {currentCandle.delta || 0}
                  </div>
                </div>
                <div style={{ backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', padding: 6, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>CVD</div>
                  <div style={{ fontWeight: 700, color: (currentCandle.cvd || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                    {currentCandle.cvd || 0}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>
                Click "Initialize Replay" above to load historical candles.
              </div>
            )}
          </div>

          {/* Synchronized Drawing Tools Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 11, color: '#94a3b8' }}>DRAWINGS:</span>
              {(['anchored_vwap', 'trendline', 'horizontal_level', 'fibonacci', 'pitchfork'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedToolType(t)}
                  style={{
                    padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                    backgroundColor: selectedToolType === t ? '#38bdf8' : (mode === 'dark' ? '#1e293b' : '#e2e8f0'),
                    color: selectedToolType === t ? '#0f172a' : 'inherit'
                  }}
                >
                  {t.replace('_', ' ').toUpperCase()}
                </button>
              ))}
              <button onClick={handleAddDrawing} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#10b981', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                + Add at Candle
              </button>
            </div>
            <span style={{ fontSize: 10, color: '#64748b' }}>Active Drawings: {drawingTools.length}</span>
          </div>

          {/* Equity & Balance Curve Canvas */}
          <div style={{ flex: 1, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b', padding: 12, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>REPLAY EQUITY & BALANCE CURVE</div>
            <div style={{ flex: 1, minHeight: 160, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 160" preserveAspectRatio="none">
                <path
                  d="M 0 120 Q 120 100, 250 80 T 500 40"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                />
              </svg>
              <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, fontWeight: 700, color: '#10b981' }}>
                Equity: ${equity.toFixed(2)} | Balance: ${balance.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Replay Order Entry, Open Positions, Statistics, & AI Copilot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {/* Order Placement Desk */}
          <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: '#38bdf8', marginBottom: 8 }}>REPLAY ORDER DESK</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setOrderSide('buy')}
                  style={{ flex: 1, padding: 6, borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, backgroundColor: orderSide === 'buy' ? '#10b981' : '#1e293b', color: '#fff' }}
                >
                  BUY
                </button>
                <button
                  onClick={() => setOrderSide('sell')}
                  style={{ flex: 1, padding: 6, borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, backgroundColor: orderSide === 'sell' ? '#ef4444' : '#1e293b', color: '#fff' }}
                >
                  SELL
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                <div>
                  <label style={{ fontSize: 9, color: '#94a3b8' }}>QTY</label>
                  <input type="number" value={orderQty} onChange={(e) => setOrderQty(Number(e.target.value))} style={{ width: '80%', padding: 4, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', fontSize: 10 }} />
                </div>
                <div>
                  <label style={{ fontSize: 9, color: '#94a3b8' }}>STOP LOSS</label>
                  <input type="text" placeholder="SL..." value={orderSL} onChange={(e) => setOrderSL(e.target.value)} style={{ width: '80%', padding: 4, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', fontSize: 10 }} />
                </div>
                <div>
                  <label style={{ fontSize: 9, color: '#94a3b8' }}>TAKE PROFIT</label>
                  <input type="text" placeholder="TP..." value={orderTP} onChange={(e) => setOrderTP(e.target.value)} style={{ width: '80%', padding: 4, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', fontSize: 10 }} />
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                style={{ padding: 8, borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, backgroundColor: '#0284c7', color: '#fff', fontSize: 11 }}
              >
                Execute Replay Order
              </button>
            </div>
          </div>

          {/* Open Positions Card */}
          <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: '#38bdf8', marginBottom: 8 }}>OPEN POSITIONS ({positions.length})</div>
            {positions.length === 0 ? (
              <div style={{ fontSize: 10, color: '#64748b' }}>No open replay positions.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {positions.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 6, backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', borderRadius: 4 }}>
                    <div>
                      <strong style={{ color: p.side === 'buy' ? '#10b981' : '#ef4444' }}>{p.side.toUpperCase()}</strong> {p.quantity} {p.symbol} @ ${p.entryPrice}
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button onClick={() => moveToBreakEven(p.id)} style={{ fontSize: 9, padding: '2px 4px', border: 'none', borderRadius: 3, backgroundColor: '#3b82f6', color: '#fff', cursor: 'pointer' }}>BE</button>
                      <button onClick={() => reversePosition(p.id)} style={{ fontSize: 9, padding: '2px 4px', border: 'none', borderRadius: 3, backgroundColor: '#f59e0b', color: '#fff', cursor: 'pointer' }}>REV</button>
                      <button onClick={() => closePosition(p.id)} style={{ fontSize: 9, padding: '2px 4px', border: 'none', borderRadius: 3, backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer' }}>CLOSE</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Replay Statistics Card */}
          <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: '#38bdf8', marginBottom: 8 }}>INSTITUTIONAL STATISTICS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10 }}>
              <div>Win Rate: <strong style={{ color: '#10b981' }}>{stats.winRate}%</strong></div>
              <div>Profit Factor: <strong>{stats.profitFactor}</strong></div>
              <div>Sharpe Ratio: <strong>{stats.sharpeRatio}</strong></div>
              <div>Expectancy: <strong style={{ color: '#10b981' }}>${stats.expectancy}</strong></div>
              <div>Total Trades: <strong>{stats.totalTrades}</strong></div>
              <div>Total PnL: <strong style={{ color: stats.totalPnl >= 0 ? '#10b981' : '#ef4444' }}>${stats.totalPnl}</strong></div>
            </div>
          </div>

          {/* AI Copilot Query Box */}
          <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: '#38bdf8', marginBottom: 8 }}>🤖 REPLAY AI COPILOT</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask AI Copilot..."
                style={{ padding: 6, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', fontSize: 10 }}
              />
              <button
                onClick={() => queryAI(aiPrompt)}
                style={{ padding: 5, borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 10 }}
              >
                Ask Replay AI
              </button>

              {aiQueryResponse && (
                <div style={{ marginTop: 6, padding: 8, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#f1f5f9', fontSize: 10, borderLeft: '3px solid #8b5cf6' }}>
                  <strong>AI Response:</strong>
                  <div style={{ marginTop: 4, color: '#cbd5e1' }}>{aiQueryResponse.answer}</div>
                </div>
              )}
            </div>
          </div>

          {/* Save / Load Session Card */}
          <div style={{ padding: 12, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', borderRadius: 8, border: '1px solid #1e293b' }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: '#38bdf8', marginBottom: 8 }}>REPLAY SESSION WORKSPACE</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                style={{ flex: 1, padding: 4, borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', fontSize: 10 }}
              />
              <button onClick={() => saveSession(sessionName)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#10b981', color: '#fff', fontSize: 10, fontWeight: 700 }}>Save</button>
              <button onClick={() => loadSession(sessionName)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 700 }}>Load</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
