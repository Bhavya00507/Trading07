import React, { useEffect, useState, Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store/appStore';
import { useMarketWebSocket } from './hooks/useMarketWebSocket';
import { initializeNotificationService } from './services/notifications';
import { useAutomationStore } from './store/automationStore';
import { placeOrder, cancelOrder, modifySLTP } from './services/api';
import { marketWebSocket } from './services/marketWebSocket';
import { useOrderStore } from './store/orderStore';
import { usePositionStore } from './store/positionStore';
import './App.css';

const Chart = React.lazy(() => import('./components/Chart'));
const Watchlist = React.lazy(() => import('./components/Watchlist'));
const OrderPanel = React.lazy(() => import('./components/OrderPanel'));
const BottomPanel = React.lazy(() => import('./components/BottomPanel'));
const Header = React.lazy(() => import('./components/Header'));
const Auth = React.lazy(() => import('./components/Auth'));
const CommandPalette = React.lazy(() => import('./components/CommandPalette'));
const StatusBar = React.lazy(() => import('./components/StatusBar'));
const MobileLayout = React.lazy(() => import('./components/MobileLayout').then(m => ({ default: m.MobileLayout })));

const PanelFallback: React.FC<{ name: string }> = ({ name }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: 'var(--danger)', fontSize: 11,
    fontFamily: 'var(--font-sans)', flexDirection: 'column', gap: 4,
  }}>
    <span>⚠</span>
    <span>{name} failed to render</span>
  </div>
);

const App: React.FC = () => {
  const token = useAppStore((s) => s.token);
  const syncState = useAppStore((s) => s.syncState);
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Layout States with LocalStorage persistence
  const [isWatchlistOpen, setWatchlistOpen] = useState(() => {
    const saved = localStorage.getItem('layout-watchlist-open');
    return saved !== null ? saved === 'true' : true;
  });

  const [isOrderPanelOpen, setOrderPanelOpen] = useState(() => {
    const saved = localStorage.getItem('layout-order-open');
    return saved !== null ? saved === 'true' : true;
  });

  const [isBottomOpen, setBottomOpen] = useState(() => {
    const saved = localStorage.getItem('layout-bottom-open');
    return saved !== null ? saved === 'true' : true;
  });

  const [isFullscreenChart, setFullscreenChart] = useState(() => {
    const saved = localStorage.getItem('layout-fullscreen-chart');
    return saved !== null ? saved === 'true' : false;
  });

  const [watchlistWidth, setWatchlistWidth] = useState(() => {
    const saved = localStorage.getItem('layout-watchlist-width');
    return saved ? parseInt(saved) : 260;
  });

  const [orderPanelWidth, setOrderPanelWidth] = useState(() => {
    const saved = localStorage.getItem('layout-order-width');
    return saved ? parseInt(saved) : 280;
  });

  const [bottomHeight, setBottomHeight] = useState(() => {
    const saved = localStorage.getItem('layout-bottom-height');
    return saved ? parseInt(saved) : 280;
  });

  // Sync Layout choices in LocalStorage
  useEffect(() => {
    localStorage.setItem('layout-watchlist-open', isWatchlistOpen.toString());
  }, [isWatchlistOpen]);

  useEffect(() => {
    localStorage.setItem('layout-order-open', isOrderPanelOpen.toString());
  }, [isOrderPanelOpen]);

  useEffect(() => {
    localStorage.setItem('layout-bottom-open', isBottomOpen.toString());
  }, [isBottomOpen]);

  useEffect(() => {
    localStorage.setItem('layout-fullscreen-chart', isFullscreenChart.toString());
  }, [isFullscreenChart]);

  useEffect(() => {
    localStorage.setItem('layout-watchlist-width', watchlistWidth.toString());
  }, [watchlistWidth]);

  useEffect(() => {
    localStorage.setItem('layout-order-width', orderPanelWidth.toString());
  }, [orderPanelWidth]);

  useEffect(() => {
    localStorage.setItem('layout-bottom-height', bottomHeight.toString());
  }, [bottomHeight]);

  // Command palette tab navigation triggers automatic expansion
  useEffect(() => {
    const handleExpand = () => {
      setBottomOpen(true);
      setFullscreenChart(false);
    };
    window.addEventListener('expand-bottom-panel', handleExpand);
    return () => window.removeEventListener('expand-bottom-panel', handleExpand);
  }, []);

  // ── Global Hotkeys Keyboard Shortcuts ─────────────────────────────
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.getAttribute('contenteditable') === 'true'
      );
      if (isInput) return;

      const selected = useAppStore.getState().selectedInstrument;

      // Ctrl+1: Switch to Positions Tab
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'positions' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // Ctrl+2: Switch to Orders Tab
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'orders' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // Ctrl+3: Switch to History Tab
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'history' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // F1: Switch to Settings Tab
      if (e.key === 'F1') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'settings' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // F2: Modify active position SL/TP
      if (e.key === 'F2') {
        e.preventDefault();
        if (selected) {
          const activePos = usePositionStore.getState().positions.find(p => p.symbol === selected.symbol);
          if (activePos) {
            const slInput = prompt(`Modify Stop Loss (price) for ${selected.symbol}:`, activePos.stop_loss?.toString() || '');
            const tpInput = prompt(`Modify Take Profit (price) for ${selected.symbol}:`, activePos.take_profit?.toString() || '');
            if (slInput !== null || tpInput !== null) {
              const slVal = slInput ? parseFloat(slInput) : null;
              const tpVal = tpInput ? parseFloat(tpInput) : null;
              modifySLTP(selected.symbol, slVal, tpVal)
                .then(() => useAppStore.getState().addToast('success', `SL/TP updated for ${selected.symbol}`))
                .catch((err) => useAppStore.getState().addToast('error', err.message || 'Failed to modify SL/TP'));
            }
          } else {
            useAppStore.getState().addToast('info', `No active position found for ${selected.symbol} to modify`);
          }
        }
      }

      // F5: System Sync & WS Reconnection
      if (e.key === 'F5') {
        e.preventDefault();
        useAppStore.getState().addToast('info', 'Forcing system synchronization...');
        marketWebSocket.reconnect();
        useAppStore.getState().syncState()
          .then(() => useAppStore.getState().addToast('success', 'System data synchronized successfully.'))
          .catch((err) => useAppStore.getState().addToast('error', 'Sync failed. Check connection quality.'));
      }

      // F9: Toggle Order entry panel
      if (e.key === 'F9') {
        e.preventDefault();
        setOrderPanelOpen(prev => !prev);
      }

      // Delete: Cancel first pending order
      if (e.key === 'Delete') {
        e.preventDefault();
        const pending = useOrderStore.getState().orders.filter(o => o.status === 'PENDING' || o.status === 'PARTIAL');
        if (pending.length > 0) {
          const firstOrd = pending[0];
          cancelOrder(firstOrd.id)
            .then(() => useAppStore.getState().addToast('success', `Cancelled pending order for ${firstOrd.symbol}`))
            .catch((err) => useAppStore.getState().addToast('error', err.message || 'Failed to cancel order'));
        } else {
          useAppStore.getState().addToast('info', 'No pending orders to cancel');
        }
      }

      // Esc: Close active modals / menus
      if (e.key === 'Escape') {
        e.preventDefault();
        setOrderPanelOpen(false);
        window.dispatchEvent(new Event('close-chart-settings'));
      }

      // Space -> Buy Market
      if (e.key === ' ' && !e.shiftKey) {
        e.preventDefault();
        if (!selected) return;
        placeOrder({
          symbol: selected.symbol,
          side: 'buy',
          type: 'market',
          quantity: 0.1,
          leverage: 10
        }).then(() => {
          useAppStore.getState().addToast('success', `Quick BUY of 0.1 ${selected.symbol} executed`);
        }).catch((err) => {
          useAppStore.getState().addToast('error', err.message || 'Quick BUY failed');
        });
      }

      // Shift + Space -> Sell Market
      if (e.key === ' ' && e.shiftKey) {
        e.preventDefault();
        if (!selected) return;
        placeOrder({
          symbol: selected.symbol,
          side: 'sell',
          type: 'market',
          quantity: 0.1,
          leverage: 10
        }).then(() => {
          useAppStore.getState().addToast('success', `Quick SELL of 0.1 ${selected.symbol} executed`);
        }).catch((err) => {
          useAppStore.getState().addToast('error', err.message || 'Quick SELL failed');
        });
      }

      // Alt+1: Toggle Fullscreen Chart
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        setFullscreenChart((prev) => !prev);
      }

      // Alt+2: Positions Tab
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'positions' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // Alt+3: Orders Tab
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'orders' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // Alt+4: History Tab
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'history' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // Alt+5: Journal Tab
      if (e.altKey && e.key === '5') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'journal' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // Alt+6: Symbols/Scanner Tab
      if (e.altKey && e.key === '6') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'symbols' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // Alt+7: Replay Tab
      if (e.altKey && e.key === '7') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'replay' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }

      // Alt+8: AI Insights Tab
      if (e.altKey && e.key === '8') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'aiinsights' }));
        window.dispatchEvent(new Event('expand-bottom-panel'));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Drag Resize handlers
  const handleWatchlistResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = watchlistWidth;
    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(450, startWidth + (moveEvent.clientX - startX)));
      setWatchlistWidth(newWidth);
    };
    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const handleOrderResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = orderPanelWidth;
    const doDrag = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(500, startWidth - (moveEvent.clientX - startX)));
      setOrderPanelWidth(newWidth);
    };
    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const handleBottomResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = bottomHeight;
    const doDrag = (moveEvent: MouseEvent) => {
      const newHeight = Math.max(120, Math.min(600, startHeight - (moveEvent.clientY - startY)));
      setBottomHeight(newHeight);
    };
    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  useMarketWebSocket();

  useEffect(() => {
    if (!token) return;
    syncState();
    const interval = setInterval(() => syncState(), 15000);
    return () => clearInterval(interval);
  }, [syncState, token]);

  // Initialize browser notification listener
  useEffect(() => {
    if (!token) return;
    initializeNotificationService();
  }, [token]);

  // Strategy bots background simulator tick
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      useAutomationStore.getState().tickBotsSimulation();
    }, 4000);
    return () => clearInterval(interval);
  }, [token]);

  if (!token) {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#070b14', color: '#8e8e93', fontSize: 12 }}>Loading Authentication...</div>}>
        <Auth />
      </Suspense>
    );
  }

  if (isMobile) {
    return (
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#070b14', color: '#8e8e93', fontSize: 12 }}>Loading Mobile Terminal...</div>}>
        <ErrorBoundary fallback={<PanelFallback name="Mobile Terminal" />}>
          {/* Toast Notification Container */}
          <div className="toast-container">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`toast-card ${t.type}`}
                onClick={() => removeToast(t.id)}
              >
                <span className="toast-text">{t.text}</span>
                <button className="toast-close">×</button>
              </div>
            ))}
          </div>
          <MobileLayout />
        </ErrorBoundary>
      </Suspense>
    );
  }

  // Determine visibility states based on flags
  const showWatchlist = !isFullscreenChart && isWatchlistOpen;
  const showOrderPanel = !isFullscreenChart && isOrderPanelOpen;
  const showBottomBar = !isFullscreenChart && isBottomOpen;

  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#070b14', color: '#8e8e93', fontSize: 12 }}>Loading Trading Terminal...</div>}>
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <ErrorBoundary fallback={<PanelFallback name="Header" />}>
        <Header
          isWatchlistOpen={isWatchlistOpen}
          setWatchlistOpen={setWatchlistOpen}
          isOrderPanelOpen={isOrderPanelOpen}
          setOrderPanelOpen={setOrderPanelOpen}
          isBottomOpen={isBottomOpen}
          setBottomOpen={setBottomOpen}
          isFullscreenChart={isFullscreenChart}
          setFullscreenChart={setFullscreenChart}
        />
      </ErrorBoundary>

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-card ${t.type}`}
            onClick={() => removeToast(t.id)}
          >
            <span className="toast-text">{t.text}</span>
            <button className="toast-close">×</button>
          </div>
        ))}
      </div>

      {/* Main Workspace Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="workspace" style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#000', gap: 0 }}>
          {/* Watchlist Panel */}
          {showWatchlist && (
            <>
              <aside className="watchlist-panel" style={{ width: `${watchlistWidth}px`, flex: '0 0 auto', borderRight: '1px solid #1b2235', background: '#0d1322', padding: '10px', overflowY: 'auto' }}>
                <ErrorBoundary fallback={<PanelFallback name="Watchlist" />}>
                  <Watchlist />
                </ErrorBoundary>
              </aside>
              {/* Drag vertical resize bar */}
              <div className="resize-handle-col" onMouseDown={handleWatchlistResize} />
            </>
          )}

          {/* Chart Panel */}
          <main className="chart-panel" style={{ flex: 1, padding: '10px', overflow: 'hidden', background: '#070b14', display: 'flex', flexDirection: 'column' }}>
            <ErrorBoundary fallback={<PanelFallback name="Chart" />}>
              <Chart />
            </ErrorBoundary>
          </main>

          {/* Order Panel */}
          {showOrderPanel && (
            <>
              {/* Drag vertical resize bar */}
              <div className="resize-handle-col" onMouseDown={handleOrderResize} />
              <aside className="order-panel" style={{ width: `${orderPanelWidth}px`, flex: '0 0 auto', borderLeft: '1px solid #1b2235', background: '#0d1322', padding: '10px', overflowY: 'auto' }}>
                <ErrorBoundary fallback={<PanelFallback name="Order Panel" />}>
                  <OrderPanel />
                </ErrorBoundary>
              </aside>
            </>
          )}
        </div>

        {/* Bottom Panel Workspace Category Tab Container */}
        {showBottomBar && (
          <div style={{ height: `${bottomHeight}px`, flex: '0 0 auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Drag horizontal height bar */}
            <div className="resize-handle-row" onMouseDown={handleBottomResize} />
            <footer className="bottom-bar" style={{ flex: 1, borderTop: '1px solid #1b2235', background: '#0d1322', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ErrorBoundary fallback={<PanelFallback name="Bottom Panel" />}>
                <BottomPanel />
              </ErrorBoundary>
            </footer>
          </div>
        )}
      </div>

      {/* Institutional Global Search command palette */}
      <CommandPalette />

      {/* Bloomberg-style Status Bar */}
      <StatusBar />
    </div>
    </Suspense>
  );
};

export default App;
