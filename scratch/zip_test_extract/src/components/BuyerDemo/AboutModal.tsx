// src/components/BuyerDemo/AboutModal.tsx
import React from 'react';
import './BuyerDemo.css';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="buyer-demo-modal-overlay" onClick={onClose}>
      <div
        className="buyer-demo-modal-container"
        style={{ width: 650 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="buyer-demo-modal-header">
          <h2>
            <span>ℹ️</span> About Quantum Terminal
          </h2>
          <button className="buyer-demo-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="buyer-demo-modal-body" style={{ gap: 16 }}>
          <div style={{ padding: 14, background: 'rgba(56, 189, 248, 0.08)', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: 14, color: '#ffffff', fontWeight: 800 }}>
              Quantum Terminal — Institutional Trading Platform Prototype
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
              Extensible trading platform architecture designed for desktop multi-chart workstations and touch-native mobile viewports. Built for software engineering teams and brokerages to acquire, customize, rebrand, and integrate with their proprietary execution infrastructure.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, background: 'rgba(15, 20, 34, 0.8)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#d4af37', textTransform: 'uppercase', marginBottom: 6 }}>
                Technology Stack
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                <li><strong>Frontend:</strong> React 18, TypeScript, Vite</li>
                <li><strong>State:</strong> Zustand Store Modules</li>
                <li><strong>Canvas:</strong> Lightweight Charts v4</li>
                <li><strong>Backend:</strong> Python 3.11+, FastAPI</li>
                <li><strong>Database:</strong> SQLAlchemy ORM, SQLite/Postgres</li>
                <li><strong>Testing:</strong> Pytest (155 passing tests)</li>
              </ul>
            </div>

            <div style={{ padding: 12, background: 'rgba(15, 20, 34, 0.8)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 6 }}>
                System Build & Status
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 }}>
                <li><strong>Version:</strong> v1.0.0-PROTOTYPE</li>
                <li><strong>Build Status:</strong> PRODUCTION READY</li>
                <li><strong>Mode:</strong> BUYER PRESENTATION DEMO</li>
                <li><strong>Paper Engine:</strong> ACTIVE (100% Simulated)</li>
                <li><strong>Broker Live Adapter:</strong> INTEGRATION READY</li>
                <li><strong>License:</strong> COMMERCIAL ACQUISITION</li>
              </ul>
            </div>
          </div>

          <div style={{ paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>
              Documentation & Guides available in <code>/docs</code> directory.
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: 4,
                color: '#ffffff',
                padding: '6px 16px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
