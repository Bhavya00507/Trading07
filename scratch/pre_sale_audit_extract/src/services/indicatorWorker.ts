// src/services/indicatorWorker.ts

const workerCode = `
  // In-memory cache for incremental calculations inside the worker
  const calcCache = new Map();

  function calculateEMA(data, period) {
    if (data.length < period) return [];
    const key = "ema_" + period + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const result = [];
    const k = 2 / (period + 1);
    
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

  function calculateSMA(data, period) {
    if (data.length < period) return [];
    const key = "sma_" + period + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const result = [];
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

  function calculateVWAP(data) {
    if (data.length === 0) return [];
    const key = "vwap_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const result = [];
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

  function calculateRSI(data, period) {
    if (data.length <= period) return [];
    const key = "rsi_" + period + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const result = [];
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = data[i].close - data[i - 1].close;
      if (diff > 0) gains += diff;
      else losses -= diff;
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

  function calculateBollingerBands(data, period, multiplier) {
    if (data.length < period) return { upper: [], middle: [], lower: [] };
    const key = "bb_" + period + "_" + multiplier + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const upper = [];
    const middle = [];
    const lower = [];

    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
    }

    for (let i = period - 1; i < data.length; i++) {
      if (i >= period) {
        sum = sum - data[i - period].close + data[i].close;
      }
      const sma = sum / period;

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

  function calculateATR(data, period) {
    if (data.length < period) return [];
    const key = "atr_" + period + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const result = [];
    const trs = [];
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

  function calculateMACD(data, fastPeriod, slowPeriod, signalPeriod) {
    if (data.length < slowPeriod) return { macd: [], signal: [], histogram: [] };
    const key = "macd_" + fastPeriod + "_" + slowPeriod + "_" + signalPeriod + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const macdPoints = [];
    const signalPoints = [];
    const histogramPoints = [];

    const emaFast = calculateEMA(data, fastPeriod);
    const emaSlow = calculateEMA(data, slowPeriod);

    const slowMap = new Map();
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
      return { macd: macdPoints, signal: [], histogram: [] };
    }

    const tempChartData = macdPoints.map(pt => ({
      time: pt.time,
      close: pt.value,
      open: pt.value,
      high: pt.value,
      low: pt.value,
      volume: 0
    }));

    const signalLine = calculateEMA(tempChartData, signalPeriod);
    const signalMap = new Map();
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

  function calculateStochastic(data, kPeriod, dPeriod) {
    if (data.length < kPeriod) return { k: [], d: [] };
    const key = "stoch_" + kPeriod + "_" + dPeriod + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const kPoints = [];
    const dPoints = [];

    for (let i = kPeriod - 1; i < data.length; i++) {
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

    if (kPoints.length < dPeriod) return { k: kPoints, d: [] };

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

  function calculateIchimoku(data) {
    if (data.length < 52) return { tenkan: [], kijun: [], spanA: [], spanB: [], chikou: [] };
    const key = "ichimoku_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const tenkan = [];
    const kijun = [];
    const spanA = [];
    const spanB = [];
    const chikou = [];

    const getHighLowMid = (arr, start, end) => {
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

      const projectedTime = data[i].time + 26 * secondsPerCandle;
      spanA.push({ time: projectedTime, value: (tVal + kVal) / 2 });
      spanB.push({ time: projectedTime, value: getHighLowMid(data, i - 51, i) });

      if (i >= 26) {
        chikou.push({ time: data[i - 26].time, value: data[i].close });
      }
    }

    const res = { tenkan, kijun, spanA, spanB, chikou };
    calcCache.set(key, res);
    return res;
  }

  function calculateSuperTrend(data, period, multiplier) {
    const key = "supertrend_" + period + "_" + multiplier + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const atr = calculateATR(data, period);
    if (atr.length === 0) return [];

    const atrMap = new Map(atr.map(p => [p.time, p.value]));
    const result = [];

    let prevST = 0;
    let prevDir = 1;
    let prevUpper = 0;
    let prevLower = 0;

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

      result.push({ time: c.time, value: st, direction: dir });
      prevST = st;
      prevDir = dir;
      prevUpper = upper;
      prevLower = lower;
    }

    calcCache.set(key, result);
    return result;
  }

  function calculateADX(data, period) {
    if (data.length < period * 2) return { adx: [], plusDI: [], minusDI: [] };
    const key = "adx_" + period + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const adxPoints = [];
    const plusDI = [];
    const minusDI = [];

    const trs = [];
    const plusDM = [];
    const minusDM = [];

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

    let trSmooth = 0;
    let plusDMSmooth = 0;
    let minusDMSmooth = 0;

    for (let i = 0; i < period; i++) {
      trSmooth += trs[i];
      plusDMSmooth += plusDM[i];
      minusDMSmooth += minusDM[i];
    }

    const dxPoints = [];
    const updateDI = (time) => {
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

    const adxTimes = new Set(adxPoints.map(p => p.time));
    const res = {
      adx: adxPoints,
      plusDI: plusDI.filter(p => adxTimes.has(p.time)),
      minusDI: minusDI.filter(p => adxTimes.has(p.time))
    };
    calcCache.set(key, res);
    return res;
  }

  function calculateVolumeProfile(data, numBins) {
    if (data.length === 0) return [];
    const key = "volprofile_" + numBins + "_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    data.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });

    const range = maxPrice - minPrice || 1.0;
    const binSize = range / numBins;

    const bins = Array.from({ length: numBins }, (_, idx) => ({
      price: minPrice + idx * binSize + binSize / 2,
      volume: 0,
      isPoc: false
    }));

    data.forEach(c => {
      const priceMid = (c.high + c.low + c.close) / 3;
      const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor((priceMid - minPrice) / binSize)));
      bins[binIdx].volume += c.volume;
    });

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

  function calculatePivotPoints(data) {
    if (data.length < 2) return [];
    const key = "pivots_" + data.length + "_" + data[data.length - 1].time + "_" + data[data.length - 1].close;
    if (calcCache.has(key)) return calcCache.get(key);

    const result = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const p = (prev.high + prev.low + prev.close) / 3;
      const r1 = 2 * p - prev.low;
      const s1 = 2 * p - prev.high;
      const r2 = p + (prev.high - prev.low);
      const s2 = p - (prev.high - prev.low);

      result.push({
        time: data[i].time,
        p, r1, s1, r2, s2
      });
    }

    calcCache.set(key, result);
    return result;
  }

  const vwapCache = new Map();
  const rsiCache = new Map();
  const atrCache = new Map();

  function getIncrementalEMA(data, period) {
    if (data.length < period) return [];
    if (data.length === period) return calculateEMA(data, period);
    const stableData = data.slice(0, data.length - 1);
    const stableResult = calculateEMA(stableData, period);
    if (stableResult.length === 0) return calculateEMA(data, period);
    const prevVal = stableResult[stableResult.length - 1].value;
    const k = 2 / (period + 1);
    const lastVal = (data[data.length - 1].close - prevVal) * k + prevVal;
    const copy = stableResult.slice();
    copy.push({ time: data[data.length - 1].time, value: lastVal });
    return copy;
  }

  function getIncrementalSMA(data, period) {
    if (data.length < period) return [];
    if (data.length === period) return calculateSMA(data, period);
    const stableData = data.slice(0, data.length - 1);
    const stableResult = calculateSMA(stableData, period);
    if (stableResult.length === 0) return calculateSMA(data, period);
    let sum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      sum += data[i].close;
    }
    const lastVal = sum / period;
    const copy = stableResult.slice();
    copy.push({ time: data[data.length - 1].time, value: lastVal });
    return copy;
  }

  function getIncrementalVWAP(data) {
    if (data.length === 0) return [];
    if (data.length === 1) return calculateVWAP(data);
    const stableData = data.slice(0, data.length - 1);
    const stableResult = calculateVWAP(stableData);
    if (stableResult.length === 0) return calculateVWAP(data);
    const stableKey = "vwap_cum_" + stableData.length + "_" + stableData[stableData.length - 1].time + "_" + stableData[stableData.length - 1].close;
    let cumState;
    if (vwapCache.has(stableKey)) {
      cumState = vwapCache.get(stableKey);
    } else {
      let cumTpv = 0;
      let cumVol = 0;
      for (let i = 0; i < stableData.length; i++) {
        const d = stableData[i];
        cumTpv += ((d.high + d.low + d.close) / 3) * d.volume;
        cumVol += d.volume;
      }
      cumState = { cumTpv, cumVol };
      vwapCache.set(stableKey, cumState);
    }
    const lastD = data[data.length - 1];
    const lastTpv = ((lastD.high + lastD.low + lastD.close) / 3) * lastD.volume;
    const finalTpv = cumState.cumTpv + lastTpv;
    const finalVol = cumState.cumVol + lastD.volume;
    const lastVal = finalVol > 0 ? finalTpv / finalVol : 0;
    const copy = stableResult.slice();
    copy.push({ time: lastD.time, value: lastVal });
    return copy;
  }

  function getIncrementalRSI(data, period) {
    if (data.length <= period) return [];
    if (data.length === period + 1) return calculateRSI(data, period);
    const stableData = data.slice(0, data.length - 1);
    const stableResult = calculateRSI(stableData, period);
    if (stableResult.length === 0) return calculateRSI(data, period);
    const stableKey = "rsi_cum_" + period + "_" + stableData.length + "_" + stableData[stableData.length - 1].time + "_" + stableData[stableData.length - 1].close;
    let rsiState;
    if (rsiCache.has(stableKey)) {
      rsiState = rsiCache.get(stableKey);
    } else {
      let gains = 0, losses = 0;
      for (let i = 1; i <= period; i++) {
        const diff = stableData[i].close - stableData[i - 1].close;
        if (diff > 0) gains += diff;
        else losses -= diff;
      }
      let avgGain = gains / period;
      let avgLoss = losses / period;
      for (let i = period + 1; i < stableData.length; i++) {
        const diff = stableData[i].close - stableData[i - 1].close;
        const currentGain = diff > 0 ? diff : 0;
        const currentLoss = diff < 0 ? -diff : 0;
        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
      }
      rsiState = { avgGain, avgLoss };
      rsiCache.set(stableKey, rsiState);
    }
    const diff = data[data.length - 1].close - stableData[stableData.length - 1].close;
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;
    const finalAvgGain = (rsiState.avgGain * (period - 1) + currentGain) / period;
    const finalAvgLoss = (rsiState.avgLoss * (period - 1) + currentLoss) / period;
    const rs = finalAvgGain / (finalAvgLoss || 1);
    const lastVal = 100 - 100 / (1 + rs);
    const copy = stableResult.slice();
    copy.push({ time: data[data.length - 1].time, value: lastVal });
    return copy;
  }

  function getIncrementalBB(data, period, multiplier) {
    if (data.length < period) return { upper: [], middle: [], lower: [] };
    const stableData = data.slice(0, data.length - 1);
    const stableResult = calculateBollingerBands(stableData, period, multiplier);
    if (stableResult.middle.length === 0) return calculateBollingerBands(data, period, multiplier);
    let sum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      sum += data[i].close;
    }
    const sma = sum / period;
    let varianceSum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      varianceSum += Math.pow(data[i].close - sma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    const lastTime = data[data.length - 1].time;
    const upperCopy = stableResult.upper.slice();
    const middleCopy = stableResult.middle.slice();
    const lowerCopy = stableResult.lower.slice();
    upperCopy.push({ time: lastTime, value: sma + multiplier * stdDev });
    middleCopy.push({ time: lastTime, value: sma });
    lowerCopy.push({ time: lastTime, value: sma - multiplier * stdDev });
    return { upper: upperCopy, middle: middleCopy, lower: lowerCopy };
  }

  function getIncrementalATR(data, period) {
    if (data.length < period) return [];
    if (data.length === period) return calculateATR(data, period);
    const stableData = data.slice(0, data.length - 1);
    const stableResult = calculateATR(stableData, period);
    if (stableResult.length === 0) return calculateATR(data, period);
    const stableKey = "atr_cum_" + period + "_" + stableData.length + "_" + stableData[stableData.length - 1].time + "_" + stableData[stableData.length - 1].close;
    let atrState;
    if (atrCache.has(stableKey)) {
      atrState = atrCache.get(stableKey);
    } else {
      const trs = [];
      for (let i = 0; i < stableData.length; i++) {
        if (i === 0) {
          trs.push(stableData[i].high - stableData[i].low);
        } else {
          const h_l = stableData[i].high - stableData[i].low;
          const h_pc = Math.abs(stableData[i].high - stableData[i - 1].close);
          const l_pc = Math.abs(stableData[i].low - stableData[i - 1].close);
          trs.push(Math.max(h_l, h_pc, l_pc));
        }
      }
      let sum = 0;
      for (let i = 0; i < period; i++) sum += trs[i];
      let prevAtr = sum / period;
      for (let i = period; i < stableData.length; i++) {
        prevAtr = (prevAtr * (period - 1) + trs[i]) / period;
      }
      atrState = { prevAtr };
      atrCache.set(stableKey, atrState);
    }
    const lastD = data[data.length - 1];
    const prevClose = stableData[stableData.length - 1].close;
    const h_l = lastD.high - lastD.low;
    const h_pc = Math.abs(lastD.high - prevClose);
    const l_pc = Math.abs(lastD.low - prevClose);
    const lastTr = Math.max(h_l, h_pc, l_pc);
    const lastVal = (atrState.prevAtr * (period - 1) + lastTr) / period;
    const copy = stableResult.slice();
    copy.push({ time: lastD.time, value: lastVal });
    return copy;
  }

  function getIncrementalMACD(data, fastPeriod, slowPeriod, signalPeriod) {
    if (data.length < slowPeriod) return { macd: [], signal: [], histogram: [] };
    const emaFast = getIncrementalEMA(data, fastPeriod);
    const emaSlow = getIncrementalEMA(data, slowPeriod);
    const macdPoints = [];
    const slowMap = new Map();
    emaSlow.forEach(pt => slowMap.set(pt.time, pt.value));
    emaFast.forEach(fastPt => {
      if (slowMap.has(fastPt.time)) {
        macdPoints.push({ time: fastPt.time, value: fastPt.value - slowMap.get(fastPt.time) });
      }
    });
    const signalPoints = getIncrementalEMA(macdPoints, signalPeriod);
    const sigMap = new Map();
    signalPoints.forEach(pt => sigMap.set(pt.time, pt.value));
    const histogramPoints = [];
    macdPoints.forEach(mPt => {
      if (sigMap.has(mPt.time)) {
        histogramPoints.push({ time: mPt.time, value: mPt.value - sigMap.get(mPt.time) });
      }
    });
    return { macd: macdPoints, signal: signalPoints, histogram: histogramPoints };
  }

  function getIncrementalGeneral(data, cacheName, originalFn, ...args) {
    if (data.length < 150) return originalFn(data, ...args);
    const stableData = data.slice(0, data.length - 1);
    const stableKey = cacheName + "_stable_" + args.join("_") + "_" + stableData.length + "_" + stableData[stableData.length - 1].time + "_" + stableData[stableData.length - 1].close;
    let stableResult;
    if (calcCache.has(stableKey)) {
      stableResult = calcCache.get(stableKey);
    } else {
      stableResult = originalFn(stableData, ...args);
      calcCache.set(stableKey, stableResult);
    }
    const sliceStart = data.length - 150;
    const slicedData = data.slice(sliceStart);
    const slicedResult = originalFn(slicedData, ...args);
    if (Array.isArray(stableResult)) {
      const copy = stableResult.slice();
      if (slicedResult && slicedResult.length > 0) {
        copy.push(slicedResult[slicedResult.length - 1]);
      }
      return copy;
    } else if (stableResult && typeof stableResult === 'object') {
      const merged = {};
      for (const k in stableResult) {
        if (Array.isArray(stableResult[k])) {
          merged[k] = stableResult[k].slice();
          if (slicedResult[k] && slicedResult[k].length > 0) {
            merged[k].push(slicedResult[k][slicedResult[k].length - 1]);
          }
        } else {
          merged[k] = stableResult[k];
        }
      }
      return merged;
    }
    return originalFn(data, ...args);
  }

  self.onmessage = function(e) {
    const { id, type, formatted, params } = e.data;
    try {
      let result = null;
      if (type === 'ema20') result = getIncrementalEMA(formatted, params.ema20.period);
      else if (type === 'ema50') result = getIncrementalEMA(formatted, params.ema50.period);
      else if (type === 'ema200') result = getIncrementalEMA(formatted, params.ema200.period);
      else if (type === 'sma') result = getIncrementalSMA(formatted, params.sma.period);
      else if (type === 'vwap') result = getIncrementalVWAP(formatted);
      else if (type === 'bb') result = getIncrementalBB(formatted, params.bb.period, params.bb.multiplier);
      else if (type === 'ichimoku') result = getIncrementalGeneral(formatted, 'ichimoku', calculateIchimoku);
      else if (type === 'supertrend') result = getIncrementalGeneral(formatted, 'supertrend', calculateSuperTrend, params.supertrend.period, params.supertrend.multiplier);
      else if (type === 'volProfile') result = calculateVolumeProfile(formatted, params.volProfile.bins);
      else if (type === 'pivots') result = getIncrementalGeneral(formatted, 'pivots', calculatePivotPoints);
      else if (type === 'rsi') result = getIncrementalRSI(formatted, params.rsi.period);
      else if (type === 'macd') result = getIncrementalMACD(formatted, params.macd.fast, params.macd.slow, params.macd.signal);
      else if (type === 'atr') result = getIncrementalATR(formatted, params.atr.period);
      else if (type === 'stochastic') result = getIncrementalGeneral(formatted, 'stochastic', calculateStochastic, params.stochastic.kPeriod, params.stochastic.dPeriod);
      else if (type === 'adx') result = getIncrementalGeneral(formatted, 'adx', calculateADX, params.adx.period);

      self.postMessage({ id, type, success: true, result });
    } catch (err) {
      self.postMessage({ id, type, success: false, error: err.message });
    }
  };
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);

export function createIndicatorWorker(): Worker {
  return new Worker(workerUrl);
}
