// src/services/backtester.ts
import { ChartDataPoint } from './indicatorCalcs';
import { calculateEMA, calculateRSI, calculateMACD } from './indicatorCalcs';

export interface BacktestOrder {
  type: 'market' | 'limit' | 'stop';
  side: 'buy' | 'sell';
  price?: number;
  quantity: number;
}

export interface BacktestTrade {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  entryTime: number; // seconds
  exitTime: number; // seconds
  quantity: number;
  pnl: number;
  duration: string;
}

export interface EquityPoint {
  time: number;
  balance: number;
  drawdown: number;
}

export interface BacktestMetrics {
  totalTrades: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number; // %
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  expectancy?: number;
  maxDrawdown: number; // %
  avgRR: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  metrics: BacktestMetrics;
}

// Helper to format duration
const formatDuration = (sec: number): string => {
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m`;
};

export function runBacktest(
  symbol: string,
  candles: ChartDataPoint[],
  strategyPreset: 'ema_crossover' | 'rsi_reversal' | 'macd_trend' | 'breakout' | 'custom_visual',
  positionSize: number, // quantity units
  commissionPct: number, // e.g. 0.05 for 0.05%
  slippagePct: number, // e.g. 0.02 for 0.02%
  initialCapital = 10000
): BacktestResult {
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];

  if (candles.length < 30) {
    return {
      trades: [],
      equityCurve: [{ time: Date.now() / 1000, balance: initialCapital, drawdown: 0 }],
      metrics: { totalTrades: 0, netProfit: 0, grossProfit: 0, grossLoss: 0, winRate: 0, profitFactor: 0, sharpeRatio: 0, maxDrawdown: 0, avgRR: 0 }
    };
  }

  // Pre-calculate indicators
  const ema9 = calculateEMA(candles, 9);
  const ema21 = calculateEMA(candles, 21);
  const rsi = calculateRSI(candles, 14);
  const macd = calculateMACD(candles);

  const ema9Map = new Map(ema9.map(p => [p.time, p.value]));
  const ema21Map = new Map(ema21.map(p => [p.time, p.value]));
  const rsiMap = new Map(rsi.map(p => [p.time, p.value]));
  const macdMap = new Map(macd.macd.map(p => [p.time, p.value]));
  const signalMap = new Map(macd.signal.map(p => [p.time, p.value]));

  let currentPosition: {
    side: 'long' | 'short';
    entryPrice: number;
    entryTime: number;
    quantity: number;
  } | null = null;

  let balance = initialCapital;
  let peakBalance = initialCapital;
  let maxDrawdown = 0;

  // Add initial equity curve point
  equityCurve.push({
    time: candles[0].time,
    balance: balance,
    drawdown: 0
  });

  // Loop through candles starting from index 20 (after indicator warmup)
  for (let i = 25; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    const currentEma9 = ema9Map.get(c.time);
    const currentEma21 = ema21Map.get(c.time);
    const prevEma9 = ema9Map.get(prevC.time);
    const prevEma21 = ema21Map.get(prevC.time);

    const currentRsi = rsiMap.get(c.time);
    const prevRsi = rsiMap.get(prevC.time);

    const currentMacd = macdMap.get(c.time);
    const currentSignal = signalMap.get(c.time);
    const prevMacd = macdMap.get(prevC.time);
    const prevSignal = signalMap.get(prevC.time);

    let signal: 'buy' | 'sell' | null = null;

    // Strategy Trigger rules
    if (strategyPreset === 'ema_crossover') {
      if (currentEma9 && currentEma21 && prevEma9 && prevEma21) {
        if (prevEma9 <= prevEma21 && currentEma9 > currentEma21) {
          signal = 'buy';
        } else if (prevEma9 >= prevEma21 && currentEma9 < currentEma21) {
          signal = 'sell';
        }
      }
    } else if (strategyPreset === 'rsi_reversal') {
      if (currentRsi && prevRsi) {
        if (prevRsi <= 30 && currentRsi > 30) {
          signal = 'buy';
        } else if (prevRsi >= 70 && currentRsi < 70) {
          signal = 'sell';
        }
      }
    } else if (strategyPreset === 'macd_trend') {
      if (currentMacd && currentSignal && prevMacd && prevSignal) {
        if (prevMacd <= prevSignal && currentMacd > currentSignal) {
          signal = 'buy';
        } else if (prevMacd >= prevSignal && currentMacd < currentSignal) {
          signal = 'sell';
        }
      }
    } else if (strategyPreset === 'breakout') {
      // 20-period high/low breakout
      let high20 = -Infinity;
      let low20 = Infinity;
      for (let j = i - 20; j < i; j++) {
        if (candles[j].high > high20) high20 = candles[j].high;
        if (candles[j].low < low20) low20 = candles[j].low;
      }
      if (c.close > high20) {
        signal = 'buy';
      } else if (c.close < low20) {
        signal = 'sell';
      }
    }

    // Trade execution simulation
    const slippage = c.close * (slippagePct / 100);
    const commission = c.close * positionSize * (commissionPct / 100);

    if (signal === 'buy') {
      // If short position open, close it first
      if (currentPosition && currentPosition.side === 'short') {
        const exitPrice = c.close + slippage;
        const grossPnl = (currentPosition.entryPrice - exitPrice) * currentPosition.quantity;
        const pnl = grossPnl - commission - (currentPosition.entryPrice * currentPosition.quantity * (commissionPct / 100));
        
        balance += pnl;
        trades.push({
          symbol,
          side: 'short',
          entryPrice: currentPosition.entryPrice,
          exitPrice,
          entryTime: currentPosition.entryTime,
          exitTime: c.time,
          quantity: currentPosition.quantity,
          pnl,
          duration: formatDuration(c.time - currentPosition.entryTime)
        });
        currentPosition = null;
      }
      // Open long position if not already open
      if (!currentPosition) {
        currentPosition = {
          side: 'long',
          entryPrice: c.close + slippage,
          entryTime: c.time,
          quantity: positionSize
        };
      }
    } else if (signal === 'sell') {
      // If long position open, close it first
      if (currentPosition && currentPosition.side === 'long') {
        const exitPrice = c.close - slippage;
        const grossPnl = (exitPrice - currentPosition.entryPrice) * currentPosition.quantity;
        const pnl = grossPnl - commission - (currentPosition.entryPrice * currentPosition.quantity * (commissionPct / 100));

        balance += pnl;
        trades.push({
          symbol,
          side: 'long',
          entryPrice: currentPosition.entryPrice,
          exitPrice,
          entryTime: currentPosition.entryTime,
          exitTime: c.time,
          quantity: currentPosition.quantity,
          pnl,
          duration: formatDuration(c.time - currentPosition.entryTime)
        });
        currentPosition = null;
      }
      // Open short position if not already open
      if (!currentPosition) {
        currentPosition = {
          side: 'short',
          entryPrice: c.close - slippage,
          entryTime: c.time,
          quantity: positionSize
        };
      }
    }

    // Update equity stats
    if (balance > peakBalance) peakBalance = balance;
    const currentDrawdown = ((peakBalance - balance) / peakBalance) * 100;
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

    equityCurve.push({
      time: c.time,
      balance: balance,
      drawdown: currentDrawdown
    });
  }

  // Close any remaining position at final candle
  if (currentPosition) {
    const finalCandle = candles[candles.length - 1];
    const slippage = finalCandle.close * (slippagePct / 100);
    const commission = finalCandle.close * positionSize * (commissionPct / 100);
    const exitPrice = currentPosition.side === 'long' ? finalCandle.close - slippage : finalCandle.close + slippage;
    
    const grossPnl = currentPosition.side === 'long'
      ? (exitPrice - currentPosition.entryPrice) * currentPosition.quantity
      : (currentPosition.entryPrice - exitPrice) * currentPosition.quantity;
      
    const pnl = grossPnl - commission - (currentPosition.entryPrice * currentPosition.quantity * (commissionPct / 100));
    balance += pnl;

    trades.push({
      symbol,
      side: currentPosition.side,
      entryPrice: currentPosition.entryPrice,
      exitPrice,
      entryTime: currentPosition.entryTime,
      exitTime: finalCandle.time,
      quantity: currentPosition.quantity,
      pnl,
      duration: formatDuration(finalCandle.time - currentPosition.entryTime)
    });
  }

  // Calculate Metrics
  const totalTrades = trades.length;
  let grossProfit = 0;
  let grossLoss = 0;
  const wins: number[] = [];
  const losses: number[] = [];

  trades.forEach(t => {
    if (t.pnl > 0) {
      grossProfit += t.pnl;
      wins.push(t.pnl);
    } else {
      grossLoss += Math.abs(t.pnl);
      losses.push(Math.abs(t.pnl));
    }
  });

  const netProfit = balance - initialCapital;
  const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;

  // Simple Sharpe Ratio (using trade returns standard deviation)
  const returns = trades.map(t => t.pnl / initialCapital);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / (totalTrades || 1);
  const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (totalTrades || 1);
  const stdDev = Math.sqrt(variance) || 1;
  const sharpeRatio = avgReturn / stdDev * Math.sqrt(252); // simplified annualized representation

  // Sortino Ratio (downside deviation)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.reduce((a, b) => a + Math.pow(b, 2), 0) / (downsideReturns.length || 1);
  const downsideStdDev = Math.sqrt(downsideVariance) || 0.0001;
  const sortinoRatio = (avgReturn / downsideStdDev) * Math.sqrt(252);

  // Calmar Ratio (annualized return / max drawdown)
  const calmarRatio = maxDrawdown > 0 ? (netProfit / initialCapital) / (maxDrawdown / 100) : netProfit / initialCapital;

  // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const lossRate = totalTrades > 0 ? (losses.length / totalTrades) : 0;
  const expectancy = ((winRate / 100) * avgWin) - (lossRate * avgLoss);

  // Average Risk/Reward ratio
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : avgWin;

  return {
    trades,
    equityCurve,
    metrics: {
      totalTrades,
      netProfit,
      grossProfit,
      grossLoss,
      winRate,
      profitFactor,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      expectancy,
      maxDrawdown,
      avgRR
    }
  };
}

export interface MonteCarloStats {
  runs: number;
  probOfDrawdownExceeded: number;
  expectedProfit: number;
  medianDrawdown: number;
  percentile5: number;
  percentile95: number;
  equityPaths: number[][];
}

export function runMonteCarlo(
  trades: BacktestTrade[],
  initialCapital: number,
  runs = 1000,
  drawdownThreshold = 20.0
): MonteCarloStats {
  if (trades.length === 0) {
    return { runs, probOfDrawdownExceeded: 0, expectedProfit: 0, medianDrawdown: 0, percentile5: initialCapital, percentile95: initialCapital, equityPaths: [] };
  }

  const paths: number[][] = [];
  const terminalEquities: number[] = [];
  const maxDrawdowns: number[] = [];
  let ddExceededCount = 0;

  for (let r = 0; r < runs; r++) {
    let balance = initialCapital;
    let peak = initialCapital;
    let maxDD = 0;
    const path: number[] = [balance];

    for (let t = 0; t < trades.length; t++) {
      const randomTrade = trades[Math.floor(Math.random() * trades.length)];
      balance += randomTrade.pnl;
      if (balance > peak) peak = balance;
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
      path.push(balance);
    }
    
    if (maxDD > drawdownThreshold) {
      ddExceededCount++;
    }
    
    terminalEquities.push(balance);
    maxDrawdowns.push(maxDD);
    
    if (r < 10) {
      paths.push(path);
    }
  }

  terminalEquities.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => a - b);

  const expectedProfit = terminalEquities.reduce((a, b) => a + b, 0) / runs - initialCapital;
  const medianDrawdown = maxDrawdowns[Math.floor(runs / 2)];
  const percentile5 = terminalEquities[Math.floor(runs * 0.05)];
  const percentile95 = terminalEquities[Math.floor(runs * 0.95)];

  return {
    runs,
    probOfDrawdownExceeded: (ddExceededCount / runs) * 100,
    expectedProfit,
    medianDrawdown,
    percentile5,
    percentile95,
    equityPaths: paths,
  };
}

export interface OptimizationResult {
  shortEma: number;
  longEma: number;
  netProfit: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export function runParameterSweep(
  symbol: string,
  candles: ChartDataPoint[],
  shortRange: number[],
  longRange: number[],
  positionSize: number,
  commissionPct: number,
  slippagePct: number,
  initialCapital = 10000
): OptimizationResult[] {
  const results: OptimizationResult[] = [];

  for (const short of shortRange) {
    for (const long of longRange) {
      if (short >= long) continue;
      
      const emaShort = calculateEMA(candles, short);
      const emaLong = calculateEMA(candles, long);
      
      const shortMap = new Map(emaShort.map(p => [p.time, p.value]));
      const longMap = new Map(emaLong.map(p => [p.time, p.value]));
      
      let balance = initialCapital;
      let peak = initialCapital;
      let maxDD = 0;
      let winCount = 0;
      let tradeCount = 0;
      let currentPos: { entryPrice: number; side: 'long' | 'short' } | null = null;
      
      const returns: number[] = [];

      for (let i = long + 5; i < candles.length; i++) {
        const c = candles[i];
        const prevC = candles[i - 1];
        
        const currShort = shortMap.get(c.time);
        const currLong = longMap.get(c.time);
        const prevShort = shortMap.get(prevC.time);
        const prevLong = longMap.get(prevC.time);
        
        let signal: 'buy' | 'sell' | null = null;
        if (currShort && currLong && prevShort && prevLong) {
          if (prevShort <= prevLong && currShort > currLong) signal = 'buy';
          else if (prevShort >= prevLong && currShort < currLong) signal = 'sell';
        }
        
        const slippage = c.close * (slippagePct / 100);
        const commission = c.close * positionSize * (commissionPct / 100);
        
        if (signal === 'buy') {
          if (currentPos && currentPos.side === 'short') {
            const exit = c.close + slippage;
            const pnl = (currentPos.entryPrice - exit) * positionSize - commission - (currentPos.entryPrice * positionSize * (commissionPct / 100));
            balance += pnl;
            returns.push(pnl / initialCapital);
            if (pnl > 0) winCount++;
            tradeCount++;
            currentPos = null;
          }
          if (!currentPos) {
            currentPos = { entryPrice: c.close + slippage, side: 'long' };
          }
        } else if (signal === 'sell') {
          if (currentPos && currentPos.side === 'long') {
            const exit = c.close - slippage;
            const pnl = (exit - currentPos.entryPrice) * positionSize - commission - (currentPos.entryPrice * positionSize * (commissionPct / 100));
            balance += pnl;
            returns.push(pnl / initialCapital);
            if (pnl > 0) winCount++;
            tradeCount++;
            currentPos = null;
          }
          if (!currentPos) {
            currentPos = { entryPrice: c.close - slippage, side: 'short' };
          }
        }
        
        if (balance > peak) peak = balance;
        const dd = ((peak - balance) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
      }
      
      const netProfit = balance - initialCapital;
      const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0;
      
      const avgReturn = returns.reduce((a, b) => a + b, 0) / (tradeCount || 1);
      const varReturn = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / (tradeCount || 1);
      const stdDev = Math.sqrt(varReturn) || 1;
      const sharpeRatio = avgReturn / stdDev * Math.sqrt(252);
      
      results.push({
        shortEma: short,
        longEma: long,
        netProfit,
        winRate,
        maxDrawdown: maxDD,
        sharpeRatio: isNaN(sharpeRatio) ? 0 : sharpeRatio
      });
    }
  }
  
  return results.sort((a, b) => b.netProfit - a.netProfit);
}

export interface WalkForwardPeriod {
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
  bestShort: number;
  bestLong: number;
  testNetProfit: number;
  testDrawdown: number;
}

export function runWalkForward(
  symbol: string,
  candles: ChartDataPoint[],
  segmentsCount = 4,
  positionSize: number,
  commissionPct: number,
  slippagePct: number,
  initialCapital = 10000
): WalkForwardPeriod[] {
  const periods: WalkForwardPeriod[] = [];
  const totalLength = candles.length;
  if (totalLength < 100) return [];

  const segmentLength = Math.floor(totalLength / (segmentsCount + 1));
  
  for (let s = 0; s < segmentsCount; s++) {
    const trainStartIdx = s * segmentLength;
    const trainEndIdx = trainStartIdx + segmentLength * 2;
    const testStartIdx = trainEndIdx;
    const testEndIdx = Math.min(totalLength - 1, testStartIdx + segmentLength);
    
    if (testStartIdx >= totalLength) break;
    
    const trainCandles = candles.slice(trainStartIdx, trainEndIdx);
    const testCandles = candles.slice(testStartIdx, testEndIdx);
    
    if (trainCandles.length < 30 || testCandles.length < 10) continue;
    
    const sweep = runParameterSweep(
      symbol,
      trainCandles,
      [5, 9, 12, 15],
      [20, 21, 26, 30, 50],
      positionSize,
      commissionPct,
      slippagePct,
      initialCapital
    );
    
    const bestParam = sweep[0] || { shortEma: 9, longEma: 21 };
    
    const emaShort = calculateEMA(candles, bestParam.shortEma);
    const emaLong = calculateEMA(candles, bestParam.longEma);
    
    const shortMap = new Map(emaShort.map(p => [p.time, p.value]));
    const longMap = new Map(emaLong.map(p => [p.time, p.value]));
    
    let balance = initialCapital;
    let peak = initialCapital;
    let maxDD = 0;
    let currentPos: { entryPrice: number; side: 'long' | 'short' } | null = null;
    
    for (let i = testStartIdx; i <= testEndIdx; i++) {
      const c = candles[i];
      const prevC = candles[i - 1];
      if (!prevC) continue;
      
      const currShort = shortMap.get(c.time);
      const currLong = longMap.get(c.time);
      const prevShort = shortMap.get(prevC.time);
      const prevLong = longMap.get(prevC.time);
      
      let signal: 'buy' | 'sell' | null = null;
      if (currShort && currLong && prevShort && prevLong) {
        if (prevShort <= prevLong && currShort > currLong) signal = 'buy';
        else if (prevShort >= prevLong && currShort < currLong) signal = 'sell';
      }
      
      const slippage = c.close * (slippagePct / 100);
      const commission = c.close * positionSize * (commissionPct / 100);
      
      if (signal === 'buy') {
        if (currentPos && currentPos.side === 'short') {
          const exit = c.close + slippage;
          balance += (currentPos.entryPrice - exit) * positionSize - commission - (currentPos.entryPrice * positionSize * (commissionPct / 100));
          currentPos = null;
        }
        if (!currentPos) {
          currentPos = { entryPrice: c.close + slippage, side: 'long' };
        }
      } else if (signal === 'sell') {
        if (currentPos && currentPos.side === 'long') {
          const exit = c.close - slippage;
          balance += (exit - currentPos.entryPrice) * positionSize - commission - (currentPos.entryPrice * positionSize * (commissionPct / 100));
          currentPos = null;
        }
        if (!currentPos) {
          currentPos = { entryPrice: c.close - slippage, side: 'short' };
        }
      }
      
      if (balance > peak) peak = balance;
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
    
    periods.push({
      trainStart: candles[trainStartIdx].time,
      trainEnd: candles[trainEndIdx].time,
      testStart: candles[testStartIdx].time,
      testEnd: candles[testEndIdx].time,
      bestShort: bestParam.shortEma,
      bestLong: bestParam.longEma,
      testNetProfit: balance - initialCapital,
      testDrawdown: maxDD
    });
  }
  
  return periods;
}

export const runBacktestAsync = (
  symbol: string,
  candles: ChartDataPoint[],
  strategyPreset: 'ema_crossover' | 'rsi_reversal' | 'macd_trend' | 'breakout' | 'custom_visual',
  positionSize: number,
  commissionPct: number,
  slippagePct: number,
  initialCapital = 10000
): Promise<BacktestResult> => {
  return new Promise((resolve, reject) => {
    if (typeof Worker !== 'undefined') {
      try {
        const workerCode = `
          const formatDuration = ${formatDuration.toString()};
          const calculateEMA = ${calculateEMA.toString()};
          const calculateRSI = ${calculateRSI.toString()};
          const calculateMACD = ${calculateMACD.toString()};
          const runBacktest = ${runBacktest.toString()};

          self.onmessage = function(e) {
            try {
              const { symbol, candles, strategyPreset, positionSize, commissionPct, slippagePct, initialCapital } = e.data;
              const res = runBacktest(symbol, candles, strategyPreset, positionSize, commissionPct, slippagePct, initialCapital);
              self.postMessage({ success: true, result: res });
            } catch (err) {
              self.postMessage({ success: false, error: err.message });
            }
          };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        worker.onmessage = (e) => {
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
          worker.terminate();
        };

        worker.onerror = (err) => {
          reject(err);
          worker.terminate();
        };

        worker.postMessage({
          symbol,
          candles,
          strategyPreset,
          positionSize,
          commissionPct,
          slippagePct,
          initialCapital,
        });
      } catch (err) {
        // Blob worker instantiation fallback
        try {
          const res = runBacktest(symbol, candles, strategyPreset, positionSize, commissionPct, slippagePct, initialCapital);
          resolve(res);
        } catch (e) {
          reject(e);
        }
      }
    } else {
      try {
        const res = runBacktest(symbol, candles, strategyPreset, positionSize, commissionPct, slippagePct, initialCapital);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    }
  });
};
