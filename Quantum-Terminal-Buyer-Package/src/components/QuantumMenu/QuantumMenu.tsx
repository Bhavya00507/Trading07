import React, { useEffect } from 'react';
import { BuyerDemoHeaderBadge } from '../BuyerDemo/BuyerDemoHeaderBadge';
import './QuantumMenu.css';

export interface QuantumMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onSelectTab: (tab: any) => void;
  account?: {
    balance?: number;
    equity?: number;
    free_margin?: number;
  } | null;
  onLogout: () => void;
}

export const QuantumMenu: React.FC<QuantumMenuProps> = ({
  isOpen,
  onClose,
  activeTab = 'chart',
  onSelectTab,
  account,
  onLogout,
}) => {
  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const balanceVal = account?.balance ?? 10084.486;
  const equityVal = account?.equity ?? 10086.726;
  const freeMarginVal = account?.free_margin ?? 7846.121;

  const handleTabClick = (tabId: string) => {
    onSelectTab(tabId);
    onClose();
  };

  return (
    <div className="quantum-menu-backdrop" onClick={onClose}>
      <aside 
        className="quantum-menu-panel" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Quantum Navigation Menu"
      >
        {/* Header */}
        <header className="quantum-menu-header">
          <div className="quantum-menu-title-block" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="qm-sub">QUANTUM</span>
            <span className="qm-main">MENU</span>
            <BuyerDemoHeaderBadge />
          </div>
          <button 
            className="quantum-menu-close-btn" 
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="quantum-menu-body">
          {/* Account Summary Card */}
          <section className="qm-section">
            <h4 className="qm-section-title">ACCOUNT</h4>
            <div className="qm-account-card">
              <div className="qm-account-row">
                <span className="qm-acc-label">Balance</span>
                <span className="qm-acc-val">${balanceVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</span>
              </div>
              <div className="qm-account-row">
                <span className="qm-acc-label">Equity</span>
                <span className="qm-acc-val positive">${equityVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</span>
              </div>
              <div className="qm-account-row">
                <span className="qm-acc-label">Free Margin</span>
                <span className="qm-acc-val accent-cyan">${freeMarginVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</span>
              </div>
            </div>
          </section>

          {/* Workspaces Section */}
          <section className="qm-section">
            <h4 className="qm-section-title">WORKSPACES</h4>
            <div className="qm-menu-list">
              <button
                className={`qm-menu-row ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleTabClick('dashboard')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon">▣</span>
                  <span className="qm-label">Executive Dashboard</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>

              <button
                className={`qm-menu-row ${activeTab === 'markets' ? 'active' : ''}`}
                onClick={() => handleTabClick('markets')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon">◉</span>
                  <span className="qm-label">Global Markets</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>

              <button
                className={`qm-menu-row ${activeTab === 'chart' ? 'active' : ''}`}
                onClick={() => handleTabClick('chart')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon">▤</span>
                  <span className="qm-label">Hero Chart</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>

              <button
                className={`qm-menu-row ${activeTab === 'trade' ? 'active' : ''}`}
                onClick={() => handleTabClick('trade')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon qm-icon-gold">⚡</span>
                  <span className="qm-label">One-Tap Order Ticket</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>

              <button
                className={`qm-menu-row ${activeTab === 'portfolio' ? 'active' : ''}`}
                onClick={() => handleTabClick('portfolio')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon">▣</span>
                  <span className="qm-label">Open Positions</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>
            </div>
          </section>

          {/* Intelligence Section */}
          <section className="qm-section">
            <h4 className="qm-section-title intelligence-title">INTELLIGENCE</h4>
            <div className="qm-menu-list">
              <button
                className={`qm-menu-row qm-ai-row ${activeTab === 'scanner' ? 'active' : ''}`}
                onClick={() => handleTabClick('scanner')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon qm-ai-icon">⌕</span>
                  <span className="qm-label">Smart Money AI Scanner</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>

              <button
                className={`qm-menu-row qm-ai-row ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => handleTabClick('ai')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon qm-ai-icon">🤖</span>
                  <span className="qm-label">Neural AI Copilot</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>

              <button
                className={`qm-menu-row qm-ai-row ${activeTab === 'news' ? 'active' : ''}`}
                onClick={() => handleTabClick('news')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon qm-ai-icon">▤</span>
                  <span className="qm-label">Economic News Calendar</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>
            </div>
          </section>

          {/* System Section */}
          <section className="qm-section">
            <h4 className="qm-section-title">SYSTEM</h4>
            <div className="qm-menu-list">
              <button
                className={`qm-menu-row ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleTabClick('settings')}
              >
                <div className="qm-row-left">
                  <span className="qm-icon">⚙</span>
                  <span className="qm-label">Security & Preferences</span>
                </div>
                <span className="qm-chevron">›</span>
              </button>
            </div>
          </section>
        </div>

        {/* Footer Logout Section */}
        <footer className="quantum-menu-footer">
          <button 
            className="qm-logout-row" 
            onClick={() => {
              onLogout();
              onClose();
            }}
          >
            <div className="qm-row-left">
              <span className="qm-logout-icon">↪</span>
              <span className="qm-logout-label">Log Out</span>
            </div>
          </button>
        </footer>
      </aside>
    </div>
  );
};
