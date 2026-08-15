// src/components/IndicatorLibrary/IndicatorLibraryModal.tsx — TradingView Premium Indicator Library Modal

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { INDICATOR_DATABASE, IndicatorDef } from './indicatorData';
import './IndicatorLibraryModal.css';

interface IndicatorLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndicator?: (indicatorId: string) => void;
}

export const IndicatorLibraryModal: React.FC<IndicatorLibraryModalProps> = React.memo(({
  isOpen,
  onClose,
  onSelectIndicator,
}) => {
  // Navigation & Category States
  const [activeTab, setActiveTab] = useState<'built-in' | 'favorites' | 'community' | 'my-scripts' | 'ai'>('built-in');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [communityFilter, setCommunityFilter] = useState<'trending' | 'downloaded' | 'rating' | 'newest'>('trending');
  
  // Favorites & Recently Used States
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('quantum_favorite_indicators');
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set(['rsi', 'macd', 'ema20', 'vwap', 'ob', 'volProfile']);
  });

  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('quantum_recent_indicators');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['ema20', 'vwap', 'rsi', 'ob', 'volProfile'];
  });

  // Selected Indicator for Right Side Detail Preview Pane
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<string>('rsi');
  
  // AI Tab State
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiRecommendedIds, setAiRecommendedIds] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);

  // Global Keyboard Shortcut: Ctrl + I / Cmd + I
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open Modal trigger handled via parent state or direct toggle
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Persist Favorites
  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('quantum_favorite_indicators', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  // Track Recently Used
  const addRecentlyUsed = useCallback((id: string) => {
    setRecentlyUsed((prev) => {
      const filtered = prev.filter((item) => item !== id);
      const updated = [id, ...filtered].slice(0, 20);
      localStorage.setItem('quantum_recent_indicators', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Category counts calculation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All Categories': INDICATOR_DATABASE.length };
    INDICATOR_DATABASE.forEach((ind) => {
      counts[ind.category] = (counts[ind.category] || 0) + 1;
    });
    return counts;
  }, []);

  const categoriesList = useMemo(() => {
    const cats = Array.from(new Set(INDICATOR_DATABASE.map((ind) => ind.category)));
    return ['All Categories', ...cats.sort()];
  }, []);

  // Live Instant Search & Filtering
  const filteredIndicators = useMemo(() => {
    return INDICATOR_DATABASE.filter((ind) => {
      // 1. Tab Filter
      if (activeTab === 'favorites' && !favorites.has(ind.id)) return false;
      if (activeTab === 'community' && !ind.isCommunity) return false;
      if (activeTab === 'my-scripts' && !ind.isMyScript) return false;
      if (activeTab === 'ai' && aiRecommendedIds.length > 0 && !aiRecommendedIds.includes(ind.id)) return false;

      // 2. Category Filter
      if (selectedCategory !== 'All Categories' && ind.category !== selectedCategory) return false;

      // 3. Search Query Filter (Fuzzy Search across name, acronym, category, tags)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ind.name.toLowerCase().includes(q);
        const matchesAcronym = ind.acronym.toLowerCase().includes(q);
        const matchesCategory = ind.category.toLowerCase().includes(q);
        const matchesTags = ind.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesName && !matchesAcronym && !matchesCategory && !matchesTags) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (activeTab === 'community') {
        if (communityFilter === 'downloaded') return b.downloads - a.downloads;
        if (communityFilter === 'rating') return b.rating - a.rating;
      }
      return 0;
    });
  }, [activeTab, selectedCategory, searchQuery, favorites, aiRecommendedIds, communityFilter]);

  // Selected Indicator Object
  const selectedIndicator = useMemo(() => {
    return INDICATOR_DATABASE.find((i) => i.id === selectedIndicatorId) || INDICATOR_DATABASE[0];
  }, [selectedIndicatorId]);

  // AI Prompt Natural Language Query Processing
  const handleAiQuery = () => {
    if (!aiPrompt.trim()) return;
    setIsAiProcessing(true);
    setTimeout(() => {
      const q = aiPrompt.toLowerCase();
      const matched = INDICATOR_DATABASE.filter((ind) => {
        if (q.includes('scalp') || q.includes('fast')) return ['ema20', 'vwap', 'pine_custom_scalper', 'rsi'].includes(ind.id);
        if (q.includes('trend')) return ['ema20', 'ema200', 'supertrend', 'ichimoku', 'adx'].includes(ind.id);
        if (q.includes('support') || q.includes('resistance') || q.includes('level')) return ['ob', 'fvg', 'volProfile', 'pivots', 'bb'].includes(ind.id);
        if (q.includes('volume') || q.includes('flow')) return ['volProfile', 'cvd', 'vwap'].includes(ind.id);
        return ind.isAiRecommended;
      }).map((i) => i.id);

      setAiRecommendedIds(matched.length > 0 ? matched : ['ema20', 'vwap', 'rsi', 'ob']);
      setIsAiProcessing(false);
    }, 300);
  };

  // Add Indicator Handler
  const handleAdd = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addRecentlyUsed(id);
    if (onSelectIndicator) {
      onSelectIndicator(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tv-indicator-library-overlay" onClick={onClose}>
      <div className="tv-indicator-library-dialog" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Bar */}
        <div className="tv-dialog-header">
          <div className="tv-dialog-title-group">
            <div className="tv-logo-badge">f(x)</div>
            <div>
              <div className="tv-dialog-title">INDICATOR & STRATEGY LIBRARY</div>
              <div className="tv-dialog-subtitle">Institutional Technical Analysis & Quantitative Algorithms</div>
            </div>
          </div>
          <button className="tv-close-btn" onClick={onClose} title="Close (Esc)">✕</button>
        </div>

        {/* Top Navigation Tabs Bar */}
        <div className="tv-nav-tabs-bar">
          <button 
            className={`tv-tab-btn ${activeTab === 'built-in' ? 'active' : ''}`}
            onClick={() => { setActiveTab('built-in'); setSelectedCategory('All Categories'); }}
          >
            🏛️ Built-in
          </button>
          <button 
            className={`tv-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            ⭐ Favorites <span className="tv-tab-badge">{favorites.size}</span>
          </button>
          <button 
            className={`tv-tab-btn ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            👥 Community <span className="tv-tab-badge">Hot</span>
          </button>
          <button 
            className={`tv-tab-btn ${activeTab === 'my-scripts' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-scripts')}
          >
            📜 My Scripts
          </button>
          <button 
            className={`tv-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            🤖 AI Assistant
          </button>
        </div>

        {/* Mobile Horizontal Category Strip (<768px) */}
        <div className="tv-mobile-category-strip">
          {categoriesList.map((cat) => (
            <button
              key={cat}
              className={`tv-mobile-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 3-Pane Body Workspace */}
        <div className="tv-dialog-body-workspace">
          
          {/* PANE 1: Left Categories Sidebar (Desktop) */}
          <div className="tv-left-categories-sidebar">
            <div className="tv-sidebar-section-title">QUICK ACCESS</div>
            <button
              className={`tv-category-item-btn ${selectedCategory === 'All Categories' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('All Categories')}
            >
              <span>🌐 All Studies</span>
              <span className="tv-cat-count-badge">{categoryCounts['All Categories']}</span>
            </button>
            <button
              className={`tv-category-item-btn ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              <span>⭐ Favorites</span>
              <span className="tv-cat-count-badge">{favorites.size}</span>
            </button>

            {recentlyUsed.length > 0 && (
              <>
                <div className="tv-sidebar-section-title" style={{ marginTop: 10 }}>RECENTLY USED</div>
                {recentlyUsed.slice(0, 5).map((recId) => {
                  const item = INDICATOR_DATABASE.find((i) => i.id === recId);
                  if (!item) return null;
                  return (
                    <button
                      key={recId}
                      className="tv-category-item-btn"
                      onClick={() => handleAdd(recId)}
                    >
                      <span>⏱️ {item.acronym}</span>
                      <span style={{ fontSize: 9, color: 'var(--tv-accent-cyan)' }}>+ Add</span>
                    </button>
                  );
                })}
              </>
            )}

            <div className="tv-sidebar-section-title" style={{ marginTop: 10 }}>CATEGORIES</div>
            {categoriesList.filter((c) => c !== 'All Categories').map((cat) => (
              <button
                key={cat}
                className={`tv-category-item-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span>{cat}</span>
                <span className="tv-cat-count-badge">{categoryCounts[cat] || 0}</span>
              </button>
            ))}
          </div>

          {/* PANE 2: Center Indicators Grid Pane */}
          <div className="tv-center-indicators-pane">
            
            {/* AI Assistant Search Bar Header (If AI tab selected) */}
            {activeTab === 'ai' && (
              <div className="tv-ai-assistant-container">
                <div style={{ fontSize: 11, color: 'var(--tv-accent-cyan)', fontWeight: 800 }}>
                  🤖 Ask AI for Tailored Technical Indicators:
                </div>
                <div className="tv-ai-prompt-box">
                  <input
                    type="text"
                    placeholder="e.g. 'I need a momentum indicator for 5m scalp trades'"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiQuery()}
                    className="tv-ai-input"
                  />
                  <button className="tv-ai-ask-btn" onClick={handleAiQuery} disabled={isAiProcessing}>
                    {isAiProcessing ? 'Analyzing...' : 'Recommend'}
                  </button>
                </div>
              </div>
            )}

            {/* Community Filter Bar Header (If Community tab selected) */}
            {activeTab === 'community' && (
              <div style={{ padding: '8px 16px', background: 'var(--tv-bg-tertiary)', borderBottom: '1px solid var(--tv-border)', display: 'flex', gap: 6 }}>
                {(['trending', 'downloaded', 'rating', 'newest'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCommunityFilter(filter)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      border: 'none',
                      fontSize: 10,
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: communityFilter === filter ? 'var(--tv-accent-cyan)' : 'var(--tv-bg-primary)',
                      color: communityFilter === filter ? '#000' : 'var(--tv-text-secondary)',
                      textTransform: 'capitalize'
                    }}
                  >
                    {filter === 'trending' ? '🔥 Trending' : filter === 'downloaded' ? '📥 Most Downloaded' : filter === 'rating' ? '⭐ Highest Rated' : '🆕 Newest'}
                  </button>
                ))}
              </div>
            )}

            {/* Search Input Bar */}
            <div className="tv-search-header-container">
              <div className="tv-search-input-wrapper">
                <span className="tv-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search indicator, acronym, or tag (e.g. EMA, RSI, VWAP, Order Block)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="tv-search-input"
                />
                {searchQuery && (
                  <button className="tv-clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>
              <span className="tv-search-count-tag">{filteredIndicators.length} Studies</span>
            </div>

            {/* Indicators Cards List Viewport */}
            <div className="tv-indicators-list-scrollable">
              {filteredIndicators.map((ind) => {
                const isFav = favorites.has(ind.id);
                const isSelected = selectedIndicatorId === ind.id;

                return (
                  <div
                    key={ind.id}
                    className={`tv-indicator-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedIndicatorId(ind.id)}
                  >
                    <div className="tv-card-left-group">
                      <div className="tv-category-icon-badge">
                        {ind.category.includes('Volume') ? '📊' :
                         ind.category.includes('Smart Money') ? '🧠' :
                         ind.category.includes('Moving') ? '〰️' :
                         ind.category.includes('Volatility') ? '⚡' :
                         ind.category.includes('AI') ? '🤖' : '📈'}
                      </div>
                      <div className="tv-card-text-block">
                        <div className="tv-card-header-row">
                          <span className="tv-card-name">{ind.name}</span>
                          <span className="tv-card-acronym-tag">{ind.acronym}</span>
                          {ind.isVerified && <span className="tv-card-verified-badge" title="Verified Institutional Code">✓</span>}
                        </div>
                        <div className="tv-card-desc">{ind.shortDesc}</div>
                        <div className="tv-card-meta-sub">
                          <span>by <strong>{ind.author}</strong></span>
                          <span className="tv-star-rating">★ {ind.rating.toFixed(1)}</span>
                          <span>📥 {ind.downloads.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="tv-card-actions-group">
                      <button
                        className={`tv-fav-star-btn ${isFav ? 'active' : ''}`}
                        onClick={(e) => toggleFavorite(ind.id, e)}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFav ? '⭐' : '☆'}
                      </button>

                      <button
                        className="tv-add-indicator-btn"
                        onClick={(e) => handleAdd(ind.id, e)}
                      >
                        ➕ Add
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredIndicators.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--tv-text-dim)', fontSize: 12 }}>
                  No indicators match your search filter. Try searching for "EMA", "RSI", "VWAP", or "Order Block".
                </div>
              )}
            </div>
          </div>

          {/* PANE 3: Right Preview Details Panel (Desktop) */}
          <div className="tv-right-preview-pane">
            <div className="tv-preview-title-block">
              <h3>{selectedIndicator.name}</h3>
              <div className="tv-preview-author">
                <span>By {selectedIndicator.author}</span>
                {selectedIndicator.isVerified && <span style={{ color: 'var(--tv-accent-cyan)' }}>✓ Verified Institutional</span>}
              </div>
            </div>

            {/* Visual SVG Graphic Chart Preview */}
            <div className="tv-preview-canvas-box">
              <svg className="tv-preview-svg" viewBox="0 0 200 80">
                <path d="M0 50 Q 30 20, 60 40 T 120 30 T 180 60 L 200 35" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <path d="M0 60 Q 40 40, 80 55 T 140 40 T 200 50" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                {selectedIndicator.previewType === 'bands' && (
                  <path d="M0 20 Q 50 10, 100 25 T 200 15 L 200 65 Q 150 75, 100 60 T 0 70 Z" fill="rgba(56, 189, 248, 0.1)" />
                )}
                {selectedIndicator.previewType === 'histogram' && (
                  <>
                    <rect x="20" y="40" width="8" height="20" fill="#10b981" />
                    <rect x="40" y="30" width="8" height="30" fill="#10b981" />
                    <rect x="60" y="45" width="8" height="15" fill="#ef4444" />
                    <rect x="80" y="50" width="8" height="25" fill="#ef4444" />
                    <rect x="100" y="35" width="8" height="25" fill="#10b981" />
                  </>
                )}
              </svg>
              <span style={{ position: 'absolute', bottom: 4, right: 8, fontSize: 8, color: 'var(--tv-text-dim)', fontFamily: 'var(--tv-font-mono)' }}>
                {selectedIndicator.outputType}
              </span>
            </div>

            {/* Indicator Description */}
            <div className="tv-preview-section">
              <span className="tv-section-label">Overview</span>
              <div className="tv-preview-text">{selectedIndicator.fullDesc}</div>
            </div>

            {/* Default Parameters */}
            <div className="tv-preview-section">
              <span className="tv-section-label">Default Parameters</span>
              <div className="tv-params-tags-list">
                {Object.entries(selectedIndicator.defaultInputs).map(([k, v]) => (
                  <span key={k} className="tv-param-pill">
                    {k}: <strong>{String(v)}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Documentation & Usage Tips */}
            <div className="tv-preview-section">
              <span className="tv-section-label">Trading Strategy Usage</span>
              <div className="tv-doc-box">
                💡 <strong>Pro Tip:</strong> {selectedIndicator.exampleUsage}
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              className="tv-add-main-btn"
              onClick={() => handleAdd(selectedIndicator.id)}
            >
              ➕ Add {selectedIndicator.acronym} to Active Chart
            </button>
          </div>

        </div>
      </div>
    </div>
  );
});

IndicatorLibraryModal.displayName = 'IndicatorLibraryModal';
