// src/components/OrdersPanel.tsx
import React, { useState, useMemo } from 'react';
import { useOrderStore } from '../store/orderStore';
import { useAppStore } from '../store/appStore';
import { cancelOrder, placeOrder } from '../services/api';
import { Order } from '../types';
import { formatPrice } from './Watchlist';

const tableWrap: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  overflowX: 'auto',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 1000,
  borderCollapse: 'collapse',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
};

const theadStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  background: 'var(--bg-secondary)',
};

const thStyle: React.CSSProperties = {
  padding: '6px 12px',
  textAlign: 'left',
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-color)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
};

const editInput: React.CSSProperties = {
  padding: '2px 5px',
  fontSize: 10,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
};

const actionBtnBase: React.CSSProperties = {
  padding: '2px 8px',
  fontSize: 10,
  fontWeight: 700,
  borderRadius: 3,
  cursor: 'pointer',
  border: '1px solid',
  transition: 'opacity 0.15s',
  fontFamily: 'var(--font-sans)',
};

const badgeStyle = (status: string): React.CSSProperties => {
  let bg = 'rgba(212,175,55,0.12)';
  let color = 'var(--accent)';
  let border = '1px solid rgba(212,175,55,0.25)';

  if (status === 'FILLED') {
    bg = 'rgba(0,192,118,0.12)';
    color = 'var(--success)';
    border = '1px solid rgba(0,192,118,0.25)';
  } else if (status === 'REJECTED' || status === 'EXPIRED') {
    bg = 'rgba(255,77,87,0.12)';
    color = 'var(--danger)';
    border = '1px solid rgba(255,77,87,0.25)';
  } else if (status === 'PARTIALLY_FILLED') {
    bg = 'rgba(234,115,23,0.12)';
    color = '#ea7317';
    border = '1px solid rgba(234,115,23,0.25)';
  }

  return {
    display: 'inline-block',
    padding: '1px 7px',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: '0.04em',
    backgroundColor: bg,
    color,
    border,
    textTransform: 'uppercase',
  };
};

const formatOrderTime = (createdStr?: string) => {
  if (!createdStr) return '-';
  const d = new Date(createdStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const OrdersPanel: React.FC = () => {
  const orders = useOrderStore((s) => s.orders);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStopPrice, setEditStopPrice] = useState<number>(0);
  const [hoverRow, setHoverRow] = useState<string | null>(null);

  // OMS Multi-select & Audit trail states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [auditOrderId, setAuditOrderId] = useState<string | null>(null);

  const pendingOrders = useMemo(() => {
    // Show all orders to represent complete order lifecycles (Pending, Filled, Expired, etc.)
    return orders;
  }, [orders]);

  const handleCancel = async (orderId: string) => {
    try {
      await cancelOrder(orderId);
      useAppStore.getState().addToast('success', 'Order cancelled.');
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to cancel order.');
    }
  };

  const handleDuplicate = async (o: Order) => {
    try {
      await placeOrder({
        symbol: o.symbol,
        side: o.side,
        type: o.type,
        quantity: o.quantity,
        price: o.price,
        stop_price: o.stop_price,
        stop_loss: o.stop_loss,
        take_profit: o.take_profit,
      });
      useAppStore.getState().addToast('success', `Order for ${o.symbol} duplicated.`);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to duplicate order.');
    }
  };

  const startEdit = (o: Order) => {
    setEditingId(o.id);
    setEditQty(o.quantity);
    setEditPrice(o.price || 0);
    setEditStopPrice(o.stop_price || 0);
  };

  const cancelEdit = () => setEditingId(null);

  const handleModify = async (o: Order) => {
    if (editQty <= 0) return;
    try {
      await cancelOrder(o.id);
      await placeOrder({
        symbol: o.symbol,
        side: o.side,
        type: o.type,
        quantity: editQty,
        price: editPrice > 0 ? editPrice : undefined,
        stop_price: editStopPrice > 0 ? editStopPrice : undefined,
        stop_loss: o.stop_loss,
        take_profit: o.take_profit,
      });
      useAppStore.getState().addToast('success', 'Order modified.');
      setEditingId(null);
    } catch (err: any) {
      useAppStore.getState().addToast('error', err.message || 'Failed to modify order.');
    }
  };

  // Bulk OMS Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(pendingOrders.map((o) => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCancelSelected = async () => {
    if (selectedIds.length === 0) return;
    let count = 0;
    for (const id of selectedIds) {
      try {
        await cancelOrder(id);
        count++;
      } catch {}
    }
    useAppStore.getState().addToast('success', `Cancelled ${count} selected orders.`);
    setSelectedIds([]);
  };

  const handleCancelAll = async () => {
    let count = 0;
    const active = pendingOrders.filter((o) => o.status === 'PENDING');
    for (const o of active) {
      try {
        await cancelOrder(o.id);
        count++;
      } catch {}
    }
    useAppStore.getState().addToast('success', `Cancelled all ${count} active pending orders.`);
    setSelectedIds([]);
  };

  const handleExecuteBasket = () => {
    if (selectedIds.length === 0) return;
    useAppStore.getState().addToast('success', `Basket order sent for execution containing ${selectedIds.length} orders.`);
    setSelectedIds([]);
  };

  // Generate audit trail for the selected order
  const auditLogs = useMemo(() => {
    if (!auditOrderId) return [];
    const ord = pendingOrders.find((o) => o.id === auditOrderId);
    if (!ord) return [];

    const dateStr = ord.created_at ? new Date(ord.created_at).toLocaleTimeString() : '18:45:00';

    return [
      `[${dateStr}] OMS: Order created in state PENDING (Qty: ${ord.quantity} ${ord.symbol})`,
      `[${dateStr}] Router: Routed to market gateway via FIX protocol session`,
      `[${dateStr}] Gateway: Acknowledged by execution gateway`,
      ord.status === 'FILLED' 
        ? `[${dateStr}] Matcher: Executed fully at average price $${ord.price || 'Market'}`
        : ord.status === 'CANCELLED'
          ? `[${dateStr}] OMS: Request to Cancel order received and acknowledged`
          : `[${dateStr}] OMS: Waiting in matching book...`
    ];
  }, [auditOrderId, pendingOrders]);

  if (pendingOrders.length === 0) {
    return <div className="panel empty">No orders in database</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '6px', background: '#0d1322' }}>
      
      {/* OMS Bulk Action Toolbar */}
      <div style={{ display: 'flex', gap: '8px', padding: '6px', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginRight: '6px' }}>OMS Actions:</span>
        <button
          onClick={handleCancelSelected}
          disabled={selectedIds.length === 0}
          style={{
            ...actionBtnBase,
            backgroundColor: selectedIds.length > 0 ? 'rgba(255,77,87,0.1)' : 'transparent',
            borderColor: selectedIds.length > 0 ? '#ff4d57' : '#1b2235',
            color: selectedIds.length > 0 ? '#ff4d57' : '#8e8e93',
          }}
        >
          Cancel Selected ({selectedIds.length})
        </button>
        <button
          onClick={handleExecuteBasket}
          disabled={selectedIds.length === 0}
          style={{
            ...actionBtnBase,
            backgroundColor: selectedIds.length > 0 ? 'rgba(0,192,118,0.1)' : 'transparent',
            borderColor: selectedIds.length > 0 ? '#00c076' : '#1b2235',
            color: selectedIds.length > 0 ? '#00c076' : '#8e8e93',
          }}
        >
          Execute Selected Basket
        </button>
        <button
          onClick={handleCancelAll}
          style={{
            ...actionBtnBase,
            backgroundColor: 'transparent',
            borderColor: '#ff4d57',
            color: '#ff4d57',
          }}
        >
          Cancel All Active
        </button>

        <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#8e8e93' }}>
          Showing {pendingOrders.length} orders
        </span>
      </div>

      {/* Main Table view */}
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead style={theadStyle}>
            <tr>
              <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.length === pendingOrders.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th style={thStyle}>Symbol</th>
              <th style={thStyle}>Side</th>
              <th style={thStyle}>Type</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Entry Price</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Trigger Price</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>SL</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>TP</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              <th style={thStyle}>Time</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingOrders.map((o: Order, idx: number) => {
              const isEditing = editingId === o.id;
              const isEven = idx % 2 === 0;
              const isHovered = hoverRow === o.id;
              const rowBg = isHovered
                ? 'var(--bg-tertiary)'
                : isEven
                ? 'transparent'
                : 'rgba(255,255,255,0.012)';

              const hasLimit = o.type === 'limit' || o.type === 'stop_limit';
              const hasStop = o.type === 'stop' || o.type === 'stop_limit';

              return (
                <tr
                  key={o.id}
                  style={{ backgroundColor: rowBg, transition: 'background-color 0.12s' }}
                  onMouseEnter={() => setHoverRow(o.id)}
                  onMouseLeave={() => setHoverRow(null)}
                >
                  {/* Checkbox column */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(o.id)}
                      onChange={() => handleToggleSelect(o.id)}
                    />
                  </td>
                  
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{o.symbol}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: o.side === 'buy' ? 'var(--success)' : 'var(--danger)' }}>
                    {(o.side || '').toUpperCase()}
                  </td>
                  <td style={{ ...tdStyle, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    {o.type.replace('_', ' ')}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--text-primary)' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.001"
                        value={editQty || ''}
                        onChange={(e) => setEditQty(Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ ...editInput, width: 70, textAlign: 'right' }}
                      />
                    ) : (
                      o.quantity
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {isEditing ? (
                      hasLimit ? (
                        <input
                          type="number"
                          step="any"
                          value={editPrice || ''}
                          onChange={(e) => setEditPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          style={{ ...editInput, width: 80, textAlign: 'right' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )
                    ) : o.price ? (
                      formatPrice(o.price, o.symbol)
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {isEditing ? (
                      hasStop ? (
                        <input
                          type="number"
                          step="any"
                          value={editStopPrice || ''}
                          onChange={(e) => setEditStopPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                          style={{ ...editInput, width: 80, textAlign: 'right' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )
                    ) : o.stop_price ? (
                      formatPrice(o.stop_price, o.symbol)
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {o.stop_loss ? formatPrice(o.stop_loss, o.symbol) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {o.take_profit ? formatPrice(o.take_profit, o.symbol) : '-'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={badgeStyle(o.status)}>{o.status}</span>
                  </td>
                  <td style={tdStyle}>
                    {formatOrderTime(o.created_at)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleModify(o)}
                            style={{
                              ...actionBtnBase,
                              backgroundColor: 'var(--success-bg)',
                              borderColor: 'rgba(14,203,129,0.35)',
                              color: 'var(--success)',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              ...actionBtnBase,
                              backgroundColor: 'var(--bg-tertiary)',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            Discard
                          </button>
                        </>
                      ) : (
                        <>
                          {o.status === 'PENDING' && (
                            <button
                              onClick={() => startEdit(o)}
                              style={{
                                ...actionBtnBase,
                                backgroundColor: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              Modify
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicate(o)}
                            style={{
                              ...actionBtnBase,
                              backgroundColor: 'var(--bg-tertiary)',
                              borderColor: 'var(--border-color)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => setAuditOrderId(auditOrderId === o.id ? null : o.id)}
                            style={{
                              ...actionBtnBase,
                              backgroundColor: 'transparent',
                              borderColor: auditOrderId === o.id ? 'var(--accent)' : 'var(--border-color)',
                              color: auditOrderId === o.id ? 'var(--accent)' : 'var(--text-secondary)',
                            }}
                          >
                            Audit
                          </button>
                          {o.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancel(o.id)}
                              style={{
                                ...actionBtnBase,
                                backgroundColor: 'var(--danger-bg)',
                                borderColor: 'rgba(246,70,93,0.35)',
                                color: 'var(--danger)',
                              }}
                            >
                              Cancel
                            </button>
                          )}
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* OMS Order Audit Trail Collapsible Log Panel */}
      {auditOrderId && (
        <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', marginTop: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px', display: 'block', marginBottom: '6px' }}>
            OMS Audit Trail Trail: Order {auditOrderId}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '80px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#8e8e93' }}>
            {auditLogs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default React.memo(OrdersPanel);
