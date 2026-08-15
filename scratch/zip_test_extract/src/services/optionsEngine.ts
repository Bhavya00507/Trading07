// src/services/optionsEngine.ts

export interface OptionContract {
  strike: number;
  expiry: string;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  iv: number; // e.g. 0.25 for 25%
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

export interface OptionStrategyLeg {
  contract: OptionContract;
  action: 'buy' | 'sell';
  ratio: number;
}

export interface OptionPayoffPoint {
  price: number;
  payoff: number;
}

export interface OptionAnalyticsSummary {
  pcr: number;
  maxPainStrike: number;
  totalCallOI: number;
  totalPutOI: number;
  ivRank: number;
  ivPercentile: number;
}

export class OptionsEngine {
  // Black-Scholes Option Pricing & Greeks
  public calculateGreeks(
    spot: number,
    strike: number,
    timeToExpiryYears: number,
    riskFreeRate: number = 0.05,
    volatility: number = 0.25,
    isCall: boolean = true
  ): { delta: number; gamma: number; theta: number; vega: number; rho: number } {
    if (timeToExpiryYears <= 0 || volatility <= 0) {
      return { delta: isCall ? 1 : -1, gamma: 0, theta: 0, vega: 0, rho: 0 };
    }

    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * Math.pow(volatility, 2)) * timeToExpiryYears) / (volatility * Math.sqrt(timeToExpiryYears));
    const d2 = d1 - volatility * Math.sqrt(timeToExpiryYears);

    const normStdCDF = (x: number) => {
      const b1 = 0.31938153, b2 = -0.356563782, b3 = 1.781477937, b4 = -1.821255978, b5 = 1.330274429;
      const p = 0.2316419;
      const c2 = 0.39894228;
      if (x >= 0) {
        const t = 1.0 / (1.0 + p * x);
        return (1.0 - c2 * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
      } else {
        const t = 1.0 / (1.0 - p * x);
        return (c2 * Math.exp(-x * x / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1));
      }
    };

    const normStdPDF = (x: number) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);

    const delta = isCall ? normStdCDF(d1) : normStdCDF(d1) - 1;
    const gamma = normStdPDF(d1) / (spot * volatility * Math.sqrt(timeToExpiryYears));
    const vega = (spot * normStdPDF(d1) * Math.sqrt(timeToExpiryYears)) / 100;
    
    const theta = isCall
      ? (-(spot * normStdPDF(d1) * volatility) / (2 * Math.sqrt(timeToExpiryYears)) - riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiryYears) * normStdCDF(d2)) / 365
      : (-(spot * normStdPDF(d1) * volatility) / (2 * Math.sqrt(timeToExpiryYears)) + riskFreeRate * strike * Math.exp(-riskFreeRate * timeToExpiryYears) * normStdCDF(-d2)) / 365;

    const rho = isCall
      ? (strike * timeToExpiryYears * Math.exp(-riskFreeRate * timeToExpiryYears) * normStdCDF(d2)) / 100
      : (-strike * timeToExpiryYears * Math.exp(-riskFreeRate * timeToExpiryYears) * normStdCDF(-d2)) / 100;

    return { delta, gamma, theta, vega, rho };
  }

  public generatePayoffDiagram(
    legs: OptionStrategyLeg[],
    minPrice: number,
    maxPrice: number,
    steps: number = 50
  ): OptionPayoffPoint[] {
    const points: OptionPayoffPoint[] = [];
    const stepSize = (maxPrice - minPrice) / steps;

    for (let price = minPrice; price <= maxPrice; price += stepSize) {
      let totalPayoff = 0;
      for (const leg of legs) {
        const isCall = leg.contract.type === 'call';
        const intrinsicAtExpiry = isCall ? Math.max(0, price - leg.contract.strike) : Math.max(0, leg.contract.strike - price);
        const premium = (leg.contract.bid + leg.contract.ask) / 2;
        const legProfit = leg.action === 'buy' ? intrinsicAtExpiry - premium : premium - intrinsicAtExpiry;
        totalPayoff += legProfit * leg.ratio;
      }
      points.push({ price, payoff: totalPayoff });
    }

    return points;
  }
}

export const optionsEngine = new OptionsEngine();
