// src/components/Chart.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, LineStyle, UTCTimestamp } from 'lightweight-charts';
import { createIndicatorWorker } from '../services/indicatorWorker';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { usePositionStore } from '../store/positionStore';
import { useOrderStore } from '../store/orderStore';
import { getMarketCandles, modifySLTP, closeSymbol, reversePosition, breakEven, partialClose, placeOrder, modifyOrder, modifyTrailingStop } from '../services/api';
import { useReplayStore } from '../store/replayStore';
import { useAlertStore } from '../store/alertStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { candleEngine } from '../services/candleEngine';
import { MarketSessionService } from '../services/marketSessionService';
import {
  calculateEMA,
  calculateVWAP,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochastic,
  calculateIchimoku,
  calculateSuperTrend,
  calculateADX,
  calculateVolumeProfile,
  calculatePivotPoints,
  ChartDataPoint,
  SeriesPoint
} from '../services/indicatorCalcs';
import './Chart.css';

function parseTimestampToSeconds(time: any): number {
  if (time === null || time === undefined) {
    throw new Error("Timestamp is null or undefined");
  }
  if (time instanceof Date) {
    return Math.floor(time.getTime() / 1000);
  }
  if (typeof time === 'string') {
    if (!isNaN(Number(time))) {
      time = Number(time);
    } else {
      const parsed = Date.parse(time);
      if (isNaN(parsed)) {
        throw new Error(`Invalid Date string: ${time}`);
      }
      return Math.floor(parsed / 1000);
    }
  }
  if (typeof time === 'number') {
    if (isNaN(time)) {
      throw new Error("Timestamp is NaN");
    }
    if (time > 30000000000) { // Milliseconds
      return Math.floor(time / 1000);
    }
    return Math.floor(time);
  }
  throw new Error(`Unsupported time format: ${typeof time}`);
}

function convertToHeikinAshi(candles: any[]): any[] {
  if (candles.length === 0) return [];
  const haCandles: any[] = [];
  let prevOpen = candles[0].open;
  let prevClose = candles[0].close;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (prevOpen + prevClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    haCandles.push({
      time: c.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: c.volume
    });

    prevOpen = haOpen;
    prevClose = haClose;
  }
  return haCandles;
}

function convertToRenko(candles: any[], brickSize = 10): any[] {
  if (candles.length === 0) return [];
  const renkoCandles: any[] = [];
  let lastPrice = candles[0].close;
  let lastTime = candles[0].time;

  for (const c of candles) {
    const diff = c.close - lastPrice;
    const bricks = Math.floor(Math.abs(diff) / brickSize);
    if (bricks > 0) {
      const dir = diff > 0 ? 1 : -1;
      for (let b = 0; b < bricks; b++) {
        const open = lastPrice;
        const close = lastPrice + (dir * brickSize);
        renkoCandles.push({
          time: (lastTime as number) + b + 1,
          open,
          high: Math.max(open, close),
          low: Math.min(open, close),
          close,
          volume: 0
        });
        lastPrice = close;
      }
      lastTime = (lastTime as number) + bricks;
    }
  }
  return renkoCandles;
}


function prepareCandlesForChart(rawCandles: any[]): ChartDataPoint[] {
  if (!Array.isArray(rawCandles)) return [];
  
  const formatted: ChartDataPoint[] = [];
  
  for (const c of rawCandles) {
    if (!c || typeof c !== 'object') continue;
    try {
      const ts = c.timestamp !== undefined ? c.timestamp : c.time;
      const seconds = parseTimestampToSeconds(ts);
      const open = Number(c.open);
      let high = Number(c.high);
      let low = Number(c.low);
      const close = Number(c.close);
      const volume = c.volume !== undefined ? Number(c.volume) : 0;
      
      if (isNaN(seconds) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) ||
          open <= 0 || close <= 0) {
        continue;
      }
      
      high = Math.max(high, open, close);
      low = Math.min(low, open, close);
      if (low <= 0) continue;
      
      formatted.push({
        time: seconds as any,
        open,
        high,
        low,
        close,
        volume,
      });
    } catch (e) {
      // Ignore malformed candle
    }
  }
  
  // Sort by ascending time
  formatted.sort((a, b) => (a.time as number) - (b.time as number));
  
  // Remove duplicates (keeping the last one if duplicates exist)
  const uniqueMap = new Map<number, ChartDataPoint>();
  formatted.forEach(c => uniqueMap.set(c.time as number, c));
  
  return Array.from(uniqueMap.values());
}

// Type definitions for our cell state
interface CellIndicators {
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  vwap: boolean;
  bb: boolean;
  rsi: boolean;
  macd: boolean;
  atr: boolean;
  stochastic: boolean;
  ichimoku: boolean;
  supertrend: boolean;
  adx: boolean;
  volProfile: boolean;
  pivots: boolean;
}

interface CellParams {
  ema20: { period: number };
  ema50: { period: number };
  ema200: { period: number };
  bb: { period: number; multiplier: number };
  rsi: { period: number };
  macd: { fast: number; slow: number; signal: number };
  atr: { period: number };
  stochastic: { kPeriod: number; dPeriod: number };
  ichimoku: { tenkan: number; kijun: number; senkou: number };
  supertrend: { period: number; multiplier: number };
  adx: { period: number };
  volProfile: { bins: number };
}

interface Drawing {
  id: string;
  type: 'trendline' | 'horizontal' | 'vertical' | 'rectangle' | 'fibonacci' | 'text' | 'arrow';
  points: { time: number; price: number }[];
  text?: string;
  color: string;
  arrowDir?: 'up' | 'down';
}

interface CellState {
  id: number;
  symbol: string;
  timeframe: string;
  indicators: CellIndicators;
  params: CellParams;
  drawings: Drawing[];
}

interface IndicatorTemplate {
  name: string;
  indicators: CellIndicators;
  params: CellParams;
}

const DEFAULT_PARAMS: CellParams = {
  ema20: { period: 20 },
  ema50: { period: 50 },
  ema200: { period: 200 },
  bb: { period: 20, multiplier: 2 },
  rsi: { period: 14 },
  macd: { fast: 12, slow: 26, signal: 9 },
  atr: { period: 14 },
  stochastic: { kPeriod: 14, dPeriod: 3 },
  ichimoku: { tenkan: 9, kijun: 26, senkou: 52 },
  supertrend: { period: 10, multiplier: 3 },
  adx: { period: 14 },
  volProfile: { bins: 20 }
};

const getPrecision = (sym: string) => {
  const symbol = sym.toUpperCase();
  if (symbol === 'BTCUSDT') return 2;
  if (symbol === 'ETHUSDT') return 2;
  if (symbol === 'EURUSD') return 5;
  if (symbol === 'GBPUSD') return 5;
  if (symbol === 'USDJPY') return 3;
  if (symbol === 'XAUUSD') return 2;
  if (symbol === 'XAGUSD') return 3;
  if (symbol === 'US30') return 1;
  if (symbol === 'NAS100') return 1;
  if (symbol === 'SPX500') return 1;
  if (symbol === 'GER40') return 1;
  
  if (symbol.includes('JPY')) return 3;
  if (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP')) return 5;
  return 2;
};

// Sub-component for a single chart cell
interface SingleChartCellProps {
  cell: CellState;
  isActive: boolean;
  onSelect: () => void;
  crosshairTime: number | null;
  onCrosshairMove: (time: number | null) => void;
  activeDrawingTool: string | null;
  setActiveDrawingTool: (tool: string | null) => void;
  drawingColor: string;
  setCells: (newCells: CellState[] | ((prev: CellState[]) => CellState[])) => void;
  chartType: 'candlestick' | 'hollow' | 'bar' | 'line' | 'area' | 'baseline' | 'heikin';
  themeBg: string;
  themeGridColor: string;
  themeCrosshairColor: string;
  themeBullColor: string;
  themeBearColor: string;
  themeWatermarkVisible: boolean;
  onRegisterChartApi?: (id: number, chart: IChartApi) => void;
  onUnregisterChartApi?: (id: number) => void;
}

const SingleChartCell = React.memo<SingleChartCellProps>(({
  cell,
  isActive,
  onSelect,
  crosshairTime,
  onCrosshairMove,
  activeDrawingTool,
  setActiveDrawingTool,
  drawingColor,
  setCells,
  chartType,
  themeBg,
  themeGridColor,
  themeCrosshairColor,
  themeBullColor,
  themeBearColor,
  themeWatermarkVisible,
  onRegisterChartApi,
  onUnregisterChartApi
}) => {
  const { symbol, timeframe, indicators } = cell;
  const positions = usePositionStore((s) => s.positions);
  const orders = useOrderStore((s) => s.orders);
  const connectionStatus = useMarketStore((s) => s.connectionStatus);
  const realMarketConnectionStatus = useMarketStore((s) => s.realMarketConnectionStatus);
  const pendingOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.symbol === symbol &&
        (o.status === 'PENDING' || o.status === 'PARTIAL') &&
        o.price !== undefined
    );
  }, [orders, symbol]);
  const prices = useMarketStore((s) => s.prices);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const atrContainerRef = useRef<HTMLDivElement>(null);
  const stochasticContainerRef = useRef<HTMLDivElement>(null);
  const adxContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mainChartInstance = useRef<IChartApi | null>(null);
  const rsiChartInstance = useRef<IChartApi | null>(null);
  const macdChartInstance = useRef<IChartApi | null>(null);
  const atrChartInstance = useRef<IChartApi | null>(null);
  const stochasticChartInstance = useRef<IChartApi | null>(null);
  const adxChartInstance = useRef<IChartApi | null>(null);

  const candleSeriesInstance = useRef<ISeriesApi<any> | null>(null);

  // References to overlay series
  const ema20SeriesRef = useRef<any>(null);
  const ema50SeriesRef = useRef<any>(null);
  const ema200SeriesRef = useRef<any>(null);
  const vwapSeriesRef = useRef<any>(null);
  const bbUpperSeriesRef = useRef<any>(null);
  const bbMiddleSeriesRef = useRef<any>(null);
  const bbLowerSeriesRef = useRef<any>(null);
  const ichimokuTenkanSeriesRef = useRef<any>(null);
  const ichimokuKijunSeriesRef = useRef<any>(null);
  const ichimokuSpanASeriesRef = useRef<any>(null);
  const ichimokuSpanBSeriesRef = useRef<any>(null);
  const ichimokuChikouSeriesRef = useRef<any>(null);
  const supertrendBullishSeriesRef = useRef<any>(null);
  const supertrendBearishSeriesRef = useRef<any>(null);

  // References to sub-pane series
  const rsiLineSeriesRef = useRef<any>(null);
  const macdLineSeriesRef = useRef<any>(null);
  const macdSignalSeriesRef = useRef<any>(null);
  const macdHistSeriesRef = useRef<any>(null);
  const atrLineSeriesRef = useRef<any>(null);
  const stochKSeriesRef = useRef<any>(null);
  const stochDSeriesRef = useRef<any>(null);
  const adxSeriesRef = useRef<any>(null);
  const plusDISeriesRef = useRef<any>(null);
  const minusDISeriesRef = useRef<any>(null);

  // References to SL/TP/TS lines
  const entryLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);
  const tsLineRef = useRef<any>(null);
  const pendingOrderLinesRef = useRef<{ orderId: string; line: any }[]>([]);
  const closingSymbolsRef = useRef<Set<string>>(new Set());

  // References to price lines of overlay indicators
  const pocLineRef = useRef<any>(null);
  const pivotPLineRef = useRef<any>(null);
  const pivotR1LineRef = useRef<any>(null);
  const pivotS1LineRef = useRef<any>(null);
  const pivotR2LineRef = useRef<any>(null);
  const pivotS2LineRef = useRef<any>(null);

  // Dragging state references
  const draggingRef = useRef<{ type: 'sl' | 'tp' | 'ts' | 'order'; startY: number; orderId?: string } | null>(null);
  const isMovingRef = useRef<boolean>(false);

  // Active position for this specific cell symbol
  const activePosition = useMemo(() => {
    return positions.find((p) => p.symbol === symbol && p.quantity !== 0);
  }, [positions, symbol]);

  const replayActive = useReplayStore((s) => s.isReplayActive && s.symbol === symbol && s.timeframe === timeframe);
  const replayIndex = useReplayStore((s) => s.currentIndex);
  const replayCandles = useReplayStore((s) => s.candles);

  const visibleCandles = useMemo(() => {
    if (replayActive) {
      return replayCandles.slice(0, replayIndex);
    }
    return null;
  }, [replayActive, replayCandles, replayIndex]);

  // Drawing & Measurement states
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isFetchingNewData, setIsFetchingNewData] = useState<boolean>(false);
  const [candlesCount, setCandlesCount] = useState<number>(0);
  const [tempPoints, setTempPoints] = useState<{ time: number; price: number }[]>([]);

  // Advanced Chart Trade Panel & context menu states
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const [entryY, setEntryY] = useState<number | null>(null);
  const [slY, setSlY] = useState<number | null>(null);
  const [tpY, setTpY] = useState<number | null>(null);
  const [tsY, setTsY] = useState<number | null>(null);

  const updateCoordinates = () => {
    const series = candleSeriesInstance.current;
    if (!series || !activePosition) {
      setEntryY(null);
      setSlY(null);
      setTpY(null);
      setTsY(null);
      return;
    }
    
    const entryCoord = series.priceToCoordinate(activePosition.average_price);
    setEntryY(entryCoord);

    const slCoord = activePosition.stop_loss ? series.priceToCoordinate(activePosition.stop_loss) : null;
    setSlY(slCoord);

    const tpCoord = activePosition.take_profit ? series.priceToCoordinate(activePosition.take_profit) : null;
    setTpY(tpCoord);

    const tsCoord = activePosition.trailing_stop ? series.priceToCoordinate(activePosition.trailing_stop) : null;
    setTsY(tsCoord);
  };

  useEffect(() => {
    const chart = mainChartInstance.current;
    if (!chart) return;

    const interval = setInterval(() => {
      updateCoordinates();
    }, 100);

    chart.timeScale().subscribeVisibleLogicalRangeChange(updateCoordinates);
    chart.subscribeCrosshairMove(updateCoordinates);

    return () => {
      clearInterval(interval);
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(updateCoordinates);
        chart.unsubscribeCrosshairMove(updateCoordinates);
      } catch {}
    };
  }, [activePosition, symbol]);

  const [countdownText, setCountdownText] = useState('');
  const [marketClosedText, setMarketClosedText] = useState('');
  const cellCandles = useMarketStore((s) => s.candles[`${symbol}|${timeframe}`]);
  const latestCandle = cellCandles && cellCandles.length > 0 ? cellCandles[cellCandles.length - 1] : null;

  useEffect(() => {
    const updateCountdown = () => {
      const isOpen = MarketSessionService.isOpen(symbol);
      if (!isOpen) {
        setCountdownText('');
        const nextOpen = MarketSessionService.nextOpen(symbol);
        if (nextOpen) {
          const diff = nextOpen.getTime() - Date.now();
          if (diff <= 0) {
            setMarketClosedText('● Market Closed');
          } else {
            const secs = Math.floor(diff / 1000) % 60;
            const mins = Math.floor(diff / 60000) % 60;
            const hours = Math.floor(diff / 3600000) % 24;
            const days = Math.floor(diff / 86400000);
            const pad = (n: number) => String(n).padStart(2, '0');
            
            let timeStr = '';
            if (days > 0) timeStr += `${days}d `;
            if (hours > 0 || days > 0) timeStr += `${hours}h `;
            timeStr += `${pad(mins)}m:${pad(secs)}s`;

            setMarketClosedText(`● Market Closed | Next Session Opens In: ${timeStr}`);
          }
        } else {
          setMarketClosedText('● Market Closed');
        }
        return;
      }

      setMarketClosedText('');
      if (!latestCandle) {
        setCountdownText('');
        return;
      }
      
      // Compute timeframe in ms
      let tf_ms = 60000;
      const tf = timeframe.toLowerCase();
      if (tf === '1s') tf_ms = 1000;
      else if (tf === '5s') tf_ms = 5000;
      else if (tf === '15s') tf_ms = 15000;
      else if (tf === '30s') tf_ms = 30000;
      else if (tf === '1m') tf_ms = 60000;
      else if (tf === '3m') tf_ms = 180000;
      else if (tf === '5m') tf_ms = 300000;
      else if (tf === '10m') tf_ms = 600000;
      else if (tf === '15m') tf_ms = 900000;
      else if (tf === '30m') tf_ms = 1800000;
      else if (tf === '1h') tf_ms = 3600000;
      else if (tf === '2h') tf_ms = 7200000;
      else if (tf === '4h') tf_ms = 14400000;
      else if (tf === '1d' || tf === 'daily') tf_ms = 86400000;
      else if (tf === '1w' || tf === 'weekly') tf_ms = 604800000;

      // Align to UTC timeframe boundary: countdown until next boundary
      const nowMs = Date.now();
      const currentBoundary = Math.floor(nowMs / tf_ms) * tf_ms;
      const nextBoundary = currentBoundary + tf_ms;
      const diff = nextBoundary - nowMs;

      if (diff <= 0) {
        setCountdownText('00:00');
      } else {
        const secs = Math.floor(diff / 1000) % 60;
        const mins = Math.floor(diff / 60000) % 60;
        const hours = Math.floor(diff / 3600000) % 24;
        const days = Math.floor(diff / 86400000);

        const pad = (n: number) => String(n).padStart(2, '0');
        if (tf_ms >= 86400000) {
          let str = '';
          if (days > 0) str += `${days}d `;
          if (hours > 0 || days > 0) str += `${hours}h `;
          str += `${mins}m`;
          setCountdownText(str);
        } else if (hours > 0) {
          setCountdownText(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
        } else {
          setCountdownText(`${pad(mins)}:${pad(secs)}`);
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeframe, symbol, latestCandle?.timestamp]);

  const livePrice = prices[symbol]?.price ?? activePosition?.average_price ?? 0;
  const livePnl = useMemo(() => {
    if (!activePosition) return 0;
    return activePosition.quantity > 0
      ? (livePrice - activePosition.average_price) * activePosition.quantity
      : (activePosition.average_price - livePrice) * Math.abs(activePosition.quantity);
  }, [activePosition, livePrice]);

  const pnlPct = useMemo(() => {
    if (!activePosition) return 0;
    const margin = (Math.abs(activePosition.quantity) * livePrice) / 10.0;
    return margin > 0 ? (livePnl / margin) * 100 : 0;
  }, [activePosition, livePrice, livePnl]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!activePosition) return;
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleClosePos = async () => {
    if (closingSymbolsRef.current.has(symbol)) return;
    closingSymbolsRef.current.add(symbol);
    try {
      const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
      await closeSymbol(symbol, undefined, activeAccountType);
      useAppStore.getState().addToast('success', `Closed position for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to close position');
    } finally {
      closingSymbolsRef.current.delete(symbol);
    }
  };

  const handleReversePos = async () => {
    try {
      await reversePosition(symbol);
      useAppStore.getState().addToast('success', `Reversed position for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to reverse position');
    }
  };

  const handleBEPos = async () => {
    try {
      await breakEven(symbol);
      useAppStore.getState().addToast('success', `Moved SL to break-even for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to move to break-even');
    }
  };

  const handlePartialClosePos = async (p: any, pct: number) => {
    try {
      await partialClose(symbol, Math.abs(p.quantity) * pct);
      useAppStore.getState().addToast('success', `Partially closed position for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to partial close');
    }
  };

  const handleDuplicatePos = async () => {
    if (!activePosition) return;
    try {
      await placeOrder({
        symbol,
        side: activePosition.quantity > 0 ? 'buy' : 'sell',
        type: 'market',
        quantity: Math.abs(activePosition.quantity),
      });
      useAppStore.getState().addToast('success', `Duplicated trade for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to duplicate trade');
    }
  };

  const handleTrailStop = async (distance: number) => {
    try {
      await modifyTrailingStop(symbol, distance);
      useAppStore.getState().addToast('success', `Trailing Stop set to ${distance} units for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to modify trailing stop');
    }
  };

  const getRR = (p: any, entry: number) => {
    if (!p.stop_loss || !p.take_profit) return 'N/A';
    const slDist = Math.abs(entry - p.stop_loss);
    const tpDist = Math.abs(p.take_profit - entry);
    return slDist > 0 ? `${(tpDist / slDist).toFixed(1)}:1` : 'N/A';
  };

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);
  const [previewPoint, setPreviewPoint] = useState<{ time: number; price: number } | null>(null);
  const [measureStart, setMeasureStart] = useState<{ time: number; price: number; x: number; y: number; index: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ time: number; price: number; x: number; y: number; index: number } | null>(null);
  const [hoverPoint, setHoverPoint] = useState<{ time: number; price: number; x: number; y: number } | null>(null);

  const formattedCandlesRef = useRef<ChartDataPoint[]>([]);
  const isLoadingHistoryRef = useRef(false);
  const hasSetDataRef = useRef<boolean>(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = createIndicatorWorker();
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Keep state values in refs to avoid stale closures in canvas callbacks
  const drawingsRef = useRef<Drawing[]>(cell.drawings);
  drawingsRef.current = cell.drawings;

  const tempPointsRef = useRef(tempPoints);
  tempPointsRef.current = tempPoints;

  const previewPointRef = useRef(previewPoint);
  previewPointRef.current = previewPoint;

  const activeDrawingToolRef = useRef(activeDrawingTool);
  activeDrawingToolRef.current = activeDrawingTool;

  const measureStartRef = useRef(measureStart);
  measureStartRef.current = measureStart;

  const measureEndRef = useRef(measureEnd);
  measureEndRef.current = measureEnd;

  const hoverPointRef = useRef(hoverPoint);
  hoverPointRef.current = hoverPoint;

  const addDrawing = (d: Drawing) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === cell.id
          ? { ...c, drawings: [...c.drawings, d] }
          : c
      )
    );
  };

  const [eventCountdowns, setEventCountdowns] = useState<{ id: string; name: string; importance: string; countdown: string }[]>([]);

  useEffect(() => {
    const events = [
      { id: '1', name: 'NFP (USD)', importance: 'HIGH', timestamp: Date.now() + 5 * 3600000 },
      { id: '2', name: 'CPI (GBP)', importance: 'HIGH', timestamp: Date.now() - 30 * 60000 },
      { id: '3', name: 'FOMC (USD)', importance: 'HIGH', timestamp: Date.now() + 2.5 * 3600000 },
      { id: '4', name: 'ECB (EUR)', importance: 'HIGH', timestamp: Date.now() + 1.5 * 3600000 },
      { id: '5', name: 'GDP (USD)', importance: 'MEDIUM', timestamp: Date.now() + 10 * 3600000 },
      { id: '6', name: 'BoE (GBP)', importance: 'HIGH', timestamp: Date.now() + 72 * 3600000 }
    ];

    const updateCountdowns = () => {
      const now = Date.now();
      const list = events
        .map((ev) => {
          const diff = ev.timestamp - now;
          if (diff < -2 * 3600000) return null; // hide if happened > 2 hours ago
          
          if (diff < 0) {
            const minsAgo = Math.floor(Math.abs(diff) / 60000);
            return {
              id: ev.id,
              name: ev.name,
              importance: ev.importance,
              countdown: minsAgo < 5 ? 'LIVE' : `${minsAgo}m ago`
            };
          }

          const hours = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          const secs = Math.floor((diff % 60000) / 1000);
          return {
            id: ev.id,
            name: ev.name,
            importance: ev.importance,
            countdown: hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 3); // show top 3 upcoming

      setEventCountdowns(list);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, []);

  // Escape key to reset tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDrawingTool(null);
        setTempPoints([]);
        setMeasureStart(null);
        setMeasureEnd(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveDrawingTool]);

  // Redraw Canvas Overlay
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const chart = mainChartInstance.current;
    const series = candleSeriesInstance.current;
    if (!canvas || !chart || !series) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const timeToX = (time: number) => chart.timeScale().timeToCoordinate(time as UTCTimestamp);
    const priceToY = (price: number) => series.priceToCoordinate(price);
    const precision = getPrecision(symbol);

    // 1. Draw Saved drawings
    const drawings = drawingsRef.current || [];
    drawings.forEach((d) => {
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
      ctx.lineWidth = 2;

      if (d.type === 'trendline' && d.points.length === 2) {
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (d.type === 'horizontal' && d.points.length === 1) {
        const y = priceToY(d.points[0].price);
        if (y !== null) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(rect.width, y);
          ctx.stroke();
        }
      } else if (d.type === 'vertical' && d.points.length === 1) {
        const x = timeToX(d.points[0].time);
        if (x !== null) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, rect.height);
          ctx.stroke();
        }
      } else if (d.type === 'rectangle' && d.points.length === 2) {
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          ctx.beginPath();
          ctx.rect(x1, y1, x2 - x1, y2 - y1);
          ctx.stroke();
          ctx.fillStyle = d.color + '1a';
          ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        }
      } else if (d.type === 'fibonacci' && d.points.length === 2) {
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);
        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
          const startX = Math.min(x1, x2);
          const endX = Math.max(x1, x2);
          const p1 = d.points[0].price;
          const p2 = d.points[1].price;
          const diff = p2 - p1;
          const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
          ratios.forEach((r) => {
            const priceVal = p1 + diff * r;
            const yVal = priceToY(priceVal);
            if (yVal !== null) {
              ctx.beginPath();
              ctx.moveTo(startX, yVal);
              ctx.lineTo(endX, yVal);
              ctx.stroke();
              ctx.fillStyle = d.color;
              ctx.font = '8px sans-serif';
              ctx.fillText(`${(r * 100).toFixed(1)}% (${priceVal.toFixed(precision)})`, endX + 4, yVal + 3);
            }
          });
        }
      } else if (d.type === 'text' && d.points.length === 1 && d.text) {
        const x = timeToX(d.points[0].time);
        const y = priceToY(d.points[0].price);
        if (x !== null && y !== null) {
          ctx.fillStyle = d.color;
          ctx.font = '11px sans-serif';
          ctx.fillText(d.text, x, y);
        }
      } else if (d.type === 'arrow' && d.points.length === 1) {
        const x = timeToX(d.points[0].time);
        const y = priceToY(d.points[0].price);
        if (x !== null && y !== null) {
          ctx.fillStyle = d.color;
          ctx.beginPath();
          if (d.arrowDir === 'up') {
            ctx.moveTo(x, y);
            ctx.lineTo(x - 5, y + 8);
            ctx.lineTo(x - 2, y + 8);
            ctx.lineTo(x - 2, y + 14);
            ctx.lineTo(x + 2, y + 14);
            ctx.lineTo(x + 2, y + 8);
            ctx.lineTo(x - 5 + 10, y + 8);
          } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x - 5, y - 8);
            ctx.lineTo(x - 2, y - 8);
            ctx.lineTo(x - 2, y - 14);
            ctx.lineTo(x + 2, y - 14);
            ctx.lineTo(x + 2, y - 8);
            ctx.lineTo(x - 5 + 10, y - 8);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    });

    // 2. Draw Active drawing preview
    const activeTool = activeDrawingToolRef.current;
    const tempPoints = tempPointsRef.current || [];
    const previewPoint = previewPointRef.current;
    if (activeTool && tempPoints.length > 0 && previewPoint) {
      ctx.strokeStyle = drawingColor;
      ctx.fillStyle = drawingColor;
      ctx.lineWidth = 1.5;
      
      const x1 = timeToX(tempPoints[0].time);
      const y1 = priceToY(tempPoints[0].price);
      const x2 = timeToX(previewPoint.time);
      const y2 = priceToY(previewPoint.price);

      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        if (activeTool === 'trendline') {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (activeTool === 'rectangle') {
          ctx.beginPath();
          ctx.rect(x1, y1, x2 - x1, y2 - y1);
          ctx.stroke();
          ctx.fillStyle = drawingColor + '0d';
          ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
        } else if (activeTool === 'fibonacci') {
          const startX = Math.min(x1, x2);
          const endX = Math.max(x1, x2);
          const p1 = tempPoints[0].price;
          const p2 = previewPoint.price;
          const diff = p2 - p1;
          const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
          ratios.forEach((r) => {
            const priceVal = p1 + diff * r;
            const yVal = priceToY(priceVal);
            if (yVal !== null) {
              ctx.beginPath();
              ctx.moveTo(startX, yVal);
              ctx.lineTo(endX, yVal);
              ctx.stroke();
              ctx.fillStyle = drawingColor;
              ctx.font = '8px sans-serif';
              ctx.fillText(`${(r * 100).toFixed(1)}%`, endX + 4, yVal + 3);
            }
          });
        }
      }
    }

    // 3. Draw Measurement Tool
    const mStart = measureStartRef.current;
    const mEnd = measureEndRef.current;
    if (mStart && mEnd) {
      const x1 = mStart.x;
      const y1 = mStart.y;
      const x2 = mEnd.x;
      const y2 = mEnd.y;

      ctx.save();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      
      ctx.beginPath();
      ctx.rect(x1, y1, x2 - x1, y2 - y1);
      ctx.stroke();
      
      ctx.fillStyle = 'rgba(212, 175, 55, 0.05)';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      ctx.restore();

      const candleCount = Math.abs(mEnd.index - mStart.index) + 1;
      const priceDiff = mEnd.price - mStart.price;
      const pctChange = (priceDiff / mStart.price) * 100;

      const txt1 = `Bars: ${candleCount}`;
      const txt2 = `Diff: ${priceDiff.toFixed(precision)}`;
      const txt3 = `Change: ${pctChange.toFixed(2)}%`;

      const tooltipX = x2 + 10;
      const tooltipY = y2 - 25;

      ctx.fillStyle = 'rgba(17, 20, 27, 0.9)';
      ctx.strokeStyle = 'var(--accent)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(tooltipX, tooltipY, 110, 50);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.fillText(txt1, tooltipX + 8, tooltipY + 16);
      ctx.fillStyle = priceDiff >= 0 ? '#00c076' : '#ff4d57';
      ctx.fillText(txt2, tooltipX + 8, tooltipY + 28);
      ctx.fillText(txt3, tooltipX + 8, tooltipY + 40);
    }

    // 4. Draw Custom Crosshair Tooltip
    const hover = hoverPointRef.current;
    if (hover && !activeTool) {
      const txtPrice = `P: ${hover.price.toFixed(precision)}`;
      const txtTime = `T: ${new Date(hover.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

      ctx.save();
      ctx.fillStyle = 'rgba(27, 30, 40, 0.85)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(hover.x + 12, hover.y - 28, 95, 34);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f5f5f7';
      ctx.font = '9px sans-serif';
      ctx.fillText(txtPrice, hover.x + 18, hover.y - 18);
      ctx.fillStyle = '#8e8e93';
      ctx.fillText(txtTime, hover.x + 18, hover.y - 7);
      ctx.restore();
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [cell.drawings, tempPoints, previewPoint, activeDrawingTool, measureStart, measureEnd, hoverPoint]);

  // Mouse Handlers on Canvas overlay
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const chart = mainChartInstance.current;
    const series = candleSeriesInstance.current;
    if (!canvas || !chart || !series || !activeDrawingTool) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = series.coordinateToPrice(y);
    const time = chart.timeScale().coordinateToTime(x) as number;
    if (price === null || !time) return;

    const clickedPoint = { time, price };

    if (activeDrawingTool === 'measure') {
      if (!measureStart) {
        const idx = formattedCandlesRef.current.findIndex((c) => c.time === time);
        setMeasureStart({ ...clickedPoint, x, y, index: idx });
      } else {
        setMeasureStart(null);
        setMeasureEnd(null);
      }
      return;
    }

    const tool = activeDrawingTool;
    if (tool === 'horizontal') {
      addDrawing({
        id: Math.random().toString(),
        type: 'horizontal',
        points: [clickedPoint],
        color: drawingColor
      });
      setActiveDrawingTool(null);
    } else if (tool === 'vertical') {
      addDrawing({
        id: Math.random().toString(),
        type: 'vertical',
        points: [clickedPoint],
        color: drawingColor
      });
      setActiveDrawingTool(null);
    } else if (tool === 'text') {
      const txt = prompt('Enter text label:');
      if (txt) {
        addDrawing({
          id: Math.random().toString(),
          type: 'text',
          points: [clickedPoint],
          text: txt,
          color: drawingColor
        });
      }
      setActiveDrawingTool(null);
    } else if (tool === 'arrow') {
      const dir = window.confirm('Click OK for Up Arrow, Cancel for Down Arrow') ? 'up' : 'down';
      addDrawing({
        id: Math.random().toString(),
        type: 'arrow',
        points: [clickedPoint],
        color: drawingColor,
        arrowDir: dir
      });
      setActiveDrawingTool(null);
    } else if (['trendline', 'rectangle', 'fibonacci'].includes(tool)) {
      if (tempPoints.length === 0) {
        setTempPoints([clickedPoint]);
      } else {
        addDrawing({
          id: Math.random().toString(),
          type: tool as any,
          points: [tempPoints[0], clickedPoint],
          color: drawingColor
        });
        setTempPoints([]);
        setActiveDrawingTool(null);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const chart = mainChartInstance.current;
    const series = candleSeriesInstance.current;
    if (!canvas || !chart || !series) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = series.coordinateToPrice(y);
    const time = chart.timeScale().coordinateToTime(x) as number;

    if (price !== null && time) {
      setPreviewPoint({ time, price });
      if (activeDrawingTool === 'measure' && measureStart) {
        const idx = formattedCandlesRef.current.findIndex((c) => c.time === time);
        setMeasureEnd({ time, price, x, y, index: idx });
      }
    }
  };

  // Initialize main chart and sub-panes
  useEffect(() => {
    if (!mainContainerRef.current) return;
    mainContainerRef.current.innerHTML = '';

    // Determine if we need seconds on the time scale
    const tfLower = timeframe.toLowerCase();
    const showSeconds = tfLower === '1s' || tfLower === '5s' || tfLower === '15s' || tfLower === '30s';

    const precision = getPrecision(symbol);
    const minMove = 1 / Math.pow(10, precision);
    const priceFormatOption = {
      type: 'price',
      precision: precision,
      minMove: minMove,
    };

    const mainChart = createChart(mainContainerRef.current, {
      layout: {
        background: { color: themeBg },
        textColor: themeCrosshairColor,
        fontSize: 11,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: themeGridColor, style: 2 },
        horzLines: { color: themeGridColor, style: 2 },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(156, 163, 175, 0.4)',
          labelBackgroundColor: '#1e222d',
          style: 2,
          width: 1,
          visible: true,
          labelVisible: true,
        },
        horzLine: {
          color: 'rgba(156, 163, 175, 0.4)',
          labelBackgroundColor: '#1e222d',
          style: 2,
          width: 1,
          visible: true,
          labelVisible: true,
        },
      },
      timeScale: {
        borderColor: 'rgba(43, 49, 57, 0.6)',
        timeVisible: true,
        secondsVisible: showSeconds,
        barSpacing: 12,
        minBarSpacing: 0.5,
        rightOffset: 12,
        fixLeftEdge: false,
        fixRightEdge: false,
        uniformDistribution: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(43, 49, 57, 0.6)',
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: 0.08,
        },
        mode: 0, // Normal
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      watermark: {
        visible: themeWatermarkVisible,
        fontSize: 24,
        horzAlign: 'center',
        vertAlign: 'center',
        color: 'rgba(255, 255, 255, 0.03)',
        text: `${symbol} | ${timeframe}`,
      }
    });

    let series;
    if (chartType === 'line') {
      series = mainChart.addLineSeries({ color: '#2962FF', lineWidth: 2, priceFormat: priceFormatOption });
    } else if (chartType === 'area') {
      series = mainChart.addAreaSeries({ lineColor: '#2962FF', topColor: 'rgba(41, 98, 255, 0.28)', bottomColor: 'rgba(41, 98, 255, 0.0)', priceFormat: priceFormatOption });
    } else if (chartType === 'bar') {
      series = mainChart.addBarSeries({ upColor: '#26a69a', downColor: '#ef5350', priceFormat: priceFormatOption });
    } else if (chartType === 'baseline') {
      series = mainChart.addBaselineSeries({ baseValue: { type: 'price', price: 0 }, priceFormat: priceFormatOption });
    } else { // candlestick, hollow, heikin
      series = mainChart.addCandlestickSeries({
        upColor: chartType === 'hollow' ? 'transparent' : '#26a69a',
        downColor: '#ef5350',
        borderUpColor: '#26a69a',
        borderDownColor: '#ef5350',
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        priceLineVisible: true,
        priceLineColor: '#2962FF',
        priceLineWidth: 1,
        lastValueVisible: true,
        priceFormat: priceFormatOption,
      });
    }

    // The chart is always freshly created here; candleSeriesInstance.current
    // from the previous render was removed with the old chart automatically.
    mainChartInstance.current = mainChart;
    candleSeriesInstance.current = series;

    
    if (onRegisterChartApi) {
      onRegisterChartApi(cell.id, mainChart);
    }

    // Infinite history lazy loading scroll handler
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(async (logicalRange) => {
      if (!logicalRange) return;
      if (logicalRange.from < 5 && !isLoadingHistoryRef.current && formattedCandlesRef.current.length > 0) {
        isLoadingHistoryRef.current = true;
        setIsLoadingHistory(true);
        try {
          const firstCandle = formattedCandlesRef.current[0];
          const oldestTimeMs = (firstCandle.time as number) * 1000;
          const limit = 1000;
          const olderCandles = await getMarketCandles(symbol, timeframe, limit, oldestTimeMs);
          
          if (olderCandles && olderCandles.length > 0) {
            const formattedOlder = prepareCandlesForChart(olderCandles);
            
            const combinedMap = new Map<number, any>();
            formattedOlder.forEach((c: any) => combinedMap.set(c.time, c));
            
            const prevCount = formattedCandlesRef.current.length;
            formattedCandlesRef.current.forEach((c: any) => combinedMap.set(c.time, c));
            
            let merged = Array.from(combinedMap.values()).sort((a: any, b: any) => a.time - b.time);
            if (merged.length > 2000) {
              merged = merged.slice(-2000);
            }
            formattedCandlesRef.current = merged;
            setCandlesCount(merged.length);
            
            const addedCount = merged.length - prevCount;
            
            if (candleSeriesInstance.current) {
              const dataToSet = chartType === 'heikin' ? convertToHeikinAshi(merged) : merged;
              candleSeriesInstance.current.setData(dataToSet as any);
              hasSetDataRef.current = true;
              if (addedCount > 0) {
                const timeScale = mainChart.timeScale();
                const originalLogicalRange = timeScale.getVisibleLogicalRange();
                if (originalLogicalRange) {
                  timeScale.setVisibleLogicalRange({
                    from: originalLogicalRange.from + addedCount,
                    to: originalLogicalRange.to + addedCount,
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to load older candles scroll history:", err);
        } finally {
          isLoadingHistoryRef.current = false;
          setIsLoadingHistory(false);
        }
      }
    });

    // Crosshair Sync Handler
    mainChart.subscribeCrosshairMove((param) => {
      if (isMovingRef.current) return;
      
      // Update Crosshair tooltip coordinates
      if (param.point && param.time) {
        const time = param.time as number;
        const y = param.point.y;
        const price = series.coordinateToPrice(y);
        if (price !== null) {
          setHoverPoint({ time, price, x: param.point.x, y: param.point.y });
        }
      } else {
        setHoverPoint(null);
      }

      if (!param.time) {
        onCrosshairMove(null);
        return;
      }
      onCrosshairMove(param.time as number);
    });

    // 1. RSI Sub-pane
    if (indicators.rsi && rsiContainerRef.current) {
      rsiContainerRef.current.innerHTML = '';
      const rsiChart = createChart(rsiContainerRef.current, {
        layout: { background: { color: '#0b0d12' }, textColor: '#8f929d' },
        grid: { vertLines: { color: 'rgba(43, 49, 57, 0.15)' }, horzLines: { color: 'rgba(43, 49, 57, 0.15)' } },
        crosshair: { mode: 1 },
        timeScale: { visible: false },
      });
      rsiChartInstance.current = rsiChart;
      rsiLineSeriesRef.current = rsiChart.addLineSeries({ color: '#E91E63', lineWidth: 1, title: 'RSI' });
      rsiLineSeriesRef.current.createPriceLine({ price: 70, color: 'rgba(233, 30, 99, 0.3)', lineWidth: 1, lineStyle: 1 });
      rsiLineSeriesRef.current.createPriceLine({ price: 30, color: 'rgba(233, 30, 99, 0.3)', lineWidth: 1, lineStyle: 1 });
      
      rsiChart.subscribeCrosshairMove((param) => {
        if (isMovingRef.current) return;
        if (!param.time) { onCrosshairMove(null); return; }
        onCrosshairMove(param.time as number);
      });
    }

    // 2. MACD Sub-pane
    if (indicators.macd && macdContainerRef.current) {
      macdContainerRef.current.innerHTML = '';
      const macdChart = createChart(macdContainerRef.current, {
        layout: { background: { color: '#0b0d12' }, textColor: '#8f929d' },
        grid: { vertLines: { color: 'rgba(43, 49, 57, 0.15)' }, horzLines: { color: 'rgba(43, 49, 57, 0.15)' } },
        crosshair: { mode: 1 },
        timeScale: { visible: false },
      });
      macdChartInstance.current = macdChart;
      macdLineSeriesRef.current = macdChart.addLineSeries({ color: '#2196F3', lineWidth: 1, title: 'MACD' });
      macdSignalSeriesRef.current = macdChart.addLineSeries({ color: '#FF9800', lineWidth: 1, title: 'Signal' });
      macdHistSeriesRef.current = macdChart.addHistogramSeries({ title: 'Histogram' });

      macdChart.subscribeCrosshairMove((param) => {
        if (isMovingRef.current) return;
        if (!param.time) { onCrosshairMove(null); return; }
        onCrosshairMove(param.time as number);
      });
    }

    // 3. ATR Sub-pane
    if (indicators.atr && atrContainerRef.current) {
      atrContainerRef.current.innerHTML = '';
      const atrChart = createChart(atrContainerRef.current, {
        layout: { background: { color: '#0b0d12' }, textColor: '#8f929d' },
        grid: { vertLines: { color: 'rgba(43, 49, 57, 0.15)' }, horzLines: { color: 'rgba(43, 49, 57, 0.15)' } },
        crosshair: { mode: 1 },
        timeScale: { visible: false },
      });
      atrChartInstance.current = atrChart;
      atrLineSeriesRef.current = atrChart.addLineSeries({ color: '#FF5722', lineWidth: 1, title: 'ATR' });

      atrChart.subscribeCrosshairMove((param) => {
        if (isMovingRef.current) return;
        if (!param.time) { onCrosshairMove(null); return; }
        onCrosshairMove(param.time as number);
      });
    }

    // 4. Stochastic Sub-pane
    if (indicators.stochastic && stochasticContainerRef.current) {
      stochasticContainerRef.current.innerHTML = '';
      const stochChart = createChart(stochasticContainerRef.current, {
        layout: { background: { color: '#0b0d12' }, textColor: '#8f929d' },
        grid: { vertLines: { color: 'rgba(43, 49, 57, 0.15)' }, horzLines: { color: 'rgba(43, 49, 57, 0.15)' } },
        crosshair: { mode: 1 },
        timeScale: { visible: false },
      });
      stochasticChartInstance.current = stochChart;
      stochKSeriesRef.current = stochChart.addLineSeries({ color: '#00BCD4', lineWidth: 1, title: '%K' });
      stochDSeriesRef.current = stochChart.addLineSeries({ color: '#FFEB3B', lineWidth: 1, title: '%D' });

      stochChart.subscribeCrosshairMove((param) => {
        if (isMovingRef.current) return;
        if (!param.time) { onCrosshairMove(null); return; }
        onCrosshairMove(param.time as number);
      });
    }

    // 5. ADX Sub-pane
    if (indicators.adx && adxContainerRef.current) {
      adxContainerRef.current.innerHTML = '';
      const adxChart = createChart(adxContainerRef.current, {
        layout: { background: { color: '#0b0d12' }, textColor: '#8f929d' },
        grid: { vertLines: { color: 'rgba(43, 49, 57, 0.15)' }, horzLines: { color: 'rgba(43, 49, 57, 0.15)' } },
        crosshair: { mode: 1 },
        timeScale: { visible: false },
      });
      adxChartInstance.current = adxChart;
      adxSeriesRef.current = adxChart.addLineSeries({ color: '#9C27B0', lineWidth: 2, title: 'ADX' });
      plusDISeriesRef.current = adxChart.addLineSeries({ color: '#4CAF50', lineWidth: 1, title: '+DI' });
      minusDISeriesRef.current = adxChart.addLineSeries({ color: '#F44336', lineWidth: 1, title: '-DI' });

      adxChart.subscribeCrosshairMove((param) => {
        if (isMovingRef.current) return;
        if (!param.time) { onCrosshairMove(null); return; }
        onCrosshairMove(param.time as number);
      });
    }

    // Handle visible range canvas redraw
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      redrawCanvas();
    });

    let resizeFrameId: number | null = null;
    const handleResize = () => {
      if (resizeFrameId) return;
      resizeFrameId = requestAnimationFrame(() => {
        resizeFrameId = null;
        if (mainContainerRef.current && mainChartInstance.current) {
          mainChartInstance.current.resize(mainContainerRef.current.clientWidth, mainContainerRef.current.clientHeight);
        }
        if (rsiContainerRef.current && rsiChartInstance.current) {
          rsiChartInstance.current.resize(rsiContainerRef.current.clientWidth, rsiContainerRef.current.clientHeight);
        }
        if (macdContainerRef.current && macdChartInstance.current) {
          macdChartInstance.current.resize(macdContainerRef.current.clientWidth, macdContainerRef.current.clientHeight);
        }
        if (atrContainerRef.current && atrChartInstance.current) {
          atrChartInstance.current.resize(atrContainerRef.current.clientWidth, atrContainerRef.current.clientHeight);
        }
        if (stochasticContainerRef.current && stochasticChartInstance.current) {
          stochasticChartInstance.current.resize(stochasticContainerRef.current.clientWidth, stochasticContainerRef.current.clientHeight);
        }
        if (adxContainerRef.current && adxChartInstance.current) {
          adxChartInstance.current.resize(adxContainerRef.current.clientWidth, adxContainerRef.current.clientHeight);
        }
        redrawCanvas();
      });
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (mainContainerRef.current) resizeObserver.observe(mainContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();

      if (onUnregisterChartApi) {
        onUnregisterChartApi(cell.id);
      }

      if (mainChartInstance.current) { mainChartInstance.current.remove(); mainChartInstance.current = null; }
      if (rsiChartInstance.current) { rsiChartInstance.current.remove(); rsiChartInstance.current = null; }
      if (macdChartInstance.current) { macdChartInstance.current.remove(); macdChartInstance.current = null; }
      if (atrChartInstance.current) { atrChartInstance.current.remove(); atrChartInstance.current = null; }
      if (stochasticChartInstance.current) { stochasticChartInstance.current.remove(); stochasticChartInstance.current = null; }
      if (adxChartInstance.current) { adxChartInstance.current.remove(); adxChartInstance.current = null; }
    };
  }, [
    indicators.rsi, indicators.macd, indicators.atr, indicators.stochastic, indicators.adx,
    chartType, timeframe, themeBg, themeGridColor, themeCrosshairColor, themeBullColor, themeBearColor, themeWatermarkVisible,
    onRegisterChartApi, onUnregisterChartApi
  ]);

  // Sync crosshair from parent
  useEffect(() => {
    if (isMovingRef.current) return;
    isMovingRef.current = true;

    const t = crosshairTime ? (crosshairTime as UTCTimestamp) : undefined;

    if (mainChartInstance.current) {
      if (t === undefined) mainChartInstance.current.setCrosshairPosition(undefined as any, undefined as any, undefined as any);
      else mainChartInstance.current.setCrosshairPosition(undefined as any, t as any, undefined as any);
    }
    if (rsiChartInstance.current) {
      if (t === undefined) rsiChartInstance.current.setCrosshairPosition(undefined as any, undefined as any, undefined as any);
      else rsiChartInstance.current.setCrosshairPosition(undefined as any, t as any, undefined as any);
    }
    if (macdChartInstance.current) {
      if (t === undefined) macdChartInstance.current.setCrosshairPosition(undefined as any, undefined as any, undefined as any);
      else macdChartInstance.current.setCrosshairPosition(undefined as any, t as any, undefined as any);
    }
    if (atrChartInstance.current) {
      if (t === undefined) atrChartInstance.current.setCrosshairPosition(undefined as any, undefined as any, undefined as any);
      else atrChartInstance.current.setCrosshairPosition(undefined as any, t as any, undefined as any);
    }
    if (stochasticChartInstance.current) {
      if (t === undefined) stochasticChartInstance.current.setCrosshairPosition(undefined as any, undefined as any, undefined as any);
      else stochasticChartInstance.current.setCrosshairPosition(undefined as any, t as any, undefined as any);
    }
    if (adxChartInstance.current) {
      if (t === undefined) adxChartInstance.current.setCrosshairPosition(undefined as any, undefined as any, undefined as any);
      else adxChartInstance.current.setCrosshairPosition(undefined as any, t as any, undefined as any);
    }

    isMovingRef.current = false;
  }, [crosshairTime]);

  // Fetch Candles & Calculate Indicators
  useEffect(() => {
    let active = true;
    setIsFetchingNewData(true);
    if (mainChartInstance.current) {
      mainChartInstance.current.applyOptions({
        watermark: {
          text: `${symbol} | ${timeframe}`,
        }
      });
    }
    // Clear old candles from series immediately to avoid lingering data
    if (candleSeriesInstance.current) {
      try {
        candleSeriesInstance.current.setData([]);
      } catch (e) {}
    }
    hasSetDataRef.current = false;

    const fetchAndPlot = async () => {
      try {
        let formatted: ChartDataPoint[] = [];
        const cacheKey = `${symbol}|${timeframe}`;

        if (replayActive) {
          if (!visibleCandles) return;
          formatted = visibleCandles as any;
        } else {
          // 1. Fetch 1000 historical candles directly from provider
          const rawCandles = await getMarketCandles(symbol, timeframe, 1000);
          if (!active) return;

          formatted = prepareCandlesForChart(rawCandles);

          // 2. Sync last candle with global price immediately on fresh fetch
          const globalPrice = useMarketPriceStore.getState().prices[symbol]?.currentPrice;
          if (globalPrice && formatted.length > 0) {
            const lastCandle = formatted[formatted.length - 1];
            lastCandle.close = globalPrice;
            if (globalPrice > lastCandle.high) lastCandle.high = globalPrice;
            if (globalPrice < lastCandle.low) lastCandle.low = globalPrice;
          }

          formattedCandlesRef.current = formatted;

          // 3. Save to store cache and candle engine
          const storeCandles = formatted.map(c => ({
            timestamp: (c.time as number) * 1000,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
          }));
          candleEngine.setHistory(symbol, timeframe, storeCandles);
          useMarketStore.getState().setCandles(cacheKey, storeCandles);
        }

        if (candleSeriesInstance.current && mainChartInstance.current) {
          const dataToSet = chartType === 'heikin' ? convertToHeikinAshi(formatted) : formatted;
          candleSeriesInstance.current.setData(dataToSet as any);
          hasSetDataRef.current = true;
          setCandlesCount(formatted.length);

          const timeScale = mainChartInstance.current.timeScale();
          const total = dataToSet.length;
          if (total > 0) {
            const fromIndex = Math.max(0, total - 120);
            timeScale.setVisibleLogicalRange({
              from: fromIndex,
              to: total + 15,
            });
          }

          // Overlay high impact events on chart timeline
          const economicEvents = [
            { name: 'NFP', importance: 'HIGH', timestamp: Date.now() + 5 * 3600000 },
            { name: 'CPI', importance: 'HIGH', timestamp: Date.now() - 30 * 60000 },
            { name: 'FOMC', importance: 'HIGH', timestamp: Date.now() + 2.5 * 3600000 },
            { name: 'ECB', importance: 'HIGH', timestamp: Date.now() + 1.5 * 3600000 },
            { name: 'GDP', importance: 'MEDIUM', timestamp: Date.now() + 10 * 3600000 },
            { name: 'BoE', importance: 'HIGH', timestamp: Date.now() + 72 * 3600000 },
          ];

          const eventMarkers: any[] = [];
          economicEvents.forEach((ev) => {
            const evTimeSec = Math.floor(ev.timestamp / 1000);
            
            // Find closest candle time
            let closestCandle: any = null;
            let minDiff = Infinity;
            formatted.forEach((c: any) => {
              const diff = Math.abs(c.time - evTimeSec);
              if (diff < minDiff) {
                minDiff = diff;
                closestCandle = c;
              }
            });

            // Set marker if matches timeline within 1 hour
            if (closestCandle && minDiff < 3600) {
              eventMarkers.push({
                time: closestCandle.time,
                position: 'aboveBar',
                color: ev.importance === 'HIGH' ? '#ff4d57' : ev.importance === 'MEDIUM' ? '#ffb74d' : '#ffeb3b',
                shape: 'circle',
                text: ev.name,
              });
            }
          });

          if (eventMarkers.length > 0) {
            candleSeriesInstance.current.setMarkers(eventMarkers);
          }

          // Clear old indicators series
          const clearSeries = (ref: React.MutableRefObject<any>) => {
            if (ref.current && mainChartInstance.current) {
              try { mainChartInstance.current.removeSeries(ref.current); } catch {}
              ref.current = null;
            }
          };

          // Dynamically synchronize indicator series (reusing existing ones)
          const syncSeries = (ref: React.MutableRefObject<any>, active: boolean, creator: () => any) => {
            if (active) {
              if (!ref.current && mainChartInstance.current) {
                ref.current = creator();
              }
            } else {
              if (ref.current && mainChartInstance.current) {
                try { mainChartInstance.current.removeSeries(ref.current); } catch {}
                ref.current = null;
              }
            }
          };

          syncSeries(ema20SeriesRef, !!indicators.ema20, () => mainChartInstance.current!.addLineSeries({ color: '#2196F3', lineWidth: 1, title: `EMA ${cell.params.ema20.period}`, autoscaleInfoProvider: () => null }));
          syncSeries(ema50SeriesRef, !!indicators.ema50, () => mainChartInstance.current!.addLineSeries({ color: '#E91E63', lineWidth: 1, title: `EMA ${cell.params.ema50.period}`, autoscaleInfoProvider: () => null }));
          syncSeries(ema200SeriesRef, !!indicators.ema200, () => mainChartInstance.current!.addLineSeries({ color: '#9C27B0', lineWidth: 1, title: `EMA ${cell.params.ema200.period}`, autoscaleInfoProvider: () => null }));
          syncSeries(vwapSeriesRef, !!indicators.vwap, () => mainChartInstance.current!.addLineSeries({ color: '#FFEB3B', lineWidth: 1, title: 'VWAP', autoscaleInfoProvider: () => null }));

          if (indicators.bb) {
            if (!bbUpperSeriesRef.current && mainChartInstance.current) {
              bbUpperSeriesRef.current = mainChartInstance.current.addLineSeries({ color: 'rgba(33, 150, 243, 0.35)', lineWidth: 1, lineStyle: 2, title: 'BB Upper', autoscaleInfoProvider: () => null });
              bbMiddleSeriesRef.current = mainChartInstance.current.addLineSeries({ color: 'rgba(33, 150, 243, 0.25)', lineWidth: 1, title: 'BB Middle', autoscaleInfoProvider: () => null });
              bbLowerSeriesRef.current = mainChartInstance.current.addLineSeries({ color: 'rgba(33, 150, 243, 0.35)', lineWidth: 1, lineStyle: 2, title: 'BB Lower', autoscaleInfoProvider: () => null });
            }
          } else {
            if (bbUpperSeriesRef.current && mainChartInstance.current) {
              try {
                mainChartInstance.current.removeSeries(bbUpperSeriesRef.current);
                mainChartInstance.current.removeSeries(bbMiddleSeriesRef.current);
                mainChartInstance.current.removeSeries(bbLowerSeriesRef.current);
              } catch {}
              bbUpperSeriesRef.current = null;
              bbMiddleSeriesRef.current = null;
              bbLowerSeriesRef.current = null;
            }
          }

          if (indicators.ichimoku) {
            if (!ichimokuTenkanSeriesRef.current && mainChartInstance.current) {
              ichimokuTenkanSeriesRef.current = mainChartInstance.current.addLineSeries({ color: '#2962FF', lineWidth: 1, title: 'Tenkan', autoscaleInfoProvider: () => null });
              ichimokuKijunSeriesRef.current = mainChartInstance.current.addLineSeries({ color: '#FF6D00', lineWidth: 1, title: 'Kijun', autoscaleInfoProvider: () => null });
              ichimokuSpanASeriesRef.current = mainChartInstance.current.addLineSeries({ color: '#4CAF50', lineWidth: 1, title: 'Span A', autoscaleInfoProvider: () => null });
              ichimokuSpanBSeriesRef.current = mainChartInstance.current.addLineSeries({ color: '#F44336', lineWidth: 1, title: 'Span B', autoscaleInfoProvider: () => null });
              ichimokuChikouSeriesRef.current = mainChartInstance.current.addLineSeries({ color: '#AA00FF', lineWidth: 1, title: 'Chikou', autoscaleInfoProvider: () => null });
            }
          } else {
            if (ichimokuTenkanSeriesRef.current && mainChartInstance.current) {
              try {
                mainChartInstance.current.removeSeries(ichimokuTenkanSeriesRef.current);
                mainChartInstance.current.removeSeries(ichimokuKijunSeriesRef.current);
                mainChartInstance.current.removeSeries(ichimokuSpanASeriesRef.current);
                mainChartInstance.current.removeSeries(ichimokuSpanBSeriesRef.current);
                mainChartInstance.current.removeSeries(ichimokuChikouSeriesRef.current);
              } catch {}
              ichimokuTenkanSeriesRef.current = null;
              ichimokuKijunSeriesRef.current = null;
              ichimokuSpanASeriesRef.current = null;
              ichimokuSpanBSeriesRef.current = null;
              ichimokuChikouSeriesRef.current = null;
            }
          }

          if (indicators.supertrend) {
            if (!supertrendBullishSeriesRef.current && mainChartInstance.current) {
              supertrendBullishSeriesRef.current = mainChartInstance.current.addLineSeries({ color: '#0ecb81', lineWidth: 2, title: 'SuperTrend Long', autoscaleInfoProvider: () => null });
              supertrendBearishSeriesRef.current = mainChartInstance.current.addLineSeries({ color: '#f6465d', lineWidth: 2, title: 'SuperTrend Short', autoscaleInfoProvider: () => null });
            }
          } else {
            if (supertrendBullishSeriesRef.current && mainChartInstance.current) {
              try {
                mainChartInstance.current.removeSeries(supertrendBullishSeriesRef.current);
                mainChartInstance.current.removeSeries(supertrendBearishSeriesRef.current);
              } catch {}
              supertrendBullishSeriesRef.current = null;
              supertrendBearishSeriesRef.current = null;
            }
          }

          // Clear overlay lines
          const clearLine = (ref: React.MutableRefObject<any>) => {
            if (ref.current && candleSeriesInstance.current) {
              try { candleSeriesInstance.current.removePriceLine(ref.current); } catch {}
              ref.current = null;
            }
          };

          clearLine(pocLineRef);
          clearLine(pivotPLineRef);
          clearLine(pivotR1LineRef);
          clearLine(pivotS1LineRef);
          clearLine(pivotR2LineRef);
          clearLine(pivotS2LineRef);

          // Setup Web Worker calculation receiver
          const currentRequestId = Math.random();
          const worker = workerRef.current;
          if (worker) {
            worker.onmessage = (e) => {
              const { id, type, success, result } = e.data;
              if (id !== currentRequestId || !success) return;
              
              if (type === 'ema20' && ema20SeriesRef.current) {
                ema20SeriesRef.current.setData(result);
              } else if (type === 'ema50' && ema50SeriesRef.current) {
                ema50SeriesRef.current.setData(result);
              } else if (type === 'ema200' && ema200SeriesRef.current) {
                ema200SeriesRef.current.setData(result);
              } else if (type === 'vwap' && vwapSeriesRef.current) {
                vwapSeriesRef.current.setData(result);
              } else if (type === 'bb' && bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
                bbUpperSeriesRef.current.setData(result.upper);
                bbMiddleSeriesRef.current.setData(result.middle);
                bbLowerSeriesRef.current.setData(result.lower);
              } else if (type === 'ichimoku' && ichimokuTenkanSeriesRef.current && ichimokuKijunSeriesRef.current && ichimokuSpanASeriesRef.current && ichimokuSpanBSeriesRef.current && ichimokuChikouSeriesRef.current) {
                ichimokuTenkanSeriesRef.current.setData(result.tenkan);
                ichimokuKijunSeriesRef.current.setData(result.kijun);
                ichimokuSpanASeriesRef.current.setData(result.spanA);
                ichimokuSpanBSeriesRef.current.setData(result.spanB);
                ichimokuChikouSeriesRef.current.setData(result.chikou);
              } else if (type === 'supertrend' && supertrendBullishSeriesRef.current && supertrendBearishSeriesRef.current) {
                const bullishPoints = result.filter((pt: any) => pt.direction === 1).map((pt: any) => ({ time: pt.time, value: pt.value }));
                const bearishPoints = result.filter((pt: any) => pt.direction === -1).map((pt: any) => ({ time: pt.time, value: pt.value }));
                supertrendBullishSeriesRef.current.setData(bullishPoints);
                supertrendBearishSeriesRef.current.setData(bearishPoints);
              } else if (type === 'volProfile' && candleSeriesInstance.current) {
                const pocBin = result.find((b: any) => b.isPoc);
                if (pocBin) {
                  pocLineRef.current = candleSeriesInstance.current.createPriceLine({
                    price: pocBin.price,
                    color: '#FFD700',
                    lineWidth: 2,
                    lineStyle: 1,
                    axisLabelVisible: true,
                    title: `POC: ${pocBin.price.toFixed(getPrecision(symbol))}`,
                  });
                }
              } else if (type === 'pivots' && candleSeriesInstance.current) {
                const pivots = result;
                if (pivots.length > 0) {
                  const latestPivot = pivots[pivots.length - 1];
                  const prec = getPrecision(symbol);
                  pivotPLineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.p, color: '#E0E0E0', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `P: ${latestPivot.p.toFixed(prec)}` });
                  pivotR1LineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.r1, color: '#0ecb81', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `R1: ${latestPivot.r1.toFixed(prec)}` });
                  pivotS1LineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.s1, color: '#f6465d', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `S1: ${latestPivot.s1.toFixed(prec)}` });
                  pivotR2LineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.r2, color: '#00c853', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `R2: ${latestPivot.r2.toFixed(prec)}` });
                  pivotS2LineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.s2, color: '#d50000', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `S2: ${latestPivot.s2.toFixed(prec)}` });
                }
              } else if (type === 'rsi' && rsiLineSeriesRef.current) {
                rsiLineSeriesRef.current.setData(result);
              } else if (type === 'macd' && macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistSeriesRef.current) {
                macdLineSeriesRef.current.setData(result.macd);
                macdSignalSeriesRef.current.setData(result.signal);
                macdHistSeriesRef.current.setData(result.histogram.map((pt: any) => ({
                  time: pt.time,
                  value: pt.value,
                  color: pt.value >= 0 ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'
                })));
              } else if (type === 'atr' && atrLineSeriesRef.current) {
                atrLineSeriesRef.current.setData(result);
              } else if (type === 'stochastic' && stochKSeriesRef.current && stochDSeriesRef.current) {
                stochKSeriesRef.current.setData(result.k);
                stochDSeriesRef.current.setData(result.d);
              } else if (type === 'adx' && adxSeriesRef.current && plusDISeriesRef.current && minusDISeriesRef.current) {
                adxSeriesRef.current.setData(result.adx);
                plusDISeriesRef.current.setData(result.plusDI);
                minusDISeriesRef.current.setData(result.minusDI);
              }
              
              if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
              }
              animationFrameIdRef.current = requestAnimationFrame(() => {
                redrawCanvas();
              });
            };

            // Dispatch indicator tasks
            if (indicators.ema20) {
              worker.postMessage({ id: currentRequestId, type: 'ema20', formatted, params: cell.params });
            }
            if (indicators.ema50) {
              worker.postMessage({ id: currentRequestId, type: 'ema50', formatted, params: cell.params });
            }
            if (indicators.ema200) {
              worker.postMessage({ id: currentRequestId, type: 'ema200', formatted, params: cell.params });
            }
            if (indicators.vwap) {
              worker.postMessage({ id: currentRequestId, type: 'vwap', formatted, params: cell.params });
            }
            if (indicators.bb) {
              worker.postMessage({ id: currentRequestId, type: 'bb', formatted, params: cell.params });
            }
            if (indicators.ichimoku) {
              worker.postMessage({ id: currentRequestId, type: 'ichimoku', formatted, params: cell.params });
            }
            if (indicators.supertrend) {
              worker.postMessage({ id: currentRequestId, type: 'supertrend', formatted, params: cell.params });
            }
            if (indicators.volProfile) {
              worker.postMessage({ id: currentRequestId, type: 'volProfile', formatted, params: cell.params });
            }
            if (indicators.pivots && formatted.length > 1) {
              worker.postMessage({ id: currentRequestId, type: 'pivots', formatted, params: cell.params });
            }
            if (indicators.rsi && rsiLineSeriesRef.current) {
              worker.postMessage({ id: currentRequestId, type: 'rsi', formatted, params: cell.params });
            }
            if (indicators.macd && macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistSeriesRef.current) {
              worker.postMessage({ id: currentRequestId, type: 'macd', formatted, params: cell.params });
            }
            if (indicators.atr && atrLineSeriesRef.current) {
              worker.postMessage({ id: currentRequestId, type: 'atr', formatted, params: cell.params });
            }
            if (indicators.stochastic && stochKSeriesRef.current && stochDSeriesRef.current) {
              worker.postMessage({ id: currentRequestId, type: 'stochastic', formatted, params: cell.params });
            }
            if (indicators.adx && adxSeriesRef.current && plusDISeriesRef.current && minusDISeriesRef.current) {
              worker.postMessage({ id: currentRequestId, type: 'adx', formatted, params: cell.params });
            }
          }
        }
        if (active) {
          setIsFetchingNewData(false);
        }
      } catch (err) {
        console.error('Failed to load initial candles or calculate indicators or dispatch to worker:', err);
        if (active) {
          setIsFetchingNewData(false);
        }
      }
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(() => {
        redrawCanvas();
      });
    };

    fetchAndPlot();

    return () => { active = false; };
  }, [symbol, timeframe, indicators, cell.params, replayActive, visibleCandles]);

  // Real-time updates handler
  useEffect(() => {
    if (replayActive) return;

    let active = true;
    const key = `${symbol}|${timeframe}`;
    let lastCalcTime = 0;
    let calcTimeout: any = null;

    const triggerRecalc = (data: ChartDataPoint[]) => {
      const now = Date.now();
      if (now - lastCalcTime < 150) {
        if (calcTimeout) clearTimeout(calcTimeout);
        calcTimeout = setTimeout(() => triggerRecalc(data), 150 - (now - lastCalcTime));
        return;
      }
      lastCalcTime = now;

      const worker = workerRef.current;
      if (!worker) return;

      const currentRequestId = Math.random();
      worker.onmessage = (e) => {
        const { id, type, success, result } = e.data;
        if (id !== currentRequestId || !success) return;

        if (type === 'ema20' && ema20SeriesRef.current) ema20SeriesRef.current.setData(result);
        else if (type === 'ema50' && ema50SeriesRef.current) ema50SeriesRef.current.setData(result);
        else if (type === 'ema200' && ema200SeriesRef.current) ema200SeriesRef.current.setData(result);
        else if (type === 'vwap' && vwapSeriesRef.current) vwapSeriesRef.current.setData(result);
        else if (type === 'bb' && bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
          bbUpperSeriesRef.current.setData(result.upper);
          bbMiddleSeriesRef.current.setData(result.middle);
          bbLowerSeriesRef.current.setData(result.lower);
        }
        else if (type === 'ichimoku' && ichimokuTenkanSeriesRef.current && ichimokuKijunSeriesRef.current && ichimokuSpanASeriesRef.current && ichimokuSpanBSeriesRef.current && ichimokuChikouSeriesRef.current) {
          ichimokuTenkanSeriesRef.current.setData(result.tenkan);
          ichimokuKijunSeriesRef.current.setData(result.kijun);
          ichimokuSpanASeriesRef.current.setData(result.spanA);
          ichimokuSpanBSeriesRef.current.setData(result.spanB);
          ichimokuChikouSeriesRef.current.setData(result.chikou);
        }
        else if (type === 'supertrend' && supertrendBullishSeriesRef.current && supertrendBearishSeriesRef.current) {
          const bullishPoints = result.filter((pt: any) => pt.direction === 1).map((pt: any) => ({ time: pt.time, value: pt.value }));
          const bearishPoints = result.filter((pt: any) => pt.direction === -1).map((pt: any) => ({ time: pt.time, value: pt.value }));
          supertrendBullishSeriesRef.current.setData(bullishPoints);
          supertrendBearishSeriesRef.current.setData(bearishPoints);
        }
        else if (type === 'volProfile' && candleSeriesInstance.current) {
          const pocBin = result.find((b: any) => b.isPoc);
          if (pocBin) {
            if (pocLineRef.current) {
              try { candleSeriesInstance.current.removePriceLine(pocLineRef.current); } catch {}
            }
            pocLineRef.current = candleSeriesInstance.current.createPriceLine({
              price: pocBin.price,
              color: '#FFD700',
              lineWidth: 2,
              lineStyle: 1,
              axisLabelVisible: true,
              title: `POC: ${pocBin.price.toFixed(getPrecision(symbol))}`,
            });
          }
        }
        else if (type === 'pivots' && candleSeriesInstance.current) {
          const pivots = result;
          if (pivots.length > 0) {
            const latestPivot = pivots[pivots.length - 1];
            const prec = getPrecision(symbol);
            if (pivotPLineRef.current) try { candleSeriesInstance.current.removePriceLine(pivotPLineRef.current); } catch {}
            if (pivotR1LineRef.current) try { candleSeriesInstance.current.removePriceLine(pivotR1LineRef.current); } catch {}
            if (pivotS1LineRef.current) try { candleSeriesInstance.current.removePriceLine(pivotS1LineRef.current); } catch {}
            if (pivotR2LineRef.current) try { candleSeriesInstance.current.removePriceLine(pivotR2LineRef.current); } catch {}
            if (pivotS2LineRef.current) try { candleSeriesInstance.current.removePriceLine(pivotS2LineRef.current); } catch {}

            pivotPLineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.p, color: '#E0E0E0', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `P: ${latestPivot.p.toFixed(prec)}` });
            pivotR1LineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.r1, color: '#0ecb81', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `R1: ${latestPivot.r1.toFixed(prec)}` });
            pivotS1LineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.s1, color: '#f6465d', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `S1: ${latestPivot.s1.toFixed(prec)}` });
            pivotR2LineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.r2, color: '#00c853', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `R2: ${latestPivot.r2.toFixed(prec)}` });
            pivotS2LineRef.current = candleSeriesInstance.current.createPriceLine({ price: latestPivot.s2, color: '#d50000', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `S2: ${latestPivot.s2.toFixed(prec)}` });
          }
        }
        else if (type === 'rsi' && rsiLineSeriesRef.current) rsiLineSeriesRef.current.setData(result);
        else if (type === 'macd' && macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistSeriesRef.current) {
          macdLineSeriesRef.current.setData(result.macd);
          macdSignalSeriesRef.current.setData(result.signal);
          macdHistSeriesRef.current.setData(result.histogram.map((pt: any) => ({
            time: pt.time,
            value: pt.value,
            color: pt.value >= 0 ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'
          })));
        }
        else if (type === 'atr' && atrLineSeriesRef.current) atrLineSeriesRef.current.setData(result);
        else if (type === 'stochastic' && stochKSeriesRef.current && stochDSeriesRef.current) {
          stochKSeriesRef.current.setData(result.k);
          stochDSeriesRef.current.setData(result.d);
        }
        else if (type === 'adx' && adxSeriesRef.current && plusDISeriesRef.current && minusDISeriesRef.current) {
          adxSeriesRef.current.setData(result.adx);
          plusDISeriesRef.current.setData(result.plusDI);
          minusDISeriesRef.current.setData(result.minusDI);
        }

        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        animationFrameIdRef.current = requestAnimationFrame(() => {
          redrawCanvas();
        });
      };

      const snapData = [...data];
      if (indicators.ema20) worker.postMessage({ id: currentRequestId, type: 'ema20', formatted: snapData, params: cell.params });
      if (indicators.ema50) worker.postMessage({ id: currentRequestId, type: 'ema50', formatted: snapData, params: cell.params });
      if (indicators.ema200) worker.postMessage({ id: currentRequestId, type: 'ema200', formatted: snapData, params: cell.params });
      if (indicators.vwap) worker.postMessage({ id: currentRequestId, type: 'vwap', formatted: snapData, params: cell.params });
      if (indicators.bb) worker.postMessage({ id: currentRequestId, type: 'bb', formatted: snapData, params: cell.params });
      if (indicators.ichimoku) worker.postMessage({ id: currentRequestId, type: 'ichimoku', formatted: snapData, params: cell.params });
      if (indicators.supertrend) worker.postMessage({ id: currentRequestId, type: 'supertrend', formatted: snapData, params: cell.params });
      if (indicators.volProfile) worker.postMessage({ id: currentRequestId, type: 'volProfile', formatted: snapData, params: cell.params });
      if (indicators.pivots && snapData.length > 1) worker.postMessage({ id: currentRequestId, type: 'pivots', formatted: snapData, params: cell.params });
      if (indicators.rsi) worker.postMessage({ id: currentRequestId, type: 'rsi', formatted: snapData, params: cell.params });
      if (indicators.macd) worker.postMessage({ id: currentRequestId, type: 'macd', formatted: snapData, params: cell.params });
      if (indicators.atr) worker.postMessage({ id: currentRequestId, type: 'atr', formatted: snapData, params: cell.params });
      if (indicators.stochastic) worker.postMessage({ id: currentRequestId, type: 'stochastic', formatted: snapData, params: cell.params });
      if (indicators.adx) worker.postMessage({ id: currentRequestId, type: 'adx', formatted: snapData, params: cell.params });
    };

    const unsubscribe = candleEngine.subscribe(symbol, timeframe, (lastCandle) => {
      if (!active || !hasSetDataRef.current || !candleSeriesInstance.current) return;

      let seconds: number;
      try {
        seconds = parseTimestampToSeconds(lastCandle.timestamp);
      } catch (e) {
        return;
      }

      const formattedLast = {
        time: seconds as any,
        open: Number(lastCandle.open),
        high: Number(lastCandle.high),
        low: Number(lastCandle.low),
        close: Number(lastCandle.close),
        volume: lastCandle.volume !== undefined ? Number(lastCandle.volume) : 0,
      };

      if (
        isNaN(formattedLast.time) || isNaN(formattedLast.open) || isNaN(formattedLast.high) ||
        isNaN(formattedLast.low) || isNaN(formattedLast.close) ||
        formattedLast.open <= 0 || formattedLast.close <= 0 ||
        formattedLast.low > formattedLast.high
      ) {
        return;
      }

      const currentData = formattedCandlesRef.current;
      if (currentData.length > 0) {
        const lastIdx = currentData.length - 1;
        if (currentData[lastIdx].time === formattedLast.time) {
          currentData[lastIdx] = formattedLast;
        } else if ((formattedLast.time as number) > (currentData[lastIdx].time as number)) {
          currentData.push(formattedLast);
          if (currentData.length > 1500) currentData.shift();
        } else {
          return; // stale tick, ignore
        }
      } else {
        currentData.push(formattedLast);
      }

      // Direct update — no RAF loop spinning
      try {
        if (chartType === 'heikin') {
          const haList = convertToHeikinAshi(currentData);
          const lastHa = haList[haList.length - 1];
          if (lastHa) candleSeriesInstance.current.update(lastHa as any);
        } else {
          candleSeriesInstance.current.update(formattedLast as any);
        }
      } catch (e) { /* series may have been removed */ }

      setCandlesCount(currentData.length);
      triggerRecalc(currentData);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = requestAnimationFrame(redrawCanvas);
    });

    return () => {
      active = false;
      unsubscribe();
      if (calcTimeout) clearTimeout(calcTimeout);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [symbol, timeframe, replayActive, indicators, cell.params, chartType]);

  // Position levels SL/TP plotting
  useEffect(() => {
    const series = candleSeriesInstance.current;
    if (!series) return;

    const clearLine = (ref: React.MutableRefObject<any>) => {
      if (ref.current) {
        try { series.removePriceLine(ref.current); } catch {}
        ref.current = null;
      }
    };

    clearLine(entryLineRef);
    clearLine(slLineRef);
    clearLine(tpLineRef);
    clearLine(tsLineRef);

    if (!activePosition) return;

    entryLineRef.current = series.createPriceLine({
      price: activePosition.average_price,
      color: '#2962FF',
      lineWidth: 2,
      lineStyle: 1,
      axisLabelVisible: true,
      title: `Entry (${Math.abs(activePosition.quantity)})`,
    });

    if (activePosition.stop_loss) {
      slLineRef.current = series.createPriceLine({
        price: activePosition.stop_loss,
        color: '#E53935',
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: `SL: ${activePosition.stop_loss.toFixed(getPrecision(symbol))}`,
      });
    }

    if (activePosition.take_profit) {
      tpLineRef.current = series.createPriceLine({
        price: activePosition.take_profit,
        color: '#43A047',
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: `TP: ${activePosition.take_profit.toFixed(getPrecision(symbol))}`,
      });
    }

    if (activePosition.trailing_stop) {
      tsLineRef.current = series.createPriceLine({
        price: activePosition.trailing_stop,
        color: '#FF9800',
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: `TS: ${activePosition.trailing_stop.toFixed(getPrecision(symbol))}`,
      });
    }
  }, [activePosition, symbol]);

  // Pending Orders plotting
  useEffect(() => {
    const series = candleSeriesInstance.current;
    if (!series) return;

    pendingOrderLinesRef.current.forEach(({ line }) => {
      try { series.removePriceLine(line); } catch {}
    });
    pendingOrderLinesRef.current = [];

    pendingOrders.forEach((order) => {
      if (order.price === undefined || order.price === null) return;
      const priceLine = series.createPriceLine({
        price: order.price,
        color: order.side === 'buy' ? '#2196F3' : '#FF9800',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${order.type.toUpperCase()} ${order.side.toUpperCase()} (${order.quantity})`,
      });
      pendingOrderLinesRef.current.push({ orderId: order.id, line: priceLine });
    });
  }, [pendingOrders, symbol]);

  // SL/TP drag modification
  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!candleSeriesInstance.current || !mainChartInstance.current) return;

      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;

      let dragType: 'sl' | 'tp' | 'ts' | 'order' | null = null;
      let dragOrderId: string | undefined = undefined;

      if (activePosition) {
        if (activePosition.stop_loss) {
          const slY = candleSeriesInstance.current.priceToCoordinate(activePosition.stop_loss);
          if (slY !== null && Math.abs(mouseY - slY) < 12) {
            dragType = 'sl';
          }
        }

        if (activePosition.take_profit && !dragType) {
          const tpY = candleSeriesInstance.current.priceToCoordinate(activePosition.take_profit);
          if (tpY !== null && Math.abs(mouseY - tpY) < 12) {
            dragType = 'tp';
          }
        }

        if (activePosition.trailing_stop && !dragType) {
          const tsY = candleSeriesInstance.current.priceToCoordinate(activePosition.trailing_stop);
          if (tsY !== null && Math.abs(mouseY - tsY) < 12) {
            dragType = 'ts';
          }
        }
      }

      if (!dragType) {
        for (const item of pendingOrderLinesRef.current) {
          const ord = pendingOrders.find(o => o.id === item.orderId);
          if (ord && ord.price !== undefined && ord.price !== null) {
            const ordY = candleSeriesInstance.current.priceToCoordinate(ord.price);
            if (ordY !== null && Math.abs(mouseY - ordY) < 12) {
              dragType = 'order';
              dragOrderId = ord.id;
              break;
            }
          }
        }
      }

      if (dragType) {
        draggingRef.current = { type: dragType, startY: mouseY, orderId: dragOrderId };
        mainChartInstance.current.applyOptions({
          handleScroll: false,
          handleScale: false,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !candleSeriesInstance.current) return;

      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const price = candleSeriesInstance.current.coordinateToPrice(mouseY);
      if (price === null) return;

      const { type, orderId } = draggingRef.current;
      const series = candleSeriesInstance.current;
      const precision = getPrecision(symbol);

      if (type === 'sl' && slLineRef.current) {
        series.removePriceLine(slLineRef.current);
        slLineRef.current = series.createPriceLine({
          price: price,
          color: '#E53935',
          lineWidth: 2,
          lineStyle: 1,
          axisLabelVisible: true,
          title: `SL: ${price.toFixed(precision)} (Dragging)`,
        });
      } else if (type === 'tp' && tpLineRef.current) {
        series.removePriceLine(tpLineRef.current);
        tpLineRef.current = series.createPriceLine({
          price: price,
          color: '#43A047',
          lineWidth: 2,
          lineStyle: 1,
          axisLabelVisible: true,
          title: `TP: ${price.toFixed(precision)} (Dragging)`,
        });
      } else if (type === 'ts' && tsLineRef.current) {
        series.removePriceLine(tsLineRef.current);
        tsLineRef.current = series.createPriceLine({
          price: price,
          color: '#FF9800',
          lineWidth: 2,
          lineStyle: 1,
          axisLabelVisible: true,
          title: `TS: ${price.toFixed(precision)} (Dragging)`,
        });
      } else if (type === 'order' && orderId) {
        const item = pendingOrderLinesRef.current.find(i => i.orderId === orderId);
        const ord = pendingOrders.find(o => o.id === orderId);
        if (item && ord) {
          series.removePriceLine(item.line);
          item.line = series.createPriceLine({
            price: price,
            color: ord.side === 'buy' ? '#2196F3' : '#FF9800',
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: `${ord.type.toUpperCase()} ${ord.side.toUpperCase()}: ${price.toFixed(precision)} (Dragging)`,
          });
        }
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (!draggingRef.current || !candleSeriesInstance.current || !mainChartInstance.current) return;

      const rect = container.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const price = candleSeriesInstance.current.coordinateToPrice(mouseY);

      mainChartInstance.current.applyOptions({
        handleScroll: true,
        handleScale: true,
      });

      const { type, orderId } = draggingRef.current;
      draggingRef.current = null;

      if (price !== null) {
        if (type === 'order' && orderId) {
          try {
            await modifyOrder(orderId, { price: price });
            useAppStore.getState().addToast('success', `Pending order price modified to ${price.toFixed(getPrecision(symbol))}`);
          } catch (err: any) {
            useAppStore.getState().addToast('error', err.message || 'Failed to modify pending order price');
          }
        } else if (activePosition) {
          if (type === 'ts') {
            try {
              const currentPrice = useMarketStore.getState().prices[symbol]?.price ?? activePosition.average_price;
              const distance = Math.abs(currentPrice - price);
              await modifyTrailingStop(symbol, distance);
              useAppStore.getState().addToast('success', `${symbol} TS modified.`);
            } catch (err: any) {
              useAppStore.getState().addToast('error', err.message || 'Failed to update Trailing Stop');
            }
          } else {
            const finalSL = type === 'sl' ? price : activePosition.stop_loss;
            const finalTP = type === 'tp' ? price : activePosition.take_profit;
            try {
              await modifySLTP(symbol, finalSL, finalTP);
              useAppStore.getState().addToast('success', `${symbol} ${type.toUpperCase()} modified.`);
            } catch (err: any) {
              useAppStore.getState().addToast('error', err.message || 'Failed to update SL/TP');
            }
          }
        }
      }
    };

    const handleMouseClick = (e: MouseEvent) => {
      if (e.altKey && candleSeriesInstance.current) {
        const rect = container.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const price = candleSeriesInstance.current.coordinateToPrice(mouseY);
        if (price !== null) {
          useAlertStore.getState().addAlert({
            symbol: symbol,
            type: 'price_above',
            value: parseFloat(price.toFixed(getPrecision(symbol))),
            condition: 'cross',
          });
          useAppStore.getState().addToast('success', `Price alert created at ${price.toFixed(getPrecision(symbol))} via Alt+Click`);
        }
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('click', handleMouseClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('click', handleMouseClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activePosition, symbol]);

  // Determine Sub-pane heights
  const numSubs = (indicators.rsi ? 1 : 0) +
                  (indicators.macd ? 1 : 0) +
                  (indicators.atr ? 1 : 0) +
                  (indicators.stochastic ? 1 : 0) +
                  (indicators.adx ? 1 : 0);

  const mainHeight = numSubs === 0 ? '100%' : numSubs === 1 ? '75%' : numSubs === 2 ? '55%' : numSubs === 3 ? '45%' : '40%';
  const subHeight = numSubs === 0 ? '0%' : `calc(${(100 - parseFloat(mainHeight)) / numSubs}% - 1px)`;

  return (
    <div
      onClick={onSelect}
      className={`single-chart-cell ${isActive ? 'active' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-color)',
        borderRadius: 4,
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="cell-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 8px',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          fontSize: 10,
          fontWeight: 700,
          color: isActive ? 'var(--accent)' : 'var(--text-secondary)'
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span>
            {symbol} ({timeframe}) {isActive ? '● Active' : ''}
          </span>
          {latestCandle && (
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 9, color: 'var(--text-secondary)' }}>
              O:<span style={{ color: latestCandle.close >= latestCandle.open ? '#00c076' : '#ff4d57', marginLeft: 2, marginRight: 6 }}>{latestCandle.open.toFixed(getPrecision(symbol))}</span>
              H:<span style={{ color: latestCandle.close >= latestCandle.open ? '#00c076' : '#ff4d57', marginLeft: 2, marginRight: 6 }}>{latestCandle.high.toFixed(getPrecision(symbol))}</span>
              L:<span style={{ color: latestCandle.close >= latestCandle.open ? '#00c076' : '#ff4d57', marginLeft: 2, marginRight: 6 }}>{latestCandle.low.toFixed(getPrecision(symbol))}</span>
              C:<span style={{ color: latestCandle.close >= latestCandle.open ? '#00c076' : '#ff4d57', marginLeft: 2, marginRight: 6 }}>{latestCandle.close.toFixed(getPrecision(symbol))}</span>
            </span>
          )}
          {countdownText && (
            <span style={{ color: '#d4af37', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 9, marginLeft: 6 }}>
              {countdownText}
            </span>
          )}
          {marketClosedText && (
            <span style={{ color: '#ff4d57', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 9, marginLeft: 6 }}>
              {marketClosedText}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, fontSize: 8 }}>
          {indicators.ema20 && <span style={{ color: '#2196F3' }}>EMA(20)</span>}
          {indicators.ema50 && <span style={{ color: '#E91E63' }}>EMA(50)</span>}
          {indicators.ema200 && <span style={{ color: '#9C27B0' }}>EMA(200)</span>}
          {indicators.vwap && <span style={{ color: '#FFEB3B' }}>VWAP</span>}
          {indicators.bb && <span style={{ color: '#03A9F4' }}>BB</span>}
          {indicators.ichimoku && <span style={{ color: '#FF9800' }}>Ichimoku</span>}
          {indicators.supertrend && <span style={{ color: '#0ecb81' }}>Supertrend</span>}
          {indicators.volProfile && <span style={{ color: '#FFD700' }}>POC</span>}
          {indicators.pivots && <span style={{ color: '#E0E0E0' }}>Pivots</span>}
          {indicators.rsi && <span style={{ color: '#E91E63' }}>RSI</span>}
          {indicators.macd && <span style={{ color: '#2196F3' }}>MACD</span>}
          {indicators.atr && <span style={{ color: '#FF5722' }}>ATR</span>}
          {indicators.stochastic && <span style={{ color: '#00BCD4' }}>Stoch</span>}
          {indicators.adx && <span style={{ color: '#9C27B0' }}>ADX</span>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#0b0d12' }}>
        <div style={{ position: 'relative', height: mainHeight, width: '100%' }} onContextMenu={handleContextMenu}>
          <div ref={mainContainerRef} style={{ height: '100%', width: '100%' }} />

          {entryY !== null && activePosition && (
            <div style={{
              position: 'absolute',
              left: '80px',
              top: `${entryY - 12}px`,
              height: '24px',
              zIndex: 15,
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(41, 98, 255, 0.95)',
              border: '1px solid #2962FF',
              borderRadius: '4px',
              padding: '0 8px',
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              userSelect: 'none',
            }}>
              <span style={{ fontWeight: 700 }}>
                {activePosition.quantity > 0 ? 'BUY' : 'SELL'} {Math.abs(activePosition.quantity)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                @ {activePosition.average_price.toFixed(getPrecision(symbol))}
              </span>
              <span style={{ 
                fontWeight: 700, 
                color: (activePosition.unrealized_pnl ?? 0) >= 0 ? '#00e676' : '#ff1744',
                marginLeft: '4px'
              }}>
                {(activePosition.unrealized_pnl ?? 0) >= 0 ? '+' : ''}{(activePosition.unrealized_pnl ?? 0).toFixed(2)}
              </span>
              <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  if (closingSymbolsRef.current.has(symbol)) return;
                  closingSymbolsRef.current.add(symbol);
                  try {
                    const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
                    await closeSymbol(symbol, undefined, activeAccountType);
                    useAppStore.getState().addToast('success', `Position closed for ${symbol}`);
                  } catch (err: any) {
                    useAppStore.getState().addToast('error', err.message || 'Failed to close position');
                  } finally {
                    closingSymbolsRef.current.delete(symbol);
                  }
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '10px',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  padding: 0,
                  marginLeft: '4px'
                }}
                title="Close Position Immediately"
              >
                ✕
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    height: '18px',
                    padding: '0 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = e.currentTarget.nextElementSibling as HTMLElement;
                    if (target) {
                      target.style.display = target.style.display === 'none' ? 'block' : 'none';
                    }
                  }}
                >
                  %
                </button>
                <div
                  style={{
                    display: 'none',
                    position: 'absolute',
                    bottom: '22px',
                    left: 0,
                    background: '#131722',
                    border: '1px solid #2962FF',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 100,
                    minWidth: '60px',
                    overflow: 'hidden'
                  }}
                >
                  {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                    <div
                      key={pct}
                      style={{
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'white',
                        textAlign: 'center',
                        background: 'transparent',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(41, 98, 255, 0.2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const menu = e.currentTarget.parentElement as HTMLElement;
                        if (menu) menu.style.display = 'none';
                        try {
                          const qtyToClose = parseFloat((Math.abs(activePosition.quantity) * pct).toFixed(4));
                          await partialClose(symbol, qtyToClose);
                          useAppStore.getState().addToast('success', `Partially closed ${pct * 100}% of ${symbol} position`);
                        } catch (err: any) {
                          useAppStore.getState().addToast('error', err.message || 'Partial close failed');
                        }
                      }}
                    >
                      {pct * 100}%
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {slY !== null && activePosition && activePosition.stop_loss && (
            <div style={{
              position: 'absolute',
              left: '80px',
              top: `${slY - 12}px`,
              height: '24px',
              zIndex: 15,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(229, 57, 53, 0.95)',
              border: '1px solid #E53935',
              borderRadius: '4px',
              padding: '0 8px',
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              userSelect: 'none',
            }}>
              <span style={{ fontWeight: 700 }}>SL</span>
              <span>{activePosition.stop_loss.toFixed(getPrecision(symbol))}</span>
            </div>
          )}

          {tpY !== null && activePosition && activePosition.take_profit && (
            <div style={{
              position: 'absolute',
              left: '80px',
              top: `${tpY - 12}px`,
              height: '24px',
              zIndex: 15,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(67, 160, 71, 0.95)',
              border: '1px solid #43A047',
              borderRadius: '4px',
              padding: '0 8px',
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              userSelect: 'none',
            }}>
              <span style={{ fontWeight: 700 }}>TP</span>
              <span>{activePosition.take_profit.toFixed(getPrecision(symbol))}</span>
            </div>
          )}

          {tsY !== null && activePosition && activePosition.trailing_stop && (
            <div style={{
              position: 'absolute',
              left: '80px',
              top: `${tsY - 12}px`,
              height: '24px',
              zIndex: 15,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 152, 0, 0.95)',
              border: '1px solid #FF9800',
              borderRadius: '4px',
              padding: '0 8px',
              color: 'white',
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              userSelect: 'none',
            }}>
              <span style={{ fontWeight: 700 }}>TS</span>
              <span>{activePosition.trailing_stop.toFixed(getPrecision(symbol))}</span>
            </div>
          )}
          
          {candlesCount === 0 && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: '#0b0d12',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontFamily: 'Inter, sans-serif'
            }}>
              <span style={{
                width: '30px',
                height: '30px',
                border: '3px solid var(--accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite',
                marginBottom: '12px'
              }} />
              <span>Waiting for market data...</span>
            </div>
          )}

          {isFetchingNewData && (
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(13, 19, 34, 0.85)',
              border: '1px solid var(--accent)',
              borderRadius: '4px',
              padding: '6px 12px',
              zIndex: 20,
              fontSize: '11px',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              fontWeight: 700
            }}>
              <span style={{
                width: '10px',
                height: '10px',
                border: '2px solid var(--accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }} />
              <span>Loading {symbol} history...</span>
            </div>
          )}

          {/* Lazy Loading History Indicator Overlay */}
          {isLoadingHistory && (
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '12px',
              background: 'rgba(13, 19, 34, 0.85)',
              border: '1px solid var(--accent)',
              borderRadius: '4px',
              padding: '6px 10px',
              zIndex: 15,
              fontSize: '10px',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(2px)',
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              fontWeight: 700
            }}>
              <span className="spinner-mini" style={{
                width: '10px',
                height: '10px',
                border: '2px solid var(--accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          )}

          {/* GoldAPI Connection Status Banner */}
          {(symbol === 'XAUUSD' || symbol === 'XAGUSD') && realMarketConnectionStatus !== 'connected' && (
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(239, 83, 80, 0.95)',
              border: '1px solid #ff4d57',
              borderRadius: '4px',
              padding: '6px 12px',
              zIndex: 25,
              fontSize: '11px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
            }}>
              <span>⚠️</span>
              <span>Market Feed Reconnecting (GoldAPI)...</span>
            </div>
          )}

          {/* Floating Chart Trade Panel Overlay */}
          {activePosition && (
            <div style={{
              position: 'absolute',
              top: '40px',
              right: '12px',
              background: 'rgba(13, 19, 34, 0.85)',
              border: '1px solid #1b2235',
              borderRadius: '4px',
              padding: '6px 10px',
              zIndex: 15,
              fontSize: '10px',
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              backdropFilter: 'blur(2px)',
              pointerEvents: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              fontFamily: 'monospace',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#8e8e93', fontWeight: 600 }}>Pos:</span>
                <span style={{ fontWeight: 700, color: activePosition.quantity > 0 ? '#00c076' : '#ff4d57' }}>
                  {activePosition.quantity > 0 ? 'LONG' : 'SHORT'} ({Math.abs(activePosition.quantity).toFixed(2)})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ color: '#8e8e93' }}>P&amp;L:</span>
                <span style={{ fontWeight: 700, color: livePnl >= 0 ? '#00c076' : '#ff4d57' }}>
                  {livePnl >= 0 ? '+' : ''}${livePnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
                </span>
              </div>
              {activePosition.stop_loss && activePosition.take_profit && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: '#8e8e93' }}>R:R:</span>
                  <span style={{ fontWeight: 700, color: '#d4af37' }}>
                    {getRR(activePosition, activePosition.average_price)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Right Click Context Menu */}
          {contextMenu && activePosition && (
            <div style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#0d1322',
              border: '1px solid #1b2235',
              borderRadius: '4px',
              padding: '4px 0',
              zIndex: 9999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '130px',
              fontFamily: 'var(--font-sans)',
            }}>
              <button
                onClick={handleClosePos}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  color: '#ff4d57',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Close Position
              </button>
              <button
                onClick={handleReversePos}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Reverse Position
              </button>
              <button
                onClick={handleBEPos}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Move to Break Even
              </button>
              <div style={{ padding: '4px 12px', color: '#8e8e93', fontSize: '9px', fontWeight: 600 }}>PARTIAL CLOSE</div>
              <button
                onClick={() => handlePartialClosePos(activePosition, 0.25)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 12px 4px 20px',
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Close 25%
              </button>
              <button
                onClick={() => handlePartialClosePos(activePosition, 0.50)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 12px 4px 20px',
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Close 50%
              </button>
              <button
                onClick={() => handlePartialClosePos(activePosition, 0.75)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 12px 4px 20px',
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Close 75%
              </button>
              <div style={{ padding: '4px 12px', color: '#8e8e93', fontSize: '9px', fontWeight: 600 }}>TRAILING STOP</div>
              <button
                onClick={() => handleTrailStop(20)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 12px 4px 20px',
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Trail 20 units
              </button>
              <button
                onClick={() => handleTrailStop(50)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 12px 4px 20px',
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Trail 50 units
              </button>
              <button
                onClick={() => handleTrailStop(100)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '4px 12px 4px 20px',
                  color: '#ffffff',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Trail 100 units
              </button>
              <div style={{ borderTop: '1px solid #1b2235', margin: '4px 0' }} />
              <button
                onClick={handleDuplicatePos}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 12px',
                  color: '#d4af37',
                  fontSize: '10px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Duplicate Trade
              </button>
            </div>
          )}
          {/* Economic Calendar Event Overlay Banner */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(7, 11, 20, 0.85)',
            border: '1px solid #1b2235',
            borderRadius: '4px',
            padding: '4px 10px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            zIndex: 20,
            fontSize: '9px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>
            {eventCountdowns.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: ev.importance === 'HIGH' ? '#ff4d57' : ev.importance === 'MEDIUM' ? '#ffb74d' : '#ffeb3b'
                }} />
                <span style={{ fontWeight: 700, color: '#f5f5f7' }}>{ev.name}:</span>
                <span style={{ color: '#d4af37', fontFamily: 'monospace' }}>{ev.countdown}</span>
              </div>
            ))}
            {eventCountdowns.length === 0 && (
              <span style={{ color: '#8e8e93' }}>No high impact releases today</span>
            )}
          </div>
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: activeDrawingTool ? 'auto' : 'none',
              zIndex: 10
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
          />
        </div>
        {indicators.rsi && (
          <div ref={rsiContainerRef} style={{ height: subHeight, width: '100%', borderTop: '1px solid var(--border-color)' }} />
        )}
        {indicators.macd && (
          <div ref={macdContainerRef} style={{ height: subHeight, width: '100%', borderTop: '1px solid var(--border-color)' }} />
        )}
        {indicators.atr && (
          <div ref={atrContainerRef} style={{ height: subHeight, width: '100%', borderTop: '1px solid var(--border-color)' }} />
        )}
        {indicators.stochastic && (
          <div ref={stochasticContainerRef} style={{ height: subHeight, width: '100%', borderTop: '1px solid var(--border-color)' }} />
        )}
        {indicators.adx && (
          <div ref={adxContainerRef} style={{ height: subHeight, width: '100%', borderTop: '1px solid var(--border-color)' }} />
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isActive === nextProps.isActive &&
    prevProps.crosshairTime === nextProps.crosshairTime &&
    prevProps.activeDrawingTool === nextProps.activeDrawingTool &&
    prevProps.drawingColor === nextProps.drawingColor &&
    prevProps.chartType === nextProps.chartType &&
    prevProps.themeBg === nextProps.themeBg &&
    prevProps.themeGridColor === nextProps.themeGridColor &&
    prevProps.themeCrosshairColor === nextProps.themeCrosshairColor &&
    prevProps.themeBullColor === nextProps.themeBullColor &&
    prevProps.themeBearColor === nextProps.themeBearColor &&
    prevProps.themeWatermarkVisible === nextProps.themeWatermarkVisible &&
    prevProps.cell.id === nextProps.cell.id &&
    prevProps.cell.symbol === nextProps.cell.symbol &&
    prevProps.cell.timeframe === nextProps.cell.timeframe &&
    prevProps.cell.indicators.ema20 === nextProps.cell.indicators.ema20 &&
    prevProps.cell.indicators.ema50 === nextProps.cell.indicators.ema50 &&
    prevProps.cell.indicators.ema200 === nextProps.cell.indicators.ema200 &&
    prevProps.cell.indicators.vwap === nextProps.cell.indicators.vwap &&
    prevProps.cell.indicators.bb === nextProps.cell.indicators.bb &&
    prevProps.cell.indicators.rsi === nextProps.cell.indicators.rsi &&
    prevProps.cell.indicators.macd === nextProps.cell.indicators.macd &&
    prevProps.cell.indicators.atr === nextProps.cell.indicators.atr &&
    prevProps.cell.indicators.stochastic === nextProps.cell.indicators.stochastic &&
    prevProps.cell.indicators.ichimoku === nextProps.cell.indicators.ichimoku &&
    prevProps.cell.indicators.supertrend === nextProps.cell.indicators.supertrend &&
    prevProps.cell.indicators.adx === nextProps.cell.indicators.adx &&
    prevProps.cell.indicators.volProfile === nextProps.cell.indicators.volProfile &&
    prevProps.cell.indicators.pivots === nextProps.cell.indicators.pivots &&
    prevProps.cell.drawings.length === nextProps.cell.drawings.length
  );
});
SingleChartCell.displayName = 'SingleChartCell';

const TIMEFRAMES = [
  { value: '1s', label: '1s' },
  { value: '5s', label: '5s' },
  { value: '15s', label: '15s' },
  { value: '30s', label: '30s' },
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '5m', label: '5m' },
  { value: '10m', label: '10m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '45m', label: '45m' },
  { value: '1h', label: '1H' },
  { value: '2h', label: '2H' },
  { value: '4h', label: '4H' },
  { value: '6h', label: '6H' },
  { value: '8h', label: '8H' },
  { value: '12h', label: '12H' },
  { value: 'Daily', label: '1D' },
  { value: 'Weekly', label: '1W' },
  { value: 'Monthly', label: '1M' }
] as const;

// Main Multi-Chart Layout Component
const Chart: React.FC = () => {
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const globalTimeframe = useMarketStore((s) => s.timeframe);
  const setGlobalTimeframe = useMarketStore((s) => s.setTimeframe);

  const [layout, setLayout] = useState<1 | 2 | 4 | 6>(() => {
    try {
      const saved = localStorage.getItem('trading-chart-layout');
      if (saved) return parseInt(saved) as any;
    } catch {}
    return 1;
  });

  const [activeCellId, setActiveCellId] = useState<number>(0);
  const [crosshairTime, setCrosshairTime] = useState<number | null>(null);
  const crosshairFrameIdRef = useRef<number | null>(null);
  const nextCrosshairTimeRef = useRef<number | null>(null);

  const handleCrosshairMove = React.useCallback((time: number | null) => {
    nextCrosshairTimeRef.current = time;
    if (crosshairFrameIdRef.current) return;
    
    crosshairFrameIdRef.current = requestAnimationFrame(() => {
      crosshairFrameIdRef.current = null;
      setCrosshairTime(nextCrosshairTimeRef.current);
    });
  }, []);

  // Drawing Tools Configuration
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);
  const [drawingColor, setDrawingColor] = useState<string>('#d4af37'); // Gold default
  const [isMobileScreen, setIsMobileScreen] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isDrawingMenuExpanded, setIsDrawingMenuExpanded] = useState(false);

  // Chart Upgrades configuration states
  const [chartType, setChartType] = useState<'candlestick' | 'hollow' | 'bar' | 'line' | 'area' | 'baseline' | 'heikin'>('candlestick');
  const [themeBg, setThemeBg] = useState<string>('#0b0d12');
  const [themeGridColor, setThemeGridColor] = useState<string>('rgba(43, 49, 57, 0.15)');
  const [themeCrosshairColor, setThemeCrosshairColor] = useState<string>('#8f929d');
  const [themeBullColor, setThemeBullColor] = useState<string>('#0ecb81');
  const [themeBearColor, setThemeBearColor] = useState<string>('#f6465d');
  const [themeWatermarkVisible, setThemeWatermarkVisible] = useState<boolean>(true);

  // Undo/Redo Stacks
  const [cellsHistory, setCellsHistory] = useState<CellState[][]>([]);
  const [cellsRedoHistory, setCellsRedoHistory] = useState<CellState[][]>([]);

  const timeframeSelectorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll centering effect when globalTimeframe changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const container = timeframeSelectorRef.current;
      if (!container) return;
      const selectedBtn = container.querySelector('.timeframe-btn.active');
      if (selectedBtn) {
        selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [globalTimeframe]);

  // Support mouse wheel horizontal scrolling on desktop
  const handleTimeframeWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = timeframeSelectorRef.current;
    if (el) {
      el.scrollLeft += e.deltaY;
    }
  };

  // Chart API Registry
  const mainChartsRef = useRef<Record<number, IChartApi>>({});

  const handleRegisterChart = React.useCallback((id: number, chart: IChartApi) => {
    mainChartsRef.current[id] = chart;
  }, []);

  const handleUnregisterChart = React.useCallback((id: number) => {
    delete mainChartsRef.current[id];
  }, []);



  // Candle close countdown timer hook
  const [candleCountdown, setCandleCountdown] = useState<string>('');
  const formattedCandlesRef = useRef<any[]>([]);

  // Update global candles reference for countdown logic
  useEffect(() => {
    if (!selectedInstrument) return;
    const cacheKey = `${selectedInstrument.symbol}_${globalTimeframe}`;
    const cached = useMarketStore.getState().candles[cacheKey] || [];
    formattedCandlesRef.current = cached.map((c) => ({
      time: Math.floor(new Date(c.timestamp).getTime() / 1000)
    }));
  }, [selectedInstrument, globalTimeframe]);

  useEffect(() => {
    const timer = setInterval(() => {
      const candles = formattedCandlesRef.current;
      if (candles.length === 0) {
        setCandleCountdown('');
        return;
      }
      const lastCandle = candles[candles.length - 1];
      const lastTime = lastCandle.time as number;
      
      let tf_ms = 60000;
      const tf = globalTimeframe;
      if (tf === "1s") tf_ms = 1000;
      else if (tf === "5s") tf_ms = 5000;
      else if (tf === "15s") tf_ms = 15000;
      else if (tf === "30s") tf_ms = 30000;
      else if (tf === "3m") tf_ms = 180000;
      else if (tf === "5m") tf_ms = 300000;
      else if (tf === "10m") tf_ms = 600000;
      else if (tf === "15m") tf_ms = 900000;
      else if (tf === "30m") tf_ms = 1800000;
      else if (tf === "45m") tf_ms = 2700000;
      else if (tf === "1h" || tf === "1H") tf_ms = 3600000;
      else if (tf === "2h" || tf === "2H") tf_ms = 7200000;
      else if (tf === "4h" || tf === "4H") tf_ms = 14400000;
      else if (tf === "6h" || tf === "6H") tf_ms = 21600000;
      else if (tf === "8h" || tf === "8H") tf_ms = 28800000;
      else if (tf === "12h" || tf === "12H") tf_ms = 43200000;
      else if (tf === "Daily" || tf === "1d" || tf === "1D") tf_ms = 86400000;
      else if (tf === "Weekly" || tf === "1w" || tf === "1W") tf_ms = 604800000;
      else if (tf === "Monthly" || tf === "1M") tf_ms = 2592000000;

      const nextCandleTime = (lastTime * 1000) + tf_ms;
      const diff = nextCandleTime - Date.now();
      if (diff <= 0) {
        setCandleCountdown('New Candle');
      } else {
        const secs = Math.floor(diff / 1000) % 60;
        const mins = Math.floor(diff / 60000) % 60;
        const hours = Math.floor(diff / 3600000);
        
        const pad = (n: number) => String(n).padStart(2, '0');
        if (hours > 0) {
          setCandleCountdown(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
        } else {
          setCandleCountdown(`${pad(mins)}:${pad(secs)}`);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [globalTimeframe]);



  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Settings & Templates State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  
  const [templates, setTemplates] = useState<IndicatorTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('trading-indicator-templates');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { name: 'Default Setup', indicators: { ema20: true, ema50: true, ema200: true, vwap: true, bb: false, rsi: true, macd: false, atr: false, stochastic: false, ichimoku: false, supertrend: false, adx: false, volProfile: false, pivots: false }, params: DEFAULT_PARAMS },
      { name: 'Trend Following', indicators: { ema20: true, ema50: true, supertrend: true, adx: true, rsi: true, vwap: false, ema200: false, bb: false, macd: false, atr: false, stochastic: false, ichimoku: false, volProfile: false, pivots: false }, params: DEFAULT_PARAMS }
    ];
  });

  // Initialize cells state (6 potential independent layouts)
  const [cells, setCells] = useState<CellState[]>(() => {
    try {
      const saved = localStorage.getItem('trading-chart-cells');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [
      { id: 0, symbol: 'BTCUSDT', timeframe: '1m', indicators: { ema20: false, ema50: false, ema200: false, vwap: false, bb: false, rsi: false, macd: false, atr: false, stochastic: false, ichimoku: false, supertrend: false, adx: false, volProfile: false, pivots: false }, params: DEFAULT_PARAMS, drawings: [] },
      { id: 1, symbol: 'ETHUSDT', timeframe: '1m', indicators: { ema20: false, ema50: false, ema200: false, vwap: false, bb: false, rsi: false, macd: false, atr: false, stochastic: false, ichimoku: false, supertrend: false, adx: false, volProfile: false, pivots: false }, params: DEFAULT_PARAMS, drawings: [] },
      { id: 2, symbol: 'EURUSD', timeframe: '1m', indicators: { ema20: false, ema50: false, ema200: false, vwap: false, bb: false, rsi: false, macd: false, atr: false, stochastic: false, ichimoku: false, supertrend: false, adx: false, volProfile: false, pivots: false }, params: DEFAULT_PARAMS, drawings: [] },
      { id: 3, symbol: 'XAUUSD', timeframe: '1m', indicators: { ema20: false, ema50: false, ema200: false, vwap: false, bb: false, rsi: false, macd: false, atr: false, stochastic: false, ichimoku: false, supertrend: false, adx: false, volProfile: false, pivots: false }, params: DEFAULT_PARAMS, drawings: [] },
      { id: 4, symbol: 'NAS100', timeframe: '1m', indicators: { ema20: false, ema50: false, ema200: false, vwap: false, bb: false, rsi: false, macd: false, atr: false, stochastic: false, ichimoku: false, supertrend: false, adx: false, volProfile: false, pivots: false }, params: DEFAULT_PARAMS, drawings: [] },
      { id: 5, symbol: 'GBPUSD', timeframe: '1m', indicators: { ema20: false, ema50: false, ema200: false, vwap: false, bb: false, rsi: false, macd: false, atr: false, stochastic: false, ichimoku: false, supertrend: false, adx: false, volProfile: false, pivots: false }, params: DEFAULT_PARAMS, drawings: [] },
    ];
  });

  // Custom cell state updater with history tracking
  const updateCellsState = React.useCallback((newCells: CellState[] | ((prev: CellState[]) => CellState[])) => {
    setCells((prev) => {
      const resolved = typeof newCells === 'function' ? newCells(prev) : newCells;
      setCellsHistory((hist) => [...hist.slice(-49), prev]);
      setCellsRedoHistory([]);
      return resolved;
    });
  }, []);

  const handleUndo = React.useCallback(() => {
    setCellsHistory((hist) => {
      if (hist.length === 0) return hist;
      const prev = hist[hist.length - 1];
      setCells((current) => {
        setCellsRedoHistory((redo) => [...redo.slice(-49), current]);
        return prev;
      });
      return hist.slice(0, -1);
    });
  }, []);

  const handleRedo = React.useCallback(() => {
    setCellsRedoHistory((redo) => {
      if (redo.length === 0) return redo;
      const next = redo[redo.length - 1];
      setCells((current) => {
        setCellsHistory((hist) => [...hist.slice(-49), current]);
        return next;
      });
      return redo.slice(0, -1);
    });
  }, []);

  // Persist workspace changes
  useEffect(() => {
    localStorage.setItem('trading-chart-layout', layout.toString());
  }, [layout]);

  useEffect(() => {
    localStorage.setItem('trading-chart-cells', JSON.stringify(cells));
  }, [cells]);

  const activeCell = useMemo(() => {
    return cells.find((c) => c.id === activeCellId) || cells[0];
  }, [cells, activeCellId]);

  // Sync Watchlist Selection
  useEffect(() => {
    if (!selectedInstrument) return;
    setCells((prev) =>
      prev.map((c) => (c.id === activeCellId ? { ...c, symbol: selectedInstrument.symbol } : c))
    );
  }, [selectedInstrument, activeCellId]);

  // Sync Timeframe selection
  useEffect(() => {
    if (!globalTimeframe) return;
    setCells((prev) =>
      prev.map((c) => (c.id === activeCellId ? { ...c, timeframe: globalTimeframe } : c))
    );
  }, [globalTimeframe, activeCellId]);

  const handleResetChart = React.useCallback(() => {
    const activeChart = mainChartsRef.current[activeCellId];
    if (activeChart) {
      activeChart.timeScale().fitContent();
    }
  }, [activeCellId]);

  const handleScreenshot = React.useCallback(() => {
    const activeChart = mainChartsRef.current[activeCellId];
    if (activeChart) {
      const currentCell = cells.find((c) => c.id === activeCellId) || cells[0];
      const canvas = activeChart.takeScreenshot();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${currentCell.symbol}_${currentCell.timeframe}_chart.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [activeCellId, cells]);

  const handleFullscreen = React.useCallback(() => {
    const el = document.querySelector('.chart-wrapper');
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen().catch((err) => console.error("Fullscreen error", err));
      } else {
        document.exitFullscreen();
      }
    }
  }, []);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'Escape') {
        setActiveDrawingTool(null);
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        updateCellsState((prev) =>
          prev.map((c) => (c.id === activeCellId ? { ...c, drawings: [] } : c))
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, activeCellId, updateCellsState]);

  const handleSelectCell = (cellId: number) => {
    setActiveCellId(cellId);
    const targetCell = cells.find((c) => c.id === cellId);
    if (targetCell) {
      const inst = useAppStore.getState().watchlist.find((i) => i.symbol === targetCell.symbol);
      if (inst) {
        useAppStore.getState().setSelectedInstrument(inst);
      }
      setGlobalTimeframe(targetCell.timeframe);
    }
  };

  const toggleIndicator = (ind: keyof CellIndicators) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === activeCellId
          ? {
              ...c,
              indicators: { ...c.indicators, [ind]: !c.indicators[ind] }
            }
          : c
      )
    );
  };

  const updateParam = (ind: keyof CellParams, key: string, val: number) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === activeCellId
          ? {
              ...c,
              params: {
                ...c.params,
                [ind]: {
                  ...c.params[ind],
                  [key]: val
                }
              }
            }
          : c
      )
    );
  };

  const saveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newTpl: IndicatorTemplate = {
      name: newTemplateName.trim(),
      indicators: { ...activeCell.indicators },
      params: JSON.parse(JSON.stringify(activeCell.params))
    };
    const updated = [...templates, newTpl];
    setTemplates(updated);
    localStorage.setItem('trading-indicator-templates', JSON.stringify(updated));
    setNewTemplateName('');
    useAppStore.getState().addToast('success', `Template "${newTpl.name}" saved!`);
  };

  const applyTemplate = (tpl: IndicatorTemplate) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === activeCellId
          ? {
              ...c,
              indicators: { ...tpl.indicators },
              params: JSON.parse(JSON.stringify(tpl.params))
            }
          : c
      )
    );
    useAppStore.getState().addToast('success', `Template "${tpl.name}" applied.`);
  };

  const getGridStyle = (): React.CSSProperties => {
    switch (layout) {
      case 2:
        return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr', gap: 6, flex: 1 };
      case 4:
        return { display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, flex: 1 };
      case 6:
        return { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 6, flex: 1 };
      default:
        return { display: 'grid', gridTemplateColumns: '1fr', gridTemplateRows: '1fr', gap: 6, flex: 1 };
    }
  };

  const visibleCells = useMemo(() => {
    return cells.slice(0, layout);
  }, [cells, layout]);

  const clearActiveDrawings = () => {
    setCells((prev) =>
      prev.map((c) => (c.id === activeCellId ? { ...c, drawings: [] } : c))
    );
    useAppStore.getState().addToast('info', 'All drawings cleared for active chart');
  };

  return (
    <div className="chart-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Chart Top Toolbar */}
      <div className="chart-header-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="chart-header-left" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="chart-symbol-info" style={{ textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {activeCell.symbol}
            {candleCountdown && (
              <span style={{ fontSize: 9, color: '#f0b90b', fontFamily: 'monospace', fontWeight: 600, background: 'rgba(240, 185, 11, 0.1)', padding: '2px 4px', borderRadius: 3 }}>
                {candleCountdown}
              </span>
            )}
          </span>
          <div className="timeframe-scroller-wrapper">
            <div
              ref={timeframeSelectorRef}
              onWheel={handleTimeframeWheel}
              className="timeframe-selector-scrollable"
            >
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  className={`timeframe-btn ${activeCell.timeframe === tf.value ? 'active' : ''}`}
                  onClick={() => setGlobalTimeframe(tf.value)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Type Selector Dropdown */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <select
              value={chartType}
              onChange={(e: any) => setChartType(e.target.value)}
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'white',
                fontSize: 9,
                padding: '2px 4px',
                borderRadius: 3,
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              <option value="candlestick">🕯️ Candles</option>
              <option value="hollow">🕯️ Hollow</option>
              <option value="bar">📊 Bars</option>
              <option value="line">📈 Line</option>
              <option value="area">📉 Area</option>
              <option value="baseline">📉 Baseline</option>
              <option value="heikin">⛩️ Heikin Ashi</option>
            </select>
          </div>

          {/* Undo / Redo & Toolbar Actions */}
          <div style={{ display: 'inline-flex', gap: 3, borderLeft: '1px solid var(--border-color)', paddingLeft: 8 }}>
            <button
              onClick={handleUndo}
              disabled={cellsHistory.length === 0}
              title="Undo drawing/change (Ctrl+Z)"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: cellsHistory.length === 0 ? 'var(--text-secondary)' : 'white',
                opacity: cellsHistory.length === 0 ? 0.4 : 1,
                fontSize: 10,
                padding: '3px 6px',
                borderRadius: 3,
                cursor: cellsHistory.length === 0 ? 'default' : 'pointer',
                fontWeight: 700
              }}
            >
              ↩️ Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={cellsRedoHistory.length === 0}
              title="Redo drawing/change (Ctrl+Y)"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: cellsRedoHistory.length === 0 ? 'var(--text-secondary)' : 'white',
                opacity: cellsRedoHistory.length === 0 ? 0.4 : 1,
                fontSize: 10,
                padding: '3px 6px',
                borderRadius: 3,
                cursor: cellsRedoHistory.length === 0 ? 'default' : 'pointer',
                fontWeight: 700
              }}
            >
              ↪️ Redo
            </button>
            <button
              onClick={handleResetChart}
              title="Reset Zoom / Fit Content"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'white',
                fontSize: 10,
                padding: '3px 6px',
                borderRadius: 3,
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              🎯 Reset
            </button>
            <button
              onClick={handleScreenshot}
              title="Save Image Screenshot"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'white',
                fontSize: 10,
                padding: '3px 6px',
                borderRadius: 3,
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              📸 Shot
            </button>
            <button
              onClick={handleFullscreen}
              title="Toggle Fullscreen Chart"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'white',
                fontSize: 10,
                padding: '3px 6px',
                borderRadius: 3,
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              🖥️ Full
            </button>
          </div>
        </div>

        {/* Layout Selector and Indicators Control panel */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          {/* Layout buttons */}
          <div style={{ display: 'inline-flex', border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
            {([1, 2, 4, 6] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLayout(l)}
                style={{
                  padding: '4px 8px',
                  fontSize: 10,
                  fontWeight: 700,
                  border: 'none',
                  background: layout === l ? 'var(--accent)' : 'var(--bg-primary)',
                  color: layout === l ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {l} {l === 1 ? 'Chart' : 'Charts'}
              </button>
            ))}
          </div>

          {/* Quick toggle indicator buttons */}
          <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {(['ema20', 'ema50', 'ema200', 'vwap', 'bb', 'ichimoku', 'supertrend', 'rsi', 'macd', 'atr', 'stochastic', 'adx', 'volProfile', 'pivots'] as const).map((ind) => {
              const active = activeCell.indicators[ind];
              const label =
                ind === 'ema20'
                  ? 'EMA(20)'
                  : ind === 'ema50'
                  ? 'EMA(50)'
                  : ind === 'ema200'
                  ? 'EMA(200)'
                  : ind === 'volProfile'
                  ? 'POC'
                  : ind.toUpperCase();

              return (
                <button
                  key={ind}
                  onClick={() => toggleIndicator(ind)}
                  style={{
                    padding: '3px 6px',
                    fontSize: 8,
                    fontWeight: 700,
                    borderRadius: 3,
                    border: '1px solid var(--border-color)',
                    background: active ? 'var(--accent-glow)' : 'var(--bg-primary)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={{
              padding: '3px 8px',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 3,
              border: '1px solid var(--accent)',
              background: 'transparent',
              color: 'var(--accent)',
              cursor: 'pointer'
            }}
          >
            ⚙️ Settings & Templates
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Drawing Toolbar + Grid Display Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Drawing Toolbar */}
        {!isMobileScreen && (
          <div
            style={{
              width: 38,
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0',
              gap: 8
            }}
          >
            {(['trendline', 'horizontal', 'vertical', 'rectangle', 'fibonacci', 'text', 'arrow'] as const).map((tool) => {
              const active = activeDrawingTool === tool;
              const label =
                tool === 'trendline' ? '╱' :
                tool === 'horizontal' ? '─' :
                tool === 'vertical' ? '│' :
                tool === 'rectangle' ? '█' :
                tool === 'fibonacci' ? 'FIB' :
                tool === 'text' ? 'TXT' : '▲';
              
              return (
                <button
                  key={tool}
                  title={`Draw ${tool}`}
                  onClick={() => setActiveDrawingTool(active ? null : tool)}
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: tool === 'fibonacci' ? 8 : 10,
                    fontWeight: 700,
                    borderRadius: 4,
                    border: '1px solid var(--border-color)',
                    background: active ? 'var(--accent-glow)' : 'var(--bg-primary)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {label}
                </button>
              );
            })}

            <button
              title="Measure tool"
              onClick={() => setActiveDrawingTool(activeDrawingTool === 'measure' ? null : 'measure')}
              style={{
                width: 28,
                height: 28,
                fontSize: 10,
                borderRadius: 4,
                border: '1px solid var(--border-color)',
                background: activeDrawingTool === 'measure' ? 'var(--accent-glow)' : 'var(--bg-primary)',
                color: activeDrawingTool === 'measure' ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              📏
            </button>

            {/* Color Selector */}
            <select
              value={drawingColor}
              onChange={(e) => setDrawingColor(e.target.value)}
              style={{
                width: 28,
                height: 20,
                fontSize: 8,
                background: drawingColor,
                color: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 4,
                cursor: 'pointer',
                marginTop: 10
              }}
            >
              <option value="#d4af37" style={{ background: '#d4af37' }}>Gold</option>
              <option value="#ff4d57" style={{ background: '#ff4d57' }}>Red</option>
              <option value="#00c076" style={{ background: '#00c076' }}>Green</option>
              <option value="#2196f3" style={{ background: '#2196f3' }}>Blue</option>
            </select>

            <button
              title="Clear all drawings"
              onClick={clearActiveDrawings}
              style={{
                width: 28,
                height: 28,
                fontSize: 10,
                borderRadius: 4,
                border: 'none',
                background: 'transparent',
                color: 'var(--danger)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 'auto'
              }}
            >
              🗑️
            </button>
          </div>
        )}

        {/* Grid Display Area */}
        <div className="chart-container" style={{ padding: 6, flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={getGridStyle()}>
            {visibleCells.map((c) => (
              <SingleChartCell
                key={c.id}
                cell={c}
                isActive={c.id === activeCellId}
                onSelect={() => handleSelectCell(c.id)}
                crosshairTime={crosshairTime}
                onCrosshairMove={handleCrosshairMove}
                activeDrawingTool={activeDrawingTool}
                setActiveDrawingTool={setActiveDrawingTool}
                drawingColor={drawingColor}
                setCells={updateCellsState}
                chartType={chartType}
                themeBg={themeBg}
                themeGridColor={themeGridColor}
                themeCrosshairColor={themeCrosshairColor}
                themeBullColor={themeBullColor}
                themeBearColor={themeBearColor}
                themeWatermarkVisible={themeWatermarkVisible}
                onRegisterChartApi={handleRegisterChart}
                onUnregisterChartApi={handleUnregisterChart}
              />
            ))}
          </div>

          {/* Collapsed/Floating Drawing Tools for Mobile viewports */}
          {isMobileScreen && (
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              zIndex: 99,
              display: 'flex',
              flexDirection: 'column-reverse',
              alignItems: 'flex-start',
              gap: 8
            }}>
              {/* Main floating action toggle */}
              <button
                onClick={() => setIsDrawingMenuExpanded(!isDrawingMenuExpanded)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(13, 19, 34, 0.95)',
                  border: '1px solid var(--accent)',
                  color: '#ffffff',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {activeDrawingTool ? '✏️' : '🛠️'}
              </button>

              {/* Expanded tool selection sheet */}
              {isDrawingMenuExpanded && (
                <div style={{
                  background: 'rgba(13, 19, 34, 0.95)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 8,
                  padding: 8,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)'
                }}>
                  {(['trendline', 'horizontal', 'vertical', 'rectangle', 'fibonacci', 'text', 'arrow'] as const).map((tool) => {
                    const active = activeDrawingTool === tool;
                    const label =
                      tool === 'trendline' ? '╱' :
                      tool === 'horizontal' ? '─' :
                      tool === 'vertical' ? '│' :
                      tool === 'rectangle' ? '█' :
                      tool === 'fibonacci' ? 'FIB' :
                      tool === 'text' ? 'TXT' : '▲';
                    
                    return (
                      <button
                        key={tool}
                        onClick={() => {
                          setActiveDrawingTool(active ? null : tool);
                          setIsDrawingMenuExpanded(false); // Auto-hide after selecting
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          fontSize: tool === 'fibonacci' ? 8 : 10,
                          fontWeight: 700,
                          borderRadius: 4,
                          border: '1px solid var(--border-color)',
                          background: active ? 'var(--accent-glow)' : 'var(--bg-primary)',
                          color: active ? 'var(--accent)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                  {/* Cancel/measure and clear buttons */}
                  <button
                    onClick={() => {
                      setActiveDrawingTool(activeDrawingTool === 'measure' ? null : 'measure');
                      setIsDrawingMenuExpanded(false);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 4,
                      border: '1px solid var(--border-color)',
                      background: activeDrawingTool === 'measure' ? 'var(--accent-glow)' : 'var(--bg-primary)',
                      color: activeDrawingTool === 'measure' ? 'var(--accent)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    📏
                  </button>
                  <button
                    onClick={() => {
                      clearActiveDrawings();
                      setIsDrawingMenuExpanded(false);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 4,
                      border: 'none',
                      background: 'rgba(239, 83, 80, 0.2)',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      gridColumn: 'span 4'
                    }}
                  >
                    🗑️ Clear Drawings
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Settings & Templates Panel */}
      {isSettingsOpen && (
        <div style={{
          position: 'absolute',
          top: 42,
          right: 12,
          zIndex: 100,
          width: 320,
          maxHeight: 'calc(100% - 60px)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          boxShadow: 'var(--shadow)',
          padding: 12,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10, color: 'var(--accent)' }}>Settings & Templates</span>
            <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>

          {/* Templates Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 9, color: 'var(--text-secondary)' }}>INDICATOR TEMPLATES</span>
            
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                placeholder="Template Name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '3px 6px',
                  fontSize: 10,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'white',
                  borderRadius: 3
                }}
              />
              <button
                onClick={saveTemplate}
                style={{
                  padding: '3px 8px',
                  fontSize: 10,
                  background: 'var(--accent)',
                  color: 'var(--bg-primary)',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
              {templates.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => applyTemplate(tpl)}
                  style={{
                    padding: '4px 6px',
                    fontSize: 9,
                    textAlign: 'left',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: 3,
                    cursor: 'pointer'
                  }}
                >
                  Load: {tpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Customization Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 9, color: 'var(--text-secondary)' }}>CHART DESIGN & THEME</span>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>Background Color:</span>
              <input
                type="color"
                value={themeBg}
                onChange={(e) => setThemeBg(e.target.value)}
                style={{ width: 40, height: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>Grid Lines Color:</span>
              <input
                type="color"
                value={themeGridColor === 'transparent' ? '#000000' : themeGridColor}
                onChange={(e) => setThemeGridColor(e.target.value)}
                style={{ width: 40, height: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>Crosshair Color:</span>
              <input
                type="color"
                value={themeCrosshairColor}
                onChange={(e) => setThemeCrosshairColor(e.target.value)}
                style={{ width: 40, height: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>Bullish Color:</span>
              <input
                type="color"
                value={themeBullColor}
                onChange={(e) => setThemeBullColor(e.target.value)}
                style={{ width: 40, height: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>Bearish Color:</span>
              <input
                type="color"
                value={themeBearColor}
                onChange={(e) => setThemeBearColor(e.target.value)}
                style={{ width: 40, height: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>Show Watermark:</span>
              <input
                type="checkbox"
                checked={themeWatermarkVisible}
                onChange={(e) => setThemeWatermarkVisible(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          {/* Indicator Parameter Configs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 9, color: 'var(--text-secondary)' }}>INDICATOR PARAMETERS</span>
            
            {/* EMA 20 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>EMA 20 Period:</span>
              <input
                type="number"
                value={activeCell.params.ema20.period}
                onChange={(e) => updateParam('ema20', 'period', parseInt(e.target.value))}
                style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
              />
            </div>

            {/* EMA 50 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>EMA 50 Period:</span>
              <input
                type="number"
                value={activeCell.params.ema50.period}
                onChange={(e) => updateParam('ema50', 'period', parseInt(e.target.value))}
                style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
              />
            </div>

            {/* EMA 200 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
              <span>EMA 200 Period:</span>
              <input
                type="number"
                value={activeCell.params.ema200.period}
                onChange={(e) => updateParam('ema200', 'period', parseInt(e.target.value))}
                style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
              />
            </div>

            {/* Bollinger Bands */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 9 }}>Bollinger Bands:</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Period:</span>
                <input
                  type="number"
                  value={activeCell.params.bb.period}
                  onChange={(e) => updateParam('bb', 'period', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Multiplier:</span>
                <input
                  type="number"
                  step="0.1"
                  value={activeCell.params.bb.multiplier}
                  onChange={(e) => updateParam('bb', 'multiplier', parseFloat(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
            </div>

            {/* RSI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span>RSI Period:</span>
              <input
                type="number"
                value={activeCell.params.rsi.period}
                onChange={(e) => updateParam('rsi', 'period', parseInt(e.target.value))}
                style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
              />
            </div>

            {/* MACD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 9 }}>MACD:</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Fast Period:</span>
                <input
                  type="number"
                  value={activeCell.params.macd.fast}
                  onChange={(e) => updateParam('macd', 'fast', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Slow Period:</span>
                <input
                  type="number"
                  value={activeCell.params.macd.slow}
                  onChange={(e) => updateParam('macd', 'slow', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Signal Period:</span>
                <input
                  type="number"
                  value={activeCell.params.macd.signal}
                  onChange={(e) => updateParam('macd', 'signal', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
            </div>

            {/* ATR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span>ATR Period:</span>
              <input
                type="number"
                value={activeCell.params.atr.period}
                onChange={(e) => updateParam('atr', 'period', parseInt(e.target.value))}
                style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
              />
            </div>

            {/* Stochastic */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 9 }}>Stochastic:</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>%K Period:</span>
                <input
                  type="number"
                  value={activeCell.params.stochastic.kPeriod}
                  onChange={(e) => updateParam('stochastic', 'kPeriod', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>%D Period:</span>
                <input
                  type="number"
                  value={activeCell.params.stochastic.dPeriod}
                  onChange={(e) => updateParam('stochastic', 'dPeriod', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
            </div>

            {/* Ichimoku */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 9 }}>Ichimoku Cloud:</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Tenkan:</span>
                <input
                  type="number"
                  value={activeCell.params.ichimoku.tenkan}
                  onChange={(e) => updateParam('ichimoku', 'tenkan', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Kijun:</span>
                <input
                  type="number"
                  value={activeCell.params.ichimoku.kijun}
                  onChange={(e) => updateParam('ichimoku', 'kijun', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Senkou Span B:</span>
                <input
                  type="number"
                  value={activeCell.params.ichimoku.senkou}
                  onChange={(e) => updateParam('ichimoku', 'senkou', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
            </div>

            {/* SuperTrend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 9 }}>SuperTrend:</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>ATR Period:</span>
                <input
                  type="number"
                  value={activeCell.params.supertrend.period}
                  onChange={(e) => updateParam('supertrend', 'period', parseInt(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span>Multiplier:</span>
                <input
                  type="number"
                  step="0.1"
                  value={activeCell.params.supertrend.multiplier}
                  onChange={(e) => updateParam('supertrend', 'multiplier', parseFloat(e.target.value))}
                  style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
                />
              </div>
            </div>

            {/* ADX */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span>ADX Period:</span>
              <input
                type="number"
                value={activeCell.params.adx.period}
                onChange={(e) => updateParam('adx', 'period', parseInt(e.target.value))}
                style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
              />
            </div>

            {/* Volume Profile */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
              <span>Volume Profile Bins:</span>
              <input
                type="number"
                value={activeCell.params.volProfile.bins}
                onChange={(e) => updateParam('volProfile', 'bins', parseInt(e.target.value))}
                style={{ width: 60, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'white', fontSize: 10, padding: 2 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Chart);
