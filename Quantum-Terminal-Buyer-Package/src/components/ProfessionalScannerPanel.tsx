import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { marketScannerService, ScannerPreset } from '../services/marketScannerService';
import { ScanItem, ScanWorkerFilter } from '../workers/scannerWorker';

const ALL_COLUMNS = [
  { key: 'symbol', label: 'Symbol', minWidth: 90 },
  { key: 'name', label: 'Company / Name', minWidth: 150 },
  { key: 'assetClass', label: 'Class', minWidth: 80 },
  { key: 'price', label: 'Price', minWidth: 90 },
  { key: 'changePct', label: '24h %', minWidth: 80 },
  { key: 'gapPct', label: 'Gap %', minWidth: 75 },
  { key: 'volume', label: 'Volume', minWidth: 100 },
  { key: 'relativeVolume', label: 'RVOL', minWidth: 70 },
  { key: 'atr', label: 'ATR (14)', minWidth: 75 },
  { key: 'rsi', label: 'RSI (14)', minWidth: 75 },
  { key: 'macdCross', label: 'MACD Signal', minWidth: 110 },
  { key: 'vwap', label: 'VWAP', minWidth: 85 },
  { key: 'anchoredVwap', label: 'Anch. VWAP', minWidth: 95 },
  { key: 'high52w', label: '52W High', minWidth: 85 },
  { key: 'pattern', label: 'Pattern', minWidth: 120 },
  { key: 'sector', label: 'Sector', minWidth: 120 },
  { key: 'exchange', label: 'Exchange', minWidth: 90 },
];

export const ProfessionalScannerPanel: React.FC = () => {
  const setSelectedInstrument = useAppStore((state) => state.setSelectedInstrument);
  const addToast = useAppStore((state) => state.addToast);
  const mode = useAppStore((state) => state.settings?.mode || 'dark');
  const livePrices = useMarketStore((state) => state.prices);

  // Filters & Presets State
  const [activeAssetClass, setActiveAssetClass] = useState<string>('ALL');
  const [activePresetId, setActivePresetId] = useState<string | null>('day_trading');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customFilters, setCustomFilters] = useState<ScanWorkerFilter[]>([]);

  // Sorting
  const [sortField, setSortField] = useState<keyof ScanItem>('relativeVolume');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Scanner Builder Modal
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [builderField, setBuilderField] = useState<string>('rsi');
  const [builderOp, setBuilderOp] = useState<'>' | '<' | '>=' | '<=' | '==' | '!='>('<');
  const [builderVal, setBuilderVal] = useState<string>('30');

  // Column Chooser Modal
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'symbol', 'price', 'changePct', 'gapPct', 'volume', 'relativeVolume', 'atr', 'rsi', 'macdCross', 'vwap', 'pattern'
  ]);

  // Alert Settings Modal
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState<boolean>(true);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState<boolean>(true);
  const [webhookUrl, setWebhookUrl] = useState<string>('');

  // Performance metrics
  const [scanMetrics, setScanMetrics] = useState<{ totalMatched: number; universeSize: number; elapsedMs: number }>({
    totalMatched: 0,
    universeSize: 10200,
    elapsedMs: 0,
  });

  // Web Worker Ref for non-blocking 10,000+ scanning
  const workerRef = useRef<Worker | null>(null);
  const fullUniverseRef = useRef<ScanItem[]>([]);

  // Virtual Scrolling State
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [filteredResults, setFilteredResults] = useState<ScanItem[]>([]);

  const presets = useMemo(() => marketScannerService.getPresets(), []);

  // Initialize Worker & Dataset
  useEffect(() => {
    fullUniverseRef.current = marketScannerService.generateUniverse();

    // Create worker inline blob URL to avoid bundler path issues
    const workerBlob = new Blob(
      [
        `
        self.onmessage = function(e) {
          const { items, assetClass, search, filters, sortField, sortDirection } = e.data;
          const t0 = performance.now();
          const filtered = items.filter((item) => {
            if (assetClass !== 'ALL' && item.assetClass.toLowerCase() !== assetClass.toLowerCase()) return false;
            if (search && search.trim() !== '') {
              const q = search.trim().toLowerCase();
              if (!item.symbol.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q)) return false;
            }
            for (const f of filters) {
              const itemVal = item[f.field];
              if (itemVal === undefined || itemVal === null) continue;
              if (f.operator === '>') { if (!(itemVal > f.value)) return false; }
              else if (f.operator === '<') { if (!(itemVal < f.value)) return false; }
              else if (f.operator === '>=') { if (!(itemVal >= f.value)) return false; }
              else if (f.operator === '<=') { if (!(itemVal <= f.value)) return false; }
              else if (f.operator === '==') { if (itemVal !== f.value) return false; }
              else if (f.operator === '!=') { if (itemVal === f.value) return false; }
            }
            return true;
          });

          if (sortField) {
            filtered.sort((a, b) => {
              const valA = a[sortField];
              const valB = b[sortField];
              if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
              }
              const strA = String(valA || '').toLowerCase();
              const strB = String(valB || '').toLowerCase();
              return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
            });
          }
          const elapsedMs = performance.now() - t0;
          self.postMessage({ results: filtered, totalMatched: filtered.length, universeSize: items.length, elapsedMs });
        };
        `
      ],
      { type: 'application/javascript' }
    );

    const worker = new Worker(URL.createObjectURL(workerBlob));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { results, totalMatched, universeSize, elapsedMs } = e.data;
      setFilteredResults(results);
      setScanMetrics({ totalMatched, universeSize, elapsedMs: Math.round(elapsedMs * 100) / 100 });
    };

    return () => {
      worker.terminate();
    };
  }, []);

  // Run scan whenever filters/sort/search change
  const triggerScan = useCallback(() => {
    if (!workerRef.current || fullUniverseRef.current.length === 0) return;

    let activePresetFilters: ScanWorkerFilter[] = [];
    if (activePresetId) {
      const found = presets.find((p) => p.id === activePresetId);
      if (found) activePresetFilters = found.filters;
    }

    const mergedFilters = [...activePresetFilters, ...customFilters];

    workerRef.current.postMessage({
      items: fullUniverseRef.current,
      assetClass: activeAssetClass,
      search: searchQuery,
      filters: mergedFilters,
      sortField,
      sortDirection,
    });
  }, [activeAssetClass, activePresetId, searchQuery, customFilters, sortField, sortDirection, presets]);

  useEffect(() => {
    triggerScan();
  }, [triggerScan]);

  // Virtualization Row Math
  const rowHeight = 32;
  const containerHeight = 450;
  const totalRows = filteredResults.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 3);
  const endIndex = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / rowHeight) + 3);
  const visibleRows = useMemo(() => filteredResults.slice(startIndex, endIndex), [filteredResults, startIndex, endIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleSort = (field: keyof ScanItem) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const addCustomFilter = () => {
    const parsedVal = isNaN(Number(builderVal)) ? builderVal : Number(builderVal);
    setCustomFilters((prev) => [...prev, { field: builderField, operator: builderOp, value: parsedVal }]);
    setIsBuilderOpen(false);
    addToast(`Added condition: ${builderField} ${builderOp} ${builderVal}`, 'info');
  };

  const removeCustomFilter = (idx: number) => {
    setCustomFilters((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectInstrument = (item: ScanItem) => {
    setSelectedInstrument({
      symbol: item.symbol,
      name: item.name,
      price: item.price,
      changePct: item.changePct,
      category: item.assetClass.toLowerCase(),
    });
    addToast(`Selected ${item.symbol} ($${item.price.toFixed(2)})`, 'success');

    if (desktopAlertsEnabled) {
      marketScannerService.triggerMultiChannelAlert(item.symbol, `Selected in Scanner`, webhookUrl);
    }
  };

  const exportCSV = () => {
    const headers = visibleColumns.join(',');
    const rows = filteredResults.map((item) =>
      visibleColumns.map((col) => JSON.stringify((item as any)[col] ?? '')).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Quantum_Scanner_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Exported ${filteredResults.length} scan results to CSV`, 'info');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      backgroundColor: mode === 'dark' ? '#0e1117' : '#f8f9fa',
      color: mode === 'dark' ? '#d1d5db' : '#111827',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: 12, overflow: 'hidden'
    }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderBottom: mode === 'dark' ? '1px solid #1f2937' : '1px solid #e5e7eb',
        gap: 8, flexWrap: 'wrap'
      }}>
        {/* Left Controls: Asset Class Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary, #3b82f6)', marginRight: 8 }}>
            ⚡ MARKET SCANNER
          </span>
          {['ALL', 'Stocks', 'Crypto', 'Forex', 'Futures', 'Indices', 'ETFs'].map((cls) => (
            <button
              key={cls}
              onClick={() => { setActiveAssetClass(cls); }}
              style={{
                padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                backgroundColor: activeAssetClass === cls ? '#2563eb' : (mode === 'dark' ? '#1f2937' : '#e5e7eb'),
                color: activeAssetClass === cls ? '#ffffff' : (mode === 'dark' ? '#9ca3af' : '#4b5563')
              }}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            placeholder="Search 10,000+ symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '4px 8px', borderRadius: 4,
              border: mode === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
              backgroundColor: mode === 'dark' ? '#111827' : '#ffffff',
              color: 'inherit', fontSize: 11, width: 180
            }}
          />

          <button
            onClick={() => setIsBuilderOpen(true)}
            style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
              backgroundColor: '#10b981', color: '#fff', fontWeight: 600, fontSize: 11
            }}
          >
            + Add Condition
          </button>

          <button
            onClick={() => setIsColumnChooserOpen(true)}
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
              backgroundColor: mode === 'dark' ? '#374151' : '#d1d5db', color: 'inherit', fontSize: 11
            }}
          >
            ⚙ Columns
          </button>

          <button
            onClick={() => setIsAlertModalOpen(true)}
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
              backgroundColor: mode === 'dark' ? '#374151' : '#d1d5db', color: 'inherit', fontSize: 11
            }}
          >
            🔔 Alerts
          </button>

          <button
            onClick={exportCSV}
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
              backgroundColor: mode === 'dark' ? '#374151' : '#d1d5db', color: 'inherit', fontSize: 11
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Preset Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', overflowX: 'auto',
        borderBottom: mode === 'dark' ? '1px solid #1f2937' : '1px solid #e5e7eb',
        backgroundColor: mode === 'dark' ? '#111827' : '#f3f4f6'
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap' }}>Presets:</span>
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setActivePresetId(preset.id)}
            title={preset.description}
            style={{
              padding: '3px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
              backgroundColor: activePresetId === preset.id ? '#8b5cf6' : (mode === 'dark' ? '#1f2937' : '#e5e7eb'),
              color: activePresetId === preset.id ? '#ffffff' : (mode === 'dark' ? '#d1d5db' : '#374151')
            }}
          >
            {preset.name}
          </button>
        ))}

        {activePresetId && (
          <button
            onClick={() => setActivePresetId(null)}
            style={{ padding: '2px 6px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 10, backgroundColor: '#ef4444', color: '#fff' }}
          >
            Clear Preset
          </button>
        )}
      </div>

      {/* Active Filter Tags Bar */}
      {customFilters.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', flexWrap: 'wrap',
          backgroundColor: mode === 'dark' ? '#0f172a' : '#eff6ff',
          borderBottom: mode === 'dark' ? '1px solid #1e293b' : '1px solid #dbeafe'
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#3b82f6' }}>Custom Filters:</span>
          {customFilters.map((f, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px',
                borderRadius: 4, backgroundColor: '#1e40af', color: '#ffffff', fontSize: 10
              }}
            >
              {f.field} {f.operator} {f.value}
              <span
                onClick={() => removeCustomFilter(idx)}
                style={{ cursor: 'pointer', fontWeight: 700, marginLeft: 2 }}
              >
                ×
              </span>
            </span>
          ))}

          <button
            onClick={() => setCustomFilters([])}
            style={{ fontSize: 10, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px',
        fontSize: 10, color: '#6b7280', borderBottom: mode === 'dark' ? '1px solid #1f2937' : '1px solid #e5e7eb'
      }}>
        <span>
          Matches: <strong style={{ color: '#10b981' }}>{scanMetrics.totalMatched.toLocaleString()}</strong> / {scanMetrics.universeSize.toLocaleString()} symbols
        </span>
        <span>Worker Scan Time: <strong>{scanMetrics.elapsedMs} ms</strong></span>
      </div>

      {/* Main Virtualized Data Table */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', position: 'relative' }}
      >
        {/* Sticky Header */}
        <div style={{
          display: 'flex', position: 'sticky', top: 0, zIndex: 10,
          backgroundColor: mode === 'dark' ? '#1f2937' : '#e5e7eb',
          borderBottom: mode === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
          fontWeight: 700, fontSize: 11
        }}>
          {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
            <div
              key={col.key}
              onClick={() => handleSort(col.key as keyof ScanItem)}
              style={{
                flex: 1, minWidth: col.minWidth, padding: '6px 8px', cursor: 'pointer',
                userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}
            >
              <span>{col.label}</span>
              {sortField === col.key && (
                <span style={{ fontSize: 9, color: '#3b82f6' }}>{sortDirection === 'asc' ? '▲' : '▼'}</span>
              )}
            </div>
          ))}
        </div>

        {/* Virtualized Rows Container */}
        <div style={{ height: totalRows * rowHeight, position: 'relative' }}>
          <div style={{ position: 'absolute', top: startIndex * rowHeight, left: 0, right: 0 }}>
            {visibleRows.map((item, idx) => {
              const livePrice = livePrices[item.symbol]?.price ?? item.price;
              const isUp = item.changePct >= 0;

              return (
                <div
                  key={item.symbol + idx}
                  onClick={() => selectInstrument(item)}
                  style={{
                    display: 'flex', height: rowHeight, alignItems: 'center',
                    borderBottom: mode === 'dark' ? '1px solid #111827' : '1px solid #f3f4f6',
                    backgroundColor: (startIndex + idx) % 2 === 0
                      ? (mode === 'dark' ? '#0e1117' : '#ffffff')
                      : (mode === 'dark' ? '#161b22' : '#f9fafb'),
                    cursor: 'pointer', transition: 'background-color 0.1s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = mode === 'dark' ? '#1f2937' : '#e0e7ff'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = (startIndex + idx) % 2 === 0
                      ? (mode === 'dark' ? '#0e1117' : '#ffffff')
                      : (mode === 'dark' ? '#161b22' : '#f9fafb');
                  }}
                >
                  {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => {
                    let val: any = (item as any)[col.key];
                    let style: React.CSSProperties = { flex: 1, minWidth: col.minWidth, padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

                    if (col.key === 'symbol') {
                      val = <strong style={{ color: '#3b82f6' }}>{item.symbol}</strong>;
                    } else if (col.key === 'price') {
                      val = `$${livePrice.toFixed(item.assetClass === 'Forex' ? 4 : 2)}`;
                    } else if (col.key === 'changePct') {
                      val = `${item.changePct >= 0 ? '+' : ''}${item.changePct}%`;
                      style.color = isUp ? '#10b981' : '#ef4444';
                      style.fontWeight = 600;
                    } else if (col.key === 'gapPct') {
                      val = `${item.gapPct >= 0 ? '+' : ''}${item.gapPct}%`;
                      style.color = item.gapPct >= 0 ? '#10b981' : '#ef4444';
                    } else if (col.key === 'volume') {
                      val = item.volume >= 1000000 ? `${(item.volume / 1000000).toFixed(1)}M` : `${Math.round(item.volume / 1000)}K`;
                    } else if (col.key === 'relativeVolume') {
                      val = `${item.relativeVolume}x`;
                      if (item.relativeVolume >= 2.0) style.color = '#f59e0b';
                    } else if (col.key === 'rsi') {
                      if (item.rsi <= 30) style.color = '#10b981';
                      else if (item.rsi >= 70) style.color = '#ef4444';
                    } else if (col.key === 'macdCross') {
                      style.color = item.macdCross.includes('Bullish') ? '#10b981' : item.macdCross.includes('Bearish') ? '#ef4444' : '#9ca3af';
                    }

                    return (
                      <div key={col.key} style={style}>
                        {val}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Condition Builder Modal */}
      {isBuilderOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            backgroundColor: mode === 'dark' ? '#1f2937' : '#ffffff', color: 'inherit',
            padding: 20, borderRadius: 8, width: 360, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Add Custom Scanner Condition</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0' }}>
              <div>
                <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Filter Field:</label>
                <select
                  value={builderField}
                  onChange={(e) => setBuilderField(e.target.value)}
                  style={{ width: '100%', padding: 6, borderRadius: 4, backgroundColor: mode === 'dark' ? '#111827' : '#f3f4f6', color: 'inherit', border: '1px solid #374151' }}
                >
                  <option value="price">Price ($)</option>
                  <option value="changePct">24h Change (%)</option>
                  <option value="gapPct">Gap (%)</option>
                  <option value="relativeVolume">Relative Volume (RVOL)</option>
                  <option value="rsi">RSI (14)</option>
                  <option value="atr">ATR (14)</option>
                  <option value="volume">Volume</option>
                  <option value="marketCapM">Market Cap ($M)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Operator:</label>
                <select
                  value={builderOp}
                  onChange={(e) => setBuilderOp(e.target.value as any)}
                  style={{ width: '100%', padding: 6, borderRadius: 4, backgroundColor: mode === 'dark' ? '#111827' : '#f3f4f6', color: 'inherit', border: '1px solid #374151' }}
                >
                  <option value=">">Greater than (&gt;)</option>
                  <option value="<">Less than (&lt;)</option>
                  <option value=">=">Greater or equal (&gt;=)</option>
                  <option value="<=">Less or equal (&lt;=)</option>
                  <option value="==">Equals (==)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Target Value:</label>
                <input
                  type="text"
                  value={builderVal}
                  onChange={(e) => setBuilderVal(e.target.value)}
                  style={{ width: '94%', padding: 6, borderRadius: 4, backgroundColor: mode === 'dark' ? '#111827' : '#f3f4f6', color: 'inherit', border: '1px solid #374151' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setIsBuilderOpen(false)} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#4b5563', color: '#fff' }}>Cancel</button>
              <button onClick={addCustomFilter} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#10b981', color: '#fff', fontWeight: 600 }}>Add Filter</button>
            </div>
          </div>
        </div>
      )}

      {/* Column Chooser Modal */}
      {isColumnChooserOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            backgroundColor: mode === 'dark' ? '#1f2937' : '#ffffff', color: 'inherit',
            padding: 20, borderRadius: 8, width: 340, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Customize Table Columns</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '16px 0', maxHeight: 260, overflowY: 'auto' }}>
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.key)}
                    onChange={(e) => {
                      if (e.target.checked) setVisibleColumns((prev) => [...prev, col.key]);
                      else setVisibleColumns((prev) => prev.filter((c) => c !== col.key));
                    }}
                  />
                  {col.label}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsColumnChooserOpen(false)} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#2563eb', color: '#fff' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Settings Modal */}
      {isAlertModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            backgroundColor: mode === 'dark' ? '#1f2937' : '#ffffff', color: 'inherit',
            padding: 20, borderRadius: 8, width: 380, boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ marginTop: 0, fontSize: 14 }}>Scanner Alert Channels</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={desktopAlertsEnabled}
                  onChange={(e) => setDesktopAlertsEnabled(e.target.checked)}
                />
                Enable Desktop HTML5 Notifications
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={audioAlertsEnabled}
                  onChange={(e) => setAudioAlertsEnabled(e.target.checked)}
                />
                Enable Web Audio Beep Cues
              </label>

              <div>
                <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>Webhook URL (POST Payload):</label>
                <input
                  type="text"
                  placeholder="https://your-server.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  style={{ width: '94%', padding: 6, borderRadius: 4, backgroundColor: mode === 'dark' ? '#111827' : '#f3f4f6', color: 'inherit', border: '1px solid #374151' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsAlertModalOpen(false)} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', backgroundColor: '#2563eb', color: '#fff' }}>Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
