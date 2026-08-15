import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';

export const OptionOrderEntryPanel: React.FC<{ symbol: string; livePrice: number; mode?: 'dark' | 'light' }> = ({
  symbol,
  livePrice,
  mode = 'dark'
}) => {
  const addToast = useAppStore(s => s.addToast);

  const [action, setAction] = useState<string>('buy_to_open');
  const [orderType, setOrderType] = useState<string>('limit');
  const [strike, setStrike] = useState<number>(Math.round(livePrice));
  const [optionType, setOptionType] = useState<'call' | 'put'>('call');
  const [quantity, setQuantity] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(5.50);
  const [execResult, setExecResult] = useState<any>(null);

  const handleExecute = async () => {
    try {
      const res = await fetch('/api/options/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          orderAction: action,
          orderType,
          legs: [{ strike, type: optionType, action, quantity, premium: limitPrice }],
          limitPrice
        })
      });
      if (res.ok) {
        const data = await res.json();
        setExecResult(data);
        addToast(`Executed ${action.toUpperCase()} ${quantity}x ${symbol} $${strike} ${optionType.toUpperCase()}`, 'success');
      }
    } catch {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500, fontSize: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, color: '#f59e0b' }}>OPTION ORDER ENTRY & MARGIN PREVIEW DESK</div>

      <div style={{ padding: 12, borderRadius: 8, backgroundColor: mode === 'dark' ? '#0f172a' : '#ffffff', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Action selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {['buy_to_open', 'sell_to_open', 'buy_to_close', 'sell_to_close'].map(act => (
            <button
              key={act}
              onClick={() => setAction(act)}
              style={{
                padding: '5px 4px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                backgroundColor: action === act ? '#f59e0b' : '#1e293b',
                color: action === act ? '#0f172a' : '#cbd5e1'
              }}
            >
              {act.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Order Type & Option Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ color: '#94a3b8' }}>Order Type:</label>
            <select value={orderType} onChange={e => setOrderType(e.target.value)} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="bracket">Bracket</option>
              <option value="oco">OCO</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8' }}>Option Type:</label>
            <select value={optionType} onChange={e => setOptionType(e.target.value as any)} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }}>
              <option value="call">Call</option>
              <option value="put">Put</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#94a3b8' }}>Strike ($):</label>
            <input type="number" value={strike} onChange={e => setStrike(Number(e.target.value))} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ color: '#94a3b8' }}>Contracts (Qty):</label>
            <input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8' }}>Limit Premium ($):</label>
            <input type="number" step={0.1} value={limitPrice} onChange={e => setLimitPrice(Number(e.target.value))} style={{ width: '100%', padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
          </div>
        </div>

        {/* Execution Button */}
        <button onClick={handleExecute} style={{ padding: 8, borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
          ⚡ EXECUTE OPTION ORDER ({action.replace(/_/g, ' ').toUpperCase()})
        </button>

        {execResult && (
          <div style={{ padding: 8, borderRadius: 4, backgroundColor: '#1e293b', borderLeft: '3px solid #10b981', color: '#38bdf8', fontSize: 10 }}>
            Order #{execResult.order_id} [{execResult.status}] — Premium: ${execResult.total_premium} | Margin Required: ${execResult.estimated_margin_required}
          </div>
        )}
      </div>
    </div>
  );
};
