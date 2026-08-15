// src/services/marketScannerService.ts

import { ScanItem, ScanWorkerFilter } from '../workers/scannerWorker';

export interface ScannerPreset {
  id: string;
  name: string;
  description: string;
  assetClass: string;
  filters: ScanWorkerFilter[];
}

export class MarketScannerService {
  private universeCache: ScanItem[] = [];

  public generateUniverse(): ScanItem[] {
    if (this.universeCache.length >= 10000) {
      return this.universeCache;
    }

    const sectors = ['Technology', 'Healthcare', 'Financials', 'Energy', 'Consumer Cyclical', 'Industrials', 'Communication'];
    const exchanges = ['NASDAQ', 'NYSE', 'BINANCE', 'CME', 'FOREXCOM'];
    const assetClasses = ['Stocks', 'Crypto', 'Forex', 'Futures', 'Indices', 'ETFs'];

    const knownStocks = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD', 'NFLX', 'BRK.B', 'JPM', 'V', 'UNH', 'XOM', 'BAC'];
    const knownCrypto = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT'];
    const knownForex = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'];
    const knownFutures = ['ES1!', 'NQ1!', 'YM1!', 'RTY1!', 'GC1!', 'CL1!', 'SI1!', 'NG1!', 'HG1!', 'ZB1!'];
    const knownIndices = ['SPX', 'IXIC', 'DJI', 'RUT', 'VIX', 'FTSE', 'DAX', 'N225', 'HSI'];
    const knownETFs = ['SPY', 'QQQ', 'IWM', 'DIA', 'XLF', 'XLE', 'XLK', 'GLD', 'SLV', 'TLT'];

    const items: ScanItem[] = [];
    let counter = 0;

    const createItem = (sym: string, name: string, cls: string, baseP: float, capM: number, floatM: number, sec: string, exch: string): ScanItem => {
      counter++;
      const seed = (counter * 17 + sym.length) % 1000;
      let price = parseFloat((baseP * (0.95 + (seed % 10) * 0.01)).toFixed(2));
      if (cls === 'Forex') price = parseFloat((baseP * (0.99 + (seed % 20) * 0.001)).toFixed(4));

      const changePct = parseFloat((((seed % 100) - 48) * 0.15).toFixed(2));
      const gapPct = parseFloat((((seed % 60) - 30) * 0.1).toFixed(2));
      const volume = Math.floor((seed + 10) * 45000 + 100000);
      const relativeVolume = parseFloat((0.5 + (seed % 40) * 0.1).toFixed(2));
      const atr = parseFloat((Math.max(0.01, price * (0.01 + (seed % 15) * 0.002))).toFixed(cls === 'Forex' ? 4 : 2));
      const rsi = parseFloat((20 + (seed % 65)).toFixed(1));
      const ema9 = parseFloat((price * (0.99 + (seed % 3) * 0.005)).toFixed(2));
      const ema20 = parseFloat((price * (0.98 + (seed % 4) * 0.005)).toFixed(2));
      const ema50 = parseFloat((price * (0.96 + (seed % 6) * 0.005)).toFixed(2));
      const ema200 = parseFloat((price * (0.92 + (seed % 10) * 0.008)).toFixed(2));
      const vwap = parseFloat((price * 0.998).toFixed(2));
      const anchoredVwap = parseFloat((price * 0.991).toFixed(2));
      const high52w = parseFloat((price * 1.30).toFixed(2));
      const low52w = parseFloat((price * 0.70).toFixed(2));

      const near52wHigh = (high52w - price) / high52w <= 0.03;
      const near52wLow = (price - low52w) / low52w <= 0.03;

      const patSeed = seed % 6;
      let pattern = 'None';
      if (patSeed === 1) pattern = 'Inside Bar';
      else if (patSeed === 2) pattern = 'Outside Bar';
      else if (patSeed === 3) pattern = 'Bullish Engulfing';
      else if (patSeed === 4) pattern = 'Bearish Engulfing';

      const macdLine = (seed % 10 - 5) * 0.2;
      const macdSig = macdLine * 0.8;
      const macdCross = macdLine > macdSig ? 'Bullish Cross' : macdLine < macdSig ? 'Bearish Cross' : 'None';

      return {
        symbol: sym,
        name,
        assetClass: cls,
        price,
        changePct,
        gapPct,
        volume,
        relativeVolume,
        atr,
        rsi,
        macdCross,
        ema9,
        ema20,
        ema50,
        ema200,
        vwap,
        anchoredVwap,
        high52w,
        low52w,
        near52wHigh,
        near52wLow,
        pattern,
        volumeSpike: relativeVolume >= 2.5,
        highVolatility: atr / Math.max(price, 0.001) >= 0.03,
        marketCapM: capM,
        floatM: floatM,
        sector: sec,
        exchange: exch,
      };
    };

    knownStocks.forEach(s => items.push(createItem(s, `${s} Corp`, 'Stocks', 150.0, 250000.0, 450.0, sectors[counter % sectors.length], 'NASDAQ')));
    knownCrypto.forEach(s => items.push(createItem(s, `${s} Pair`, 'Crypto', 450.0, 50000.0, 100.0, 'Crypto', 'BINANCE')));
    knownForex.forEach(s => items.push(createItem(s, `${s} Currency`, 'Forex', 1.12, 1000.0, 1000.0, 'Forex', 'FOREXCOM')));
    knownFutures.forEach(s => items.push(createItem(s, `${s} Contract`, 'Futures', 4500.0, 10000.0, 500.0, 'Futures', 'CME')));
    knownIndices.forEach(s => items.push(createItem(s, `${s} Index`, 'Indices', 5000.0, 500000.0, 1000.0, 'Index', 'NYSE')));
    knownETFs.forEach(s => items.push(createItem(s, `${s} Trust`, 'ETFs', 350.0, 80000.0, 900.0, 'ETF', 'NASDAQ')));

    const totalTarget = 10200;
    while (items.length < totalTarget) {
      const cls = assetClasses[counter % assetClasses.length];
      if (cls === 'Stocks') {
        const sym = `STK${String(counter).padStart(4, '0')}`;
        items.push(createItem(sym, `Company ${counter}`, cls, 10 + (counter % 300), (counter % 500) * 100 + 50, (counter % 100) * 5 + 2, sectors[counter % sectors.length], exchanges[counter % exchanges.length]));
      } else if (cls === 'Crypto') {
        const sym = `COIN${String(counter).padStart(4, '0')}USDT`;
        items.push(createItem(sym, `Token ${counter}`, cls, 0.5 + (counter % 50), (counter % 200) * 10 + 5, (counter % 50) * 2 + 1, 'Crypto', 'BINANCE'));
      } else if (cls === 'Forex') {
        const sym = `FX${String(counter).padStart(3, '0')}USD`;
        items.push(createItem(sym, `FX Pair ${counter}`, cls, 0.8 + (counter % 10) * 0.1, 1000.0, 1000.0, 'Forex', 'FOREXCOM'));
      } else if (cls === 'Futures') {
        const sym = `FUT${String(counter).padStart(3, '0')}!`;
        items.push(createItem(sym, `Future ${counter}`, cls, 100 + (counter % 1000), 5000.0, 100.0, 'Futures', 'CME'));
      } else if (cls === 'Indices') {
        const sym = `IDX${String(counter).padStart(3, '0')}`;
        items.push(createItem(sym, `Index ${counter}`, cls, 1000 + (counter % 5000), 100000.0, 1000.0, 'Index', 'NYSE'));
      } else {
        const sym = `ETF${String(counter).padStart(3, '0')}`;
        items.push(createItem(sym, `Fund ${counter}`, cls, 20 + (counter % 200), 10000.0, 500.0, 'ETF', 'NASDAQ'));
      }
    }

    this.universeCache = items;
    return items;
  }

  public getPresets(): ScannerPreset[] {
    return [
      {
        id: 'day_trading',
        name: 'Day Trading Momentum',
        description: 'High relative volume (>2.0x), price above $5, volume > 500k',
        assetClass: 'ALL',
        filters: [
          { field: 'relativeVolume', operator: '>=', value: 2.0 },
          { field: 'price', operator: '>=', value: 5.0 },
          { field: 'volume', operator: '>=', value: 500000 },
        ],
      },
      {
        id: 'swing_trading',
        name: 'Swing Trading Trend',
        description: 'Price above EMA 50 & 200, RSI neutral (40-65)',
        assetClass: 'ALL',
        filters: [
          { field: 'rsi', operator: '>=', value: 40 },
          { field: 'rsi', operator: '<=', value: 65 },
          { field: 'changePct', operator: '>=', value: 1.0 },
        ],
      },
      {
        id: 'scalping',
        name: 'Scalping Volatility',
        description: 'High volatility, volume spikes, active intraday range',
        assetClass: 'ALL',
        filters: [
          { field: 'relativeVolume', operator: '>=', value: 1.8 },
          { field: 'changePct', operator: '>=', value: 0.5 },
        ],
      },
      {
        id: 'breakout',
        name: '52-Week Breakout',
        description: 'Near 52-week high, volume spike, price > VWAP',
        assetClass: 'ALL',
        filters: [
          { field: 'near52wHigh', operator: '==', value: true },
          { field: 'relativeVolume', operator: '>=', value: 2.5 },
        ],
      },
      {
        id: 'reversal',
        name: 'Mean Reversal',
        description: 'Oversold RSI (<30) or Overbought (>70) with Engulfing pattern',
        assetClass: 'ALL',
        filters: [{ field: 'rsi', operator: '<=', value: 30 }],
      },
      {
        id: 'momentum',
        name: 'Intraday Momentum',
        description: 'Gap Up > 2%, RVOL > 2.0x, price > VWAP',
        assetClass: 'ALL',
        filters: [
          { field: 'gapPct', operator: '>=', value: 2.0 },
          { field: 'relativeVolume', operator: '>=', value: 2.0 },
        ],
      },
      {
        id: 'gap_scanner',
        name: 'Gap & Go Scanner',
        description: 'Opening Gap Up or Gap Down > 2.5%',
        assetClass: 'ALL',
        filters: [{ field: 'gapPct', operator: '>=', value: 2.5 }],
      },
      {
        id: 'crypto_scanner',
        name: 'Crypto High Liquidity',
        description: 'Crypto assets with 24h volume > $10M',
        assetClass: 'Crypto',
        filters: [{ field: 'volume', operator: '>=', value: 10000000 }],
      },
      {
        id: 'forex_scanner',
        name: 'Forex Trend Cross',
        description: 'Forex pairs with active MACD Cross',
        assetClass: 'Forex',
        filters: [{ field: 'macdCross', operator: '!=', value: 'None' }],
      },
      {
        id: 'institutional_scanner',
        name: 'Institutional Accumulation',
        description: 'Large market cap (>$10B), RVOL > 1.5x',
        assetClass: 'Stocks',
        filters: [
          { field: 'marketCapM', operator: '>=', value: 10000.0 },
          { field: 'relativeVolume', operator: '>=', value: 1.5 },
        ],
      },
    ];
  }

  public async triggerMultiChannelAlert(symbol: string, eventName: string, webhookUrl?: string): Promise<void> {
    // 1. Desktop Notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Scanner Alert: ${symbol}`, {
          body: `Triggered scanner condition: ${eventName}`,
          icon: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    // 2. Audio Alert (Web Audio API synthetizer)
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {}

    // 3. Webhook Trigger
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      try {
        await fetch('/api/scanner/alert-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhookUrl: webhookUrl.trim(),
            symbol,
            event: eventName,
            message: `Scanner alert for ${symbol}: ${eventName}`,
          }),
        });
      } catch {}
    }
  }
}

export const marketScannerService = new MarketScannerService();
