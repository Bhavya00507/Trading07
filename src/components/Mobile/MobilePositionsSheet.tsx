import React, { useState } from 'react';
import { usePositionStore } from '../../store/positionStore';
import { useOrderStore } from '../../store/orderStore';
import { useMarketPriceStore } from '../../store/marketPriceStore';
import { useAppStore } from '../../store/appStore';
import { closeSymbol, reversePosition, breakEven, cancelOrder, closeAllPositions } from '../../services/api';
import { formatPrice } from '../Watchlist';
import { getContractSize } from '../../hooks/useLiveAccountMetrics';

interface MobilePositionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobilePositionsSheet: React.FC<MobilePositionsSheetProps> = React.memo(({
  isOpen,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const positions = usePositionStore((s) => s.positions.filter((p) => p.quantity !== 0));
  const orders = useOrderStore((s) => s.orders.filter((o) => o.status === 'PENDING'));

  const prices = useMarketPriceStore((s) => s.prices);

  const calculatePnl = (pos: any) => {
    const livePrice = prices[pos.symbol.toUpperCase()]?.currentPrice ?? pos.average_price;
    const contractSize = getContractSize(pos.symbol);
    return pos.quantity > 0
      ? (livePrice - pos.average_price) * pos.quantity * contractSize
      : (pos.average_price - livePrice) * Math.abs(pos.quantity) * contractSize;
  };

  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + calculatePnl(pos), 0);

  const handleClosePos = async (symbol: string, id?: string) => {
    try {
      await closeSymbol(symbol, id, useAppStore.getState().activeAccountType || 'paper');
      useAppStore.getState().addToast('success', `Closed ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to close');
    }
  };

  const handleReversePos = async (symbol: string, id?: string) => {
    try {
      await reversePosition(symbol, id);
      useAppStore.getState().addToast('success', `Reversed ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to reverse');
    }
  };

  const handleBreakEvenPos = async (symbol: string, id?: string) => {
    try {
      await breakEven(symbol, id);
      useAppStore.getState().addToast('success', `Break-even applied for ${symbol}`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed break-even');
    }
  };

  const handleCancelOrd = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      useAppStore.getState().addToast('success', 'Order cancelled');
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed cancel');
    }
  };

  const handleCloseAll = async () => {
    try {
      await closeAllPositions(useAppStore.getState().activeAccountType || 'paper');
      useAppStore.getState().addToast('success', 'All open positions closed');
    } catch {
      useAppStore.getState().addToast('info', 'Close all executed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quantum-positions-sheet-overlay" onClick={onClose}>
      <div className="quantum-positions-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle-bar" onClick={onClose}>
          <div className="handle" />
        </div>

        <div className="positions-sheet-header">
          <div className="header-pnl-summary">
            <span className="summary-title">PORTFOLIO POSITIONS</span>
            <span className={`pnl-total ${totalUnrealizedPnl >= 0 ? 'up' : 'down'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
            </span>
          </div>

          <div className="header-actions">
            {positions.length > 0 && (
              <button className="close-all-btn" onClick={handleCloseAll}>
                CLOSE ALL
              </button>
            )}
            <button className="sheet-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="positions-subtabs">
          <button 
            className={`subtab-btn ${activeSubTab === 'positions' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('positions')}
          >
            Positions ({positions.length})
          </button>
          <button 
            className={`subtab-btn ${activeSubTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('orders')}
          >
            Orders ({orders.length})
          </button>
          <button 
            className={`subtab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('history')}
          >
            History
          </button>
        </div>

        <div className="sheet-cards-scroll">
          {activeSubTab === 'positions' && (
            <div className="cards-list">
              {positions.map((pos) => {
                const dir = pos.quantity > 0 ? 'BUY' : 'SELL';
                const pnl = calculatePnl(pos);
                return (
                  <div key={pos.id} className={`position-card ${dir.toLowerCase()}`}>
                    <div className="card-top">
                      <div className="sym-info">
                        <span className="sym">{pos.symbol}</span>
                        <span className={`badge ${dir.toLowerCase()}`}>{dir}</span>
                        <span className="qty">{Math.abs(pos.quantity).toFixed(2)} Lots</span>
                      </div>
                      <span className={`pnl ${pnl >= 0 ? 'up' : 'down'}`}>
                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                      </span>
                    </div>

                    <div className="card-grid">
                      <div><span>Entry</span><strong>{formatPrice(pos.average_price, pos.symbol)}</strong></div>
                      <div><span>Current</span><strong>{formatPrice(prices[pos.symbol.toUpperCase()]?.currentPrice ?? pos.average_price, pos.symbol)}</strong></div>
                      <div><span>SL</span><strong>{pos.stop_loss ? formatPrice(pos.stop_loss, pos.symbol) : '--'}</strong></div>
                      <div><span>TP</span><strong>{pos.take_profit ? formatPrice(pos.take_profit, pos.symbol) : '--'}</strong></div>
                    </div>

                    <div className="card-actions">
                      <button onClick={() => handleBreakEvenPos(pos.symbol, pos.id)}>🛡️ BE</button>
                      <button onClick={() => handleReversePos(pos.symbol, pos.id)}>🔄 Rev</button>
                      <button className="close-btn" onClick={() => handleClosePos(pos.symbol, pos.id)}>✕ Close</button>
                    </div>
                  </div>
                );
              })}
              {positions.length === 0 && <div className="empty-state">No open positions</div>}
            </div>
          )}

          {activeSubTab === 'orders' && (
            <div className="cards-list">
              {orders.map((ord) => (
                <div key={ord.id} className="order-card">
                  <div className="card-top">
                    <span className="sym">{ord.symbol}</span>
                    <span className="ord-type">{ord.type} {ord.side}</span>
                    <button className="cancel-btn" onClick={() => handleCancelOrd(ord.id)}>Cancel</button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <div className="empty-state">No pending orders</div>}
            </div>
          )}

          {activeSubTab === 'history' && (
            <div className="cards-list">
              <div className="empty-state">No recent closed history</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

MobilePositionsSheet.displayName = 'MobilePositionsSheet';
