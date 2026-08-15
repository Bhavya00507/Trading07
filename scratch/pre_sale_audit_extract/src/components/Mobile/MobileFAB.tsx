import React, { useState } from 'react';

interface MobileFABProps {
  onNewOrder: () => void;
  onToggleReplay: () => void;
  onOpenAI: () => void;
  onOpenAlerts: () => void;
  onToggleDrawing: () => void;
  onOpenScanner: () => void;
  onOpenNews: () => void;
}

export const MobileFAB: React.FC<MobileFABProps> = React.memo(({
  onNewOrder,
  onToggleReplay,
  onOpenAI,
  onOpenAlerts,
  onToggleDrawing,
  onOpenScanner,
  onOpenNews,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { id: 'order', label: 'New Order', icon: '⚡', color: '#10b981', action: onNewOrder },
    { id: 'ai', label: 'AI Assistant', icon: '🤖', color: '#a78bfa', action: onOpenAI },
    { id: 'replay', label: 'Replay Mode', icon: '▶', color: '#38bdf8', action: onToggleReplay },
    { id: 'alert', label: 'Price Alert', icon: '🔔', color: '#f59e0b', action: onOpenAlerts },
    { id: 'drawing', label: 'Drawing Tools', icon: '✏', color: '#ec4899', action: onToggleDrawing },
    { id: 'scanner', label: 'Market Scanner', icon: '🔍', color: '#6366f1', action: onOpenScanner },
    { id: 'news', label: 'Economic News', icon: '📰', color: '#14b8a6', action: onOpenNews },
  ];

  return (
    <div className={`quantum-fab-container ${isOpen ? 'open' : ''}`}>
      {isOpen && (
        <div className="fab-speed-dial">
          {actions.map((item, idx) => (
            <button
              key={item.id}
              className="fab-item"
              style={{ animationDelay: `${idx * 0.04}s`, borderColor: item.color }}
              onClick={() => {
                item.action();
                setIsOpen(false);
              }}
            >
              <span className="fab-label">{item.label}</span>
              <span className="fab-icon" style={{ backgroundColor: `${item.color}22`, color: item.color }}>
                {item.icon}
              </span>
            </button>
          ))}
        </div>
      )}

      <button 
        className={`fab-main-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Action Menu"
      >
        <span className="main-icon">{isOpen ? '✕' : '+'}</span>
      </button>
    </div>
  );
});

MobileFAB.displayName = 'MobileFAB';
