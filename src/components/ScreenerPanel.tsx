import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface ScreenerAsset {
  symbol: string;
  name: string;
  assetClass: 'Stocks' | 'Crypto' | 'Forex' | 'Futures' | 'Indices' | 'ETFs';
  price: number;
  volume: number;
  atr: number;
  rsi: number;
  macd: string; // "Bullish Cross" or "Bearish Cross" or "Normal"
  adx: number;
  superTrend: 'Buy' | 'Sell';
  emaAlignment: 'Bullish' | 'Bearish' | 'Mixed';
  vwap: number;
  gapPct: number;
  marketCap: number; // in Millions
  relativeVolume: number;
  newsScore: number; // 0 to 100
  aiScore: number; // 0 to 100
  institutionalScore: number; // 0 to 100
  liquidity: 'High' | 'Medium' | 'Low';
  spread: number;
}

export const ScreenerPanel: React.FC = () => {
  const watchlist = useAppStore((state) => state.watchlist);

  // Asset class filter
  const [selectedAssetClass, setSelectedAssetClass] = useState<string>('ALL');

  // Technical and Fundamental Filters
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [rsiMin, setRsiMin] = useState<string>('');
  const [rsiMax, setRsiMax] = useState<string>('');
  const [superTrendFilter, setSuperTrendFilter] = useState<string>('ALL');
  const [emaAlignFilter, setEmaAlignFilter] = useState<string>('ALL');
  const [minVolume, setMinVolume] = useState<string>('');
  const [minAiScore, setMinAiScore] = useState<string>('');

  // Generated Mock Screener Data (supports Stocks, Crypto, Forex, Futures, Indices, ETFs)
  const screenerData = useMemo(() => {
    // Basic pool of tickers
    const pool = [
      { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'Stocks' },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', assetClass: 'Stocks' },
      { symbol: 'TSLA', name: 'Tesla Inc.', assetClass: 'Stocks' },
      { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', assetClass: 'Crypto' },
      { symbol: 'ETHUSDT', name: 'Ethereum / USDT', assetClass: 'Crypto' },
      { symbol: 'SOLUSDT', name: 'Solana / USDT', assetClass: 'Crypto' },
      { symbol: 'EURUSD', name: 'Euro / US Dollar', assetClass: 'Forex' },
      { symbol: 'GBPUSD', name: 'Great British Pound / USD', assetClass: 'Forex' },
      { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', assetClass: 'Forex' },
      { symbol: 'ES1!', name: 'E-mini S&P 500 Futures', assetClass: 'Futures' },
      { symbol: 'GC1!', name: 'Gold Futures', assetClass: 'Futures' },
      { symbol: 'CL1!', name: 'Crude Oil Futures', assetClass: 'Futures' },
      { symbol: 'SPX', name: 'S&P 500 Index', assetClass: 'Indices' },
      { symbol: 'IXIC', name: 'Nasdaq Composite', assetClass: 'Indices' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', assetClass: 'ETFs' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', assetClass: 'ETFs' },
    ] as const;

    return pool.map((item, idx): ScreenerAsset => {
      // Deterministic pseudo-random generation based on index
      const seed = idx * 17 + 42;
      const basePrice = item.assetClass === 'Forex' ? 1.2 + (seed % 10) * 0.1 : (seed % 400) + 15;
      const price = parseFloat(basePrice.toFixed(2));
      const volume = (seed % 500) * 25000 + 10000;
      const atr = parseFloat((price * 0.02 + 0.1).toFixed(2));
      const rsi = 25 + (seed % 55);
      const macd = seed % 3 === 0 ? 'Bullish Cross' : seed % 3 === 1 ? 'Bearish Cross' : 'Normal';
      const adx = 10 + (seed % 40);
      const superTrend = seed % 2 === 0 ? 'Buy' : 'Sell';
      const emaAlignment = seed % 3 === 0 ? 'Bullish' : seed % 3 === 1 ? 'Bearish' : 'Mixed';
      const vwap = parseFloat((price * 0.995).toFixed(2));
      const gapPct = parseFloat((((seed % 10) - 5) * 0.4).toFixed(2));
      const marketCap = (seed % 2000) * 150 + 500;
      const relativeVolume = parseFloat((0.4 + (seed % 25) * 0.1).toFixed(2));
      const newsScore = 30 + (seed % 65);
      const aiScore = 20 + (seed % 75);
      const institutionalScore = 40 + (seed % 55);
      const liquidity = seed % 3 === 0 ? 'High' : seed % 3 === 1 ? 'Medium' : 'Low';
      const spread = item.assetClass === 'Forex' ? 0.0001 : parseFloat((price * 0.0002).toFixed(4));

      return {
        symbol: item.symbol,
        name: item.name,
        assetClass: item.assetClass,
        price,
        volume,
        atr,
        rsi,
        macd,
        adx,
        superTrend,
        emaAlignment,
        vwap,
        gapPct,
        marketCap,
        relativeVolume,
        newsScore,
        aiScore,
        institutionalScore,
        liquidity,
        spread,
      };
    });
  }, []);

  // Filtered screener data
  const filteredData = useMemo(() => {
    return screenerData.filter((item) => {
      if (selectedAssetClass !== 'ALL' && item.assetClass !== selectedAssetClass) return false;

      // Price filters
      if (priceMin && item.price < parseFloat(priceMin)) return false;
      if (priceMax && item.price > parseFloat(priceMax)) return false;

      // RSI filters
      if (rsiMin && item.rsi < parseFloat(rsiMin)) return false;
      if (rsiMax && item.rsi > parseFloat(rsiMax)) return false;

      // SuperTrend
      if (superTrendFilter !== 'ALL' && item.superTrend !== superTrendFilter) return false;

      // EMA Alignment
      if (emaAlignFilter !== 'ALL' && item.emaAlignment !== emaAlignFilter) return false;

      // Volume
      if (minVolume && item.volume < parseInt(minVolume)) return false;

      // AI Score
      if (minAiScore && item.aiScore < parseInt(minAiScore)) return false;

      return true;
    });
  }, [screenerData, selectedAssetClass, priceMin, priceMax, rsiMin, rsiMax, superTrendFilter, emaAlignFilter, minVolume, minAiScore]);

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = [
      'Symbol', 'Name', 'Asset Class', 'Price', 'Volume', 'ATR', 'RSI', 'MACD', 'ADX',
      'SuperTrend', 'EMA Align', 'VWAP', 'Gap %', 'Market Cap (M)', 'Rel Vol',
      'News Score', 'AI Score', 'Inst Score', 'Liquidity', 'Spread'
    ];

    const rows = filteredData.map((a) => [
      a.symbol, a.name, a.assetClass, a.price, a.volume, a.atr, a.rsi, a.macd, a.adx,
      a.superTrend, a.emaAlignment, a.vwap, a.gapPct, a.marketCap, a.relativeVolume,
      a.newsScore, a.aiScore, a.institutionalScore, a.liquidity, a.spread
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trading_screener_export_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0d1322',
      color: '#fff',
      padding: '12px',
      gap: '10px',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
      fontSize: '11px',
    }}>
      {/* Top Banner and Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px' }}>
        <div>
          <strong style={{ fontSize: '13px', color: '#f5f5f7' }}>Central Screener Center</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>
            Filter stocks, crypto, forex, futures, indices, and ETFs by custom technical indicators and quantitative scores
          </span>
        </div>
        <button
          onClick={handleExportCSV}
          style={{
            background: '#d4af37',
            border: 'none',
            borderRadius: '3px',
            color: '#070b14',
            padding: '4px 10px',
            fontSize: '9px',
            fontWeight: 800,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          📥 Export CSV
        </button>
      </div>

      {/* Filters Toolbar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: '#070b14', padding: '8px', borderRadius: '4px', border: '1px solid #1b2235' }}>
        {/* Asset Class */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ color: '#8e8e93', fontSize: '9px' }}>Asset Class</label>
          <select
            value={selectedAssetClass}
            onChange={(e) => setSelectedAssetClass(e.target.value)}
            style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
          >
            <option value="ALL">All Assets</option>
            <option value="Stocks">Stocks</option>
            <option value="Crypto">Crypto</option>
            <option value="Forex">Forex</option>
            <option value="Futures">Futures</option>
            <option value="Indices">Indices</option>
            <option value="ETFs">ETFs</option>
          </select>
        </div>

        {/* Price Min/Max */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ color: '#8e8e93', fontSize: '9px' }}>Price Range</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              style={{ width: '55px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
            />
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              style={{ width: '55px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
            />
          </div>
        </div>

        {/* RSI Min/Max */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ color: '#8e8e93', fontSize: '9px' }}>RSI Range</label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="number"
              placeholder="Min"
              value={rsiMin}
              onChange={(e) => setRsiMin(e.target.value)}
              style={{ width: '50px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
            />
            <input
              type="number"
              placeholder="Max"
              value={rsiMax}
              onChange={(e) => setRsiMax(e.target.value)}
              style={{ width: '50px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
            />
          </div>
        </div>

        {/* SuperTrend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ color: '#8e8e93', fontSize: '9px' }}>SuperTrend</label>
          <select
            value={superTrendFilter}
            onChange={(e) => setSuperTrendFilter(e.target.value)}
            style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
          >
            <option value="ALL">ALL</option>
            <option value="Buy">Buy</option>
            <option value="Sell">Sell</option>
          </select>
        </div>

        {/* EMA Alignment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ color: '#8e8e93', fontSize: '9px' }}>EMA Alignment</label>
          <select
            value={emaAlignFilter}
            onChange={(e) => setEmaAlignFilter(e.target.value)}
            style={{ background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
          >
            <option value="ALL">ALL</option>
            <option value="Bullish">Bullish (EMA20 &gt; 50 &gt; 200)</option>
            <option value="Bearish">Bearish (EMA20 &lt; 50 &lt; 200)</option>
            <option value="Mixed">Mixed</option>
          </select>
        </div>

        {/* Min Vol */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ color: '#8e8e93', fontSize: '9px' }}>Min Volume</label>
          <input
            type="number"
            placeholder="e.g. 50000"
            value={minVolume}
            onChange={(e) => setMinVolume(e.target.value)}
            style={{ width: '80px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
          />
        </div>

        {/* AI Score */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <label style={{ color: '#8e8e93', fontSize: '9px' }}>Min AI Score</label>
          <input
            type="number"
            placeholder="Min Score"
            value={minAiScore}
            onChange={(e) => setMinAiScore(e.target.value)}
            style={{ width: '70px', background: '#0d1322', border: '1px solid #1b2235', color: '#fff', padding: '3px', borderRadius: '3px' }}
          />
        </div>
      </div>

      {/* Grid Container */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #1b2235', borderRadius: '4px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
          <thead>
            <tr style={{ background: '#070b14', borderBottom: '1px solid #1b2235', position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={{ padding: '6px 8px', color: '#8e8e93' }}>SYMBOL</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93' }}>ASSET CLASS</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>PRICE</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>GAP %</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>RSI</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93' }}>SUPERTREND</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93' }}>EMA ALIGN</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>ATR</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>ADX</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>REL VOL</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>AI SCORE</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>NEWS SCORE</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93', textAlign: 'right' }}>INST SCORE</th>
              <th style={{ padding: '6px 8px', color: '#8e8e93' }}>LIQUIDITY</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((asset, index) => {
              const rsiColor = asset.rsi > 70 ? '#ff4d57' : asset.rsi < 30 ? '#00c076' : '#fff';
              const trendColor = asset.superTrend === 'Buy' ? '#00c076' : '#ff4d57';
              const alignmentColor = asset.emaAlignment === 'Bullish' ? '#00c076' : asset.emaAlignment === 'Bearish' ? '#ff4d57' : '#ffb74d';
              const aiColor = asset.aiScore > 75 ? '#d4af37' : asset.aiScore < 40 ? '#8e8e93' : '#fff';

              return (
                <tr
                  key={asset.symbol}
                  style={{
                    background: index % 2 === 0 ? '#0d1322' : '#070b14',
                    borderBottom: '1px solid #1b2235',
                  }}
                >
                  <td style={{ padding: '6px 8px', fontWeight: 700 }}>{asset.symbol}</td>
                  <td style={{ padding: '6px 8px', color: '#8e8e93' }}>{asset.assetClass}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{asset.price}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: asset.gapPct >= 0 ? '#00c076' : '#ff4d57' }}>
                    {asset.gapPct >= 0 ? '+' : ''}{asset.gapPct}%
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: rsiColor, fontWeight: 600 }}>{asset.rsi}</td>
                  <td style={{ padding: '6px 8px', color: trendColor, fontWeight: 700 }}>{asset.superTrend}</td>
                  <td style={{ padding: '6px 8px', color: alignmentColor }}>{asset.emaAlignment}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{asset.atr}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{asset.adx}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{asset.relativeVolume}x</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: aiColor, fontWeight: 700 }}>{asset.aiScore}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{asset.newsScore}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{asset.institutionalScore}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '9px',
                      fontWeight: 700,
                      background: asset.liquidity === 'High' ? '#00c0761a' : asset.liquidity === 'Medium' ? '#ffb74d1a' : '#ff4d571a',
                      color: asset.liquidity === 'High' ? '#00c076' : asset.liquidity === 'Medium' ? '#ffb74d' : '#ff4d57',
                    }}>{asset.liquidity}</span>
                  </td>
                </tr>
              );
            })}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={14} style={{ padding: '24px', textAlign: 'center', color: '#8e8e93' }}>
                  No assets match the active screening criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScreenerPanel;
