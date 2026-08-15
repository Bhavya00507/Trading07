// src/components/StrategyTesterPanel.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { getMarketCandles } from '../services/api';
import { runBacktest, BacktestTrade, BacktestMetrics, EquityPoint } from '../services/backtester';
import { formatPrice } from './Watchlist';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  height: '100%',
  fontSize: 11,
  gap: 16,
  padding: '12px',
  overflowY: 'auto',
  flexWrap: 'wrap',
};

const leftPane: React.CSSProperties = {
  flex: '1 1 300px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const rightPane: React.CSSProperties = {
  flex: '2 1 500px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minWidth: 400,
};

const blockStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const titleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: 4,
};

const inputRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: '4px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  outline: 'none',
  width: 100,
  textAlign: 'right',
};

const selectStyle: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  cursor: 'pointer',
  width: 100,
};

const metricsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 8,
  marginTop: 4,
};

const metricCard = (label: string, value: string, color?: string): React.ReactNode => (
  <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 4 }}>
    <span style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 700, marginTop: 2, color: color || 'var(--text-primary)' }}>{value}</span>
  </div>
);

const StrategyTesterPanel: React.FC = () => {
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const watchlist = useAppStore((s) => s.watchlist);
  const globalTimeframe = useMarketStore((s) => s.timeframe);

  // Strategy Builder State
  interface StrategyBlock {
    id: string;
    type: 'indicator' | 'risk' | 'logic' | 'condition';
    name: string;
    params: Record<string, any>;
  }

  // Configuration State
  const [strategy, setStrategy] = useState<'ema_crossover' | 'rsi_reversal' | 'macd_trend' | 'breakout' | 'custom_visual'>('ema_crossover');
  const [symbol, setSymbol] = useState<string>(selectedInstrument?.symbol || 'BTCUSDT');
  const [timeframe, setTimeframe] = useState<string>(globalTimeframe || '1m');
  const [initialCapital, setInitialCapital] = useState<string>('10000');
  const [positionSize, setPositionSize] = useState<string>('1.0');
  const [commission, setCommission] = useState<string>('0.05');
  const [slippage, setSlippage] = useState<string>('0.02');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  const [blocks, setBlocks] = useState<StrategyBlock[]>([
    { id: '1', type: 'indicator', name: 'EMA Crossover', params: { shortPeriod: 9, longPeriod: 21 } },
    { id: '2', type: 'risk', name: 'Risk Limit', params: { maxDailyDrawdown: 10, riskPerTradePct: 2.0 } },
    { id: '3', type: 'condition', name: 'RSI Bounds', params: { period: 14, overbought: 70, oversold: 30 } },
    { id: '4', type: 'logic', name: 'AND Logic', params: {} }
  ]);

  const addBlock = (type: StrategyBlock['type']) => {
    let name = '';
    let params: Record<string, any> = {};
    if (type === 'indicator') {
      name = 'EMA Crossover';
      params = { shortPeriod: 9, longPeriod: 21 };
    } else if (type === 'risk') {
      name = 'Risk Limit';
      params = { maxDailyDrawdown: 10, riskPerTradePct: 2.0 };
    } else if (type === 'condition') {
      name = 'RSI Bounds';
      params = { period: 14, overbought: 70, oversold: 30 };
    } else if (type === 'logic') {
      name = 'AND Logic';
      params = {};
    }
    const newBlock: StrategyBlock = {
      id: Math.random().toString(36).substring(7),
      type,
      name,
      params
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const updateBlockParam = (id: string, key: string, value: any) => {
    setBlocks(blocks.map(b => {
      if (b.id === id) {
        return { ...b, params: { ...b.params, [key]: value } };
      }
      return b;
    }));
  };

  const handleExportStrategy = () => {
    const dataStr = JSON.stringify(blocks, null, 2);
    navigator.clipboard.writeText(dataStr);
    useAppStore.getState().addToast('success', 'Strategy exported and copied to clipboard!');
  };

  const handleImportStrategy = () => {
    const dataStr = prompt('Paste your exported strategy JSON here:');
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
          useAppStore.getState().addToast('success', 'Strategy imported successfully!');
        } else {
          throw new Error('Invalid format');
        }
      } catch (e) {
        useAppStore.getState().addToast('error', 'Failed to import strategy. Check JSON format.');
      }
    }
  };

  // Results State
  const [results, setResults] = useState<{
    trades: BacktestTrade[];
    equityCurve: EquityPoint[];
    metrics: BacktestMetrics;
  } | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);
  const lineSeriesInstance = useRef<ISeriesApi<'Line'> | null>(null);

  // Synchronize configuration with global states on mount
  useEffect(() => {
    if (selectedInstrument) setSymbol(selectedInstrument.symbol);
  }, [selectedInstrument]);

  useEffect(() => {
    if (globalTimeframe) setTimeframe(globalTimeframe);
  }, [globalTimeframe]);

  // Equity Curve Chart Lifecycle
  useEffect(() => {
    if (!results || !chartContainerRef.current) return;
    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0b0d12' },
        textColor: '#8f929d',
      },
      grid: {
        vertLines: { color: 'rgba(43, 49, 57, 0.15)' },
        horzLines: { color: 'rgba(43, 49, 57, 0.15)' },
      },
      crosshair: { mode: 1 },
      timeScale: {
        borderColor: 'rgba(43, 49, 57, 0.4)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const series = chart.addLineSeries({
      color: '#0ecb81',
      lineWidth: 2,
      title: 'Equity ($)'
    });

    // Load data
    const formattedData = results.equityCurve.map(pt => ({
      time: pt.time as UTCTimestamp,
      value: pt.balance
    }));
    series.setData(formattedData as any);

    chartInstance.current = chart;
    lineSeriesInstance.current = series;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartInstance.current) {
        chartInstance.current.resize(
          chartContainerRef.current.clientWidth,
          chartContainerRef.current.clientHeight
        );
      }
    };
    window.addEventListener('resize', handleResize);
    const observer = new ResizeObserver(() => handleResize());
    observer.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (chartInstance.current) {
        chartInstance.current.remove();
        chartInstance.current = null;
      }
    };
  }, [results]);

  const handleRunBacktest = async () => {
    setIsRunning(true);
    try {
      const rawCandles = await getMarketCandles(symbol, timeframe);
      const formatted = rawCandles.map((c: any) => ({
        time: (c.timestamp / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0,
      })).sort((a: any, b: any) => a.time - b.time);

      const size = parseFloat(positionSize) || 1.0;
      const comm = parseFloat(commission) || 0.05;
      const slip = parseFloat(slippage) || 0.02;
      const capital = parseFloat(initialCapital) || 10000;

      const backtestResult = runBacktest(
        symbol,
        formatted,
        strategy,
        size,
        comm,
        slip,
        capital
      );

      setResults(backtestResult);
      useAppStore.getState().addToast('success', 'Backtest completed successfully!');
    } catch (e) {
      console.error(e);
      useAppStore.getState().addToast('error', 'Backtest failed to execute.');
    } finally {
      setIsRunning(false);
    }
  };

  const getPnlColor = (val: number) => {
    return val > 0 ? 'var(--success)' : val < 0 ? 'var(--danger)' : 'var(--text-secondary)';
  };

  return (
    <div style={containerStyle}>
      {/* Left Pane: Form and Metrics */}
      <div style={leftPane}>
        <div style={blockStyle}>
          <span style={titleStyle}>Configuration</span>
          <div style={inputRow}>
            <span style={labelStyle}>Strategy Preset</span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              style={selectStyle}
            >
              <option value="ema_crossover">EMA Crossover</option>
              <option value="rsi_reversal">RSI Reversal</option>
              <option value="macd_trend">MACD Trend</option>
              <option value="breakout">Breakout (20c)</option>
              <option value="custom_visual">Custom (Visual Builder)</option>
            </select>
          </div>
          <div style={inputRow}>
            <span style={labelStyle}>Symbol</span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              style={selectStyle}
            >
              {watchlist.map(inst => (
                <option key={inst.symbol} value={inst.symbol}>{inst.symbol}</option>
              ))}
            </select>
          </div>
          <div style={inputRow}>
            <span style={labelStyle}>Timeframe</span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              style={selectStyle}
            >
              {['1m', '5m', '15m', '1H', '4H', '1D'].map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
          <div style={inputRow}>
            <span style={labelStyle}>Initial Capital ($)</span>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={inputRow}>
            <span style={labelStyle}>Position Size (Qty)</span>
            <input
              type="number"
              value={positionSize}
              onChange={(e) => setPositionSize(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={inputRow}>
            <span style={labelStyle}>Commission (%)</span>
            <input
              type="number"
              step="0.01"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={inputRow}>
            <span style={labelStyle}>Slippage (%)</span>
            <input
              type="number"
              step="0.01"
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              style={inputStyle}
            />
          </div>
          <button
            onClick={handleRunBacktest}
            disabled={isRunning}
            style={{
              marginTop: 6,
              padding: '6px',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 4,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            {isRunning ? 'Running Simulation...' : 'Run Backtest'}
          </button>
        </div>

        {strategy === 'custom_visual' && (
          <div style={blockStyle}>
            <span style={titleStyle}>Visual Strategy Builder</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => addBlock('indicator')} style={{ flex: 1, padding: '4px 6px', fontSize: 9, fontWeight: 700, borderRadius: 3, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>+ Indicator</button>
              <button onClick={() => addBlock('risk')} style={{ flex: 1, padding: '4px 6px', fontSize: 9, fontWeight: 700, borderRadius: 3, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>+ Risk</button>
              <button onClick={() => addBlock('condition')} style={{ flex: 1, padding: '4px 6px', fontSize: 9, fontWeight: 700, borderRadius: 3, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>+ Condition</button>
              <button onClick={() => addBlock('logic')} style={{ flex: 1, padding: '4px 6px', fontSize: 9, fontWeight: 700, borderRadius: 3, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>+ Logic</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0', maxHeight: 200, overflowY: 'auto' }}>
              {blocks.map((b) => (
                <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 4, padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
                    <span style={{ color: b.type === 'indicator' ? '#0ecb81' : b.type === 'risk' ? '#f6465d' : b.type === 'condition' ? '#ea7317' : '#9c27b0' }}>
                      {b.name} ({b.type.toUpperCase()})
                    </span>
                    <button onClick={() => removeBlock(b.id)} style={{ background: 'transparent', border: 'none', color: '#ff4d57', cursor: 'pointer', fontSize: 10 }}>Remove</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {Object.entries(b.params).map(([k, v]) => (
                      <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>
                        <input
                          type="number"
                          value={v}
                          onChange={(e) => updateBlockParam(b.id, k, parseFloat(e.target.value) || 0)}
                          style={{ width: 45, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', fontSize: 10, textAlign: 'center' }}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {blocks.length === 0 && (
                <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)' }}>No strategy blocks added.</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={handleExportStrategy} style={{ flex: 1, padding: 6, borderRadius: 3, fontSize: 10, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', cursor: 'pointer' }}>Export Strategy</button>
              <button onClick={handleImportStrategy} style={{ flex: 1, padding: 6, borderRadius: 3, fontSize: 10, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: '#fff', cursor: 'pointer' }}>Import Strategy</button>
            </div>
          </div>
        )}

        <div style={{ height: 1 }} />
        {results && (
          <div style={blockStyle}>
            <span style={titleStyle}>Strategy Metrics</span>
            <div style={metricsGrid}>
              {metricCard('Net Profit', `$${results.metrics.netProfit.toFixed(2)}`, getPnlColor(results.metrics.netProfit))}
              {metricCard('Win Rate', `${results.metrics.winRate.toFixed(1)}%`, results.metrics.winRate >= 50 ? 'var(--success)' : 'var(--danger)')}
              {metricCard('Sharpe Ratio', results.metrics.sharpeRatio.toFixed(2))}
              {metricCard('Gross Profit', `$${results.metrics.grossProfit.toFixed(2)}`, 'var(--success)')}
              {metricCard('Gross Loss', `$${results.metrics.grossLoss.toFixed(2)}`, 'var(--danger)')}
              {metricCard('Max Drawdown', `${results.metrics.maxDrawdown.toFixed(1)}%`, 'var(--danger)')}
              {metricCard('Profit Factor', results.metrics.profitFactor.toFixed(2), results.metrics.profitFactor >= 1.5 ? 'var(--success)' : 'var(--text-secondary)')}
              {metricCard('Avg R:R', results.metrics.avgRR.toFixed(2))}
              {metricCard('Total Trades', results.metrics.totalTrades.toString())}
            </div>
          </div>
        )}
      </div>

      {/* Right Pane: Equity Curve & Trade List */}
      <div style={rightPane}>
        {results ? (
          <>
            <div style={{ ...blockStyle, height: 200, position: 'relative' }}>
              <span style={titleStyle}>Equity Growth Curve</span>
              <div ref={chartContainerRef} style={{ width: '100%', height: 'calc(100% - 20px)' }} />
            </div>

            <div style={{ ...blockStyle, flex: 1, maxHeight: 220, overflow: 'hidden' }}>
              <span style={titleStyle}>Trades Executed ({results.trades.length})</span>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                      <th style={{ textAlign: 'left', padding: '4px', color: 'var(--text-secondary)' }}>Entry Date</th>
                      <th style={{ textAlign: 'left', padding: '4px', color: 'var(--text-secondary)' }}>Side</th>
                      <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)' }}>Entry Price</th>
                      <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)' }}>Exit Price</th>
                      <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)' }}>Quantity</th>
                      <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)' }}>Duration</th>
                      <th style={{ textAlign: 'right', padding: '4px', color: 'var(--text-secondary)' }}>Realized PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trades.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '4px', color: 'var(--text-secondary)' }}>
                          {new Date(t.entryTime * 1000).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: '2-digit', day: '2-digit' })}
                        </td>
                        <td style={{ padding: '4px', fontWeight: 700, color: t.side === 'long' ? 'var(--success)' : 'var(--danger)' }}>
                          {t.side.toUpperCase()}
                        </td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>{formatPrice(t.entryPrice, symbol)}</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>{formatPrice(t.exitPrice, symbol)}</td>
                        <td style={{ padding: '4px', textAlign: 'right' }}>{t.quantity}</td>
                        <td style={{ padding: '4px', textAlign: 'right', color: 'var(--text-secondary)' }}>{t.duration}</td>
                        <td style={{ padding: '4px', textAlign: 'right', fontWeight: 700, color: getPnlColor(t.pnl) }}>
                          {t.pnl > 0 ? '+' : ''}{t.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div style={{ ...blockStyle, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Configure params and run a backtest to see the results.
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyTesterPanel;
