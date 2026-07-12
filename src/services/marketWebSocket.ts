import { useMarketStore } from '../store/marketStore';
import { useOrderStore } from '../store/orderStore';
import { usePositionStore } from '../store/positionStore';
import { useAppStore } from '../store/appStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { WSEvent } from '../types';
import { candleEngine } from './candleEngine';
import { MarketSessionService } from './marketSessionService';
import { getApiUrl } from './config';

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export function parseTimestampToSeconds(time: any): number {
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
  if (typeof time === 'object') {
    if (time.timestamp !== undefined) {
      return parseTimestampToSeconds(time.timestamp);
    }
    if (time.time !== undefined) {
      return parseTimestampToSeconds(time.time);
    }
    if (typeof time.getTime === 'function') {
      return Math.floor(time.getTime() / 1000);
    }
    if (time.year !== undefined && time.month !== undefined && time.day !== undefined) {
      const d = new Date(Date.UTC(time.year, time.month - 1, time.day));
      return Math.floor(d.getTime() / 1000);
    }
  }
  throw new Error(`Unparseable timestamp: ${JSON.stringify(time)}`);
}

function validateAndCleanCandle(candle: any): any {
  if (!candle || typeof candle !== 'object') {
    throw new Error("Candle is not an object");
  }
  const ts = candle.timestamp !== undefined ? candle.timestamp : candle.time;
  const seconds = parseTimestampToSeconds(ts);
  const open = Number(candle.open);
  const high = Number(candle.high);
  const low = Number(candle.low);
  const close = Number(candle.close);
  const volume = candle.volume !== undefined ? Number(candle.volume) : 0;

  if (isNaN(seconds) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
    throw new Error("Candle values are NaN");
  }
  if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
    throw new Error("Candle prices must be greater than zero");
  }
  if (low > high || open > high || close > high || open < low || close < low) {
    throw new Error(`Candle high/low boundaries are invalid: open=${open}, high=${high}, low=${low}, close=${close}`);
  }

  return {
    timestamp: seconds * 1000, // store in milliseconds to match the marketStore cache expectation
    open,
    high,
    low,
    close,
    volume
  };
}

function validateAndCleanPriceTick(data: any): any {
  if (!data || typeof data !== 'object') {
    throw new Error("Tick data is not an object");
  }
  if (typeof data.symbol !== 'string' || !data.symbol) {
    throw new Error("Tick symbol is invalid");
  }
  const price = Number(data.price);
  if (isNaN(price) || price <= 0) {
    throw new Error("Tick price is invalid");
  }
  const ts = data.timestamp !== undefined ? data.timestamp : data.time;
  const seconds = parseTimestampToSeconds(ts);

  return {
    symbol: data.symbol.toUpperCase(),
    price,
    timestamp: seconds * 1000, // store in milliseconds to match marketStore expectation
    is_delayed: !!data.is_delayed
  };
}

class MarketWebSocket {
  private url: string;
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private maxBackoff = 30000;
  private reconnectTimeout?: any;

  private heartbeatInterval?: any;
  private pongTimeout?: any;
  private readonly heartbeatPeriod = 30000;
  private readonly pongPeriod = 10000;

  private processedEventIds: string[] = [];
  private subscriptions: Set<string> = new Set(); // "symbol|timeframe"
  private tickQueue: { symbol: string; price: number; timestamp: number; isDelayed?: boolean }[] = [];
  private batchInterval?: any;

  /**
   * When true the next onclose event is intentional (cleanup/reconnect was
   * called deliberately) and should NOT trigger scheduleReconnect.
   */
  private _intentionalClose = false;

  constructor(url: string) {
    this.url = url;
    // Do NOT call connect() here.
    // The useMarketWebSocket hook is the sole driver of connection lifecycle.
  }

  private setStatus(status: ConnectionStatus) {
    useMarketStore.getState().setConnectionStatus(status);
    useMarketStore.getState().setRealMarketConnectionStatus(status);
  }

  connect() {
    this.startBatchLoop();
    const token = useAppStore.getState().token;
    if (!token) {
      this.setStatus('disconnected');
      return;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        return;
      }
      this.cleanup();
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    this._intentionalClose = false;
    this.setStatus('connecting');
    const wsUrl = `${this.url}?token=${encodeURIComponent(token)}`;
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        try {
          this.reconnectAttempts = 0;
          this.setStatus('connected');

          useAppStore.getState().syncState().catch((err) => {
            console.error('Failed to sync state on WebSocket open:', err);
          });

          this.startHeartbeat();
          this.subscriptions.forEach((sub) => {
            try { this.sendSubscribe(sub); } catch (e) { /* ignore */ }
          });
        } catch (err) {
          console.error('Error in ws.onopen handler:', err);
        }
      };

      this.ws.onmessage = (ev) => {
        try {
          const stats = useMarketStore.getState();
          useMarketStore.getState().updateFeedStats({
            packetsReceived: stats.packetsReceived + 1,
          });

          const payload: WSEvent = JSON.parse(ev.data);

          // Heartbeat pong
          if ((payload.type as any) === 'pong') {
            if (this.pongTimeout) {
              clearTimeout(this.pongTimeout);
              this.pongTimeout = undefined;
            }
            if (payload.event_id && payload.event_id.startsWith('ping-')) {
              const pingTime = parseInt(payload.event_id.substring(5), 10);
              if (!isNaN(pingTime)) {
                const latency = Date.now() - pingTime;
                let quality = 'Excellent';
                if (latency > 300) quality = 'Poor';
                else if (latency > 150) quality = 'Fair';
                else if (latency > 50) quality = 'Good';

                useMarketStore.getState().updateFeedStats({
                  latency,
                  connectionQuality: quality,
                });
              }
            }
            return;
          }

          // Missed packet detection: if a packet timestamp is significantly old (latency > 5 seconds), log a lost packet
          if (payload.timestamp) {
            const transitTime = Date.now() - payload.timestamp;
            if (transitTime > 5000) {
              const currentStats = useMarketStore.getState();
              useMarketStore.getState().updateFeedStats({
                lostPackets: currentStats.lostPackets + 1,
              });
            }
          }

          // Idempotency check
          if (payload.event_id) {
            if (this.processedEventIds.includes(payload.event_id)) return;
            this.processedEventIds.push(payload.event_id);
            if (this.processedEventIds.length > 100) this.processedEventIds.shift();
          }

          if (payload.type === 'market_candle') {
            const { symbol, timeframe, data } = payload;
            if (symbol && timeframe) {
              const sym = symbol.toUpperCase();
              if (!MarketSessionService.isOpen(sym)) return;

              let cleanedCandle;
              try {
                cleanedCandle = validateAndCleanCandle(data);
              } catch (e: any) {
                console.warn(`Rejected malformed WebSocket candle: ${e.message}`, data);
                return;
              }

              candleEngine.addCandle(sym, timeframe, cleanedCandle);
              useMarketStore.getState().updatePrice(sym, cleanedCandle.close, cleanedCandle.timestamp);
              useMarketPriceStore.getState().updatePrice(sym, { currentPrice: cleanedCandle.close, timestamp: cleanedCandle.timestamp });
            }
          } else if (
            payload.type === 'order_created' ||
            payload.type === 'order_updated' ||
            payload.type === 'order_rejected'
          ) {
            const order = payload.data;
            const { orders } = useOrderStore.getState();
            const exists = orders.some((o) => o.id === order.id);
            if (exists) {
              useOrderStore.getState().updateOrder(order);
            } else {
              useOrderStore.getState().addOrder(order);
            }

            if (payload.type === 'order_rejected') {
              useAppStore.getState().addToast('error', `Order rejected: ${order.symbol} ${order.side?.toUpperCase()}`);
            } else if (order.status === 'FILLED') {
              useAppStore.getState().addToast('success', `Order filled: ${order.side?.toUpperCase()} ${order.quantity} ${order.symbol}`);
            } else if (order.status === 'PENDING') {
              useAppStore.getState().addToast('info', `Order pending: ${order.side?.toUpperCase()} ${order.quantity} ${order.symbol}`);
            }
          } else if (payload.type === 'position_update') {
            const position = payload.data;
            const prevPosition = usePositionStore.getState().positions.find((p) => p.symbol === position.symbol);
            usePositionStore.getState().updatePosition(position);
            
            if (position.quantity === 0 && prevPosition && prevPosition.quantity !== 0) {
              const livePrice = useMarketStore.getState().prices[position.symbol]?.price ?? prevPosition.average_price;
              const sl = prevPosition.stop_loss;
              const tp = prevPosition.take_profit;
              
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
              
              if (sl && Math.abs(livePrice - sl) < (sl * 0.0015)) {
                useAppStore.getState().addToast('error', `🔴 SL Hit: Position closed for ${position.symbol} at ${livePrice.toFixed(getPrecision(position.symbol))}`);
              } else if (tp && Math.abs(livePrice - tp) < (tp * 0.0015)) {
                useAppStore.getState().addToast('success', `🟢 TP Hit: Position closed for ${position.symbol} at ${livePrice.toFixed(getPrecision(position.symbol))}`);
              } else {
                useAppStore.getState().addToast('info', `Position closed: ${position.symbol}`);
              }
            }
          } else if (payload.type === 'account_update') {
            const acc = payload.data;
            useAppStore.getState().setAccount(acc);
            
            // Check for Margin Warning
            if (acc.margin_used > 0) {
              const marginLevel = (acc.equity / acc.margin_used) * 100;
              if (marginLevel < 120) {
                useAppStore.getState().addToast('error', `⚠️ Margin Warning! Margin Level is ${marginLevel.toFixed(1)}%`);
              }
            }
          } else if ((payload.type as string) === 'trade_closed') {
            useAppStore.getState().addTradeHistory(payload.data);
          } else if ((payload.type as string) === 'market_tick' || (payload.type as string) === 'price_update') {
            let cleanedTick;
            try {
              cleanedTick = validateAndCleanPriceTick(payload.data);
            } catch (e: any) {
              console.warn(`Rejected malformed WebSocket tick: ${e.message}`, payload.data);
              return;
            }

            const { symbol, price, timestamp, is_delayed } = cleanedTick;
            const existingIndex = this.tickQueue.findIndex(t => t.symbol === symbol);
            if (existingIndex !== -1) {
              if (timestamp >= this.tickQueue[existingIndex].timestamp) {
                this.tickQueue[existingIndex] = { symbol, price, timestamp, isDelayed: is_delayed };
              }
            } else {
              this.tickQueue.push({ symbol, price, timestamp, isDelayed: is_delayed });
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = (ev) => {
        try {
          this.stopHeartbeat();
          this.detachHandlers();
          this.ws = undefined;
          this.setStatus('disconnected');

          if (ev && ev.code === 1008) {
            useAppStore.getState().logout();
            return;
          }

          // Only auto-reconnect when the close was NOT intentional
          if (!this._intentionalClose) {
            this.scheduleReconnect();
          }
          this._intentionalClose = false;
        } catch (err) {
          console.error('Error in ws.onclose handler:', err);
        }
      };

      this.ws.onerror = () => {
        // onerror is always followed by onclose – let onclose drive reconnect.
        console.error('WebSocket error occurred');
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect();
    }
  }

  private detachHandlers() {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = undefined;
    }
  }

  private startBatchLoop() {
    if (this.batchInterval) return;
    this.batchInterval = setInterval(() => {
      if (this.tickQueue.length === 0) return;
      const batch = [...this.tickQueue];
      this.tickQueue = [];
      useMarketStore.getState().batchUpdatePrices(batch);
      
      batch.forEach((upd) => {
        if (MarketSessionService.isOpen(upd.symbol)) {
          candleEngine.addTick(upd.symbol, upd.price, upd.timestamp);
          useMarketPriceStore.getState().updatePrice(upd.symbol, {
            currentPrice: upd.price,
            timestamp: upd.timestamp
          });
        }
      });
    }, 33);
  }

  private stopBatchLoop() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
      this.batchInterval = undefined;
    }
  }

  private cleanup() {
    this.stopBatchLoop();
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    if (this.ws) {
      this._intentionalClose = true;  // suppress onclose → scheduleReconnect
      this.detachHandlers();
      try {
        if (
          this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING
        ) {
          this.ws.close();
        }
      } catch (e) {
        console.error('Error closing WebSocket in cleanup:', e);
      }
      this.ws = undefined;
    }
  }

  private scheduleReconnect() {
    const token = useAppStore.getState().token;
    if (!token) return;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts += 1;
    // stop after max attempts to prevent infinite retries
    const maxAttempts = 10;
    if (this.reconnectAttempts > maxAttempts) {
      console.warn('Maximum WebSocket reconnection attempts reached. Giving up.');
      this.setStatus('disconnected');
      return;
    }
    const backoff = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxBackoff);
    this.setStatus('reconnecting');
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = undefined;
      this.connect();
    }, backoff);
  }

  private sendPayload(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        const stats = useMarketStore.getState();
        useMarketStore.getState().updateFeedStats({
          packetsSent: stats.packetsSent + 1,
        });
      } catch (err) {
        console.error('Failed to send payload:', err);
      }
    }
  }

  reconnect() {
    this.cleanup();
    this.connect();
  }

  disconnect() {
    this.cleanup();
    this.setStatus('disconnected');
  }

  private startHeartbeat() {
    this.stopHeartbeat(); // ensure no duplicate intervals
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendPayload({ type: 'ping', event_id: 'ping-' + Date.now() });

        this.pongTimeout = setTimeout(() => {
          console.warn('Heartbeat pong timed out. Closing WebSocket.');
          const stats = useMarketStore.getState();
          useMarketStore.getState().updateFeedStats({
            lostPackets: stats.lostPackets + 1,
          });
          try {
            if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
              this.ws.close();
            }
          } catch (e) {
            console.error('Failed to close WebSocket on pong timeout:', e);
          }
        }, this.pongPeriod);
      }
    }, this.heartbeatPeriod);
  }

  private makeSubKey(symbol: string, timeframe: string) {
    return `${symbol}|${timeframe}`;
  }

  private sendSubscribe(key: string) {
    const [symbol, timeframe] = key.split('|');
    this.sendPayload({ type: 'subscribe', symbol, timeframe });
  }

  private sendUnsubscribe(key: string) {
    const [symbol, timeframe] = key.split('|');
    this.sendPayload({ type: 'unsubscribe', symbol, timeframe });
  }

  subscribe(symbol: string, timeframe: string) {
    const key = this.makeSubKey(symbol, timeframe);
    if (!this.subscriptions.has(key)) {
      this.subscriptions.add(key);
      this.sendSubscribe(key); // no-op if socket not open yet; onopen replays all
    }
  }

  unsubscribe(symbol: string, timeframe: string) {
    const key = this.makeSubKey(symbol, timeframe);
    if (this.subscriptions.has(key)) {
      this.subscriptions.delete(key);
      this.sendUnsubscribe(key);
    }
  }
}

const getWsUrl = () => {
  const api = getApiUrl();
  const wsBase = api.replace('http://', 'ws://').replace('https://', 'wss://');
  return `${wsBase}/ws/market`;
};

export const marketWebSocket = new MarketWebSocket(getWsUrl());
