import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(7, 11, 20, 0.85)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '80px',
  zIndex: 99999,
};

const modalStyle: React.CSSProperties = {
  background: '#0d1322', // Panel color
  border: '1px solid #1b2235', // Borders color
  borderRadius: '6px',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  fontFamily: 'var(--font-sans)',
};

const searchInputStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  background: '#070b14',
  border: 'none',
  borderBottom: '1px solid #1b2235',
  color: 'var(--text-primary)',
  outline: 'none',
  width: '100%',
};

const listStyle: React.CSSProperties = {
  maxHeight: '300px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: '6px 0',
};

const groupHeaderStyle: React.CSSProperties = {
  padding: '6px 16px',
  fontSize: '9px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--accent)',
  letterSpacing: '0.05em',
};

const itemStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  fontSize: '12px',
  color: active ? '#000' : 'var(--text-primary)',
  background: active ? 'var(--accent)' : 'transparent',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

interface PaletteItem {
  id: string;
  name: string;
  type: 'symbol' | 'page';
  symbolKey?: string;
  tabKey?: string;
}

const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const watchlist = useAppStore((s) => s.watchlist);
  const setSelectedInstrument = useAppStore((s) => s.setSelectedInstrument);

  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Hotkey hook: CTRL + K to open/close, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setSelectedIndex(0);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // List of all items
  const items: PaletteItem[] = useMemo(() => {
    const pageItems: PaletteItem[] = [
      { id: 'pos', name: 'Positions', type: 'page', tabKey: 'positions' },
      { id: 'ord', name: 'Orders', type: 'page', tabKey: 'orders' },
      { id: 'his', name: 'History', type: 'page', tabKey: 'history' },
      { id: 'cal', name: 'Calendar', type: 'page', tabKey: 'calendar' },
      { id: 'new', name: 'News', type: 'page', tabKey: 'news' },
      { id: 'rep', name: 'Replay', type: 'page', tabKey: 'replay' },
      { id: 'tes', name: 'Strategy Tester', type: 'page', tabKey: 'strategytester' },
      { id: 'jou', name: 'AI Journal', type: 'page', tabKey: 'journal' },
      { id: 'sca', name: 'Market Scanner', type: 'page', tabKey: 'scanner' },
      { id: 'ais', name: 'AI Signals', type: 'page', tabKey: 'aiwatchlist' },
      { id: 'dom', name: 'Depth of Market (DOM) Ladder', type: 'page', tabKey: 'dom' },
      { id: 'bro', name: 'Broker Manager', type: 'page', tabKey: 'broker' },
      { id: 'cpy', name: 'Copy Trading', type: 'page', tabKey: 'copytrading' },
      { id: 'opt', name: 'Portfolio Optimizer', type: 'page', tabKey: 'portfoliooptimizer' },
      { id: 'mla', name: 'ML Analytics', type: 'page', tabKey: 'mlanalytics' },
      { id: 'mkt', name: 'Strategy Marketplace', type: 'page', tabKey: 'strategymarketplace' },
      { id: 'fix', name: 'FIX Protocol Gateway', type: 'page', tabKey: 'fixprotocol' },
      { id: 'repgen', name: 'Report Generator', type: 'page', tabKey: 'reportgenerator' },
      { id: 'qnt', name: 'Quant Research Lab', type: 'page', tabKey: 'quantresearch' },
      { id: 'rsk', name: 'Risk Desk', type: 'page', tabKey: 'riskdesk' },
      { id: 'ast', name: 'AI Assistant & Coach', type: 'page', tabKey: 'aiassistant' },
      { id: 'plb', name: 'Trade Playbooks', type: 'page', tabKey: 'playbooks' },
    ];

    // Symbols standard mapping
    const targetSymbols = ['BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'XAUUSD', 'US30', 'NAS100', 'SPX500'];
    const symbolItems: PaletteItem[] = targetSymbols.map((sym) => {
      const match = watchlist.find((w) => {
        const wSym = w.symbol.toUpperCase();
        const targetSym = sym.toUpperCase();
        return wSym === targetSym || 
               wSym === targetSym + 'T' || 
               (targetSym.endsWith('USD') && wSym === targetSym.replace('USD', 'USDT'));
      });
      return {
        id: `sym-${sym}`,
        name: `Trade ${sym}`,
        type: 'symbol',
        symbolKey: match?.symbol ?? sym,
      };
    });

    return [...pageItems, ...symbolItems];
  }, [watchlist]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.symbolKey && item.symbolKey.toLowerCase().includes(q))
    );
  }, [items, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelectItem(filteredItems[selectedIndex]);
      }
    }
  };

  const handleSelectItem = (item: PaletteItem) => {
    if (item.type === 'symbol' && item.symbolKey) {
      const match = watchlist.find((w) => w.symbol === item.symbolKey);
      if (match) {
        setSelectedInstrument(match);
      }
    } else if (item.type === 'page' && item.tabKey) {
      // Trigger navigation event
      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: item.tabKey }));
      window.dispatchEvent(new Event('expand-bottom-panel'));
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  // Group filtered items for nice header groups
  const pages = filteredItems.filter((i) => i.type === 'page');
  const symbols = filteredItems.filter((i) => i.type === 'symbol');

  return (
    <div style={overlayStyle} onClick={() => setIsOpen(false)}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search symbols, tools, pages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInputStyle}
        />

        <div style={listStyle}>
          {pages.length > 0 && (
            <>
              <div style={groupHeaderStyle}>Pages &amp; Tools Navigation</div>
              {pages.map((item) => {
                const idx = filteredItems.indexOf(item);
                const active = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    style={itemStyle(active)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelectItem(item)}
                  >
                    <span>{item.name}</span>
                    <span style={{ fontSize: '9px', opacity: 0.6 }}>Page</span>
                  </div>
                );
              })}
            </>
          )}

          {symbols.length > 0 && (
            <>
              <div style={{ ...groupHeaderStyle, marginTop: '8px' }}>Instrument Symbol Feeds</div>
              {symbols.map((item) => {
                const idx = filteredItems.indexOf(item);
                const active = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    style={itemStyle(active)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelectItem(item)}
                  >
                    <span>{item.symbolKey}</span>
                    <span style={{ fontSize: '9px', opacity: 0.6 }}>Market Pair</span>
                  </div>
                );
              })}
            </>
          )}

          {filteredItems.length === 0 && (
            <div style={{ padding: '16px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
              No matches found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
