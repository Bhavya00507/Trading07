// src/workers/optionsWorker.ts

export interface OptionsWorkerLeg {
  strike: number;
  type: 'call' | 'put';
  action: 'buy' | 'sell';
  quantity: number;
  premium: number;
}

export interface OptionsWorkerPayload {
  type: 'COMPUTE_GREEKS' | 'COMPUTE_PAYOFF' | 'GENERATE_SURFACE';
  underlyingPrice: number;
  legs?: OptionsWorkerLeg[];
  priceRangePct?: number;
  steps?: number;
  dtes?: number[];
  strikes?: number[];
}

const workerSelf: Worker = self as any;

function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

function normCdf(x: number): number {
  return (1.0 + erf(x / Math.sqrt(2.0))) / 2.0;
}

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
}

function computeBsGreeks(S: number, K: number, T: number, r: number, sigma: number, isCall: boolean) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const pdfD1 = normPdf(d1);
  const cdfD1 = normCdf(d1);
  const cdfD2 = normCdf(d2);
  const cdfNegD1 = normCdf(-d1);
  const cdfNegD2 = normCdf(-d2);

  const price = isCall ? S * cdfD1 - K * Math.exp(-r * T) * cdfD2 : K * Math.exp(-r * T) * cdfNegD2 - S * cdfNegD1;
  const delta = isCall ? cdfD1 : cdfD1 - 1.0;
  const gamma = pdfD1 / (S * sigma * Math.sqrt(T));
  const vega = (S * pdfD1 * Math.sqrt(T)) / 100.0;
  const theta = (-(S * pdfD1 * sigma) / (2 * Math.sqrt(T)) - (isCall ? 1 : -1) * r * K * Math.exp(-r * T) * (isCall ? cdfD2 : cdfNegD2)) / 365.0;
  const rho = ((isCall ? 1 : -1) * K * T * Math.exp(-r * T) * (isCall ? cdfD2 : cdfNegD2)) / 100.0;

  const charm = (-pdfD1 * (2 * r * T - d2 * sigma * Math.sqrt(T)) / (2 * T * sigma * Math.sqrt(T))) / 365.0;
  const vomma = (vega * d1 * d2) / sigma;
  const vanna = (-pdfD1 * d2) / sigma;

  return {
    price: Math.max(0.01, Math.round(price * 100) / 100),
    delta: Math.round(delta * 10000) / 10000,
    gamma: Math.round(gamma * 10000) / 10000,
    theta: Math.round(theta * 10000) / 10000,
    vega: Math.round(vega * 10000) / 10000,
    rho: Math.round(rho * 10000) / 10000,
    charm: Math.round(charm * 10000) / 10000,
    vomma: Math.round(vomma * 10000) / 10000,
    vanna: Math.round(vanna * 10000) / 10000,
  };
}

workerSelf.onmessage = (e: MessageEvent<OptionsWorkerPayload>) => {
  const { type, underlyingPrice: S, legs, priceRangePct = 0.20, steps = 50 } = e.data;
  const t0 = performance.now();

  if (type === 'COMPUTE_PAYOFF' && legs) {
    const minP = S * (1.0 - priceRangePct);
    const maxP = S * (1.0 + priceRangePct);
    const stepVal = (maxP - minP) / steps;
    const curve: any[] = [];

    let maxProfit = -Infinity;
    let maxLoss = Infinity;
    let profitCount = 0;

    for (let i = 0; i <= steps; i++) {
      const p = minP + i * stepVal;
      let totalPnl = 0;

      for (const leg of legs) {
        const isCall = leg.type === 'call';
        const isBuy = leg.action === 'buy';
        const intrinsic = isCall ? Math.max(0, p - leg.strike) : Math.max(0, leg.strike - p);
        const pnl = isBuy ? (intrinsic - leg.premium) * leg.quantity * 100 : (leg.premium - intrinsic) * leg.quantity * 100;
        totalPnl += pnl;
      }

      maxProfit = Math.max(maxProfit, totalPnl);
      maxLoss = Math.min(maxLoss, totalPnl);
      if (totalPnl >= 0) profitCount++;

      curve.push({
        underlyingPrice: Math.round(p * 100) / 100,
        payoffAtExpiry: Math.round(totalPnl * 100) / 100,
      });
    }

    const popPct = Math.round((profitCount / (steps + 1)) * 1000) / 10;
    const elapsedMs = Math.round((performance.now() - t0) * 100) / 100;

    workerSelf.postMessage({
      type: 'PAYOFF_COMPUTED',
      maxProfit: maxProfit < 1e5 ? Math.round(maxProfit) : 'Unlimited',
      maxLoss: maxLoss > -1e5 ? Math.round(maxLoss) : 'Unlimited',
      popPct,
      curve,
      elapsedMs,
    });
  }
};

export {};
