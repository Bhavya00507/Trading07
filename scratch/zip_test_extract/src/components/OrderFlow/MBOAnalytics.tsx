import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { getWsUrl } from '../../services/config';

export interface MBOStatistics {
  symbol: string;
  total_active_orders: number;
  trades_per_sec: number;
  cancel_ratio_pct: number;
  queue_velocity_min: number;
  avg_queue_length: number;
  aggressive_buy_volume: number;
  aggressive_sell_volume: number;
  market_pressure_index: number;
  total_volume_traded: number;
}

export const MBOAnalytics: React.FC<{ symbol?: string }> = ({ symbol = 'BTCUSDT' }) => {
  const mode = useAppStore((s) => s.settings?.mode || 'dark');
  const selectedSymbol = useAppStore((s) => s.selectedInstrument?.symbol || symbol);

  const [stats, setStats] = useState<MBOStatistics>({
    symbol: selectedSymbol,
    total_active_orders: 1420,
    trades_per_sec: 42.5,
    cancel_ratio_pct: 18.4,
    queue_velocity_min: 850.0,
    avg_queue_length: 14.2,
    aggressive_buy_volume: 450.0,
    aggressive_sell_volume: 380.0,
    market_pressure_index: 8.4,
    total_volume_traded: 12500.0,
  });

  const [events, setEvents] = useState<any[]>([]);

  // WebSocket Live MBO Telemetry Feed
  useEffect(() => {
    let ws: WebSocket | null = null;
    let isSubscribed = true;

    try {
      const wsUrl = `${getWsUrl()}/ws/mbo?symbol=${selectedSymbol}`;
      ws = new WebSocket(wsUrl);

      ws.onmessage = (e) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          if (data.statistics) {
            setStats(data.statistics);
          }
          if (data.recent_events) {
            setEvents(data.recent_events);
          }
        } catch {}
      };
    } catch {}

    // Fallback Polling if WS fails
    const interval = setInterval(async () => {
      if (ws && ws.readyState === WebSocket.OPEN) return;
      try {
        const res = await fetch(`/api/mbo/statistics?symbol=${selectedSymbol}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {}
    }, 1000);

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [selectedSymbol]);

  const buyRatio = useMemo(() => {
    const tot = stats.aggressive_buy_volume + stats.aggressive_sell_volume;
    if (tot === 0) return 50;
    return Math.round((stats.aggressive_buy_volume / tot) * 100);
  }, [stats]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', gap: 12, padding: 12,
      backgroundColor: mode === 'dark' ? '#090d16' : '#ffffff',
      color: mode === 'dark' ? '#e2e8f0' : '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif', fontSize: 11
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚡ MARKET BY ORDER (MBO) QUEUE ANALYTICS
        </span>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>
          {selectedSymbol} | Active Orders: <strong style={{ color: '#10b981' }}>{stats.total_active_orders}</strong>
        </span>
      </div>

      {/* Primary Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <div style={{ padding: 8, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Queue Velocity</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>{stats.queue_velocity_min} <span style={{ fontSize: 9 }}>v/min</span></div>
        </div>

        <div style={{ padding: 8, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Cancel Ratio</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: stats.cancel_ratio_pct > 25 ? '#ef4444' : '#f59e0b', marginTop: 2 }}>{stats.cancel_ratio_pct}%</div>
        </div>

        <div style={{ padding: 8, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Trades / Sec</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#10b981', marginTop: 2 }}>{stats.trades_per_sec}</div>
        </div>

        <div style={{ padding: 8, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Market Pressure</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: stats.market_pressure_index >= 0 ? '#10b981' : '#ef4444', marginTop: 2 }}>
            {stats.market_pressure_index >= 0 ? '+' : ''}{stats.market_pressure_index}%
          </div>
        </div>
      </div>

      {/* Aggressive Buy vs Sell Liquidity Bar */}
      <div style={{ padding: 10, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
          <span style={{ color: '#10b981' }}>Aggressive Buyers: {stats.aggressive_buy_volume} lots ({buyRatio}%)</span>
          <span style={{ color: '#ef4444' }}>Aggressive Sellers: {stats.aggressive_sell_volume} lots ({100 - buyRatio}%)</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, backgroundColor: '#ef4444', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${buyRatio}%`, backgroundColor: '#10b981', transition: 'width 0.2s ease' }} />
        </div>
      </div>

      {/* Live MBO Order Event Stream Audit Log */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 8, borderRadius: 6, backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', border: '1px solid #1e293b' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
          Live MBO Order Queue Stream Log
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {events.length === 0 ? (
            <div style={{ fontSize: 10, color: '#64748b', textAlign: 'center', marginTop: 10 }}>Listening to real-time MBO order events...</div>
          ) : (
            events.map((evt, idx) => (
              <div key={evt.event_id || idx} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px',
                borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff', fontSize: 10
              }}>
                <span style={{
                  fontWeight: 700,
                  color: evt.type === 'ADD' ? '#3b82f6' : evt.type === 'FILL' ? '#10b981' : evt.type === 'CANCEL' ? '#ef4444' : '#f59e0b'
                }}>
                  [{evt.type}]
                </span>
                <span>{evt.side.toUpperCase()} {evt.quantity} lots @ ${evt.price}</span>
                <span style={{ color: '#64748b', fontSize: 9 }}>{evt.order_id}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
