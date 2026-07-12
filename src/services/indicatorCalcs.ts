// src/services/indicatorCalcs.ts

export interface ChartDataPoint {
  time: number; // UTCTimestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SeriesPoint {
  time: number;
  value: number;
}

export interface MACDResult {
  macd: SeriesPoint[];
  signal: SeriesPoint[];
  histogram: SeriesPoint[];
}

export interface BBResult {
  upper: SeriesPoint[];
  middle: SeriesPoint[];
  lower: SeriesPoint[];
}

const calcCache = new Map<string, any>();

// 0. SMA (Simple Moving Average)
export function calculateSMA(data: ChartDataPoint[], period: number): SeriesPoint[] {
  if (data.length < period) return [];
  const key = `sma_${period}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const result: SeriesPoint[] = [];
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  result.push({ time: data[period - 1].time, value: sum / period });

  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period].close + data[i].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  calcCache.set(key, result);
  return result;
}

// 1. EMA (Exponential Moving Average)
export function calculateEMA(data: ChartDataPoint[], period: number): SeriesPoint[] {
  if (data.length < period) return [];
  const key = `ema_${period}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const result: SeriesPoint[] = [];
  const k = 2 / (period + 1);
  
  // Calculate first SMA as initial EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  result.push({ time: data[period - 1].time, value: prevEma });

  for (let i = period; i < data.length; i++) {
    const emaVal = (data[i].close - prevEma) * k + prevEma;
    result.push({ time: data[i].time, value: emaVal });
    prevEma = emaVal;
  }

  calcCache.set(key, result);
  return result;
}

// 2. VWAP (Volume Weighted Average Price)
export function calculateVWAP(data: ChartDataPoint[]): SeriesPoint[] {
  if (data.length === 0) return [];
  const key = `vwap_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const result: SeriesPoint[] = [];
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const typicalPrice = (d.high + d.low + d.close) / 3;
    const tpv = typicalPrice * d.volume;

    cumulativeTypicalPriceVolume += tpv;
    cumulativeVolume += d.volume;

    if (cumulativeVolume > 0) {
      result.push({
        time: d.time,
        value: cumulativeTypicalPriceVolume / cumulativeVolume
      });
    }
  }

  calcCache.set(key, result);
  return result;
}

// 3. RSI (Relative Strength Index)
export function calculateRSI(data: ChartDataPoint[], period = 14): SeriesPoint[] {
  if (data.length <= period) return [];
  const key = `rsi_${period}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const result: SeriesPoint[] = [];
  let gains = 0;
  let losses = 0;

  // First RSI value calculations
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgGain / (avgLoss || 1);
  result.push({ time: data[period].time, value: 100 - 100 / (1 + rs) });

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    rs = avgGain / (avgLoss || 1);
    result.push({ time: data[i].time, value: 100 - 100 / (1 + rs) });
  }

  calcCache.set(key, result);
  return result;
}

// 4. MACD (Moving Average Convergence Divergence)
export function calculateMACD(
  data: ChartDataPoint[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  if (data.length < slowPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }
  const key = `macd_${fastPeriod}_${slowPeriod}_${signalPeriod}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const macdPoints: SeriesPoint[] = [];
  const signalPoints: SeriesPoint[] = [];
  const histogramPoints: SeriesPoint[] = [];

  // Calculate EMAs for Fast and Slow periods
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);

  // Align timestamps to compute MACD Line
  const slowMap = new Map<number, number>();
  emaSlow.forEach(pt => slowMap.set(pt.time, pt.value));

  emaFast.forEach(fastPt => {
    const slowVal = slowMap.get(fastPt.time);
    if (slowVal !== undefined) {
      macdPoints.push({
        time: fastPt.time,
        value: fastPt.value - slowVal
      });
    }
  });

  if (macdPoints.length < signalPeriod) {
    const res = { macd: macdPoints, signal: [], histogram: [] };
    calcCache.set(key, res);
    return res;
  }

  // MACD Signal line is a signalPeriod EMA of the MACD line
  const tempChartData: ChartDataPoint[] = macdPoints.map(pt => ({
    time: pt.time,
    close: pt.value,
    open: pt.value,
    high: pt.value,
    low: pt.value,
    volume: 0
  }));

  const signalLine = calculateEMA(tempChartData, signalPeriod);
  const signalMap = new Map<number, number>();
  signalLine.forEach(pt => signalMap.set(pt.time, pt.value));

  macdPoints.forEach(macdPt => {
    const sigVal = signalMap.get(macdPt.time);
    if (sigVal !== undefined) {
      signalPoints.push({ time: macdPt.time, value: sigVal });
      histogramPoints.push({ time: macdPt.time, value: macdPt.value - sigVal });
    }
  });

  const res = {
    macd: macdPoints.filter(p => signalMap.has(p.time)),
    signal: signalPoints,
    histogram: histogramPoints
  };
  calcCache.set(key, res);
  return res;
}

// 5. Bollinger Bands
export function calculateBollingerBands(data: ChartDataPoint[], period = 20, multiplier = 2): BBResult {
  if (data.length < period) return { upper: [], middle: [], lower: [] };
  const key = `bb_${period}_${multiplier}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const upper: SeriesPoint[] = [];
  const middle: SeriesPoint[] = [];
  const lower: SeriesPoint[] = [];

  for (let i = period - 1; i < data.length; i++) {
    // 20-period SMA
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    const sma = sum / period;

    // Standard deviation
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(data[j].close - sma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    const time = data[i].time;
    middle.push({ time, value: sma });
    upper.push({ time, value: sma + multiplier * stdDev });
    lower.push({ time, value: sma - multiplier * stdDev });
  }

  const res = { upper, middle, lower };
  calcCache.set(key, res);
  return res;
}

// 6. ATR (Average True Range)
export function calculateATR(data: ChartDataPoint[], period = 14): SeriesPoint[] {
  if (data.length < period) return [];
  const key = `atr_${period}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const result: SeriesPoint[] = [];
  const trs: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trs.push(data[i].high - data[i].low);
    } else {
      const h_l = data[i].high - data[i].low;
      const h_pc = Math.abs(data[i].high - data[i - 1].close);
      const l_pc = Math.abs(data[i].low - data[i - 1].close);
      trs.push(Math.max(h_l, h_pc, l_pc));
    }
  }

  // First ATR is simple average of first N True Ranges
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += trs[i];
  }
  let prevAtr = sum / period;
  result.push({ time: data[period - 1].time, value: prevAtr });

  for (let i = period; i < data.length; i++) {
    const atrVal = (prevAtr * (period - 1) + trs[i]) / period;
    result.push({ time: data[i].time, value: atrVal });
    prevAtr = atrVal;
  }

  calcCache.set(key, result);
  return result;
}

// 7. Stochastic Oscillator
export interface StochasticResult {
  k: SeriesPoint[];
  d: SeriesPoint[];
}

export function calculateStochastic(data: ChartDataPoint[], kPeriod = 14, dPeriod = 3): StochasticResult {
  if (data.length < kPeriod) return { k: [], d: [] };
  const key = `stoch_${kPeriod}_${dPeriod}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const kPoints: SeriesPoint[] = [];
  const dPoints: SeriesPoint[] = [];

  for (let i = kPeriod - 1; i < data.length; i++) {
    // Find lowest low and highest high over the last kPeriod candles
    let lowestLow = Infinity;
    let highestHigh = -Infinity;

    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (data[j].low < lowestLow) lowestLow = data[j].low;
      if (data[j].high > highestHigh) highestHigh = data[j].high;
    }

    const range = highestHigh - lowestLow || 1.0;
    const kVal = ((data[i].close - lowestLow) / range) * 100;
    kPoints.push({ time: data[i].time, value: kVal });
  }

  if (kPoints.length < dPeriod) {
    const res = { k: kPoints, d: [] };
    calcCache.set(key, res);
    return res;
  }

  // %D is simple moving average of %K
  for (let i = dPeriod - 1; i < kPoints.length; i++) {
    let sum = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      sum += kPoints[j].value;
    }
    dPoints.push({ time: kPoints[i].time, value: sum / dPeriod });
  }

  const res = {
    k: kPoints.filter(kp => dPoints.some(dp => dp.time === kp.time)),
    d: dPoints
  };
  calcCache.set(key, res);
  return res;
}

// 8. Ichimoku Cloud
export interface IchimokuResult {
  tenkan: SeriesPoint[];
  kijun: SeriesPoint[];
  spanA: SeriesPoint[];
  spanB: SeriesPoint[];
  chikou: SeriesPoint[];
}

export function calculateIchimoku(data: ChartDataPoint[]): IchimokuResult {
  if (data.length < 52) return { tenkan: [], kijun: [], spanA: [], spanB: [], chikou: [] };
  const key = `ichimoku_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const tenkan: SeriesPoint[] = [];
  const kijun: SeriesPoint[] = [];
  const spanA: SeriesPoint[] = [];
  const spanB: SeriesPoint[] = [];
  const chikou: SeriesPoint[] = [];

  const getHighLowMid = (arr: ChartDataPoint[], start: number, end: number) => {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = start; j <= end; j++) {
      if (arr[j].high > highest) highest = arr[j].high;
      if (arr[j].low < lowest) lowest = arr[j].low;
    }
    return (highest + lowest) / 2;
  };

  const secondsPerCandle = data[1].time - data[0].time;

  for (let i = 51; i < data.length; i++) {
    const tVal = getHighLowMid(data, i - 8, i);
    const kVal = getHighLowMid(data, i - 25, i);
    
    tenkan.push({ time: data[i].time, value: tVal });
    kijun.push({ time: data[i].time, value: kVal });

    // Span A and Span B are projected 26 periods ahead
    const projectedTime = data[i].time + 26 * secondsPerCandle;
    spanA.push({ time: projectedTime, value: (tVal + kVal) / 2 });
    spanB.push({ time: projectedTime, value: getHighLowMid(data, i - 51, i) });

    // Chikou is close projected 26 periods behind
    if (i >= 26) {
      const pastTime = data[i - 26].time;
      chikou.push({ time: pastTime, value: data[i].close });
    }
  }

  const res = { tenkan, kijun, spanA, spanB, chikou };
  calcCache.set(key, res);
  return res;
}

// 9. SuperTrend
export interface SuperTrendPoint {
  time: number;
  value: number;
  direction: 1 | -1; // 1 = bullish (green), -1 = bearish (red)
}

export function calculateSuperTrend(data: ChartDataPoint[], period = 10, multiplier = 3): SuperTrendPoint[] {
  if (data.length < period) return [];
  const key = `supertrend_${period}_${multiplier}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const result: SuperTrendPoint[] = [];
  const atr = calculateATR(data, period);
  if (atr.length === 0) return [];

  const atrMap = new Map(atr.map(p => [p.time, p.value]));

  let prevST = 0;
  let prevDir = 1; // 1 = long, -1 = short
  let prevUpper = 0;
  let prevLower = 0;

  // Align start to where ATR starts
  const startIdx = data.findIndex(d => d.time === atr[0].time);

  for (let i = startIdx; i < data.length; i++) {
    const c = data[i];
    const aVal = atrMap.get(c.time) || 0;

    const hl2 = (c.high + c.low) / 2;
    const basicUpper = hl2 + multiplier * aVal;
    const basicLower = hl2 - multiplier * aVal;

    let upper = basicUpper;
    let lower = basicLower;

    if (i > startIdx) {
      const prevC = data[i - 1];
      upper = (basicUpper < prevUpper || prevC.close > prevUpper) ? basicUpper : prevUpper;
      lower = (basicLower > prevLower || prevC.close < prevLower) ? basicLower : prevLower;
    }

    let dir = prevDir;
    let st = 0;

    if (i === startIdx) {
      st = c.close > hl2 ? lower : upper;
      dir = c.close > hl2 ? 1 : -1;
    } else {
      if (prevST === prevUpper) {
        dir = c.close > upper ? 1 : -1;
      } else {
        dir = c.close < lower ? -1 : 1;
      }
      st = dir === 1 ? lower : upper;
    }

    result.push({ time: c.time, value: st, direction: dir as any });

    prevST = st;
    prevDir = dir;
    prevUpper = upper;
    prevLower = lower;
  }

  calcCache.set(key, result);
  return result;
}

// 10. ADX (Average Directional Index)
export interface ADXResult {
  adx: SeriesPoint[];
  plusDI: SeriesPoint[];
  minusDI: SeriesPoint[];
}

export function calculateADX(data: ChartDataPoint[], period = 14): ADXResult {
  if (data.length < period * 2) {
    return { adx: [], plusDI: [], minusDI: [] };
  }
  const key = `adx_${period}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const adxPoints: SeriesPoint[] = [];
  const plusDI: SeriesPoint[] = [];
  const minusDI: SeriesPoint[] = [];

  const trs: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trs.push(data[i].high - data[i].low);
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const h_l = data[i].high - data[i].low;
      const h_pc = Math.abs(data[i].high - data[i - 1].close);
      const l_pc = Math.abs(data[i].low - data[i - 1].close);
      trs.push(Math.max(h_l, h_pc, l_pc));

      const up = data[i].high - data[i - 1].high;
      const down = data[i - 1].low - data[i].low;

      plusDM.push(up > down && up > 0 ? up : 0);
      minusDM.push(down > up && down > 0 ? down : 0);
    }
  }

  // Wilder's Smoothing for TR, +DM, -DM
  let trSmooth = 0;
  let plusDMSmooth = 0;
  let minusDMSmooth = 0;

  for (let i = 0; i < period; i++) {
    trSmooth += trs[i];
    plusDMSmooth += plusDM[i];
    minusDMSmooth += minusDM[i];
  }

  const dxPoints: { time: number; value: number }[] = [];

  const updateDI = (time: number) => {
    const tr = trSmooth || 1.0;
    const pDI = (plusDMSmooth / tr) * 100;
    const mDI = (minusDMSmooth / tr) * 100;
    plusDI.push({ time, value: pDI });
    minusDI.push({ time, value: mDI });
    const diff = Math.abs(pDI - mDI);
    const sum = pDI + mDI || 1.0;
    dxPoints.push({ time, value: (diff / sum) * 100 });
  };

  updateDI(data[period - 1].time);

  for (let i = period; i < data.length; i++) {
    trSmooth = trSmooth - trSmooth / period + trs[i];
    plusDMSmooth = plusDMSmooth - plusDMSmooth / period + plusDM[i];
    minusDMSmooth = minusDMSmooth - minusDMSmooth / period + minusDM[i];
    updateDI(data[i].time);
  }

  // Calculate ADX: Smoothed average of DX
  let dxSum = 0;
  for (let i = 0; i < period; i++) {
    dxSum += dxPoints[i].value;
  }
  let prevAdx = dxSum / period;
  adxPoints.push({ time: dxPoints[period - 1].time, value: prevAdx });

  for (let i = period; i < dxPoints.length; i++) {
    const adxVal = (prevAdx * (period - 1) + dxPoints[i].value) / period;
    adxPoints.push({ time: dxPoints[i].time, value: adxVal });
    prevAdx = adxVal;
  }

  // Sync timestamps
  const adxTimes = new Set(adxPoints.map(p => p.time));
  const res = {
    adx: adxPoints,
    plusDI: plusDI.filter(p => adxTimes.has(p.time)),
    minusDI: minusDI.filter(p => adxTimes.has(p.time))
  };
  calcCache.set(key, res);
  return res;
}

// 11. Volume Profile
export interface VolumeProfileBin {
  price: number;
  volume: number;
  isPoc: boolean;
}

export function calculateVolumeProfile(data: ChartDataPoint[], numBins = 20): VolumeProfileBin[] {
  if (data.length === 0) return [];
  const key = `volprofile_${numBins}_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  data.forEach(c => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  });

  const range = maxPrice - minPrice || 1.0;
  const binSize = range / numBins;

  // Initialize bins
  const bins: VolumeProfileBin[] = Array.from({ length: numBins }, (_, idx) => ({
    price: minPrice + idx * binSize + binSize / 2,
    volume: 0,
    isPoc: false
  }));

  // Distribute volume into bins
  data.forEach(c => {
    const priceMid = (c.high + c.low + c.close) / 3;
    const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor((priceMid - minPrice) / binSize)));
    bins[binIdx].volume += c.volume;
  });

  // Find POC
  let maxVol = -1;
  let pocIdx = 0;
  bins.forEach((b, idx) => {
    if (b.volume > maxVol) {
      maxVol = b.volume;
      pocIdx = idx;
    }
  });

  if (bins[pocIdx]) {
    bins[pocIdx].isPoc = true;
  }

  calcCache.set(key, bins);
  return bins;
}

// 12. Pivot Points
export interface PivotPointsResult {
  time: number;
  p: number;
  r1: number;
  s1: number;
  r2: number;
  s2: number;
}

export function calculatePivotPoints(data: ChartDataPoint[]): PivotPointsResult[] {
  if (data.length < 2) return [];
  const key = `pivots_${data.length}_${data[data.length - 1].time}_${data[data.length - 1].close}`;
  if (calcCache.has(key)) return calcCache.get(key);

  const result: PivotPointsResult[] = [];

  // Loop starting from index 1, using previous candle's High, Low, Close
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    
    // Traditional Pivot formulas
    const p = (prev.high + prev.low + prev.close) / 3;
    const r1 = 2 * p - prev.low;
    const s1 = 2 * p - prev.high;
    const r2 = p + (prev.high - prev.low);
    const s2 = p - (prev.high - prev.low);

    result.push({
      time: data[i].time,
      p,
      r1,
      s1,
      r2,
      s2
    });
  }

  calcCache.set(key, result);
  return result;
}

