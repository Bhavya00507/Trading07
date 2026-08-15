// src/services/visualStrategyEngine.ts

import { ChartDataPoint } from './indicatorCalcs';

export type ComparisonOperator = '>' | '<' | '>=' | '<=' | '==' | '!=' | 'crosses_above' | 'crosses_below';
export type LogicalOperator = 'AND' | 'OR';

export interface StrategyNodeCondition {
  id: string;
  leftIndicator: string; // e.g. 'EMA_20', 'RSI_14', 'PRICE_CLOSE'
  leftParams: Record<string, number>;
  operator: ComparisonOperator;
  rightIndicator: string; // e.g. 'EMA_50', 'CONSTANT_30'
  rightParams: Record<string, number>;
}

export interface StrategyRuleGroup {
  id: string;
  logicalOperator: LogicalOperator;
  conditions: StrategyNodeCondition[];
}

export interface StrategyAction {
  actionType: 'BUY' | 'SELL' | 'CLOSE_ALL';
  orderType: 'MARKET' | 'LIMIT';
  stopLossPct?: number;
  takeProfitPct?: number;
  trailingStopPct?: number;
  positionSizeUnits: number;
}

export interface VisualStrategyModel {
  id: string;
  name: string;
  description: string;
  category: 'Trend' | 'Momentum' | 'Mean Reversal' | 'Custom';
  entryRuleGroup: StrategyRuleGroup;
  exitRuleGroup?: StrategyRuleGroup;
  action: StrategyAction;
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    version: string;
  };
}

export interface StrategyValidationError {
  nodeId?: string;
  message: string;
}

export class VisualStrategyEngine {
  public validateStrategy(strategy: VisualStrategyModel): StrategyValidationError[] {
    const errors: StrategyValidationError[] = [];

    if (!strategy.name || strategy.name.trim().length === 0) {
      errors.push({ message: 'Strategy name is required.' });
    }

    if (!strategy.entryRuleGroup || strategy.entryRuleGroup.conditions.length === 0) {
      errors.push({ message: 'At least one entry condition is required.' });
    } else {
      strategy.entryRuleGroup.conditions.forEach(cond => {
        if (!cond.leftIndicator || !cond.rightIndicator) {
          errors.push({ nodeId: cond.id, message: 'Condition must have valid left and right indicators.' });
        }
      });
    }

    if (!strategy.action || strategy.action.positionSizeUnits <= 0) {
      errors.push({ message: 'Position size must be greater than zero.' });
    }

    return errors;
  }

  public evaluateCondition(
    cond: StrategyNodeCondition,
    currentPrice: number,
    prevPrice: number,
    leftVal: number,
    leftPrevVal: number,
    rightVal: number,
    rightPrevVal: number
  ): boolean {
    switch (cond.operator) {
      case '>': return leftVal > rightVal;
      case '<': return leftVal < rightVal;
      case '>=': return leftVal >= rightVal;
      case '<=': return leftVal <= rightVal;
      case '==': return Math.abs(leftVal - rightVal) < 0.0001;
      case '!=': return Math.abs(leftVal - rightVal) >= 0.0001;
      case 'crosses_above': return leftPrevVal <= rightPrevVal && leftVal > rightVal;
      case 'crosses_below': return leftPrevVal >= rightPrevVal && leftVal < rightVal;
      default: return false;
    }
  }
}

export const visualStrategyEngine = new VisualStrategyEngine();
