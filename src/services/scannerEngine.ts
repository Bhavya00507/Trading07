// src/services/scannerEngine.ts

export interface CustomScanFilter {
  id: string;
  field: 'price' | 'rsi' | 'volume24h' | 'gapPct' | 'change24h';
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
}

export interface ScanResultRecord {
  symbol: string;
  category: string;
  price: number;
  change24h: number;
  volume24h: number;
  rsi: number;
  gapPct: number;
  signal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export class ScannerEngine {
  public filterSymbols(
    records: ScanResultRecord[],
    filters: CustomScanFilter[],
    category: string = 'ALL'
  ): ScanResultRecord[] {
    return records.filter(item => {
      if (category !== 'ALL' && item.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }

      for (const f of filters) {
        const itemVal = item[f.field];
        if (typeof itemVal !== 'number') continue;

        switch (f.operator) {
          case '>': if (!(itemVal > f.value)) return false; break;
          case '<': if (!(itemVal < f.value)) return false; break;
          case '>=': if (!(itemVal >= f.value)) return false; break;
          case '<=': if (!(itemVal <= f.value)) return false; break;
          case '==': if (!(Math.abs(itemVal - f.value) < 0.0001)) return false; break;
        }
      }
      return true;
    });
  }
}

export const scannerEngine = new ScannerEngine();
