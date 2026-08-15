// src/hooks/useMarketWebSocket.ts
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import { useMarketStore } from '../store/marketStore';
import { marketWebSocket } from '../services/marketWebSocket';
import { goldApi } from '../services/goldApi';

/**
 * Drives the WebSocket connection lifecycle.
 *
 * Rules:
 *  - Connect once when a valid token is present.
 *  - Reconnect when the token changes (e.g. logout → login).
 *  - Disconnect cleanly on logout (token becomes null).
 *  - Subscribe / unsubscribe when the selected instrument changes.
 */
export const useMarketWebSocket = () => {
  const token = useAppStore((s) => s.token);
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const timeframe = useMarketStore((s) => s.timeframe || '1m');
  const connectionStatus = useMarketStore((s) => s.connectionStatus);

  const prevKeyRef = useRef<string | null>(null);
  // Track whether we already initiated a connection for this token value
  const connectedTokenRef = useRef<string | null>(null);

  // ── Connection lifecycle ────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      useAppStore.getState().addToast('info', 'Network connection restored. Reconnecting to data feeds...');
      marketWebSocket.reconnect();
    };
    
    const handleOffline = () => {
      useAppStore.getState().addToast('error', 'Network connection lost. You are currently offline.');
      useMarketStore.getState().setConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!token) {
      connectedTokenRef.current = null;
      try {
        marketWebSocket.disconnect();
      } catch (err) {
        console.error('useMarketWebSocket: disconnect() threw:', err);
      }
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    if (connectedTokenRef.current !== token) {
      connectedTokenRef.current = token;
      try {
        marketWebSocket.reconnect();
      } catch (err) {
        console.error('useMarketWebSocket: reconnect() threw:', err);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  // ── Subscription management ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedInstrument || !token) return;

    const symbol = selectedInstrument.symbol;
    const norm = symbol.toUpperCase();
    const isRealMarket = norm === 'XAUUSD' || norm === 'XAGUSD';
    const key = `${symbol}|${timeframe}`;

    // Update feed stats dynamically depending on instrument category
    let feedSource = 'Binance WebSocket';
    let fallbackSource = 'Coinbase Feed';
    
    if (isRealMarket) {
      feedSource = 'GoldAPI.io (via WS)';
      fallbackSource = 'Yahoo Finance REST';
    } else if (selectedInstrument.category === 'forex') {
      feedSource = 'OANDA Forex';
      fallbackSource = 'TwelveData';
    } else if (selectedInstrument.category === 'indices' || selectedInstrument.category === 'metals') {
      feedSource = 'Polygon.io';
      fallbackSource = 'AlphaVantage';
    }
    
    useMarketStore.getState().updateFeedStats({
      feedSource,
      fallbackSource,
      lostPackets: Math.random() > 0.85 ? 1 : 0, // mock rare packet loss
      connectionQuality: 'Excellent'
    });

    // Unsubscribe from the previous key if it changed
    if (prevKeyRef.current && prevKeyRef.current !== key) {
      const [prevSymbol, prevTf] = prevKeyRef.current.split('|');
      
      try {
        marketWebSocket.unsubscribe(prevSymbol, prevTf);
      } catch { /* ignore */ }
    }

    try {
      marketWebSocket.subscribe(symbol, timeframe);
    } catch { /* ignore */ }
    
    prevKeyRef.current = key;

    return () => {
      try {
        const [sym, tf] = key.split('|');
        marketWebSocket.unsubscribe(sym, tf);
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstrument?.symbol, timeframe, token]);

  return { status: connectionStatus };
};
