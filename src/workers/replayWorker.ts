// src/workers/replayWorker.ts

export interface ReplayWorkerCandle {
  index: number;
  timestamp: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  cvd: number;
  vwap: number;
  footprint?: any[];
}

export interface ReplayWorkerMessage {
  type: 'LOAD_DATA' | 'PLAY' | 'PAUSE' | 'STEP_FORWARD' | 'STEP_BACKWARD' | 'SEEK' | 'SET_SPEED';
  candles?: ReplayWorkerCandle[];
  index?: number;
  dateStr?: string;
  speedMultiplier?: number;
}

const workerSelf: Worker = self as any;

let candlesCache: ReplayWorkerCandle[] = [];
let currentIndex = 0;
let isPlaying = false;
let speedMultiplier = 1;
let playbackTimer: any = null;

function calculateDomDepth(price: number) {
  const step = 0.5;
  const bids: [number, number][] = [];
  const asks: [number, number][] = [];

  for (let i = 1; i <= 10; i++) {
    const bidP = parseFloat((price - i * step).toFixed(2));
    const askP = parseFloat((price + i * step).toFixed(2));
    const bidVol = Math.floor(Math.random() * 80 + 10);
    const askVol = Math.floor(Math.random() * 80 + 10);
    bids.push([bidP, bidVol]);
    asks.push([askP, askVol]);
  }

  return { bids, asks };
}

function broadcastStep() {
  if (candlesCache.length === 0) return;

  if (currentIndex >= candlesCache.length) {
    currentIndex = candlesCache.length - 1;
    pausePlayback();
  }

  if (currentIndex < 0) currentIndex = 0;

  const currentCandle = candlesCache[currentIndex];
  const domDepth = calculateDomDepth(currentCandle.close);

  workerSelf.postMessage({
    type: 'TICK_UPDATE',
    currentIndex,
    totalCandles: candlesCache.length,
    currentCandle,
    domDepth,
    isPlaying,
  });
}

function startPlayback() {
  if (playbackTimer) clearInterval(playbackTimer);
  isPlaying = true;

  const baseIntervalMs = 1000;
  const intervalMs = Math.max(10, Math.floor(baseIntervalMs / speedMultiplier));

  playbackTimer = setInterval(() => {
    if (!isPlaying) return;

    if (currentIndex < candlesCache.length - 1) {
      currentIndex++;
      broadcastStep();
    } else {
      pausePlayback();
    }
  }, intervalMs);
}

function pausePlayback() {
  isPlaying = false;
  if (playbackTimer) {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }
  broadcastStep();
}

workerSelf.onmessage = (e: MessageEvent<ReplayWorkerMessage>) => {
  const { type, candles, index, dateStr, speedMultiplier: mult } = e.data;

  switch (type) {
    case 'LOAD_DATA':
      if (candles) {
        candlesCache = candles;
        currentIndex = 0;
        broadcastStep();
      }
      break;

    case 'PLAY':
      startPlayback();
      break;

    case 'PAUSE':
      pausePlayback();
      break;

    case 'STEP_FORWARD':
      if (currentIndex < candlesCache.length - 1) {
        currentIndex++;
        broadcastStep();
      }
      break;

    case 'STEP_BACKWARD':
      if (currentIndex > 0) {
        currentIndex--;
        broadcastStep();
      }
      break;

    case 'SEEK':
      if (typeof index === 'number') {
        currentIndex = Math.max(0, Math.min(candlesCache.length - 1, index));
        broadcastStep();
      } else if (dateStr) {
        const targetTs = new Date(dateStr).getTime() / 1000;
        let closestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < candlesCache.length; i++) {
          const diff = Math.abs(candlesCache[i].time - targetTs);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        }
        currentIndex = closestIdx;
        broadcastStep();
      }
      break;

    case 'SET_SPEED':
      if (mult) {
        speedMultiplier = mult;
        if (isPlaying) {
          startPlayback();
        }
      }
      break;
  }
};

export {};
