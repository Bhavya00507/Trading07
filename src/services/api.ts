import { useAppStore } from '../store/appStore';
import { usePositionStore } from '../store/positionStore';
import { goldApi } from './goldApi';
// Re-export from zero-dependency config module (breaks circular dep with appStore)
export { getApiUrl } from './config';
import { getApiUrl } from './config';

const API_BASE = getApiUrl();

const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
  const method = options?.method || 'GET';
  const payload = options?.body ? String(options.body) : '';
  // console.log(`[API Request] ${method} ${url}`, payload ? `Payload: ${payload}` : '');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
      if (options.signal.aborted) {
        controller.abort();
      }
    }
    
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);

    // console.log(`[API Response] ${res.status} ${url}`);

    if (res.status === 401) {
      useAppStore.getState().logout();
      return res;
    }

    if (!res.ok) {
      if (res.status >= 500 && retries > 0) {
        console.warn(`[API Retry] 5xx Server Error (${res.status}). Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 1.5);
      }
      return res; // Do not retry 4xx client errors
    }
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request Timeout: The server took too long to respond.');
    }
    
    const isNetworkError = err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network');
    if (isNetworkError && retries > 0) {
      console.warn(`[API Retry] Network Error. Retrying...`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    
    const msg = err.message || '';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
      throw new Error('Network Unavailable: Backend unreachable. Verify the server is online and CORS is configured.');
    }
    throw err;
  }
};

const getHeaders = () => {
  const token = useAppStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const getOrders = async () => {
  const res = await fetchWithRetry(`${API_BASE}/orders`, { headers: getHeaders() });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to fetch orders';
    throw new Error(message);
  }
  return res.json();
};

export const getPositions = async () => {
  const res = await fetchWithRetry(`${API_BASE}/positions`, { headers: getHeaders() });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to fetch positions';
    throw new Error(message);
  }
  return res.json();
};

export const getTradeHistory = async () => {
  const res = await fetchWithRetry(`${API_BASE}/history`, { headers: getHeaders() });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to fetch trade history';
    throw new Error(message);
  }
  return res.json();
};

export const placeOrder = async (order: any) => {
  const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
  
  const normalizedOrder: any = {
    symbol: order.symbol,
    side: String(order.side).toLowerCase(),
    type: String(order.type || order.order_type || 'market').toLowerCase(),
    quantity: Number(order.quantity),
    price: order.price !== undefined && order.price !== null ? Number(order.price) : null,
    stop_price: order.stop_price !== undefined && order.stop_price !== null ? Number(order.stop_price) : null,
    stop_loss: order.stop_loss !== undefined && order.stop_loss !== null ? Number(order.stop_loss) : null,
    take_profit: order.take_profit !== undefined && order.take_profit !== null ? Number(order.take_profit) : null,
    is_reduce_only: order.is_reduce_only || false,
    is_post_only: order.is_post_only || false,
    time_in_force: order.time_in_force || "GTC",
  };

  const orderWithAccount = { ...normalizedOrder, account_type: activeAccountType };
  
  // Optimistic position update for Market orders
  const posStore = usePositionStore.getState();
  const oldPositions = [...posStore.positions];
  if (normalizedOrder.type === 'market') {
    const existing = posStore.positions.find(p => p.symbol === normalizedOrder.symbol);
    const qtySign = normalizedOrder.side === 'buy' ? 1 : -1;
    const addedQty = normalizedOrder.quantity * qtySign;
    
    let updatedPositions: any[];
    if (existing) {
      updatedPositions = posStore.positions.map(p => 
        p.symbol === normalizedOrder.symbol 
          ? { ...p, quantity: p.quantity + addedQty, isOptimistic: true }
          : p
      );
    } else {
      updatedPositions = [
        ...posStore.positions,
        {
          id: 'opt-' + Math.random(),
          symbol: normalizedOrder.symbol,
          quantity: addedQty,
          average_price: order.price || 0,
          unrealized_pnl: 0,
          realized_pnl: 0,
          stop_loss: normalizedOrder.stop_loss,
          take_profit: normalizedOrder.take_profit,
          account_type: activeAccountType,
          isOptimistic: true
        }
      ];
    }
    posStore.setPositions(updatedPositions);
  }

  try {
    const res = await fetchWithRetry(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(orderWithAccount),
    });

    const resClone = res.clone();
    const resText = await resClone.text();

    if (!res.ok) {
      let message = 'Failed to place order';
      try {
        const errorData = JSON.parse(resText);
        message = errorData.error || errorData.detail?.message || errorData.detail || message;
      } catch {}
      throw new Error(message);
    }
    return JSON.parse(resText);
  } catch (err) {
    if (normalizedOrder.type === 'market') {
      posStore.setPositions(oldPositions);
    }
    throw err;
  }
};

export const cancelOrder = async (orderId: string) => {
  const res = await fetchWithRetry(`${API_BASE}/orders/${orderId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to cancel order';
    throw new Error(message);
  }
  return res.json();
};

const activeMarketCandlesPromises = new Map<string, Promise<any>>();

export const getMarketCandles = async (symbol: string, timeframe: string = '1m', limit = 1000, before?: number, after?: number) => {
  const norm = symbol.toUpperCase();
  const requestKey = `${norm}|${timeframe}|${limit}|${before || ''}|${after || ''}`;

  const existingPromise = activeMarketCandlesPromises.get(requestKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    try {
      if (norm === 'XAUUSD' || norm === 'XAGUSD') {
        const data = await goldApi.getCandles(symbol, timeframe, limit, before);
        return data;
      }
      let url = `${API_BASE}/market/candles?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
      if (before) url += `&before=${before}`;
      if (after) url += `&after=${after}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch market candles');
      const data = await res.json();
      return data;
    } finally {
      activeMarketCandlesPromises.delete(requestKey);
    }
  })();

  activeMarketCandlesPromises.set(requestKey, promise);
  return promise;
};

export const getSyncState = async () => {
  const res = await fetchWithRetry(`${API_BASE}/sync-state`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch sync state');
  return res.json();
};

export const modifySLTP = async (symbol: string, stopLoss?: number | null, takeProfit?: number | null, positionId?: string) => {
  const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
  const res = await fetchWithRetry(`${API_BASE}/positions/modify-sltp`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ symbol, stop_loss: stopLoss, take_profit: takeProfit, position_id: positionId, account_type: activeAccountType }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to modify TP/SL';
    throw new Error(message);
  }
  return res.json();
};

export const modifyTrailingStop = async (symbol: string, distance?: number | null, positionId?: string) => {
  const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
  const res = await fetchWithRetry(`${API_BASE}/positions/trailing-stop`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ symbol, distance, position_id: positionId, account_type: activeAccountType }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to modify trailing stop';
    throw new Error(message);
  }
  return res.json();
};

export const partialClose = async (symbol: string, quantity: number, positionId?: string) => {
  const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
  const res = await fetchWithRetry(`${API_BASE}/positions/partial-close`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ symbol, quantity, position_id: positionId, account_type: activeAccountType }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to execute partial close';
    throw new Error(message);
  }
  return res.json();
};

export const closeSymbol = async (symbol: string, positionId?: string, accountType: string = useAppStore.getState().activeAccountType || 'paper') => {
  // Optimistic update
  const posStore = usePositionStore.getState();
  const oldPositions = [...posStore.positions];
  
  const updated = posStore.positions.map(p => 
    (p.symbol === symbol && (!positionId || p.id === positionId)) ? { ...p, quantity: 0 } : p
  );
  posStore.setPositions(updated);

  try {
    const res = await fetchWithRetry(`${API_BASE}/positions/close-symbol`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ symbol, position_id: positionId, account_type: accountType }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to close position by symbol';
      throw new Error(message);
    }
    return res.json();
  } catch (err) {
    posStore.setPositions(oldPositions);
    throw err;
  }
};

export const closeAllPositions = async (accountType: string = useAppStore.getState().activeAccountType || 'paper') => {
  // Optimistic update
  const posStore = usePositionStore.getState();
  const oldPositions = [...posStore.positions];
  
  const updated = posStore.positions.map(p => ({ ...p, quantity: 0 }));
  posStore.setPositions(updated);

  try {
    const res = await fetchWithRetry(`${API_BASE}/positions/close-all?account_type=${accountType}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to close all positions';
      throw new Error(message);
    }
    return res.json();
  } catch (err) {
    posStore.setPositions(oldPositions);
    throw err;
  }
};

export const reversePosition = async (symbol: string, positionId?: string) => {
  const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
  // Optimistic update
  const posStore = usePositionStore.getState();
  const oldPositions = [...posStore.positions];
  
  const updated = posStore.positions.map(p => 
    (p.symbol === symbol && (!positionId || p.id === positionId)) ? { ...p, quantity: -p.quantity } : p
  );
  posStore.setPositions(updated);

  try {
    const res = await fetchWithRetry(`${API_BASE}/positions/reverse`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ symbol, position_id: positionId, account_type: activeAccountType }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to reverse position';
      throw new Error(message);
    }
    return res.json();
  } catch (err) {
    posStore.setPositions(oldPositions);
    throw err;
  }
};

export const breakEven = async (symbol: string, positionId?: string) => {
  const activeAccountType = useAppStore.getState().activeAccountType || 'paper';
  const res = await fetchWithRetry(`${API_BASE}/positions/break-even`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ symbol, position_id: positionId, account_type: activeAccountType }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to set break even';
    throw new Error(message);
  }
  return res.json();
};

export const modifyOrder = async (orderId: string, updates: any) => {
  const res = await fetchWithRetry(`${API_BASE}/orders/${orderId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error || errorData.detail?.message || errorData.detail || 'Failed to modify order';
    throw new Error(message);
  }
  return res.json();
};

export const getMarketNews = async () => {
  const res = await fetchWithRetry(`${API_BASE}/market/news`);
  if (!res.ok) throw new Error('Failed to fetch market news');
  return res.json();
};

export const getMarketCalendar = async () => {
  const res = await fetchWithRetry(`${API_BASE}/market/calendar`);
  if (!res.ok) throw new Error('Failed to fetch economic calendar');
  return res.json();
};
