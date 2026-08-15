// src/components/BuyerDemo/DemoResetModal.tsx
import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useMarketStore } from '../../store/marketStore';
import './BuyerDemo.css';

interface DemoResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const DemoResetModal: React.FC<DemoResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    // 1. Reset paper trading balance and state in localStorage
    localStorage.removeItem('trading-chart-cells');
    localStorage.removeItem('trading-chart-layout');
    localStorage.removeItem('quantum_tour_completed');

    // 2. Add success toast notification
    useAppStore.getState().addToast('info', 'Demo environment safely reset to default state.');

    onConfirmReset();
    onClose();
  };

  return (
    <div className="buyer-demo-modal-overlay" onClick={onClose}>
      <div
        className="buyer-demo-modal-container"
        style={{ width: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="buyer-demo-modal-header" style={{ borderBottomColor: 'rgba(255, 77, 87, 0.2)' }}>
          <h2 style={{ color: '#ff4d57' }}>
            <span>🔄</span> Reset Buyer Demo Environment
          </h2>
          <button className="buyer-demo-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="buyer-demo-modal-body">
          <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
            Are you sure you want to reset the demo environment?
          </p>

          <div style={{ padding: 12, background: 'rgba(255, 77, 87, 0.08)', borderRadius: 6, border: '1px solid rgba(255, 77, 87, 0.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff4d57', marginBottom: 4 }}>
              This action will safely reset:
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#cbd5e1', lineHeight: 1.6 }}>
              <li>Paper trading account balance to <strong>$100,000.00</strong></li>
              <li>Active paper positions and pending orders</li>
              <li>Workspace grid layouts to default state</li>
              <li>Product tour completion state</li>
            </ul>
          </div>

          <div style={{ paddingTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 4,
                color: '#ffffff',
                padding: '6px 14px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleReset}
              style={{
                background: 'linear-gradient(135deg, #ff4d57, #c026d3)',
                border: 'none',
                borderRadius: 4,
                color: '#ffffff',
                padding: '6px 16px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Confirm Demo Reset 🔄
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
