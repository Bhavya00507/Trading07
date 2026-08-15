import React from 'react';

export type MobileTabId = 'dashboard' | 'markets' | 'chart' | 'trade' | 'portfolio' | 'scanner' | 'ai' | 'news' | 'settings' | 'more';

interface MobileBottomNavProps {
  activeTab: MobileTabId;
  onSelectTab: (tab: MobileTabId) => void;
  openPositionsCount?: number;
  hasHighImpactNews?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = React.memo(({
  activeTab,
  onSelectTab,
  openPositionsCount = 0,
  hasHighImpactNews = true,
}) => {
  const tabs: { id: MobileTabId; label: string; icon: JSX.Element; badge?: number; hasDot?: boolean }[] = [
    {
      id: 'chart',
      label: 'Chart',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      id: 'markets',
      label: 'Markets',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
    {
      id: 'trade',
      label: 'Trade',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      badge: openPositionsCount,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      id: 'more',
      label: 'More',
      hasDot: hasHighImpactNews,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
        </svg>
      ),
    },
  ];

  const activeIndex = tabs.findIndex((t) => t.id === activeTab || (activeTab === 'dashboard' && t.id === 'chart'));

  return (
    <nav className="quantum-bottom-nav">
      {activeIndex >= 0 && (
        <div 
          className="nav-indicator-line" 
          style={{ 
            width: `${100 / tabs.length}%`, 
            transform: `translateX(${activeIndex * 100}%)` 
          }} 
        />
      )}

      {tabs.map((tab) => {
        const isActive = tab.id === activeTab || (tab.id === 'chart' && activeTab === 'dashboard');
        return (
          <button
            key={tab.id}
            className={`nav-tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <div className="icon-wrapper">
              {tab.icon}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="tab-badge">{tab.badge}</span>
              )}
              {tab.hasDot && (
                <span className="tab-dot-notification" />
              )}
            </div>
            <span className="tab-lbl">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';
