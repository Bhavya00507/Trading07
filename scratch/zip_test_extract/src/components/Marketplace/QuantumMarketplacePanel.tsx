import React, { useState, useEffect } from 'react';

export const QuantumMarketplacePanel: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [library, setLibrary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'store' | 'library' | 'creator'>('store');
  const [creatorAnalytics, setCreatorAnalytics] = useState<any>(null);

  const fetchProducts = () => {
    fetch(`/api/marketplace/products?query=${encodeURIComponent(searchQuery)}&category=${selectedCategory}`)
      .then(res => res.json())
      .then(d => setProducts(d.products || []))
      .catch(() => {});
  };

  const fetchLibrary = () => {
    fetch('/api/marketplace/library')
      .then(res => res.json())
      .then(d => setLibrary(d))
      .catch(() => {});
  };

  const fetchCreator = () => {
    fetch('/api/marketplace/creator/analytics')
      .then(res => res.json())
      .then(d => setCreatorAnalytics(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchProducts();
    fetchLibrary();
    fetchCreator();
  }, [searchQuery, selectedCategory]);

  const handleInstall = async (productId: str) => {
    try {
      const res = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId })
      });
      if (res.ok) {
        fetchProducts();
        fetchLibrary();
      }
    } catch {}
  };

  const handleUninstall = async (productId: str) => {
    try {
      const res = await fetch('/api/marketplace/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId })
      });
      if (res.ok) {
        fetchProducts();
        fetchLibrary();
      }
    } catch {}
  };

  const installedIds = library?.installed_products?.map((p: any) => p.product_id) || [];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 8 }}>
            🛍️ QUANTUM MARKETPLACE ECOSYSTEM (v4.0)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Indicators, Trading Strategies, AI Models, EAs, Plugins, & Creator Portal
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setActiveTab('store')}
            style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10,
              backgroundColor: activeTab === 'store' ? '#a78bfa' : '#1e293b', color: activeTab === 'store' ? '#0f172a' : '#cbd5e1'
            }}
          >
            🏪 Store
          </button>
          <button
            onClick={() => setActiveTab('library')}
            style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10,
              backgroundColor: activeTab === 'library' ? '#38bdf8' : '#1e293b', color: activeTab === 'library' ? '#0f172a' : '#cbd5e1'
            }}
          >
            📚 My Library ({installedIds.length})
          </button>
          <button
            onClick={() => setActiveTab('creator')}
            style={{
              padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10,
              backgroundColor: activeTab === 'creator' ? '#10b981' : '#1e293b', color: activeTab === 'creator' ? '#0f172a' : '#cbd5e1'
            }}
          >
            🚀 Creator Portal
          </button>
        </div>
      </div>

      {activeTab === 'store' && (
        <>
          {/* Search & Categories Bar */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search indicators, strategies, AI models..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: 6, borderRadius: 4, backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#fff', fontSize: 10 }}
            />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{ padding: 6, borderRadius: 4, backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#fff', fontSize: 10 }}
            >
              <option value="ALL">All Categories</option>
              <option value="Technical Indicators">Technical Indicators</option>
              <option value="Trading Strategies">Trading Strategies</option>
              <option value="AI Models">AI Models</option>
            </select>
          </div>

          {/* Products Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {products.map(p => {
              const isInstalled = installedIds.includes(p.product_id);
              return (
                <div key={p.product_id} style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: '#f8fafc', fontSize: 12 }}>{p.name}</span>
                    <span style={{ color: p.price_usd === 0 ? '#10b981' : '#f59e0b', fontWeight: 900 }}>
                      {p.price_usd === 0 ? 'FREE' : `$${p.price_usd}`}
                    </span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 9 }}>By {p.author} • ⭐ {p.rating} ({p.reviews_count})</div>
                  <div style={{ color: '#cbd5e1', fontSize: 10, flex: 1, margin: '4px 0' }}>{p.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: '#64748b' }}>v{p.version} • {p.downloads_count} dl</span>
                    {isInstalled ? (
                      <button onClick={() => handleUninstall(p.product_id)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 9 }}>
                        Uninstall
                      </button>
                    ) : (
                      <button onClick={() => handleInstall(p.product_id)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, cursor: 'pointer', fontSize: 9 }}>
                        ⚡ 1-Click Install
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'library' && library && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>📚 MY INSTALLED PRODUCTS ({library.installed_products?.length})</span>
          {library.installed_products?.map((ip: any) => (
            <div key={ip.product_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, backgroundColor: '#1e293b', borderRadius: 6 }}>
              <div>
                <div style={{ fontWeight: 800 }}>{ip.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>Category: {ip.category} | Version: v{ip.version}</div>
              </div>
              <button onClick={() => handleUninstall(ip.product_id)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 9 }}>Uninstall</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'creator' && creatorAnalytics && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 800, color: '#10b981', fontSize: 12 }}>🚀 CREATOR DASHBOARD & REVENUE ANALYTICS</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 4 }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>TOTAL REVENUE</div>
              <div style={{ fontWeight: 900, color: '#10b981', fontSize: 14 }}>${creatorAnalytics.total_revenue_usd}</div>
            </div>
            <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 4 }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>TOTAL DOWNLOADS</div>
              <div style={{ fontWeight: 900, color: '#38bdf8', fontSize: 14 }}>{creatorAnalytics.total_downloads}</div>
            </div>
            <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 4 }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>SUBSCRIBERS</div>
              <div style={{ fontWeight: 900, color: '#a78bfa', fontSize: 14 }}>{creatorAnalytics.active_subscribers}</div>
            </div>
            <div style={{ padding: 8, backgroundColor: '#1e293b', borderRadius: 4 }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>AVG RATING</div>
              <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: 14 }}>⭐ {creatorAnalytics.average_rating}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
