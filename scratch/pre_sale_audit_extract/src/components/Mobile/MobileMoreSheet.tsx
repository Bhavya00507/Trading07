import React from 'react';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionId: string) => void;
  hasHighImpactNews?: boolean;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = React.memo(({
  isOpen,
  onClose,
  onSelectAction,
  hasHighImpactNews = true,
}) => {
  if (!isOpen) return null;

  const items = [
    {
      id: 'news',
      title: 'Economic News',
      subtitle: 'Macro catalysts & calendar',
      icon: '📰',
      color: '#3b82f6',
      badge: hasHighImpactNews ? '3 HIGH' : undefined,
    },
    {
      id: 'ai',
      title: 'AI Assistant',
      subtitle: 'Market analysis & signals',
      icon: '🤖',
      color: '#a855f7',
    },
    {
      id: 'scanner',
      title: 'Market Scanner',
      subtitle: 'Volume & pattern opportunities',
      icon: '🔍',
      color: '#10b981',
    },
    {
      id: 'alerts',
      title: 'Price Alerts',
      subtitle: 'Custom price notifications',
      icon: '🔔',
      color: '#f59e0b',
    },
    {
      id: 'dom',
      title: 'Order Book DOM',
      subtitle: 'Level 2 market depth',
      icon: '⚡',
      color: '#06b6d4',
    },
    {
      id: 'strategy',
      title: 'Strategy Builder',
      subtitle: 'Visual backtester & scripts',
      icon: '🧠',
      color: '#ec4899',
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Preferences & theme',
      icon: '⚙️',
      color: '#64748b',
    },
  ];

  return (
    <div className="quantum-more-sheet-backdrop" onClick={onClose}>
      <div className="quantum-more-sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-drag-handle" onClick={onClose} />
        
        <div className="sheet-more-header">
          <div className="header-title-group">
            <h3>MORE TOOLS & SERVICES</h3>
            <span className="subtitle">Quantum Mobile Pro Suite</span>
          </div>
          <button className="sheet-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="more-grid">
          {items.map((item) => (
            <div
              key={item.id}
              className="more-grid-card"
              onClick={() => {
                onSelectAction(item.id);
                onClose();
              }}
            >
              <div className="card-icon-container" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                <span className="card-icon">{item.icon}</span>
                {item.badge && <span className="card-badge">{item.badge}</span>}
              </div>
              <div className="card-text">
                <span className="card-title">{item.title}</span>
                <span className="card-sub">{item.subtitle}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

MobileMoreSheet.displayName = 'MobileMoreSheet';
