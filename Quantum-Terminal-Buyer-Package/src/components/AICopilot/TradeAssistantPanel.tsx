import React, { useState } from 'react';

export const TradeAssistantPanel: React.FC<{ symbol: string; livePrice: number }> = ({ symbol, livePrice }) => {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [stopLoss, setStopLoss] = useState<number>(Math.round(livePrice * 0.985));
  const [takeProfit, setTakeProfit] = useState<number>(Math.round(livePrice * 1.035));
  const [evalResult, setEvalResult] = useState<any>(null);

  const handleEvaluate = async () => {
    try {
      const res = await fetch('/api/ai/trade-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol, side, price: livePrice, stop_loss: stopLoss, take_profit: takeProfit
        })
      });
      if (res.ok) {
        const data = await res.json();
        setEvalResult(data);
      }
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 11, color: '#e2e8f0' }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#10b981' }}>⚡ PRE-TRADE RISK & EXPECTATION EVALUATOR</div>

      <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 9 }}>Side:</label>
            <select value={side} onChange={e => setSide(e.target.value as any)} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
              <option value="buy">BUY Long</option>
              <option value="sell">SELL Short</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 9 }}>Stop Loss ($):</label>
            <input type="number" value={stopLoss} onChange={e => setStopLoss(Number(e.target.value))} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 9 }}>Take Profit ($):</label>
            <input type="number" value={takeProfit} onChange={e => setTakeProfit(Number(e.target.value))} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
          </div>
        </div>

        <button onClick={handleEvaluate} style={{ padding: 6, borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 900, cursor: 'pointer' }}>
          Evaluate Trade Setup with AI
        </button>

        {evalResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <div style={{ padding: 8, borderRadius: 4, backgroundColor: evalResult.ai_verdict === 'APPROVED' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', border: '1px solid #38bdf8' }}>
              {evalResult.ai_explanation}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>R:R Ratio: <strong style={{ color: '#f59e0b' }}>1:{evalResult.risk_reward_ratio}</strong></div>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Est. Win Prob: <strong style={{ color: '#10b981' }}>{evalResult.estimated_win_probability_pct}%</strong></div>
              <div style={{ padding: 6, backgroundColor: '#1e293b', borderRadius: 4 }}>Max Drawdown: <strong style={{ color: '#ef4444' }}>-{evalResult.expected_drawdown_pct}%</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
