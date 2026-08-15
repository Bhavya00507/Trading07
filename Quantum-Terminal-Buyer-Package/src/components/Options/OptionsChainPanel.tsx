import React, { useState, useEffect, useMemo } from 'react';

export interface OptionsChainProps {
  symbol: string;
  livePrice: number;
  mode?: 'dark' | 'light';
  onAddLeg?: (strike: number, type: 'call' | 'put', action: 'buy' | 'sell', premium: number) => void;
}

export const OptionsChainPanel: React.FC<OptionsChainProps> = ({
  symbol,
  livePrice,
  mode = 'dark',
  onAddLeg
}) => {
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [strikeFilter, setStrikeFilter] = useState<'all' | 'itm' | 'atm' | 'otm'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [chainData, setChainData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/options/chain?symbol=${symbol}&underlying_price=${livePrice}&expiry_days=${expiryDays}`)
      .then(res => res.json())
      .then(data => setChainData(data))
      .catch(() => {});
  }, [symbol, livePrice, expiryDays]);

  const filteredChain = useMemo(() => {
    if (!chainData?.chain) return [];
    let list = chainData.chain;

    if (searchQuery.trim()) {
      list = list.filter((r: any) => String(r.strike).includes(searchQuery.trim()));
    }

    if (strikeFilter === 'itm') {
      list = list.filter((r: any) => r.call.status === 'ITM' || r.put.status === 'ITM');
    } else if (strikeFilter === 'otm') {
      list = list.filter((r: any) => r.call.status === 'OTM' || r.put.status === 'OTM');
    } else if (strikeFilter === 'atm') {
      list = list.filter((r: any) => r.is_atm);
    }

    return list;
  }, [chainData, searchQuery, strikeFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8, fontSize: 10 }}>
      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94a3b8', fontWeight: 700 }}>Expiration:</span>
          {[7, 14, 30, 60, 90, 180, 365].map(days => (
            <button
              key={days}
              onClick={() => setExpiryDays(days)}
              style={{
                padding: '3px 7px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                backgroundColor: expiryDays === days ? '#38bdf8' : (mode === 'dark' ? '#1e293b' : '#e2e8f0'),
                color: expiryDays === days ? '#0f172a' : 'inherit'
              }}
            >
              {days}D
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['all', 'itm', 'atm', 'otm'].map(f => (
            <button
              key={f}
              onClick={() => setStrikeFilter(f as any)}
              style={{
                padding: '3px 6px', borderRadius: 3, border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                backgroundColor: strikeFilter === f ? '#f59e0b' : '#1e293b',
                color: strikeFilter === f ? '#0f172a' : '#cbd5e1'
              }}
            >
              {f}
            </button>
          ))}
          <input
            type="text"
            placeholder="Search strike..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '3px 6px', borderRadius: 4, backgroundColor: mode === 'dark' ? '#1e293b' : '#fff', color: 'inherit', border: '1px solid #334155', width: 100 }}
          />
        </div>
      </div>

      {/* Options Chain Grid */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #1e293b', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ backgroundColor: mode === 'dark' ? '#0f172a' : '#f1f5f9', borderBottom: '1px solid #1e293b', color: '#94a3b8' }}>
              <th colSpan={7} style={{ padding: 4, color: '#10b981', borderRight: '1px solid #1e293b' }}>CALLS</th>
              <th style={{ padding: 4, color: '#f59e0b' }}>STRIKE</th>
              <th colSpan={7} style={{ padding: 4, color: '#ef4444', borderLeft: '1px solid #1e293b' }}>PUTS</th>
            </tr>
            <tr style={{ backgroundColor: mode === 'dark' ? '#111827' : '#e2e8f0', color: '#64748b', fontSize: 9 }}>
              <th>Delta</th><th>IV</th><th>OI</th><th>Vol</th><th>Bid</th><th>Ask</th><th style={{ borderRight: '1px solid #1e293b' }}>Action</th>
              <th style={{ backgroundColor: '#1e293b', color: '#fff' }}>STRIKE</th>
              <th style={{ borderLeft: '1px solid #1e293b' }}>Action</th><th>Bid</th><th>Ask</th><th>Vol</th><th>OI</th><th>IV</th><th>Delta</th>
            </tr>
          </thead>
          <tbody>
            {filteredChain.map((row: any) => {
              const callBg = row.call.status === 'ITM' ? (mode === 'dark' ? '#064e3b' : '#d1fae5') : 'transparent';
              const putBg = row.put.status === 'ITM' ? (mode === 'dark' ? '#7f1d1d' : '#fee2e2') : 'transparent';
              const atmBg = row.is_atm ? 'rgba(245, 158, 11, 0.25)' : 'transparent';

              return (
                <tr key={row.strike} style={{ borderBottom: '1px solid #1e293b', backgroundColor: atmBg }}>
                  {/* Call Columns */}
                  <td style={{ backgroundColor: callBg, color: '#10b981' }}>{row.call.greeks.delta}</td>
                  <td style={{ backgroundColor: callBg }}>{row.call.iv_pct}%</td>
                  <td style={{ backgroundColor: callBg }}>{row.call.open_interest}</td>
                  <td style={{ backgroundColor: callBg }}>{row.call.volume}</td>
                  <td style={{ backgroundColor: callBg, fontWeight: 700 }}>${row.call.bid}</td>
                  <td style={{ backgroundColor: callBg, fontWeight: 700 }}>${row.call.ask}</td>
                  <td style={{ backgroundColor: callBg, borderRight: '1px solid #1e293b' }}>
                    <button onClick={() => onAddLeg?.(row.strike, 'call', 'buy', row.call.ask)} style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', marginRight: 2 }}>+C</button>
                    <button onClick={() => onAddLeg?.(row.strike, 'call', 'sell', row.call.bid)} style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer' }}>-C</button>
                  </td>

                  {/* Strike Column */}
                  <td style={{ fontWeight: 900, color: row.is_atm ? '#f59e0b' : 'inherit', backgroundColor: mode === 'dark' ? '#0f172a' : '#e2e8f0' }}>
                    ${row.strike}
                  </td>

                  {/* Put Columns */}
                  <td style={{ backgroundColor: putBg, borderLeft: '1px solid #1e293b' }}>
                    <button onClick={() => onAddLeg?.(row.strike, 'put', 'buy', row.put.ask)} style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, backgroundColor: '#10b981', color: '#fff', cursor: 'pointer', marginRight: 2 }}>+P</button>
                    <button onClick={() => onAddLeg?.(row.strike, 'put', 'sell', row.put.bid)} style={{ fontSize: 8, padding: '1px 3px', border: 'none', borderRadius: 2, backgroundColor: '#ef4444', color: '#fff', cursor: 'pointer' }}>-P</button>
                  </td>
                  <td style={{ backgroundColor: putBg, fontWeight: 700 }}>${row.put.bid}</td>
                  <td style={{ backgroundColor: putBg, fontWeight: 700 }}>${row.put.ask}</td>
                  <td style={{ backgroundColor: putBg }}>{row.put.volume}</td>
                  <td style={{ backgroundColor: putBg }}>{row.put.open_interest}</td>
                  <td style={{ backgroundColor: putBg }}>{row.put.iv_pct}%</td>
                  <td style={{ backgroundColor: putBg, color: '#ef4444' }}>{row.put.greeks.delta}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
