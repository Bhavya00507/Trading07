import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { getMarketNews } from '../services/api';

interface NewsItem {
  id: string;
  time: string;
  source: 'REUTERS' | 'BLOOMBERG' | 'CNBC';
  headline: string;
  summary: string;
  symbols: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  category: 'crypto' | 'forex' | 'indices' | 'metals';
  timestamp: number; // epoch ms
}

const initialNews: NewsItem[] = [
  {
    id: '1',
    time: 'Just now',
    source: 'REUTERS',
    headline: 'Bitcoin Eyes $70k Resistance as Institutional Inflows Accelerate',
    summary: 'Spot Bitcoin ETFs recorded a net inflow of $350 million yesterday, marking five consecutive days of positive inflows. Analysts believe the momentum could push BTC past the critical $70,000 resistance level by the weekend.',
    symbols: ['BTCUSDT', 'ETHUSDT'],
    sentiment: 'bullish',
    category: 'crypto',
    timestamp: Date.now() - 60000
  },
  {
    id: '2',
    time: '25 mins ago',
    source: 'BLOOMBERG',
    headline: 'Fed Chair Powell Hints at Rate Path as Inflation Moderates',
    summary: 'In his latest address, Federal Reserve Chair Jerome Powell suggested that while inflation is moderating, the committee will remain data-dependent. Treasury yields ticked lower following the remarks, boosting index futures.',
    symbols: ['US30', 'SPX500', 'NAS100', 'EURUSD'],
    sentiment: 'neutral',
    category: 'indices',
    timestamp: Date.now() - 25 * 60000
  },
  {
    id: '3',
    time: '45 mins ago',
    source: 'CNBC',
    headline: 'Gold Surges to Record Highs Amid Escalating Safe-Haven Demand',
    summary: 'Spot gold prices hovered near all-time highs as geopolitical uncertainties in Eastern Europe and the Middle East continue to drive investors toward safe-haven assets. Silver followed the rally, breaching key resistance.',
    symbols: ['XAUUSD', 'XAGUSD'],
    sentiment: 'bullish',
    category: 'metals',
    timestamp: Date.now() - 45 * 60000
  },
  {
    id: '4',
    time: '1 hour ago',
    source: 'REUTERS',
    headline: 'ECB Policymakers Lean Toward Rate Cut in Upcoming Session',
    summary: 'European Central Bank officials are increasingly coalescing around a 25 basis point rate cut, citing cooling eurozone CPI print and slowing credit growth. EURUSD traded lower near 1.1680 support.',
    symbols: ['EURUSD'],
    sentiment: 'bearish',
    category: 'forex',
    timestamp: Date.now() - 60 * 60000
  },
  {
    id: '5',
    time: '2 hours ago',
    source: 'BLOOMBERG',
    headline: 'Nasdaq 100 Gains Led by Tech Earnings and AI Cloud Demand Boost',
    summary: 'Tech heavyweights reported better-than-expected cloud revenue growth, sparking a broad rally in semiconductor and software names. The Nasdaq 100 index outperformed other US benchmarks, trading up 1.4% on the day.',
    symbols: ['NAS100', 'SPX500'],
    sentiment: 'bullish',
    category: 'indices',
    timestamp: Date.now() - 120 * 60000
  },
  {
    id: '6',
    time: '3 hours ago',
    source: 'REUTERS',
    headline: 'Bank of England Stance Remains Hawkish Despite Slowing Growth',
    summary: 'Sticky service inflation in the UK has prompted the BoE to keep interest rates unchanged at 5.25%. Sterling strengthened slightly against the Dollar, hitting 1.3650 before retracing.',
    symbols: ['GBPUSD'],
    sentiment: 'neutral',
    category: 'forex',
    timestamp: Date.now() - 180 * 60000
  },
  {
    id: '7',
    time: '4 hours ago',
    source: 'BLOOMBERG',
    headline: 'Yen Climbs Against Dollar as BOJ Signals Potential Hikes',
    summary: 'Bank of Japan Governor Ueda stated that another rate hike is on the table if the economy performs as projected. The USDJPY cross plunged below 144.50, causing high volatility in global index pairs.',
    symbols: ['USDJPY', 'GER40'],
    sentiment: 'bearish',
    category: 'forex',
    timestamp: Date.now() - 240 * 60000
  },
  {
    id: '8',
    time: '5 hours ago',
    source: 'CNBC',
    headline: 'Silver Output Deficit Widens; Industrial Demand Hits All-Time Highs',
    summary: 'The Silver Institute reported that the structural silver market deficit is projected to persist for a fourth consecutive year, driven by solar panel manufacturing. Spot silver traded up 2.5%.',
    symbols: ['XAGUSD', 'XAUUSD'],
    sentiment: 'bullish',
    category: 'metals',
    timestamp: Date.now() - 300 * 60000
  }
];

const breakingPool: Omit<NewsItem, 'id' | 'time' | 'timestamp'>[] = [
  {
    source: 'REUTERS',
    headline: 'FLASH: US Core Retail Sales Rise 0.5% in May, Exceeding Estimates',
    summary: 'Department of Commerce releases monthly retail data showing resilient consumer spending. Yields push higher as markets recalibrate probability of a September Federal Reserve rate cut.',
    symbols: ['US30', 'SPX500', 'EURUSD'],
    sentiment: 'bullish',
    category: 'indices'
  },
  {
    source: 'BLOOMBERG',
    headline: 'BREAKING: SEC Approves Spot Ethereum Options Trading on Major Exchanges',
    summary: 'The Securities and Exchange Commission approved rule changes permitting option contracts on spot Ethereum exchange-traded funds. ETH prices jumped 3.2% in immediate response.',
    symbols: ['ETHUSDT', 'BTCUSDT'],
    sentiment: 'bullish',
    category: 'crypto'
  },
  {
    source: 'CNBC',
    headline: 'FLASH: Germany Manufacturing PMI Contracted to 45.1 in June vs 46.4 Expected',
    summary: 'The HCOB German Flash Manufacturing Purchasing Managers Index fell to a three-month low, dampening hopes of a structural export turnaround. EURUSD hit daily lows.',
    symbols: ['EURUSD', 'GER40'],
    sentiment: 'bearish',
    category: 'forex'
  },
  {
    source: 'REUTERS',
    headline: 'BREAKING: Saudi Arabia Extends Voluntary Crude Production Cuts to End of Q3',
    summary: 'Ministry of Energy confirmed that the kingdom will maintain its unilateral 1 million barrel per day production reduction to support stability in physical global oil markets.',
    symbols: ['US30', 'XAUUSD'],
    sentiment: 'neutral',
    category: 'metals'
  }
];

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  fontSize: 11,
};

const filterBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  background: 'var(--bg-secondary)',
  borderBottom: '1px solid var(--border-color)',
  flexWrap: 'wrap',
};

const searchInput: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  outline: 'none',
  width: 160,
};

const selectStyle: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: 11,
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 3,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const newsListWrap: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const newsCardStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.01)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--text-secondary)',
};

const headlineStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const summaryStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
};

const tagListStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginTop: 4,
  flexWrap: 'wrap',
};

const tagStyle = (active: boolean): React.CSSProperties => ({
  padding: '1px 5px',
  borderRadius: 3,
  fontSize: 8,
  fontWeight: 700,
  backgroundColor: active ? 'var(--accent)' : 'var(--bg-tertiary)',
  color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
  border: 'none',
  cursor: 'pointer',
});

const sentimentBadgeStyle = (sentiment: NewsItem['sentiment']): React.CSSProperties => {
  const isBull = sentiment === 'bullish';
  const isBear = sentiment === 'bearish';
  return {
    padding: '1px 5px',
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 700,
    backgroundColor: isBull ? 'var(--success-bg)' : isBear ? 'var(--danger-bg)' : 'var(--bg-tertiary)',
    color: isBull ? 'var(--success)' : isBear ? 'var(--danger)' : 'var(--text-secondary)',
  };
};

const NewsPanel: React.FC = () => {
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const addToast = useAppStore((s) => s.addToast);
  
  const [news, setNews] = useState<NewsItem[]>(initialNews);
  const [searchSymbol, setSearchSymbol] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('news-bookmarks');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  const usedPoolIndices = useRef<Set<number>>(new Set());

  const fetchNews = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await getMarketNews();
      setNews((prev) => {
        if (prev.length > 0 && data.length > 0 && data[0].headline !== prev[0].headline) {
          addToast('info', `Breaking news: ${data[0].headline}`);
        }
        return data;
      });
    } catch (err) {
      console.warn('Failed to fetch news from API:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [addToast]);

  // Fetch real news from backend with simulated fallback
  useEffect(() => {
    fetchNews();
    const timer = setInterval(fetchNews, 30000); // 30s auto refresh

    return () => {
      clearInterval(timer);
    };
  }, [fetchNews]);

  const handleSymbolClick = (sym: string) => {
    setSearchSymbol(sym);
  };

  const toggleBookmark = (id: string) => {
    const next = new Set(bookmarkedIds);
    if (next.has(id)) {
      next.delete(id);
      addToast('info', 'Removed bookmark.');
    } else {
      next.add(id);
      addToast('success', 'Bookmarked article.');
    }
    setBookmarkedIds(next);
    localStorage.setItem('news-bookmarks', JSON.stringify(Array.from(next)));
  };

  const filteredNews = useMemo(() => {
    return news.filter(item => {
      // Bookmarks Filter
      if (showBookmarksOnly && !bookmarkedIds.has(item.id)) {
        return false;
      }

      // Category Filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Keyword / Symbol Filter
      const q = searchSymbol.trim().toUpperCase();
      if (!q) return true;

      return (
        item.symbols.some(s => s.toUpperCase().includes(q)) ||
        item.headline.toUpperCase().includes(q) ||
        item.summary.toUpperCase().includes(q)
      );
    });
  }, [news, searchSymbol, selectedCategory, showBookmarksOnly, bookmarkedIds]);

  return (
    <div style={containerStyle}>
      <div style={filterBar}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 9 }}>Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All Categories</option>
            <option value="FOREX">Forex News</option>
            <option value="CRYPTO">Crypto News</option>
            <option value="INDICES">Indices News</option>
            <option value="METALS">Metals News</option>
          </select>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: 9 }}>Search:</span>
          <input
            type="text"
            placeholder="Search symbol or keyword..."
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            style={searchInput}
          />
        </div>

        <button
          onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
          style={{
            padding: '4px 8px',
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 3,
            background: showBookmarksOnly ? '#d4af37' : 'var(--bg-tertiary)',
            color: showBookmarksOnly ? '#070b14' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            cursor: 'pointer',
          }}
        >
          🔖 {showBookmarksOnly ? 'Show All News' : 'Show Bookmarks Only'}
        </button>

        {selectedInstrument && (
          <button
            onClick={() => setSearchSymbol(selectedInstrument.symbol)}
            style={{
              padding: '4px 8px',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 3,
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
            }}
          >
            Use {selectedInstrument.symbol}
          </button>
        )}

        {searchSymbol && (
          <button
            onClick={() => setSearchSymbol('')}
            style={{
              padding: '4px 8px',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 3,
              background: 'transparent',
              color: 'var(--danger)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Clear Search
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            {isRefreshing ? 'Refreshing...' : 'Auto-refresh active (15s)'}
          </span>
          <button
            onClick={fetchNews}
            disabled={isRefreshing}
            style={{
              padding: '4px 8px',
              fontSize: 9,
              fontWeight: 700,
              borderRadius: 3,
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Refresh Now
          </button>
        </div>
      </div>

      <div style={newsListWrap}>
        {filteredNews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
            No news articles match current filters.
          </div>
        ) : (
          filteredNews.map((item) => {
            const isBookmarked = bookmarkedIds.has(item.id);
            return (
              <div key={item.id} style={newsCardStyle}>
                <div style={metaRowStyle}>
                  <span style={{ color: item.source === 'REUTERS' ? '#1d4ed8' : item.source === 'BLOOMBERG' ? '#f59e0b' : 'var(--text-secondary)' }}>
                    {item.source}
                  </span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', border: '1px solid var(--border-color)', padding: '0 3px', borderRadius: 2 }}>{item.category}</span>
                    <span style={sentimentBadgeStyle(item.sentiment)}>{item.sentiment.toUpperCase()}</span>
                    <span>{item.time}</span>
                    <button
                      onClick={() => toggleBookmark(item.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isBookmarked ? '#d4af37' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 11
                      }}
                      title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                    >
                      {isBookmarked ? '★' : '☆'}
                    </button>
                  </div>
                </div>
                <div style={headlineStyle}>{item.headline}</div>
                <div style={summaryStyle}>{item.summary}</div>
                <div style={tagListStyle}>
                  {item.symbols.map(sym => (
                    <button
                      key={sym}
                      onClick={() => handleSymbolClick(sym)}
                      style={tagStyle(searchSymbol.toUpperCase() === sym.toUpperCase())}
                    >
                      #{sym}
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NewsPanel;
