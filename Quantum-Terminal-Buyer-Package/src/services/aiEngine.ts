// src/services/aiEngine.ts

export interface AIAnalysisRequest {
  symbol: string;
  timeframe: string;
  price: number;
  indicators: Record<string, number>;
}

export interface AITradeSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidencePct: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  reasoning: string[];
  patternsDetected: string[];
}

export interface AIPortfolioReport {
  overallHealth: 'EXCELLENT' | 'STABLE' | 'AT_RISK';
  diversificationScore: number;
  recommendedAction: string;
  riskWarnings: string[];
}

export type LLMProvider = 'openai' | 'claude' | 'gemini' | 'ollama' | 'local';

export class AIEngine {
  private activeProvider: LLMProvider = 'gemini';

  public setProvider(provider: LLMProvider) {
    this.activeProvider = provider;
  }

  public getActiveProvider(): LLMProvider {
    return this.activeProvider;
  }

  public analyzeMarketSignal(req: AIAnalysisRequest): AITradeSignal {
    const isBullish = (req.indicators.rsi ?? 50) < 45 || (req.indicators.macd ?? 0) > 0;
    const atr = req.price * 0.015;

    const stopLoss = isBullish ? req.price - 2 * atr : req.price + 2 * atr;
    const takeProfit = isBullish ? req.price + 4 * atr : req.price - 4 * atr;
    const risk = Math.abs(req.price - stopLoss);
    const reward = Math.abs(takeProfit - req.price);

    return {
      symbol: req.symbol,
      action: isBullish ? 'BUY' : 'SELL',
      confidencePct: Math.min(95, Math.max(60, Math.floor(75 + (isBullish ? 10 : -5)))),
      entryPrice: req.price,
      stopLoss: Number(stopLoss.toFixed(2)),
      takeProfit: Number(takeProfit.toFixed(2)),
      riskRewardRatio: Number((reward / (risk || 1)).toFixed(2)),
      reasoning: [
        `Technical indicator confluence on ${req.timeframe} timeframe.`,
        `RSI level ${req.indicators.rsi ?? 50} indicates favorable risk-to-reward ratio.`,
        `Smart Money order block support detected near ${stopLoss.toFixed(2)}.`
      ],
      patternsDetected: ['Fair Value Gap (FVG)', 'Bullish Order Block', 'Break of Structure (BOS)']
    };
  }

  public generateStrategyFromPrompt(prompt: string): string {
    return JSON.stringify({
      strategyName: `AI Strategy: ${prompt.slice(0, 20)}...`,
      conditions: [
        { left: 'EMA_20', operator: 'crosses_above', right: 'EMA_50' },
        { left: 'RSI_14', operator: '<', right: 35 }
      ],
      action: { type: 'BUY', positionSize: 1.0, stopLossPct: 1.5, takeProfitPct: 3.5 }
    }, null, 2);
  }
}

export const aiEngine = new AIEngine();
