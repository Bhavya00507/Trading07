// src/workers/scannerWorker.ts

export interface ScanWorkerFilter {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: any;
}

export interface ScanItem {
  symbol: string;
  name: string;
  assetClass: string;
  price: number;
  changePct: number;
  gapPct: number;
  volume: number;
  relativeVolume: number;
  atr: number;
  rsi: number;
  macdCross: string;
  ema9: number;
  ema20: number;
  ema50: number;
  ema200: number;
  vwap: number;
  anchoredVwap: number;
  high52w: number;
  low52w: number;
  near52wHigh: boolean;
  near52wLow: boolean;
  pattern: string;
  volumeSpike: boolean;
  highVolatility: boolean;
  marketCapM: number;
  floatM: number;
  sector: string;
  exchange: string;
}

export interface WorkerPayload {
  items: ScanItem[];
  assetClass: string;
  search: string;
  filters: ScanWorkerFilter[];
  sortField: keyof ScanItem;
  sortDirection: 'asc' | 'desc';
}

const workerSelf: Worker = self as any;

workerSelf.onmessage = (e: MessageEvent<WorkerPayload>) => {
  const { items, assetClass, search, filters, sortField, sortDirection } = e.data;
  const t0 = performance.now();

  const filtered = items.filter((item) => {
    if (assetClass !== 'ALL' && item.assetClass.toLowerCase() !== assetClass.toLowerCase()) {
      return false;
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      if (!item.symbol.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q)) {
        return false;
      }
    }

    for (const f of filters) {
      const itemVal = (item as any)[f.field];
      if (itemVal === undefined || itemVal === null) continue;

      switch (f.operator) {
        case '>': if (!(itemVal > f.value)) return false; break;
        case '<': if (!(itemVal < f.value)) return false; break;
        case '>=': if (!(itemVal >= f.value)) return false; break;
        case '<=': if (!(itemVal <= f.value)) return false; break;
        case '==': if (itemVal !== f.value) return false; break;
        case '!=': if (itemVal === f.value) return false; break;
      }
    }

    return true;
  });

  if (sortField) {
    filtered.sort((a, b) => {
      const valA = (a as any)[sortField];
      const valB = (b as any)[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }

  const elapsedMs = performance.now() - t0;

  workerSelf.postMessage({
    results: filtered,
    totalMatched: filtered.length,
    universeSize: items.length,
    elapsedMs,
  });
};

export {};
