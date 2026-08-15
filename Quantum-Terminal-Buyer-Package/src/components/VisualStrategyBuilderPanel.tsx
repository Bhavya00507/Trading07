import React, { useState, useEffect, useMemo } from 'react';
import { useStrategyBuilderStore, StrategyNodeData } from '../store/strategyBuilderStore';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  gap: '16px',
  padding: '16px',
  backgroundColor: '#050811',
  color: '#f8fafc',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  overflowY: 'auto',
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #0f172a 0%, #090d16 100%)',
  border: '1px solid #1e293b',
  borderRadius: '10px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 800,
  textTransform: 'uppercase',
  color: '#38bdf8',
  borderBottom: '1px solid #1e293b',
  paddingBottom: '6px',
  letterSpacing: '0.05em',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const btnStyle = (active = false, isDanger = false, isPrimary = false): React.CSSProperties => ({
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: '6px',
  border: 'none',
  background: isPrimary
    ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'
    : active
    ? '#0ea5e9'
    : isDanger
    ? 'rgba(239, 68, 68, 0.2)'
    : '#1e293b',
  color: isPrimary ? '#ffffff' : active ? '#ffffff' : isDanger ? '#ef4444' : '#cbd5e1',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '11px',
  fontWeight: 700,
  borderRadius: '6px',
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#cbd5e1',
  cursor: 'pointer',
};

const buttonPrimaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
  color: '#ffffff',
  border: '1px solid #38bdf8',
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '11px',
  backgroundColor: '#090d16',
  border: '1px solid #1e293b',
  borderRadius: '6px',
  color: '#f8fafc',
  outline: 'none',
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const NODE_PALETTE: { category: string; nodes: { type: any; label: string; data: Record<string, any> }[] }[] = [
  {
    category: 'Indicators',
    nodes: [
      { type: 'INDICATOR', label: 'EMA (Exponential MA)', data: { indicator: 'EMA', period: 20 } },
      { type: 'INDICATOR', label: 'SMA (Simple MA)', data: { indicator: 'SMA', period: 50 } },
      { type: 'INDICATOR', label: 'RSI (Relative Strength)', data: { indicator: 'RSI', period: 14 } },
      { type: 'INDICATOR', label: 'MACD Indicator', data: { indicator: 'MACD', fast: 12, slow: 26, signal: 9 } },
      { type: 'INDICATOR', label: 'SuperTrend', data: { indicator: 'SuperTrend', atr_period: 10, multiplier: 3.0 } },
      { type: 'INDICATOR', label: 'Order Block Level', data: { indicator: 'OrderBlock', type: 'Bullish' } },
      { type: 'INDICATOR', label: 'Fair Value Gap (FVG)', data: { indicator: 'FVG', threshold: 0.5 } },
    ],
  },
  {
    category: 'Logic & Conditions',
    nodes: [
      { type: 'LOGIC', label: 'Cross Above', data: { operator: 'crosses_above' } },
      { type: 'LOGIC', label: 'Cross Below', data: { operator: 'crosses_below' } },
      { type: 'LOGIC', label: 'Greater Than ( > )', data: { operator: '>' } },
      { type: 'LOGIC', label: 'Less Than ( < )', data: { operator: '<' } },
      { type: 'LOGIC', label: 'AND Gate', data: { operator: 'AND' } },
      { type: 'LOGIC', label: 'OR Gate', data: { operator: 'OR' } },
    ],
  },
  {
    category: 'Risk Management',
    nodes: [
      { type: 'RISK', label: 'Fixed SL & TP', data: { sl_pct: 1.5, tp_pct: 3.0, risk_pct: 1.0 } },
      { type: 'RISK', label: 'ATR Trailing Stop', data: { sl_pct: 1.5, trailing: true, risk_pct: 1.0 } },
      { type: 'RISK', label: 'Break Even Trigger', data: { trigger_rr: 1.5 } },
      { type: 'RISK', label: 'Daily Max Loss Limit', data: { max_daily_loss_pct: 3.0 } },
    ],
  },
  {
    category: 'Orders & Actions',
    nodes: [
      { type: 'ORDER', label: 'Market Buy Order', data: { side: 'buy', quantity: 1.0 } },
      { type: 'ORDER', label: 'Market Sell Order', data: { side: 'sell', quantity: 1.0 } },
      { type: 'ORDER', label: 'Limit Order', data: { side: 'buy', quantity: 1.0, limit_offset: 0.5 } },
      { type: 'ORDER', label: 'Partial Close (50%)', data: { action: 'partial_close', pct: 50 } },
    ],
  },
];

export const VisualStrategyBuilderPanel: React.FC = () => {
  const {
    strategyName,
    description,
    category,
    version,
    nodes,
    edges,
    selectedNodeId,
    validationErrors,
    aiSuggestions,
    targetLang,
    generatedCode,
    optimizationResults,
    marketplaceItems,
    versions,
    setStrategyMeta,
    addNode,
    removeNode,
    connectNodes,
    updateNodeData,
    selectNode,
    validateGraph,
    aiGenerateStrategy,
    aiImproveStrategy,
    generateCode,
    importCode,
    runOptimization,
    fetchMarketplace,
  } = useStrategyBuilderStore();

  const [activeTab, setActiveTab] = useState<'canvas' | 'code' | 'optimization' | 'marketplace' | 'versions'>('canvas');

  // Modals & Inputs
  const [showAiGenModal, setShowAiGenModal] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCodeInput, setImportCodeInput] = useState('');
  const [importLang, setImportLang] = useState('Pine Script v6');

  // Canvas Viewport Transformation (Pan & Zoom)
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  useEffect(() => {
    validateGraph();
    fetchMarketplace();
  }, []);

  const handleAddPaletteNode = (item: { type: any; label: string; data: Record<string, any> }) => {
    const newNode: StrategyNodeData = {
      id: `n_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: item.type,
      label: item.label,
      category: item.type,
      position: { x: 300 + nodes.length * 30, y: 150 + (nodes.length % 5) * 40 },
      data: { ...item.data },
    };
    addNode(newNode);

    // Auto-connect to last node if present
    if (nodes.length > 0) {
      const prevId = nodes[nodes.length - 1].id;
      connectNodes(prevId, newNode.id);
    }
  };

  const handleAiPromptSubmit = async () => {
    if (!aiPromptInput) return;
    await aiGenerateStrategy(aiPromptInput);
    setShowAiGenModal(false);
    setAiPromptInput('');
  };

  const handleImportSubmit = async () => {
    if (!importCodeInput) return;
    await importCode(importCodeInput, importLang);
    setShowImportModal(false);
    setImportCodeInput('');
  };

  return (
    <div style={containerStyle}>
      {/* Top Header & Strategy Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#f8fafc', letterSpacing: '0.04em' }}>
              {strategyName}
            </h2>
            <span style={{ fontSize: '10px', color: '#0ea5e9', fontWeight: 800, padding: '2px 8px', background: 'rgba(14,165,233,0.15)', borderRadius: '4px' }}>
              v{version} • {category}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>{description}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button style={btnStyle(false, false, true)} onClick={() => setShowAiGenModal(true)}>
            🤖 AI Strategy Generator
          </button>
          <button style={btnStyle()} onClick={aiImproveStrategy}>
            ⚡ AI Optimize Graph
          </button>
          <button style={btnStyle()} onClick={validateGraph}>
            ✓ Validate Graph
          </button>
          <button style={btnStyle()} onClick={() => { generateCode(targetLang); setActiveTab('code'); }}>
            💻 Export Code
          </button>
        </div>
      </div>

      {/* Validation Warnings Banner */}
      {validationErrors.length > 0 && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef444455', borderRadius: '8px', padding: '10px 14px', fontSize: '11px', color: '#ef4444' }}>
          <strong>Graph Validation Warnings ({validationErrors.length}):</strong>
          <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
        <button style={btnStyle(activeTab === 'canvas')} onClick={() => setActiveTab('canvas')}>
          🎨 Visual Node Canvas ({nodes.length} Nodes)
        </button>
        <button style={btnStyle(activeTab === 'code')} onClick={() => { setActiveTab('code'); generateCode(targetLang); }}>
          💻 Code Generator &amp; Converter
        </button>
        <button style={btnStyle(activeTab === 'optimization')} onClick={() => { setActiveTab('optimization'); runOptimization(); }}>
          ⚙️ Parameter Sweep &amp; Optimization
        </button>
        <button style={btnStyle(activeTab === 'marketplace')} onClick={() => setActiveTab('marketplace')}>
          🌐 Strategy Marketplace ({marketplaceItems.length})
        </button>
        <button style={btnStyle(activeTab === 'versions')} onClick={() => setActiveTab('versions')}>
          📜 Version History ({versions.length})
        </button>
      </div>

      {/* --- TAB 1: VISUAL NODE CANVAS --- */}
      {activeTab === 'canvas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: '16px', height: '600px' }}>
          {/* Palette Sidebar */}
          <div style={{ ...cardStyle, overflowY: 'auto' }}>
            <div style={titleStyle}>Node Library Palette</div>

            {NODE_PALETTE.map((cat) => (
              <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginTop: '6px' }}>{cat.category}</span>
                {cat.nodes.map((item, idx) => (
                  <button
                    key={idx}
                    style={{
                      padding: '8px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textAlign: 'left',
                      background: '#090d16',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => handleAddPaletteNode(item)}
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Canvas Area */}
          <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden', padding: 0, background: '#070a14' }}>
            {/* Grid background texture */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                backgroundSize: `${20 * zoomLevel}px ${20 * zoomLevel}px`,
                opacity: 0.6,
              }}
            />

            {/* Canvas Toolbar overlay */}
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: '6px', zIndex: 10 }}>
              <button style={btnStyle()} onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.1))}>Zoom +</button>
              <button style={btnStyle()} onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}>Zoom -</button>
              <button style={btnStyle()} onClick={() => setZoomLevel(1.0)}>Reset Zoom ({Math.round(zoomLevel * 100)}%)</button>
            </div>

            {/* Connector SVG Lines */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
              {edges.map((e) => {
                const srcNode = nodes.find((n) => n.id === e.source);
                const tgtNode = nodes.find((n) => n.id === e.target);
                if (!srcNode || !tgtNode) return null;
                const x1 = (srcNode.position.x + 90) * zoomLevel;
                const y1 = (srcNode.position.y + 25) * zoomLevel;
                const x2 = tgtNode.position.x * zoomLevel;
                const y2 = (tgtNode.position.y + 25) * zoomLevel;
                return (
                  <line
                    key={e.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    strokeDasharray="4,4"
                  />
                );
              })}
            </svg>

            {/* Nodes Render Loop */}
            <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: '100%', height: '100%', position: 'relative' }}>
              {nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                let color = '#38bdf8';
                if (node.type === 'RISK') color = '#f59e0b';
                if (node.type === 'ORDER') color = '#10b981';
                if (node.type === 'LOGIC') color = '#a855f7';

                return (
                  <div
                    key={node.id}
                    onClick={() => selectNode(node.id)}
                    style={{
                      position: 'absolute',
                      left: node.position.x,
                      top: node.position.y,
                      width: '180px',
                      background: isSelected ? '#0f172a' : '#090d16',
                      border: `2px solid ${isSelected ? '#0ea5e9' : '#1e293b'}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                      zIndex: 5,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, color, textTransform: 'uppercase' }}>{node.type}</span>
                      <button
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}
                        onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                      {node.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Properties Inspector Panel */}
          <div style={{ ...cardStyle, overflowY: 'auto' }}>
            <div style={titleStyle}>Node Properties Inspector</div>

            {selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Node ID / Label</span>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc' }}>{selectedNode.label}</div>
                </div>

                {Object.entries(selectedNode.data).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>{key}</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => updateNodeData(selectedNode.id, { [key]: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#64748b', padding: '10px', textAlign: 'center' }}>
                Click any node on the canvas to inspect &amp; edit parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: CODE GENERATOR & CONVERTER --- */}
      {activeTab === 'code' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={titleStyle}>Target Strategy Code Language:</span>
                <select value={targetLang} onChange={(e) => { generateCode(e.target.value); }} style={selectStyle}>
                  <option value="Pine Script v6">Pine Script v6 (TradingView)</option>
                  <option value="Python">Python (Backtrader / Pandas)</option>
                  <option value="MQL5">MQL5 (MetaTrader 5)</option>
                  <option value="MQL4">MQL4 (MetaTrader 4)</option>
                  <option value="C#">C# (.NET / QuantConnect)</option>
                  <option value="JSON">JSON / Webhook Payload</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={buttonStyle} onClick={() => navigator.clipboard.writeText(generatedCode)}>
                  Copy Code 📋
                </button>
                <button style={buttonPrimaryStyle} onClick={() => setShowImportModal(true)}>
                  Import Code to Graph 📥
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows={16}
              value={generatedCode}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px', resize: 'vertical', background: '#070a14', marginTop: '10px' }}
            />
          </div>
        </div>
      )}

      {/* --- TAB 3: OPTIMIZATION SWEEP --- */}
      {activeTab === 'optimization' && (
        <div style={cardStyle}>
          <div style={titleStyle}>
            <span>Strategy Parameter Sweep &amp; Optimization</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={btnStyle(false, false, true)} onClick={() => runOptimization('Grid Search')}>Grid Search</button>
              <button style={btnStyle()} onClick={() => runOptimization('Genetic Algorithm')}>Genetic Algorithm</button>
              <button style={btnStyle()} onClick={() => runOptimization('Bayesian Optimization')}>Bayesian Optimization</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', background: '#090d16' }}>Method</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', background: '#090d16' }}>Fast Period</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', background: '#090d16' }}>Slow Period</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', background: '#090d16' }}>Win Rate</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#64748b', background: '#090d16' }}>Net Profit</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', background: '#090d16' }}>Profit Factor</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', background: '#090d16' }}>Sharpe Ratio</th>
                </tr>
              </thead>
              <tbody>
                {optimizationResults.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #1e293b' }}>{r.method}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #1e293b' }}>{r.fast_period}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #1e293b' }}>{r.slow_period}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #1e293b' }}>{r.win_rate}%</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #1e293b', textAlign: 'right', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>+${r.net_profit}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #1e293b' }}>{r.profit_factor}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #1e293b' }}>{r.sharpe_ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAiGenModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...cardStyle, width: '450px', background: '#0f172a' }}>
            <div style={titleStyle}>
              <span>🤖 AI Strategy Generator</span>
              <button style={{ ...buttonStyle, padding: '2px 6px' }} onClick={() => setShowAiGenModal(false)}>✕</button>
            </div>

            <p style={{ fontSize: '11px', color: '#94a3b8' }}>
              Describe your desired trading strategy in plain English (e.g. "Create a Gold breakout strategy using SuperTrend and ATR trailing stop").
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Create an EMA 20/50 crossover strategy with RSI filter and 1.5% SL..."
              value={aiPromptInput}
              onChange={(e) => setAiPromptInput(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button style={buttonStyle} onClick={() => setShowAiGenModal(false)}>Cancel</button>
              <button style={buttonPrimaryStyle} onClick={handleAiPromptSubmit}>Generate Graph</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Code Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...cardStyle, width: '450px', background: '#0f172a' }}>
            <div style={titleStyle}>
              <span>📥 Import Script to Node Graph</span>
              <button style={{ ...buttonStyle, padding: '2px 6px' }} onClick={() => setShowImportModal(false)}>✕</button>
            </div>

            <textarea
              rows={5}
              placeholder="Paste Pine Script v6 or Python strategy code here..."
              value={importCodeInput}
              onChange={(e) => setImportCodeInput(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'monospace' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button style={buttonStyle} onClick={() => setShowImportModal(false)}>Cancel</button>
              <button style={buttonPrimaryStyle} onClick={handleImportSubmit}>Convert to Nodes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualStrategyBuilderPanel;
